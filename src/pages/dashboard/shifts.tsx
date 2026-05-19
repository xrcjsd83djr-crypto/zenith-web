import { useState, useEffect, useCallback } from "react";
  import { Card, CardContent } from "@/components/ui/card";
  import { Button } from "@/components/ui/button";
  import { Badge } from "@/components/ui/badge";
  import { Input } from "@/components/ui/input";
  import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
  import { Clock, RefreshCw, Search, ChevronDown, ChevronUp, Timer, Play, Square, TrendingUp, Calendar, Star } from "lucide-react";

  interface Shift { id: number; user_id: string; username: string; started_at: string; ended_at?: string; duration_mins?: number; notes?: string; shift_type: string; }

  function formatDuration(mins?: number) {
    if (!mins) return '—';
    const h = Math.floor(mins/60), m = Math.round(mins%60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  }

  function ShiftRow({ shift, isActive }: { shift: Shift; isActive: boolean }) {
    const [open, setOpen] = useState(false);
    const started = new Date(shift.started_at);
    const elapsed = isActive ? Math.round((Date.now() - started.getTime()) / 60000) : shift.duration_mins;
    return (
      <div className="border border-border rounded-lg overflow-hidden mb-2">
        <button onClick={() => setOpen(o=>!o)} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors text-left">
          {isActive ? <Timer size={14} className="text-green-500 animate-pulse flex-shrink-0"/> : <Clock size={14} className="text-muted-foreground flex-shrink-0"/>}
          <div className="flex-1 min-w-0">
            <span className="font-semibold text-sm">{shift.username}</span>
            {shift.shift_type && shift.shift_type !== 'general' && <span className="text-muted-foreground text-xs ml-2 capitalize">[{shift.shift_type}]</span>}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {isActive ? <Badge className="bg-green-100 text-green-700 border-green-200 text-xs"><Play size={9} className="mr-1"/>Active</Badge> : null}
            <span className="font-mono text-sm font-medium">{formatDuration(elapsed)}</span>
            {open?<ChevronUp size={14} className="text-muted-foreground"/>:<ChevronDown size={14} className="text-muted-foreground"/>}
          </div>
        </button>
        {open && (
          <div className="px-4 pb-4 border-t bg-muted/20">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-3">
              <div><p className="text-xs text-muted-foreground font-medium">Staff</p><p className="text-sm font-semibold">{shift.username}</p></div>
              <div><p className="text-xs text-muted-foreground font-medium">Type</p><p className="text-sm capitalize">{shift.shift_type||'General'}</p></div>
              <div><p className="text-xs text-muted-foreground font-medium">Duration</p><p className="text-sm font-mono font-semibold">{formatDuration(elapsed)}</p></div>
              <div><p className="text-xs text-muted-foreground font-medium">Started</p><p className="text-sm">{started.toLocaleString()}</p></div>
              {shift.ended_at && <div><p className="text-xs text-muted-foreground font-medium">Ended</p><p className="text-sm">{new Date(shift.ended_at).toLocaleString()}</p></div>}
              {shift.notes && <div className="col-span-2 sm:col-span-3"><p className="text-xs text-muted-foreground font-medium">Notes</p><p className="text-sm">{shift.notes}</p></div>}
              <div><p className="text-xs text-muted-foreground font-medium">Shift ID</p><p className="text-sm font-mono text-xs">#{shift.id}</p></div>
            </div>
          </div>
        )}
      </div>
    );
  }

  export default function ShiftsPage({ guildId }: { guildId: string }) {
    const [shifts, setShifts] = useState<Shift[]>([]);
    const [isPremium, setIsPremium] = useState(false);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState('all');
    const [dateFilter, setDateFilter] = useState('7days');

    const fetchData = useCallback(async () => {
      setLoading(true);
      try {
        const [sRes, pRes] = await Promise.all([
          fetch(`/api/guilds/${guildId}/shifts`, {credentials:'include'}),
          fetch(`/api/guilds/${guildId}/premium`, {credentials:'include'}),
        ]);
        if (sRes.ok) setShifts(await sRes.json());
        if (pRes.ok) { const p = await pRes.json(); setIsPremium(p.isPremium); }
      } catch {}
      setLoading(false);
    }, [guildId]);
    useEffect(() => { fetchData(); }, [fetchData]);

    const now = Date.now();
    const cutoff = dateFilter === '7days' ? 7 : dateFilter === '30days' ? 30 : dateFilter === 'today' ? 1 : 9999;
    const filtered = shifts.filter(s => {
      const matchDate = dateFilter === 'all' || (now - new Date(s.started_at).getTime()) < cutoff * 24*60*60*1000;
      const matchSearch = !search || s.username.toLowerCase().includes(search.toLowerCase());
      const matchType = typeFilter === 'all' || s.shift_type === typeFilter;
      return matchDate && matchSearch && matchType;
    });

    const active = filtered.filter(s => !s.ended_at);
    const completed = filtered.filter(s => !!s.ended_at);
    const totalHours = completed.reduce((s, sh) => s + (sh.duration_mins||0), 0) / 60;
    const uniqueStaff = [...new Set(filtered.map(s => s.user_id))].length;
    const avgMins = completed.length ? completed.reduce((s, sh) => s + (sh.duration_mins||0), 0) / completed.length : 0;
    const shiftTypes = [...new Set(shifts.map(s => s.shift_type).filter(Boolean))];

    return (
      <div className="space-y-5 max-w-4xl">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight flex items-center gap-2"><Clock className="w-6 h-6" style={{color:'#d4af37'}}/>Shifts</h2>
            <p className="text-muted-foreground mt-0.5 text-sm">{active.length} active now • {completed.length} completed • {uniqueStaff} staff — click to expand</p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchData} className="gap-1.5"><RefreshCw size={13}/>Refresh</Button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card><CardContent className="p-3 text-center"><p className="text-2xl font-bold text-green-600">{active.length}</p><p className="text-xs text-muted-foreground">Active Now</p></CardContent></Card>
          <Card><CardContent className="p-3 text-center"><p className="text-2xl font-bold">{totalHours.toFixed(1)}h</p><p className="text-xs text-muted-foreground">Total Hours</p></CardContent></Card>
          <Card><CardContent className="p-3 text-center"><p className="text-2xl font-bold">{uniqueStaff}</p><p className="text-xs text-muted-foreground">Staff Active</p></CardContent></Card>
          <Card><CardContent className="p-3 text-center"><p className="text-2xl font-bold">{formatDuration(Math.round(avgMins))}</p><p className="text-xs text-muted-foreground">Avg Duration</p></CardContent></Card>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"/><Input placeholder="Search by username..." value={search} onChange={e=>setSearch(e.target.value)} className="pl-9 h-9 text-sm"/></div>
          <Select value={dateFilter} onValueChange={setDateFilter}><SelectTrigger className="w-[130px] h-9 text-sm"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="today">Today</SelectItem><SelectItem value="7days">Last 7 days</SelectItem><SelectItem value="30days">Last 30 days</SelectItem><SelectItem value="all">All Time</SelectItem></SelectContent></Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}><SelectTrigger className="w-[130px] h-9 text-sm"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="all">All Types</SelectItem>{shiftTypes.map(t=><SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}</SelectContent></Select>
        </div>
        {loading ? <div className="flex justify-center py-16"><div className="w-7 h-7 rounded-full border-2 border-t-transparent animate-spin" style={{borderColor:'#d4af37',borderTopColor:'transparent'}}/></div> : <>
          {active.length > 0 && <div><p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">🟢 Currently On Shift</p>{active.map(s=><ShiftRow key={s.id} shift={s} isActive/>)}</div>}
          {completed.length > 0 && <div><p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Completed Shifts</p>{completed.map(s=><ShiftRow key={s.id} shift={s} isActive={false}/>)}</div>}
          {filtered.length === 0 && <Card><CardContent className="py-12 text-center text-muted-foreground text-sm">No shifts found for the selected period.</CardContent></Card>}
        </>}
        {!isPremium && (
          <Card className="border-amber-200 bg-amber-50/50"><CardContent className="p-4 flex items-start gap-3">
            <Star size={18} className="text-amber-500 flex-shrink-0 mt-0.5"/>
            <div><p className="font-semibold text-sm text-amber-800">Auto Shift Cards — Premium</p><p className="text-xs text-amber-700 mt-0.5">Automatically generate and post shift summary cards to a Discord channel on a schedule. Shows each staff member's hours for the period. Upgrade to Premium to activate.</p></div>
          </CardContent></Card>
        )}
      </div>
    );
  }
  