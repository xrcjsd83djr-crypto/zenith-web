# Zenith Dashboard — Database Architecture Guide
## (For any AI agent or developer continuing this project)

---

## 1. EMERGENCY ROLLBACK TO SUPABASE

If Turso breaks and you need to instantly revert:

**In Railway → zenith-web service → Variables:**
- Change `TURSO_DATABASE_URL` to your Supabase connection string
- Change `TURSO_AUTH_TOKEN` to empty or remove it
- Add/restore `DATABASE_URL` = your Supabase connection string

**In `server/db.js`:**
Replace the entire file with the original PostgreSQL version using `pg` pool:
```js
import pg from 'pg';
const { Pool } = pg;
export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export async function query(text, params) {
  const res = await pool.query(text, params);
  return res;
}
```
All SQL in `server.js` is written for PostgreSQL — it will work immediately on Supabase with zero changes.

**Why this works:** Supabase IS PostgreSQL. Every `NOW()`, `ILIKE`, `INTERVAL`, `::jsonb`, `RETURNING *` etc. in server.js is native Postgres syntax. Turso is SQLite and requires a compat shim.

---

## 2. CURRENT DATABASE SETUP (as of June 2026)

- **DB1 (Supabase):** Original PostgreSQL database. Still intact, data never deleted.
- **DB2 (Turso/libsql):** SQLite-compatible, Railway env vars:
  - `TURSO_DATABASE_URL` = `libsql://whats-up-gng-fishwater.aws-us-east-1.turso.io`
  - `TURSO_AUTH_TOKEN` = [see Railway vars]
- **Current server.js:** Imports `query` from `server/db.js` which is now a Turso adapter
- **Compat layer:** `server/db.js` → `adaptSql()` converts PostgreSQL SQL to SQLite automatically

---

## 3. MULTI-DATABASE SHARDING (100 servers per DB)

### The Plan
Each free Supabase account = 500MB = handles ~100 servers comfortably.
As you grow: DB1 handles guilds 1-100, DB2 handles 101-200, DB3 handles 201-300, etc.

### Step 1 — Add a DB lookup table to DB1

```sql
CREATE TABLE IF NOT EXISTS guild_db_assignments (
  guild_id TEXT PRIMARY KEY,
  db_slot  INTEGER NOT NULL DEFAULT 1,
  assigned_at TIMESTAMP DEFAULT NOW()
);
```

This table lives ONLY in DB1 (the "master" database). It's the router.

### Step 2 — Railway Environment Variables

Add these vars to the Railway web service:
```
DATABASE_URL_1 = postgres://...supabase1...   (original DB — guilds 1-100)
DATABASE_URL_2 = postgres://...supabase2...   (new DB — guilds 101-200)
DATABASE_URL_3 = (add when needed)
ACTIVE_DB_SLOT = 2   ← increment this when you add a new DB
DB1_CAP = 100
DB2_CAP = 200
```

### Step 3 — Modify `server/db.js` for multi-db routing

```js
import pg from 'pg';
const { Pool } = pg;

const DB_URLS = {
  1: process.env.DATABASE_URL_1,
  2: process.env.DATABASE_URL_2,
  3: process.env.DATABASE_URL_3,
  // add more as needed
};
const ACTIVE_SLOT = parseInt(process.env.ACTIVE_DB_SLOT || '1');

// One pool per DB slot
const pools = {};
function getPool(slot = 1) {
  if (!pools[slot]) pools[slot] = new pg.Pool({ connectionString: DB_URLS[slot] });
  return pools[slot];
}

// Master pool (DB1) — for guild routing lookups
const masterPool = getPool(1);

// Cache: guild_id → db_slot  (in-memory, resets on restart)
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
  
  // Guild not assigned yet — count how many are in the active slot
  const cap = parseInt(process.env[`DB${ACTIVE_SLOT}_CAP`] || '100');
  const count = await masterPool.query(
    'SELECT COUNT(*) FROM guild_db_assignments WHERE db_slot = $1',
    [ACTIVE_SLOT]
  );
  
  // If active slot is full, you must manually increment ACTIVE_DB_SLOT in Railway
  const slot = parseInt(count.rows[0].count) < cap ? ACTIVE_SLOT : ACTIVE_SLOT;
  
  await masterPool.query(
    'INSERT INTO guild_db_assignments (guild_id, db_slot) VALUES ($1, $2) ON CONFLICT DO NOTHING',
    [guildId, slot]
  );
  guildSlotCache.set(guildId, slot);
  return slot;
}

// Main query function — auto-routes by guild_id if present in params context
export async function query(text, params = [], guildId = null) {
  let slot = 1;
  if (guildId) slot = await getSlotForGuild(guildId);
  return getPool(slot).query(text, params);
}

// Direct query to a specific slot (for admin/cross-db operations)
export async function querySlot(slot, text, params = []) {
  return getPool(slot).query(text, params);
}
```

### Step 4 — How server.js routes queries

Most routes already have `req.params.id` or `req.params.guildId` as the guild ID. Change the query calls:

```js
// Before:
const result = await query(`SELECT * FROM servers WHERE id = $1`, [id]);

// After:
const result = await query(`SELECT * FROM servers WHERE id = $1`, [id], id);
//                                                                       ^^^^ guild ID for routing
```

Do this for every route that handles guild-specific data.

### Step 5 — Setting up a new Supabase DB

1. Create new Supabase project (new Google account = new free project)
2. Get the connection string from Supabase → Settings → Database → Connection string (URI mode)
3. Add to Railway as `DATABASE_URL_2`
4. Run `initDb()` against the new DB to create all tables (the web service does this on startup automatically — just make sure it runs `initDb` against the new pool)
5. Set `ACTIVE_DB_SLOT=2` in Railway when you want new guilds to go to DB2

### Step 6 — When you hit 100 servers

1. Go to Railway → zenith-web → Variables
2. Set `ACTIVE_DB_SLOT=2`
3. That's it. Guilds 1-100 stay in DB1 forever, new ones go to DB2.

---

## 4. STORAGE ESTIMATES

Per active server per month:
- Guild config: ~2KB (one-time)
- Staff members: ~25KB (50 staff × 500B)
- Shifts: ~60KB/month (200 shifts)
- Strikes/warnings: ~15KB/month
- Activity logs: ~75KB/month (biggest table)
- Promotions, LOA, misc: ~20KB/month
- **Total: ~200KB/month per active server**

Supabase free (500MB) timeline:
- 100 servers × 200KB/month = 20MB/month → **2+ years before hitting 500MB** ✅

So you have huge headroom. The 100-server cap is very conservative — you could probably do 200+ per DB — but staying at 100 keeps it safe and clean.

---

## 5. KEY FILES

| File | Purpose |
|------|---------|
| `server.js` | Main Express app — all routes and business logic (4000+ lines, PostgreSQL SQL) |
| `server/db.js` | DB adapter — currently Turso/SQLite with pg→sqlite compat shim |
| `src/lib/auth.tsx` | Frontend auth — must use `credentials: 'include'` on all API calls |
| `package.json` | Build: `npm install && npm run build`, Start: `node server.js` |

---

## 6. RAILWAY ENVIRONMENT VARIABLES (required)

```
TURSO_DATABASE_URL    = libsql://...turso.io
TURSO_AUTH_TOKEN      = eyJ...
SESSION_SECRET        = [any random 32+ char string]
DISCORD_CLIENT_ID     = [Discord OAuth app ID]
DISCORD_CLIENT_SECRET = [Discord OAuth app secret]
DISCORD_CALLBACK_URL  = https://zenithbot.up.railway.app/auth/discord/callback
BOT_TOKEN             = [Discord bot token]
NODE_ENV              = production
PORT                  = 8080
```

---

## 7. CURRENT STATUS (June 7, 2026)

- ✅ 240 rows migrated from Supabase → Turso across 46 tables
- ✅ Auth fix: `credentials: 'include'` added to frontend auth calls
- ✅ SQL compat shim: `adaptSql()` in `server/db.js` converts all PostgreSQL syntax to SQLite
- ✅ Session store: TursoSessionStore with graceful error handling
- 🔄 Railway deploying latest build now
- ❓ Test dashboard features after deploy to confirm all API endpoints work

