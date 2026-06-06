import { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, Clock, Users, RefreshCw, TrendingUp, Timer, BarChart2, CheckCircle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from "recharts";

const GOLD = "#d4af37";

function elapsed(startedAt: string): string {
  const diff = Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000);
  const h = Math.floor(diff / 3600);
  const m = Math.floor((diff % 3600) / 60);
  const s = diff % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function formatDuration(mins: number): string {
  if (!mins) return "0m";
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function LiveTimer({ startedAt }: { startedAt: string }) {
  const [, forceUpdate] = useState(0);
  useEffect(() => {
    const iv = setInterval(() => forceUpdate(n => n + 1), 1000);
    return () => clearInterval(iv);
  }, []);
  return <span className="font-mono text-sm font-bold">{elapsed(startedAt)}</span>;
}

export default function PatrolMonitorPage({ guildId }: { guildId: string }) {
  const [active, setActive] = useState<any[]>([]);
  const [recent, setRecent] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const [activeRes, allRes] = await Promise.all([
        fetch(`/api/guilds/${guildId}/shifts/active`, { credentials: "include" }),
        fetch(`/api/guilds/${guildId}/shifts?limit=100`, { credentials: "include" }),
      ]);

      const activeShifts = activeRes.ok ? await activeRes.json() : [];
      const allShifts    = allRes.ok    ? await allRes.json()    : [];

      setActive(activeShifts);

      const completed = (allShifts as any[]).filter((s: any) => s.ended_at && s.duration_mins);
      setRecent(completed.slice(0, 10));

      const today = new Date(); today.setHours(0,0,0,0);
      const todayShifts = completed.filter((s: any) => new Date(s.started_at) >= today);
      const totalMinsToday = todayShifts.reduce((sum: number, s: any) => sum + (s.duration_mins || 0), 0);
      const avgMins = completed.length > 0 ? completed.reduce((sum: number, s: any) => sum + (s.duration_mins || 0), 0) / completed.length : 0;

      const byUser: Record<string, number> = {};
      completed.forEach((s: any) => {
        const u = s.username || "Unknown";
        byUser[u] = (byUser[u] || 0) + (s.duration_mins || 0);
      });
      const topPatrollers = Object.entries(byUser)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
        .map(([name, mins]) => ({ name: name.length > 10 ? name.slice(0, 10) + "…" : name, hours: Math.round((mins / 60) * 10) / 10 }));

      setStats({
        activeCount: activeShifts.length,
        todayHours: Math.round((totalMinsToday / 60) * 10) / 10,
        totalShifts: completed.length,
        avgDuration: Math.round(avgMins),
        topPatrollers,
      });
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  }, [guildId]);

  useEffect(() => { if (guildId) loadData(); }, [guildId, loadData]);

  useEffect(() => {
    if (!autoRefresh) return;
    const iv = setInterval(() => { setRefreshing(true); loadData(); }, 15000);
    return () => clearInterval(iv);
  }, [autoRefresh, loadData]);

  const shiftTypeColor = (type: string) => {
    switch (type) {
      case "general": return { color: "#3b82f6", bg: "rgba(59,130,246,.12)" };
      case "patrol":  return { color: "#22c55e", bg: "rgba(34,197,94,.12)"  };
      case "event":   return { color: "#a855f7", bg: "rgba(168,85,247,.12)" };
      case "admin":   return { color: GOLD,       bg: "rgba(212,175,55,.12)" };
      default:        return { color: "#64748b", bg: "rgba(100,116,139,.12)" };
    }
  };

  if (loading) return (
    <div className="space-y-4">
      <div className="h-8 w-64 bg-muted/40 rounded animate-pulse" />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[1,2,3,4].map(i => <div key={i} className="h-20 bg-muted/30 rounded-xl animate-pulse" />)}
      </div>
      <div className="h-48 bg-muted/30 rounded-2xl animate-pulse" />
    </div>
  );

  return (
    <div className="space-y-5 max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight flex items-center gap-2">
            <Shield className="w-6 h-6" style={{ color: GOLD }} />
            Patrol Monitor
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">Real-time view of active patrols and shift history.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAutoRefresh(v => !v)}
            className="text-xs px-3 py-1.5 rounded-full border transition-all"
            style={autoRefresh ? { background: "rgba(34,197,94,.12)", borderColor: "rgba(34,197,94,.3)", color: "#22c55e" } : { borderColor: "rgba(255,255,255,.15)", color: "rgba(255,255,255,.5)" }}>
            {autoRefresh ? "🟢 Live" : "▶ Start Live"}
          </button>
          <Button variant="outline" size="sm" onClick={() => { setRefreshing(true); loadData(); }} disabled={refreshing}>
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Active Now",      value: stats.activeCount,  icon: <Shield className="w-4 h-4" />,    color: "#22c55e" },
            { label: "Today's Hours",   value: `${stats.todayHours}h`, icon: <Clock className="w-4 h-4" />, color: GOLD      },
            { label: "Total Shifts",    value: stats.totalShifts,  icon: <Users className="w-4 h-4" />,    color: "#3b82f6" },
            { label: "Avg Duration",    value: formatDuration(stats.avgDuration), icon: <Timer className="w-4 h-4" />, color: "#a855f7" },
          ].map(s => (
            <Card key={s.label}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1" style={{ color: s.color }}>{s.icon}<span className="text-xs text-muted-foreground">{s.label}</span></div>
                <div className="text-2xl font-black" style={{ color: s.color }}>{s.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Active Patrols */}
      <Card>
        <CardContent className="p-5">
          <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full animate-pulse bg-green-400" />
            Active Patrols ({active.length})
          </h3>
          {active.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              <Shield className="w-10 h-10 mx-auto mb-3 opacity-20" />
              <p>No active patrols right now.</p>
              <p className="text-xs mt-1">Staff start patrols using <code className="bg-muted px-1 rounded">!shift start</code> or the slash command.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {active.map((s: any) => {
                const cfg = shiftTypeColor(s.shift_type || "general");
                return (
                  <div key={s.id} className="flex items-center gap-3 p-3 rounded-xl border"
                    style={{ background: cfg.bg, borderColor: `${cfg.color}25` }}>
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                      style={{ background: `${cfg.color}20`, color: cfg.color }}>
                      {(s.username || "?")[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold">{s.username || "Unknown"}</p>
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full capitalize"
                        style={{ background: `${cfg.color}20`, color: cfg.color }}>{s.shift_type || "General"}</span>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <LiveTimer startedAt={s.started_at} />
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        since {new Date(s.started_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Top Patrollers */}
        {stats?.topPatrollers?.length > 0 && (
          <Card>
            <CardContent className="p-5">
              <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" style={{ color: GOLD }} />Top Patrollers (All Time)
              </h3>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={stats.topPatrollers} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="name" tick={{ fontSize: 9, fill: "rgba(255,255,255,0.4)" }} />
                  <YAxis tick={{ fontSize: 9, fill: "rgba(255,255,255,0.4)" }} />
                  <Tooltip
                    contentStyle={{ background: "#1a1d23", border: "1px solid rgba(255,255,255,.1)", borderRadius: 8, fontSize: 11 }}
                    formatter={(v: any) => [`${v}h`, "Hours"]} />
                  <Bar dataKey="hours" fill={GOLD} radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Recent Shift History */}
        <Card>
          <CardContent className="p-5">
            <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
              <BarChart2 className="w-4 h-4" style={{ color: GOLD }} />Recent Shifts
            </h3>
            {recent.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No completed shifts yet.</p>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto">
                {recent.map((s: any, i: number) => {
                  const cfg = shiftTypeColor(s.shift_type || "general");
                  return (
                    <div key={s.id || i} className="flex items-center gap-3 py-2 border-b border-border/50 last:border-0">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                        style={{ background: `${cfg.color}15`, color: cfg.color }}>
                        {(s.username || "?")[0]?.toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold truncate">{s.username || "Unknown"}</p>
                        <p className="text-[10px] text-muted-foreground capitalize">{s.shift_type || "general"}</p>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground flex-shrink-0">
                        <CheckCircle className="w-3 h-3 text-green-400" />
                        {formatDuration(s.duration_mins)}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/50">
        <CardContent className="p-4">
          <p className="text-xs text-muted-foreground">
            <span className="font-semibold">How patrols work:</span> Staff start shifts using the Discord bot command
            <code className="mx-1 px-1.5 py-0.5 bg-muted rounded text-[11px]">!shift start</code> or
            <code className="mx-1 px-1.5 py-0.5 bg-muted rounded text-[11px]">/shift start</code> and end with
            <code className="mx-1 px-1.5 py-0.5 bg-muted rounded text-[11px]">!shift end</code>.
            This page auto-refreshes every 15 seconds when Live mode is on.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
