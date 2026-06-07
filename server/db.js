// db v4 - PostgreSQL multi-DB sharding
import pg from 'pg';
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';

const { Pool } = pg;

const DB_URLS = {
  1: process.env.DATABASE_URL_1 || process.env.DATABASE_URL,
  2: process.env.DATABASE_URL_2,
  3: process.env.DATABASE_URL_3,
};
const ACTIVE_SLOT = parseInt(process.env.ACTIVE_DB_SLOT || '1');

const pools = {};
function getPool(slot = 1) {
  const url = DB_URLS[slot];
  if (!url) throw new Error(`[DB] No connection string for slot ${slot}`);
  if (!pools[slot]) {
    pools[slot] = new Pool({
      connectionString: url,
      ssl: { rejectUnauthorized: false },
      max: 10,
    });
  }
  return pools[slot];
}

export const masterPool = getPool(1);
export const pool = masterPool;

const guildSlotCache = new Map();

export async function getSlotForGuild(guildId) {
  if (guildSlotCache.has(guildId)) return guildSlotCache.get(guildId);

  const r = await masterPool.query(
    'SELECT db_slot FROM guild_db_assignments WHERE guild_id = $1',
    [guildId]
  );

  if (r.rows[0]) {
    const slot = r.rows[0].db_slot;
    guildSlotCache.set(guildId, slot);
    return slot;
  }

  const cap = parseInt(process.env[`DB${ACTIVE_SLOT}_CAP`] || '100');
  const count = await masterPool.query(
    'SELECT COUNT(*) FROM guild_db_assignments WHERE db_slot = $1',
    [ACTIVE_SLOT]
  );

  const slot = parseInt(count.rows[0].count) < cap ? ACTIVE_SLOT : ACTIVE_SLOT;

  await masterPool.query(
    'INSERT INTO guild_db_assignments (guild_id, db_slot) VALUES ($1, $2) ON CONFLICT DO NOTHING',
    [guildId, slot]
  );
  guildSlotCache.set(guildId, slot);
  return slot;
}

export async function query(text, params = [], guildId = null) {
  let slot = 1;
  if (guildId) slot = await getSlotForGuild(guildId);
  return getPool(slot).query(text, params);
}

export async function querySlot(slot, text, params = []) {
  return getPool(slot).query(text, params);
}

export function createSessionStore() {
  const PgSession = connectPgSimple(session);
  return new PgSession({
    pool: masterPool,
    tableName: 'session',
    createTableIfMissing: false,
    pruneSessionInterval: 300,
  });
}

export async function upsertUser(user) {
  try {
    const res = await masterPool.query(
      `INSERT INTO users (id, username, avatar, discord_id)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (discord_id)
       DO UPDATE SET username = EXCLUDED.username, avatar = EXCLUDED.avatar
       RETURNING *`,
      [user.id, user.username, user.avatar, user.id]
    );
    return res.rows[0] || user;
  } catch (err) {
    console.error('[DB] upsertUser error:', err.message);
    return user;
  }
}

export async function initDb() {
  const db1Url = DB_URLS[1];
  if (!db1Url) {
    console.log('[DB] No DATABASE_URL_1 or DATABASE_URL set, skipping init');
    return;
  }

  try {
    await masterPool.query(`
      CREATE TABLE IF NOT EXISTS guild_db_assignments (
        guild_id    TEXT PRIMARY KEY,
        db_slot     INTEGER NOT NULL DEFAULT 1,
        assigned_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('[DB] guild_db_assignments ready');
  } catch (err) {
    console.error('[DB] Failed to create guild_db_assignments:', err.message);
  }

  try {
    await masterPool.query(`
      CREATE TABLE IF NOT EXISTS system_outages (
        id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title            TEXT NOT NULL,
        description      TEXT NOT NULL,
        severity         TEXT DEFAULT 'minor',
        status           TEXT DEFAULT 'investigating',
        affected_systems TEXT[] DEFAULT '{}',
        resolution       TEXT,
        started_at       TIMESTAMP DEFAULT NOW(),
        resolved_at      TIMESTAMP,
        discord_posted   BOOLEAN DEFAULT FALSE,
        created_at       TIMESTAMP DEFAULT NOW(),
        updated_at       TIMESTAMP DEFAULT NOW()
      )
    `);

    await masterPool.query(`
      CREATE TABLE IF NOT EXISTS platform_config (
        key        TEXT PRIMARY KEY,
        value      TEXT,
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Seed the DB migration incident (idempotent via fixed UUID)
    const startedAt = new Date(Date.now() - 3.5 * 60 * 60 * 1000);
    await masterPool.query(
      `INSERT INTO system_outages
         (id, title, description, severity, status, affected_systems, resolution, started_at, resolved_at, discord_posted)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW(),TRUE)
       ON CONFLICT (id) DO NOTHING`,
      [
        '00000000-0000-4000-8000-000000000001',
        'Database Migration Failure — PostgreSQL → Turso',
        'An attempted migration from Supabase (PostgreSQL) to Turso/SQLite failed under production conditions. SQL dialect incompatibilities caused API failures and session loss across all servers.',
        'major',
        'resolved',
        ['Database', 'API Server', 'Sessions'],
        'Fully reverted to Supabase PostgreSQL. Multi-DB sharding architecture implemented for future scale. All data was intact — Supabase DB was never modified during the incident. Sessions re-established on next deploy.',
        startedAt,
      ]
    );
    console.log('[DB] system_outages + platform_config ready');
  } catch (err) {
    console.error('[DB] Failed to create outage tables:', err.message);
  }

  for (let slot = 1; slot <= 3; slot++) {
    if (!DB_URLS[slot]) continue;
    try {
      await initSlotSchema(getPool(slot));
      console.log(`[DB] Slot ${slot} schema ready`);
    } catch (err) {
      console.error(`[DB] Slot ${slot} init error:`, err.message);
    }
  }
}

async function initSlotSchema(p) {
  const exec = (sql) => p.query(sql);

  await exec(`CREATE TABLE IF NOT EXISTS users (
    id               TEXT PRIMARY KEY,
    username         TEXT NOT NULL,
    avatar           TEXT,
    discord_id       TEXT UNIQUE NOT NULL,
    discord_username TEXT,
    roblox_username  TEXT,
    roblox_id        TEXT,
    roblox_verified  INTEGER DEFAULT 0,
    created_at       TIMESTAMP DEFAULT NOW()
  )`);

  await exec(`CREATE TABLE IF NOT EXISTS servers (
    id                  TEXT PRIMARY KEY,
    name                TEXT NOT NULL,
    icon                TEXT,
    icon_url            TEXT,
    bot_added           INTEGER DEFAULT 0,
    owner_id            TEXT,
    is_premium          INTEGER DEFAULT 0,
    premium_expires_at  TIMESTAMP,
    premium_plan        TEXT DEFAULT 'free',
    premium_started_at  TIMESTAMP,
    premium_granted_by  TEXT,
    settings            JSONB DEFAULT '{}',
    reviewer_role_ids   JSONB DEFAULT '[]',
    apak_key            TEXT,
    custom_bot_name     TEXT,
    custom_bot_avatar   TEXT,
    custom_bot_status   TEXT,
    created_at          TIMESTAMP DEFAULT NOW(),
    updated_at          TIMESTAMP DEFAULT NOW()
  )`);

  await exec(`CREATE TABLE IF NOT EXISTS server_config (
    guild_id                      TEXT PRIMARY KEY,
    logs_channel_id               TEXT,
    loa_channel_id                TEXT,
    applications_channel_id       TEXT,
    applications_review_channel_id TEXT,
    welcome_channel_id            TEXT,
    strike_log_channel_id         TEXT,
    promotion_log_channel_id      TEXT,
    commendation_channel_id       TEXT,
    handbook_channel_id           TEXT,
    staff_role_id                 TEXT,
    admin_role_id                 TEXT,
    management_role_id            TEXT,
    on_loa_role_id                TEXT,
    staff_role_ids                JSONB DEFAULT '[]',
    admin_role_ids                JSONB DEFAULT '[]',
    management_role_ids           JSONB DEFAULT '[]',
    embed_color                   TEXT DEFAULT '#d4af37',
    embed_footer                  TEXT DEFAULT 'Zenith Staff Management',
    strike_threshold              INTEGER DEFAULT 3,
    strike_action                 TEXT DEFAULT 'demotion',
    strike_automation             INTEGER DEFAULT 0,
    strike_dm_user                INTEGER DEFAULT 1,
    strike_log_enabled            INTEGER DEFAULT 1,
    loa_max_days                  INTEGER DEFAULT 14,
    loa_require_approval          INTEGER DEFAULT 1,
    applications_enabled          INTEGER DEFAULT 0,
    applications_title            TEXT,
    applications_questions        JSONB DEFAULT '[]',
    require_recommendations       INTEGER DEFAULT 0,
    auto_reject                   INTEGER DEFAULT 0,
    prefix                        TEXT DEFAULT '!',
    timezone                      TEXT DEFAULT 'UTC',
    activity_tracking             INTEGER DEFAULT 1,
    shift_auto_send_cards         INTEGER DEFAULT 0,
    shift_cards_channel_id        TEXT,
    rank_request_reviewer_role_id TEXT,
    panel_description             TEXT,
    button_label                  TEXT DEFAULT 'Apply Now',
    account_age_limit             INTEGER DEFAULT 0,
    server_time_limit             INTEGER DEFAULT 0,
    rejection_cooldown            INTEGER DEFAULT 0,
    applications_embed_color      TEXT DEFAULT '#d4af37',
    updated_at                    TIMESTAMP DEFAULT NOW()
  )`);

  await exec(`CREATE TABLE IF NOT EXISTS staff_members (
    id            SERIAL PRIMARY KEY,
    guild_id      TEXT NOT NULL,
    user_id       TEXT NOT NULL,
    username      TEXT NOT NULL,
    avatar_url    TEXT,
    role          TEXT,
    rank          TEXT,
    division      TEXT,
    callsign      TEXT,
    notes         TEXT,
    roblox_username TEXT,
    roblox_id     TEXT,
    strikes       INTEGER DEFAULT 0,
    warnings      INTEGER DEFAULT 0,
    is_active     INTEGER DEFAULT 1,
    hired_by      TEXT,
    hired_by_name TEXT,
    joined_at     TIMESTAMP DEFAULT NOW(),
    updated_at    TIMESTAMP DEFAULT NOW(),
    UNIQUE(guild_id, user_id)
  )`);

  await exec(`CREATE TABLE IF NOT EXISTS strikes (
    id              SERIAL PRIMARY KEY,
    guild_id        TEXT NOT NULL,
    user_id         TEXT NOT NULL,
    username        TEXT NOT NULL,
    reason          TEXT NOT NULL,
    evidence        TEXT,
    issued_by       TEXT NOT NULL,
    issued_by_name  TEXT,
    active          INTEGER DEFAULT 1,
    severity        TEXT DEFAULT 'strike',
    removed_at      TIMESTAMP,
    removed_by      TEXT,
    removed_by_name TEXT,
    removal_reason  TEXT,
    expires_at      TIMESTAMP,
    appeal_status   TEXT DEFAULT 'none',
    appeal_reason   TEXT,
    created_at      TIMESTAMP DEFAULT NOW()
  )`);

  await exec(`CREATE TABLE IF NOT EXISTS warnings (
    id             SERIAL PRIMARY KEY,
    guild_id       TEXT NOT NULL,
    user_id        TEXT NOT NULL,
    username       TEXT NOT NULL,
    reason         TEXT NOT NULL,
    issued_by      TEXT NOT NULL,
    issued_by_name TEXT,
    severity       TEXT DEFAULT 'minor',
    active         INTEGER DEFAULT 1,
    created_at     TIMESTAMP DEFAULT NOW()
  )`);

  await exec(`CREATE TABLE IF NOT EXISTS blacklist (
    id              SERIAL PRIMARY KEY,
    guild_id        TEXT NOT NULL,
    user_id         TEXT,
    username        TEXT NOT NULL,
    reason          TEXT NOT NULL,
    evidence        TEXT,
    added_by        TEXT NOT NULL,
    added_by_name   TEXT,
    active          INTEGER DEFAULT 1,
    removed_at      TIMESTAMP,
    removed_by      TEXT,
    removed_by_name TEXT,
    removal_reason  TEXT,
    created_at      TIMESTAMP DEFAULT NOW()
  )`);

  await exec(`CREATE TABLE IF NOT EXISTS loa_requests (
    id               SERIAL PRIMARY KEY,
    guild_id         TEXT NOT NULL,
    user_id          TEXT NOT NULL,
    username         TEXT NOT NULL,
    reason           TEXT NOT NULL,
    start_date       TEXT NOT NULL,
    end_date         TEXT NOT NULL,
    status           TEXT DEFAULT 'pending',
    approved_by      TEXT,
    approved_by_name TEXT,
    review_notes     TEXT,
    created_at       TIMESTAMP DEFAULT NOW()
  )`);

  await exec(`CREATE TABLE IF NOT EXISTS ranks (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guild_id        TEXT NOT NULL,
    name            TEXT NOT NULL,
    level           INTEGER DEFAULT 0,
    color           TEXT DEFAULT '#5865F2',
    discord_role_id TEXT,
    is_default      INTEGER DEFAULT 0,
    permissions     JSONB DEFAULT '[]',
    created_at      TIMESTAMP DEFAULT NOW()
  )`);

  await exec(`CREATE TABLE IF NOT EXISTS activity_logs (
    id         SERIAL PRIMARY KEY,
    guild_id   TEXT NOT NULL,
    user_id    TEXT,
    username   TEXT,
    action     TEXT NOT NULL,
    details    JSONB DEFAULT '{}',
    ip_address TEXT,
    created_at TIMESTAMP DEFAULT NOW()
  )`);

  await exec(`CREATE TABLE IF NOT EXISTS shifts (
    id            SERIAL PRIMARY KEY,
    guild_id      TEXT NOT NULL,
    user_id       TEXT NOT NULL,
    username      TEXT NOT NULL,
    started_at    TIMESTAMP NOT NULL DEFAULT NOW(),
    ended_at      TIMESTAMP,
    duration_mins REAL,
    notes         TEXT,
    shift_type    TEXT DEFAULT 'general',
    break_mins    REAL DEFAULT 0
  )`);

  await exec(`CREATE TABLE IF NOT EXISTS staff_notes (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guild_id         TEXT NOT NULL,
    target_user_id   TEXT NOT NULL,
    target_username  TEXT NOT NULL,
    content          TEXT NOT NULL,
    author_id        TEXT,
    author_username  TEXT,
    is_private       INTEGER DEFAULT 0,
    created_at       TIMESTAMP DEFAULT NOW()
  )`);

  await exec(`CREATE TABLE IF NOT EXISTS server_announcements (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guild_id       TEXT NOT NULL,
    title          TEXT NOT NULL,
    content        TEXT NOT NULL,
    author_id      TEXT,
    author_username TEXT,
    channel_id     TEXT,
    message_id     TEXT,
    mass_dm        INTEGER DEFAULT 0,
    dm_sent        INTEGER DEFAULT 0,
    dm_failed      INTEGER DEFAULT 0,
    sent_at        TIMESTAMP DEFAULT NOW()
  )`);

  await exec(`CREATE TABLE IF NOT EXISTS promotion_history (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guild_id        TEXT NOT NULL,
    user_id         TEXT NOT NULL,
    username        TEXT NOT NULL,
    type            TEXT NOT NULL DEFAULT 'promotion',
    from_rank       TEXT,
    to_rank         TEXT,
    reason          TEXT,
    evidence        TEXT,
    promoted_by     TEXT NOT NULL,
    promoted_by_name TEXT,
    old_division    TEXT,
    new_division    TEXT,
    created_at      TIMESTAMP DEFAULT NOW()
  )`);

  await exec(`CREATE TABLE IF NOT EXISTS divisions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guild_id        TEXT NOT NULL,
    name            TEXT NOT NULL,
    description     TEXT,
    discord_role_id TEXT,
    channel_id      TEXT,
    color           TEXT DEFAULT '#5865F2',
    leader_id       TEXT,
    leader_name     TEXT,
    icon_emoji      TEXT DEFAULT '🏢',
    is_active       INTEGER DEFAULT 1,
    created_at      TIMESTAMP DEFAULT NOW()
  )`);

  await exec(`CREATE TABLE IF NOT EXISTS division_members (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    division_id TEXT,
    guild_id    TEXT NOT NULL,
    user_id     TEXT NOT NULL,
    username    TEXT NOT NULL,
    role        TEXT DEFAULT 'member',
    added_at    TIMESTAMP DEFAULT NOW(),
    UNIQUE(division_id, user_id)
  )`);

  await exec(`CREATE TABLE IF NOT EXISTS performance_reviews (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guild_id          TEXT NOT NULL,
    target_user_id    TEXT NOT NULL,
    target_username   TEXT NOT NULL,
    reviewer_id       TEXT NOT NULL,
    reviewer_username TEXT NOT NULL,
    rating            INTEGER NOT NULL DEFAULT 3,
    strengths         TEXT,
    improvements      TEXT,
    notes             TEXT,
    period            TEXT,
    is_public         INTEGER DEFAULT 1,
    created_at        TIMESTAMP DEFAULT NOW()
  )`);

  await exec(`CREATE TABLE IF NOT EXISTS custom_commands (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guild_id       TEXT NOT NULL,
    name           TEXT NOT NULL,
    description    TEXT NOT NULL DEFAULT '',
    response       TEXT NOT NULL,
    embed_title    TEXT,
    embed_color    TEXT DEFAULT '#5865F2',
    is_embed       INTEGER DEFAULT 0,
    allowed_roles  JSONB DEFAULT '[]',
    requires_role  TEXT,
    is_active      INTEGER DEFAULT 1,
    use_count      INTEGER DEFAULT 0,
    created_at     TIMESTAMP DEFAULT NOW(),
    UNIQUE(guild_id, name)
  )`);

  await exec(`CREATE TABLE IF NOT EXISTS handbook_entries (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guild_id         TEXT NOT NULL,
    title            TEXT NOT NULL,
    content          TEXT NOT NULL,
    category         TEXT,
    visible_to_roles JSONB DEFAULT '[]',
    is_public        INTEGER DEFAULT 1,
    order_index      INTEGER DEFAULT 0,
    created_at       TIMESTAMP DEFAULT NOW(),
    updated_at       TIMESTAMP DEFAULT NOW()
  )`);

  await exec(`CREATE TABLE IF NOT EXISTS rank_requests (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guild_id          TEXT NOT NULL,
    user_id           TEXT NOT NULL,
    username          TEXT NOT NULL,
    current_rank      TEXT,
    requested_rank    TEXT NOT NULL,
    reason            TEXT NOT NULL,
    evidence          TEXT,
    status            TEXT DEFAULT 'pending',
    reviewer_id       TEXT,
    reviewer_username TEXT,
    reviewer_notes    TEXT,
    created_at        TIMESTAMP DEFAULT NOW(),
    reviewed_at       TIMESTAMP
  )`);

  await exec(`CREATE TABLE IF NOT EXISTS commendations (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guild_id             TEXT NOT NULL,
    target_user_id       TEXT NOT NULL,
    target_username      TEXT NOT NULL,
    issued_by_id         TEXT NOT NULL,
    issued_by_username   TEXT NOT NULL,
    title                TEXT NOT NULL,
    description          TEXT NOT NULL,
    badge_type           TEXT DEFAULT 'star',
    channel_id           TEXT,
    message_id           TEXT,
    created_at           TIMESTAMP DEFAULT NOW()
  )`);

  await exec(`CREATE TABLE IF NOT EXISTS embed_configs (
    guild_id      TEXT PRIMARY KEY,
    color         TEXT DEFAULT '#d4af37',
    footer        TEXT DEFAULT 'Zenith Staff Management',
    thumbnail_url TEXT,
    show_timestamp INTEGER DEFAULT 1,
    updated_at    TIMESTAMP DEFAULT NOW()
  )`);

  await exec(`CREATE TABLE IF NOT EXISTS duty_roster (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guild_id        TEXT NOT NULL,
    user_id         TEXT NOT NULL,
    username        TEXT NOT NULL,
    avatar_url      TEXT,
    checked_in_at   TIMESTAMP NOT NULL DEFAULT NOW(),
    checked_out_at  TIMESTAMP,
    duration_mins   REAL DEFAULT 0,
    duty_type       TEXT DEFAULT 'general',
    notes           TEXT,
    on_duty         INTEGER DEFAULT 1
  )`);

  await exec(`CREATE TABLE IF NOT EXISTS auto_promotion_rules (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guild_id           TEXT NOT NULL,
    from_rank          TEXT NOT NULL,
    to_rank            TEXT NOT NULL,
    min_shift_hours    INTEGER DEFAULT 0,
    min_days_at_rank   INTEGER DEFAULT 0,
    require_no_strikes INTEGER DEFAULT 1,
    created_at         TIMESTAMP DEFAULT NOW()
  )`);

  await exec(`CREATE TABLE IF NOT EXISTS inactivity_scans (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guild_id      TEXT NOT NULL,
    user_id       TEXT NOT NULL,
    username      TEXT NOT NULL,
    last_activity TIMESTAMP,
    days_inactive INTEGER,
    status        TEXT DEFAULT 'flagged',
    action_taken  TEXT,
    dismissed_at  TIMESTAMP,
    scanned_at    TIMESTAMP DEFAULT NOW()
  )`);

  await exec(`CREATE TABLE IF NOT EXISTS application_forms (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guild_id             TEXT NOT NULL,
    title                TEXT NOT NULL,
    description          TEXT,
    questions            JSONB DEFAULT '[]',
    enabled              INTEGER DEFAULT 1,
    role_requirements    JSONB DEFAULT '[]',
    reviewer_role_ids    JSONB DEFAULT '[]',
    account_age_limit    INTEGER DEFAULT 0,
    server_time_limit    INTEGER DEFAULT 0,
    rejection_cooldown   INTEGER DEFAULT 0,
    custom_slug          TEXT,
    max_questions        INTEGER DEFAULT 13,
    button_label         TEXT DEFAULT 'Apply Now',
    panel_description    TEXT,
    created_at           TIMESTAMP DEFAULT NOW(),
    updated_at           TIMESTAMP DEFAULT NOW()
  )`);

  await exec(`CREATE TABLE IF NOT EXISTS application_submissions (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    form_id                 TEXT,
    guild_id                TEXT NOT NULL,
    user_id                 TEXT NOT NULL,
    username                TEXT NOT NULL,
    roblox_username         TEXT,
    answers                 JSONB DEFAULT '[]',
    status                  TEXT DEFAULT 'pending',
    reviewer_id             TEXT,
    reviewer_username       TEXT,
    review_notes            TEXT,
    interview_scheduled_at  TIMESTAMP,
    reviewed_at             TIMESTAMP,
    created_at              TIMESTAMP DEFAULT NOW()
  )`);

  await exec(`CREATE TABLE IF NOT EXISTS application_panels (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guild_id          TEXT NOT NULL,
    title             TEXT NOT NULL,
    description       TEXT,
    button_label      TEXT DEFAULT 'Apply Now',
    questions         JSONB DEFAULT '[]',
    review_role_ids   JSONB DEFAULT '[]',
    review_channel_id TEXT,
    enabled           INTEGER DEFAULT 1,
    created_at        TIMESTAMP DEFAULT NOW()
  )`);

  await exec(`CREATE TABLE IF NOT EXISTS application_panel_submissions (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guild_id         TEXT NOT NULL,
    panel_id         TEXT,
    panel_title      TEXT,
    user_id          TEXT NOT NULL,
    username         TEXT NOT NULL,
    answers          JSONB DEFAULT '{}',
    status           TEXT DEFAULT 'pending',
    reviewer_id      TEXT,
    reviewer_username TEXT,
    reviewer_notes   TEXT,
    created_at       TIMESTAMP DEFAULT NOW(),
    reviewed_at      TIMESTAMP
  )`);

  await exec(`CREATE TABLE IF NOT EXISTS shift_cards (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guild_id        TEXT NOT NULL,
    user_id         TEXT NOT NULL,
    username        TEXT NOT NULL,
    period_start    TIMESTAMP NOT NULL,
    period_end      TIMESTAMP NOT NULL,
    total_shifts    INTEGER DEFAULT 0,
    total_hours     REAL DEFAULT 0,
    sent_to_channel TEXT,
    sent_via_dm     INTEGER DEFAULT 0,
    sent_at         TIMESTAMP DEFAULT NOW()
  )`);

  await exec(`CREATE TABLE IF NOT EXISTS training_programs (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guild_id    TEXT NOT NULL,
    name        TEXT NOT NULL,
    description TEXT,
    category    TEXT DEFAULT 'general',
    created_at  TIMESTAMP DEFAULT NOW()
  )`);
}
