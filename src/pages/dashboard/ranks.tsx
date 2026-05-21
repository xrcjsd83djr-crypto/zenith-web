import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { BadgeCent, Plus, RefreshCw, AlertCircle, CheckCircle, Loader2, Trash2, Star, GripVertical } from "lucide-react";

interface Rank { id: string; name: string; level?: number; color?: string; discord_role_id?: string; is_default?: boolean; created_at: string; }

export default function RanksPage({ guildId }: { guildId: string }) {
  const [ranks, setRanks] = useState<Rank[]>([]);
  const [isPremium, setIsPremium] = useState(false);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ name: '', level: '', color: '#5865F2', discord_role_id: '', is_default: false });
  const [toast, setToast] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const showToast = (type: "ok" | "err", text: string) => { setToast({ type, text }); setTimeout(() => setToast(null), 4000); };

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [rRes, pRes] = await Promise.allSettled([
        fetch(`/api/guilds/${guildId}/ranks`, { credentials: 'include' }),
        fetch(`/api/guilds/${guildId}/premium`, { credentials: 'include' }),
      ]);
      if (rRes.status === 'fulfilled' && rRes.value.ok) { const d = await rRes.value.json().catch(() => []); setRanks(Array.isArray(d) ? d.sort((a: Rank, b: Rank) => (b.level || 0) - (a.level || 0)) : []); }
      if (pRes.status === 'fulfilled' && pRes.value.ok) { const p = await pRes.value.json().catch(() => ({})); setIsPremium(!!p.isPremium); }
    } catch {}
    setLoading(false);
  }, [guildId]);
  useEffect(() => { fetchAll(); }, [fetchAll]);

  const maxRanks = isPremium ? Infinity : 5;
  const canAdd = ranks.length < maxRanks;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return showToast("err", "Rank name is required.");
    if (!canAdd) return showToast("err", "Free plan is limited to 5 ranks. Upgrade to Premium for unlimited ranks.");
    setSubmitting(true);
    try {
      const res = await fetch(`/api/guilds/${guildId}/ranks`, {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.name, level: form.level ? parseInt(form.level) : 0, color: form.color, discordRoleId: form.discord_role_id || null, isDefault: form.is_default }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((d as any).error || 'Failed');
      showToast("ok", `Rank "${form.name}" created!`);
      setOpen(false);
      setForm({ name: '', level: '', color: '#5865F2', discord_role_id: '', is_default: false });
      fetchAll();
    } catch (err: any) { showToast("err", err.message); }
    setSubmitting(false);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete rank "${name}"? Staff with this rank will need to be reassigned.`)) return;
    try {
      await fetch(`/api/guilds/${guildId}/ranks/${id}`, { method: 'DELETE', credentials: 'include' });
      showToast("ok", `Rank "${name}" deleted.`);
      fetchAll();
    } catch { showToast("err", "Failed to delete rank."); }
  };

  return (
    <div className="space-y-5 max-w-3xl">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm font-medium ${toast.type === 'ok' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
          {toast.type === 'ok' ? <CheckCircle size={15} /> : <AlertCircle size={15} />}{toast.text}
        </div>
      )}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight flex items-center gap-2">
            <BadgeCent className="w-6 h-6" style={{ color: '#d4af37' }} />Ranks
          </h2>
          <p className="text-muted-foreground mt-0.5 text-sm">
            {ranks.length}{isPremium ? '' : ` of 5`} ranks configured
            {!isPremium && <span className="ml-1 text-amber-600">(Free: 5 max)</span>}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchAll} className="gap-1.5"><RefreshCw size={13} />Refresh</Button>
          <Button size="sm" onClick={() => setOpen(true)} disabled={!canAdd} className="gap-1.5" style={{ background: '#d4af37', color: '#000' }}>
            <Plus size={13} />New Rank
          </Button>
        </div>
      </div>

      {!isPremium && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium">Rank Slots</p>
              <span className="text-sm font-bold">{ranks.length} / 5</span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div className="h-full rounded-full transition-all" style={{ width: `${Math.min((ranks.length / 5) * 100, 100)}%`, background: ranks.length >= 5 ? '#ef4444' : '#d4af37' }} />
            </div>
            {ranks.length >= 5 && (
              <p className="text-xs text-amber-700 mt-2 flex items-center gap-1">
                <Star size={11} />Upgrade to Premium for unlimited ranks.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-7 h-7 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#d4af37', borderTopColor: 'transparent' }} />
        </div>
      ) : ranks.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground text-sm">
          <BadgeCent size={32} className="mx-auto mb-2 text-muted-foreground/40" />
          No ranks yet. Create your first rank using the button above.
        </CardContent></Card>
      ) : (
        <div className="space-y-2">
          {ranks.map((r, i) => (
            <Card key={r.id} className="group">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: r.color || '#5865F2' }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm">{r.name}</span>
                    {r.is_default && <Badge className="text-[10px] bg-blue-100 text-blue-700 border border-blue-200">Default</Badge>}
                    {r.level !== undefined && r.level !== 0 && <span className="text-xs text-muted-foreground">Level {r.level}</span>}
                  </div>
                  {r.discord_role_id && <p className="text-xs text-muted-foreground font-mono mt-0.5">Role: {r.discord_role_id}</p>}
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-xs text-muted-foreground mr-2">#{ranks.length - i}</span>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(r.id, r.name)} className="text-red-400 hover:text-red-600 hover:bg-red-50 h-7 w-7 p-0">
                    <Trash2 size={13} />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!isPremium && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardContent className="p-4 flex items-start gap-3">
            <Star className="text-amber-500 flex-shrink-0 mt-0.5" size={18} />
            <div>
              <p className="font-semibold text-sm text-amber-800">Premium: Unlimited Ranks</p>
              <p className="text-xs text-amber-700 mt-0.5">Free plan is limited to 5 ranks. Premium servers can create unlimited ranks to match any organizational structure.</p>
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><BadgeCent size={18} />New Rank</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-3 mt-2">
            <div className="space-y-1.5">
              <Label>Rank Name *</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Senior Officer" required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Level (hierarchy)</Label>
                <Input type="number" value={form.level} onChange={e => setForm(f => ({ ...f, level: e.target.value }))} placeholder="0 = lowest" min={0} />
              </div>
              <div className="space-y-1.5">
                <Label>Color</Label>
                <div className="flex gap-2">
                  <input type="color" value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} className="h-9 w-12 cursor-pointer rounded border border-input" />
                  <Input value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} className="flex-1 text-sm font-mono" />
                </div>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Discord Role ID (optional)</Label>
              <Input value={form.discord_role_id} onChange={e => setForm(f => ({ ...f, discord_role_id: e.target.value }))} placeholder="18-digit role ID" />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={submitting} style={{ background: '#d4af37', color: '#000' }}>
                {submitting ? <><Loader2 size={14} className="animate-spin mr-1.5" />Creating…</> : "Create Rank"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
