import express from 'express';
import session from 'express-session';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';
import { initDb, upsertUser } from './server/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const DISCORD_API = 'https://discord.com/api/v10';

const {
  DISCORD_CLIENT_ID,
  DISCORD_CLIENT_SECRET,
  DISCORD_REDIRECT_URI,
  DISCORD_BOT_TOKEN,
  SESSION_SECRET = 'change-this-secret-in-production',
  BOT_CLIENT_ID,
  DATABASE_URL,
} = process.env;

if (DATABASE_URL) {
  initDb();
}

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

  const publicPath = join(__dirname, 'public');
  if (existsSync(publicPath)) {
    app.use(express.static(publicPath, {
      setHeaders: (res, filePath) => {
        if (filePath.endsWith('.html')) {
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
          res.setHeader('Pragma', 'no-cache');
          res.setHeader('Expires', '0');
        }
      }
    }));
  }

  function requireAuth(req, res, next) {
    if (!req.session.user) return res.status(401).json({ error: 'Not authenticated' });
    next();
  }

  // ── Auth ──────────────────────────────────────────────────────────────────

  app.get('/auth/discord', (req, res) => {
    if (!DISCORD_CLIENT_ID || !DISCORD_REDIRECT_URI) {
      return res.redirect('/?error=oauth_not_configured');
    }
    const params = new URLSearchParams({
      client_id: DISCORD_CLIENT_ID,
      redirect_uri: DISCORD_REDIRECT_URI,
      response_type: 'code',
      scope: 'identify guilds',
    });
    res.redirect(`https://discord.com/api/oauth2/authorize?${params}`);
  });

  app.get('/api/auth/discord', (req, res) => {
    if (!DISCORD_CLIENT_ID || !DISCORD_REDIRECT_URI) {
      return res.redirect('/?error=oauth_not_configured');
    }
    const params = new URLSearchParams({
      client_id: DISCORD_CLIENT_ID,
      redirect_uri: DISCORD_REDIRECT_URI,
      response_type: 'code',
      scope: 'identify guilds',
    });
    res.redirect(`https://discord.com/api/oauth2/authorize?${params}`);
  });

  app.get('/auth/callback', async (req, res) => handleAuthCallback(req, res));
  app.get('/api/auth/discord/callback', async (req, res) => handleAuthCallback(req, res));

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
      if (!tokens.access_token) {
        console.error('[auth] Token exchange failed:', tokens.error);
        return res.redirect('/?error=token_failed');
      }
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
          : `https://cdn.discordapp.com/embed/avatars/${Number(user.discriminator || 0) % 5}.png`,
        accessToken: tokens.access_token,
      };

      if (DATABASE_URL) {
        try {
          await upsertUser(userData);
        } catch (dbErr) {
          console.error('[DB] Failed to upsert user:', dbErr);
        }
      }

      req.session.user = userData;
      res.redirect('/select-server');
    } catch (err) {
      console.error('[auth] Callback error:', err);
      res.redirect('/?error=auth_failed');
    }
  }

  app.post('/auth/logout', (req, res) => {
    req.session.destroy(() => { res.clearCookie('connect.sid'); res.json({ ok: true }); });
  });
  app.post('/api/auth/logout', (req, res) => {
    req.session.destroy(() => { res.clearCookie('connect.sid'); res.json({ ok: true }); });
  });

  // ── API ───────────────────────────────────────────────────────────────────

  app.get('/api/config', (_req, res) => {
    res.json({ botClientId: BOT_CLIENT_ID || DISCORD_CLIENT_ID || '' });
  });

  app.get('/api/auth/user', requireAuth, (req, res) => {
    const { accessToken, ...safe } = req.session.user;
    res.json(safe);
  });

  app.get('/api/me', requireAuth, (req, res) => {
    const { accessToken, ...safe } = req.session.user;
    res.json(safe);
  });

  async function fetchGuilds(req, res) {
    const { accessToken } = req.session.user;
    try {
      const guildsRes = await fetch(`${DISCORD_API}/users/@me/guilds`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!guildsRes.ok) {
        if (guildsRes.status === 401) return res.status(401).json({ error: 'Token expired — please log in again' });
        return res.status(502).json({ error: 'Failed to fetch guilds from Discord' });
      }
      const allGuilds = await guildsRes.json();
      if (!Array.isArray(allGuilds)) return res.status(502).json({ error: 'Unexpected response from Discord' });

      const ADMIN = BigInt(0x8);
      const MANAGE = BigInt(0x20);
      const manageable = allGuilds.filter(g => {
        if (g.owner) return true;
        try { const p = BigInt(g.permissions); return (p & ADMIN) === ADMIN || (p & MANAGE) === MANAGE; }
        catch { return false; }
      });

      let botGuildIds = new Set();
      if (DISCORD_BOT_TOKEN) {
        try {
          const botRes = await fetch(`${DISCORD_API}/users/@me/guilds?limit=200`, {
            headers: { Authorization: `Bot ${DISCORD_BOT_TOKEN}` },
          });
          if (botRes.ok) {
            const botGuilds = await botRes.json();
            if (Array.isArray(botGuilds)) botGuildIds = new Set(botGuilds.map(g => g.id));
          }
        } catch (err) { console.error('[guilds] Bot guild check error:', err); }
      }

      res.json(manageable.map(g => ({
        id: g.id,
        name: g.name,
        icon: g.icon,
        iconUrl: g.icon ? `https://cdn.discordapp.com/icons/${g.id}/${g.icon}.png` : null,
        botAdded: botGuildIds.has(g.id),
        hasBot: botGuildIds.has(g.id),
        role: g.owner ? 'Owner' : 'Manager',
      })));
    } catch (err) {
      console.error('[guilds] Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  app.get('/api/auth/guilds', requireAuth, fetchGuilds);
  app.get('/api/guilds', requireAuth, fetchGuilds);

  app.get('/api/guilds/:id', requireAuth, async (req, res) => {
    const { id } = req.params;
    const { accessToken } = req.session.user;
    try {
      const userGuildsRes = await fetch(`${DISCORD_API}/users/@me/guilds`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const userGuilds = await userGuildsRes.json();
      const userGuild = Array.isArray(userGuilds) && userGuilds.find(g => g.id === id);
      if (!userGuild) return res.status(403).json({ error: 'Access denied' });

      let guildData = {
        id,
        name: userGuild.name,
        icon: userGuild.icon,
        iconUrl: userGuild.icon ? `https://cdn.discordapp.com/icons/${id}/${userGuild.icon}.png` : null,
      };

      if (DISCORD_BOT_TOKEN) {
        try {
          const botRes = await fetch(`${DISCORD_API}/guilds/${id}?with_counts=true`, {
            headers: { Authorization: `Bot ${DISCORD_BOT_TOKEN}` },
          });
          if (botRes.ok) {
            const full = await botRes.json();
            guildData.memberCount = full.approximate_member_count;
            guildData.onlineCount = full.approximate_presence_count;
          }
        } catch {}
      }
      res.json(guildData);
    } catch (err) {
      console.error('[guild] Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.get('/api/guilds/:id/roles', requireAuth, async (req, res) => {
    const { id } = req.params;
    if (!DISCORD_BOT_TOKEN) return res.status(500).json({ error: 'Bot token not configured' });
    try {
      const rolesRes = await fetch(`${DISCORD_API}/guilds/${id}/roles`, {
        headers: { Authorization: `Bot ${DISCORD_BOT_TOKEN}` },
      });
      if (!rolesRes.ok) return res.status(rolesRes.status).json({ error: 'Failed to fetch roles' });
      const roles = await rolesRes.json();
      res.json(roles.map(r => ({ id: r.id, name: r.name, color: r.color, position: r.position })));
    } catch (err) {
      console.error('[roles] Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.get('/api/guilds/:id/staff', requireAuth, async (req, res) => {
    const { id } = req.params;
    try {
      const staffRes = await query('SELECT * FROM staff_members WHERE guild_id = $1', [id]);
      res.json(staffRes.rows);
    } catch (err) {
      console.error('[staff] Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.post('/api/guilds/:id/staff-roles', requireAuth, async (req, res) => {
    const { id } = req.params;
    const { roleIds } = req.body;
    if (!roleIds || !Array.isArray(roleIds)) return res.status(400).json({ error: 'Invalid roleIds' });
    
    try {
      // For each role, fetch members and upsert into staff_members
      for (const roleId of roleIds) {
        const membersRes = await fetch(`${DISCORD_API}/guilds/${id}/members?limit=1000`, {
          headers: { Authorization: `Bot ${DISCORD_BOT_TOKEN}` },
        });
        if (membersRes.ok) {
          const members = await membersRes.json();
          const staffWithRole = members.filter(m => m.roles.includes(roleId));
          for (const m of staffWithRole) {
            await query(`
              INSERT INTO staff_members (guild_id, user_id, username, role)
              VALUES ($1, $2, $3, $4)
              ON CONFLICT (guild_id, user_id) DO UPDATE SET username = EXCLUDED.username
            `, [id, m.user.id, m.user.global_name || m.user.username, 'Staff']);
          }
        }
      }
      res.json({ ok: true });
    } catch (err) {
      console.error('[staff-roles] Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.get('/api/guilds/:id/premium', requireAuth, async (req, res) => {
    const { id } = req.params;
    try {
      const premiumRes = await query('SELECT is_premium FROM servers WHERE id = $1', [id]);
      res.json({ isPremium: premiumRes.rows[0]?.is_premium || false });
    } catch (err) {
      console.error('[premium] Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.get('/api/bot/stats', async (_req, res) => {
    try {
      const guildsCount = await query('SELECT COUNT(*) FROM servers');
      const usersCount = await query('SELECT COUNT(*) FROM users');
      res.json({
        guilds: guildsCount.rows[0].count,
        users: usersCount.rows[0].count,
        uptime: process.uptime(),
        status: 'Online'
      });
    } catch (err) {
      console.error('[stats] Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // ── Route-specific HTML files ───────────────────────────────────────────
  app.get('/select-server', (_req, res) => {
    const file = join(publicPath, 'select-server.html');
    if (existsSync(file)) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.sendFile(file);
    } else {
      res.redirect('/');
    }
  });

  app.get('/dashboard', (_req, res) => {
    const file = join(publicPath, 'dashboard.html');
    if (existsSync(file)) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.sendFile(file);
    } else {
      res.redirect('/');
    }
  });

  app.get('/settings', (_req, res) => {
    const file = join(publicPath, 'settings.html');
    if (existsSync(file)) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.sendFile(file);
    } else {
      res.redirect('/');
    }
  });

  app.get('/status', (_req, res) => {
    const file = join(publicPath, 'status.html');
    if (existsSync(file)) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.sendFile(file);
    } else {
      res.redirect('/');
    }
  });

  app.get('/premium', (_req, res) => {
    const file = join(publicPath, 'premium.html');
    if (existsSync(file)) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.sendFile(file);
    } else {
      res.redirect('/');
    }
  });

  app.get('/tos', (_req, res) => {
    const file = join(publicPath, 'tos.html');
    if (existsSync(file)) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.sendFile(file);
    } else {
      res.redirect('/');
    }
  });

  app.get('/privacy', (_req, res) => {
    const file = join(publicPath, 'privacy.html');
    if (existsSync(file)) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.sendFile(file);
    } else {
      res.redirect('/');
    }
  });

  // ── SPA fallback — must be last ───────────────────────────────────────────
  const indexHtml = join(publicPath, 'index.html');
  app.get('*', (_req, res) => {
    if (existsSync(indexHtml)) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.sendFile(indexHtml);
    } else {
      res.status(503).send('App not built. Check public directory.');
    }
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Zenith] Web server running on port ${PORT}`);
  });
  