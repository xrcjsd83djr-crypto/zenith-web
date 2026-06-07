// db v3 - pg→sqlite compat - 2026-06-07T21:15:28Z\nimport { createClient } from '@libsql/client';
import session from 'express-session';

const TURSO_URL   = process.env.TURSO_DATABASE_URL;
const TURSO_TOKEN = process.env.TURSO_AUTH_TOKEN || '';

let _client = null;
function getClient() {
  if (!_client) {
    if (!TURSO_URL) throw new Error('[DB] TURSO_DATABASE_URL is not set');
    _client = createClient({ url: TURSO_URL, authToken: TURSO_TOKEN });
  }
  return _client;
}

// Compatibility shim — server.js imports `pool` for the old pg session store
export const pool = {};

// ── SQL adapter ──────────────────────────────────────────────────────────────
// Converts Postgres-specific SQL → SQLite/Turso compatible SQL
function adaptSql(text) {
  return text
    // 1. NOW() ± INTERVAL 'N unit' → datetime('now', '±N unit')  (must run BEFORE bare NOW())
    .replace(/NOW\(\)\s*-\s*INTERVAL\s*'(\d+)\s*(days?|hours?|minutes?|seconds?)'/gi,
      (_, n, u) => `datetime('now', '-${n} ${u.replace(/s$/,'').toLowerCase()}s')`)
    .replace(/NOW\(\)\s*\+\s*INTERVAL\s*'(\d+)\s*(days?|hours?|minutes?|seconds?)'/gi,
      (_, n, u) => `datetime('now', '+${n} ${u.replace(/s$/,'').toLowerCase()}s')`)
    // 2. created_at > NOW() - INTERVAL patterns already replaced above; replace bare NOW()
    .replace(/\bNOW\(\)/gi, "datetime('now')")
    // 3. EXTRACT(EPOCH FROM (a - b)) → (unixepoch(a) - unixepoch(b))
    .replace(/EXTRACT\s*\(\s*EPOCH\s+FROM\s*\(\s*([^()]+?)\s*-\s*([^()]+?)\s*\)\s*\)/gi,
      (_, a, b) => `(unixepoch(${a.trim()}) - unixepoch(${b.trim()}))`)
    .replace(/EXTRACT\s*\(\s*EPOCH\s+FROM\s+([^)]+?)\s*\)/gi,
      (_, e) => `unixepoch(${e.trim()})`)
    // 4. DATE_TRUNC
    .replace(/DATE_TRUNC\s*\(\s*'day'\s*,\s*([^)]+?)\s*\)/gi, 'date($1)')
    .replace(/DATE_TRUNC\s*\(\s*'month'\s*,\s*([^)]+?)\s*\)/gi, "strftime('%Y-%m-01',$1)")
    .replace(/DATE_TRUNC\s*\(\s*'week'\s*,\s*([^)]+?)\s*\)/gi, "date($1,'weekday 1','-7 days')")
    // 5. ILIKE → LIKE (SQLite LIKE is already case-insensitive for ASCII)
    .replace(/\bILIKE\b/gi, 'LIKE')
    // 6. PostgreSQL type casts ::type → remove
    .replace(/::(jsonb|json|text|int|integer|bigint|boolean|bool|date|timestamp(?:tz)?|uuid|float|double\s+precision|numeric|real|varchar|character\s+varying)\b/gi, '')
    // 7. gen_random_uuid() → portable UUID via randomblob
    .replace(/\bgen_random_uuid\(\)/gi,
      "lower(hex(randomblob(4)))||'-'||lower(hex(randomblob(2)))||'-4'||substr(lower(hex(randomblob(2))),2)||'-'||substr('89ab',abs(random())%4+1,1)||substr(lower(hex(randomblob(2))),2)||'-'||lower(hex(randomblob(6)))")
    // 8. $N positional → ? (libsql uses ? for positional)
    .replace(/\$\d+/g, '?');
}

function adaptParam(v) {
  if (v === null || v === undefined) return null;
  if (v instanceof Date) return v.toISOString();
  if (Array.isArray(v)) return JSON.stringify(v);
  if (typeof v === 'object') return JSON.stringify(v);
  if (typeof v === 'boolean') return v ? 1 : 0;
  return v;
}

function tryParseJson(v) {
  if (typeof v !== 'string') return v;
  const s = v.trim();
  if ((s.startsWith('[') && s.endsWith(']')) || (s.startsWith('{') && s.endsWith('}'))) {
    try { return JSON.parse(s); } catch { /* not JSON */ }
  }
  return v;
}

export async function query(text, params = []) {
  const client = getClient();
  const sql  = adaptSql(text);
  const args = (params || []).map(adaptParam);
  const result = await client.execute({ sql, args });
  const rows = Array.from(result.rows).map(row => {
    const obj = {};
    for (const [k, v] of Object.entries(row)) {
      obj[k] = typeof v === 'bigint' ? Number(v) : tryParseJson(v);
    }
    return obj;
  });
  return { rows, rowCount: rows.length };
}

// ── Session store backed by Turso ────────────────────────────────────────────
export class TursoSessionStore extends session.Store {
  get(sid, cb) {
    query('SELECT sess FROM session WHERE sid = ? AND expired_at > ?', [sid, Date.now()])
      .then(r => cb(null, r.rows[0] ? JSON.parse(r.rows[0].sess) : null))
      .catch(err => { console.error('[Session] get error:', err.message); cb(null, null); });
  }
  set(sid, sess, cb) {
    const exp = sess?.cookie?.expires
      ? new Date(sess.cookie.expires).getTime()
      : Date.now() + 7 * 24 * 60 * 60 * 1000;
    query('INSERT OR REPLACE INTO session (sid, sess, expired_at) VALUES (?, ?, ?)',
      [sid, JSON.stringify(sess), exp])
      .then(() => cb(null))
      .catch(err => { console.error('[Session] set error:', err.message); cb(null); });
  }
  destroy(sid, cb) {
    query('DELETE FROM session WHERE sid = ?', [sid])
      .then(() => cb(null))
      .catch(err => { console.error('[Session] destroy error:', err.message); cb(null); });
  }
  touch(sid, sess, cb) {
    const exp = sess?.cookie?.expires
      ? new Date(sess.cookie.expires).getTime()
      : Date.now() + 7 * 24 * 60 * 60 * 1000;
    query('UPDATE session SET expired_at = ? WHERE sid = ?', [exp, sid])
      .then(() => cb(null))
      .catch(err => { console.error('[Session] touch error:', err.message); cb(null); });
  }
}

// ── upsertUser ───────────────────────────────────────────────────────────────
export async function upsertUser(user) {
  try {
    const res = await query(
      `INSERT INTO users (id, username, avatar, discord_id)
       VALUES (?, ?, ?, ?)
       ON CONFLICT (discord_id)
       DO UPDATE SET username = excluded.username, avatar = excluded.avatar
       RETURNING *`,
      [user.id, user.username, user.avatar, user.id]
    );
    return res.rows[0] || user;
  } catch (err) {
    console.error('[DB] upsertUser error:', err.message);
    return user;
  }
}

// ── Schema init ──────────────────────────────────────────────────────────────
async function exec(sql) {
  return getClient().execute({ sql: sql.trim(), args: [] });
}

// SQLite UUID v4 expression for DEFAULT values
const UUID_EXPR = `(lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab', abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6))))`;

export async function initDb() {
  if (!TURSO_URL) {
    console.log('[DB] No TURSO_DATABASE_URL, skipping init');
    return;
  }
  try {
    await exec(`CREATE TABLE IF NOT EXISTS session (
      sid TEXT PRIMARY KEY,
      sess TEXT NOT NULL,
      expired_at INTEGER NOT NULL
    )`);

    await exec(`CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL,
      avatar TEXT,
      discord_id TEXT UNIQUE NOT NULL,
      discord_username TEXT,
      roblox_username TEXT,
      roblox_id TEXT,
      roblox_verified INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`);

    await exec(`CREATE TABLE IF NOT EXISTS servers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      icon TEXT,
      icon_url TEXT,
      bot_added INTEGER DEFAULT 0,
      owner_id TEXT,
      is_premium INTEGER DEFAULT 0,
      premium_expires_at TEXT,
      premium_plan TEXT DEFAULT 'free',
      premium_started_at TEXT,
      premium_granted_by TEXT,
      settings TEXT DEFAULT '{}',
      reviewer_role_ids TEXT DEFAULT '[]',
      apak_key TEXT,
      custom_bot_name TEXT,
      custom_bot_avatar TEXT,
      custom_bot_status TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`);

    await exec(`CREATE TABLE IF NOT EXISTS server_config (
      guild_id TEXT PRIMARY KEY,
      logs_channel_id TEXT,
      loa_channel_id TEXT,
      applications_channel_id TEXT,
      applications_review_channel_id TEXT,
      welcome_channel_id TEXT,
      strike_log_channel_id TEXT,
      promotion_log_channel_id TEXT,
      commendation_channel_id TEXT,
      handbook_channel_id TEXT,
      staff_role_id TEXT,
      admin_role_id TEXT,
      management_role_id TEXT,
      on_loa_role_id TEXT,
      staff_role_ids TEXT DEFAULT '[]',
      admin_role_ids TEXT DEFAULT '[]',
      management_role_ids TEXT DEFAULT '[]',
      embed_color TEXT DEFAULT '#d4af37',
      embed_footer TEXT DEFAULT 'Zenith Staff Management',
      strike_threshold INTEGER DEFAULT 3,
      strike_action TEXT DEFAULT 'demotion',
      strike_automation INTEGER DEFAULT 0,
      strike_dm_user INTEGER DEFAULT 1,
      strike_log_enabled INTEGER DEFAULT 1,
      loa_max_days INTEGER DEFAULT 14,
      loa_require_approval INTEGER DEFAULT 1,
      applications_enabled INTEGER DEFAULT 0,
      applications_title TEXT,
      applications_questions TEXT DEFAULT '[]',
      require_recommendations INTEGER DEFAULT 0,
      auto_reject INTEGER DEFAULT 0,
      prefix TEXT DEFAULT '!',
      timezone TEXT DEFAULT 'UTC',
      activity_tracking INTEGER DEFAULT 1,
      shift_auto_send_cards INTEGER DEFAULT 0,
      shift_cards_channel_id TEXT,
      rank_request_reviewer_role_id TEXT,
      panel_description TEXT,
      button_label TEXT DEFAULT 'Apply Now',
      account_age_limit INTEGER DEFAULT 0,
      server_time_limit INTEGER DEFAULT 0,
      rejection_cooldown INTEGER DEFAULT 0,
      applications_embed_color TEXT DEFAULT '#d4af37',
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`);

    await exec(`CREATE TABLE IF NOT EXISTS staff_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
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
      is_active INTEGER DEFAULT 1,
      hired_by TEXT,
      hired_by_name TEXT,
      joined_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(guild_id, user_id)
    )`);

    await exec(`CREATE TABLE IF NOT EXISTS strikes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      username TEXT NOT NULL,
      reason TEXT NOT NULL,
      evidence TEXT,
      issued_by TEXT NOT NULL,
      issued_by_name TEXT,
      active INTEGER DEFAULT 1,
      severity TEXT DEFAULT 'strike',
      removed_at TEXT,
      removed_by TEXT,
      removed_by_name TEXT,
      removal_reason TEXT,
      expires_at TEXT,
      appeal_status TEXT DEFAULT 'none',
      appeal_reason TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`);

    await exec(`CREATE TABLE IF NOT EXISTS warnings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      username TEXT NOT NULL,
      reason TEXT NOT NULL,
      issued_by TEXT NOT NULL,
      issued_by_name TEXT,
      severity TEXT DEFAULT 'minor',
      active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`);

    await exec(`CREATE TABLE IF NOT EXISTS blacklist (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      user_id TEXT,
      username TEXT NOT NULL,
      reason TEXT NOT NULL,
      evidence TEXT,
      added_by TEXT NOT NULL,
      added_by_name TEXT,
      active INTEGER DEFAULT 1,
      removed_at TEXT,
      removed_by TEXT,
      removed_by_name TEXT,
      removal_reason TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`);

    await exec(`CREATE TABLE IF NOT EXISTS loa_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      username TEXT NOT NULL,
      reason TEXT NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      approved_by TEXT,
      approved_by_name TEXT,
      review_notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`);

    await exec(`CREATE TABLE IF NOT EXISTS ranks (
      id TEXT PRIMARY KEY DEFAULT ${UUID_EXPR},
      guild_id TEXT NOT NULL,
      name TEXT NOT NULL,
      level INTEGER DEFAULT 0,
      color TEXT DEFAULT '#5865F2',
      discord_role_id TEXT,
      is_default INTEGER DEFAULT 0,
      permissions TEXT DEFAULT '[]',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`);

    await exec(`CREATE TABLE IF NOT EXISTS activity_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      user_id TEXT,
      username TEXT,
      action TEXT NOT NULL,
      details TEXT DEFAULT '{}',
      ip_address TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`);

    await exec(`CREATE TABLE IF NOT EXISTS shifts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      username TEXT NOT NULL,
      started_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      ended_at TEXT,
      duration_mins REAL,
      notes TEXT,
      shift_type TEXT DEFAULT 'general',
      break_mins REAL DEFAULT 0
    )`);

    await exec(`CREATE TABLE IF NOT EXISTS staff_notes (
      id TEXT PRIMARY KEY DEFAULT ${UUID_EXPR},
      guild_id TEXT NOT NULL,
      target_user_id TEXT NOT NULL,
      target_username TEXT NOT NULL,
      content TEXT NOT NULL,
      author_id TEXT,
      author_username TEXT,
      is_private INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`);

    await exec(`CREATE TABLE IF NOT EXISTS server_announcements (
      id TEXT PRIMARY KEY DEFAULT ${UUID_EXPR},
      guild_id TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      author_id TEXT,
      author_username TEXT,
      channel_id TEXT,
      message_id TEXT,
      mass_dm INTEGER DEFAULT 0,
      dm_sent INTEGER DEFAULT 0,
      dm_failed INTEGER DEFAULT 0,
      sent_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`);

    await exec(`CREATE TABLE IF NOT EXISTS promotion_history (
      id TEXT PRIMARY KEY DEFAULT ${UUID_EXPR},
      guild_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      username TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'promotion',
      from_rank TEXT,
      to_rank TEXT,
      reason TEXT,
      evidence TEXT,
      promoted_by TEXT NOT NULL,
      promoted_by_name TEXT,
      old_division TEXT,
      new_division TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`);

    await exec(`CREATE TABLE IF NOT EXISTS divisions (
      id TEXT PRIMARY KEY DEFAULT ${UUID_EXPR},
      guild_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      discord_role_id TEXT,
      channel_id TEXT,
      color TEXT DEFAULT '#5865F2',
      leader_id TEXT,
      leader_name TEXT,
      icon_emoji TEXT DEFAULT '🏢',
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`);

    await exec(`CREATE TABLE IF NOT EXISTS division_members (
      id TEXT PRIMARY KEY DEFAULT ${UUID_EXPR},
      division_id TEXT,
      guild_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      username TEXT NOT NULL,
      role TEXT DEFAULT 'member',
      added_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(division_id, user_id)
    )`);

    await exec(`CREATE TABLE IF NOT EXISTS performance_reviews (
      id TEXT PRIMARY KEY DEFAULT ${UUID_EXPR},
      guild_id TEXT NOT NULL,
      target_user_id TEXT NOT NULL,
      target_username TEXT NOT NULL,
      reviewer_id TEXT NOT NULL,
      reviewer_username TEXT NOT NULL,
      rating INTEGER NOT NULL DEFAULT 3,
      strengths TEXT,
      improvements TEXT,
      notes TEXT,
      period TEXT,
      is_public INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`);

    await exec(`CREATE TABLE IF NOT EXISTS custom_commands (
      id TEXT PRIMARY KEY DEFAULT ${UUID_EXPR},
      guild_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      response TEXT NOT NULL,
      embed_title TEXT,
      embed_color TEXT DEFAULT '#5865F2',
      is_embed INTEGER DEFAULT 0,
      allowed_roles TEXT DEFAULT '[]',
      requires_role TEXT,
      is_active INTEGER DEFAULT 1,
      use_count INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(guild_id, name)
    )`);

    await exec(`CREATE TABLE IF NOT EXISTS handbook_entries (
      id TEXT PRIMARY KEY DEFAULT ${UUID_EXPR},
      guild_id TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      category TEXT,
      visible_to_roles TEXT DEFAULT '[]',
      is_public INTEGER DEFAULT 1,
      order_index INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`);

    await exec(`CREATE TABLE IF NOT EXISTS rank_requests (
      id TEXT PRIMARY KEY DEFAULT ${UUID_EXPR},
      guild_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      username TEXT NOT NULL,
      current_rank TEXT,
      requested_rank TEXT NOT NULL,
      reason TEXT NOT NULL,
      evidence TEXT,
      status TEXT DEFAULT 'pending',
      reviewer_id TEXT,
      reviewer_username TEXT,
      reviewer_notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      reviewed_at TEXT
    )`);

    await exec(`CREATE TABLE IF NOT EXISTS commendations (
      id TEXT PRIMARY KEY DEFAULT ${UUID_EXPR},
      guild_id TEXT NOT NULL,
      target_user_id TEXT NOT NULL,
      target_username TEXT NOT NULL,
      issued_by_id TEXT NOT NULL,
      issued_by_username TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      badge_type TEXT DEFAULT 'star',
      channel_id TEXT,
      message_id TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`);

    await exec(`CREATE TABLE IF NOT EXISTS embed_configs (
      guild_id TEXT PRIMARY KEY,
      color TEXT DEFAULT '#d4af37',
      footer TEXT DEFAULT 'Zenith Staff Management',
      thumbnail_url TEXT,
      show_timestamp INTEGER DEFAULT 1,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`);

    await exec(`CREATE TABLE IF NOT EXISTS duty_roster (
      id TEXT PRIMARY KEY DEFAULT ${UUID_EXPR},
      guild_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      username TEXT NOT NULL,
      avatar_url TEXT,
      checked_in_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      checked_out_at TEXT,
      duration_mins REAL DEFAULT 0,
      duty_type TEXT DEFAULT 'general',
      notes TEXT,
      on_duty INTEGER DEFAULT 1
    )`);

    await exec(`CREATE TABLE IF NOT EXISTS auto_promotion_rules (
      id TEXT PRIMARY KEY DEFAULT ${UUID_EXPR},
      guild_id TEXT NOT NULL,
      from_rank TEXT NOT NULL,
      to_rank TEXT NOT NULL,
      min_shift_hours INTEGER DEFAULT 0,
      min_days_at_rank INTEGER DEFAULT 0,
      require_no_strikes INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`);

    await exec(`CREATE TABLE IF NOT EXISTS inactivity_scans (
      id TEXT PRIMARY KEY DEFAULT ${UUID_EXPR},
      guild_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      username TEXT NOT NULL,
      last_activity TEXT,
      days_inactive INTEGER,
      status TEXT DEFAULT 'flagged',
      action_taken TEXT,
      dismissed_at TEXT,
      scanned_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`);

    await exec(`CREATE TABLE IF NOT EXISTS application_forms (
      id TEXT PRIMARY KEY DEFAULT ${UUID_EXPR},
      guild_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      questions TEXT DEFAULT '[]',
      enabled INTEGER DEFAULT 1,
      role_requirements TEXT DEFAULT '[]',
      reviewer_role_ids TEXT DEFAULT '[]',
      account_age_limit INTEGER DEFAULT 0,
      server_time_limit INTEGER DEFAULT 0,
      rejection_cooldown INTEGER DEFAULT 0,
      custom_slug TEXT,
      max_questions INTEGER DEFAULT 13,
      button_label TEXT DEFAULT 'Apply Now',
      panel_description TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`);

    await exec(`CREATE TABLE IF NOT EXISTS application_submissions (
      id TEXT PRIMARY KEY DEFAULT ${UUID_EXPR},
      form_id TEXT,
      guild_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      username TEXT NOT NULL,
      roblox_username TEXT,
      answers TEXT DEFAULT '[]',
      status TEXT DEFAULT 'pending',
      reviewer_id TEXT,
      reviewer_username TEXT,
      review_notes TEXT,
      interview_scheduled_at TEXT,
      reviewed_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`);

    await exec(`CREATE TABLE IF NOT EXISTS application_panels (
      id TEXT PRIMARY KEY DEFAULT ${UUID_EXPR},
      guild_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      button_label TEXT DEFAULT 'Apply Now',
      questions TEXT DEFAULT '[]',
      review_role_ids TEXT DEFAULT '[]',
      review_channel_id TEXT,
      enabled INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`);

    await exec(`CREATE TABLE IF NOT EXISTS application_panel_submissions (
      id TEXT PRIMARY KEY DEFAULT ${UUID_EXPR},
      guild_id TEXT NOT NULL,
      panel_id TEXT,
      panel_title TEXT,
      user_id TEXT NOT NULL,
      username TEXT NOT NULL,
      answers TEXT DEFAULT '{}',
      status TEXT DEFAULT 'pending',
      reviewer_id TEXT,
      reviewer_username TEXT,
      reviewer_notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      reviewed_at TEXT
    )`);

    await exec(`CREATE TABLE IF NOT EXISTS shift_cards (
      id TEXT PRIMARY KEY DEFAULT ${UUID_EXPR},
      guild_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      username TEXT NOT NULL,
      period_start TEXT NOT NULL,
      period_end TEXT NOT NULL,
      total_shifts INTEGER DEFAULT 0,
      total_hours REAL DEFAULT 0,
      sent_to_channel TEXT,
      sent_via_dm INTEGER DEFAULT 0,
      sent_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`);

    await exec(`CREATE TABLE IF NOT EXISTS training_programs (
      id TEXT PRIMARY KEY DEFAULT ${UUID_EXPR},
      guild_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      category TEXT DEFAULT 'general',
      required INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`);

    await exec(`CREATE TABLE IF NOT EXISTS training_completions (
      id TEXT PRIMARY KEY DEFAULT ${UUID_EXPR},
      guild_id TEXT NOT NULL,
      program_id TEXT,
      program_name TEXT NOT NULL,
      user_id TEXT,
      username TEXT NOT NULL,
      completed_by TEXT,
      completed_by_name TEXT,
      score REAL,
      notes TEXT,
      completed_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`);

    await exec(`CREATE TABLE IF NOT EXISTS incident_reports (
      id TEXT PRIMARY KEY DEFAULT ${UUID_EXPR},
      guild_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      severity TEXT DEFAULT 'medium',
      involved_staff TEXT,
      location TEXT,
      reported_by TEXT,
      reported_by_name TEXT,
      status TEXT DEFAULT 'open',
      resolution TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`);

    await exec(`CREATE TABLE IF NOT EXISTS staff_goals (
      id TEXT PRIMARY KEY DEFAULT ${UUID_EXPR},
      guild_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      target_value REAL,
      current_value REAL DEFAULT 0,
      unit TEXT,
      due_date TEXT,
      status TEXT DEFAULT 'active',
      user_id TEXT,
      username TEXT,
      created_by TEXT,
      created_by_name TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`);

    await exec(`CREATE TABLE IF NOT EXISTS weekly_schedule (
      id TEXT PRIMARY KEY DEFAULT ${UUID_EXPR},
      guild_id TEXT NOT NULL,
      user_id TEXT,
      username TEXT,
      day_of_week INTEGER,
      start_time TEXT,
      end_time TEXT,
      timezone TEXT DEFAULT 'UTC',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`);

    await exec(`CREATE TABLE IF NOT EXISTS staff_evaluations (
      id TEXT PRIMARY KEY DEFAULT ${UUID_EXPR},
      guild_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      username TEXT NOT NULL,
      evaluator_id TEXT NOT NULL,
      evaluator_username TEXT NOT NULL,
      score INTEGER DEFAULT 0,
      category TEXT DEFAULT 'general',
      comments TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`);

    // ── Safe column additions (Turso supports IF NOT EXISTS for ADD COLUMN) ──
    const migrations = [
      "ALTER TABLE servers ADD COLUMN IF NOT EXISTS reviewer_role_ids TEXT DEFAULT '[]'",
      "ALTER TABLE servers ADD COLUMN IF NOT EXISTS apak_key TEXT",
      "ALTER TABLE servers ADD COLUMN IF NOT EXISTS custom_bot_name TEXT",
      "ALTER TABLE servers ADD COLUMN IF NOT EXISTS custom_bot_avatar TEXT",
      "ALTER TABLE servers ADD COLUMN IF NOT EXISTS custom_bot_status TEXT",
      "ALTER TABLE servers ADD COLUMN IF NOT EXISTS premium_plan TEXT DEFAULT 'free'",
      "ALTER TABLE servers ADD COLUMN IF NOT EXISTS premium_started_at TEXT",
      "ALTER TABLE servers ADD COLUMN IF NOT EXISTS premium_granted_by TEXT",
      "ALTER TABLE server_config ADD COLUMN IF NOT EXISTS staff_role_ids TEXT DEFAULT '[]'",
      "ALTER TABLE server_config ADD COLUMN IF NOT EXISTS admin_role_ids TEXT DEFAULT '[]'",
      "ALTER TABLE server_config ADD COLUMN IF NOT EXISTS management_role_ids TEXT DEFAULT '[]'",
      "ALTER TABLE server_config ADD COLUMN IF NOT EXISTS promotion_log_channel_id TEXT",
      "ALTER TABLE server_config ADD COLUMN IF NOT EXISTS commendation_channel_id TEXT",
      "ALTER TABLE server_config ADD COLUMN IF NOT EXISTS handbook_channel_id TEXT",
      "ALTER TABLE server_config ADD COLUMN IF NOT EXISTS strike_dm_user INTEGER DEFAULT 1",
      "ALTER TABLE server_config ADD COLUMN IF NOT EXISTS strike_log_enabled INTEGER DEFAULT 1",
      "ALTER TABLE server_config ADD COLUMN IF NOT EXISTS shift_auto_send_cards INTEGER DEFAULT 0",
      "ALTER TABLE server_config ADD COLUMN IF NOT EXISTS shift_cards_channel_id TEXT",
      "ALTER TABLE server_config ADD COLUMN IF NOT EXISTS rank_request_reviewer_role_id TEXT",
      "ALTER TABLE staff_members ADD COLUMN IF NOT EXISTS warnings INTEGER DEFAULT 0",
      "ALTER TABLE staff_members ADD COLUMN IF NOT EXISTS hired_by TEXT",
      "ALTER TABLE staff_members ADD COLUMN IF NOT EXISTS hired_by_name TEXT",
      "ALTER TABLE strikes ADD COLUMN IF NOT EXISTS removed_by_name TEXT",
      "ALTER TABLE strikes ADD COLUMN IF NOT EXISTS removal_reason TEXT",
      "ALTER TABLE strikes ADD COLUMN IF NOT EXISTS expires_at TEXT",
      "ALTER TABLE strikes ADD COLUMN IF NOT EXISTS appeal_status TEXT DEFAULT 'none'",
      "ALTER TABLE strikes ADD COLUMN IF NOT EXISTS appeal_reason TEXT",
      "ALTER TABLE blacklist ADD COLUMN IF NOT EXISTS evidence TEXT",
      "ALTER TABLE blacklist ADD COLUMN IF NOT EXISTS removed_by TEXT",
      "ALTER TABLE blacklist ADD COLUMN IF NOT EXISTS removed_by_name TEXT",
      "ALTER TABLE blacklist ADD COLUMN IF NOT EXISTS removal_reason TEXT",
      "ALTER TABLE blacklist ADD COLUMN IF NOT EXISTS removed_at TEXT",
      "ALTER TABLE loa_requests ADD COLUMN IF NOT EXISTS review_notes TEXT",
      "ALTER TABLE shifts ADD COLUMN IF NOT EXISTS duration_mins REAL",
      "ALTER TABLE shifts ADD COLUMN IF NOT EXISTS notes TEXT",
      "ALTER TABLE shifts ADD COLUMN IF NOT EXISTS shift_type TEXT DEFAULT 'general'",
      "ALTER TABLE shifts ADD COLUMN IF NOT EXISTS break_mins REAL DEFAULT 0",
      "ALTER TABLE ranks ADD COLUMN IF NOT EXISTS permissions TEXT DEFAULT '[]'",
      "ALTER TABLE activity_logs ADD COLUMN IF NOT EXISTS ip_address TEXT",
      "ALTER TABLE promotion_history ADD COLUMN IF NOT EXISTS old_division TEXT",
      "ALTER TABLE promotion_history ADD COLUMN IF NOT EXISTS new_division TEXT",
      "ALTER TABLE promotion_history ADD COLUMN IF NOT EXISTS evidence TEXT",
      "ALTER TABLE duty_roster ADD COLUMN IF NOT EXISTS avatar_url TEXT",
      "ALTER TABLE duty_roster ADD COLUMN IF NOT EXISTS duration_mins REAL DEFAULT 0",
      "ALTER TABLE duty_roster ADD COLUMN IF NOT EXISTS duty_type TEXT DEFAULT 'general'",
      "ALTER TABLE duty_roster ADD COLUMN IF NOT EXISTS notes TEXT",
      "ALTER TABLE duty_roster ADD COLUMN IF NOT EXISTS on_duty INTEGER DEFAULT 1",
      "ALTER TABLE server_announcements ADD COLUMN IF NOT EXISTS mass_dm INTEGER DEFAULT 0",
      "ALTER TABLE server_announcements ADD COLUMN IF NOT EXISTS dm_sent INTEGER DEFAULT 0",
      "ALTER TABLE server_announcements ADD COLUMN IF NOT EXISTS dm_failed INTEGER DEFAULT 0",
      "ALTER TABLE custom_commands ADD COLUMN IF NOT EXISTS use_count INTEGER DEFAULT 0",
      "ALTER TABLE custom_commands ADD COLUMN IF NOT EXISTS description TEXT DEFAULT ''",
      "ALTER TABLE handbook_entries ADD COLUMN IF NOT EXISTS visible_to_roles TEXT DEFAULT '[]'",
      "ALTER TABLE divisions ADD COLUMN IF NOT EXISTS icon_emoji TEXT DEFAULT '🏢'",
      "ALTER TABLE divisions ADD COLUMN IF NOT EXISTS leader_id TEXT",
      "ALTER TABLE divisions ADD COLUMN IF NOT EXISTS leader_name TEXT",
    ];

    for (const m of migrations) {
      await exec(m).catch(e => {
        if (!e.message?.includes('already exists') && !e.message?.includes('duplicate column')) {
          console.warn('[DB] Migration note:', e.message?.slice(0, 100));
        }
      });
    }

    // ── Missing tables (added during Supabase->Turso migration) ──────────────
    await exec(`CREATE TABLE IF NOT EXISTS application_hubs (
      id TEXT PRIMARY KEY,
      guild_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      embed_color TEXT DEFAULT '#d4af37',
      panel_ids TEXT DEFAULT '[]',
      channel_id TEXT,
      footer_text TEXT,
      webhook_url TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`).catch(()=>{});

    await exec(`CREATE TABLE IF NOT EXISTS staff_handbook (
      id TEXT PRIMARY KEY,
      guild_id TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT,
      section TEXT,
      sort_order INTEGER DEFAULT 0,
      is_premium INTEGER DEFAULT 0,
      is_public INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`).catch(()=>{});

    await exec(`CREATE TABLE IF NOT EXISTS strike_automation (
      id TEXT PRIMARY KEY,
      guild_id TEXT NOT NULL,
      enabled INTEGER DEFAULT 0,
      threshold INTEGER DEFAULT 3,
      action TEXT DEFAULT 'demotion',
      dm_message TEXT,
      remove_role_id TEXT,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`).catch(()=>{});

    // ── Additional column migrations from Supabase schema ────────────────────
    const extraMigrations = [
      'ALTER TABLE servers ADD COLUMN IF NOT EXISTS guild_rules TEXT',
      'ALTER TABLE server_config ADD COLUMN IF NOT EXISTS premium_enabled INTEGER DEFAULT 0',
      'ALTER TABLE server_config ADD COLUMN IF NOT EXISTS shift_tracking_enabled INTEGER DEFAULT 1',
      'ALTER TABLE server_config ADD COLUMN IF NOT EXISTS log_strikes INTEGER DEFAULT 1',
      'ALTER TABLE server_config ADD COLUMN IF NOT EXISTS log_promotions INTEGER DEFAULT 1',
      'ALTER TABLE server_config ADD COLUMN IF NOT EXISTS log_loa INTEGER DEFAULT 1',
      'ALTER TABLE server_config ADD COLUMN IF NOT EXISTS log_commendations INTEGER DEFAULT 1',
      'ALTER TABLE server_config ADD COLUMN IF NOT EXISTS log_applications INTEGER DEFAULT 1',
      'ALTER TABLE server_config ADD COLUMN IF NOT EXISTS log_staff_changes INTEGER DEFAULT 1',
      'ALTER TABLE server_config ADD COLUMN IF NOT EXISTS log_shifts INTEGER DEFAULT 1',
      'ALTER TABLE activity_logs ADD COLUMN IF NOT EXISTS source TEXT',
      'ALTER TABLE application_panels ADD COLUMN IF NOT EXISTS required_role_id TEXT',
      'ALTER TABLE application_panels ADD COLUMN IF NOT EXISTS rules TEXT',
      'ALTER TABLE application_panels ADD COLUMN IF NOT EXISTS results_channel_id TEXT',
      'ALTER TABLE application_panels ADD COLUMN IF NOT EXISTS allow_reapply INTEGER DEFAULT 0',
      'ALTER TABLE application_panels ADD COLUMN IF NOT EXISTS reapply_cooldown_days INTEGER DEFAULT 0',
      'ALTER TABLE application_submissions ADD COLUMN IF NOT EXISTS panel_title TEXT',
      'ALTER TABLE application_submissions ADD COLUMN IF NOT EXISTS panel_id TEXT',
      'ALTER TABLE application_submissions ADD COLUMN IF NOT EXISTS reviewer_notes TEXT',
      'ALTER TABLE commendations ADD COLUMN IF NOT EXISTS given_by_id TEXT',
      'ALTER TABLE commendations ADD COLUMN IF NOT EXISTS given_by_username TEXT',
      'ALTER TABLE commendations ADD COLUMN IF NOT EXISTS reason TEXT',
      'ALTER TABLE duty_roster ADD COLUMN IF NOT EXISTS role TEXT',
      'ALTER TABLE incident_reports ADD COLUMN IF NOT EXISTS updated_at TEXT',
      'ALTER TABLE rank_requests ADD COLUMN IF NOT EXISTS reviewed_by TEXT',
      'ALTER TABLE rank_requests ADD COLUMN IF NOT EXISTS reviewed_by_name TEXT',
      'ALTER TABLE staff_members ADD COLUMN IF NOT EXISTS loa_status TEXT',
      'ALTER TABLE staff_members ADD COLUMN IF NOT EXISTS avatar TEXT',
      'ALTER TABLE staff_members ADD COLUMN IF NOT EXISTS position TEXT',
      'ALTER TABLE staff_members ADD COLUMN IF NOT EXISTS hours INTEGER DEFAULT 0',
      'ALTER TABLE staff_members ADD COLUMN IF NOT EXISTS rank_id TEXT',
      'ALTER TABLE staff_members ADD COLUMN IF NOT EXISTS last_active TEXT',
    ];
    for (const m of extraMigrations) {
      await exec(m).catch(e => {
        if (!e.message?.includes('already exists') && !e.message?.includes('duplicate column')) {
          console.warn('[DB] Extra migration note:', e.message?.slice(0, 100));
        }
      });
    }

    await exec(`CREATE INDEX IF NOT EXISTS idx_shifts_guild_user ON shifts(guild_id, user_id)`).catch(() => {});
    await exec(`CREATE INDEX IF NOT EXISTS idx_shifts_guild_started ON shifts(guild_id, started_at)`).catch(() => {});
    await exec(`CREATE INDEX IF NOT EXISTS idx_activity_logs_guild ON activity_logs(guild_id, created_at)`).catch(() => {});
    await exec(`CREATE INDEX IF NOT EXISTS idx_strikes_guild ON strikes(guild_id, active)`).catch(() => {});

    console.log('[DB] Schema initialized successfully (Turso/SQLite)');
  } catch (err) {
    console.error('[DB] Init error:', err.message);
  }
}
