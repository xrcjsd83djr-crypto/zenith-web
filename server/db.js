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
        -- Channels
        logs_channel_id TEXT,
        loa_channel_id TEXT,
        applications_channel_id TEXT,
        applications_review_channel_id TEXT,
        welcome_channel_id TEXT,
        strike_log_channel_id TEXT,
        -- Roles
        staff_role_id TEXT,
        admin_role_id TEXT,
        management_role_id TEXT,
        on_loa_role_id TEXT,
        -- Embed settings
        embed_color TEXT DEFAULT '#5BA4CF',
        embed_footer TEXT DEFAULT 'Zenith Staff Management',
        -- Strike settings
        strike_threshold INTEGER DEFAULT 3,
        strike_action TEXT DEFAULT 'demotion',
        strike_automation BOOLEAN DEFAULT FALSE,
        -- LOA settings
        loa_max_days INTEGER DEFAULT 14,
        loa_require_approval BOOLEAN DEFAULT TRUE,
        -- Applications
        applications_enabled BOOLEAN DEFAULT FALSE,
        applications_title TEXT,
        applications_questions JSONB DEFAULT '[]',
        require_recommendations BOOLEAN DEFAULT FALSE,
        auto_reject BOOLEAN DEFAULT FALSE,
        -- General
        prefix TEXT DEFAULT '!',
        timezone TEXT DEFAULT 'UTC',
        activity_tracking BOOLEAN DEFAULT TRUE,
        premium_enabled BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS staff_members (
        id SERIAL PRIMARY KEY,
        guild_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        username TEXT,
        avatar TEXT,
        avatar_url TEXT,
        role TEXT,
        rank TEXT,
        rank_id TEXT,
        division TEXT,
        callsign TEXT,
        roblox_username TEXT,
        notes TEXT,
        strikes INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT TRUE,
        loa_status TEXT DEFAULT 'none',
        hours INTEGER DEFAULT 0,
        joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(guild_id, user_id)
      );

      CREATE TABLE IF NOT EXISTS ranks (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
        guild_id TEXT NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        discord_role_id TEXT,
        level INTEGER DEFAULT 0,
        color TEXT DEFAULT '#5865F2',
        is_default BOOLEAN DEFAULT FALSE,
        permissions TEXT[] DEFAULT ARRAY[]::TEXT[],
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(guild_id, name)
      );

      CREATE TABLE IF NOT EXISTS divisions (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
        guild_id TEXT NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        description TEXT,
        discord_role_id TEXT,
        channel_id TEXT,
        color TEXT DEFAULT '#5865F2',
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS strikes (
        id SERIAL PRIMARY KEY,
        guild_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        username TEXT,
        reason TEXT NOT NULL,
        evidence TEXT,
        issued_by TEXT NOT NULL,
        issued_by_name TEXT,
        active BOOLEAN DEFAULT TRUE,
        severity TEXT DEFAULT 'strike',
        appeal_status TEXT DEFAULT 'none',
        appeal_reason TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP,
        removed_at TIMESTAMP,
        removed_by TEXT
      );

      CREATE TABLE IF NOT EXISTS loa_requests (
        id SERIAL PRIMARY KEY,
        guild_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        username TEXT,
        reason TEXT NOT NULL,
        start_date TIMESTAMP NOT NULL,
        end_date TIMESTAMP NOT NULL,
        status TEXT DEFAULT 'pending',
        approved_by TEXT,
        approved_by_name TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS activity_logs (
        id SERIAL PRIMARY KEY,
        guild_id TEXT NOT NULL,
        user_id TEXT,
        username TEXT,
        action TEXT NOT NULL,
        details JSONB DEFAULT '{}',
        source TEXT DEFAULT 'bot',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS staff_portal_sessions (
        id SERIAL PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        guild_id TEXT NOT NULL,
        roblox_verified_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, guild_id)
      );

      CREATE TABLE IF NOT EXISTS shift_logs (
        id SERIAL PRIMARY KEY,
        guild_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        username TEXT,
        start_time TIMESTAMP,
        end_time TIMESTAMP,
        duration_minutes INTEGER,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Migrations for existing installs
    await query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS discord_username TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS roblox_username TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS roblox_verified BOOLEAN DEFAULT FALSE;

      ALTER TABLE servers ADD COLUMN IF NOT EXISTS icon_url TEXT;
      ALTER TABLE servers ADD COLUMN IF NOT EXISTS is_premium BOOLEAN DEFAULT FALSE;
      ALTER TABLE servers ADD COLUMN IF NOT EXISTS premium_expires_at TIMESTAMP;
      ALTER TABLE servers ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}';
      ALTER TABLE servers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

      ALTER TABLE staff_members ADD COLUMN IF NOT EXISTS avatar TEXT;
      ALTER TABLE staff_members ADD COLUMN IF NOT EXISTS avatar_url TEXT;
      ALTER TABLE staff_members ADD COLUMN IF NOT EXISTS role TEXT;
      ALTER TABLE staff_members ADD COLUMN IF NOT EXISTS rank TEXT;
      ALTER TABLE staff_members ADD COLUMN IF NOT EXISTS rank_id TEXT;
      ALTER TABLE staff_members ADD COLUMN IF NOT EXISTS division TEXT;
      ALTER TABLE staff_members ADD COLUMN IF NOT EXISTS callsign TEXT;
      ALTER TABLE staff_members ADD COLUMN IF NOT EXISTS roblox_username TEXT;
      ALTER TABLE staff_members ADD COLUMN IF NOT EXISTS notes TEXT;
      ALTER TABLE staff_members ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
      ALTER TABLE staff_members ADD COLUMN IF NOT EXISTS hours INTEGER DEFAULT 0;
      ALTER TABLE staff_members ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

      ALTER TABLE server_config ADD COLUMN IF NOT EXISTS logs_channel_id TEXT;
      ALTER TABLE server_config ADD COLUMN IF NOT EXISTS applications_review_channel_id TEXT;
      ALTER TABLE server_config ADD COLUMN IF NOT EXISTS welcome_channel_id TEXT;
      ALTER TABLE server_config ADD COLUMN IF NOT EXISTS strike_log_channel_id TEXT;
      ALTER TABLE server_config ADD COLUMN IF NOT EXISTS management_role_id TEXT;
      ALTER TABLE server_config ADD COLUMN IF NOT EXISTS on_loa_role_id TEXT;
      ALTER TABLE server_config ADD COLUMN IF NOT EXISTS embed_color TEXT DEFAULT '#5BA4CF';
      ALTER TABLE server_config ADD COLUMN IF NOT EXISTS embed_footer TEXT DEFAULT 'Zenith Staff Management';
      ALTER TABLE server_config ADD COLUMN IF NOT EXISTS strike_threshold INTEGER DEFAULT 3;
      ALTER TABLE server_config ADD COLUMN IF NOT EXISTS strike_action TEXT DEFAULT 'demotion';
      ALTER TABLE server_config ADD COLUMN IF NOT EXISTS strike_automation BOOLEAN DEFAULT FALSE;
      ALTER TABLE server_config ADD COLUMN IF NOT EXISTS loa_max_days INTEGER DEFAULT 14;
      ALTER TABLE server_config ADD COLUMN IF NOT EXISTS loa_require_approval BOOLEAN DEFAULT TRUE;
      ALTER TABLE server_config ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'UTC';
      ALTER TABLE server_config ADD COLUMN IF NOT EXISTS activity_tracking BOOLEAN DEFAULT TRUE;
      ALTER TABLE server_config ADD COLUMN IF NOT EXISTS applications_title TEXT;
      ALTER TABLE server_config ADD COLUMN IF NOT EXISTS applications_questions JSONB DEFAULT '[]';
      ALTER TABLE server_config ADD COLUMN IF NOT EXISTS require_recommendations BOOLEAN DEFAULT FALSE;
      ALTER TABLE server_config ADD COLUMN IF NOT EXISTS auto_reject BOOLEAN DEFAULT FALSE;
      ALTER TABLE server_config ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

      ALTER TABLE strikes ADD COLUMN IF NOT EXISTS severity TEXT DEFAULT 'strike';
      ALTER TABLE strikes ADD COLUMN IF NOT EXISTS appeal_status TEXT DEFAULT 'none';
      ALTER TABLE strikes ADD COLUMN IF NOT EXISTS appeal_reason TEXT;
      ALTER TABLE strikes ADD COLUMN IF NOT EXISTS removed_at TIMESTAMP;
      ALTER TABLE strikes ADD COLUMN IF NOT EXISTS removed_by TEXT;
    `);

    console.log('[DB] Database initialized successfully');
  } catch (err) {
    console.error('[DB] Init error:', err.message);
  }
}
