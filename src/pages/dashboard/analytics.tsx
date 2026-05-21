import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart2, Clock, Users, TrendingUp, Activity, RefreshCw, Star, Award, AlertTriangle, Calendar } from "lucide-react";

interface AnalyticsData {
  totalShiftHours: number;
  totalShifts: number;
  avgShiftMins: number;
  topStaff: { user_id: string; username: string; total_mins: number; shift_count: number; strike_count: number }[];
  actionBreakdown: { action: string; count: number }[];
  dailyActivity: { date: string; count: number }[];
  staffCount: number;
  activeStaff: number;
  avgHoursPerStaff: number;
}

function StatCard({ icon, label, value, sub, color }: { icon: React.ReactNode; label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-medium mb-1">{label}</p>
            <p className={`text-2xl font-bold ${color || ''}`}>{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
          </div>
          <div className="text-muted-foreground mt-0.5">{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function SimpleBar({ label, value, max, color = '#d4af37' }: { label: string; value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <span className="text-xs font-medium truncate flex-1 mr-2">{label}</span>
        <span className="text-xs text-muted-foreground flex-shrink-0">{value}</span>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

function fmtHours(mins: number) {
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

const ACTION_LABELS: Record<string, string> = {
  shift_start: "Shift Started", shift_end: "Shift Ended", strike_issued: "Strike Issued",
  warning_issued: "Warning Issued", loa_approved: "LOA Approved", promotion: "Promotion",
  demotion: "Demotion", commendation: "Commendation", login: "Login", mass_dm: "Mass DM",
  training_complete: "Training Complete", performance_review: "Performance Review",
};

export default function AnalyticsPage({ guildId }: { guildId: string }) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isPremium, setIsPremium] = useState(false);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("30");
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [aRes, pRes] = await Promise.allSettled([
        fetch(`/api/guilds/${guildId}/analytics?period=${period}`, { credentials: 'include' }),
        fetch(`/api/guilds/${guildId}/premium`, { credentials: 'include' }),
      ]);
      if (pRes.status === 'fulfilled' && pRes.value.ok) { const p = await pRes.value.json().catch(() => ({})); setIsPremium(!!p.isPremium); }
      if (aRes.status === 'fulfilled' && aRes.value.ok) {
        const raw = await aRes.value.json().catch(() => null);
        if (raw) setData(raw);
        else setError("Invalid data returned from server.");
      } else if (aRes.status === 'fulfilled') {
        const err = await aRes.value.json().catch(() => ({}));
        setError((err as any).error || "Failed to load analytics.");
      }
    } catch (e: any) {
      setError(e.message || "Network error.");
    }
    setLoading(false);
  }, [guildId, period]);
  useEffect(() => { fetchAll(); }, [fetchAll]);

  return (
    <div className="space-y-5 max-w-5xl">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight flex items-center gap-2">
            <BarChart2 className="w-6 h-6" style={{ color: '#d4af37' }} />Analytics
            {isPremium && <Badge className="bg-amber-100 text-amber-700 border border-amber-200 text-[10px] gap-0.5"><Star size={9} />PRO</Badge>}
          </h2>
          <p className="text-muted-foreground mt-0.5 text-sm">Staff performance and activity insights</p>
        </div>
        <div className="flex gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="h-8 w-36 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={fetchAll} className="gap-1.5 h-8"><RefreshCw size={13} />Refresh</Button>
        </div>
      </div>

      {!isPremium && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardContent className="p-4 flex items-start gap-3">
            <Star className="text-amber-500 flex-shrink-0 mt-0.5" size={18} />
            <div>
              <p className="font-semibold text-sm text-amber-800">Advanced Analytics — Preview Mode</p>
              <p className="text-xs text-amber-700 mt-0.5">You can view basic analytics for free. Upgrade to Premium for 90-day retention, detailed per-staff breakdowns, custom exports, and trend analysis.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-7 h-7 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#d4af37', borderTopColor: 'transparent' }} />
        </div>
      ) : error ? (
        <Card className="border-red-200"><CardContent className="py-8 text-center">
          <AlertTriangle size={24} className="mx-auto mb-2 text-red-500" />
          <p className="text-sm font-medium text-red-700">{error}</p>
          <Button variant="outline" size="sm" onClick={fetchAll} className="mt-3 gap-1.5"><RefreshCw size={13} />Retry</Button>
        </CardContent></Card>
      ) : !data ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground text-sm">No analytics data yet. Data appears as your staff is active.</CardContent></Card>
      ) : (
        <>
          {/* Key Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard icon={<Clock size={18} />} label="Total Shift Hours" value={fmtHours(data.totalShiftHours * 60)} sub={`${data.totalShifts} total shifts`} color="text-amber-600" />
            <StatCard icon={<Users size={18} />} label="Active Staff" value={data.activeStaff} sub={`of ${data.staffCount} total`} />
            <StatCard icon={<TrendingUp size={18} />} label="Avg Hours/Staff" value={fmtHours(data.avgHoursPerStaff * 60)} sub="per staff member" />
            <StatCard icon={<Activity size={18} />} label="Avg Shift Length" value={fmtHours(data.avgShiftMins)} sub="per shift" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Top Staff */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2"><Award size={15} className="text-amber-500" />Top Performing Staff</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {data.topStaff.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">No shift data in this period.</p>
                ) : data.topStaff.slice(0, 8).map((s, i) => {
                  const maxMins = data.topStaff[0]?.total_mins || 1;
                  return (
                    <div key={s.user_id} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-xs text-muted-foreground w-4 flex-shrink-0">#{i + 1}</span>
                          <span className="text-sm font-medium truncate">{s.username}</span>
                          {s.strike_count > 0 && <Badge className="text-[9px] bg-orange-100 text-orange-600 border-orange-200 border flex-shrink-0">{s.strike_count} strike{s.strike_count !== 1 ? 's' : ''}</Badge>}
                        </div>
                        <span className="text-xs text-muted-foreground flex-shrink-0 ml-2">{fmtHours(s.total_mins)} • {s.shift_count} shifts</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${Math.round((s.total_mins / maxMins) * 100)}%`, background: '#d4af37' }} />
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* Activity Breakdown */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2"><Activity size={15} className="text-blue-500" />Activity Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {data.actionBreakdown.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">No activity logged in this period.</p>
                ) : (() => {
                  const maxCount = Math.max(...data.actionBreakdown.map(a => Number(a.count)));
                  const colors: Record<string, string> = {
                    shift_start: '#22c55e', shift_end: '#22c55e', strike_issued: '#ef4444',
                    warning_issued: '#f97316', promotion: '#8b5cf6', demotion: '#ef4444',
                    commendation: '#d4af37', login: '#6b7280', mass_dm: '#6366f1',
                  };
                  return data.actionBreakdown.slice(0, 8).map(a => (
                    <SimpleBar key={a.action} label={ACTION_LABELS[a.action] || a.action.replace(/_/g, ' ')} value={Number(a.count)} max={maxCount} color={colors[a.action] || '#d4af37'} />
                  ));
                })()}
              </CardContent>
            </Card>
          </div>

          {/* Daily Activity Trend */}
          {data.dailyActivity.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2"><Calendar size={15} className="text-green-500" />Daily Activity — Last {period} Days</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-end gap-1 h-24">
                  {(() => {
                    const maxVal = Math.max(...data.dailyActivity.map(d => Number(d.count)), 1);
                    return data.dailyActivity.slice(-30).map((d, i) => {
                      const pct = Math.max(4, Math.round((Number(d.count) / maxVal) * 100));
                      const date = new Date(d.date);
                      return (
                        <div key={i} className="flex-1 flex flex-col items-center gap-1 group" title={`${date.toLocaleDateString()}: ${d.count} actions`}>
                          <div className="w-full rounded-t transition-all" style={{ height: `${pct}%`, background: '#d4af37', opacity: 0.7 + (Number(d.count) / maxVal) * 0.3 }} />
                        </div>
                      );
                    });
                  })()}
                </div>
                <div className="flex justify-between mt-2">
                  <span className="text-xs text-muted-foreground">{data.dailyActivity.length > 0 ? new Date(data.dailyActivity[0]?.date).toLocaleDateString() : ''}</span>
                  <span className="text-xs text-muted-foreground">{data.dailyActivity.length > 0 ? new Date(data.dailyActivity[data.dailyActivity.length - 1]?.date).toLocaleDateString() : ''}</span>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
