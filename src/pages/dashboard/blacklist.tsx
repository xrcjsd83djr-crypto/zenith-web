import { useState, useEffect, useCallback } from "react";
  import { Card, CardContent } from "@/components/ui/card";
  import { Button } from "@/components/ui/button";
  import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
  import { Label } from "@/components/ui/label";
  import { Input } from "@/components/ui/input";
  import { Textarea } from "@/components/ui/textarea";
  import { Plus, Loader2, RefreshCw, ShieldBan, X, CheckCircle, AlertCircle, Search } from "lucide-react";

  interface BlacklistEntry { id: number; user_id: string; username: string; reason: string; added_by: string; added_by_name: string; active: boolean; created_at: string; }

  export default function BlacklistPage({ guildId }: { guildId: string }) {
    const [entries, setEntries] = useState<BlacklistEntry[]>([]);
    const [me, setMe] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [open, setOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [form, setForm] = useState({ userId: '', username: '', reason: '' });
    const [search, setSearch] = useState('');
    const [error, setError] = useState('');
    const [toast, setToast] = useState<{ type: "ok"|"err"; text: string } | null>(null);

    const showToast = (type: "ok"|"err", text: string) => { setToast({ type, text }); setTimeout(() => setToast(null), 4000); };

    const fetchAll = useCallback(async () => {
      setLoading(true);
      try {
        const [bRes, mRes] = await Promise.all([
          fetch(`/api/guilds/${guildId}/blacklist`, { credentials: 'include' }),
          fetch('/api/me', { credentials: 'include' }),
        ]);
        if (bRes.ok) setEntries(await bRes.json());
        if (mRes.ok) setMe(await mRes.json());
      } catch { }
      setLoading(false);
    }, [guildId]);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!form.username.trim() || !form.reason.trim()) { setError('Username and reason are required.'); return; }
      setSubmitting(true); setError('');
      try {
        const res = await fetch(`/api/guilds/${guildId}/blacklist`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
          body: JSON.stringify({ ...form, addedBy: me?.id, addedByName: me?.username }),
        });
        if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Failed'); }
        setOpen(false); setForm({ userId: '', username: '', reason: '' });
        fetchAll(); showToast('ok', 'User blacklisted successfully.');
      } catch (err: any) { setError(err.message); }
      setSubmitting(false);
    };

    const removeEntry = async (id: number) => {
      try {
        await fetch(`/api/guilds/${guildId}/blacklist/${id}`, { method: 'DELETE', credentials: 'include' });
        setEntries(e => e.filter(x => x.id !== id));
        showToast('ok', 'Removed from blacklist.');
      } catch { showToast('err', 'Failed to remove.'); }
    };

    const filtered = entries.filter(e => e.active && (!search || e.username.toLowerCase().includes(search.toLowerCase()) || e.user_id.includes(search)));

    if (loading) return <div className="flex justify-center items-center py-20"><div className="w-7 h-7 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#d4af37', borderTopColor: 'transparent' }} /></div>;

    return (
      <div className="space-y-5 max-w-4xl">
        {toast && <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium flex items-center gap-2 ${toast.type === 'ok' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>{toast.type === 'ok' ? <CheckCircle size={15} /> : <AlertCircle size={15} />} {toast.text}</div>}
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight flex items-center gap-2"><ShieldBan className="w-6 h-6" style={{ color: '#d4af37' }} /> Blacklist</h2>
            <p className="text-muted-foreground mt-0.5 text-sm">Track users permanently barred from applying or joining the staff team.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={fetchAll} className="gap-1.5"><RefreshCw size={13} />Refresh</Button>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button size="sm" style={{ background: 'linear-gradient(135deg,#d4af37,#ffd700)', color: '#5a3e10', border: 'none' }} className="gap-1.5 font-semibold"><Plus size={14} /> Add to Blacklist</Button>
              </DialogTrigger>
              <DialogContent className="bg-white border-border max-w-md">
                <DialogHeader><DialogTitle className="flex items-center gap-2"><ShieldBan size={18} style={{ color: '#d4af37' }} />Add to Blacklist</DialogTitle></DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 mt-2">
                  <div className="space-y-1.5"><Label className="font-semibold">Username / Display Name</Label><Input value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} placeholder="Discord or Roblox username" className="bg-white border-border" required /></div>
                  <div className="space-y-1.5"><Label className="font-semibold">Discord User ID (optional)</Label><Input value={form.userId} onChange={e => setForm(f => ({ ...f, userId: e.target.value }))} placeholder="18-digit Discord ID" className="bg-white border-border font-mono text-sm" /></div>
                  <div className="space-y-1.5"><Label className="font-semibold">Reason</Label><Textarea value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} placeholder="Why this user is permanently barred..." className="bg-white border-border min-h-[80px]" required /></div>
                  {error && <p className="text-red-600 text-sm flex items-center gap-1.5"><AlertCircle size={13} />{error}</p>}
                  <div className="flex justify-end gap-2 pt-1">
                    <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                    <Button type="submit" disabled={submitting} className="bg-red-500 hover:bg-red-600 text-white border-0">{submitting ? <><Loader2 size={13} className="animate-spin mr-1" />Adding...</> : "Blacklist User"}</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Card className="border-border bg-white shadow-sm"><CardContent className="p-4"><div className="text-2xl font-extrabold text-red-500">{entries.filter(e => e.active).length}</div><div className="text-xs text-muted-foreground font-medium mt-0.5">Blacklisted Users</div></CardContent></Card>
          <Card className="border-border bg-white shadow-sm"><CardContent className="p-4"><div className="text-2xl font-extrabold text-muted-foreground">{entries.filter(e => !e.active).length}</div><div className="text-xs text-muted-foreground font-medium mt-0.5">Previously Removed</div></CardContent></Card>
        </div>
        {entries.filter(e => e.active).length > 0 && (
          <div className="relative"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" /><Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by username or Discord ID..." className="pl-8 bg-white border-border" /></div>
        )}
        {filtered.length > 0 ? (
          <div className="space-y-2">
            {filtered.map(entry => (
              <Card key={entry.id} className="border-red-200 bg-red-50/40 shadow-sm"><CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <ShieldBan size={13} className="text-red-500 flex-shrink-0" />
                      <span className="font-bold">{entry.username}</span>
                      {entry.user_id && <span className="text-xs text-muted-foreground font-mono">{entry.user_id}</span>}
                      <span className="text-xs text-muted-foreground">{new Date(entry.created_at).toLocaleDateString()}</span>
                      {entry.added_by_name && <span className="text-xs text-muted-foreground">added by {entry.added_by_name}</span>}
                    </div>
                    <p className="text-sm">{entry.reason}</p>
                  </div>
                  <button onClick={() => removeEntry(entry.id)} className="text-muted-foreground hover:text-green-600 transition-colors flex-shrink-0 mt-0.5" title="Remove from blacklist"><X size={14} /></button>
                </div>
              </CardContent></Card>
            ))}
          </div>
        ) : (
          <Card className="border-border bg-white shadow-sm"><CardContent className="py-16 text-center"><ShieldBan className="w-10 h-10 text-muted-foreground mx-auto mb-3" /><p className="font-semibold text-muted-foreground">Blacklist is empty</p><p className="text-sm text-muted-foreground mt-1">Add users who should be permanently barred from the staff team.</p></CardContent></Card>
        )}
      </div>
    );
  }
  