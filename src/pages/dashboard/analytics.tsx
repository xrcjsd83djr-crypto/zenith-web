import { useState, useEffect, useCallback } from "react";
  import { Card, CardContent } from "@/components/ui/card";
  import { Button } from "@/components/ui/button";
  import { Badge } from "@/components/ui/badge";
  import { RefreshCw, TrendingUp, TrendingDown, Users, Clock, Star, AlertTriangle, Zap, Lock, BarChart2 } from "lucide-react";

  interface Analytics {
    staffCount: number; activeStrikes: number; activeLoaCount: number; promotionsThisMonth: number;
    topActivity: { action: string; count: string }[]; totalShiftMins: number; totalShifts: number;
    topPerformers: { username: string; user_id: string; total_mins: number; shift_count: string; strike_count: string; avg_rating?: number }[];
    trends?: { date: string; count: string }[];
    isPremium: boolean;
    avgShiftMins?: number; commendationCount?: number; warnCount?: number; divisionCount?: number;
  }

  function StatCard({ label, value, sub, icon, color }: { label: string; value: string | number; sub?: string; icon: React.ReactNode; color?: string }) {
    return (
      <Card><CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <span style={{ color: color || "#d4af37" }}>{icon}</span>
        </div>
        <p className="text-2xl font-bold">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </CardContent></Card>
    );
  }

  function formatMins(mins: number) {
    if (!mins) return "0h";
    const h = Math.floor(mins / 60), m = Math.round(mins % 60);
    return h > 0 ? h + "h " + m + "m" : m + "m";
  }

  export default function AnalyticsPage({ guildId }: { guildId: string }) {
    const [data, setData] = useState<Analytics | null>(null);
    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
      setLoading(true); setErr(null);
      try {
        const res = await fetch(`/api/guilds/${guildId}/analytics`, { credentials: "include" });
        if (!res.ok) { const e = await res.json(); setErr(e.error || "Failed to load analytics"); setLoading(false); return; }
        setData(await res.json());
      } catch { setErr("Network error. Check your connection."); }
      setLoading(false);
    }, [guildId]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const actionLabel = (a: string) => a.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());

    if (loading) return <div className="flex justify-center py-24"><div className="w-8 h-8 rounded-full border-2 animate-spin" style={{ borderColor: "#d4af37", borderTopColor: "transparent" }} /></div>;
    if (err) return (
      <div className="space-y-5 max-w-4xl">
        <h2 className="text-2xl font-extrabold tracking-tight flex items-center gap-2"><BarChart2 className="w-6 h-6" style={{ color: "#d4af37" }} />Analytics</h2>
        <Card><CardContent className="py-12 text-center">
          <AlertTriangle className="mx-auto mb-3 text-yellow-500 w-8 h-8" />
          <p className="font-semibold mb-1">Could not load analytics</p>
          <p className="text-sm text-muted-foreground mb-4">{err}</p>
          <Button size="sm" onClick={fetchData} className="gap-1.5"><RefreshCw size={13} />Try Again</Button>
        </CardContent></Card>
      </div>
    );
    if (!data) return null;

    return (
      <div className="space-y-5 max-w-4xl">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight flex items-center gap-2">
              <BarChart2 className="w-6 h-6" style={{ color: "#d4af37" }} />Analytics
              {data.isPremium && <Badge className="text-xs" style={{ background: "#d4af37", color: "#000" }}>PRO</Badge>}
            </h2>
            <p className="text-muted-foreground mt-0.5 text-sm">Server-wide performance insights across all systems</p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchData} className="gap-1.5"><RefreshCw size={13} />Refresh</Button>
        </div>

        {/* Core Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="Active Staff" value={data.staffCount} sub="registered members" icon={<Users size={16} />} />
          <StatCard label="Active Strikes" value={data.activeStrikes} sub="across all staff" icon={<AlertTriangle size={16} />} color={data.activeStrikes > 0 ? "#ef4444" : "#22c55e"} />
          <StatCard label="On LOA" value={data.activeLoaCount} sub="currently on leave" icon={<Clock size={16} />} color="#3b82f6" />
          <StatCard label="Promotions (30d)" value={data.promotionsThisMonth} sub="this month" icon={<TrendingUp size={16} />} color="#8b5cf6" />
        </div>

        {/* Shift Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <StatCard label="Total Shift Hours" value={formatMins(data.totalShiftMins)} sub="all time" icon={<Clock size={16} />} />
          <StatCard label="Total Shifts" value={data.totalShifts} sub="sessions logged" icon={<BarChart2 size={16} />} />
          <StatCard label="Avg Shift Duration" value={data.totalShifts > 0 ? formatMins(Math.round(data.totalShiftMins / data.totalShifts)) : "—"} sub="per session" icon={<TrendingUp size={16} />} />
        </div>

        {/* Top Activity */}
        {data.topActivity.length > 0 && (
          <Card>
            <CardContent className="p-5">
              <h3 className="font-semibold mb-3 text-sm">Top Activity Types</h3>
              <div className="space-y-2">
                {data.topActivity.map((a, i) => {
                  const max = parseInt(data.topActivity[0]?.count || "1");
                  const pct = Math.round((parseInt(a.count) / max) * 100);
                  return (
                    <div key={a.action} className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground w-4 text-right">{i + 1}</span>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-xs font-medium">{actionLabel(a.action)}</span>
                          <span className="text-xs text-muted-foreground">{a.count}</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: pct + "%", background: "#d4af37" }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Top Performers */}
        {data.topPerformers.length > 0 && (
          <Card>
            <CardContent className="p-5">
              <h3 className="font-semibold mb-3 text-sm">Top Performers (by shift hours)</h3>
              <div className="space-y-2">
                {data.topPerformers.slice(0, 10).map((p, i) => (
                  <div key={p.user_id} className="flex items-center gap-3 py-2 border-b last:border-0">
                    <span className="text-sm font-bold w-5 text-center" style={{ color: i < 3 ? "#d4af37" : undefined }}>{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{p.username}</p>
                      <p className="text-xs text-muted-foreground">{p.shift_count} sessions • {parseInt(p.strike_count) > 0 ? p.strike_count + " strikes" : "no strikes"}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-mono font-bold">{formatMins(p.total_mins)}</p>
                      {p.avg_rating && <p className="text-xs text-muted-foreground">★ {Number(p.avg_rating).toFixed(1)}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Premium: Trends */}
        {data.isPremium && data.trends && data.trends.length > 0 && (
          <Card>
            <CardContent className="p-5">
              <h3 className="font-semibold mb-3 text-sm">Activity Trend (Last 7 Days)</h3>
              <div className="flex items-end gap-1 h-24">
                {data.trends.map(t => {
                  const max = Math.max(...data.trends!.map(x => parseInt(x.count)), 1);
                  const h = Math.round((parseInt(t.count) / max) * 100);
                  const d = new Date(t.date);
                  return (
                    <div key={t.date} className="flex-1 flex flex-col items-center gap-1">
                      <span className="text-[10px] text-muted-foreground">{t.count}</span>
                      <div className="w-full rounded-t-sm" style={{ height: h + "%", minHeight: "4px", background: "#d4af37", opacity: 0.85 }} />
                      <span className="text-[9px] text-muted-foreground">{d.toLocaleDateString("en", { weekday: "short" })}</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Premium gate */}
        {!data.isPremium && (
          <Card className="border-dashed border-yellow-300">
            <CardContent className="p-4 flex items-start gap-3">
              <Lock size={18} style={{ color: "#d4af37" }} className="mt-0.5" />
              <div>
                <p className="font-semibold text-sm">Premium: Full Analytics Suite</p>
                <p className="text-xs text-muted-foreground mt-0.5">Unlock 7-day activity trend charts, commendation analytics, division performance breakdowns, and 90-day data retention.</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }
  