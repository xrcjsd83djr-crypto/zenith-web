import { useState, useEffect, useCallback } from "react";
  import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
  import { Button } from "@/components/ui/button";
  import { Badge } from "@/components/ui/badge";
  import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
  import { Input } from "@/components/ui/input";
  import { Label } from "@/components/ui/label";
  import { Textarea } from "@/components/ui/textarea";
  import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
  import { Ban, Plus, RefreshCw, AlertCircle, CheckCircle, Loader2, History, Search, X, ChevronDown, ChevronUp } from "lucide-react";

  interface BLEntry { id: number; user_id?: string; username: string; reason: string; evidence?: string; added_by: string; added_by_name?: string; active: boolean; removed_at?: string; removed_by?: string; removed_by_name?: string; removal_reason?: string; created_at: string; }
  interface Member { id: string; username: string; }

  function RemovedHistoryDialog({ removed, onClose }: { removed: BLEntry[]; onClose: () => void }) {
    const [expanded, setExpanded] = useState<number | null>(null);
    return (
      <Dialog open onOpenChange={v => { if (!v) onClose(); }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><History size={18} />Previously Removed Blacklists ({removed.length})</DialogTitle></DialogHeader>
          <div className="mt-2 space-y-2">
            {removed.length === 0 ? <p className="text-sm text-muted-foreground text-center py-8">No removed blacklists yet.</p> : removed.map(r => (
              <div key={r.id} className="border border-border rounded-lg overflow-hidden">
                <button onClick={() => setExpanded(e => e === r.id ? null : r.id)} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors text-left">
                  <span className="font-semibold text-sm flex-1">{r.username}</span>
                  <span className="text-muted-foreground text-xs">{new Date(r.created_at).toLocaleDateString()}</span>
                  {expanded === r.id ? <ChevronUp size={14} className="text-muted-foreground" /> : <ChevronDown size={14} className="text-muted-foreground" />}
                </button>
                {expanded === r.id && (
                  <div className="px-4 pb-4 border-t bg-muted/20">
                    <div className="grid grid-cols-2 gap-3 mt-3">
                      <div><p className="text-xs text-muted-foreground font-medium">Username</p><p className="text-sm">{r.username}</p></div>
                      {r.user_id && <div><p className="text-xs text-muted-foreground font-medium">Discord ID</p><p className="text-sm font-mono text-xs">{r.user_id}</p></div>}
                      <div><p className="text-xs text-muted-foreground font-medium">Added By</p><p className="text-sm">{r.added_by_name || r.added_by}</p></div>
                      <div><p className="text-xs text-muted-foreground font-medium">Added On</p><p className="text-sm">{new Date(r.created_at).toLocaleString()}</p></div>
                      <div className="col-span-2"><p className="text-xs text-muted-foreground font-medium">Blacklist Reason</p><p className="text-sm">{r.reason}</p></div>
                      {r.evidence && <div className="col-span-2"><p className="text-xs text-muted-foreground font-medium">Evidence</p><p className="text-sm break-all">{r.evidence}</p></div>}
                      {r.removed_at && <div><p className="text-xs text-muted-foreground font-medium">Removed On</p><p className="text-sm text-green-700">{new Date(r.removed_at).toLocaleString()}</p></div>}
                      {r.removed_by_name && <div><p className="text-xs text-muted-foreground font-medium">Removed By</p><p className="text-sm">{r.removed_by_name}</p></div>}
                      {r.removal_reason && <div className="col-span-2"><p className="text-xs text-muted-foreground font-medium">Removal Reason</p><p className="text-sm">{r.removal_reason}</p></div>}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  export default function BlacklistPage({ guildId }: { guildId: string }) {
    const [entries, setEntries] = useState<BLEntry[]>([]);
    const [members, setMembers] = useState<Member[]>([]);
    const [me, setMe] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [open, setOpen] = useState(false);
    const [historyOpen, setHistoryOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [removing, setRemoving] = useState<number | null>(null);
    const [search, setSearch] = useState('');
    const [form, setForm] = useState({ userId: '', username: '', reason: '', evidence: '' });
    const [toast, setToast] = useState<{ type: "ok"|"err"; text: string } | null>(null);
    const showToast = (type: "ok"|"err", text: string) => { setToast({ type, text }); setTimeout(() => setToast(null), 4000); };

    const fetchAll = useCallback(async () => {
      setLoading(true);
      try {
        const [bRes, mRes, meRes] = await Promise.all([
          fetch(`/api/guilds/${guildId}/blacklist`, { credentials: 'include' }),
          fetch(`/api/guilds/${guildId}/members`, { credentials: 'include' }),
          fetch('/api/me', { credentials: 'include' }),
        ]);
        if (bRes.ok) setEntries(await bRes.json());
        if (mRes.ok) setMembers(await mRes.json());
        if (meRes.ok) setMe(await meRes.json());
      } catch {}
      setLoading(false);
    }, [guildId]);
    useEffect(() => { fetchAll(); }, [fetchAll]);

    const active = entries.filter(e => e.active);
    const removed = entries.filter(e => !e.active);
    const filtered = active.filter(e => !search || e.username.toLowerCase().includes(search.toLowerCase()) || (e.user_id||'').includes(search));

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!form.username.trim() || !form.reason.trim()) return showToast("err", "Username and reason required.");
      setSubmitting(true);
      try {
        const res = await fetch(`/api/guilds/${guildId}/blacklist`, {
          method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: form.userId || null, username: form.username, reason: form.reason, evidence: form.evidence || null, addedBy: me?.id, addedByName: me?.username }),
        });
        if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Failed'); }
        showToast("ok", `${form.username} blacklisted.`);
        setOpen(false); setForm({ userId: '', username: '', reason: '', evidence: '' }); fetchAll();
      } catch (err: any) { showToast("err", err.message); }
      setSubmitting(false);
    };

    const handleRemove = async (id: number, username: string) => {
      const reason = prompt(`Reason for removing ${username} from blacklist:`);
      if (reason === null) return;
      setRemoving(id);
      try {
        const res = await fetch(`/api/guilds/${guildId}/blacklist/${id}`, {
          method: 'DELETE', credentials: 'include', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ removedBy: me?.id, removedByName: me?.username, removalReason: reason }),
        });
        if (!res.ok) throw new Error('Failed to remove');
        showToast("ok", `${username} removed from blacklist.`); fetchAll();
      } catch (err: any) { showToast("err", err.message); }
      setRemoving(null);
    };

    return (
      <div className="space-y-5 max-w-4xl">
        {toast && (
          <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm font-medium ${toast.type==='ok'?'bg-green-50 text-green-800 border border-green-200':'bg-red-50 text-red-800 border border-red-200'}`}>
            {toast.type==='ok'?<CheckCircle size={15}/>:<AlertCircle size={15}/>}{toast.text}
          </div>
        )}
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight flex items-center gap-2"><Ban className="w-6 h-6 text-red-500" />Blacklist</h2>
            <p className="text-muted-foreground mt-0.5 text-sm">{active.length} active blacklists</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchAll} className="gap-1.5"><RefreshCw size={13}/>Refresh</Button>
            <Button variant="outline" size="sm" onClick={() => setHistoryOpen(true)} className="gap-1.5 relative">
              <History size={13}/>Previously Removed
              {removed.length > 0 && <span className="ml-1 bg-muted text-muted-foreground text-xs rounded-full px-1.5 py-0.5">{removed.length}</span>}
            </Button>
            <Button size="sm" onClick={() => setOpen(true)} className="gap-1.5 bg-red-600 hover:bg-red-700 text-white"><Plus size={13}/>Add to Blacklist</Button>
          </div>
        </div>
        <div className="relative"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"/><Input placeholder="Search by username or ID..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9 text-sm"/></div>
        {loading ? <div className="flex justify-center py-16"><div className="w-7 h-7 rounded-full border-2 border-t-transparent animate-spin" style={{borderColor:'#d4af37',borderTopColor:'transparent'}}/></div>
          : filtered.length === 0 ? <Card><CardContent className="py-12 text-center text-muted-foreground text-sm">No active blacklists{search ? ' matching your search' : ''}.</CardContent></Card>
          : <div className="space-y-2">{filtered.map(e => (
              <Card key={e.id}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Ban size={18} className="text-red-500 mt-0.5 flex-shrink-0"/>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap"><span className="font-semibold">{e.username}</span>{e.user_id&&<span className="text-muted-foreground text-xs font-mono">{e.user_id}</span>}</div>
                      <p className="text-sm mt-1">{e.reason}</p>
                      {e.evidence&&<p className="text-xs text-muted-foreground mt-0.5">Evidence: {e.evidence}</p>}
                      <p className="text-xs text-muted-foreground mt-1">Added by {e.added_by_name||e.added_by} • {new Date(e.created_at).toLocaleDateString()}</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => handleRemove(e.id, e.username)} disabled={removing===e.id} className="flex-shrink-0 text-red-600 border-red-200 hover:bg-red-50">
                      {removing===e.id?<Loader2 size={13} className="animate-spin"/>:<X size={13}/>}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}</div>}
        {historyOpen && <RemovedHistoryDialog removed={removed} onClose={() => setHistoryOpen(false)}/>}
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Add to Blacklist</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-3 mt-2">
              <div className="space-y-1.5">
                <Label>Discord Member (optional)</Label>
                <Select value={form.userId} onValueChange={v => { const m = members.find(m=>m.id===v); setForm(f=>({...f, userId:v, username:m?.username||f.username})); }}>
                  <SelectTrigger><SelectValue placeholder="Select from server members"/></SelectTrigger>
                  <SelectContent>{members.map(m=><SelectItem key={m.id} value={m.id}>{m.username}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label>Username *</Label><Input value={form.username} onChange={e=>setForm(f=>({...f,username:e.target.value}))} placeholder="Username" required/></div>
              <div className="space-y-1.5"><Label>Reason *</Label><Textarea value={form.reason} onChange={e=>setForm(f=>({...f,reason:e.target.value}))} placeholder="Reason for blacklisting..." rows={3} required/></div>
              <div className="space-y-1.5"><Label>Evidence (optional)</Label><Input value={form.evidence} onChange={e=>setForm(f=>({...f,evidence:e.target.value}))} placeholder="Link or description of evidence"/></div>
              <div className="flex justify-end gap-2 pt-1">
                <Button type="button" variant="outline" onClick={()=>setOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={submitting} className="bg-red-600 hover:bg-red-700 text-white">
                  {submitting?<><Loader2 size={14} className="animate-spin mr-1.5"/>Adding…</>:<><Ban size={14} className="mr-1.5"/>Blacklist</>}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    );
  }
  