import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BarChart2, RefreshCw, Users, AlertTriangle, CalendarClock, TrendingUp, Clock, Zap, Star } from "lucide-react";

interface AnalyticsData {
  isPremium: boolean;
  summary: { totalStaff: number; activeStrikes: number; activeLoa: number; recentPromotions: number; totalShiftMins: number; totalShifts: number; };
  activityBreakdown: { action: string; count: string }[];
  topPerformers: { username: string; user_id: string; total_mins: number; shift_count: number; strike_count: number }[];
  trends: { date: string; count: string }[];
}

export default function AnalyticsPage({ guildId }: { guildId: string }) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await fetch(`/api/guilds/${guildId}/analytics`, { credentials: 'include' });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      setData(await res.json());
    } catch (err: any) { setError(err.message); }
    setLoading(false);
  }, [guildId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const medals = ['🥇', '🥈', '🥉'];

  if (loading) return <div className="flex justify-center py-20"><div className="w-7 h-7 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#d4af37', borderTopColor: 'transparent' }} /></div>;
  if (error) return (
    <div className="space-y-5 max-w-4xl">
      <h2 className="text-2xl font-extrabold tracking-tight flex items-center gap-2"><BarChart2 className="w-6 h-6" style={{ color: '#d4af37' }} />Analytics</h2>
      <Card className="border-red-200 bg-red-50"><CardContent className="p-4 text-red-700 text-sm">{error}</CardContent></Card>
    </div>
  );
  if (!data) return null;

  const fmtHrs = (mins: number) => { const h = Math.floor(mins / 60); return `${h}h`; };

  return (
    <div className="space-y-5 max-w-4xl">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight flex items-center gap-2">
            <BarChart2 className="w-6 h-6" style={{ color: '#d4af37' }} />Analytics
            {data.isPremium && <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-[10px]"><Star size={9} className="mr-1" />Premium</Badge>}
          </h2>
          <p className="text-muted-foreground mt-0.5 text-sm">{data.isPremium ? 'Full analytics with 7-day trends.' : 'Overview analytics. Upgrade for trends & deeper insights.'}</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData} className="gap-1.5"><RefreshCw size={13} />Refresh</Button>
      </div>

      {/* Summary grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[
          { label: 'Active Staff',     val: data.summary.totalStaff,        icon: <Users size={18} />,          color: 'text-blue-600'   },
          { label: 'Active Strikes',   val: data.summary.activeStrikes,     icon: <AlertTriangle size={18} />,  color: 'text-orange-500' },
          { label: 'On LOA',           val: data.summary.activeLoa,         icon: <CalendarClock size={18} />,  color: 'text-amber-600'  },
          { label: 'Promotions (30d)', val: data.summary.recentPromotions,  icon: <TrendingUp size={18} />,     color: 'text-green-600'  },
          { label: 'Total Shifts',     val: data.summary.totalShifts,       icon: <Zap size={18} />,            color: 'text-purple-600' },
          { label: 'Total Shift Hrs',  val: fmtHrs(data.summary.totalShiftMins), icon: <Clock size={18} />,   color: 'text-foreground' },
        ].map(s => (
          <Card key={s.label} className="border-border bg-white shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={s.color}>{s.icon}</div>
              <div><div className={`text-xl font-extrabold ${s.color}`}>{s.val}</div><div className="text-xs text-muted-foreground">{s.label}</div></div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Top performers */}
      {data.topPerformers.length > 0 && (
        <Card className="border-border bg-white shadow-sm">
          <CardHeader className="pb-2"><CardTitle className="text-sm">🏆 Top Performers (by shift hours)</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {data.topPerformers.map((p, i) => {
              const hrs = Math.floor((p.total_mins || 0) / 60);
              return (
                <div key={p.user_id} className="flex items-center gap-3 p-2.5 rounded-lg border border-border">
                  <span className="text-lg w-6 text-center flex-shrink-0">{medals[i] ?? `${i+1}.`}</span>
                  <div className="flex-1 min-w-0">
                    <span className="font-semibold text-sm">{p.username}</span>
                    <span className="text-xs text-muted-foreground ml-2">{p.shift_count} shifts · {p.strike_count} strikes</span>
                  </div>
                  <Badge className="bg-blue-50 text-blue-700 border-blue-200 text-xs">{hrs}h</Badge>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Activity breakdown */}
      {data.activityBreakdown.length > 0 && (
        <Card className="border-border bg-white shadow-sm">
          <CardHeader className="pb-2"><CardTitle className="text-sm">📊 Activity Breakdown</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.activityBreakdown.map(a => {
                const maxCount = Math.max(...data.activityBreakdown.map(x => parseInt(x.count)));
                const pct = Math.round((parseInt(a.count) / maxCount) * 100);
                return (
                  <div key={a.action}>
                    <div className="flex justify-between text-xs mb-0.5"><span className="font-medium">{a.action.replace(/_/g, ' ')}</span><span className="text-muted-foreground">{a.count}</span></div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden"><div className="h-full rounded-full" style={{ width: `${pct}%`, background: 'linear-gradient(90deg,#d4af37,#ffd700)' }} /></div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Premium: 7-day trends */}
      {data.isPremium && data.trends.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/40 shadow-sm">
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Star size={14} style={{ color: '#d4af37' }} />7-Day Activity Trends</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-end gap-2 h-16">
              {data.trends.map(t => {
                const max = Math.max(...data.trends.map(x => parseInt(x.count)));
                const h = Math.round((parseInt(t.count) / Math.max(max, 1)) * 100);
                return (
                  <div key={t.date} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full rounded-t" style={{ height: `${h}%`, minHeight: 4, background: 'linear-gradient(180deg,#ffd700,#d4af37)' }} />
                    <span className="text-[9px] text-muted-foreground">{new Date(t.date).toLocaleDateString('en', { weekday: 'short' })}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {!data.isPremium && (
        <Card className="border-amber-200 bg-amber-50 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <Star size={18} style={{ color: '#d4af37' }} />
            <div><p className="font-semibold text-amber-800 text-sm">Unlock deeper insights with Premium</p><p className="text-amber-700 text-xs">Get 7-day trends, staff performance scores, and full activity export.</p></div>
            <a href="/premium" className="ml-auto text-xs font-semibold px-3 py-1.5 rounded-lg flex-shrink-0" style={{ background: 'linear-gradient(135deg,#d4af37,#ffd700)', color: '#5a3e10' }}>Upgrade</a>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
