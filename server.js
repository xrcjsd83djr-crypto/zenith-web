import express from 'express';
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { initDb, upsertUser, query, pool } from './server/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8080;
const DISCORD_API = 'https://discord.com/api/v10';

const AUDIT_ACTION_MAP = {
  1: 'GUILD_UPDATE', 10: 'CHANNEL_CREATE', 11: 'CHANNEL_UPDATE', 12: 'CHANNEL_DELETE',
  20: 'MEMBER_KICK', 21: 'MEMBER_PRUNE', 22: 'MEMBER_BAN_ADD', 23: 'MEMBER_BAN_REMOVE',
  24: 'MEMBER_UPDATE', 25: 'MEMBER_ROLE_UPDATE', 28: 'BOT_ADD',
  30: 'ROLE_CREATE', 31: 'ROLE_UPDATE', 32: 'ROLE_DELETE',
  72: 'MESSAGE_DELETE', 73: 'MESSAGE_BULK_DELETE',
  80: 'INTEGRATION_CREATE', 81: 'INTEGRATION_UPDATE', 82: 'INTEGRATION_DELETE',
};

// ── 1. Health Checks — must respond instantly ─────────────────────────────
app.get('/health', (_req, res) => res.status(200).send('OK'));
app.get('/healthz', (_req, res) => res.status(200).send('OK'));
app.get('/ping', (_req, res) => res.status(200).send('pong'));
app.get('/version', (_req, res) => res.json({ version: '2.0.0', status: 'online' }));

const {
  DISCORD_CLIENT_ID,
  DISCORD_CLIENT_SECRET,
  DISCORD_REDIRECT_URI,
  DISCORD_BOT_TOKEN,
  SESSION_SECRET = 'zenith-secret-key-123',
  DATABASE_URL,
  BOT_SECRET,
} = process.env;

// ── 2. Middleware ─────────────────────────────────────────────────────────
app.set('trust proxy', 1);
app.use(express.json({ limit: '2mb' }));

const PgSession = connectPgSimple(session);
const sessionStore = DATABASE_URL
  ? new PgSession({ pool, tableName: 'session', createTableIfMissing: true })
  : undefined;

app.use(session({
  store: sessionStore,
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, httpOnly: true, sameSite: 'lax', maxAge: 7 * 24 * 60 * 60 * 1000 },
}));

// ── 3. DB Init ──────────────────────────────────────────────────────────
if (DATABASE_URL) initDb().catch(err => console.error('[DB] Init error:', err));

// ── 4. Auth Helpers ──────────────────────────────────────────────────────
function requireAuth(req, res, next) {
  if (BOT_SECRET && req.headers['x-bot-secret'] === BOT_SECRET) return next();
  if (!req.session?.user) return res.status(401).json({ error: 'Not authenticated' });
  next();
}

function requireBotSecret(req, res, next) {
  if (!BOT_SECRET || req.headers['x-bot-secret'] !== BOT_SECRET) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
}

// ── 5. Discord Auth ──────────────────────────────────────────────────────
async function handleAuthCallback(req, res) {
  const { code } = req.query;
  if (!code) return res.redirect('/?error=no_code');
  try {
    const tokenRes = await fetch(`${DISCORD_API}/oauth2/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: DISCORD_CLIENT_ID,
        client_secret: DISCORD_CLIENT_SECRET,
        grant_type: 'authorization_code',
        code,
        redirect_uri: DISCORD_REDIRECT_URI,
      }),
    });
    const tokens = await tokenRes.json();
    if (!tokens.access_token) return res.redirect('/?error=token_failed');

    const userRes = await fetch(`${DISCORD_API}/users/@me`, {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const user = await userRes.json();

    const userData = {
      id: user.id,
      username: user.global_name || user.username,
      avatar: user.avatar,
      avatarUrl: user.avatar
        ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`
        : `https://cdn.discordapp.com/embed/avatars/0.png`,
      accessToken: tokens.access_token,
    };

    req.session.discordAccessToken = tokens.access_token;
    req.session.user = userData;

    req.session.save((err) => {
      if (err) console.error('[Auth] Session save error:', err);
      if (DATABASE_URL) upsertUser(userData).catch(() => {});
      res.redirect('/servers');
    });
  } catch (err) {
    console.error('[auth] Callback error:', err);
    res.redirect('/?error=auth_failed');
  }
}

app.get('/auth/discord', (req, res) => {
  const params = new URLSearchParams({
    client_id: DISCORD_CLIENT_ID,
    redirect_uri: DISCORD_REDIRECT_URI,
    response_type: 'code',
    scope: 'identify guilds',
  });
  res.redirect(`https://discord.com/api/oauth2/authorize?${params}`);
});
app.get('/api/auth/discord', (req, res) => {
  const params = new URLSearchParams({
    client_id: DISCORD_CLIENT_ID,
    redirect_uri: DISCORD_REDIRECT_URI,
    response_type: 'code',
    scope: 'identify guilds',
  });
  res.redirect(`https://discord.com/api/oauth2/authorize?${params}`);
});
app.get('/auth/callback', handleAuthCallback);
app.get('/api/auth/discord/callback', handleAuthCallback);
app.post('/api/auth/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.json({ ok: true });
  });
});

// ── 6. User Routes ───────────────────────────────────────────────────────
app.get('/api/me', requireAuth, (req, res) => {
  const { accessToken, ...safe } = req.session.user;
  res.json(safe);
});
app.get('/api/user', requireAuth, (req, res) => {
  const { accessToken, ...safe } = req.session.user;
  res.json(safe);
});
app.get('/api/auth/user', requireAuth, (req, res) => {
  const { accessToken, ...safe } = req.session.user;
  res.json(safe);
});
app.get('/api/auth/me', requireAuth, (req, res) => {
  const { accessToken, ...safe } = req.session.user;
  res.json(safe);
});

// ── 7. Guild List ────────────────────────────────────────────────────────
async function getManageableGuilds(accessToken) {
  const res = await fetch(`${DISCORD_API}/users/@me/guilds`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const guilds = await res.json();
  if (!Array.isArray(guilds)) return [];
  const ADMIN = BigInt(0x8), MANAGE = BigInt(0x20);
  return guilds.filter(g => {
    const p = BigInt(g.permissions);
    return g.owner || (p & ADMIN) === ADMIN || (p & MANAGE) === MANAGE;
  });
}

app.get('/api/guilds', requireAuth, async (req, res) => {
    try {
      const guilds = await getManageableGuilds(req.session.user.accessToken);
      const guildList = guilds.map(g => ({
        id: g.id, name: g.name, icon: g.icon,
        iconUrl: g.icon ? `https://cdn.discordapp.com/icons/${g.id}/${g.icon}.png` : null,
        botInstalled: false,
      }));

      if (DISCORD_BOT_TOKEN) {
        await Promise.all(guildList.map(async (guild) => {
          try {
            const r = await fetch(`${DISCORD_API}/guilds/${guild.id}`, {
              headers: { Authorization: `Bot ${DISCORD_BOT_TOKEN}` },
            });
            guild.botInstalled = r.ok;
          } catch {}
        }));
      }

      res.json(guildList);
    } catch (err) {
      console.error('[guilds]', err);
      res.status(500).json({ error: 'Failed to fetch guilds' });
    }
  });

app.get('/api/auth/guilds', requireAuth, async (req, res) => {
  try {
    const guilds = await getManageableGuilds(req.session.user.accessToken);
    const guildList = guilds.map(g => ({
      id: g.id, name: g.name, icon: g.icon,
      iconUrl: g.icon ? `https://cdn.discordapp.com/icons/${g.id}/${g.icon}.png` : null,
      owner: g.owner, role: g.owner ? 'Owner' : 'Admin',
      botAdded: false,
    }));

    if (DISCORD_BOT_TOKEN) {
      await Promise.all(guildList.map(async (guild) => {
        try {
          const r = await fetch(`${DISCORD_API}/guilds/${guild.id}`, {
            headers: { Authorization: `Bot ${DISCORD_BOT_TOKEN}` },
          });
          guild.botAdded = r.ok;
        } catch {}
      }));
    }

    res.json(guildList);
  } catch (err) {
    console.error('[auth/guilds]', err);
    res.status(500).json({ error: 'Failed to fetch guilds' });
  }
});

// ── 8. Guild Discord Data (channels, roles) ───────────────────────────────
// GET /api/guilds/:id — fetch single guild (used by dashboard layout)
  app.get('/api/guilds/:id', requireAuth, async (req, res) => {
    const { id } = req.params;
    try {
      // First try DB
      if (DATABASE_URL) {
        const dbRes = await query('SELECT * FROM servers WHERE id = $1', [id]);
        if (dbRes.rows.length > 0) {
          const row = dbRes.rows[0];
          const icon = row.icon || row.icon_url;
          return res.json({
            id: row.id,
            name: row.name,
            icon: icon,
            iconUrl: icon ? `https://cdn.discordapp.com/icons/${row.id}/${icon}.webp?size=128` : null,
            isPremium: !!row.is_premium,
            premiumExpiresAt: row.premium_expires_at,
          });
        }
      }
      // Fall back to Discord API via bot token
      if (DISCORD_BOT_TOKEN) {
        const r = await fetch(`${DISCORD_API}/guilds/${id}`, {
          headers: { Authorization: `Bot ${DISCORD_BOT_TOKEN}` },
        });
        if (r.ok) {
          const g = await r.json();
          return res.json({
            id: g.id,
            name: g.name,
            icon: g.icon,
            iconUrl: g.icon ? `https://cdn.discordapp.com/icons/${g.id}/${g.icon}.webp?size=128` : null,
            memberCount: g.approximate_member_count,
            isPremium: false,
          });
        }
      }
      res.status(404).json({ error: 'Guild not found' });
    } catch (err) {
      console.error('[guild get]', err);
      res.status(500).json({ error: 'Failed to fetch guild' });
    }
  });

  app.get('/api/guilds/:id/channels', requireAuth, async (req, res) => {
  const { id } = req.params;
  if (!DISCORD_BOT_TOKEN) return res.status(400).json({ error: 'Bot token not configured' });
  try {
    const r = await fetch(`${DISCORD_API}/guilds/${id}/channels`, {
      headers: { Authorization: `Bot ${DISCORD_BOT_TOKEN}` },
    });
    if (!r.ok) return res.status(r.status).json({ error: 'Discord API error' });
    const channels = await r.json();
    // Return all text channels and categories
    res.json(channels
      .filter(c => c.type === 0 || c.type === 5 || c.type === 15)
      .sort((a, b) => a.position - b.position)
      .map(c => ({ id: c.id, name: c.name, type: c.type })));
  } catch (err) {
    console.error('[channels]', err);
    res.status(500).json({ error: 'Failed to fetch channels' });
  }
});

app.get('/api/guilds/:id/roles', requireAuth, async (req, res) => {
  const { id } = req.params;
  if (!DISCORD_BOT_TOKEN) return res.status(400).json({ error: 'Bot token not configured' });
  try {
    const r = await fetch(`${DISCORD_API}/guilds/${id}/roles`, {
      headers: { Authorization: `Bot ${DISCORD_BOT_TOKEN}` },
    });
    if (!r.ok) return res.status(r.status).json({ error: 'Discord API error' });
    const roles = await r.json();
    res.json(roles
      .filter(r => r.name !== '@everyone')
      .sort((a, b) => b.position - a.position)
      .map(r => ({ id: r.id, name: r.name, color: r.color ? `#${r.color.toString(16).padStart(6, '0')}` : '#99aab5' })));
  } catch (err) {
    console.error('[roles]', err);
    res.status(500).json({ error: 'Failed to fetch roles' });
  }
});

app.get('/api/guilds/:id/roles-list', requireAuth, async (req, res) => {
  req.params.id = req.params.id;
  // Alias to above
  if (!DISCORD_BOT_TOKEN) return res.json([]);
  try {
    const r = await fetch(`${DISCORD_API}/guilds/${req.params.id}/roles`, {
      headers: { Authorization: `Bot ${DISCORD_BOT_TOKEN}` },
    });
    const roles = r.ok ? await r.json() : [];
    res.json(roles.filter(r => r.name !== '@everyone').sort((a, b) => b.position - a.position)
      .map(r => ({ id: r.id, name: r.name, color: r.color })));
  } catch { res.json([]); }
});

app.get('/api/guilds/:id/members', requireAuth, async (req, res) => {
  const { id } = req.params;
  if (!DISCORD_BOT_TOKEN) return res.json([]);
  try {
    const r = await fetch(`${DISCORD_API}/guilds/${id}/members?limit=1000`, {
      headers: { Authorization: `Bot ${DISCORD_BOT_TOKEN}` },
    });
    const members = r.ok ? await r.json() : [];
    res.json(members.map(m => ({
      id: m.user.id,
      username: m.user.global_name || m.user.username,
      avatar: m.user.avatar
        ? `https://cdn.discordapp.com/avatars/${m.user.id}/${m.user.avatar}.png`
        : `https://cdn.discordapp.com/embed/avatars/0.png`,
      roles: m.roles,
      nick: m.nick,
    })));
  } catch (err) {
    console.error('[members]', err);
    res.json([]);
  }
});

app.get('/api/guilds/:id/detailed', requireAuth, async (req, res) => {
  const { id } = req.params;
  try {
    let guildData = null;
    if (DISCORD_BOT_TOKEN) {
      const r = await fetch(`${DISCORD_API}/guilds/${id}?with_counts=true`, {
        headers: { Authorization: `Bot ${DISCORD_BOT_TOKEN}` },
      });
      if (r.ok) guildData = await r.json();
    }

    let channels = [], roles = [];
    if (DISCORD_BOT_TOKEN) {
      const [cR, rR] = await Promise.all([
        fetch(`${DISCORD_API}/guilds/${id}/channels`, { headers: { Authorization: `Bot ${DISCORD_BOT_TOKEN}` } }),
        fetch(`${DISCORD_API}/guilds/${id}/roles`, { headers: { Authorization: `Bot ${DISCORD_BOT_TOKEN}` } }),
      ]);
      if (cR.ok) channels = await cR.json();
      if (rR.ok) roles = await rR.json();
    }

    res.json({
      name: guildData?.name || 'Unknown',
      icon: guildData?.icon,
      iconUrl: guildData?.icon ? `https://cdn.discordapp.com/icons/${id}/${guildData.icon}.png` : null,
      member_count: guildData?.approximate_member_count || 0,
      online_count: guildData?.approximate_presence_count || 0,
      channels: channels.length,
      roles: roles.length,
      emojis: guildData?.emojis?.length || 0,
    });
  } catch (err) {
    console.error('[detailed]', err);
    res.status(500).json({ error: 'Failed to fetch guild details' });
  }
});

// ── 9. Guild Registration (bot callable) ─────────────────────────────────
app.put('/api/guilds/:id', requireBotSecret, async (req, res) => {
  const { id } = req.params;
  const { name, icon } = req.body;
  if (!DATABASE_URL) return res.json({ ok: true });
  try {
    await query(
      `INSERT INTO servers (id, name, icon, icon_url, bot_added, updated_at)
       VALUES ($1, $2, $3, $4, TRUE, NOW())
       ON CONFLICT (id) DO UPDATE SET name = $2, icon = $3, icon_url = $4, bot_added = TRUE, updated_at = NOW()`,
      [id, name, icon, icon ? `https://cdn.discordapp.com/icons/${id}/${icon}.png` : null]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('[guild upsert]', err);
    res.status(500).json({ error: 'Failed to upsert guild' });
  }
});

// ── 10. Premium ─────────────────────────────────────────────────────────
app.get('/api/guilds/:id/premium', requireAuth, async (req, res) => {
  const { id } = req.params;
  if (!DATABASE_URL) return res.json({ isPremium: false });
  try {
    const r = await query(`SELECT is_premium, premium_expires_at FROM servers WHERE id = $1`, [id]);
    const row = r.rows[0];
    const expired = row?.premium_expires_at && new Date(row.premium_expires_at) < new Date();
    res.json({ isPremium: !!row?.is_premium && !expired, expiresAt: row?.premium_expires_at || null });
  } catch { res.json({ isPremium: false }); }
});

app.get('/api/guilds/:id/is-premium', requireAuth, async (req, res) => {
  const { id } = req.params;
  if (!DATABASE_URL) return res.json({ premium: false, isPremium: false });
  try {
    const r = await query(`SELECT is_premium, premium_expires_at FROM servers WHERE id = $1`, [id]);
    const row = r.rows[0];
    const expired = row?.premium_expires_at && new Date(row.premium_expires_at) < new Date();
    const ok = !!row?.is_premium && !expired;
    res.json({ premium: ok, isPremium: ok });
  } catch { res.json({ premium: false, isPremium: false }); }
});

// Admin: give premium (bot or admin only)
app.post('/api/admin/give-premium', requireBotSecret, async (req, res) => {
  const { guildId, days } = req.body;
  if (!DATABASE_URL) return res.status(400).json({ error: 'No DB' });
  try {
    const expires = new Date(Date.now() + (days || 30) * 86400000);
    await query(
      `INSERT INTO servers (id, name, is_premium, premium_expires_at)
       VALUES ($1, $1, TRUE, $2)
       ON CONFLICT (id) DO UPDATE SET is_premium = TRUE, premium_expires_at = $2`,
      [guildId, expires]
    );
    res.json({ ok: true, expiresAt: expires });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/revoke-premium', requireBotSecret, async (req, res) => {
  const { guildId } = req.body;
  if (!DATABASE_URL) return res.status(400).json({ error: 'No DB' });
  try {
    await query(`UPDATE servers SET is_premium = FALSE WHERE id = $1`, [guildId]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── 11. Server Config ────────────────────────────────────────────────────
app.get('/api/guilds/:id/config', requireAuth, async (req, res) => {
  const { id } = req.params;
  if (!DATABASE_URL) return res.json({});
  try {
    const r = await query(`SELECT * FROM server_config WHERE guild_id = $1`, [id]);
    res.json(r.rows[0] || {});
  } catch (err) {
    console.error('[config get]', err);
    res.status(500).json({ error: 'Failed to fetch config' });
  }
});

app.put('/api/guilds/:id/config', requireAuth, async (req, res) => {
  const { id } = req.params;
  if (!DATABASE_URL) return res.status(400).json({ error: 'No database configured' });

  const {
    logs_channel_id, loa_channel_id, applications_channel_id,
    applications_review_channel_id, welcome_channel_id, strike_log_channel_id,
    staff_role_id, admin_role_id, management_role_id, on_loa_role_id,
    embed_color, embed_footer,
    strike_threshold, strike_action, strike_automation,
    loa_max_days, loa_require_approval,
    applications_enabled, applications_title, applications_questions,
    require_recommendations, auto_reject,
    prefix, timezone, activity_tracking,
  } = req.body;

  try {
    const r = await query(
      `INSERT INTO server_config (
        guild_id,
        logs_channel_id, loa_channel_id, applications_channel_id,
        applications_review_channel_id, welcome_channel_id, strike_log_channel_id,
        staff_role_id, admin_role_id, management_role_id, on_loa_role_id,
        embed_color, embed_footer,
        strike_threshold, strike_action, strike_automation,
        loa_max_days, loa_require_approval,
        applications_enabled, applications_title, applications_questions,
        require_recommendations, auto_reject,
        prefix, timezone, activity_tracking, updated_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21::jsonb,$22,$23,$24,$25,$26, NOW())
      ON CONFLICT (guild_id) DO UPDATE SET
        logs_channel_id = $2, loa_channel_id = $3, applications_channel_id = $4,
        applications_review_channel_id = $5, welcome_channel_id = $6, strike_log_channel_id = $7,
        staff_role_id = $8, admin_role_id = $9, management_role_id = $10, on_loa_role_id = $11,
        embed_color = $12, embed_footer = $13,
        strike_threshold = $14, strike_action = $15, strike_automation = $16,
        loa_max_days = $17, loa_require_approval = $18,
        applications_enabled = $19, applications_title = $20, applications_questions = $21::jsonb,
        require_recommendations = $22, auto_reject = $23,
        prefix = $24, timezone = $25, activity_tracking = $26, updated_at = NOW()
      RETURNING *`,
      [
        id,
        logs_channel_id || null, loa_channel_id || null, applications_channel_id || null,
        applications_review_channel_id || null, welcome_channel_id || null, strike_log_channel_id || null,
        staff_role_id || null, admin_role_id || null, management_role_id || null, on_loa_role_id || null,
        embed_color || '#d4af37', embed_footer || 'Zenith Staff Management',
        strike_threshold ?? 3, strike_action || 'demotion', !!strike_automation,
        loa_max_days ?? 14, loa_require_approval !== false,
        !!applications_enabled, applications_title || null,
        JSON.stringify(applications_questions || []),
        !!require_recommendations, !!auto_reject,
        prefix || '!', timezone || 'UTC', activity_tracking !== false,
      ]
    );

    // Also ensure server record exists
    await query(
      `INSERT INTO servers (id, name) VALUES ($1, $1)
       ON CONFLICT (id) DO NOTHING`,
      [id]
    ).catch(() => {});

    await logActivity(id, null, null, 'config_update', { updated_by: req.session?.user?.id });
    res.json({ success: true, config: r.rows[0] });
  } catch (err) {
    console.error('[config save]', err);
    res.status(500).json({ error: 'Failed to save config', details: err.message });
  }
});

// Keep POST as alias
app.post('/api/guilds/:id/config', requireAuth, async (req, res) => {
  req.method = 'PUT';
  // Re-route logic
  const { id } = req.params;
  if (!DATABASE_URL) return res.status(400).json({ error: 'No database configured' });
  const body = req.body;
  try {
    const r = await query(
      `INSERT INTO server_config (guild_id, loa_channel_id, applications_channel_id, logs_channel_id, staff_role_id, admin_role_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (guild_id) DO UPDATE SET
         loa_channel_id = COALESCE($2, server_config.loa_channel_id),
         applications_channel_id = COALESCE($3, server_config.applications_channel_id),
         logs_channel_id = COALESCE($4, server_config.logs_channel_id),
         staff_role_id = COALESCE($5, server_config.staff_role_id),
         admin_role_id = COALESCE($6, server_config.admin_role_id),
         updated_at = NOW()
       RETURNING *`,
      [id, body.loaChannelId || null, body.applicationsChannelId || null,
       body.logsChannelId || null, body.staffRoleId || null, body.adminRoleId || null]
    );
    res.json(r.rows[0]);
  } catch (err) {
    console.error('[config post]', err);
    res.status(500).json({ error: 'Failed to save config' });
  }
});



  // ── 11b. Post Panel to Discord ────────────────────────────────────────────
  app.post('/api/guilds/:id/config/post-panel', requireAuth, async (req, res) => {
    const { id } = req.params;
    const { type } = req.body; // 'applications' | 'loa'
    if (!DISCORD_BOT_TOKEN) return res.status(400).json({ error: 'Bot token not configured' });
    if (!DATABASE_URL) return res.status(400).json({ error: 'Database not configured' });
    try {
      const cfgRes = await query('SELECT * FROM server_config WHERE guild_id = $1', [id]);
      const cfg = cfgRes.rows[0];
      if (!cfg) return res.status(400).json({ error: 'No configuration saved yet. Save your config first.' });

      let channelId, embed, components;

      if (type === 'applications') {
        channelId = cfg.applications_channel_id;
        if (!channelId) return res.status(400).json({ error: 'Applications channel not configured.' });
        embed = {
          title: cfg.applications_title || 'Staff Application',
          description: '**Want to join the team?**\n\nClick the button below to submit a staff application. Our management team will review your application and get back to you.',
          color: 0xd4af37,
          footer: { text: cfg.embed_footer || 'Zenith Staff Management' },
          timestamp: new Date().toISOString(),
        };
        components = [{
          type: 1,
          components: [{
            type: 2, style: 1, label: 'Apply Now',
            custom_id: 'zenith_apply',
            emoji: { name: '📋' },
          }],
        }];
      } else if (type === 'loa') {
        channelId = cfg.loa_channel_id;
        if (!channelId) return res.status(400).json({ error: 'LOA channel not configured.' });
        embed = {
          title: 'Leave of Absence Request',
          description: '**Need to take a break?**\n\nClick the button below to submit a Leave of Absence request. Please include your start date, end date, and reason.',
          color: 0xd4af37,
          footer: { text: cfg.embed_footer || 'Zenith Staff Management' },
          timestamp: new Date().toISOString(),
        };
        components = [{
          type: 1,
          components: [{
            type: 2, style: 1, label: 'Request LOA',
            custom_id: 'zenith_loa',
            emoji: { name: '📅' },
          }],
        }];
      } else {
        return res.status(400).json({ error: 'Invalid panel type. Use "applications" or "loa".' });
      }

      const msgRes = await fetch(`${DISCORD_API}/channels/${channelId}/messages`, {
        method: 'POST',
        headers: { Authorization: `Bot ${DISCORD_BOT_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ embeds: [embed], components }),
      });

      if (!msgRes.ok) {
        const err = await msgRes.json();
        const msg = err?.message || 'Discord API error';
        if (msg.includes('Missing Access')) return res.status(400).json({ error: 'Bot does not have access to that channel. Check channel permissions.' });
        return res.status(400).json({ error: `Discord error: ${msg}` });
      }

      await logActivity(id, null, null, 'panel_posted', { type, channel_id: channelId, posted_by: req.session?.user?.id });
      res.json({ success: true, message: `${type === 'applications' ? 'Application' : 'LOA'} panel posted to <#${channelId}>!` });
    } catch (err) {
      console.error('[post-panel]', err);
      res.status(500).json({ error: 'Failed to post panel: ' + err.message });
    }
  });
  
// ── 12. Staff CRUD ───────────────────────────────────────────────────────
app.get('/api/guilds/:id/staff', requireAuth, async (req, res) => {
  const { id } = req.params;
  if (!DATABASE_URL) return res.json([]);
  try {
    const r = await query(
      `SELECT * FROM staff_members WHERE guild_id = $1 AND is_active = TRUE ORDER BY joined_at DESC`,
      [id]
    );
    res.json(r.rows);
  } catch (err) {
    console.error('[staff list]', err);
    res.json([]);
  }
});

app.post('/api/guilds/:id/staff', requireAuth, async (req, res) => {
  const { id } = req.params;
  const { userId, username, rank, division, callsign, notes, avatarUrl } = req.body;
  if (!DATABASE_URL) return res.status(400).json({ error: 'No database' });
  if (!userId) return res.status(400).json({ error: 'userId required' });
  try {
    const r = await query(
      `INSERT INTO staff_members (guild_id, user_id, username, role, rank, division, callsign, notes, avatar_url)
       VALUES ($1, $2, $3, $4, $4, $5, $6, $7, $8)
       ON CONFLICT (guild_id, user_id) DO UPDATE SET
         username = EXCLUDED.username, role = EXCLUDED.role, rank = EXCLUDED.rank,
         division = EXCLUDED.division, callsign = EXCLUDED.callsign,
         notes = EXCLUDED.notes, avatar_url = EXCLUDED.avatar_url,
         is_active = TRUE, updated_at = NOW()
       RETURNING *`,
      [id, userId, username, rank || null, division || null, callsign || null, notes || null, avatarUrl || null]
    );
    await logActivity(id, userId, username, 'staff_add', { rank, division });
    res.json(r.rows[0]);
  } catch (err) {
    console.error('[staff add]', err);
    res.status(500).json({ error: 'Failed to add staff member', details: err.message });
  }
});

app.get('/api/guilds/:id/staff/:userId', requireAuth, async (req, res) => {
  const { id, userId } = req.params;
  if (!DATABASE_URL) return res.status(404).json({ error: 'Not found' });
  try {
    const [staffR, strikesR, loaR] = await Promise.all([
      query(`SELECT * FROM staff_members WHERE guild_id = $1 AND user_id = $2`, [id, userId]),
      query(`SELECT * FROM strikes WHERE guild_id = $1 AND user_id = $2 ORDER BY created_at DESC`, [id, userId]),
      query(`SELECT * FROM loa_requests WHERE guild_id = $1 AND user_id = $2 ORDER BY created_at DESC`, [id, userId]),
    ]);
    if (!staffR.rows[0]) return res.status(404).json({ error: 'Staff member not found' });
    res.json({ ...staffR.rows[0], strikes: strikesR.rows, loaHistory: loaR.rows });
  } catch (err) {
    console.error('[staff get]', err);
    res.status(500).json({ error: 'Failed to fetch staff member' });
  }
});

app.patch('/api/guilds/:id/staff/:userId', requireAuth, async (req, res) => {
  const { id, userId } = req.params;
  const { rank, division, callsign, notes, robloxUsername } = req.body;
  if (!DATABASE_URL) return res.status(400).json({ error: 'No database' });
  try {
    const r = await query(
      `UPDATE staff_members SET
         rank = COALESCE($3, rank), role = COALESCE($3, role),
         division = COALESCE($4, division), callsign = COALESCE($5, callsign),
         notes = COALESCE($6, notes), roblox_username = COALESCE($7, roblox_username),
         updated_at = NOW()
       WHERE guild_id = $1 AND user_id = $2 RETURNING *`,
      [id, userId, rank || null, division || null, callsign || null, notes || null, robloxUsername || null]
    );
    res.json(r.rows[0]);
  } catch (err) {
    console.error('[staff update]', err);
    res.status(500).json({ error: 'Failed to update staff member' });
  }
});

app.delete('/api/guilds/:id/staff/:userId', requireAuth, async (req, res) => {
  const { id, userId } = req.params;
  if (!DATABASE_URL) return res.status(400).json({ error: 'No database' });
  try {
    await query(
      `UPDATE staff_members SET is_active = FALSE, updated_at = NOW() WHERE guild_id = $1 AND user_id = $2`,
      [id, userId]
    );
    await logActivity(id, userId, null, 'staff_remove', {});
    res.json({ success: true });
  } catch (err) {
    console.error('[staff remove]', err);
    res.status(500).json({ error: 'Failed to remove staff member' });
  }
});

// Import from role
app.post('/api/guilds/:id/staff-roles', requireAuth, async (req, res) => {
  const { id } = req.params;
  const { roleIds } = req.body;
  if (!DISCORD_BOT_TOKEN || !DATABASE_URL) return res.status(400).json({ error: 'Not configured' });
  if (!roleIds?.length) return res.status(400).json({ error: 'No roles selected' });
  try {
    const [membersR, rolesR] = await Promise.all([
      fetch(`${DISCORD_API}/guilds/${id}/members?limit=1000`, { headers: { Authorization: `Bot ${DISCORD_BOT_TOKEN}` } }),
      fetch(`${DISCORD_API}/guilds/${id}/roles`, { headers: { Authorization: `Bot ${DISCORD_BOT_TOKEN}` } }),
    ]);
    const members = membersR.ok ? await membersR.json() : [];
    const allRoles = rolesR.ok ? await rolesR.json() : [];

    let addedCount = 0;
    for (const roleId of roleIds) {
      const role = allRoles.find(r => r.id === roleId);
      const roleName = role?.name || 'Staff';
      const staffMembers = members.filter(m => m.roles.includes(roleId));

      for (const m of staffMembers) {
        const avatarUrl = m.user.avatar
          ? `https://cdn.discordapp.com/avatars/${m.user.id}/${m.user.avatar}.png`
          : `https://cdn.discordapp.com/embed/avatars/0.png`;
        await query(
          `INSERT INTO staff_members (guild_id, user_id, username, avatar_url, role, rank)
           VALUES ($1, $2, $3, $4, $5, $5)
           ON CONFLICT (guild_id, user_id) DO UPDATE SET
             username = EXCLUDED.username, avatar_url = EXCLUDED.avatar_url,
             role = EXCLUDED.role, rank = EXCLUDED.rank, is_active = TRUE, updated_at = NOW()`,
          [id, m.user.id, m.user.global_name || m.user.username, avatarUrl, roleName]
        );
        addedCount++;
      }
    }
    res.json({ success: true, added: addedCount });
  } catch (err) {
    console.error('[staff-roles]', err);
    res.status(500).json({ error: 'Failed to import staff', details: err.message });
  }
});

// ── 13. Ranks ────────────────────────────────────────────────────────────
app.get('/api/guilds/:id/ranks', requireAuth, async (req, res) => {
  const { id } = req.params;
  if (!DATABASE_URL) return res.json([]);
  try {
    // Ensure server exists first
    await query(`INSERT INTO servers (id, name) VALUES ($1, $1) ON CONFLICT (id) DO NOTHING`, [id]).catch(() => {});
    const r = await query(`SELECT * FROM ranks WHERE guild_id = $1 ORDER BY level DESC, name ASC`, [id]);
    res.json(r.rows);
  } catch (err) {
    console.error('[ranks]', err);
    res.json([]);
  }
});

app.post('/api/guilds/:id/ranks', requireAuth, async (req, res) => {
  const { id } = req.params;
  const { name, level, color, discordRoleId, isDefault } = req.body;
  if (!DATABASE_URL) return res.status(400).json({ error: 'No database' });
  try {
    await query(`INSERT INTO servers (id, name) VALUES ($1, $1) ON CONFLICT (id) DO NOTHING`, [id]).catch(() => {});
    const r = await query(
      `INSERT INTO ranks (id, guild_id, name, level, color, discord_role_id, is_default)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6) RETURNING *`,
      [id, name, level ?? 0, color || '#5865F2', discordRoleId || null, !!isDefault]
    );
    res.json(r.rows[0]);
  } catch (err) {
    console.error('[rank create]', err);
    res.status(500).json({ error: 'Failed to create rank', details: err.message });
  }
});

app.patch('/api/guilds/:id/ranks/:rankId', requireAuth, async (req, res) => {
  const { id, rankId } = req.params;
  const { name, level, color, discordRoleId } = req.body;
  try {
    const r = await query(
      `UPDATE ranks SET name = COALESCE($3, name), level = COALESCE($4, level),
       color = COALESCE($5, color), discord_role_id = COALESCE($6, discord_role_id)
       WHERE id = $2 AND guild_id = $1 RETURNING *`,
      [id, rankId, name || null, level ?? null, color || null, discordRoleId || null]
    );
    res.json(r.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update rank' });
  }
});

app.delete('/api/guilds/:id/ranks/:rankId', requireAuth, async (req, res) => {
  const { id, rankId } = req.params;
  try {
    await query(`DELETE FROM ranks WHERE id = $1 AND guild_id = $2`, [rankId, id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete rank' });
  }
});

// ── 14. Strikes ──────────────────────────────────────────────────────────
app.get('/api/guilds/:id/strikes', requireAuth, async (req, res) => {
  const { id } = req.params;
  if (!DATABASE_URL) return res.json([]);
  try {
    const r = await query(`SELECT * FROM strikes WHERE guild_id = $1 ORDER BY created_at DESC`, [id]);
    res.json(r.rows);
  } catch { res.json([]); }
});

app.post('/api/guilds/:id/strikes', requireAuth, async (req, res) => {
  const { id } = req.params;
  const { userId, username, reason, evidence, issuedBy, issuedByName, severity } = req.body;
  if (!userId || !reason || !issuedBy) return res.status(400).json({ error: 'Missing fields' });
  try {
    const r = await query(
      `INSERT INTO strikes (guild_id, user_id, username, reason, evidence, issued_by, issued_by_name, active, severity)
       VALUES ($1,$2,$3,$4,$5,$6,$7,TRUE,$8) RETURNING *`,
      [id, userId, username, reason, evidence, issuedBy, issuedByName, severity || 'strike']
    );
    // Update strike count on staff member
    await query(
      `UPDATE staff_members SET strikes = (SELECT COUNT(*) FROM strikes WHERE guild_id=$1 AND user_id=$2 AND active=TRUE)
       WHERE guild_id=$1 AND user_id=$2`,
      [id, userId]
    ).catch(() => {});
    await logActivity(id, issuedBy, issuedByName, 'strike_issued', { targetId: userId, reason });
    res.json(r.rows[0]);
  } catch (err) {
    console.error('[strike create]', err);
    res.status(500).json({ error: 'Failed to create strike' });
  }
});

app.delete('/api/guilds/:id/strikes/:strikeId', requireAuth, async (req, res) => {
  const { id, strikeId } = req.params;
  try {
    await query(
      `UPDATE strikes SET active = FALSE, removed_at = NOW(), removed_by = $3
       WHERE id = $1 AND guild_id = $2`,
      [strikeId, id, req.session?.user?.id || 'system']
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to revoke strike' });
  }
});

// ── 15. LOA ──────────────────────────────────────────────────────────────
app.get('/api/guilds/:id/loa', requireAuth, async (req, res) => {
  const { id } = req.params;
  if (!DATABASE_URL) return res.json([]);
  try {
    const r = await query(`SELECT * FROM loa_requests WHERE guild_id = $1 ORDER BY created_at DESC`, [id]);
    res.json(r.rows);
  } catch { res.json([]); }
});

app.post('/api/guilds/:id/loa', requireAuth, async (req, res) => {
  const { id } = req.params;
  const { userId, username, reason, startDate, endDate } = req.body;
  if (!userId || !reason || !startDate || !endDate) return res.status(400).json({ error: 'Missing fields' });
  try {
    const r = await query(
      `INSERT INTO loa_requests (guild_id, user_id, username, reason, start_date, end_date, status)
       VALUES ($1,$2,$3,$4,$5,$6,'pending') RETURNING *`,
      [id, userId, username, reason, new Date(startDate), new Date(endDate)]
    );
    await logActivity(id, userId, username, 'loa_request', { startDate, endDate });
    res.json(r.rows[0]);
  } catch (err) {
    console.error('[loa create]', err);
    res.status(500).json({ error: 'Failed to create LOA request' });
  }
});

app.patch('/api/guilds/:id/loa/:loaId', requireAuth, async (req, res) => {
  const { id, loaId } = req.params;
  const { status, approvedBy, approvedByName } = req.body;
  try {
    const r = await query(
      `UPDATE loa_requests SET status = $1, approved_by = $2, approved_by_name = $3
       WHERE id = $4 AND guild_id = $5 RETURNING *`,
      [status, approvedBy, approvedByName, loaId, id]
    );
    await logActivity(id, approvedBy, approvedByName, `loa_${status}`, { loaId });
    res.json(r.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update LOA' });
  }
});

// ── 16. Activity Logs ────────────────────────────────────────────────────
async function logActivity(guildId, userId, username, action, details) {
  if (!DATABASE_URL) return;
  try {
    await query(
      `INSERT INTO activity_logs (guild_id, user_id, username, action, details) VALUES ($1,$2,$3,$4,$5::jsonb)`,
      [guildId, userId || null, username || null, action, JSON.stringify(details || {})]
    );
  } catch {}
}

app.get('/api/guilds/:id/activity', requireAuth, async (req, res) => {
  const { id } = req.params;
  const limit = Math.min(parseInt(req.query.limit) || 50, 200);
  if (!DATABASE_URL) return res.json([]);
  try {
    const r = await query(
      `SELECT * FROM activity_logs WHERE guild_id = $1 ORDER BY created_at DESC LIMIT $2`,
      [id, limit]
    );
    res.json(r.rows);
  } catch { res.json([]); }
});

app.post('/api/guilds/:id/activity', requireAuth, async (req, res) => {
  const { id } = req.params;
  const { userId, username, action, details } = req.body;
  await logActivity(id, userId, username, action, details);
  res.json({ success: true });
});

// ── 17. Audit Logs ───────────────────────────────────────────────────────
app.get('/api/guilds/:id/audit-logs', requireAuth, async (req, res) => {
  const { id } = req.params;
  if (!DISCORD_BOT_TOKEN) return res.status(400).json({ error: 'Bot token not configured' });
  try {
    const [discordRes, botStrikesRes, botLoaRes, botActivityRes] = await Promise.all([
      fetch(`${DISCORD_API}/guilds/${id}/audit-logs?limit=50`, {
        headers: { Authorization: `Bot ${DISCORD_BOT_TOKEN}` },
      }),
      DATABASE_URL ? query(`SELECT * FROM strikes WHERE guild_id = $1 ORDER BY created_at DESC LIMIT 30`, [id]) : { rows: [] },
      DATABASE_URL ? query(`SELECT * FROM loa_requests WHERE guild_id = $1 ORDER BY created_at DESC LIMIT 20`, [id]) : { rows: [] },
      DATABASE_URL ? query(`SELECT * FROM activity_logs WHERE guild_id = $1 ORDER BY created_at DESC LIMIT 30`, [id]) : { rows: [] },
    ]);

    const discordData = discordRes.ok ? await discordRes.json() : { audit_log_entries: [], users: [] };
    const usersById = new Map((discordData.users || []).map(u => [u.id, u]));

    const combined = [
      ...(discordData.audit_log_entries || []).map(entry => {
        const actor = usersById.get(entry.user_id);
        const actionName = AUDIT_ACTION_MAP[entry.action_type] || `Action ${entry.action_type}`;
        return {
          id: entry.id, type: 'discord',
          action: actionName.toLowerCase().replace(/_/g, '-'),
          action_name: actionName.replace(/_/g, ' '),
          user: entry.user_id,
          user_name: actor?.global_name || actor?.username || entry.user_id || 'Unknown',
          target: entry.target_id,
          reason: entry.reason || 'No reason provided',
          timestamp: new Date(Number(BigInt(entry.id) / 4194304n) + 1420070400000).toISOString(),
        };
      }),
      ...botStrikesRes.rows.map(s => ({
        id: `strike-${s.id}`, type: 'strike',
        action: 'strike-issued', action_name: `Strike ${s.active ? 'Issued' : 'Revoked'}`,
        user: s.issued_by, user_name: s.issued_by_name || s.issued_by,
        target: s.user_id, target_name: s.username,
        reason: s.reason, timestamp: s.created_at,
      })),
      ...botLoaRes.rows.map(l => ({
        id: `loa-${l.id}`, type: 'loa',
        action: 'loa-request', action_name: `LOA Request (${l.status})`,
        user: l.user_id, user_name: l.username,
        target: l.user_id, target_name: l.username,
        reason: l.reason, timestamp: l.created_at,
      })),
      ...botActivityRes.rows.map(a => ({
        id: `act-${a.id}`, type: 'activity',
        action: a.action, action_name: a.action.replace(/_/g, ' '),
        user: a.user_id, user_name: a.username,
        target: null, reason: JSON.stringify(a.details),
        timestamp: a.created_at,
      })),
    ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    res.json(combined.slice(0, 100));
  } catch (err) {
    console.error('[audit-logs]', err);
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

// ── 18. Applications Config ───────────────────────────────────────────────
app.get('/api/guilds/:id/applications-config', requireAuth, async (req, res) => {
  const { id } = req.params;
  if (!DATABASE_URL) return res.json({ enabled: false, channel: '', questions: [] });
  try {
    const r = await query(
      `SELECT applications_enabled, applications_channel_id, applications_review_channel_id,
              applications_title, applications_questions, require_recommendations, auto_reject
       FROM server_config WHERE guild_id = $1`, [id]
    );
    const row = r.rows[0] || {};
    res.json({
      enabled: !!row.applications_enabled, channel: row.applications_channel_id || '',
      reviewChannel: row.applications_review_channel_id || '',
      title: row.applications_title || '', questions: row.applications_questions || [],
      requireRecommendations: !!row.require_recommendations, autoReject: !!row.auto_reject,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch' });
  }
});

app.post('/api/guilds/:id/applications-config', requireAuth, async (req, res) => {
  const { id } = req.params;
  const { enabled, channel, reviewChannel, title, questions = [], requireRecommendations = false, autoReject = false } = req.body;
  if (!DATABASE_URL) return res.status(400).json({ error: 'No database' });
  try {
    await query(
      `INSERT INTO server_config (guild_id, applications_enabled, applications_channel_id,
         applications_review_channel_id, applications_title, applications_questions,
         require_recommendations, auto_reject)
       VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7,$8)
       ON CONFLICT (guild_id) DO UPDATE SET
         applications_enabled = $2, applications_channel_id = $3,
         applications_review_channel_id = $4, applications_title = $5,
         applications_questions = $6::jsonb, require_recommendations = $7,
         auto_reject = $8, updated_at = NOW()`,
      [id, !!enabled, channel || null, reviewChannel || null, title || null,
       JSON.stringify(questions), !!requireRecommendations, !!autoReject]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save applications config' });
  }
});

// ── 19. Settings ─────────────────────────────────────────────────────────
app.get('/api/guilds/:id/settings', requireAuth, async (req, res) => {
  const { id } = req.params;
  if (!DATABASE_URL) return res.json({});
  try {
    const r = await query(`SELECT settings FROM servers WHERE id = $1`, [id]);
    res.json(r.rows[0]?.settings || {});
  } catch { res.json({}); }
});

app.post('/api/guilds/:id/settings', requireAuth, async (req, res) => {
  const { id } = req.params;
  try {
    await query(
      `INSERT INTO servers (id, name, settings) VALUES ($1, $1, $2::jsonb)
       ON CONFLICT (id) DO UPDATE SET settings = servers.settings || $2::jsonb`,
      [id, JSON.stringify(req.body)]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save settings' });
  }
});

// ── 20. Bot Stats ──────────────────────────────────────────────────────
app.get('/api/bot/stats', async (_req, res) => {
  try {
    if (!DATABASE_URL) return res.json({ guilds: 0, users: 0, status: 'Online' });
    const [gR, uR] = await Promise.all([
      query('SELECT COUNT(*) FROM servers WHERE bot_added = TRUE'),
      query('SELECT COUNT(*) FROM users'),
    ]);
    res.json({ guilds: gR.rows[0].count, users: uR.rows[0].count, status: 'Online' });
  } catch { res.json({ guilds: 0, users: 0, status: 'Online' }); }
});

// ── 21. Staff Portal ────────────────────────────────────────────────────
app.get('/api/staff/guilds', requireAuth, async (req, res) => {
  const userId = req.session.user.id;
  try {
    const r = await query(
      `SELECT DISTINCT sm.guild_id, s.name, s.icon, sm.role as rank
       FROM staff_members sm LEFT JOIN servers s ON sm.guild_id = s.id
       WHERE sm.user_id = $1 AND sm.is_active = TRUE ORDER BY s.name ASC`,
      [userId]
    );
    res.json(r.rows || []);
  } catch { res.json([]); }
});

app.post('/api/staff/verify-roblox', requireAuth, async (req, res) => {
  const userId = req.session.user.id;
  const { robloxUsername, guildId } = req.body;
  if (!robloxUsername || !guildId) return res.status(400).json({ error: 'Missing fields' });
  try {
    await query(`UPDATE users SET roblox_username = $1, roblox_verified = TRUE WHERE id = $2`, [robloxUsername, userId]);
    await query(
      `INSERT INTO staff_portal_sessions (user_id, guild_id, roblox_verified_at) VALUES ($1,$2,NOW())
       ON CONFLICT (user_id, guild_id) DO UPDATE SET roblox_verified_at = NOW()`,
      [userId, guildId]
    );
    res.json({ success: true, robloxUsername });
  } catch (err) {
    res.status(500).json({ error: 'Failed to verify' });
  }
});

app.get('/api/staff/profile/:robloxUsername', async (req, res) => {
  const { robloxUsername } = req.params;
  try {
    const userR = await query(`SELECT id, username, avatar, roblox_username FROM users WHERE roblox_username = $1`, [robloxUsername]);
    if (!userR.rows[0]) return res.status(404).json({ error: 'Not found' });
    const user = userR.rows[0];
    const staffR = await query(
      `SELECT sm.guild_id, s.name as guild_name, s.icon, sm.role, sm.joined_at, sm.strikes
       FROM staff_members sm LEFT JOIN servers s ON sm.guild_id = s.id
       WHERE sm.user_id = $1 AND sm.is_active = TRUE ORDER BY sm.joined_at DESC`,
      [user.id]
    );
    res.json({ ...user, staffPositions: staffR.rows, totalServers: staffR.rows.length });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// ── 22. Admin ─────────────────────────────────────────────────────────────
let globalNotifications = [];

app.post('/api/admin/verify-pin', (req, res) => {
  const { pin, userId } = req.body;
  const ADMIN_ID = '1416209242838401064';
  const ADMIN_PIN = '1232009';
  if (userId !== ADMIN_ID) return res.status(403).json({ error: 'Unauthorized' });
  if (pin !== ADMIN_PIN) return res.status(401).json({ error: 'Invalid PIN' });
  res.json({ success: true, token: Buffer.from(`${userId}:${Date.now()}`).toString('base64') });
});

app.get('/api/admin/notifications', (_req, res) => res.json(globalNotifications.slice(0, 50)));
app.post('/api/admin/send-notification', (req, res) => {
  const { message, type } = req.body;
  globalNotifications.unshift({ id: Date.now(), message, type: type || 'info', timestamp: new Date(), read: false });
  res.json({ success: true });
});

// ── 23. Static Files & Page Routes ────────────────────────────────────────
const publicPath = join(__dirname, 'dist');

  // ── 22. Warnings ──────────────────────────────────────────────────────
  app.get('/api/guilds/:id/warnings', requireAuth, async (req, res) => {
    const { id } = req.params;
    if (!DATABASE_URL) return res.json([]);
    try {
      const r = await query(`SELECT * FROM warnings WHERE guild_id = $1 ORDER BY created_at DESC`, [id]);
      res.json(r.rows);
    } catch { res.json([]); }
  });

  app.post('/api/guilds/:id/warnings', requireAuth, async (req, res) => {
    const { id } = req.params;
    const { userId, username, reason, severity, issuedBy, issuedByName } = req.body;
    if (!userId || !reason || !issuedBy) return res.status(400).json({ error: 'Missing required fields' });
    if (!DATABASE_URL) return res.status(400).json({ error: 'No database' });
    try {
      const r = await query(
        `INSERT INTO warnings (guild_id, user_id, username, reason, severity, issued_by, issued_by_name, active)
         VALUES ($1,$2,$3,$4,$5,$6,$7,TRUE) RETURNING *`,
        [id, userId, username, reason, severity || 'minor', issuedBy, issuedByName]
      );
      // Update warning count on staff member
      await query(
        `UPDATE staff_members SET warnings = (SELECT COUNT(*) FROM warnings WHERE guild_id=$1 AND user_id=$2 AND active=TRUE)
         WHERE guild_id=$1 AND user_id=$2`,
        [id, userId]
      ).catch(() => {});
      // Auto-escalate: 3 major warnings → create a strike
      const majorCount = await query(
        `SELECT COUNT(*) FROM warnings WHERE guild_id=$1 AND user_id=$2 AND severity='major' AND active=TRUE`,
        [id, userId]
      );
      if (parseInt(majorCount.rows[0].count) >= 3) {
        await query(
          `INSERT INTO strikes (guild_id, user_id, username, reason, issued_by, issued_by_name, active, severity)
           VALUES ($1,$2,$3,'Auto-escalated from 3 major warnings',$4,$5,TRUE,'auto') ON CONFLICT DO NOTHING`,
          [id, userId, username, issuedBy, issuedByName]
        ).catch(() => {});
        // Deactivate the warnings so count resets
        await query(`UPDATE warnings SET active=FALSE WHERE guild_id=$1 AND user_id=$2 AND severity='major'`, [id, userId]).catch(() => {});
      }
      await logActivity(id, issuedBy, issuedByName, 'warning_issued', { targetId: userId, reason, severity });
      res.json(r.rows[0]);
    } catch (err) {
      console.error('[warning create]', err);
      res.status(500).json({ error: 'Failed to create warning' });
    }
  });

  app.delete('/api/guilds/:id/warnings/:warningId', requireAuth, async (req, res) => {
    const { id, warningId } = req.params;
    try {
      await query(`UPDATE warnings SET active=FALSE WHERE id=$1 AND guild_id=$2`, [warningId, id]);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'Failed to remove warning' });
    }
  });

  // ── 23. Blacklist ─────────────────────────────────────────────────────
  app.get('/api/guilds/:id/blacklist', requireAuth, async (req, res) => {
    const { id } = req.params;
    if (!DATABASE_URL) return res.json([]);
    try {
      const r = await query(`SELECT * FROM blacklist WHERE guild_id=$1 ORDER BY created_at DESC`, [id]);
      res.json(r.rows);
    } catch { res.json([]); }
  });

  app.post('/api/guilds/:id/blacklist', requireAuth, async (req, res) => {
    const { id } = req.params;
    const { userId, username, reason, addedBy, addedByName } = req.body;
    if (!username || !reason || !addedBy) return res.status(400).json({ error: 'Missing required fields' });
    if (!DATABASE_URL) return res.status(400).json({ error: 'No database' });
    try {
      const r = await query(
        `INSERT INTO blacklist (guild_id, user_id, username, reason, added_by, added_by_name, active)
         VALUES ($1,$2,$3,$4,$5,$6,TRUE) RETURNING *`,
        [id, userId || null, username, reason, addedBy, addedByName]
      );
      await logActivity(id, addedBy, addedByName, 'blacklist_add', { username, reason });
      res.json(r.rows[0]);
    } catch (err) {
      console.error('[blacklist add]', err);
      res.status(500).json({ error: 'Failed to add to blacklist' });
    }
  });

  app.delete('/api/guilds/:id/blacklist/:entryId', requireAuth, async (req, res) => {
    const { id, entryId } = req.params;
    try {
      await query(`UPDATE blacklist SET active=FALSE WHERE id=$1 AND guild_id=$2`, [entryId, id]);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'Failed to remove from blacklist' });
    }
  });

  // ── 24. Register Discord Slash Commands (fixes duplicates) ────────────
  app.post('/api/admin/register-commands', requireBotSecret, async (req, res) => {
    if (!DISCORD_BOT_TOKEN || !DISCORD_CLIENT_ID) return res.status(400).json({ error: 'Bot token/client ID not configured' });
    try {
      // First delete all existing global commands to fix duplicates
      const listRes = await fetch(`${DISCORD_API}/applications/${DISCORD_CLIENT_ID}/commands`, {
        headers: { Authorization: `Bot ${DISCORD_BOT_TOKEN}` },
      });
      const existing = listRes.ok ? await listRes.json() : [];
      if (Array.isArray(existing)) {
        await Promise.all(existing.map(cmd =>
          fetch(`${DISCORD_API}/applications/${DISCORD_CLIENT_ID}/commands/${cmd.id}`, {
            method: 'DELETE', headers: { Authorization: `Bot ${DISCORD_BOT_TOKEN}` },
          })
        ));
      }

      // Register fresh command set (staff management only)
      const commands = [
        { name: 'strike', description: 'Issue a strike to a staff member', options: [
            { type: 6, name: 'user', description: 'The staff member to strike', required: true },
            { type: 3, name: 'reason', description: 'Reason for the strike', required: true },
            { type: 3, name: 'severity', description: 'Strike severity', required: false,
              choices: [{ name: 'Strike', value: 'strike' }, { name: 'Final Warning', value: 'final_warning' }] },
          ] },
        { name: 'strikes', description: 'View strikes for a staff member', options: [
            { type: 6, name: 'user', description: 'Staff member to check', required: true },
          ] },
        { name: 'warn', description: 'Issue a warning to a staff member', options: [
            { type: 6, name: 'user', description: 'The staff member to warn', required: true },
            { type: 3, name: 'reason', description: 'Reason for the warning', required: true },
            { type: 3, name: 'severity', description: 'Warning severity', required: false,
              choices: [{ name: 'Minor', value: 'minor' }, { name: 'Moderate', value: 'moderate' }, { name: 'Major', value: 'major' }] },
          ] },
        { name: 'loa', description: 'Request a leave of absence', options: [
            { type: 3, name: 'reason', description: 'Reason for LOA', required: true },
            { type: 3, name: 'start', description: 'Start date (YYYY-MM-DD)', required: true },
            { type: 3, name: 'end', description: 'End date (YYYY-MM-DD)', required: true },
          ] },
        { name: 'staff', description: 'Manage staff roster', options: [
            { type: 1, name: 'add', description: 'Add a staff member', options: [
                { type: 6, name: 'user', description: 'Discord user to add', required: true },
                { type: 3, name: 'rank', description: 'Their rank/role', required: true },
              ] },
            { name: 'remove', type: 1, description: 'Remove a staff member', options: [
                { type: 6, name: 'user', description: 'Discord user to remove', required: true },
                { type: 3, name: 'reason', description: 'Reason for removal', required: false },
              ] },
            { type: 1, name: 'info', description: 'View staff member info', options: [
                { type: 6, name: 'user', description: 'Discord user to look up', required: true },
              ] },
          ] },
        { name: 'stafflist', description: 'List all active staff members' },
        { name: 'blacklist', description: 'Manage the applicant blacklist', options: [
            { type: 1, name: 'add', description: 'Add a user to the blacklist', options: [
                { type: 6, name: 'user', description: 'User to blacklist', required: true },
                { type: 3, name: 'reason', description: 'Reason', required: true },
              ] },
            { type: 1, name: 'check', description: 'Check if a user is blacklisted', options: [
                { type: 6, name: 'user', description: 'User to check', required: true },
              ] },
          ] },
        { name: 'config', description: 'View current server configuration (admins only)' },
      ];

      const regRes = await fetch(`${DISCORD_API}/applications/${DISCORD_CLIENT_ID}/commands`, {
        method: 'PUT',
        headers: { Authorization: `Bot ${DISCORD_BOT_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(commands),
      });

      if (!regRes.ok) {
        const err = await regRes.json();
        return res.status(400).json({ error: 'Discord API error', details: err });
      }

      const registered = await regRes.json();
      res.json({ success: true, registered: registered.length, commands: registered.map(c => c.name) });
    } catch (err) {
      console.error('[register-commands]', err);
      res.status(500).json({ error: err.message });
    }
  });

  // ── 25. Discord Interactions Handler ─────────────────────────────────
  app.post('/api/interactions', express.raw({ type: '*/*' }), async (req, res) => {
    let body;
    try { body = JSON.parse(req.body.toString()); } catch { return res.status(400).end(); }

    // Handle PING from Discord
    if (body.type === 1) return res.json({ type: 1 });

    // Application command interactions (slash commands)
    if (body.type === 2) {
      const guildId = body.guild_id;
      const userId = body.member?.user?.id || body.user?.id;
      const username = body.member?.user?.global_name || body.member?.user?.username || 'Unknown';
      const cmdName = body.data?.name;

      const ack = (content, ephemeral = true) => res.json({
        type: 4,
        data: { content, flags: ephemeral ? 64 : 0 },
      });

      if (!guildId) return ack('This command must be used in a server.');

      try {
        if (cmdName === 'strike') {
          const targetId = body.data.options?.find(o => o.name === 'user')?.value;
          const reason = body.data.options?.find(o => o.name === 'reason')?.value;
          const severity = body.data.options?.find(o => o.name === 'severity')?.value || 'strike';
          if (!DATABASE_URL) return ack('Database not configured.');
          const targetMember = body.data.resolved?.members?.[targetId];
          const targetUser = body.data.resolved?.users?.[targetId];
          const targetName = targetUser?.global_name || targetUser?.username || targetId;
          await query(
            `INSERT INTO strikes (guild_id, user_id, username, reason, issued_by, issued_by_name, active, severity)
             VALUES ($1,$2,$3,$4,$5,$6,TRUE,$7)`,
            [guildId, targetId, targetName, reason, userId, username, severity]
          );
          await logActivity(guildId, userId, username, 'strike_issued', { targetId, reason, severity });
          return ack(`✅ Strike issued to <@${targetId}> for: **${reason}**`, false);
        }

        if (cmdName === 'warn') {
          const targetId = body.data.options?.find(o => o.name === 'user')?.value;
          const reason = body.data.options?.find(o => o.name === 'reason')?.value;
          const severity = body.data.options?.find(o => o.name === 'severity')?.value || 'minor';
          if (!DATABASE_URL) return ack('Database not configured.');
          const targetUser = body.data.resolved?.users?.[targetId];
          const targetName = targetUser?.global_name || targetUser?.username || targetId;
          await query(
            `INSERT INTO warnings (guild_id, user_id, username, reason, severity, issued_by, issued_by_name, active)
             VALUES ($1,$2,$3,$4,$5,$6,$7,TRUE)`,
            [guildId, targetId, targetName, reason, severity, userId, username]
          );
          return ack(`⚠️ ${severity.charAt(0).toUpperCase() + severity.slice(1)} warning issued to <@${targetId}>: **${reason}**`, false);
        }

        if (cmdName === 'strikes') {
          const targetId = body.data.options?.find(o => o.name === 'user')?.value;
          if (!DATABASE_URL) return ack('Database not configured.');
          const r = await query(`SELECT * FROM strikes WHERE guild_id=$1 AND user_id=$2 AND active=TRUE ORDER BY created_at DESC`, [guildId, targetId]);
          if (r.rows.length === 0) return ack(`<@${targetId}> has no active strikes. ✅`);
          const list = r.rows.map((s, i) => `**${i+1}.** ${s.reason} *(by ${s.issued_by_name || 'Unknown'}, ${new Date(s.created_at).toLocaleDateString()})*`).join('\n');
          return ack(`**Strikes for <@${targetId}>** (${r.rows.length} active):\n${list}`);
        }

        if (cmdName === 'loa') {
          const reason = body.data.options?.find(o => o.name === 'reason')?.value;
          const start = body.data.options?.find(o => o.name === 'start')?.value;
          const end = body.data.options?.find(o => o.name === 'end')?.value;
          if (!DATABASE_URL) return ack('Database not configured.');
          await query(
            `INSERT INTO loa_requests (guild_id, user_id, username, reason, start_date, end_date, status)
             VALUES ($1,$2,$3,$4,$5,$6,'pending')`,
            [guildId, userId, username, reason, new Date(start), new Date(end)]
          );
          return ack(`📅 Your LOA request has been submitted for **${start} → ${end}**. Awaiting management approval.`);
        }

        if (cmdName === 'stafflist') {
          if (!DATABASE_URL) return ack('Database not configured.');
          const r = await query(`SELECT username, rank FROM staff_members WHERE guild_id=$1 AND is_active=TRUE ORDER BY rank, username LIMIT 20`, [guildId]);
          if (r.rows.length === 0) return ack('No active staff members found.');
          const list = r.rows.map(m => `• **${m.username}** — ${m.rank || 'Staff'}`).join('\n');
          return ack(`**Active Staff (${r.rows.length}):**\n${list}`, false);
        }

        if (cmdName === 'staff') {
          const sub = body.data.options?.[0]?.name;
          const subOpts = body.data.options?.[0]?.options || [];
          if (sub === 'add') {
            const targetId = subOpts.find(o => o.name === 'user')?.value;
            const rank = subOpts.find(o => o.name === 'rank')?.value;
            const targetUser = body.data.resolved?.users?.[targetId];
            const targetName = targetUser?.global_name || targetUser?.username || targetId;
            const avatarUrl = targetUser?.avatar ? `https://cdn.discordapp.com/avatars/${targetId}/${targetUser.avatar}.png` : null;
            await query(
              `INSERT INTO staff_members (guild_id, user_id, username, avatar_url, rank, role)
               VALUES ($1,$2,$3,$4,$5,$5) ON CONFLICT (guild_id, user_id) DO UPDATE SET rank=$5, role=$5, is_active=TRUE, updated_at=NOW()`,
              [guildId, targetId, targetName, avatarUrl, rank]
            );
            return ack(`✅ <@${targetId}> added to staff as **${rank}**.`, false);
          }
          if (sub === 'remove') {
            const targetId = subOpts.find(o => o.name === 'user')?.value;
            await query(`UPDATE staff_members SET is_active=FALSE, updated_at=NOW() WHERE guild_id=$1 AND user_id=$2`, [guildId, targetId]);
            return ack(`✅ <@${targetId}> removed from staff roster.`, false);
          }
          if (sub === 'info') {
            const targetId = subOpts.find(o => o.name === 'user')?.value;
            const [sm, sR] = await Promise.all([
              query(`SELECT * FROM staff_members WHERE guild_id=$1 AND user_id=$2`, [guildId, targetId]),
              query(`SELECT COUNT(*) FROM strikes WHERE guild_id=$1 AND user_id=$2 AND active=TRUE`, [guildId, targetId]),
            ]);
            if (!sm.rows[0]) return ack(`<@${targetId}> is not in the staff roster.`);
            const m = sm.rows[0];
            return ack(`**Staff Info: ${m.username}**\nRank: ${m.rank || 'N/A'}\nDivision: ${m.division || 'N/A'}\nActive Strikes: ${sR.rows[0].count}\nJoined: ${new Date(m.joined_at).toLocaleDateString()}`);
          }
        }

        if (cmdName === 'config') {
          if (!DATABASE_URL) return ack('Database not configured.');
          const r = await query(`SELECT * FROM server_config WHERE guild_id=$1`, [guildId]);
          const cfg = r.rows[0];
          if (!cfg) return ack('No configuration saved yet. Set it up at the Zenith dashboard.');
          return ack(`**Zenith Configuration**\nApplications: ${cfg.applications_enabled ? 'Enabled' : 'Disabled'}\nStrike Threshold: ${cfg.strike_threshold}\nLOA Approval Required: ${cfg.loa_require_approval ? 'Yes' : 'No'}\nPrefix: ${cfg.prefix}\n\nManage at your dashboard.`);
        }

        return ack('Unknown command.');
      } catch (err) {
        console.error('[interactions]', err);
        return ack('An error occurred. Please try again.');
      }
    }

    // Button/component interactions
    if (body.type === 3) {
      const customId = body.data?.custom_id;
      const guildId = body.guild_id;
      const userId = body.member?.user?.id || body.user?.id;
      const username = body.member?.user?.global_name || body.member?.user?.username || 'Unknown';

      if (customId === 'zenith_apply') {
        return res.json({
          type: 9, // MODAL
          data: {
            custom_id: 'apply_modal',
            title: 'Staff Application',
            components: [{
              type: 1, components: [{
                type: 4, custom_id: 'why_apply', label: 'Why do you want to join the staff team?',
                style: 2, min_length: 50, max_length: 1000, required: true,
                placeholder: 'Be specific and honest...',
              }],
            }, {
              type: 1, components: [{
                type: 4, custom_id: 'experience', label: 'What relevant experience do you have?',
                style: 2, min_length: 20, max_length: 500, required: true,
                placeholder: 'Previous server staff, moderation experience, etc.',
              }],
            }, {
              type: 1, components: [{
                type: 4, custom_id: 'age', label: 'How old are you and what timezone are you in?',
                style: 1, max_length: 50, required: true, placeholder: 'e.g. 17, EST',
              }],
            }],
          },
        });
      }

      if (customId === 'zenith_loa') {
        return res.json({
          type: 9, // MODAL
          data: {
            custom_id: 'loa_modal',
            title: 'Leave of Absence Request',
            components: [{
              type: 1, components: [{
                type: 4, custom_id: 'loa_reason', label: 'Reason for Leave of Absence',
                style: 2, min_length: 10, max_length: 500, required: true,
                placeholder: 'Please be specific about why you need time off.',
              }],
            }, {
              type: 1, components: [{
                type: 4, custom_id: 'loa_dates', label: 'Start and End Dates',
                style: 1, required: true, placeholder: 'e.g. May 20 → May 30, 2025',
              }],
            }],
          },
        });
      }

      return res.json({ type: 6 }); // Deferred update for unknown buttons
    }

    // Modal submit interactions
    if (body.type === 5) {
      const customId = body.data?.custom_id;
      const guildId = body.guild_id;
      const userId = body.member?.user?.id || body.user?.id;
      const username = body.member?.user?.global_name || body.member?.user?.username || 'Unknown';

      if (customId === 'apply_modal' && DATABASE_URL) {
        const answers = body.data.components.flatMap(row => row.components).reduce((acc, comp) => {
          acc[comp.custom_id] = comp.value;
          return acc;
        }, {});

        const cfg = await query('SELECT applications_review_channel_id, embed_footer FROM server_config WHERE guild_id=$1', [guildId]).catch(() => ({ rows: [] }));
        const reviewChannel = cfg.rows[0]?.applications_review_channel_id;

        if (reviewChannel && DISCORD_BOT_TOKEN) {
          await fetch(`${DISCORD_API}/channels/${reviewChannel}/messages`, {
            method: 'POST',
            headers: { Authorization: `Bot ${DISCORD_BOT_TOKEN}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              embeds: [{
                title: '📋 New Staff Application',
                color: 0xd4af37,
                author: { name: username, icon_url: body.member?.user?.avatar ? `https://cdn.discordapp.com/avatars/${userId}/${body.member.user.avatar}.png` : undefined },
                fields: Object.entries(answers).map(([k, v]) => ({ name: k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()), value: String(v), inline: false })),
                footer: { text: cfg.rows[0]?.embed_footer || 'Zenith Staff Management' },
                timestamp: new Date().toISOString(),
              }],
              components: [{
                type: 1, components: [
                  { type: 2, style: 3, label: 'Accept', custom_id: `app_accept_${userId}`, emoji: { name: '✅' } },
                  { type: 2, style: 4, label: 'Decline', custom_id: `app_decline_${userId}`, emoji: { name: '❌' } },
                ],
              }],
            }),
          }).catch(() => {});
        }

        return res.json({ type: 4, data: { content: '✅ Your application has been submitted! Management will review it shortly.', flags: 64 } });
      }

      if (customId === 'loa_modal' && DATABASE_URL) {
        const reason = body.data.components[0]?.components[0]?.value;
        const dates = body.data.components[1]?.components[0]?.value;
        const today = new Date();
        const nextWeek = new Date(today.getTime() + 7 * 86400000);

        await query(
          `INSERT INTO loa_requests (guild_id, user_id, username, reason, start_date, end_date, status)
           VALUES ($1,$2,$3,$4,$5,$6,'pending')`,
          [guildId, userId, username, `${reason} (dates: ${dates})`, today, nextWeek]
        ).catch(() => {});

        // Notify review channel
        const cfg = await query('SELECT loa_channel_id, embed_footer FROM server_config WHERE guild_id=$1', [guildId]).catch(() => ({ rows: [] }));
        const loaChannel = cfg.rows[0]?.loa_channel_id;
        if (loaChannel && DISCORD_BOT_TOKEN) {
          await fetch(`${DISCORD_API}/channels/${loaChannel}/messages`, {
            method: 'POST',
            headers: { Authorization: `Bot ${DISCORD_BOT_TOKEN}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              embeds: [{
                title: '📅 LOA Request',
                color: 0xd4af37,
                description: `**${username}** has submitted a Leave of Absence request.\n\n**Reason:** ${reason}\n**Dates:** ${dates}`,
                footer: { text: cfg.rows[0]?.embed_footer || 'Zenith Staff Management' },
                timestamp: new Date().toISOString(),
              }],
            }),
          }).catch(() => {});
        }

        return res.json({ type: 4, data: { content: '📅 Your LOA request has been submitted and is pending management approval.', flags: 64 } });
      }

      return res.json({ type: 4, data: { content: 'Received!', flags: 64 } });
    }

    res.status(400).json({ error: 'Unknown interaction type' });
  });

  app.use(express.static(publicPath));

const pages = [
  ['/select-server', 'select-server.html'], ['/staff-portal', 'staff-portal.html'],
  ['/staff-dashboard', 'staff-dashboard.html'], ['/admin-portal', 'admin-portal.html'],
  ['/dashboard', 'dashboard.html'], ['/status', 'status.html'],
  ['/premium', 'premium.html'], ['/settings', 'settings.html'],
  ['/server-settings', 'settings-config.html'], ['/settings-config', 'settings-config.html'],
  ['/staff-roster', 'staff-roster.html'], ['/audit-logs', 'audit-logs.html'],
  ['/applications-config', 'applications-config.html'], ['/circle-config', 'circle-config.html'],
  ['/privacy', 'privacy.html'], ['/tos', 'tos.html'],
  ['/profile/:username', 'profile.html'],
];

for (const [route, file] of pages) {
  app.get(route, (_req, res) => res.sendFile(join(publicPath, file)));
}

// Catch-all → index.html
app.get('*', (_req, res) => res.sendFile(join(publicPath, 'index.html')));

// ── 24. Start ────────────────────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
  console.log(`[Zenith] Server running on port ${PORT}`);
});
