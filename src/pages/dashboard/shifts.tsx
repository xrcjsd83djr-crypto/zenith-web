import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Clock, RefreshCw, Search, Filter, ChevronDown, ChevronUp, Send, Users, Star, AlertCircle, CheckCircle, Loader2, Download, Calendar } from "lucide-react";

interface Shift {
  id: number; guild_id: string; user_id: string; username: string;
  started_at: string; ended_at?: string; duration_mins?: number;
  shift_type?: string; notes?: string; break_mins?: number;
}

function fmtDuration(mins: number | null | undefined): string {
  if (!mins) return '0m';
  const m = Math.round(Number(mins));
  const h = Math.floor(m / 60);
  const rem = m % 60;
  if (h > 0) return `${h}h ${rem}m`;
  return `${rem}m`;
}

const SHIFT_COLORS: Record<string, string> = {
  general: 'bg-blue-100 text-blue-700 border-blue-200',
  patrol: 'bg-green-100 text-green-700 border-green-200',
  training: 'bg-purple-100 text-purple-700 border-purple-200',
  event: 'bg-amber-100 text-amber-700 border-amber-200',
  support: 'bg-cyan-100 text-cyan-700 border-cyan-200',
};

function StaffShiftRow({ username, shifts, onClickStaff }: {
  username: string; shifts: Shift[]; onClickStaff: (username: string, shifts: Shift[]) => void;
}) {
  const completed = shifts.filter(s => s.ended_at);
  const active = shifts.find(s => !s.ended_at);
  const totalMins = completed.reduce((a, s) => a + (Number(s.duration_mins) || 0), 0);
  const lastShift = completed[0];

  return (
    <button
      onClick={() => onClickStaff(username, shifts)}
      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors text-left border-b border-border last:border-0"
    >
      <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ background: 'rgba(212,175,55,.15)', color: '#d4af37' }}>
        {username[0]?.toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-sm">{username}</span>
          {active && <Badge className="bg-green-100 text-green-700 border-green-200 border text-[10px] gap-1"><span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />On Shift</Badge>}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">
          {completed.length} shift{completed.length !== 1 ? 's' : ''} • {fmtDuration(totalMins)} total
          {lastShift && ` • Last: ${new Date(lastShift.started_at).toLocaleDateString()}`}
        </p>
      </div>
      <ChevronDown size={14} className="text-muted-foreground flex-shrink-0" />
    </button>
  );
}

function StaffShiftDetailDialog({ username, shifts, open, onClose }: {
  username: string; shifts: Shift[]; open: boolean; onClose: () => void;
}) {
  const completed = shifts.filter(s => s.ended_at);
  const active = shifts.find(s => !s.ended_at);
  const totalMins = completed.reduce((a, s) => a + (Number(s.duration_mins) || 0), 0);
  const avgMins = completed.length > 0 ? totalMins / completed.length : 0;
  const types = completed.reduce((acc, s) => { const t = s.shift_type || 'general'; acc[t] = (acc[t] || 0) + 1; return acc; }, {} as Record<string, number>);

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock size={18} className="text-amber-500" />{username} — Shift Details
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          {active && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 border border-green-200 text-sm text-green-800">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse flex-shrink-0" />
              <strong>Currently on shift</strong> — started {new Date(active.started_at).toLocaleTimeString()}
            </div>
          )}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <p className="text-xl font-bold text-amber-600">{fmtDuration(totalMins)}</p>
              <p className="text-xs text-muted-foreground">Total Time</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <p className="text-xl font-bold">{completed.length}</p>
              <p className="text-xs text-muted-foreground">Shifts</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <p className="text-xl font-bold">{fmtDuration(avgMins)}</p>
              <p className="text-xs text-muted-foreground">Avg Length</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <p className="text-xl font-bold">{Object.keys(types).length}</p>
              <p className="text-xs text-muted-foreground">Shift Types</p>
            </div>
          </div>
          {Object.keys(types).length > 1 && (
            <div className="flex gap-2 flex-wrap">
              {Object.entries(types).map(([t, c]) => (
                <Badge key={t} className={`text-xs border ${SHIFT_COLORS[t] || SHIFT_COLORS.general}`}>{t}: {c}</Badge>
              ))}
            </div>
          )}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Shift History</p>
            {completed.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No completed shifts.</p>
            ) : completed.slice(0, 20).map(s => {
              const startTs = new Date(s.started_at);
              const endTs = s.ended_at ? new Date(s.ended_at) : null;
              return (
                <div key={s.id} className="flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-muted/20 transition-colors">
                  <Badge className={`text-[10px] border flex-shrink-0 mt-0.5 ${SHIFT_COLORS[s.shift_type || 'general'] || SHIFT_COLORS.general}`}>
                    {(s.shift_type || 'general').charAt(0).toUpperCase() + (s.shift_type || 'general').slice(1)}
                  </Badge>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium">{startTs.toLocaleDateString()}</p>
                      <p className="text-sm font-bold">{fmtDuration(Number(s.duration_mins))}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {startTs.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      {endTs && ` – ${endTs.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                    </p>
                    {s.notes && <p className="text-xs text-muted-foreground mt-0.5 italic">"{s.notes}"</p>}
                    {s.break_mins ? <p className="text-xs text-muted-foreground">Break: {fmtDuration(Number(s.break_mins))}</p> : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function ShiftsPage({ guildId }: { guildId: string }) {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [isPremium, setIsPremium] = useState(false);
  const [me, setMe] = useState<any>(null);
  const [channels, setChannels] = useState<any[]>([]);
  const [config, setConfig] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [periodFilter, setPeriodFilter] = useState('7');
  const [selectedStaff, setSelectedStaff] = useState<{ username: string; shifts: Shift[] } | null>(null);
  const [cardsOpen, setCardsOpen] = useState(false);
  const [cardsSubmitting, setCardsSubmitting] = useState(false);
  const [cardsPeriod, setCardsPeriod] = useState('today');
  const [cardsChannel, setCardsChannel] = useState('');
  const [cardsDm, setCardsDm] = useState(true);
  const [toast, setToast] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const showToast = (type: "ok" | "err", text: string) => { setToast({ type, text }); setTimeout(() => setToast(null), 4000); };

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const days = parseInt(periodFilter);
      const [sRes, pRes, meRes, cRes, cfgRes] = await Promise.allSettled([
        fetch(`/api/guilds/${guildId}/shifts?limit=1000&days=${days}`, { credentials: 'include' }),
        fetch(`/api/guilds/${guildId}/premium`, { credentials: 'include' }),
        fetch('/api/me', { credentials: 'include' }),
        fetch(`/api/guilds/${guildId}/channels`, { credentials: 'include' }),
        fetch(`/api/guilds/${guildId}/config`, { credentials: 'include' }),
      ]);
      if (sRes.status === 'fulfilled' && sRes.value.ok) { const d = await sRes.value.json().catch(() => []); setShifts(Array.isArray(d) ? d : []); }
      if (pRes.status === 'fulfilled' && pRes.value.ok) { const p = await pRes.value.json().catch(() => ({})); setIsPremium(!!p.isPremium); }
      if (meRes.status === 'fulfilled' && meRes.value.ok) setMe(await meRes.value.json().catch(() => null));
      if (cRes.status === 'fulfilled' && cRes.value.ok) { const d = await cRes.value.json().catch(() => []); setChannels(Array.isArray(d) ? d : []); }
      if (cfgRes.status === 'fulfilled' && cfgRes.value.ok) setConfig(await cfgRes.value.json().catch(() => ({})));
    } catch {}
    setLoading(false);
  }, [guildId, periodFilter]);
  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Group shifts by staff member
  const now = Date.now();
  const daysMs = parseInt(periodFilter) * 24 * 60 * 60 * 1000;
  const recentShifts = shifts.filter(s => new Date(s.started_at).getTime() > now - daysMs || !s.ended_at);

  const byStaff: Record<string, Shift[]> = {};
  for (const s of recentShifts) {
    if (!byStaff[s.username]) byStaff[s.username] = [];
    byStaff[s.username].push(s);
  }

  const staffList = Object.entries(byStaff)
    .sort((a, b) => {
      const aTotal = a[1].filter(s => s.ended_at).reduce((acc, s) => acc + (Number(s.duration_mins) || 0), 0);
      const bTotal = b[1].filter(s => s.ended_at).reduce((acc, s) => acc + (Number(s.duration_mins) || 0), 0);
      return bTotal - aTotal;
    })
    .filter(([username]) => !search || username.toLowerCase().includes(search.toLowerCase()))
    .filter(([, staffShifts]) => typeFilter === 'all' || staffShifts.some(s => (s.shift_type || 'general') === typeFilter));

  const activeShifts = shifts.filter(s => !s.ended_at);
  const completedShifts = shifts.filter(s => s.ended_at && new Date(s.started_at).getTime() > now - daysMs);
  const totalMins = completedShifts.reduce((a, s) => a + (Number(s.duration_mins) || 0), 0);

  const handleSendCards = async (e: React.FormEvent) => {
    e.preventDefault();
    setCardsSubmitting(true);
    try {
      const res = await fetch(`/api/guilds/${guildId}/shifts/send-cards`, {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ period: cardsPeriod, channelId: cardsChannel || null, sendDm: cardsDm }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((d as any).error || 'Failed');
      showToast("ok", `Shift cards sent for ${(d as any).count ?? 0} staff members.`);
      setCardsOpen(false);
    } catch (err: any) { showToast("err", err.message); }
    setCardsSubmitting(false);
  };

  return (
    <div className="space-y-5 max-w-5xl">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm font-medium ${toast.type === 'ok' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
          {toast.type === 'ok' ? <CheckCircle size={15} /> : <AlertCircle size={15} />}{toast.text}
        </div>
      )}

      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight flex items-center gap-2">
            <Clock className="w-6 h-6" style={{ color: '#d4af37' }} />Shifts — All Staff
          </h2>
          <p className="text-muted-foreground mt-0.5 text-sm">Track and manage shift hours across your entire team</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={fetchAll} className="gap-1.5"><RefreshCw size={13} />Refresh</Button>
          <Button size="sm" variant="outline" onClick={() => setCardsOpen(true)} className="gap-1.5">
            <Send size={13} />Send Shift Cards
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card><CardContent className="p-4">
          <p className="text-2xl font-bold text-green-600">{activeShifts.length}</p>
          <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />Currently on shift</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-2xl font-bold">{staffList.length}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Staff with shifts</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-2xl font-bold">{completedShifts.length}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Shifts completed</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-2xl font-bold text-amber-600">{fmtDuration(totalMins)}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Total hours logged</p>
        </CardContent></Card>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search staff..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9 text-sm" />
        </div>
        <Select value={periodFilter} onValueChange={setPeriodFilter}>
          <SelectTrigger className="h-9 w-40 text-sm"><Calendar size={13} className="mr-1" /><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="1">Today</SelectItem>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="14">Last 14 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="h-9 w-36 text-sm"><Filter size={13} className="mr-1" /><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="general">General</SelectItem>
            <SelectItem value="patrol">Patrol</SelectItem>
            <SelectItem value="training">Training</SelectItem>
            <SelectItem value="event">Event</SelectItem>
            <SelectItem value="support">Support</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Staff shift list */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-7 h-7 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#d4af37', borderTopColor: 'transparent' }} />
        </div>
      ) : staffList.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground text-sm">
          <Clock size={32} className="mx-auto mb-2 text-muted-foreground/40" />
          No shifts found. Staff use <code className="bg-muted px-1 py-0.5 rounded text-xs">/shift start</code> in Discord.
        </CardContent></Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div>
              {staffList.map(([username, staffShifts]) => (
                <StaffShiftRow key={username} username={username} shifts={staffShifts} onClickStaff={(u, s) => setSelectedStaff({ username: u, shifts: s })} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Auto-send cards premium feature */}
      {!isPremium && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardContent className="p-4 flex items-start gap-3">
            <Star className="text-amber-500 flex-shrink-0 mt-0.5" size={18} />
            <div>
              <p className="font-semibold text-sm text-amber-800">Auto Shift Cards — Premium Feature</p>
              <p className="text-xs text-amber-700 mt-0.5">Configure automatic shift card delivery. Set it once and Zenith will automatically send shift summary cards to staff DMs or a channel at your configured schedule.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Staff detail dialog */}
      {selectedStaff && (
        <StaffShiftDetailDialog
          username={selectedStaff.username}
          shifts={selectedStaff.shifts}
          open={!!selectedStaff}
          onClose={() => setSelectedStaff(null)}
        />
      )}

      {/* Send Shift Cards Dialog */}
      <Dialog open={cardsOpen} onOpenChange={setCardsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Send size={18} />Send Shift Cards</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSendCards} className="space-y-4 mt-2">
            <p className="text-xs text-muted-foreground">
              Send shift summary cards to staff. Each staff member receives their own card with their shift hours for the selected period.
            </p>
            <div className="space-y-1.5">
              <Label>Time Period *</Label>
              <Select value={cardsPeriod} onValueChange={setCardsPeriod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="yesterday">Yesterday</SelectItem>
                  <SelectItem value="week">This Week (7 days)</SelectItem>
                  <SelectItem value="month">This Month (30 days)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div><p className="text-sm font-medium">Send via DM</p><p className="text-xs text-muted-foreground mt-0.5">DM each staff member their own shift card</p></div>
              <Switch checked={cardsDm} onCheckedChange={setCardsDm} />
            </div>
            {isPremium && (
              <div className="space-y-1.5">
                <Label>Also post to Channel (optional)</Label>
                <Select value={cardsChannel} onValueChange={setCardsChannel}>
                  <SelectTrigger><SelectValue placeholder="Select channel (optional)" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Don't post to channel</SelectItem>
                    {channels.map(c => <SelectItem key={c.id} value={c.id}>#{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            {!isPremium && (
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-amber-50 border border-amber-200">
                <Star size={13} className="text-amber-500 flex-shrink-0" />
                <p className="text-xs text-amber-700">Upgrade to Premium to send cards to a channel and set up auto-delivery.</p>
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setCardsOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={cardsSubmitting} style={{ background: '#d4af37', color: '#000' }}>
                {cardsSubmitting ? <><Loader2 size={14} className="animate-spin mr-1.5" />Sending…</> : <><Send size={14} className="mr-1.5" />Send Cards</>}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
