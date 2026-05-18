import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ClipboardList, LogIn, LogOut, RefreshCw, AlertCircle, CheckCircle, Clock } from "lucide-react";

interface RosterEntry { id: string; user_id: string; username: string; role: string; on_duty: boolean; checked_in_at: string; checked_out_at: string | null; }

function elapsed(from: string) {
  const ms = Date.now() - new Date(from).getTime();
  const h = Math.floor(ms / 3600000), m = Math.floor((ms % 3600000) / 60000);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export default function RosterPage({ guildId }: { guildId: string }) {
  const [onDuty, setOnDuty] = useState<RosterEntry[]>([]);
  const [history, setHistory] = useState<RosterEntry[]>([]);
  const [me, setMe] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [toast, setToast] = useState<{ type: "ok"|"err"; text: string } | null>(null);
  const [myEntry, setMyEntry] = useState<RosterEntry | null>(null);
  const [tick, setTick] = useState(0);

  const showToast = (type: "ok"|"err", text: string) => { setToast({ type, text }); setTimeout(() => setToast(null), 4000); };

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [rRes, hRes, meRes] = await Promise.all([
        fetch(`/api/guilds/${guildId}/roster`, { credentials: 'include' }),
        fetch(`/api/guilds/${guildId}/roster/history`, { credentials: 'include' }),
        fetch('/api/me', { credentials: 'include' }),
      ]);
      const meData = meRes.ok ? await meRes.json() : null;
      setMe(meData);
      if (rRes.ok) {
        const duty: RosterEntry[] = await rRes.json();
        setOnDuty(duty);
        if (meData) setMyEntry(duty.find(e => e.user_id === meData.id) || null);
      }
      if (hRes.ok) setHistory(await hRes.json());
    } catch {}
    setLoading(false);
  }, [guildId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);
  useEffect(() => { const t = setInterval(() => setTick(x => x + 1), 30000); return () => clearInterval(t); }, []);

  const checkIn = async () => {
    if (!me) return;
    setActing(true);
    try {
      const res = await fetch(`/api/guilds/${guildId}/roster/checkin`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({ userId: me.id, username: me.username, role: 'Staff' }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      showToast('ok', 'Checked in — you\'re now on duty!');
      fetchAll();
    } catch (err: any) { showToast('err', err.message); }
    setActing(false);
  };

  const checkOut = async () => {
    if (!me) return;
    setActing(true);
    try {
      await fetch(`/api/guilds/${guildId}/roster/checkout`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({ userId: me.id }),
      });
      showToast('ok', 'Checked out — duty session ended.');
      fetchAll();
    } catch { showToast('err', 'Failed to check out.'); }
    setActing(false);
  };

  const recentHistory = history.filter(h => !h.on_duty).slice(0, 20);

  if (loading) return <div className="flex justify-center py-20"><div className="w-7 h-7 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#d4af37', borderTopColor: 'transparent' }} /></div>;

  return (
    <div className="space-y-5 max-w-3xl">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium flex items-center gap-2 ${toast.type === 'ok' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {toast.type === 'ok' ? <CheckCircle size={15} /> : <AlertCircle size={15} />} {toast.text}
        </div>
      )}

      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight flex items-center gap-2"><ClipboardList className="w-6 h-6" style={{ color: '#d4af37' }} />Duty Roster</h2>
          <p className="text-muted-foreground mt-0.5 text-sm">See who's currently on active duty. Check in when you start your shift, check out when done.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchAll} className="gap-1.5"><RefreshCw size={13} />Refresh</Button>
          {myEntry ? (
            <Button size="sm" onClick={checkOut} disabled={acting} className="gap-1.5 bg-red-500 hover:bg-red-600 text-white border-none font-semibold">
              <LogOut size={13} /> Check Out
            </Button>
          ) : (
            <Button size="sm" onClick={checkIn} disabled={acting} style={{ background: 'linear-gradient(135deg,#d4af37,#ffd700)', color: '#5a3e10', border: 'none' }} className="gap-1.5 font-semibold">
              <LogIn size={13} /> Check In
            </Button>
          )}
        </div>
      </div>

      {/* My status */}
      {myEntry && (
        <Card className="border-green-200 bg-green-50 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse flex-shrink-0" />
            <div>
              <p className="font-semibold text-green-800 text-sm">You're on duty</p>
              <p className="text-xs text-green-700">Checked in {elapsed(myEntry.checked_in_at)} ago</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Currently on duty */}
      <Card className="border-border bg-white shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" /> On Duty Now
            <Badge className="bg-green-100 text-green-700 border-green-200 ml-1">{onDuty.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {onDuty.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No staff currently on duty. Be the first to check in!</p>
          ) : (
            <div className="space-y-2">
              {onDuty.map(e => (
                <div key={e.id} className="flex items-center justify-between gap-3 p-3 rounded-lg border border-green-200 bg-green-50">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-green-500 flex-shrink-0" />
                    <div>
                      <p className="font-semibold text-sm">{e.username}</p>
                      <p className="text-xs text-green-700">{e.role}</p>
                    </div>
                  </div>
                  <span className="text-xs text-green-700 font-medium flex items-center gap-1">
                    <Clock size={11} />{elapsed(e.checked_in_at)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent history */}
      {recentHistory.length > 0 && (
        <Card className="border-border bg-white shadow-sm">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Recent Duty History</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-1.5">
              {recentHistory.map(e => {
                const dur = e.checked_out_at
                  ? Math.round((new Date(e.checked_out_at).getTime() - new Date(e.checked_in_at).getTime()) / 60000)
                  : null;
                const hrs = dur ? Math.floor(dur / 60) : 0;
                const mins = dur ? dur % 60 : 0;
                const durStr = dur ? (hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`) : '—';
                return (
                  <div key={e.id} className="flex items-center justify-between gap-3 p-2.5 rounded-lg border border-border hover:bg-muted/30 transition-colors">
                    <div>
                      <span className="text-sm font-medium">{e.username}</span>
                      <span className="text-xs text-muted-foreground ml-2">{new Date(e.checked_in_at).toLocaleDateString()}</span>
                    </div>
                    <Badge className="bg-blue-50 text-blue-700 border-blue-200 text-xs">{durStr}</Badge>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
