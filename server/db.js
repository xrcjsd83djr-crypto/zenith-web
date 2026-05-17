import pg from 'pg';
  const { Pool } = pg;

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 20000,
    idleTimeoutMillis: 30000,
    max: 10,
  });

  pool.on('error', (err) => {
    console.error('[DB] Unexpected pool error:', err.message);
  });

  export { pool };

  export async function query(text, params) {
    return pool.query(text, params);
  }

  export async function upsertUser(user) {
    try {
      const res = await query(
        `INSERT INTO users (id, username, avatar, discord_id)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (discord_id)
         DO UPDATE SET username = EXCLUDED.username, avatar = EXCLUDED.avatar
         RETURNING *`,
        [user.id, user.username, user.avatar, user.id]
      );
      return res.rows[0];
    } catch (err) {
      console.error('[DB] upsertUser error:', err.message);
      return user;
    }
  }

  export async function initDb() {
    if (!process.env.DATABASE_URL) {
      console.log('[DB] No DATABASE_URL, skipping init');
      return;
    }
    try {
      await query(`
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          username TEXT NOT NULL,
          avatar TEXT,
          discord_id TEXT UNIQUE NOT NULL,
          discord_username TEXT,
          roblox_username TEXT,
          roblox_id TEXT,
          roblox_verified BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS servers (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          icon TEXT,
          icon_url TEXT,
          bot_added BOOLEAN DEFAULT FALSE,
          owner_id TEXT,
          is_premium BOOLEAN DEFAULT FALSE,
          premium_expires_at TIMESTAMP,
          settings JSONB DEFAULT '{}',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS server_config (
          guild_id TEXT PRIMARY KEY,
          logs_channel_id TEXT,
          loa_channel_id TEXT,
          applications_channel_id TEXT,
          applications_review_channel_id TEXT,
          welcome_channel_id TEXT,
          strike_log_channel_id TEXT,
          staff_role_id TEXT,
          admin_role_id TEXT,
          management_role_id TEXT,
          on_loa_role_id TEXT,
          staff_role_ids TEXT[] DEFAULT '{}',
          admin_role_ids TEXT[] DEFAULT '{}',
          management_role_ids TEXT[] DEFAULT '{}',
          embed_color TEXT DEFAULT '#d4af37',
          embed_footer TEXT DEFAULT 'Zenith Staff Management',
          strike_threshold INTEGER DEFAULT 3,
          strike_action TEXT DEFAULT 'demotion',
          strike_automation BOOLEAN DEFAULT FALSE,
          loa_max_days INTEGER DEFAULT 14,
          loa_require_approval BOOLEAN DEFAULT TRUE,
          applications_enabled BOOLEAN DEFAULT FALSE,
          applications_title TEXT,
          applications_questions JSONB DEFAULT '[]',
          require_recommendations BOOLEAN DEFAULT FALSE,
          auto_reject BOOLEAN DEFAULT FALSE,
          prefix TEXT DEFAULT '!',
          timezone TEXT DEFAULT 'UTC',
          activity_tracking BOOLEAN DEFAULT TRUE,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS staff_members (
          id SERIAL PRIMARY KEY,
          guild_id TEXT NOT NULL,
          user_id TEXT NOT NULL,
          username TEXT NOT NULL,
          avatar_url TEXT,
          role TEXT,
          rank TEXT,
          division TEXT,
          callsign TEXT,
          notes TEXT,
          roblox_username TEXT,
          roblox_id TEXT,
          strikes INTEGER DEFAULT 0,
          warnings INTEGER DEFAULT 0,
          is_active BOOLEAN DEFAULT TRUE,
          joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(guild_id, user_id)
        );

        CREATE TABLE IF NOT EXISTS strikes (
          id SERIAL PRIMARY KEY,
          guild_id TEXT NOT NULL,
          user_id TEXT NOT NULL,
          username TEXT NOT NULL,
          reason TEXT NOT NULL,
          evidence TEXT,
          issued_by TEXT NOT NULL,
          issued_by_name TEXT,
          active BOOLEAN DEFAULT TRUE,
          severity TEXT DEFAULT 'strike',
          removed_at TIMESTAMP,
          removed_by TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS warnings (
          id SERIAL PRIMARY KEY,
          guild_id TEXT NOT NULL,
          user_id TEXT NOT NULL,
          username TEXT NOT NULL,
          reason TEXT NOT NULL,
          issued_by TEXT NOT NULL,
          issued_by_name TEXT,
          severity TEXT DEFAULT 'minor',
          active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS blacklist (
          id SERIAL PRIMARY KEY,
          guild_id TEXT NOT NULL,
          user_id TEXT,
          username TEXT NOT NULL,
          reason TEXT NOT NULL,
          added_by TEXT NOT NULL,
          added_by_name TEXT,
          active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS loa_requests (
          id SERIAL PRIMARY KEY,
          guild_id TEXT NOT NULL,
          user_id TEXT NOT NULL,
          username TEXT NOT NULL,
          reason TEXT NOT NULL,
          start_date TIMESTAMP NOT NULL,
          end_date TIMESTAMP NOT NULL,
          status TEXT DEFAULT 'pending',
          approved_by TEXT,
          approved_by_name TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS ranks (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          guild_id TEXT NOT NULL,
          name TEXT NOT NULL,
          level INTEGER DEFAULT 0,
          color TEXT DEFAULT '#5865F2',
          discord_role_id TEXT,
          is_default BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS activity_logs (
          id SERIAL PRIMARY KEY,
          guild_id TEXT NOT NULL,
          user_id TEXT,
          username TEXT,
          action TEXT NOT NULL,
          details JSONB DEFAULT '{}',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // Run migrations for existing installs
      await query(`
        ALTER TABLE server_config ADD COLUMN IF NOT EXISTS staff_role_ids TEXT[] DEFAULT '{}';
        ALTER TABLE server_config ADD COLUMN IF NOT EXISTS admin_role_ids TEXT[] DEFAULT '{}';
        ALTER TABLE server_config ADD COLUMN IF NOT EXISTS management_role_ids TEXT[] DEFAULT '{}';
        ALTER TABLE staff_members ADD COLUMN IF NOT EXISTS warnings INTEGER DEFAULT 0;
      `).catch(e => console.log('[DB] Migration note:', e.message));

      console.log('[DB] Schema initialized');
    } catch (err) {
      console.error('[DB] Init error:', err.message);
    }
  }
  