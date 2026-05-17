import express from 'express';
import session from 'express-session';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';
import { initDb, upsertUser, query } from './server/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8080;
const DISCORD_API = 'https://discord.com/api/v10';

const {
  DISCORD_CLIENT_ID,
  DISCORD_CLIENT_SECRET,
  DISCORD_REDIRECT_URI,
  DISCORD_BOT_TOKEN,
  SESSION_SECRET = 'zenith-secret-key-123',
  DATABASE_URL,
} = process.env;

// Initialize DB immediately but don't let it block
if (DATABASE_URL) {
  initDb().catch(err => console.error('[DB] Failed to init:', err));
}

// ── Middleware ──────────────────────────────────────────────────────────────
app.set('trust proxy', 1);
app.use(express.json());
app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  },
}));

// ── Health Checks (MUST be before static/auth) ──────────────────────────────
app.get('/health', (_req, res) => res.status(200).send('OK'));
app.get('/healthz', (_req, res) => res.status(200).send('OK'));

// ── Auth Logic ──────────────────────────────────────────────────────────────
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
      accessToken: tokens.access_token
    };

    req.session.discordAccessToken = tokens.access_token;
    req.session.user = userData;

    if (DATABASE_URL) {
      await upsertUser(userData).catch(() => {});
    }

    res.redirect('/select-server');
  } catch (err) {
    console.error('[auth] Callback error:', err);
    res.redirect('/?error=auth_failed');
  }
}

function requireAuth(req, res, next) {
  if (!req.session.user) return res.status(401).json({ error: 'Not authenticated' });
  next();
}

// ── Routes ──────────────────────────────────────────────────────────────────
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
  req.session.destroy(() => { res.clearCookie('connect.sid'); res.json({ ok: true }); });
});

app.get('/api/me', requireAuth, (req, res) => {
  const { accessToken, ...safe } = req.session.user;
  res.json(safe);
});

app.get('/api/guilds', requireAuth, async (req, res) => {
  const { accessToken } = req.session.user;
  try {
    const guildsRes = await fetch(`${DISCORD_API}/users/@me/guilds`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const allGuilds = await guildsRes.json();
    if (!Array.isArray(allGuilds)) return res.json([]);

    const ADMIN = BigInt(0x8);
    const MANAGE = BigInt(0x20);
    const manageable = allGuilds.filter(g => {
      const p = BigInt(g.permissions);
      return g.owner || (p & ADMIN) === ADMIN || (p & MANAGE) === MANAGE;
    });

    res.json(manageable.map(g => ({
      id: g.id,
      name: g.name,
      icon: g.icon,
      iconUrl: g.icon ? `https://cdn.discordapp.com/icons/${g.id}/${g.icon}.png` : null
    })));
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch guilds' });
  }
});

app.get('/api/guilds/:id/detailed', requireAuth, async (req, res) => {
  const { id } = req.params;
  const userToken = req.session.discordAccessToken;
  try {
    let guildData;
    const botRes = await fetch(`${DISCORD_API}/guilds/${id}?with_counts=true`, {
      headers: { Authorization: `Bot ${DISCORD_BOT_TOKEN}` }
    });
    if (botRes.ok) {
      guildData = await botRes.json();
    } else {
      const userRes = await fetch(`${DISCORD_API}/guilds/${id}`, {
        headers: { Authorization: `Bearer ${userToken}` }
      });
      guildData = await userRes.json();
    }

    const chanRes = await fetch(`${DISCORD_API}/guilds/${id}/channels`, {
      headers: { Authorization: `Bot ${DISCORD_BOT_TOKEN}` }
    });
    const channels = chanRes.ok ? await chanRes.json() : [];

    const rolesRes = await fetch(`${DISCORD_API}/guilds/${id}/roles`, {
      headers: { Authorization: `Bot ${DISCORD_BOT_TOKEN}` }
    });
    const roles = rolesRes.ok ? await rolesRes.json() : [];

    res.json({
      name: guildData.name,
      icon: guildData.icon,
      member_count: guildData.approximate_member_count || 0,
      online_count: guildData.approximate_presence_count || 0,
      channels: channels.length,
      roles: roles.length,
      emojis: guildData.emojis ? guildData.emojis.length : 0,
      stickers: guildData.stickers ? guildData.stickers.length : 0
    });
  } catch (err) {
    res.status(500).json({ error: 'Error fetching details' });
  }
});

app.get('/api/guilds/:id/staff', requireAuth, async (req, res) => {
  try {
    const staff = await query('SELECT * FROM staff_members WHERE guild_id = $1', [req.params.id]);
    res.json(staff.rows);
  } catch { res.json([]); }
});

app.post('/api/guilds/:id/staff-roles', requireAuth, async (req, res) => {
  const { id } = req.params;
  const { roleIds } = req.body;
  try {
    for (const roleId of roleIds) {
      const membersRes = await fetch(`${DISCORD_API}/guilds/${id}/members?limit=1000`, {
        headers: { Authorization: `Bot ${DISCORD_BOT_TOKEN}` },
      });
      if (membersRes.ok) {
        const members = await membersRes.json();
        const staff = members.filter(m => m.roles.includes(roleId));
        for (const m of staff) {
          await query(`
            INSERT INTO staff_members (guild_id, user_id, username, role)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (guild_id, user_id) DO UPDATE SET username = EXCLUDED.username
          `, [id, m.user.id, m.user.global_name || m.user.username, 'Staff']);
        }
      }
    }
    res.json({ success: true });
  } catch { res.status(500).json({ error: 'Failed' }); }
});

app.get('/api/bot/stats', async (_req, res) => {
  try {
    const guilds = await query('SELECT COUNT(*) FROM servers');
    const users = await query('SELECT COUNT(*) FROM users');
    res.json({ guilds: guilds.rows[0].count, users: users.rows[0].count, status: 'Online' });
  } catch { res.json({ guilds: 0, users: 0, status: 'Online' }); }
});

// ── Static Files ────────────────────────────────────────────────────────────
const publicPath = join(__dirname, 'public');
app.use(express.static(publicPath));

app.get('/select-server', (req, res) => res.sendFile(join(publicPath, 'select-server.html')));
app.get('/dashboard', (req, res) => res.sendFile(join(publicPath, 'dashboard.html')));
app.get('/status', (req, res) => res.sendFile(join(publicPath, 'status.html')));
app.get('/premium', (req, res) => res.sendFile(join(publicPath, 'premium.html')));

// Catch-all to index for SPA
app.get('*', (req, res) => res.sendFile(join(publicPath, 'index.html')));

// ── Start Server ────────────────────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
  console.log(`[Zenith] Server running on port ${PORT}`);
});
