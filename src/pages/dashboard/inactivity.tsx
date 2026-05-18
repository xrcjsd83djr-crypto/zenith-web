import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, RefreshCw, Star, Clock, UserX, CheckCircle } from "lucide-react";

interface InactiveStaff { user_id: string; username: string; rank: string; last_activity: string | null; days_inactive: number | null; flagged: boolean; }

export default function InactivityPage({ guildId }: { guildId: string }) {
  const [staff, setStaff] = useState<InactiveStaff[]>([]);
  const [isPremium, setIsPremium] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const pRes = await fetch(`/api/guilds/${guildId}/is-premium`, { credentials: 'include' });
      if (pRes.ok) { const p = await pRes.json(); setIsPremium(p.isPremium); }
      const res = await fetch(`/api/guilds/${guildId}/inactivity`, { credentials: 'include' });
      if (res.ok) { setStaff(await res.json()); }
      else { const d = await res.json(); setError(d.error || 'Failed'); }
    } catch (err: any) { setError(err.message); }
    setLoading(false);
  }, [guildId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const flagged = staff.filter(s => s.flagged);
  const active = staff.filter(s => !s.flagged);

  if (loading) return <div className="flex justify-center py-20"><div className="w-7 h-7 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#d4af37', borderTopColor: 'transparent' }} /></div>;

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight flex items-center gap-2">
            <UserX className="w-6 h-6" style={{ color: '#d4af37' }} />Inactivity Scanner
            <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-[10px]"><Star size={9} className="mr-0.5" />Premium</Badge>
          </h2>
          <p className="text-muted-foreground mt-0.5 text-sm">Automatically detect staff who haven't logged activity in 7+ days. Stay ahead of ghost members.</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData} className="gap-1.5"><RefreshCw size={13} />Scan Now</Button>
      </div>

      {!isPremium ? (
        <Card className="border-amber-200 bg-amber-50 shadow-sm">
          <CardContent className="p-6 text-center">
            <UserX className="w-10 h-10 mx-auto mb-3 text-amber-600" />
            <h3 className="font-bold text-amber-800 mb-1">Premium Feature</h3>
            <p className="text-amber-700 text-sm mb-4">The Inactivity Scanner checks your staff roster against activity logs and shift data to automatically flag members who've gone quiet for 7+ days.</p>
            <a href="/premium" className="inline-block px-5 py-2 rounded-xl font-semibold text-sm" style={{ background: 'linear-gradient(135deg,#d4af37,#ffd700)', color: '#5a3e10' }}>Upgrade to Premium</a>
          </CardContent>
        </Card>
      ) : error ? (
        <Card className="border-red-200 bg-red-50"><CardContent className="p-4 text-red-700 text-sm">{error}</CardContent></Card>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Total Staff', val: staff.length, color: 'text-foreground' },
              { label: '⚠ Flagged Inactive', val: flagged.length, color: 'text-orange-500' },
              { label: '✓ Active (7d)', val: active.length, color: 'text-green-600' },
            ].map(s => (
              <Card key={s.label} className="border-border bg-white shadow-sm">
                <CardContent className="p-4"><div className={`text-2xl font-extrabold ${s.color}`}>{s.val}</div><div className="text-xs text-muted-foreground mt-0.5">{s.label}</div></CardContent>
              </Card>
            ))}
          </div>

          {flagged.length > 0 && (
            <Card className="border-orange-200 bg-orange-50/30 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2 text-orange-700">
                  <AlertTriangle size={14} />Flagged Inactive ({flagged.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {flagged.map(s => (
                  <div key={s.user_id} className="flex items-center justify-between gap-3 p-3 rounded-lg border border-orange-200 bg-orange-50">
                    <div>
                      <span className="font-semibold text-sm">{s.username}</span>
                      {s.rank && <span className="text-xs text-muted-foreground ml-2">{s.rank}</span>}
                    </div>
                    <div className="text-right flex-shrink-0">
                      {s.days_inactive !== null ? (
                        <Badge className="bg-orange-100 text-orange-700 border-orange-200 text-xs flex items-center gap-1">
                          <Clock size={10} />{s.days_inactive}d inactive
                        </Badge>
                      ) : (
                        <Badge className="bg-red-100 text-red-700 border-red-200 text-xs">No activity on record</Badge>
                      )}
                      {s.last_activity && <p className="text-[10px] text-muted-foreground mt-0.5">Last: {new Date(s.last_activity).toLocaleDateString()}</p>}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {active.length > 0 && (
            <Card className="border-border bg-white shadow-sm">
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2 text-green-600"><CheckCircle size={14} />Active Staff ({active.length})</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-1.5">
                  {active.slice(0, 10).map(s => (
                    <div key={s.user_id} className="flex items-center justify-between gap-3 p-2 rounded-lg border border-border">
                      <span className="text-sm font-medium">{s.username}</span>
                      {s.days_inactive !== null ? (
                        <span className="text-xs text-green-600">Active {s.days_inactive}d ago</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">Recent activity</span>
                      )}
                    </div>
                  ))}
                  {active.length > 10 && <p className="text-xs text-muted-foreground text-center pt-1">+{active.length - 10} more active</p>}
                </div>
              </CardContent>
            </Card>
          )}

          {staff.length === 0 && (
            <Card className="border-border bg-white shadow-sm"><CardContent className="py-16 text-center"><UserX className="w-10 h-10 text-muted-foreground mx-auto mb-3" /><p className="font-semibold text-muted-foreground">No staff data yet</p><p className="text-sm text-muted-foreground mt-1">Add staff to your roster to start inactivity scanning.</p></CardContent></Card>
          )}
        </>
      )}
    </div>
  );
}
