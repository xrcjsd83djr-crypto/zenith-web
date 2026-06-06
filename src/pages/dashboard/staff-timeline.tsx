import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, RefreshCw, AlertTriangle, AlertOctagon, CalendarClock, TrendingUp, Activity, UserPlus, Inbox, Filter, MessageSquare } from "lucide-react";

const GOLD = "#d4af37";

type EventType = "all"|"strike"|"warning"|"loa"|"promotion"|"activity"|"application"|"note";

const EVENT_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string; bg: string }> = {
  strike:      { label: "Strike",      icon: <AlertTriangle className="w-3.5 h-3.5" />,  color: "#ef4444", bg: "rgba(239,68,68,.12)"    },
  warning:     { label: "Warning",     icon: <AlertOctagon className="w-3.5 h-3.5" />,   color: "#f97316", bg: "rgba(249,115,22,.12)"   },
  loa:         { label: "LOA",         icon: <CalendarClock className="w-3.5 h-3.5" />,  color: GOLD,      bg: "rgba(212,175,55,.12)"   },
  promotion:   { label: "Promotion",   icon: <TrendingUp className="w-3.5 h-3.5" />,     color: "#22c55e", bg: "rgba(34,197,94,.12)"    },
  activity:    { label: "Activity",    icon: <Activity className="w-3.5 h-3.5" />,        color: "#3b82f6", bg: "rgba(59,130,246,.12)"   },
  application: { label: "Application", icon: <Inbox className="w-3.5 h-3.5" />,          color: "#a855f7", bg: "rgba(168,85,247,.12)"   },
  new_staff:   { label: "New Staff",   icon: <UserPlus className="w-3.5 h-3.5" />,       color: "#22c55e", bg: "rgba(34,197,94,.12)"    },
  note:        { label: "Note",        icon: <MessageSquare className="w-3.5 h-3.5" />,  color: "#64748b", bg: "rgba(100,116,139,.12)"  },
};

function getConfig(type: string) {
  return EVENT_CONFIG[type] || EVENT_CONFIG["activity"];
}

function timeAgo(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)   return "just now";
  if (mins < 60)  return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)   return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7)   return `${days}d ago`;
  return new Date(ts).toLocaleDateString();
}

function buildDescription(e: any): string {
  const who = e.username || e.target_username || e.discord_username || "Unknown";
  switch (e.type) {
    case "strike":      return `${who} received a strike${e.reason ? ` — "${e.reason}"` : ""}`;
    case "warning":     return `${who} received a warning${e.reason ? ` — "${e.reason}"` : ""}`;
    case "loa":         return `${who} requested leave of absence${e.reason ? ` — "${e.reason}"` : ""}`;
    case "promotion":   return `${who} was promoted${e.new_rank ? ` to ${e.new_rank}` : ""}`;
    case "new_staff":   return `${who} joined the staff team`;
    case "application": return `New application submitted${e.panel_title ? ` for "${e.panel_title}"` : ""}`;
    case "note":        return `Note added for ${who}`;
    case "shift_start": return `${who} started a patrol shift`;
    case "shift_end":   return `${who} ended their patrol shift`;
    default:
      if (e.action) {
        const action = e.action.replace(/_/g, " ");
        return `${who}: ${action}${e.details?.reason ? ` — ${e.details.reason}` : ""}`;
      }
      return `${who} performed an action`;
  }
}

function normalizeEvent(raw: any, source: string): any {
  const base = {
    id:        raw.id || `${source}-${Math.random()}`,
    timestamp: raw.created_at || raw.submitted_at || new Date().toISOString(),
    source,
  };
  switch (source) {
    case "strike":
      return { ...base, type: "strike", username: raw.target_username, reason: raw.reason };
    case "warning":
      return { ...base, type: "warning", username: raw.target_username, reason: raw.reason };
    case "loa":
      return { ...base, type: "loa", username: raw.discord_username || raw.username, reason: raw.reason };
    case "promotion":
      return { ...base, type: "promotion", username: raw.staff_username || raw.username, new_rank: raw.new_rank };
    case "application":
      return { ...base, type: "application", username: raw.username, panel_title: raw.panel_title };
    case "activity":
      return { ...base, type: raw.action || "activity", username: raw.username, action: raw.action, details: raw.details };
    default:
      return { ...base, type: "activity", username: raw.username || "System" };
  }
}

const FILTER_TYPES: { value: EventType; label: string }[] = [
  { value: "all",         label: "All Events"    },
  { value: "activity",    label: "Activity"      },
  { value: "strike",      label: "Strikes"       },
  { value: "warning",     label: "Warnings"      },
  { value: "loa",         label: "LOA"           },
  { value: "promotion",   label: "Promotions"    },
  { value: "application", label: "Applications"  },
];

export default function StaffTimelinePage({ guildId }: { guildId: string }) {
  const [events, setEvents] = useState<any[]>([]);
  const [filter, setFilter] = useState<EventType>("all");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [actRes, strikesRes, warnsRes, loaRes, promoRes, appsRes] = await Promise.all([
        fetch(`/api/guilds/${guildId}/activity?limit=40`, { credentials: "include" }),
        fetch(`/api/guilds/${guildId}/strikes`, { credentials: "include" }),
        fetch(`/api/guilds/${guildId}/warnings`, { credentials: "include" }),
        fetch(`/api/guilds/${guildId}/loa`, { credentials: "include" }),
        fetch(`/api/guilds/${guildId}/promotions`, { credentials: "include" }),
        fetch(`/api/guilds/${guildId}/applications`, { credentials: "include" }),
      ]);

      const activity = actRes.ok   ? await actRes.json()    : [];
      const strikes  = strikesRes.ok ? await strikesRes.json() : [];
      const warns    = warnsRes.ok  ? await warnsRes.json()  : [];
      const loas     = loaRes.ok    ? await loaRes.json()    : [];
      const promos   = promoRes.ok  ? await promoRes.json()  : [];
      const apps     = appsRes.ok   ? await appsRes.json()   : [];

      const normalized = [
        ...(activity as any[]).slice(0, 40).map((e: any) => normalizeEvent(e, "activity")),
        ...(strikes  as any[]).slice(0, 20).map((e: any) => normalizeEvent(e, "strike")),
        ...(warns    as any[]).slice(0, 20).map((e: any) => normalizeEvent(e, "warning")),
        ...(loas     as any[]).slice(0, 15).map((e: any) => normalizeEvent(e, "loa")),
        ...(promos   as any[]).slice(0, 15).map((e: any) => normalizeEvent(e, "promotion")),
        ...(apps     as any[]).slice(0, 15).map((e: any) => normalizeEvent(e, "application")),
      ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      setEvents(normalized);
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  }, [guildId]);

  useEffect(() => { if (guildId) loadData(); }, [guildId, loadData]);

  useEffect(() => {
    if (!autoRefresh) return;
    const iv = setInterval(() => { setRefreshing(true); loadData(); }, 30000);
    return () => clearInterval(iv);
  }, [autoRefresh, loadData]);

  const filtered = filter === "all" ? events : events.filter(e => {
    if (filter === "activity") return !["strike","warning","loa","promotion","application"].includes(e.type);
    return e.type === filter;
  });

  const grouped: Record<string, any[]> = {};
  filtered.forEach(e => {
    const key = new Date(e.timestamp).toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(e);
  });

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight flex items-center gap-2">
            <Clock className="w-6 h-6" style={{ color: GOLD }} />
            Staff Timeline
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">A live chronological feed of everything happening in your server.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAutoRefresh(v => !v)}
            className="text-xs px-3 py-1.5 rounded-full border transition-all"
            style={autoRefresh ? { background: "rgba(212,175,55,.15)", borderColor: "rgba(212,175,55,.4)", color: GOLD } : { borderColor: "rgba(255,255,255,.15)", color: "rgba(255,255,255,.5)" }}>
            {autoRefresh ? "⏸ Live" : "▶ Auto-refresh"}
          </button>
          <Button variant="outline" size="sm" onClick={() => { setRefreshing(true); loadData(); }} disabled={refreshing} className="gap-1.5">
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex gap-2 flex-wrap">
        {FILTER_TYPES.map(f => (
          <button key={f.value} onClick={() => setFilter(f.value)}
            className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5"
            style={filter === f.value
              ? { background: "rgba(212,175,55,.15)", color: GOLD, border: "1px solid rgba(212,175,55,.4)" }
              : { background: "transparent", color: "rgba(255,255,255,.45)", border: "1px solid rgba(255,255,255,.1)" }}>
            {f.label}
            {filter === f.value && events.length > 0 && (
              <span className="bg-amber-500/20 text-amber-300 px-1 rounded text-[9px]">{filtered.length}</span>
            )}
          </button>
        ))}
      </div>

      {loading && (
        <div className="space-y-3">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="h-16 bg-muted/30 rounded-xl animate-pulse" />
          ))}
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <Card>
          <CardContent className="py-16 text-center">
            <Clock className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p className="font-semibold">No events yet</p>
            <p className="text-sm text-muted-foreground mt-1">Events will appear here as your staff use bot commands and the dashboard.</p>
          </CardContent>
        </Card>
      )}

      {!loading && Object.entries(grouped).map(([date, dayEvents]) => (
        <div key={date} className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2">{date}</span>
            <div className="h-px flex-1 bg-border" />
          </div>
          <div className="relative pl-5">
            <div className="absolute left-2 top-0 bottom-0 w-px bg-border" />
            <div className="space-y-2">
              {dayEvents.map((e, i) => {
                const cfg = getConfig(e.type);
                return (
                  <div key={e.id || i} className="relative group">
                    <div className="absolute -left-3 top-3 w-2 h-2 rounded-full ring-2 ring-background" style={{ background: cfg.color }} />
                    <div className="ml-2 flex items-start gap-3 rounded-xl border p-3 hover:bg-muted/20 transition-colors"
                      style={{ borderColor: `${cfg.color}20`, background: `${cfg.color}05` }}>
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                        style={{ background: cfg.bg, color: cfg.color }}>
                        {cfg.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm leading-snug">{buildDescription(e)}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                            style={{ background: cfg.bg, color: cfg.color }}>{cfg.label}</span>
                          <span className="text-[10px] text-muted-foreground">{timeAgo(e.timestamp)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
