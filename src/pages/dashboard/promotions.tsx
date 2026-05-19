import { useState, useEffect, useCallback } from "react";
  import { Card, CardContent } from "@/components/ui/card";
  import { Button } from "@/components/ui/button";
  import { Badge } from "@/components/ui/badge";
  import { Input } from "@/components/ui/input";
  import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
  import { TrendingUp, RefreshCw, ChevronDown, ChevronUp, Search, ArrowUp, ArrowDown, ArrowRight, Loader2 } from "lucide-react";

  interface Promotion { id: string; user_id: string; username: string; type: string; from_rank?: string; to_rank?: string; reason?: string; evidence?: string; promoted_by: string; promoted_by_name?: string; old_division?: string; new_division?: string; created_at: string; }

  function TypeBadge({ type }: { type: string }) {
    if (type === 'promotion') return <Badge className="bg-green-100 text-green-700 border-green-200 text-xs gap-1"><ArrowUp size={10} />Promotion</Badge>;
    if (type === 'demotion')  return <Badge className="bg-red-100 text-red-700 border-red-200 text-xs gap-1"><ArrowDown size={10} />Demotion</Badge>;
    return <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-xs gap-1"><ArrowRight size={10} />Transfer</Badge>;
  }

  function PromotionRow({ item }: { item: Promotion }) {
    const [open, setOpen] = useState(false);
    const ts = new Date(item.created_at);
    return (
      <div className="border border-border rounded-lg overflow-hidden mb-2">
        <button onClick={() => setOpen(o => !o)} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors text-left">
          <TypeBadge type={item.type} />
          <div className="flex-1 min-w-0">
            <span className="font-semibold text-sm">{item.username}</span>
            {(item.from_rank || item.to_rank) && (
              <span className="text-muted-foreground text-xs ml-2">{item.from_rank || '—'} → {item.to_rank || '—'}</span>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-muted-foreground text-xs hidden sm:block">{ts.toLocaleDateString()}</span>
            {open ? <ChevronUp size={14} className="text-muted-foreground" /> : <ChevronDown size={14} className="text-muted-foreground" />}
          </div>
        </button>
        {open && (
          <div className="px-4 pb-4 border-t border-border bg-muted/20">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-3">
              <div><p className="text-xs text-muted-foreground font-medium">Staff Member</p><p className="text-sm font-medium">{item.username}</p></div>
              <div><p className="text-xs text-muted-foreground font-medium">Action</p><TypeBadge type={item.type} /></div>
              {item.from_rank && <div><p className="text-xs text-muted-foreground font-medium">Previous Rank</p><p className="text-sm">{item.from_rank}</p></div>}
              {item.to_rank && <div><p className="text-xs text-muted-foreground font-medium">New Rank</p><p className="text-sm font-semibold text-green-700">{item.to_rank}</p></div>}
              {item.old_division && <div><p className="text-xs text-muted-foreground font-medium">Previous Division</p><p className="text-sm">{item.old_division}</p></div>}
              {item.new_division && <div><p className="text-xs text-muted-foreground font-medium">New Division</p><p className="text-sm">{item.new_division}</p></div>}
              <div><p className="text-xs text-muted-foreground font-medium">Actioned By</p><p className="text-sm">{item.promoted_by_name || item.promoted_by}</p></div>
              <div><p className="text-xs text-muted-foreground font-medium">Date & Time</p><p className="text-sm">{ts.toLocaleString()}</p></div>
              {item.reason && <div className="col-span-2 sm:col-span-3"><p className="text-xs text-muted-foreground font-medium">Reason</p><p className="text-sm">{item.reason}</p></div>}
              {item.evidence && <div className="col-span-2 sm:col-span-3"><p className="text-xs text-muted-foreground font-medium">Evidence</p><p className="text-sm break-all">{item.evidence}</p></div>}
            </div>
          </div>
        )}
      </div>
    );
  }

  export default function PromotionsPage({ guildId }: { guildId: string }) {
    const [items, setItems] = useState<Promotion[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState('all');

    const fetch_ = useCallback(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/guilds/${guildId}/promotions`, { credentials: 'include' });
        if (res.ok) setItems(await res.json());
      } catch {}
      setLoading(false);
    }, [guildId]);
    useEffect(() => { fetch_(); }, [fetch_]);

    const filtered = items.filter(i => {
      const s = search.toLowerCase();
      return (!s || i.username.toLowerCase().includes(s) || (i.from_rank||'').toLowerCase().includes(s) || (i.to_rank||'').toLowerCase().includes(s) || (i.promoted_by_name||'').toLowerCase().includes(s))
        && (typeFilter === 'all' || i.type === typeFilter);
    });

    const counts = { promotion: items.filter(i=>i.type==='promotion').length, demotion: items.filter(i=>i.type==='demotion').length, transfer: items.filter(i=>i.type==='transfer').length };

    return (
      <div className="space-y-5 max-w-4xl">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight flex items-center gap-2"><TrendingUp className="w-6 h-6" style={{ color: '#d4af37' }} />Promotions & History</h2>
            <p className="text-muted-foreground mt-0.5 text-sm">Click any record to view full details</p>
          </div>
          <Button variant="outline" size="sm" onClick={fetch_} className="gap-1.5"><RefreshCw size={13} />Refresh</Button>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[['promotion','Promotions','green'], ['demotion','Demotions','red'], ['transfer','Transfers','blue']].map(([type,label,c]) => (
            <Card key={type} className={`cursor-pointer border-${c}-200 hover:bg-${c}-50/30 transition-colors`} onClick={() => setTypeFilter(t => t === type ? 'all' : type as string)}>
              <CardContent className="p-3 text-center">
                <p className="text-2xl font-bold">{counts[type as keyof typeof counts]}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="flex gap-2">
          <div className="relative flex-1"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" /><Input placeholder="Search by name or rank..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9 text-sm" /></div>
          <Select value={typeFilter} onValueChange={setTypeFilter}><SelectTrigger className="w-[140px] h-9 text-sm"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All Types</SelectItem><SelectItem value="promotion">Promotions</SelectItem><SelectItem value="demotion">Demotions</SelectItem><SelectItem value="transfer">Transfers</SelectItem></SelectContent></Select>
        </div>
        {loading ? <div className="flex justify-center py-16"><div className="w-7 h-7 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#d4af37', borderTopColor: 'transparent' }} /></div>
          : filtered.length === 0 ? <Card><CardContent className="py-12 text-center text-muted-foreground text-sm">No records found.</CardContent></Card>
          : <div>{filtered.map(item => <PromotionRow key={item.id} item={item} />)}</div>}
      </div>
    );
  }
  