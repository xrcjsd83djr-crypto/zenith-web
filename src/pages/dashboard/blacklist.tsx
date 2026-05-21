import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ShieldBan, Plus, RefreshCw, AlertCircle, CheckCircle, Loader2, ChevronDown, ChevronUp, History, User, Calendar, FileText, X, Search, Eye } from "lucide-react";

interface BlacklistEntry {
  id: number; guild_id: string; user_id?: string; username: string; reason: string; evidence?: string;
  added_by: string; added_by_name?: string; active: boolean;
  removed_at?: string; removed_by?: string; removed_by_name?: string; removal_reason?: string;
  created_at: string;
}

function BlacklistCard({ entry, me, guildId, onRemoved }: { entry: BlacklistEntry; me: any; guildId: string; onRemoved: () => void }) {
  const [open, setOpen] = useState(false);
  const [removeOpen, setRemoveOpen] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [removeReason, setRemoveReason] = useState("");

  const handleRemove = async () => {
    if (!removeReason.trim()) return;
    setRemoving(true);
    try {
      const res = await fetch(`/api/guilds/${guildId}/blacklist/${entry.id}`, {
        method: 'DELETE', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ removedBy: me?.id, removedByName: me?.username, removalReason: removeReason }),
      });
      if (res.ok) { setRemoveOpen(false); onRemoved(); }
    } catch {}
    setRemoving(false);
  };

  const ts = new Date(entry.created_at);
  return (
    <div className="border border-border rounded-lg overflow-hidden mb-2">
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors text-left">
        <ShieldBan size={16} className="flex-shrink-0 text-red-500" />
        <div className="flex-1 min-w-0">
          <span className="font-semibold text-sm">{entry.username}</span>
          <span className="text-muted-foreground text-xs ml-2 truncate">"{entry.reason.slice(0, 70)}{entry.reason.length > 70 ? '…' : ''}"</span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xs text-muted-foreground hidden sm:block">{ts.toLocaleDateString()}</span>
          {open ? <ChevronUp size={14} className="text-muted-foreground" /> : <ChevronDown size={14} className="text-muted-foreground" />}
        </div>
      </button>
      {open && (
        <div className="px-4 pb-4 border-t border-border bg-muted/20">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-3">
            <div><p className="text-xs text-muted-foreground font-medium">Username</p><p className="text-sm font-semibold">{entry.username}</p></div>
            {entry.user_id && <div><p className="text-xs text-muted-foreground font-medium">Discord ID</p><p className="text-sm font-mono text-xs">{entry.user_id}</p></div>}
            <div><p className="text-xs text-muted-foreground font-medium">Added By</p><p className="text-sm">{entry.added_by_name || entry.added_by}</p></div>
            <div><p className="text-xs text-muted-foreground font-medium">Date Added</p><p className="text-sm">{ts.toLocaleString()}</p></div>
            <div className="col-span-2 sm:col-span-3"><p className="text-xs text-muted-foreground font-medium">Reason</p><p className="text-sm">{entry.reason}</p></div>
            {entry.evidence && <div className="col-span-2 sm:col-span-3"><p className="text-xs text-muted-foreground font-medium">Evidence</p><p className="text-sm break-all">{entry.evidence}</p></div>}
            {entry.active && (
              <div className="col-span-2 sm:col-span-3 pt-1">
                {removeOpen ? (
                  <div className="flex gap-2">
                    <Input value={removeReason} onChange={e => setRemoveReason(e.target.value)} placeholder="Reason for removal..." className="h-8 text-sm flex-1" />
                    <Button size="sm" onClick={handleRemove} disabled={removing} className="bg-green-600 hover:bg-green-700 text-white text-xs">
                      {removing ? <Loader2 size={12} className="animate-spin" /> : "Confirm"}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setRemoveOpen(false)} className="text-xs">Cancel</Button>
                  </div>
                ) : (
                  <Button size="sm" variant="outline" onClick={() => setRemoveOpen(true)} className="text-red-600 border-red-200 hover:bg-red-50 text-xs gap-1">
                    <X size={12} />Remove from Blacklist
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function RemovedHistoryDialog({ removed, open, onClose }: { removed: BlacklistEntry[]; open: boolean; onClose: () => void }) {
  const [selected, setSelected] = useState<BlacklistEntry | null>(null);
  return (
    <Dialog open={open} onOpenChange={v => { if (!v) { onClose(); setSelected(null); } }}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History size={18} className="text-muted-foreground" />
            Previously Removed Blacklists ({removed.length})
          </DialogTitle>
        </DialogHeader>
        {selected ? (
          <div className="space-y-4 mt-2">
            <Button variant="ghost" size="sm" onClick={() => setSelected(null)} className="gap-1 text-xs">← Back to list</Button>
            <div className="grid grid-cols-2 gap-3">
              <div><p className="text-xs text-muted-foreground font-medium">Username</p><p className="text-sm font-semibold">{selected.username}</p></div>
              {selected.user_id && <div><p className="text-xs text-muted-foreground font-medium">Discord ID</p><p className="text-sm font-mono text-xs">{selected.user_id}</p></div>}
              <div><p className="text-xs text-muted-foreground font-medium">Blacklisted On</p><p className="text-sm">{new Date(selected.created_at).toLocaleString()}</p></div>
              <div><p className="text-xs text-muted-foreground font-medium">Added By</p><p className="text-sm">{selected.added_by_name || selected.added_by}</p></div>
              <div className="col-span-2"><p className="text-xs text-muted-foreground font-medium">Blacklist Reason</p><p className="text-sm">{selected.reason}</p></div>
              {selected.evidence && <div className="col-span-2"><p className="text-xs text-muted-foreground font-medium">Evidence</p><p className="text-sm break-all">{selected.evidence}</p></div>}
              {selected.removed_at && <div><p className="text-xs text-muted-foreground font-medium">Removed On</p><p className="text-sm">{new Date(selected.removed_at).toLocaleString()}</p></div>}
              {(selected.removed_by_name || selected.removed_by) && <div><p className="text-xs text-muted-foreground font-medium">Removed By</p><p className="text-sm">{selected.removed_by_name || selected.removed_by}</p></div>}
              {selected.removal_reason && <div className="col-span-2"><p className="text-xs text-muted-foreground font-medium">Removal Reason</p><p className="text-sm">{selected.removal_reason}</p></div>}
            </div>
          </div>
        ) : (
          <div className="space-y-2 mt-2">
            {removed.length === 0 ? (
              <p className="text-center text-muted-foreground text-sm py-8">No removed blacklists yet.</p>
            ) : removed.map(r => (
              <button
                key={r.id}
                onClick={() => setSelected(r)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border border-border hover:bg-muted/40 transition-colors text-left"
              >
                <User size={14} className="flex-shrink-0 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{r.username}</p>
                  <p className="text-xs text-muted-foreground truncate">{r.reason.slice(0, 60)}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  {r.removed_at && <p className="text-xs text-muted-foreground">Removed {new Date(r.removed_at).toLocaleDateString()}</p>}
                  <Eye size={12} className="text-muted-foreground ml-auto mt-0.5" />
                </div>
              </button>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function BlacklistPage({ guildId }: { guildId: string }) {
  const [entries, setEntries] = useState<BlacklistEntry[]>([]);
  const [me, setMe] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ userId: '', username: '', reason: '', evidence: '' });
  const [toast, setToast] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const showToast = (type: "ok" | "err", text: string) => { setToast({ type, text }); setTimeout(() => setToast(null), 4000); };

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [bRes, meRes] = await Promise.allSettled([
        fetch(`/api/guilds/${guildId}/blacklist`, { credentials: 'include' }),
        fetch('/api/me', { credentials: 'include' }),
      ]);
      if (bRes.status === 'fulfilled' && bRes.value.ok) {
        const d = await bRes.value.json().catch(() => []);
        setEntries(Array.isArray(d) ? d : []);
      }
      if (meRes.status === 'fulfilled' && meRes.value.ok) setMe(await meRes.value.json().catch(() => null));
    } catch {}
    setLoading(false);
  }, [guildId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const active = entries.filter(e => e.active);
  const removed = entries.filter(e => !e.active);
  const filtered = active.filter(e => !search || e.username.toLowerCase().includes(search.toLowerCase()) || e.reason.toLowerCase().includes(search.toLowerCase()));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.username.trim() || !form.reason.trim()) return showToast("err", "Username and reason are required.");
    setSubmitting(true);
    try {
      const res = await fetch(`/api/guilds/${guildId}/blacklist`, {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: form.userId || null, username: form.username, reason: form.reason, evidence: form.evidence || null, addedBy: me?.id, addedByName: me?.username }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((d as any).error || 'Failed');
      showToast("ok", `${form.username} has been blacklisted.`);
      setOpen(false);
      setForm({ userId: '', username: '', reason: '', evidence: '' });
      fetchAll();
    } catch (err: any) { showToast("err", err.message); }
    setSubmitting(false);
  };

  return (
    <div className="space-y-5 max-w-4xl">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm font-medium ${toast.type === 'ok' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
          {toast.type === 'ok' ? <CheckCircle size={15} /> : <AlertCircle size={15} />}{toast.text}
        </div>
      )}

      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight flex items-center gap-2">
            <ShieldBan className="w-6 h-6 text-red-500" />Blacklist
          </h2>
          <p className="text-muted-foreground mt-0.5 text-sm">{active.length} active entries — click any to expand details</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={fetchAll} className="gap-1.5"><RefreshCw size={13} />Refresh</Button>
          <Button size="sm" onClick={() => setOpen(true)} className="gap-1.5 bg-red-600 hover:bg-red-700 text-white">
            <Plus size={13} />Add to Blacklist
          </Button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-red-600">{active.length}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Active Blacklists</p>
          </CardContent>
        </Card>
        <button
          onClick={() => setHistoryOpen(true)}
          className="text-left"
        >
          <Card className="hover:border-amber-300 hover:bg-amber-50/30 transition-colors cursor-pointer">
            <CardContent className="p-4">
              <p className="text-2xl font-bold text-muted-foreground">{removed.length}</p>
              <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                <History size={10} />Previously Removed — click to view
              </p>
            </CardContent>
          </Card>
        </button>
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-bold">{entries.length}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Total All Time</p>
          </CardContent>
        </Card>
      </div>

      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search blacklist..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9 text-sm" />
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-7 h-7 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#d4af37', borderTopColor: 'transparent' }} />
        </div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground text-sm">
          {search ? `No results for "${search}"` : 'No active blacklist entries. Keep up the good work!'}
        </CardContent></Card>
      ) : (
        <div>{filtered.map(e => <BlacklistCard key={e.id} entry={e} me={me} guildId={guildId} onRemoved={fetchAll} />)}</div>
      )}

      <RemovedHistoryDialog removed={removed} open={historyOpen} onClose={() => setHistoryOpen(false)} />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><ShieldBan size={18} className="text-red-500" />Add to Blacklist</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-3 mt-2">
            <div className="space-y-1.5">
              <Label>Username *</Label>
              <Input value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} placeholder="Their username or Roblox name" required />
            </div>
            <div className="space-y-1.5">
              <Label>Discord User ID (optional)</Label>
              <Input value={form.userId} onChange={e => setForm(f => ({ ...f, userId: e.target.value }))} placeholder="18-digit Discord ID" />
            </div>
            <div className="space-y-1.5">
              <Label>Reason *</Label>
              <Textarea value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} placeholder="Why are they being blacklisted?" rows={3} required />
            </div>
            <div className="space-y-1.5">
              <Label>Evidence (optional)</Label>
              <Input value={form.evidence} onChange={e => setForm(f => ({ ...f, evidence: e.target.value }))} placeholder="Screenshot link or description" />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={submitting} className="bg-red-600 hover:bg-red-700 text-white">
                {submitting ? <><Loader2 size={14} className="animate-spin mr-1.5" />Adding…</> : <><ShieldBan size={14} className="mr-1.5" />Add to Blacklist</>}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
