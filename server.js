import express from 'express';
  import session from 'express-session';
  import { fileURLToPath } from 'url';
  import { dirname, join } from 'path';
  import { existsSync } from 'fs';

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
  } = process.env;

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
      req.session.user = {
        id: user.id,
        username: user.global_name || user.username,
        avatar: user.avatar,
        avatarUrl: user.avatar
          ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`
          : `https://cdn.discordapp.com/embed/avatars/${Number(user.discriminator || 0) % 5}.png`,
        accessToken: tokens.access_token,
      };
      res.redirect('/servers');
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
  