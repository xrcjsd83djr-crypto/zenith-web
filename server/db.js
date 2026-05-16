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
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE IF NOT EXISTS servers (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        icon TEXT,
        bot_added BOOLEAN DEFAULT FALSE,
        owner_id TEXT,
        is_premium BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE IF NOT EXISTS staff_members (
        id SERIAL PRIMARY KEY,
        guild_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        username TEXT,
        role TEXT,
        strikes INTEGER DEFAULT 0,
        loa_status TEXT DEFAULT 'none',
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
    `);
    console.log('[DB] Database tables initialized');
  } catch (err) {
    console.error('[DB] Initialization error:', err);
  }
}
