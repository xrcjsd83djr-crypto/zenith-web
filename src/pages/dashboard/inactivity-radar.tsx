import { useState, useEffect } from "react";
  import { Card, CardContent } from "@/components/ui/card";
  import { Button } from "@/components/ui/button";
  import { Badge } from "@/components/ui/badge";
  import { UserX, Clock, AlertTriangle, RefreshCw, Filter, User, ChevronRight } from "lucide-react";
  import { Link } from "wouter";

  type Status = "active"|"warning"|"inactive"|"critical";

  function getStatus(daysSince: number): { status: Status; label: string; color: string; bg: string } {
    if (daysSince <= 7)   return { status: "active",   label: "Active",   color: "#22c55e", bg: "rgba(34,197,94,.15)"   };
    if (daysSince <= 14)  return { status: "warning",  label: "Warning",  color: "#d4af37", bg: "rgba(212,175,55,.15)"  };
    if (daysSince <= 30)  return { status: "inactive", label: "Inactive", color: "#f97316", bg: "rgba(249,115,22,.15)"  };
    return                       { status: "critical", label: "Critical", color: "#ef4444", bg: "rgba(239,68,68,.15)"   };
  }

  export default function InactivityRadarPage({ guildId }: { guildId: string }) {
    const [staff, setStaff] = useState<any[]>([]);
    const [leaderboard, setLeaderboard] = useState<any[]>([]);
    const [filter, setFilter] = useState<"all"|"warning"|"inactive"|"critical">("all");
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    async function loadData() {
      try {
        const [staffRes, lbRes] = await Promise.all([
          fetch(`/api/guilds/${guildId}/staff`, { credentials: "include" }),
          fetch(`/api/guilds/${guildId}/activity/leaderboard`, { credentials: "include" }),
        ]);
        const staffData = staffRes.ok ? await staffRes.json() : [];
        const lbData = lbRes.ok ? await lbRes.json() : [];

        // Merge staff with activity data
        const enriched = staffData.map((s: any) => {
          const activity = lbData.find((l: any) => l.discord_id === s.discord_id || l.username === s.discord_username);
          const daysSince = activity?.last_active
            ? Math.floor((Date.now() - new Date(activity.last_active).getTime()) / 86400000)
            : 30; // Default to 30 days if no activity data
          return { ...s, daysSince, activityScore: activity?.score || 0 };
        });

        setStaff(enriched);
        setLeaderboard(lbData);
      } catch (e) { console.error(e); }
      finally { setLoading(false); setRefreshing(false); }
    }

    useEffect(() => { if (guildId) loadData(); }, [guildId]);
    const refresh = () => { setRefreshing(true); loadData(); };

    const filtered = staff.filter(s => {
      if (filter === "all") return true;
      return getStatus(s.daysSince).status === filter;
    }).sort((a, b) => b.daysSince - a.daysSince);

    const counts = {
      active:   staff.filter(s => getStatus(s.daysSince).status === "active").length,
      warning:  staff.filter(s => getStatus(s.daysSince).status === "warning").length,
      inactive: staff.filter(s => getStatus(s.daysSince).status === "inactive").length,
      critical: staff.filter(s => getStatus(s.daysSince).status === "critical").length,
    };

    if (loading) return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-muted/40 rounded animate-pulse" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[1,2,3,4].map(i => <div key={i} className="h-20 bg-muted/30 rounded-xl animate-pulse" />)}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {[1,2,3,4,5,6].map(i => <div key={i} className="h-28 bg-muted/30 rounded-xl animate-pulse" />)}
        </div>
      </div>
    );

    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight flex items-center gap-2">
              <UserX className="w-6 h-6" style={{ color: "#d4af37" }} /> Inactivity Radar
            </h1>
            <p className="text-muted-foreground text-sm mt-0.5">Monitor and track staff activity across your team.</p>
          </div>
          <Button variant="outline" size="sm" onClick={refresh} disabled={refreshing} className="gap-2">
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>

        {/* Status summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Active",   count: counts.active,   color: "#22c55e", status: "active"   },
            { label: "Warning",  count: counts.warning,  color: "#d4af37", status: "warning"  },
            { label: "Inactive", count: counts.inactive, color: "#f97316", status: "inactive" },
            { label: "Critical", count: counts.critical, color: "#ef4444", status: "critical" },
          ].map(s => (
            <button key={s.status} onClick={() => setFilter(filter === s.status ? "all" : s.status as any)}
              className="rounded-xl p-4 border text-left transition-all hover:opacity-90"
              style={filter === s.status
                ? { background: `${s.color}20`, borderColor: `${s.color}50` }
                : { background: "rgba(255,255,255,.03)", borderColor: "rgba(255,255,255,.08)" }}>
              <div className="text-2xl font-black" style={{ color: s.color }}>{s.count}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{s.label}</div>
              <div className="h-1 rounded-full mt-2" style={{ background: `${s.color}30` }}>
                <div className="h-1 rounded-full" style={{ width: `${staff.length ? (s.count/staff.length)*100 : 0}%`, background: s.color }} />
              </div>
            </button>
          ))}
        </div>

        {/* Staff grid */}
        {filtered.length === 0 ? (
          <Card className="bg-card border-border">
            <CardContent className="p-12 text-center">
              <UserX className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-40" />
              <p className="font-semibold">{staff.length === 0 ? "No staff members found" : "No staff in this category"}</p>
              <p className="text-sm text-muted-foreground mt-1">{staff.length === 0 ? "Add staff members to start tracking activity." : "Try selecting a different filter."}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
            {filtered.map((s: any) => {
              const st = getStatus(s.daysSince);
              return (
                <div key={s.id || s.discord_id}
                  className="rounded-xl border p-4 transition-all hover:scale-[1.01]"
                  style={{ background: st.bg, borderColor: `${st.color}30` }}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold"
                      style={{ background: `${st.color}25`, color: st.color }}>
                      {(s.discord_username || s.roblox_username || "?")[0]?.toUpperCase()}
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                      style={{ background: `${st.color}25`, color: st.color }}>{st.label}</span>
                  </div>
                  <p className="text-sm font-semibold truncate">{s.roblox_username || s.discord_username || "Unknown"}</p>
                  <p className="text-xs text-muted-foreground truncate">{s.discord_username || ""}</p>
                  <div className="mt-3 flex items-center gap-1.5 text-xs" style={{ color: st.color }}>
                    <Clock className="w-3 h-3" />
                    {s.daysSince === 0 ? "Active today" : `${s.daysSince}d since active`}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
          <span>Legend:</span>
          {[["Active","#22c55e","≤7 days"],["Warning","#d4af37","8-14 days"],["Inactive","#f97316","15-30 days"],["Critical","#ef4444","31+ days"]].map(([l,c,d]) => (
            <span key={l} className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ background: c }} />
              {l} <span className="opacity-50">({d})</span>
            </span>
          ))}
        </div>
      </div>
    );
  }
  