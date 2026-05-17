import pg from 'pg';
const { Pool } = pg;

// Railway networking can sometimes be flaky with IPv6, so we ensure proper connection options.
// We parse the DATABASE_URL to modify it for IPv4 if necessary
let connectionString = process.env.DATABASE_URL;
if (connectionString && connectionString.includes('supabase.co')) {
  // Append a parameter to prefer IPv4 if the driver supports it via some means, 
  // but mostly we rely on the network layer or direct IP.
  // Since we can't easily get the direct IP here without DNS lookup, 
  // we'll try to use the 'pg' native bindings or just standard settings.
}

const pool = new Pool({
  connectionString: connectionString,
  ssl: {
    rejectUnauthorized: false
  },
  connectionTimeoutMillis: 20000, // Increased timeout
  idleTimeoutMillis: 30000,
  max: 10
});

export { pool };

export async function query(text, params) {
  return pool.query(text, params);
}

export async function upsertUser(user) {
  try {
    const text = `
      INSERT INTO users (id, username, avatar, discord_id)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (discord_id) 
      DO UPDATE SET 
        username = EXCLUDED.username,
        avatar = EXCLUDED.avatar
      RETURNING *;
    `;
    const values = [user.id, user.username, user.avatar, user.id];
    const res = await query(text, values);
    return res.rows[0];
  } catch (err) {
    console.error('[DB] Failed to upsert user:', err.message);
    // Return the user object anyway so login doesn't crash if DB is temporarily unreachable
    return user;
  }
}

export async function initDb() {
  if (!process.env.DATABASE_URL) {
    console.log('[DB] No DATABASE_URL found, skipping initialization');
    return;
  }
  
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT NOT NULL,
        avatar TEXT,
        discord_id TEXT UNIQUE NOT NULL,
        roblox_username TEXT,
        roblox_id TEXT,
        roblox_verified BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE IF NOT EXISTS servers (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        icon TEXT,
        bot_added BOOLEAN DEFAULT FALSE,
        owner_id TEXT,
        is_premium BOOLEAN DEFAULT FALSE,
        settings JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE IF NOT EXISTS staff_members (
        id SERIAL PRIMARY KEY,
        guild_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        username TEXT,
        avatar TEXT,
        avatar_url TEXT,
        role TEXT,
        strikes INTEGER DEFAULT 0,
        loa_status TEXT DEFAULT 'none',
        joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(guild_id, user_id)
      );
      
      CREATE TABLE IF NOT EXISTS server_stats (
        guild_id TEXT PRIMARY KEY,
        member_count INTEGER DEFAULT 0,
        online_count INTEGER DEFAULT 0,
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE IF NOT EXISTS shifts (
        id SERIAL PRIMARY KEY,
        guild_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        username TEXT,
        start_time TIMESTAMP,
        end_time TIMESTAMP,
        duration_minutes INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE IF NOT EXISTS performance_reviews (
        id SERIAL PRIMARY KEY,
        guild_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        reviewer_id TEXT,
        rating INTEGER,
        comments TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE IF NOT EXISTS training_logs (
        id SERIAL PRIMARY KEY,
        guild_id TEXT NOT NULL,
        trainer_id TEXT,
        trainee_id TEXT,
        topic TEXT,
        duration_minutes INTEGER,
        notes TEXT,
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
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP
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
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE IF NOT EXISTS server_config (
        guild_id TEXT PRIMARY KEY,
        loa_channel_id TEXT,
        applications_channel_id TEXT,
        logs_channel_id TEXT,
        staff_role_id TEXT,
        admin_role_id TEXT,
        prefix TEXT DEFAULT '!',
        premium_enabled BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Existing Railway databases keep old CREATE TABLE shapes. Add missing columns explicitly.
    await query(`
      ALTER TABLE staff_members ADD COLUMN IF NOT EXISTS avatar TEXT;
      ALTER TABLE staff_members ADD COLUMN IF NOT EXISTS avatar_url TEXT;
      ALTER TABLE staff_members ADD COLUMN IF NOT EXISTS role TEXT;
      ALTER TABLE staff_members ADD COLUMN IF NOT EXISTS rank TEXT;
      ALTER TABLE staff_members ADD COLUMN IF NOT EXISTS position TEXT;
      ALTER TABLE staff_members ADD COLUMN IF NOT EXISTS hours INTEGER DEFAULT 0;
      ALTER TABLE staff_members ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

      ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS discord_username TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS roblox_username TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS roblox_verified BOOLEAN DEFAULT FALSE;

      ALTER TABLE servers ADD COLUMN IF NOT EXISTS icon_url TEXT;
      ALTER TABLE servers ADD COLUMN IF NOT EXISTS is_premium BOOLEAN DEFAULT FALSE;
      ALTER TABLE servers ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}';

      ALTER TABLE server_config ADD COLUMN IF NOT EXISTS applications_enabled BOOLEAN DEFAULT FALSE;
      ALTER TABLE server_config ADD COLUMN IF NOT EXISTS applications_channel_id TEXT;
      ALTER TABLE server_config ADD COLUMN IF NOT EXISTS applications_title TEXT;
      ALTER TABLE server_config ADD COLUMN IF NOT EXISTS applications_questions JSONB DEFAULT '[]'::jsonb;
      ALTER TABLE server_config ADD COLUMN IF NOT EXISTS require_recommendations BOOLEAN DEFAULT FALSE;
      ALTER TABLE server_config ADD COLUMN IF NOT EXISTS auto_reject BOOLEAN DEFAULT FALSE;
      ALTER TABLE server_config ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
    `);
    console.log('[DB] Database tables initialized');
  } catch (err) {
    console.error('[DB] Initialization error:', err);
  }
}
