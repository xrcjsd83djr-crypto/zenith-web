import { useState, useEffect, useCallback } from "react";
  import { Card, CardContent } from "@/components/ui/card";
  import { Button } from "@/components/ui/button";
  import { Badge } from "@/components/ui/badge";
  import { RefreshCw, Users, Shield, Search, LogIn, LogOut, Clock, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
  import { Input } from "@/components/ui/input";

  interface RosterEntry { id: string; user_id: string; username: string; checked_in_at: string; checked_out_at?: string; duration_mins?: number; duty_type: string; notes?: string; }

  function formatDuration(mins?: number) {
    if (!mins) return '—';
    const h = Math.floor(mins/60), m = Math.round(mins%60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  }

  function RosterRow({ entry }: { entry: RosterEntry }) {
    const [open, setOpen] = useState(false);
    const isActive = !entry.checked_out_at;
    const elapsed = isActive ? Math.round((Date.now()-new Date(entry.checked_in_at).getTime())/60000) : entry.duration_mins;
    return (
      <div className="border border-border rounded-lg overflow-hidden mb-2">
        <button onClick={()=>setOpen(o=>!o)} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors text-left">
          {isActive ? <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse flex-shrink-0"/> : <div className="w-2 h-2 rounded-full bg-gray-300 flex-shrink-0"/>}
          <div className="flex-1 min-w-0">
            <span className="font-semibold text-sm">{entry.username}</span>
            {entry.duty_type && entry.duty_type !== 'general' && <span className="text-muted-foreground text-xs ml-2 capitalize">[{entry.duty_type}]</span>}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {isActive ? <Badge className="bg-green-100 text-green-700 border-green-200 text-xs">On Duty</Badge> : <Badge className="bg-gray-100 text-gray-500 border text-xs">Checked Out</Badge>}
            <span className="font-mono text-sm">{formatDuration(elapsed)}</span>
            {open?<ChevronUp size={14} className="text-muted-foreground"/>:<ChevronDown size={14} className="text-muted-foreground"/>}
          </div>
        </button>
        {open && (
          <div className="px-4 pb-4 border-t bg-muted/20">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-3">
              <div><p className="text-xs text-muted-foreground font-medium">Staff</p><p className="text-sm font-semibold">{entry.username}</p></div>
              <div><p className="text-xs text-muted-foreground font-medium">Duty Type</p><p className="text-sm capitalize">{entry.duty_type||'General'}</p></div>
              <div><p className="text-xs text-muted-foreground font-medium">Duration</p><p className="text-sm font-mono font-semibold">{formatDuration(elapsed)}</p></div>
              <div><p className="text-xs text-muted-foreground font-medium">Checked In</p><p className="text-sm">{new Date(entry.checked_in_at).toLocaleString()}</p></div>
              {entry.checked_out_at && <div><p className="text-xs text-muted-foreground font-medium">Checked Out</p><p className="text-sm">{new Date(entry.checked_out_at).toLocaleString()}</p></div>}
              {entry.notes && <div className="col-span-2 sm:col-span-3"><p className="text-xs text-muted-foreground font-medium">Notes</p><p className="text-sm">{entry.notes}</p></div>}
            </div>
          </div>
        )}
      </div>
    );
  }

  export default function RosterPage({ guildId }: { guildId: string }) {
    const [entries, setEntries] = useState<RosterEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [showHistory, setShowHistory] = useState(false);

    const fetchData = useCallback(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/guilds/${guildId}/roster`, {credentials:'include'});
        if (res.ok) setEntries(await res.json());
      } catch {}
      setLoading(false);
    }, [guildId]);
    useEffect(() => { fetchData(); }, [fetchData]);

    const active = entries.filter(e => !e.checked_out_at);
    const history = entries.filter(e => !!e.checked_out_at);
    const displayed = showHistory ? history : active;
    const filtered = displayed.filter(e => !search || e.username.toLowerCase().includes(search.toLowerCase()));
    const totalDutyToday = history.filter(e => new Date(e.checked_in_at).toDateString() === new Date().toDateString()).reduce((s,e)=>s+(e.duration_mins||0),0);

    return (
      <div className="space-y-5 max-w-4xl">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight flex items-center gap-2"><Shield className="w-6 h-6" style={{color:'#d4af37'}}/>Duty Roster</h2>
            <p className="text-muted-foreground mt-0.5 text-sm">{active.length} staff currently on duty — check-in managed via Discord (/roster)</p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchData} className="gap-1.5"><RefreshCw size={13}/>Refresh</Button>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Card><CardContent className="p-3 text-center"><p className="text-2xl font-bold text-green-600">{active.length}</p><p className="text-xs text-muted-foreground">On Duty Now</p></CardContent></Card>
          <Card><CardContent className="p-3 text-center"><p className="text-2xl font-bold">{history.filter(e=>new Date(e.checked_in_at).toDateString()===new Date().toDateString()).length}</p><p className="text-xs text-muted-foreground">Sessions Today</p></CardContent></Card>
          <Card><CardContent className="p-3 text-center"><p className="text-2xl font-bold">{formatDuration(totalDutyToday)}</p><p className="text-xs text-muted-foreground">Duty Hours Today</p></CardContent></Card>
        </div>
        <div className="flex gap-2">
          <div className="relative flex-1"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"/><Input placeholder="Search staff..." value={search} onChange={e=>setSearch(e.target.value)} className="pl-9 h-9 text-sm"/></div>
          <Button variant={showHistory?"default":"outline"} size="sm" onClick={()=>setShowHistory(h=>!h)} className="gap-1.5" style={showHistory?{background:'#d4af37',color:'#000'}:{}}>
            <Clock size={13}/>{showHistory?'Showing History':'Show History'}
          </Button>
        </div>
        {!showHistory && active.length === 0 && !loading && (
          <Card><CardContent className="py-10 text-center"><Shield size={32} className="mx-auto text-muted-foreground mb-2 opacity-30"/><p className="text-muted-foreground text-sm">No staff currently on duty.</p><p className="text-xs text-muted-foreground mt-1">Staff check in via /roster check-in in Discord.</p></CardContent></Card>
        )}
        {loading ? <div className="flex justify-center py-16"><div className="w-7 h-7 rounded-full border-2 border-t-transparent animate-spin" style={{borderColor:'#d4af37',borderTopColor:'transparent'}}/></div>
          : filtered.length > 0 ? <div>{filtered.map(e=><RosterRow key={e.id} entry={e}/>)}</div>
          : !loading && showHistory ? <Card><CardContent className="py-12 text-center text-muted-foreground text-sm">No duty history found.</CardContent></Card> : null}
      </div>
    );
  }
  