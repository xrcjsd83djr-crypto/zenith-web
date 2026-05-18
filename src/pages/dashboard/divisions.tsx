import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Layers, Plus, RefreshCw, Loader2, AlertCircle, CheckCircle, Star, Trash2 } from "lucide-react";

interface Division { id: string; name: string; description: string; discord_role_id: string; color: string; }

export default function DivisionsPage({ guildId }: { guildId: string }) {
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [isPremium, setIsPremium] = useState(false);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ type: "ok"|"err"; text: string } | null>(null);
  const [form, setForm] = useState({ name: '', description: '', discordRoleId: '', color: '#5865F2' });
  const [error, setError] = useState('');

  const showToast = (type: "ok"|"err", text: string) => { setToast({ type, text }); setTimeout(() => setToast(null), 4000); };

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [dRes, pRes] = await Promise.all([
        fetch(`/api/guilds/${guildId}/divisions`, { credentials: 'include' }),
        fetch(`/api/guilds/${guildId}/is-premium`, { credentials: 'include' }),
      ]);
      if (dRes.ok) setDivisions(await dRes.json());
      if (pRes.ok) { const p = await pRes.json(); setIsPremium(p.isPremium); }
    } catch {}
    setLoading(false);
  }, [guildId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSubmitting(true); setError('');
    try {
      const res = await fetch(`/api/guilds/${guildId}/divisions`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify(form),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      setOpen(false); setForm({ name: '', description: '', discordRoleId: '', color: '#5865F2' });
      fetchAll(); showToast('ok', 'Division created!');
    } catch (err: any) { setError(err.message); }
    setSubmitting(false);
  };

  const deleteDiv = async (id: string, name: string) => {
    if (!confirm(`Delete division "${name}"?`)) return;
    try {
      await fetch(`/api/guilds/${guildId}/divisions/${id}`, { method: 'DELETE', credentials: 'include' });
      setDivisions(d => d.filter(x => x.id !== id));
      showToast('ok', 'Division deleted.');
    } catch { showToast('err', 'Failed to delete.'); }
  };

  const FREE_LIMIT = 3;
  const atLimit = !isPremium && divisions.length >= FREE_LIMIT;

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
          <h2 className="text-2xl font-extrabold tracking-tight flex items-center gap-2"><Layers className="w-6 h-6" style={{ color: '#d4af37' }} />Divisions</h2>
          <p className="text-muted-foreground mt-0.5 text-sm">
            Organize staff into departments or units. {isPremium ? 'Unlimited divisions (Premium).' : `Free plan: ${divisions.length}/${FREE_LIMIT} divisions used.`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchAll} className="gap-1.5"><RefreshCw size={13} />Refresh</Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" disabled={atLimit} style={!atLimit ? { background: 'linear-gradient(135deg,#d4af37,#ffd700)', color: '#5a3e10', border: 'none' } : {}} className="gap-1.5 font-semibold">
                <Plus size={14} /> New Division
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-white border-border max-w-md">
              <DialogHeader><DialogTitle className="flex items-center gap-2"><Layers size={18} style={{ color: '#d4af37' }} />Create Division</DialogTitle></DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 mt-2">
                <div className="grid grid-cols-4 gap-3">
                  <div className="col-span-3 space-y-1.5">
                    <Label className="font-semibold">Name</Label>
                    <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Traffic Division" className="bg-white border-border" required />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="font-semibold">Color</Label>
                    <input type="color" value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} className="w-full h-9 rounded-lg border border-border cursor-pointer" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="font-semibold">Description (optional)</Label>
                  <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="What does this division handle?" className="bg-white border-border min-h-[70px]" />
                </div>
                <div className="space-y-1.5">
                  <Label className="font-semibold">Discord Role ID (optional)</Label>
                  <Input value={form.discordRoleId} onChange={e => setForm(f => ({ ...f, discordRoleId: e.target.value }))} placeholder="Role ID — auto-assigned when staff join" className="bg-white border-border font-mono text-sm" />
                </div>
                {error && <p className="text-red-600 text-sm flex items-center gap-1.5"><AlertCircle size={13} />{error}</p>}
                <div className="flex justify-end gap-2 pt-1">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={submitting} style={{ background: 'linear-gradient(135deg,#d4af37,#ffd700)', color: '#5a3e10', border: 'none' }}>
                    {submitting ? <><Loader2 size={13} className="animate-spin mr-1" />Creating...</> : "Create Division"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {atLimit && (
        <Card className="border-amber-200 bg-amber-50 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <Star size={18} style={{ color: '#d4af37' }} />
            <div>
              <p className="font-semibold text-amber-800 text-sm">Free plan limit reached ({FREE_LIMIT} divisions)</p>
              <p className="text-amber-700 text-xs">Upgrade to Zenith Premium for unlimited divisions, automatic Discord role sync, and more.</p>
            </div>
            <a href="/premium" className="ml-auto text-xs font-semibold px-3 py-1.5 rounded-lg text-white flex-shrink-0" style={{ background: 'linear-gradient(135deg,#d4af37,#ffd700)', color: '#5a3e10' }}>Upgrade</a>
          </CardContent>
        </Card>
      )}

      {divisions.length === 0 ? (
        <Card className="border-border bg-white shadow-sm"><CardContent className="py-16 text-center"><Layers className="w-10 h-10 text-muted-foreground mx-auto mb-3" /><p className="font-semibold text-muted-foreground">No divisions yet</p><p className="text-sm text-muted-foreground mt-1">Create divisions to organize staff into departments like Traffic, CID, or Patrol.</p></CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {divisions.map(d => (
            <Card key={d.id} className="border-border bg-white shadow-sm overflow-hidden">
              <div className="h-1.5" style={{ background: d.color }} />
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-sm">{d.name}</h3>
                    {d.description && <p className="text-xs text-muted-foreground mt-1">{d.description}</p>}
                    {d.discord_role_id && <Badge className="mt-2 bg-indigo-50 text-indigo-700 border-indigo-200 text-[10px]">Role linked</Badge>}
                  </div>
                  <button onClick={() => deleteDiv(d.id, d.name)} className="text-muted-foreground hover:text-red-500 transition-colors flex-shrink-0">
                    <Trash2 size={14} />
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
