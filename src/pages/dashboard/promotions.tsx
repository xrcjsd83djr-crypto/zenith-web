import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TrendingUp, TrendingDown, Plus, RefreshCw, Loader2, AlertCircle, CheckCircle } from "lucide-react";

interface Promotion { id: string; user_id: string; username: string; type: string; from_rank: string; to_rank: string; reason: string; promoted_by_name: string; created_at: string; }
interface StaffMember { user_id: string; username: string; rank: string; }

export default function PromotionsPage({ guildId }: { guildId: string }) {
  const [history, setHistory] = useState<Promotion[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [ranks, setRanks] = useState<any[]>([]);
  const [me, setMe] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ type: "ok"|"err"; text: string } | null>(null);
  const [form, setForm] = useState({ userId: '', username: '', fromRank: '', toRank: '', type: 'promotion', reason: '' });

  const showToast = (type: "ok"|"err", text: string) => { setToast({ type, text }); setTimeout(() => setToast(null), 4000); };

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [pRes, sRes, rRes, meRes] = await Promise.all([
        fetch(`/api/guilds/${guildId}/promotions`, { credentials: 'include' }),
        fetch(`/api/guilds/${guildId}/staff`, { credentials: 'include' }),
        fetch(`/api/guilds/${guildId}/ranks`, { credentials: 'include' }),
        fetch('/api/me', { credentials: 'include' }),
      ]);
      if (pRes.ok) setHistory(await pRes.json());
      if (sRes.ok) setStaff(await sRes.json());
      if (rRes.ok) setRanks(await rRes.json());
      if (meRes.ok) setMe(await meRes.json());
    } catch {}
    setLoading(false);
  }, [guildId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.userId || !form.toRank) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/guilds/${guildId}/promotions`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({ ...form, promotedBy: me?.id, promotedByName: me?.username }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      setOpen(false); setForm({ userId: '', username: '', fromRank: '', toRank: '', type: 'promotion', reason: '' });
      fetchAll(); showToast('ok', `${form.type === 'promotion' ? 'Promotion' : 'Demotion'} recorded.`);
    } catch (err: any) { showToast('err', err.message); }
    setSubmitting(false);
  };

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
          <h2 className="text-2xl font-extrabold tracking-tight flex items-center gap-2">
            <TrendingUp className="w-6 h-6" style={{ color: '#d4af37' }} /> Promotion History
          </h2>
          <p className="text-muted-foreground mt-0.5 text-sm">Track all rank changes — promotions, demotions, and transfers. Discord roles are automatically synced.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchAll} className="gap-1.5"><RefreshCw size={13} />Refresh</Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" style={{ background: 'linear-gradient(135deg,#d4af37,#ffd700)', color: '#5a3e10', border: 'none' }} className="gap-1.5 font-semibold">
                <Plus size={14} /> Record Change
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-white border-border max-w-md">
              <DialogHeader><DialogTitle className="flex items-center gap-2"><TrendingUp size={18} style={{ color: '#d4af37' }} />Record Rank Change</DialogTitle></DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 mt-2">
                <div className="space-y-1.5">
                  <Label className="font-semibold">Type</Label>
                  <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                    <SelectTrigger className="bg-white border-border"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-white border-border">
                      <SelectItem value="promotion">📈 Promotion</SelectItem>
                      <SelectItem value="demotion">📉 Demotion</SelectItem>
                      <SelectItem value="transfer">🔄 Transfer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="font-semibold">Staff Member</Label>
                  <Select value={form.userId} onValueChange={v => { const m = staff.find(x => x.user_id === v); setForm(f => ({ ...f, userId: v, username: m?.username || v, fromRank: m?.rank || '' })); }}>
                    <SelectTrigger className="bg-white border-border"><SelectValue placeholder="Select member" /></SelectTrigger>
                    <SelectContent className="bg-white border-border max-h-52">
                      {staff.map(m => <SelectItem key={m.user_id} value={m.user_id}>{m.username} ({m.rank || 'No rank'})</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="font-semibold text-xs">From Rank</Label>
                    <Input value={form.fromRank} onChange={e => setForm(f => ({ ...f, fromRank: e.target.value }))} placeholder="Current rank" className="bg-white border-border text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="font-semibold text-xs">To Rank</Label>
                    {ranks.length > 0 ? (
                      <Select value={form.toRank} onValueChange={v => setForm(f => ({ ...f, toRank: v }))}>
                        <SelectTrigger className="bg-white border-border text-sm"><SelectValue placeholder="New rank" /></SelectTrigger>
                        <SelectContent className="bg-white border-border">{ranks.map(r => <SelectItem key={r.id} value={r.name}>{r.name}</SelectItem>)}</SelectContent>
                      </Select>
                    ) : (
                      <Input value={form.toRank} onChange={e => setForm(f => ({ ...f, toRank: e.target.value }))} placeholder="New rank" className="bg-white border-border text-sm" required />
                    )}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="font-semibold">Reason (optional)</Label>
                  <Textarea value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} placeholder="Why was this rank change made?" className="bg-white border-border min-h-[70px]" />
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={submitting || !form.userId || !form.toRank} style={{ background: 'linear-gradient(135deg,#d4af37,#ffd700)', color: '#5a3e10', border: 'none' }}>
                    {submitting ? <><Loader2 size={13} className="animate-spin mr-1" />Recording...</> : "Record Change"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Promotions', val: history.filter(h => h.type === 'promotion').length, color: 'text-green-600' },
          { label: 'Demotions', val: history.filter(h => h.type === 'demotion').length, color: 'text-red-500' },
          { label: 'Total Changes', val: history.length, color: 'text-foreground' },
        ].map(s => (
          <Card key={s.label} className="border-border bg-white shadow-sm">
            <CardContent className="p-4"><div className={`text-2xl font-extrabold ${s.color}`}>{s.val}</div><div className="text-xs text-muted-foreground font-medium mt-0.5">{s.label}</div></CardContent>
          </Card>
        ))}
      </div>

      {history.length === 0 ? (
        <Card className="border-border bg-white shadow-sm"><CardContent className="py-16 text-center"><TrendingUp className="w-10 h-10 text-muted-foreground mx-auto mb-3" /><p className="font-semibold text-muted-foreground">No rank changes yet</p><p className="text-sm text-muted-foreground mt-1">Record a promotion or demotion to start tracking rank history.</p></CardContent></Card>
      ) : (
        <div className="space-y-2">
          {history.map(h => {
            const isPromo = h.type === 'promotion';
            const isDemotion = h.type === 'demotion';
            return (
              <Card key={h.id} className="border-border bg-white shadow-sm">
                <CardContent className="p-4 flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${isPromo ? 'bg-green-100' : isDemotion ? 'bg-red-100' : 'bg-blue-100'}`}>
                    {isPromo ? <TrendingUp size={15} className="text-green-600" /> : isDemotion ? <TrendingDown size={15} className="text-red-500" /> : <TrendingUp size={15} className="text-blue-500" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm">{h.username}</span>
                      <Badge className={`text-[10px] border ${isPromo ? 'bg-green-50 text-green-700 border-green-200' : isDemotion ? 'bg-red-50 text-red-700 border-red-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>{h.type}</Badge>
                      <span className="text-xs text-muted-foreground">{new Date(h.created_at).toLocaleDateString()}</span>
                    </div>
                    <div className="text-sm mt-0.5 text-muted-foreground">{h.from_rank || '—'} → <strong className="text-foreground">{h.to_rank}</strong></div>
                    {h.reason && <p className="text-xs text-muted-foreground mt-1">{h.reason}</p>}
                    {h.promoted_by_name && <p className="text-[11px] text-muted-foreground mt-0.5">By {h.promoted_by_name}</p>}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
