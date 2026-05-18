import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Star, Plus, RefreshCw, AlertCircle, CheckCircle, Loader2, Trophy } from "lucide-react";

interface Commendation { id: string; target_username: string; given_by_username: string; reason: string; created_at: string; }
interface LBEntry { target_user_id: string; target_username: string; count: string; }

export default function CommendationsPage({ guildId }: { guildId: string }) {
  const [items, setItems] = useState<Commendation[]>([]);
  const [leaderboard, setLeaderboard] = useState<LBEntry[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [me, setMe] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ targetUserId: '', targetUsername: '', reason: '' });
  const [toast, setToast] = useState<{ type: "ok"|"err"; text: string } | null>(null);

  const showToast = (type: "ok"|"err", text: string) => { setToast({ type, text }); setTimeout(() => setToast(null), 4000); };

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [cRes, lbRes, sRes, meRes] = await Promise.all([
        fetch(`/api/guilds/${guildId}/commendations`, { credentials: 'include' }),
        fetch(`/api/guilds/${guildId}/commendations/leaderboard`, { credentials: 'include' }),
        fetch(`/api/guilds/${guildId}/staff`, { credentials: 'include' }),
        fetch('/api/me', { credentials: 'include' }),
      ]);
      if (cRes.ok) setItems(await cRes.json());
      if (lbRes.ok) setLeaderboard(await lbRes.json());
      if (sRes.ok) setStaff(await sRes.json());
      if (meRes.ok) setMe(await meRes.json());
    } catch {}
    setLoading(false);
  }, [guildId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.targetUserId || !form.reason.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/guilds/${guildId}/commendations`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({ ...form, givenById: me?.id, givenByUsername: me?.username }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      setOpen(false); setForm({ targetUserId: '', targetUsername: '', reason: '' });
      fetchAll(); showToast('ok', 'Commendation issued! A notification was sent to the logs channel.');
    } catch (err: any) { showToast('err', err.message); }
    setSubmitting(false);
  };

  const medals = ['🥇', '🥈', '🥉'];
  if (loading) return <div className="flex justify-center py-20"><div className="w-7 h-7 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#d4af37', borderTopColor: 'transparent' }} /></div>;

  return (
    <div className="space-y-5 max-w-3xl">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium flex items-center gap-2 ${toast.type === 'ok' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {toast.type === 'ok' ? <CheckCircle size={15} /> : <AlertCircle size={15} />} {toast.text}
        </div>
      )}

      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight flex items-center gap-2"><Star className="w-6 h-6" style={{ color: '#d4af37' }} />Commendations</h2>
          <p className="text-muted-foreground mt-0.5 text-sm">Recognize outstanding staff performance. Commendations are logged to your audit channel and tracked on the leaderboard.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchAll} className="gap-1.5"><RefreshCw size={13} />Refresh</Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" style={{ background: 'linear-gradient(135deg,#d4af37,#ffd700)', color: '#5a3e10', border: 'none' }} className="gap-1.5 font-semibold">
                <Plus size={14} /> Issue Commendation
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-white border-border max-w-md">
              <DialogHeader><DialogTitle className="flex items-center gap-2"><Star size={18} style={{ color: '#d4af37' }} />Issue Commendation</DialogTitle></DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 mt-2">
                <div className="space-y-1.5">
                  <Label className="font-semibold">Staff Member</Label>
                  <Select value={form.targetUserId} onValueChange={v => { const m = staff.find(x => x.user_id === v); setForm(f => ({ ...f, targetUserId: v, targetUsername: m?.username || v })); }}>
                    <SelectTrigger className="bg-white border-border"><SelectValue placeholder="Who deserves recognition?" /></SelectTrigger>
                    <SelectContent className="bg-white border-border max-h-52">{staff.map(m => <SelectItem key={m.user_id} value={m.user_id}>{m.username}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="font-semibold">Reason</Label>
                  <Textarea value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} placeholder="What did they do exceptionally well? Be specific — this goes in their permanent record." className="bg-white border-border min-h-[100px]" required />
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={submitting || !form.targetUserId} style={{ background: 'linear-gradient(135deg,#d4af37,#ffd700)', color: '#5a3e10', border: 'none' }}>
                    {submitting ? <><Loader2 size={13} className="animate-spin mr-1" />Issuing...</> : "🌟 Issue Commendation"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[
          { label: 'Total Commendations', val: items.length, color: 'text-amber-600' },
          { label: 'Staff Recognized', val: leaderboard.length, color: 'text-green-600' },
          { label: 'This Month', val: items.filter(i => new Date(i.created_at).getMonth() === new Date().getMonth()).length, color: 'text-foreground' },
        ].map(s => (
          <Card key={s.label} className="border-border bg-white shadow-sm">
            <CardContent className="p-4"><div className={`text-2xl font-extrabold ${s.color}`}>{s.val}</div><div className="text-xs text-muted-foreground font-medium mt-0.5">{s.label}</div></CardContent>
          </Card>
        ))}
      </div>

      {leaderboard.length > 0 && (
        <Card className="border-border bg-white shadow-sm">
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Trophy size={14} style={{ color: '#d4af37' }} />Most Recognized</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {leaderboard.slice(0, 5).map((e, i) => (
              <div key={e.target_user_id} className="flex items-center gap-3 p-2.5 rounded-lg border border-border">
                <span className="text-lg w-6 text-center flex-shrink-0">{medals[i] ?? `${i+1}.`}</span>
                <span className="flex-1 font-semibold text-sm">{e.target_username}</span>
                <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-xs">🌟 {e.count}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {items.length === 0 ? (
        <Card className="border-border bg-white shadow-sm"><CardContent className="py-16 text-center"><Star className="w-10 h-10 text-muted-foreground mx-auto mb-3" /><p className="font-semibold text-muted-foreground">No commendations yet</p><p className="text-sm text-muted-foreground mt-1">Start recognizing your best staff members. Commendations build morale and track who's going above and beyond.</p></CardContent></Card>
      ) : (
        <div className="space-y-2">
          {items.map(c => (
            <Card key={c.id} className="border-border bg-white shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="text-lg">🌟</span>
                  <span className="font-bold text-sm">{c.target_username}</span>
                  <span className="text-xs text-muted-foreground">recognized by {c.given_by_username}</span>
                  <span className="text-xs text-muted-foreground ml-auto">{new Date(c.created_at).toLocaleDateString()}</span>
                </div>
                <p className="text-sm text-muted-foreground ml-7">{c.reason}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
