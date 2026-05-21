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
    // ── Core tables ──────────────────────────────────────────────────────────
    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY, username TEXT NOT NULL, avatar TEXT,
        discord_id TEXT UNIQUE NOT NULL, discord_username TEXT,
        roblox_username TEXT, roblox_id TEXT, roblox_verified BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS servers (
        id TEXT PRIMARY KEY, name TEXT NOT NULL, icon TEXT, icon_url TEXT,
        bot_added BOOLEAN DEFAULT FALSE, owner_id TEXT,
        is_premium BOOLEAN DEFAULT FALSE, premium_expires_at TIMESTAMP,
        premium_plan TEXT DEFAULT 'free', premium_started_at TIMESTAMP, premium_granted_by TEXT,
        settings JSONB DEFAULT '{}', reviewer_role_ids TEXT[] DEFAULT '{}',
        apak_key TEXT, custom_bot_name TEXT, custom_bot_avatar TEXT, custom_bot_status TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS server_config (
        guild_id TEXT PRIMARY KEY,
        logs_channel_id TEXT, loa_channel_id TEXT, applications_channel_id TEXT,
        applications_review_channel_id TEXT, welcome_channel_id TEXT, strike_log_channel_id TEXT,
        promotion_log_channel_id TEXT, commendation_channel_id TEXT, handbook_channel_id TEXT,
        staff_role_id TEXT, admin_role_id TEXT, management_role_id TEXT, on_loa_role_id TEXT,
        staff_role_ids TEXT[] DEFAULT '{}', admin_role_ids TEXT[] DEFAULT '{}', management_role_ids TEXT[] DEFAULT '{}',
        embed_color TEXT DEFAULT '#d4af37', embed_footer TEXT DEFAULT 'Zenith Staff Management',
        strike_threshold INTEGER DEFAULT 3, strike_action TEXT DEFAULT 'demotion',
        strike_automation BOOLEAN DEFAULT FALSE, strike_dm_user BOOLEAN DEFAULT TRUE, strike_log_enabled BOOLEAN DEFAULT TRUE,
        loa_max_days INTEGER DEFAULT 14, loa_require_approval BOOLEAN DEFAULT TRUE,
        applications_enabled BOOLEAN DEFAULT FALSE, applications_title TEXT,
        applications_questions JSONB DEFAULT '[]', require_recommendations BOOLEAN DEFAULT FALSE, auto_reject BOOLEAN DEFAULT FALSE,
        prefix TEXT DEFAULT '!', timezone TEXT DEFAULT 'UTC', activity_tracking BOOLEAN DEFAULT TRUE,
        shift_auto_send_cards BOOLEAN DEFAULT FALSE, shift_cards_channel_id TEXT,
        rank_request_reviewer_role_id TEXT, panel_description TEXT, button_label TEXT DEFAULT 'Apply Now',
        account_age_limit INTEGER DEFAULT 0, server_time_limit INTEGER DEFAULT 0, rejection_cooldown INTEGER DEFAULT 0,
        applications_embed_color TEXT DEFAULT '#d4af37',
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS staff_members (
        id SERIAL PRIMARY KEY, guild_id TEXT NOT NULL, user_id TEXT NOT NULL, username TEXT NOT NULL,
        avatar_url TEXT, role TEXT, rank TEXT, division TEXT, callsign TEXT, notes TEXT,
        roblox_username TEXT, roblox_id TEXT, strikes INTEGER DEFAULT 0, warnings INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT TRUE, hired_by TEXT, hired_by_name TEXT,
        joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(guild_id, user_id)
      );
      CREATE TABLE IF NOT EXISTS strikes (
        id SERIAL PRIMARY KEY, guild_id TEXT NOT NULL, user_id TEXT NOT NULL, username TEXT NOT NULL,
        reason TEXT NOT NULL, evidence TEXT, issued_by TEXT NOT NULL, issued_by_name TEXT,
        active BOOLEAN DEFAULT TRUE, severity TEXT DEFAULT 'strike',
        removed_at TIMESTAMP, removed_by TEXT, removed_by_name TEXT, removal_reason TEXT,
        expires_at TIMESTAMP, appeal_status TEXT DEFAULT 'none', appeal_reason TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS warnings (
        id SERIAL PRIMARY KEY, guild_id TEXT NOT NULL, user_id TEXT NOT NULL, username TEXT NOT NULL,
        reason TEXT NOT NULL, issued_by TEXT NOT NULL, issued_by_name TEXT,
        severity TEXT DEFAULT 'minor', active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS blacklist (
        id SERIAL PRIMARY KEY, guild_id TEXT NOT NULL, user_id TEXT, username TEXT NOT NULL,
        reason TEXT NOT NULL, evidence TEXT, added_by TEXT NOT NULL, added_by_name TEXT,
        active BOOLEAN DEFAULT TRUE, removed_at TIMESTAMP, removed_by TEXT, removed_by_name TEXT, removal_reason TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS loa_requests (
        id SERIAL PRIMARY KEY, guild_id TEXT NOT NULL, user_id TEXT NOT NULL, username TEXT NOT NULL,
        reason TEXT NOT NULL, start_date TIMESTAMP NOT NULL, end_date TIMESTAMP NOT NULL,
        status TEXT DEFAULT 'pending', approved_by TEXT, approved_by_name TEXT, review_notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS ranks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(), guild_id TEXT NOT NULL, name TEXT NOT NULL,
        level INTEGER DEFAULT 0, color TEXT DEFAULT '#5865F2', discord_role_id TEXT,
        is_default BOOLEAN DEFAULT FALSE, permissions TEXT[] DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS activity_logs (
        id SERIAL PRIMARY KEY, guild_id TEXT NOT NULL, user_id TEXT, username TEXT,
        action TEXT NOT NULL, details JSONB DEFAULT '{}', ip_address TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS shifts (
        id SERIAL PRIMARY KEY, guild_id TEXT NOT NULL, user_id TEXT NOT NULL, username TEXT NOT NULL,
        started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, ended_at TIMESTAMP,
        duration_mins FLOAT, notes TEXT, shift_type TEXT DEFAULT 'general', break_mins FLOAT DEFAULT 0
      );
      CREATE TABLE IF NOT EXISTS staff_notes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(), guild_id TEXT NOT NULL,
        target_user_id TEXT NOT NULL, target_username TEXT NOT NULL, content TEXT NOT NULL,
        author_id TEXT, author_username TEXT, is_private BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS server_announcements (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(), guild_id TEXT NOT NULL,
        title TEXT NOT NULL, content TEXT NOT NULL, author_id TEXT, author_username TEXT,
        channel_id TEXT, message_id TEXT, mass_dm BOOLEAN DEFAULT FALSE,
        dm_sent INTEGER DEFAULT 0, dm_failed INTEGER DEFAULT 0,
        sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS promotion_history (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(), guild_id TEXT NOT NULL,
        user_id TEXT NOT NULL, username TEXT NOT NULL, type TEXT NOT NULL DEFAULT 'promotion',
        from_rank TEXT, to_rank TEXT, reason TEXT, evidence TEXT,
        promoted_by TEXT NOT NULL, promoted_by_name TEXT, old_division TEXT, new_division TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS divisions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(), guild_id TEXT NOT NULL, name TEXT NOT NULL,
        description TEXT, discord_role_id TEXT, channel_id TEXT, color TEXT DEFAULT '#5865F2',
        leader_id TEXT, leader_name TEXT, icon_emoji TEXT DEFAULT '🏢', is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS division_members (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(), division_id UUID,
        guild_id TEXT NOT NULL, user_id TEXT NOT NULL, username TEXT NOT NULL, role TEXT DEFAULT 'member',
        added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, UNIQUE(division_id, user_id)
      );
      CREATE TABLE IF NOT EXISTS performance_reviews (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(), guild_id TEXT NOT NULL,
        target_user_id TEXT NOT NULL, target_username TEXT NOT NULL,
        reviewer_id TEXT NOT NULL, reviewer_username TEXT NOT NULL,
        rating INTEGER NOT NULL DEFAULT 3, strengths TEXT, improvements TEXT, notes TEXT, period TEXT,
        is_public BOOLEAN DEFAULT TRUE, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS custom_commands (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(), guild_id TEXT NOT NULL,
        name TEXT NOT NULL, description TEXT NOT NULL DEFAULT '', response TEXT NOT NULL,
        embed_title TEXT, embed_color TEXT DEFAULT '#5865F2', is_embed BOOLEAN DEFAULT FALSE,
        allowed_roles TEXT[] DEFAULT '{}', requires_role TEXT, is_active BOOLEAN DEFAULT TRUE,
        use_count INTEGER DEFAULT 0, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(guild_id, name)
      );
      CREATE TABLE IF NOT EXISTS handbook_entries (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(), guild_id TEXT NOT NULL,
        title TEXT NOT NULL, content TEXT NOT NULL, category TEXT,
        visible_to_roles TEXT[] DEFAULT '{}', is_public BOOLEAN DEFAULT TRUE, order_index INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS rank_requests (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(), guild_id TEXT NOT NULL,
        user_id TEXT NOT NULL, username TEXT NOT NULL, current_rank TEXT, requested_rank TEXT NOT NULL,
        reason TEXT NOT NULL, evidence TEXT, status TEXT DEFAULT 'pending',
        reviewer_id TEXT, reviewer_username TEXT, reviewer_notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, reviewed_at TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS commendations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(), guild_id TEXT NOT NULL,
        target_user_id TEXT NOT NULL, target_username TEXT NOT NULL,
        issued_by_id TEXT NOT NULL, issued_by_username TEXT NOT NULL,
        title TEXT NOT NULL, description TEXT NOT NULL, badge_type TEXT DEFAULT 'star',
        channel_id TEXT, message_id TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS embed_configs (
        guild_id TEXT PRIMARY KEY, color TEXT DEFAULT '#d4af37',
        footer TEXT DEFAULT 'Zenith Staff Management', thumbnail_url TEXT,
        show_timestamp BOOLEAN DEFAULT TRUE, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS duty_roster (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(), guild_id TEXT NOT NULL,
        user_id TEXT NOT NULL, username TEXT NOT NULL, avatar_url TEXT,
        checked_in_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, checked_out_at TIMESTAMP,
        duration_mins FLOAT DEFAULT 0, duty_type TEXT DEFAULT 'general', notes TEXT, on_duty BOOLEAN DEFAULT TRUE
      );
      CREATE TABLE IF NOT EXISTS auto_promotion_rules (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(), guild_id TEXT NOT NULL,
        from_rank TEXT NOT NULL, to_rank TEXT NOT NULL,
        min_shift_hours INTEGER DEFAULT 0, min_days_at_rank INTEGER DEFAULT 0,
        require_no_strikes BOOLEAN DEFAULT TRUE, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS inactivity_scans (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(), guild_id TEXT NOT NULL,
        user_id TEXT NOT NULL, username TEXT NOT NULL, last_activity TIMESTAMP,
        days_inactive INTEGER, status TEXT DEFAULT 'flagged', action_taken TEXT,
        dismissed_at TIMESTAMP, scanned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS application_forms (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(), guild_id TEXT NOT NULL,
        title TEXT NOT NULL, description TEXT, questions JSONB DEFAULT '[]',
        enabled BOOLEAN DEFAULT TRUE, role_requirements TEXT[] DEFAULT '{}',
        reviewer_role_ids TEXT[] DEFAULT '{}', account_age_limit INTEGER DEFAULT 0,
        server_time_limit INTEGER DEFAULT 0, rejection_cooldown INTEGER DEFAULT 0,
        custom_slug TEXT, max_questions INTEGER DEFAULT 13,
        button_label TEXT DEFAULT 'Apply Now', panel_description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS application_submissions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        form_id UUID,
        guild_id TEXT NOT NULL, user_id TEXT NOT NULL, username TEXT NOT NULL, roblox_username TEXT,
        answers JSONB DEFAULT '[]', status TEXT DEFAULT 'pending',
        reviewer_id TEXT, reviewer_username TEXT, review_notes TEXT,
        interview_scheduled_at TIMESTAMP, reviewed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS application_panels (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(), guild_id TEXT NOT NULL,
        title TEXT NOT NULL, description TEXT, button_label TEXT DEFAULT 'Apply Now',
        questions JSONB DEFAULT '[]', review_role_ids TEXT[] DEFAULT '{}',
        review_channel_id TEXT, enabled BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS application_panel_submissions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(), guild_id TEXT NOT NULL,
        panel_id UUID, panel_title TEXT, user_id TEXT NOT NULL, username TEXT NOT NULL,
        answers JSONB DEFAULT '{}', status TEXT DEFAULT 'pending',
        reviewer_id TEXT, reviewer_username TEXT, reviewer_notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, reviewed_at TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS shift_cards (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(), guild_id TEXT NOT NULL,
        user_id TEXT NOT NULL, username TEXT NOT NULL,
        period_start TIMESTAMP NOT NULL, period_end TIMESTAMP NOT NULL,
        total_shifts INTEGER DEFAULT 0, total_hours FLOAT DEFAULT 0,
        sent_to_channel TEXT, sent_via_dm BOOLEAN DEFAULT FALSE,
        sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS training_programs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(), guild_id TEXT NOT NULL,
        name TEXT NOT NULL, description TEXT, category TEXT DEFAULT 'general',
        required BOOLEAN DEFAULT FALSE, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS training_completions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(), guild_id TEXT NOT NULL,
        program_id UUID, program_name TEXT NOT NULL, user_id TEXT, username TEXT NOT NULL,
        completed_by TEXT, completed_by_name TEXT, score FLOAT, notes TEXT,
        completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS incident_reports (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(), guild_id TEXT NOT NULL,
        title TEXT NOT NULL, description TEXT NOT NULL, severity TEXT DEFAULT 'medium',
        involved_staff TEXT, location TEXT, reported_by TEXT, reported_by_name TEXT,
        status TEXT DEFAULT 'open', resolution TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS staff_goals (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(), guild_id TEXT NOT NULL,
        title TEXT NOT NULL, description TEXT, target_value FLOAT, current_value FLOAT DEFAULT 0,
        unit TEXT, due_date TIMESTAMP, status TEXT DEFAULT 'active',
        user_id TEXT, username TEXT, created_by TEXT, created_by_name TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS weekly_schedule (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(), guild_id TEXT NOT NULL,
        user_id TEXT, username TEXT, day_of_week INTEGER, start_time TEXT, end_time TEXT,
        timezone TEXT DEFAULT 'UTC', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS staff_evaluations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(), guild_id TEXT NOT NULL,
        user_id TEXT NOT NULL, username TEXT NOT NULL,
        evaluator_id TEXT NOT NULL, evaluator_username TEXT NOT NULL,
        score INTEGER DEFAULT 0, category TEXT DEFAULT 'general', comments TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // ── Migrations: safe ALTER TABLE ADD COLUMN IF NOT EXISTS ────────────────
    const migrations = [
      "ALTER TABLE servers ADD COLUMN IF NOT EXISTS reviewer_role_ids TEXT[] DEFAULT '{}'",
      "ALTER TABLE servers ADD COLUMN IF NOT EXISTS apak_key TEXT",
      "ALTER TABLE servers ADD COLUMN IF NOT EXISTS custom_bot_name TEXT",
      "ALTER TABLE servers ADD COLUMN IF NOT EXISTS custom_bot_avatar TEXT",
      "ALTER TABLE servers ADD COLUMN IF NOT EXISTS custom_bot_status TEXT",
      "ALTER TABLE servers ADD COLUMN IF NOT EXISTS premium_plan TEXT DEFAULT 'free'",
      "ALTER TABLE servers ADD COLUMN IF NOT EXISTS premium_started_at TIMESTAMP",
      "ALTER TABLE servers ADD COLUMN IF NOT EXISTS premium_granted_by TEXT",
      "ALTER TABLE server_config ADD COLUMN IF NOT EXISTS staff_role_ids TEXT[] DEFAULT '{}'",
      "ALTER TABLE server_config ADD COLUMN IF NOT EXISTS admin_role_ids TEXT[] DEFAULT '{}'",
      "ALTER TABLE server_config ADD COLUMN IF NOT EXISTS management_role_ids TEXT[] DEFAULT '{}'",
      "ALTER TABLE server_config ADD COLUMN IF NOT EXISTS promotion_log_channel_id TEXT",
      "ALTER TABLE server_config ADD COLUMN IF NOT EXISTS commendation_channel_id TEXT",
      "ALTER TABLE server_config ADD COLUMN IF NOT EXISTS handbook_channel_id TEXT",
      "ALTER TABLE server_config ADD COLUMN IF NOT EXISTS strike_dm_user BOOLEAN DEFAULT TRUE",
      "ALTER TABLE server_config ADD COLUMN IF NOT EXISTS strike_log_enabled BOOLEAN DEFAULT TRUE",
      "ALTER TABLE server_config ADD COLUMN IF NOT EXISTS shift_auto_send_cards BOOLEAN DEFAULT FALSE",
      "ALTER TABLE server_config ADD COLUMN IF NOT EXISTS shift_cards_channel_id TEXT",
      "ALTER TABLE server_config ADD COLUMN IF NOT EXISTS rank_request_reviewer_role_id TEXT",
      "ALTER TABLE staff_members ADD COLUMN IF NOT EXISTS warnings INTEGER DEFAULT 0",
      "ALTER TABLE staff_members ADD COLUMN IF NOT EXISTS hired_by TEXT",
      "ALTER TABLE staff_members ADD COLUMN IF NOT EXISTS hired_by_name TEXT",
      "ALTER TABLE strikes ADD COLUMN IF NOT EXISTS removed_by_name TEXT",
      "ALTER TABLE strikes ADD COLUMN IF NOT EXISTS removal_reason TEXT",
      "ALTER TABLE strikes ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP",
      "ALTER TABLE strikes ADD COLUMN IF NOT EXISTS appeal_status TEXT DEFAULT 'none'",
      "ALTER TABLE strikes ADD COLUMN IF NOT EXISTS appeal_reason TEXT",
      "ALTER TABLE blacklist ADD COLUMN IF NOT EXISTS evidence TEXT",
      "ALTER TABLE blacklist ADD COLUMN IF NOT EXISTS removed_by TEXT",
      "ALTER TABLE blacklist ADD COLUMN IF NOT EXISTS removed_by_name TEXT",
      "ALTER TABLE blacklist ADD COLUMN IF NOT EXISTS removal_reason TEXT",
      "ALTER TABLE blacklist ADD COLUMN IF NOT EXISTS removed_at TIMESTAMP",
      "ALTER TABLE loa_requests ADD COLUMN IF NOT EXISTS review_notes TEXT",
      // CRITICAL: ensure duration_mins exists on shifts
      "ALTER TABLE shifts ADD COLUMN IF NOT EXISTS duration_mins FLOAT",
      "ALTER TABLE shifts ADD COLUMN IF NOT EXISTS notes TEXT",
      "ALTER TABLE shifts ADD COLUMN IF NOT EXISTS shift_type TEXT DEFAULT 'general'",
      "ALTER TABLE shifts ADD COLUMN IF NOT EXISTS break_mins FLOAT DEFAULT 0",
      "ALTER TABLE ranks ADD COLUMN IF NOT EXISTS permissions TEXT[] DEFAULT '{}'",
      "ALTER TABLE activity_logs ADD COLUMN IF NOT EXISTS ip_address TEXT",
      "ALTER TABLE promotion_history ADD COLUMN IF NOT EXISTS old_division TEXT",
      "ALTER TABLE promotion_history ADD COLUMN IF NOT EXISTS new_division TEXT",
      "ALTER TABLE promotion_history ADD COLUMN IF NOT EXISTS evidence TEXT",
      "ALTER TABLE duty_roster ADD COLUMN IF NOT EXISTS avatar_url TEXT",
      "ALTER TABLE duty_roster ADD COLUMN IF NOT EXISTS duration_mins FLOAT DEFAULT 0",
      "ALTER TABLE duty_roster ADD COLUMN IF NOT EXISTS duty_type TEXT DEFAULT 'general'",
      "ALTER TABLE duty_roster ADD COLUMN IF NOT EXISTS notes TEXT",
      "ALTER TABLE duty_roster ADD COLUMN IF NOT EXISTS on_duty BOOLEAN DEFAULT TRUE",
      "ALTER TABLE server_announcements ADD COLUMN IF NOT EXISTS mass_dm BOOLEAN DEFAULT FALSE",
      "ALTER TABLE server_announcements ADD COLUMN IF NOT EXISTS dm_sent INTEGER DEFAULT 0",
      "ALTER TABLE server_announcements ADD COLUMN IF NOT EXISTS dm_failed INTEGER DEFAULT 0",
      "ALTER TABLE custom_commands ADD COLUMN IF NOT EXISTS use_count INTEGER DEFAULT 0",
      "ALTER TABLE custom_commands ADD COLUMN IF NOT EXISTS description TEXT DEFAULT ''",
      "ALTER TABLE handbook_entries ADD COLUMN IF NOT EXISTS visible_to_roles TEXT[] DEFAULT '{}'",
      "ALTER TABLE divisions ADD COLUMN IF NOT EXISTS icon_emoji TEXT DEFAULT '🏢'",
      "ALTER TABLE divisions ADD COLUMN IF NOT EXISTS leader_id TEXT",
      "ALTER TABLE divisions ADD COLUMN IF NOT EXISTS leader_name TEXT",
      // Index for performance
      "CREATE INDEX IF NOT EXISTS idx_shifts_guild_user ON shifts(guild_id, user_id)",
      "CREATE INDEX IF NOT EXISTS idx_shifts_guild_started ON shifts(guild_id, started_at)",
      "CREATE INDEX IF NOT EXISTS idx_activity_logs_guild ON activity_logs(guild_id, created_at)",
      "CREATE INDEX IF NOT EXISTS idx_strikes_guild ON strikes(guild_id, active)",
    ];

    for (const m of migrations) {
      await query(m).catch(e => {
        if (!e.message.includes('already exists') && !e.message.includes('does not exist')) {
          console.warn('[DB] Migration note:', e.message.slice(0, 120));
        }
      });
    }

    console.log('[DB] Schema initialized successfully');
  } catch (err) {
    console.error('[DB] Init error:', err.message);
  }
}
