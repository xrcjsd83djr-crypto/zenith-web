import { useState, useEffect, useCallback } from "react";
  import { Card, CardContent } from "@/components/ui/card";
  import { Button } from "@/components/ui/button";
  import { Badge } from "@/components/ui/badge";
  import { Input } from "@/components/ui/input";
  import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
  import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
  import { Label } from "@/components/ui/label";
  import { Textarea } from "@/components/ui/textarea";
  import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
  import { Clock, Search, RefreshCw, Send, Filter, Download, Users, Timer, Calendar, ChevronDown, ChevronUp, TrendingUp, Shield, Lock } from "lucide-react";

  interface Shift { id: number; user_id: string; username: string; started_at: string; ended_at?: string; duration_mins?: number; shift_type: string; notes?: string; break_mins?: number; }
  interface DutyEntry { id: string; user_id: string; username: string; role?: string; checked_in_at: string; checked_out_at?: string; duration_mins?: number; duty_type?: string; notes?: string; }

  function fmt(mins?: number) {
    if (!mins) return "—";
    const h = Math.floor(mins / 60), m = Math.round(mins % 60);
    return h > 0 ? h + "h " + m + "m" : m + "m";
  }
  function elapsed(since: string) {
    return Math.round((Date.now() - new Date(since).getTime()) / 60000);
  }

  function ShiftRow({ s }: { s: Shift }) {
    const [open, setOpen] = useState(false);
    const active = !s.ended_at;
    const dur = active ? elapsed(s.started_at) : s.duration_mins;
    return (
      <div className="border border-border rounded-lg overflow-hidden mb-2">
        <button onClick={() => setOpen(o => !o)} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors text-left">
          {active && <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse flex-shrink-0" />}
          <div className="flex-1 min-w-0">
            <span className="font-semibold text-sm">{s.username}</span>
            {s.shift_type && s.shift_type !== "general" && <span className="text-muted-foreground text-xs ml-2 capitalize">[{s.shift_type}]</span>}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {active ? <Badge className="bg-green-100 text-green-700 border-green-200 border text-xs">On Duty</Badge>
              : <Badge className="bg-gray-100 text-gray-500 border text-xs">Ended</Badge>}
            <span className="font-mono text-sm text-muted-foreground">{fmt(dur)}</span>
            {open ? <ChevronUp size={14} className="text-muted-foreground" /> : <ChevronDown size={14} className="text-muted-foreground" />}
          </div>
        </button>
        {open && (
          <div className="px-4 pb-4 border-t bg-muted/20">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-3 text-sm">
              <div><p className="text-xs text-muted-foreground font-medium">Staff Member</p><p className="font-semibold">{s.username}</p></div>
              <div><p className="text-xs text-muted-foreground font-medium">Type</p><p className="capitalize">{s.shift_type || "General"}</p></div>
              <div><p className="text-xs text-muted-foreground font-medium">Duration</p><p className="font-mono font-semibold">{fmt(dur)}</p></div>
              <div><p className="text-xs text-muted-foreground font-medium">Started</p><p>{new Date(s.started_at).toLocaleString()}</p></div>
              {s.ended_at && <div><p className="text-xs text-muted-foreground font-medium">Ended</p><p>{new Date(s.ended_at).toLocaleString()}</p></div>}
              {(s.break_mins ?? 0) > 0 && <div><p className="text-xs text-muted-foreground font-medium">Break Time</p><p className="font-mono">{fmt(s.break_mins)}</p></div>}
              {s.notes && <div className="col-span-2 sm:col-span-3"><p className="text-xs text-muted-foreground font-medium">Notes</p><p>{s.notes}</p></div>}
            </div>
          </div>
        )}
      </div>
    );
  }

  function DutyRow({ d }: { d: DutyEntry }) {
    const [open, setOpen] = useState(false);
    const active = !d.checked_out_at;
    const dur = active ? elapsed(d.checked_in_at) : d.duration_mins;
    return (
      <div className="border border-border rounded-lg overflow-hidden mb-2">
        <button onClick={() => setOpen(o => !o)} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors text-left">
          {active && <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse flex-shrink-0" />}
          <div className="flex-1 min-w-0">
            <span className="font-semibold text-sm">{d.username}</span>
            {d.role && <span className="text-muted-foreground text-xs ml-2">[{d.role}]</span>}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {active ? <Badge className="bg-blue-100 text-blue-700 border-blue-200 border text-xs">Checked In</Badge>
              : <Badge className="bg-gray-100 text-gray-500 border text-xs">Checked Out</Badge>}
            <span className="font-mono text-sm text-muted-foreground">{fmt(dur)}</span>
            {open ? <ChevronUp size={14} className="text-muted-foreground" /> : <ChevronDown size={14} className="text-muted-foreground" />}
          </div>
        </button>
        {open && (
          <div className="px-4 pb-4 border-t bg-muted/20">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-3 text-sm">
              <div><p className="text-xs text-muted-foreground font-medium">Staff Member</p><p className="font-semibold">{d.username}</p></div>
              <div><p className="text-xs text-muted-foreground font-medium">Role</p><p>{d.role || "—"}</p></div>
              <div><p className="text-xs text-muted-foreground font-medium">Time On Duty</p><p className="font-mono font-semibold">{fmt(dur)}</p></div>
              <div><p className="text-xs text-muted-foreground font-medium">Checked In</p><p>{new Date(d.checked_in_at).toLocaleString()}</p></div>
              {d.checked_out_at && <div><p className="text-xs text-muted-foreground font-medium">Checked Out</p><p>{new Date(d.checked_out_at).toLocaleString()}</p></div>}
              {d.notes && <div className="col-span-2 sm:col-span-3"><p className="text-xs text-muted-foreground font-medium">Notes</p><p>{d.notes}</p></div>}
            </div>
          </div>
        )}
      </div>
    );
  }

  export default function ShiftsPage({ guildId }: { guildId: string }) {
    const [shifts, setShifts] = useState<Shift[]>([]);
    const [duty, setDuty] = useState<DutyEntry[]>([]);
    const [isPremium, setIsPremium] = useState(false);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [typeFilter, setTypeFilter] = useState("all");
    const [dateFilter, setDateFilter] = useState("all");
    const [sendOpen, setSendOpen] = useState(false);
    const [sendPeriod, setSendPeriod] = useState("today");
    const [sendChannel, setSendChannel] = useState("");
    const [sendDm, setSendDm] = useState(true);
    const [channels, setChannels] = useState<{id:string;name:string}[]>([]);
    const [sending, setSending] = useState(false);
    const [sendResult, setSendResult] = useState<string | null>(null);

    const fetchAll = useCallback(async () => {
      setLoading(true);
      try {
        const [sRes, dRes, gRes, chRes] = await Promise.all([
          fetch(`/api/guilds/${guildId}/shifts`, { credentials: "include" }),
          fetch(`/api/guilds/${guildId}/roster/history`, { credentials: "include" }),
          fetch(`/api/guilds/${guildId}`, { credentials: "include" }),
          fetch(`/api/guilds/${guildId}/channels`, { credentials: "include" }),
        ]);
        if (sRes.ok) setShifts(await sRes.json());
        if (dRes.ok) setDuty(await dRes.json());
        if (gRes.ok) { const g = await gRes.json(); setIsPremium(g.isPremium ?? false); }
        if (chRes.ok) setChannels(await chRes.json());
      } catch {}
      setLoading(false);
    }, [guildId]);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    const now = new Date();
    const activeShifts = shifts.filter(s => !s.ended_at);
    const activeDuty = duty.filter(d => !d.checked_out_at);

    const filterByDate = (date: string) => {
      const d = new Date(date);
      if (dateFilter === "today") return d.toDateString() === now.toDateString();
      if (dateFilter === "week") return (now.getTime() - d.getTime()) < 7 * 86400000;
      if (dateFilter === "month") return (now.getTime() - d.getTime()) < 30 * 86400000;
      return true;
    };

    const filteredShifts = shifts
      .filter(s => s.ended_at)
      .filter(s => !search || s.username.toLowerCase().includes(search.toLowerCase()))
      .filter(s => typeFilter === "all" || s.shift_type === typeFilter)
      .filter(s => filterByDate(s.started_at));

    const totalHours = shifts.filter(s => s.ended_at).reduce((acc, s) => acc + (s.duration_mins || 0), 0);
    const todayShifts = shifts.filter(s => s.started_at && new Date(s.started_at).toDateString() === now.toDateString());
    const uniqueStaff = new Set(shifts.map(s => s.user_id)).size;

    const handleSendCards = async () => {
      setSending(true); setSendResult(null);
      try {
        const res = await fetch(`/api/guilds/${guildId}/shifts/send-cards`, {
          method: "POST", credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ period: sendPeriod, channelId: sendDm ? null : sendChannel, sendDm }),
        });
        const data = await res.json();
        setSendResult(res.ok ? ("Sent shift cards to " + (data.count || 0) + " staff members.") : (data.error || "Failed to send cards."));
      } catch { setSendResult("Network error. Please try again."); }
      setSending(false);
    };

    const goldStyle = { background: "#d4af37", color: "#000" };

    return (
      <div className="space-y-5 max-w-5xl">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight flex items-center gap-2">
              <Clock className="w-6 h-6" style={{ color: "#d4af37" }} />Shifts & Duty Tracker
            </h2>
            <p className="text-muted-foreground mt-0.5 text-sm">{activeShifts.length} active shifts • {activeDuty.length} on duty • {uniqueStaff} staff total</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchAll} className="gap-1.5"><RefreshCw size={13} />Refresh</Button>
            <Button size="sm" onClick={() => setSendOpen(true)} className="gap-1.5" style={goldStyle}><Send size={13} />Send Shift Cards</Button>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card><CardContent className="p-3 text-center"><p className="text-2xl font-bold text-green-600">{activeShifts.length}</p><p className="text-xs text-muted-foreground">Active Shifts</p></CardContent></Card>
          <Card><CardContent className="p-3 text-center"><p className="text-2xl font-bold text-blue-600">{activeDuty.length}</p><p className="text-xs text-muted-foreground">On Duty</p></CardContent></Card>
          <Card><CardContent className="p-3 text-center"><p className="text-2xl font-bold">{todayShifts.length}</p><p className="text-xs text-muted-foreground">Sessions Today</p></CardContent></Card>
          <Card><CardContent className="p-3 text-center"><p className="text-2xl font-bold">{fmt(totalHours)}</p><p className="text-xs text-muted-foreground">Total Hours Logged</p></CardContent></Card>
        </div>

        <Tabs defaultValue="shifts">
          <TabsList>
            <TabsTrigger value="shifts">Shift History</TabsTrigger>
            <TabsTrigger value="duty">Duty Roster</TabsTrigger>
            <TabsTrigger value="live">Live View</TabsTrigger>
            {isPremium && <TabsTrigger value="auto">Auto-Send <span className="ml-1 text-[9px] font-bold px-1 py-0.5 rounded" style={{ background: "#d4af37", color: "#000" }}>PRO</span></TabsTrigger>}
          </TabsList>

          <TabsContent value="shifts" className="mt-4 space-y-3">
            <div className="flex flex-wrap gap-2">
              <div className="relative flex-1 min-w-48">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Search by name..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9 text-sm" />
              </div>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-36 h-9 text-sm"><SelectValue placeholder="Shift type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="patrol">Patrol</SelectItem>
                  <SelectItem value="training">Training</SelectItem>
                  <SelectItem value="event">Event</SelectItem>
                </SelectContent>
              </Select>
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger className="w-32 h-9 text-sm"><SelectValue placeholder="Date range" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {loading ? <div className="flex justify-center py-16"><div className="w-7 h-7 rounded-full border-2 animate-spin" style={{ borderColor: "#d4af37", borderTopColor: "transparent" }} /></div>
              : filteredShifts.length === 0 ? <Card><CardContent className="py-12 text-center text-muted-foreground text-sm">No completed shifts match your filters.</CardContent></Card>
              : filteredShifts.map(s => <ShiftRow key={s.id} s={s} />)}
          </TabsContent>

          <TabsContent value="duty" className="mt-4 space-y-3">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Search staff..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9 text-sm" />
              </div>
            </div>
            {loading ? <div className="flex justify-center py-16"><div className="w-7 h-7 rounded-full border-2 animate-spin" style={{ borderColor: "#d4af37", borderTopColor: "transparent" }} /></div>
              : duty.filter(d => !search || d.username.toLowerCase().includes(search.toLowerCase())).length === 0
                ? <Card><CardContent className="py-12 text-center text-muted-foreground text-sm">No duty records found.</CardContent></Card>
                : duty.filter(d => !search || d.username.toLowerCase().includes(search.toLowerCase())).map(d => <DutyRow key={d.id} d={d} />)}
          </TabsContent>

          <TabsContent value="live" className="mt-4 space-y-3">
            <h3 className="font-semibold text-sm text-muted-foreground">Currently Active</h3>
            {activeShifts.length === 0 && activeDuty.length === 0 ? (
              <Card><CardContent className="py-12 text-center"><Shield size={32} className="mx-auto text-muted-foreground mb-2 opacity-20" /><p className="text-muted-foreground text-sm">No staff currently active.</p></CardContent></Card>
            ) : (
              <>
                {activeShifts.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1"><Clock size={11} />Active Shifts ({activeShifts.length})</p>
                    {activeShifts.map(s => <ShiftRow key={s.id} s={s} />)}
                  </div>
                )}
                {activeDuty.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1"><Shield size={11} />On Duty ({activeDuty.length})</p>
                    {activeDuty.map(d => <DutyRow key={d.id} d={d} />)}
                  </div>
                )}
              </>
            )}
          </TabsContent>

          {isPremium && (
            <TabsContent value="auto" className="mt-4">
              <Card>
                <CardContent className="p-5 space-y-4">
                  <div>
                    <h3 className="font-semibold mb-1">Auto-Send Shift Cards</h3>
                    <p className="text-sm text-muted-foreground">Configure automatic shift card delivery. Cards are sent to staff DMs or a designated channel on schedule.</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><Label className="text-xs">Frequency</Label>
                      <Select><SelectTrigger className="h-9 text-sm mt-1"><SelectValue placeholder="Select frequency" /></SelectTrigger>
                        <SelectContent><SelectItem value="daily">Daily</SelectItem><SelectItem value="weekly">Weekly</SelectItem><SelectItem value="biweekly">Bi-Weekly</SelectItem></SelectContent>
                      </Select>
                    </div>
                    <div><Label className="text-xs">Send To</Label>
                      <Select><SelectTrigger className="h-9 text-sm mt-1"><SelectValue placeholder="DMs or channel" /></SelectTrigger>
                        <SelectContent><SelectItem value="dm">Staff DMs</SelectItem><SelectItem value="channel">Channel</SelectItem></SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Button size="sm" style={goldStyle}>Save Auto-Send Config</Button>
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>

        {/* Send Shift Cards Dialog */}
        <Dialog open={sendOpen} onOpenChange={setSendOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Send Shift Cards</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <Label className="text-xs">Time Period</Label>
                <Select value={sendPeriod} onValueChange={setSendPeriod}>
                  <SelectTrigger className="h-9 text-sm mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="yesterday">Yesterday</SelectItem>
                    <SelectItem value="week">This Week</SelectItem>
                    <SelectItem value="month">This Month</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="sendDm" checked={sendDm} onChange={e => setSendDm(e.target.checked)} className="rounded" />
                <Label htmlFor="sendDm" className="text-sm">Send to staff DMs</Label>
              </div>
              {!sendDm && (
                <div>
                  <Label className="text-xs">Channel</Label>
                  <Select value={sendChannel} onValueChange={setSendChannel}>
                    <SelectTrigger className="h-9 text-sm mt-1"><SelectValue placeholder="Select channel" /></SelectTrigger>
                    <SelectContent>{channels.map(c => <SelectItem key={c.id} value={c.id}>#{c.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              )}
              {sendResult && <p className={"text-sm p-3 rounded-lg " + (sendResult.includes("Sent") ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700")}>{sendResult}</p>}
              <div className="flex gap-2">
                <Button onClick={handleSendCards} disabled={sending || (!sendDm && !sendChannel)} style={goldStyle} className="flex-1">
                  {sending ? "Sending…" : "Send Cards"}
                </Button>
                <Button variant="outline" onClick={() => setSendOpen(false)}>Cancel</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {!isPremium && (
          <Card className="border-dashed border-yellow-300">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Lock size={18} style={{ color: "#d4af37" }} className="mt-0.5" />
                <div>
                  <p className="font-semibold text-sm">Premium: Auto-Send Shift Cards</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Configure automatic shift card delivery on a schedule. Staff receive their shift summaries without manual intervention. Also includes 90-day retention vs 7-day for free tier.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }
  