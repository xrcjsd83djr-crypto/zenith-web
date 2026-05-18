import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, Play, Square, RefreshCw, AlertCircle, CheckCircle, Timer } from "lucide-react";

interface Shift { id: string; user_id: string; username: string; started_at: string; ended_at: string | null; duration_mins: number | null; }

function fmtDuration(mins: number | null) {
  if (!mins) return '—';
  const h = Math.floor(mins / 60), m = Math.round(mins % 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export default function ShiftsPage({ guildId }: { guildId: string }) {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [active, setActive] = useState<Shift[]>([]);
  const [me, setMe] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState<{ type: "ok"|"err"; text: string } | null>(null);
  const [myActiveShift, setMyActiveShift] = useState<Shift | null>(null);
  const [elapsed, setElapsed] = useState('');

  const showToast = (type: "ok"|"err", text: string) => { setToast({ type, text }); setTimeout(() => setToast(null), 4000); };

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [sRes, aRes, meRes] = await Promise.all([
        fetch(`/api/guilds/${guildId}/shifts`, { credentials: 'include' }),
        fetch(`/api/guilds/${guildId}/shifts/active`, { credentials: 'include' }),
        fetch('/api/me', { credentials: 'include' }),
      ]);
      const meData = meRes.ok ? await meRes.json() : null;
      setMe(meData);
      if (sRes.ok) setShifts(await sRes.json());
      if (aRes.ok) {
        const activeData: Shift[] = await aRes.json();
        setActive(activeData);
        if (meData) setMyActiveShift(activeData.find(s => s.user_id === meData.id) || null);
      }
    } catch {}
    setLoading(false);
  }, [guildId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Elapsed timer for active personal shift
  useEffect(() => {
    if (!myActiveShift) return;
    const tick = () => {
      const diff = Date.now() - new Date(myActiveShift.started_at).getTime();
      const h = Math.floor(diff / 3600000), m = Math.floor((diff % 3600000) / 60000), s = Math.floor((diff % 60000) / 1000);
      setElapsed(`${h > 0 ? `${h}h ` : ''}${m}m ${s}s`);
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [myActiveShift]);

  const startShift = async () => {
    if (!me) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/guilds/${guildId}/shifts/start`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({ userId: me.id, username: me.username }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      showToast('ok', 'Shift started! Use "End Shift" when done.');
      fetchAll();
    } catch (err: any) { showToast('err', err.message); }
    setActionLoading(false);
  };

  const endShift = async () => {
    if (!me) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/guilds/${guildId}/shifts/end`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({ userId: me.id }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      const shift: Shift = await res.json();
      showToast('ok', `Shift ended! Duration: ${fmtDuration(shift.duration_mins)}`);
      fetchAll();
    } catch (err: any) { showToast('err', err.message); }
    setActionLoading(false);
  };

  const completedShifts = shifts.filter(s => s.ended_at);
  const totalMins = completedShifts.reduce((acc, s) => acc + (parseFloat(s.duration_mins as any) || 0), 0);
  const myShifts = completedShifts.filter(s => me && s.user_id === me.id);
  const myMins = myShifts.reduce((acc, s) => acc + (parseFloat(s.duration_mins as any) || 0), 0);

  if (loading) return <div className="flex justify-center py-20"><div className="w-7 h-7 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#d4af37', borderTopColor: 'transparent' }} /></div>;

  return (
    <div className="space-y-5 max-w-4xl">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium flex items-center gap-2 ${toast.type === 'ok' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {toast.type === 'ok' ? <CheckCircle size={15} /> : <AlertCircle size={15} />} {toast.text}
        </div>
      )}

      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight flex items-center gap-2"><Clock className="w-6 h-6" style={{ color: '#d4af37' }} />Shift Tracking</h2>
          <p className="text-muted-foreground mt-0.5 text-sm">Log your active duty time. Free plan stores last 50 shifts — Premium gives unlimited history.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchAll} className="gap-1.5"><RefreshCw size={13} />Refresh</Button>
          {myActiveShift ? (
            <Button size="sm" onClick={endShift} disabled={actionLoading} className="gap-1.5 bg-red-500 hover:bg-red-600 text-white border-none font-semibold">
              <Square size={13} /> End Shift
            </Button>
          ) : (
            <Button size="sm" onClick={startShift} disabled={actionLoading} className="gap-1.5 font-semibold" style={{ background: 'linear-gradient(135deg,#d4af37,#ffd700)', color: '#5a3e10', border: 'none' }}>
              <Play size={13} /> Start Shift
            </Button>
          )}
        </div>
      </div>

      {/* Personal shift status */}
      {myActiveShift && (
        <Card className="border-green-200 bg-green-50 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse flex-shrink-0" />
            <div>
              <p className="font-semibold text-green-800 text-sm">Your shift is active</p>
              <p className="text-green-700 text-xs">Elapsed: <strong>{elapsed}</strong></p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Currently Active', val: active.length, color: 'text-green-600' },
          { label: 'Total Shifts (All)', val: completedShifts.length, color: 'text-foreground' },
          { label: 'My Shifts', val: myShifts.length, color: 'text-blue-600' },
          { label: 'My Total Time', val: fmtDuration(myMins), color: 'text-foreground' },
        ].map(s => (
          <Card key={s.label} className="border-border bg-white shadow-sm">
            <CardContent className="p-4"><div className={`text-xl font-extrabold ${s.color}`}>{s.val}</div><div className="text-xs text-muted-foreground font-medium mt-0.5">{s.label}</div></CardContent>
          </Card>
        ))}
      </div>

      {/* Currently on shift */}
      {active.length > 0 && (
        <Card className="border-border bg-white shadow-sm">
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Timer size={15} style={{ color: '#d4af37' }} />Currently On Shift ({active.length})</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {active.map(s => {
              const elapsed = Math.round((Date.now() - new Date(s.started_at).getTime()) / 60000);
              return (
                <div key={s.id} className="flex items-center justify-between gap-3 p-2 rounded-lg bg-green-50 border border-green-200">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-sm font-medium">{s.username}</span>
                  </div>
                  <span className="text-xs text-green-700 font-medium">{fmtDuration(elapsed)}</span>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* History */}
      <Card className="border-border bg-white shadow-sm">
        <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Clock size={15} style={{ color: '#d4af37' }} />Recent Shift History</CardTitle></CardHeader>
        <CardContent>
          {completedShifts.length === 0 ? (
            <div className="py-10 text-center"><Clock className="w-8 h-8 text-muted-foreground mx-auto mb-2" /><p className="text-sm text-muted-foreground">No completed shifts yet. Click "Start Shift" to begin tracking.</p></div>
          ) : (
            <div className="space-y-1.5">
              {completedShifts.slice(0, 20).map(s => (
                <div key={s.id} className="flex items-center justify-between gap-3 p-2.5 rounded-lg border border-border hover:bg-muted/30 transition-colors">
                  <div>
                    <span className="text-sm font-medium">{s.username}</span>
                    <span className="text-xs text-muted-foreground ml-2">{new Date(s.started_at).toLocaleDateString()}</span>
                  </div>
                  <Badge className="bg-blue-50 text-blue-700 border-blue-200 text-xs">{fmtDuration(parseFloat(s.duration_mins as any))}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
