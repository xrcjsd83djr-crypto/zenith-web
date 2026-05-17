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

// ── 1. HEALTH CHECKS FIRST — Railway needs these to respond instantly ────────
app.get('/health', (_req, res) => res.status(200).send('OK'));
app.get('/healthz', (_req, res) => res.status(200).send('OK'));
app.get('/ping', (_req, res) => res.status(200).send('pong'));

const {
  DISCORD_CLIENT_ID,
  DISCORD_CLIENT_SECRET,
  DISCORD_REDIRECT_URI,
  DISCORD_BOT_TOKEN,
  SESSION_SECRET = 'zenith-secret-key-123',
  DATABASE_URL,
} = process.env;

// ── 2. Trust proxy (required for Railway) ───────────────────────────────────
app.set('trust proxy', 1);
app.use(express.json());

// ── 3. Session store — use Postgres if available, fallback to memory ─────────
const PgSession = connectPgSimple(session);

const sessionStore = DATABASE_URL
  ? new PgSession({
      pool: pool,
      tableName: 'session',
      createTableIfMissing: true,
    })
  : undefined;

app.use(session({
  store: sessionStore,
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false,
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  },
}));

// ── 4. Initialize DB (non-blocking) ─────────────────────────────────────────
if (DATABASE_URL) {
  initDb().catch(err => console.error('[DB] Failed to init:', err));
}

// ── 5. Request logger ────────────────────────────────────────────────────────
app.use((req, _res, next) => {
  console.log(`[Req] ${req.method} ${req.url}`);
  next();
});

// ── Auth helpers ─────────────────────────────────────────────────────────────
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

    // Save session explicitly before redirect to ensure it's persisted
    req.session.save((err) => {
      if (err) console.error('[Auth] Session save error:', err);
      if (DATABASE_URL) {
        upsertUser(userData).catch(() => {});
      }
      res.redirect('/select-server');
    });
  } catch (err) {
    console.error('[auth] Callback error:', err);
    res.redirect('/?error=auth_failed');
  }
}

function requireAuth(req, res, next) {
  if (!req.session?.user) return res.status(401).json({ error: 'Not authenticated' });
  next();
}

// ── Auth Routes ──────────────────────────────────────────────────────────────
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

// ── User / Profile Routes ────────────────────────────────────────────────────
// /api/me — used internally
app.get('/api/me', requireAuth, (req, res) => {
  const { accessToken, ...safe } = req.session.user;
  res.json(safe);
});

// /api/user — used by dashboard.html
app.get('/api/user', requireAuth, (req, res) => {
  const { accessToken, ...safe } = req.session.user;
  res.json(safe);
});

// /api/auth/user — used by select-server.html
app.get('/api/auth/user', requireAuth, (req, res) => {
  const { accessToken, ...safe } = req.session.user;
  res.json(safe);
});

// ── Guild Routes ─────────────────────────────────────────────────────────────
// /api/guilds — internal
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
      iconUrl: g.icon ? `https://cdn.discordapp.com/icons/${g.id}/${g.icon}.png` : null,
    })));
  } catch (err) {
    console.error('[guilds]', err);
    res.status(500).json({ error: 'Failed to fetch guilds' });
  }
});

// /api/auth/guilds — used by select-server.html
app.get('/api/auth/guilds', requireAuth, async (req, res) => {
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

    // Check which guilds have the bot added
    const guildList = manageable.map(g => ({
      id: g.id,
      name: g.name,
      icon: g.icon,
      iconUrl: g.icon ? `https://cdn.discordapp.com/icons/${g.id}/${g.icon}.png` : null,
      owner: g.owner,
      role: g.owner ? 'Owner' : 'Admin',
      botAdded: false, // Will be updated below if bot token is available
    }));

    // Try to check if bot is in each guild
    if (DISCORD_BOT_TOKEN) {
      for (const guild of guildList) {
        try {
          const botGuildRes = await fetch(`${DISCORD_API}/guilds/${guild.id}`, {
            headers: { Authorization: `Bot ${DISCORD_BOT_TOKEN}` },
          });
          guild.botAdded = botGuildRes.ok;
        } catch {
          // ignore
        }
      }
    }

    res.json(guildList);
  } catch (err) {
    console.error('[auth/guilds]', err);
    res.status(500).json({ error: 'Failed to fetch guilds' });
  }
});

app.get('/api/guilds/:id/detailed', requireAuth, async (req, res) => {
  const { id } = req.params;
  const userToken = req.session.discordAccessToken;
  try {
    let guildData;
    if (DISCORD_BOT_TOKEN) {
      const botRes = await fetch(`${DISCORD_API}/guilds/${id}?with_counts=true`, {
        headers: { Authorization: `Bot ${DISCORD_BOT_TOKEN}` },
      });
      if (botRes.ok) {
        guildData = await botRes.json();
      }
    }
    if (!guildData) {
      const userRes = await fetch(`${DISCORD_API}/guilds/${id}`, {
        headers: { Authorization: `Bearer ${userToken}` },
      });
      guildData = await userRes.json();
    }

    let channels = [], roles = [];
    if (DISCORD_BOT_TOKEN) {
      const chanRes = await fetch(`${DISCORD_API}/guilds/${id}/channels`, {
        headers: { Authorization: `Bot ${DISCORD_BOT_TOKEN}` },
      });
      if (chanRes.ok) channels = await chanRes.json();

      const rolesRes = await fetch(`${DISCORD_API}/guilds/${id}/roles`, {
        headers: { Authorization: `Bot ${DISCORD_BOT_TOKEN}` },
      });
      if (rolesRes.ok) roles = await rolesRes.json();
    }

    res.json({
      name: guildData.name,
      icon: guildData.icon,
      iconUrl: guildData.icon ? `https://cdn.discordapp.com/icons/${id}/${guildData.icon}.png` : null,
      member_count: guildData.approximate_member_count || 0,
      online_count: guildData.approximate_presence_count || 0,
      channels: channels.length,
      roles: roles.length,
      emojis: guildData.emojis ? guildData.emojis.length : 0,
      stickers: guildData.stickers ? guildData.stickers.length : 0,
    });
  } catch (err) {
    console.error('[guilds/detailed]', err);
    res.status(500).json({ error: 'Error fetching details' });
  }
});

app.get('/api/guilds/:id/roles', requireAuth, async (req, res) => {
  const { id } = req.params;
  try {
    if (!DISCORD_BOT_TOKEN) return res.json([]);
    const rolesRes = await fetch(`${DISCORD_API}/guilds/${id}/roles`, {
      headers: { Authorization: `Bot ${DISCORD_BOT_TOKEN}` },
    });
    if (!rolesRes.ok) return res.json([]);
    const roles = await rolesRes.json();
    res.json(roles.map(r => ({ id: r.id, name: r.name, color: r.color })));
  } catch (err) {
    console.error('[guilds/roles]', err);
    res.json([]);
  }
});

app.get('/api/guilds/:id/premium', requireAuth, async (req, res) => {
  const { id } = req.params;
  try {
    if (!DATABASE_URL) return res.json({ isPremium: false });
    const result = await query('SELECT is_premium FROM servers WHERE id = $1', [id]);
    res.json({ isPremium: result.rows[0]?.is_premium || false });
  } catch {
    res.json({ isPremium: false });
  }
});

app.get('/api/guilds/:id/staff', requireAuth, async (req, res) => {
  try {
    if (!DATABASE_URL) return res.json([]);
    const staff = await query('SELECT * FROM staff_members WHERE guild_id = $1', [req.params.id]);
    res.json(staff.rows);
  } catch {
    res.json([]);
  }
});

// Get member details with all roles and avatar
app.get('/api/guilds/:id/member/:userId', requireAuth, async (req, res) => {
  const { id, userId } = req.params;
  if (!DISCORD_BOT_TOKEN) return res.status(400).json({ error: 'Bot token not configured' });
  try {
    const memberRes = await fetch(`${DISCORD_API}/guilds/${id}/members/${userId}`, {
      headers: { Authorization: `Bot ${DISCORD_BOT_TOKEN}` },
    });
    if (!memberRes.ok) return res.status(404).json({ error: 'Member not found' });
    const member = await memberRes.json();
    
    // Get all roles for this member
    const rolesRes = await fetch(`${DISCORD_API}/guilds/${id}/roles`, {
      headers: { Authorization: `Bot ${DISCORD_BOT_TOKEN}` },
    });
    const allRoles = rolesRes.ok ? await rolesRes.json() : [];
    
    // Map member role IDs to role objects
    const memberRoles = member.roles
      .map(roleId => allRoles.find(r => r.id === roleId))
      .filter(r => r && r.name !== '@everyone')
      .sort((a, b) => b.position - a.position);
    
    // Get highest role
    const highestRole = memberRoles.length > 0 ? memberRoles[0].name : 'Member';
    
    // Get avatar URL
    const avatarUrl = member.user.avatar
      ? `https://cdn.discordapp.com/avatars/${member.user.id}/${member.user.avatar}.png`
      : `https://cdn.discordapp.com/embed/avatars/${(parseInt(member.user.id) % 5)}.png`;
    
    res.json({
      user_id: member.user.id,
      username: member.user.global_name || member.user.username,
      avatar_url: avatarUrl,
      highest_role: highestRole,
      all_roles: memberRoles.map(r => ({ id: r.id, name: r.name, color: r.color })),
      joined_at: member.joined_at,
      nick: member.nick
    });
  } catch (err) {
    console.error('[member-details]', err);
    res.status(500).json({ error: 'Failed' });
  }
});

// Get staff with real-time status
app.get('/api/guilds/:id/staff-with-status', requireAuth, async (req, res) => {
  const { id } = req.params;
  if (!DISCORD_BOT_TOKEN) return res.status(400).json({ error: 'Bot token not configured' });
  try {
    // Get all members
    const membersRes = await fetch(`${DISCORD_API}/guilds/${id}/members?limit=1000`, {
      headers: { Authorization: `Bot ${DISCORD_BOT_TOKEN}` },
    });
    const allMembers = membersRes.ok ? await membersRes.json() : [];
    
    // Get all roles
    const rolesRes = await fetch(`${DISCORD_API}/guilds/${id}/roles`, {
      headers: { Authorization: `Bot ${DISCORD_BOT_TOKEN}` },
    });
    const allRoles = rolesRes.ok ? await rolesRes.json() : [];
    
    // Get staff from DB
    const staffResult = DATABASE_URL ? await query('SELECT * FROM staff_members WHERE guild_id = $1', [id]) : { rows: [] };
    const staffRows = staffResult.rows || [];
    const enrichedStaff = staffRows.map(s => {
      const member = allMembers.find(m => m.user.id === s.user_id);
      if (!member) return null;
      
      const memberRoles = member.roles
        .map(roleId => allRoles.find(r => r.id === roleId))
        .filter(r => r && r.name !== '@everyone')
        .sort((a, b) => b.position - a.position);
      
      const highestRole = memberRoles.length > 0 ? memberRoles[0].name : 'Member';
      const isOnline = member.user.status === 'online' || member.user.status === 'dnd' || member.user.status === 'idle';
      
      return {
        ...s,
        highest_role: highestRole,
        all_roles: memberRoles,
        status: isOnline ? 'online' : 'offline',
        avatar_url: member.user.avatar
          ? `https://cdn.discordapp.com/avatars/${member.user.id}/${member.user.avatar}.png`
          : `https://cdn.discordapp.com/embed/avatars/${(parseInt(member.user.id) % 5)}.png`
      };
    }).filter(s => s !== null);
    
    res.json(enrichedStaff);
  } catch (err) {
    console.error('[staff-status]', err);
    res.status(500).json({ error: 'Failed' });
  }
});



app.post('/api/guilds/:id/staff-roles', requireAuth, async (req, res) => {
  const { id } = req.params;
  const { roleIds } = req.body;
  if (!DISCORD_BOT_TOKEN) return res.status(400).json({ error: 'Bot token not configured' });
  if (!DATABASE_URL) return res.status(400).json({ error: 'Database not configured' });
  if (!roleIds || roleIds.length === 0) return res.status(400).json({ error: 'No roles selected' });
  
  try {
    let addedCount = 0;
    
    // Get all roles first
    const rolesRes = await fetch(`${DISCORD_API}/guilds/${id}/roles`, {
      headers: { Authorization: `Bot ${DISCORD_BOT_TOKEN}` },
    });
    const allRoles = rolesRes.ok ? await rolesRes.json() : [];
    
    // For each role, get members with that role
    for (const roleId of roleIds) {
      const membersRes = await fetch(`${DISCORD_API}/guilds/${id}/members?limit=1000`, {
        headers: { Authorization: `Bot ${DISCORD_BOT_TOKEN}` },
      });
      
      if (!membersRes.ok) continue;
      
      const members = await membersRes.json();
      const staffMembers = members.filter(m => m.roles.includes(roleId));
      
      // Get the role name
      const role = allRoles.find(r => r.id === roleId);
      const roleName = role ? role.name : 'Staff';
      
      for (const m of staffMembers) {
        const avatarUrl = m.user.avatar
          ? `https://cdn.discordapp.com/avatars/${m.user.id}/${m.user.avatar}.png`
          : `https://cdn.discordapp.com/embed/avatars/${(parseInt(m.user.id) % 5)}.png`;
        
        await query(`
          INSERT INTO staff_members (guild_id, user_id, username, avatar, avatar_url, role)
          VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT (guild_id, user_id) DO UPDATE SET username = EXCLUDED.username, avatar = EXCLUDED.avatar, avatar_url = EXCLUDED.avatar_url, role = EXCLUDED.role
        `, [id, m.user.id, m.user.global_name || m.user.username, m.user.avatar, avatarUrl, roleName]);
        
        addedCount++;
      }
    }
    
    res.json({ success: true, added: addedCount, message: `Added ${addedCount} staff members` });
  } catch (err) {
    console.error('[staff-roles]', err);
    res.status(500).json({ error: 'Failed to save staff roles', details: err.message });
  }
});

// ── Bot Stats ────────────────────────────────────────────────────────────────
app.get('/api/bot/stats', async (_req, res) => {
  try {
    if (!DATABASE_URL) return res.json({ guilds: 0, users: 0, status: 'Online' });
    const guilds = await query('SELECT COUNT(*) FROM servers');
    const users = await query('SELECT COUNT(*) FROM users');
    res.json({ guilds: guilds.rows[0].count, users: users.rows[0].count, status: 'Online' });
  } catch {
    res.json({ guilds: 0, users: 0, status: 'Online' });
  }
});

// ── Static Files ─────────────────────────────────────────────────────────────
const publicPath = join(__dirname, 'public');
app.use(express.static(publicPath));

app.get('/select-server', (_req, res) => res.sendFile(join(publicPath, 'select-server.html')));
app.get('/staff-portal', (_req, res) => res.sendFile(join(publicPath, 'staff-portal.html')));
app.get('/staff-dashboard', (_req, res) => res.sendFile(join(publicPath, 'staff-dashboard.html')));
app.get('/profile/:username', (_req, res) => res.sendFile(join(publicPath, 'profile.html')));
app.get('/admin-portal', (_req, res) => res.sendFile(join(publicPath, 'admin-portal.html')));
app.get('/dashboard', (_req, res) => res.sendFile(join(publicPath, 'dashboard.html')));
app.get('/status', (_req, res) => res.sendFile(join(publicPath, 'status.html')));
app.get('/premium', (_req, res) => res.sendFile(join(publicPath, 'premium.html')));
app.get('/settings', (_req, res) => res.sendFile(join(publicPath, 'settings.html')));
app.get('/server-settings', (_req, res) => res.sendFile(join(publicPath, 'settings-config.html')));
app.get('/staff-roster', (_req, res) => res.sendFile(join(publicPath, 'staff-roster.html')));
app.get('/privacy', (_req, res) => res.sendFile(join(publicPath, 'privacy.html')));
app.get('/tos', (_req, res) => res.sendFile(join(publicPath, 'tos.html')));

// Catch-all → index.html
app.get('*', (_req, res) => res.sendFile(join(publicPath, 'index.html')));

// ── Start Server ─────────────────────────────────────────────────────────────

// Global notifications storage
let globalNotifications = [];

// Admin Portal Endpoints
app.post('/api/admin/verify-pin', (req, res) => {
  const { pin, userId } = req.body;
  const ADMIN_ID = '1416209242838401064';
  const ADMIN_PIN = '1232009';
  
  if (userId !== ADMIN_ID) {
    return res.status(403).json({ error: 'Unauthorized' });
  }
  
  if (pin !== ADMIN_PIN) {
    return res.status(401).json({ error: 'Invalid PIN' });
  }
  
  res.json({ success: true, token: Buffer.from(userId + ':' + Date.now()).toString('base64') });
});

app.get('/api/admin/dashboard', (req, res) => {
  const ADMIN_ID = '1416209242838401064';
  const userId = req.user?.id;
  
  if (userId !== ADMIN_ID) {
    return res.status(403).json({ error: 'Unauthorized' });
  }
  
  res.json({
    totalUsers: 0,
    totalServers: 0,
    globalNotifications: globalNotifications.length,
    systemStatus: 'Online'
  });
});

app.post('/api/admin/send-notification', (req, res) => {
  const ADMIN_ID = '1416209242838401064';
  const userId = req.user?.id;
  
  if (userId !== ADMIN_ID) {
    return res.status(403).json({ error: 'Unauthorized' });
  }
  
  const { message, type } = req.body;
  
  if (!message) {
    return res.status(400).json({ error: 'Message required' });
  }
  
  const notification = {
    id: Date.now(),
    message,
    type: type || 'info',
    timestamp: new Date(),
    read: false
  };
  
  globalNotifications.unshift(notification);
  
  res.json({ success: true, notification });
});

app.get('/api/admin/notifications', (req, res) => {
  res.json(globalNotifications.slice(0, 50));
});

app.post('/api/admin/update-content', (req, res) => {
  const ADMIN_ID = '1416209242838401064';
  const userId = req.user?.id;
  
  if (userId !== ADMIN_ID) {
    return res.status(403).json({ error: 'Unauthorized' });
  }
  
  const { section, key, value } = req.body;
  
  // This would normally update a database or config file
  // For now, we'll just confirm the update
  res.json({ 
    success: true, 
    message: `Updated ${section}.${key}`,
    requiresConfirmation: true
  });
});

app.post('/api/admin/confirm-update', (req, res) => {
  const ADMIN_ID = '1416209242838401064';
  const userId = req.user?.id;
  
  if (userId !== ADMIN_ID) {
    return res.status(403).json({ error: 'Unauthorized' });
  }
  
  const { updateId, confirmationCode } = req.body;
  
  // Verify confirmation code (in production, this would be more secure)
  res.json({ 
    success: true, 
    message: 'Changes committed globally'
  });
});

app.get('/api/admin/system-logs', (req, res) => {
  const ADMIN_ID = '1416209242838401064';
  const userId = req.user?.id;
  
  if (userId !== ADMIN_ID) {
    return res.status(403).json({ error: 'Unauthorized' });
  }
  
  res.json({
    logs: [
      { timestamp: new Date(), action: 'System started', status: 'success' },
      { timestamp: new Date(), action: 'Database connected', status: 'success' }
    ]
  });
});

app.post('/api/admin/broadcast-message', (req, res) => {
  const ADMIN_ID = '1416209242838401064';
  const userId = req.user?.id;
  
  if (userId !== ADMIN_ID) {
    return res.status(403).json({ error: 'Unauthorized' });
  }
  
  const { title, message, icon } = req.body;
  
  const broadcast = {
    id: Date.now(),
    title,
    message,
    icon: icon || 'info',
    timestamp: new Date()
  };
  
  globalNotifications.unshift(broadcast);
  
  res.json({ success: true, broadcast });
});


// ── Staff Portal API ────────────────────────────────────────────────────────
// Get servers where user is staff (from bot database)
app.get('/api/staff/guilds', requireAuth, async (req, res) => {
  const userId = req.session.user.id;
  try {
    const result = await query(
      `SELECT DISTINCT sm.guild_id, s.name, s.icon, sm.role as rank
       FROM staff_members sm
       LEFT JOIN servers s ON sm.guild_id = s.id
       WHERE sm.user_id = $1
       ORDER BY s.name ASC`,
      [userId]
    );
    res.json(result.rows || []);
  } catch (err) {
    console.error('[staff/guilds]', err);
    res.status(500).json({ error: 'Failed to fetch staff guilds' });
  }
});

// Set Roblox username for staff member
app.post('/api/staff/verify-roblox', requireAuth, async (req, res) => {
  const userId = req.session.user.id;
  const { robloxUsername, guildId } = req.body;
  
  if (!robloxUsername || !guildId) {
    return res.status(400).json({ error: 'Missing robloxUsername or guildId' });
  }
  
  try {
    // Update user's Roblox username
    await query(
      `UPDATE users SET roblox_username = $1, roblox_verified = TRUE WHERE id = $2`,
      [robloxUsername, userId]
    );
    
    // Record staff portal session
    await query(
      `INSERT INTO staff_portal_sessions (user_id, guild_id, roblox_verified_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (user_id, guild_id) DO UPDATE SET roblox_verified_at = NOW()`,
      [userId, guildId]
    );
    
    res.json({ success: true, robloxUsername });
  } catch (err) {
    console.error('[staff/verify-roblox]', err);
    res.status(500).json({ error: 'Failed to verify Roblox username' });
  }
});

// Get public staff profile
app.get('/api/staff/profile/:robloxUsername', async (req, res) => {
  const { robloxUsername } = req.params;
  try {
    // Get user by Roblox username
    const userResult = await query(
      `SELECT id, username, avatar, roblox_username FROM users WHERE roblox_username = $1`,
      [robloxUsername]
    );
    
    if (!userResult.rows[0]) {
      return res.status(404).json({ error: 'Staff member not found' });
    }
    
    const user = userResult.rows[0];
    
    // Get staff positions across all servers
    const staffResult = await query(
      `SELECT sm.guild_id, g.name as guildName, g.icon_url as guildIcon, sm.role, sm.joined_at, sm.strikes
       FROM staff_members sm
       JOIN servers g ON sm.guild_id = g.id
       WHERE sm.user_id = $1 AND sm.role IS NOT NULL
       ORDER BY sm.joined_at DESC`,
      [user.id]
    );
    
    res.json({
      username: user.username,
      robloxUsername: user.roblox_username,
      avatar: user.avatar,
      staffPositions: staffResult.rows || [],
      totalServers: (staffResult.rows || []).length,
    });
  } catch (err) {
    console.error('[staff/profile]', err);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});


// Settings API
app.post('/api/guilds/:id/settings', requireAuth, async (req, res) => {
  const { id } = req.params;
  const settings = req.body;
  try {
    await query(
      `UPDATE servers SET settings = settings || $1 WHERE id = $2`,
      [JSON.stringify(settings), id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('[settings]', err);
    res.status(500).json({ error: 'Failed to save settings' });
  }
});

app.get('/api/guilds/:id/settings', requireAuth, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await query(`SELECT settings FROM servers WHERE id = $1`, [id]);
    res.json(result.rows[0]?.settings || {});
  } catch (err) {
    console.error('[settings]', err);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// Staff Roster API

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[Zenith] Server running on port ${PORT}`);
});

// Staff Dashboard API
app.get('/api/staff/dashboard', requireAuth, async (req, res) => {
  const userId = req.session.user.id;
  const { guildId } = req.query;
  try {
    const result = await query(
      `SELECT roblox_username, discord_username FROM users WHERE id = $1`,
      [userId]
    );
    res.json(result.rows[0] || {});
  } catch (err) {
    console.error('[staff/dashboard]', err);
    res.status(500).json({ error: 'Failed to fetch dashboard' });
  }
});

// Public Staff Profile API
app.get('/api/staff/profile/:username', async (req, res) => {
  const { username } = req.params;
  try {
    const result = await query(
      `SELECT id, roblox_username, discord_username FROM users WHERE roblox_username = $1`,
      [username]
    );
    res.json(result.rows[0] || null);
  } catch (err) {
    console.error('[staff/profile]', err);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});
