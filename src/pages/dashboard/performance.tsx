import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Star, Plus, RefreshCw, Loader2, AlertCircle, CheckCircle, Trophy } from "lucide-react";

interface Review { id: string; target_user_id: string; target_username: string; reviewer_username: string; rating: number; comments: string; created_at: string; }
interface StaffMember { user_id: string; username: string; }
interface LBEntry { target_user_id: string; target_username: string; avg_rating: string; review_count: string; }

function Stars({ rating }: { rating: number }) {
  return <span>{Array.from({ length: 5 }, (_, i) => <span key={i} style={{ color: i < rating ? '#d4af37' : '#d1d5db' }}>★</span>)}</span>;
}

export default function PerformancePage({ guildId }: { guildId: string }) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [leaderboard, setLeaderboard] = useState<LBEntry[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [me, setMe] = useState<any>(null);
  const [isPremium, setIsPremium] = useState(false);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ type: "ok"|"err"; text: string } | null>(null);
  const [form, setForm] = useState({ targetUserId: '', targetUsername: '', rating: '5', comments: '' });
  const [error, setError] = useState('');

  const showToast = (type: "ok"|"err", text: string) => { setToast({ type, text }); setTimeout(() => setToast(null), 4000); };

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [rRes, lbRes, sRes, pRes, meRes] = await Promise.all([
        fetch(`/api/guilds/${guildId}/performance`, { credentials: 'include' }),
        fetch(`/api/guilds/${guildId}/performance/leaderboard`, { credentials: 'include' }),
        fetch(`/api/guilds/${guildId}/staff`, { credentials: 'include' }),
        fetch(`/api/guilds/${guildId}/is-premium`, { credentials: 'include' }),
        fetch('/api/me', { credentials: 'include' }),
      ]);
      if (rRes.ok) setReviews(await rRes.json());
      if (lbRes.ok) setLeaderboard(await lbRes.json());
      if (sRes.ok) setStaff(await sRes.json());
      if (pRes.ok) { const p = await pRes.json(); setIsPremium(p.isPremium); }
      if (meRes.ok) setMe(await meRes.json());
    } catch {}
    setLoading(false);
  }, [guildId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.targetUserId || !form.comments.trim()) return;
    setSubmitting(true); setError('');
    try {
      const res = await fetch(`/api/guilds/${guildId}/performance`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({ ...form, rating: parseInt(form.rating), reviewerId: me?.id, reviewerUsername: me?.username }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      setOpen(false); setForm({ targetUserId: '', targetUsername: '', rating: '5', comments: '' });
      fetchAll(); showToast('ok', 'Review submitted!');
    } catch (err: any) { setError(err.message); }
    setSubmitting(false);
  };

  const medals = ['🥇', '🥈', '🥉'];
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
          <h2 className="text-2xl font-extrabold tracking-tight flex items-center gap-2"><Star className="w-6 h-6" style={{ color: '#d4af37' }} />Performance Reviews</h2>
          <p className="text-muted-foreground mt-0.5 text-sm">{isPremium ? 'Unlimited reviews (Premium).' : 'Free: 3 reviews per staff member. Upgrade for unlimited.'}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchAll} className="gap-1.5"><RefreshCw size={13} />Refresh</Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" style={{ background: 'linear-gradient(135deg,#d4af37,#ffd700)', color: '#5a3e10', border: 'none' }} className="gap-1.5 font-semibold">
                <Plus size={14} /> Submit Review
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-white border-border max-w-md">
              <DialogHeader><DialogTitle className="flex items-center gap-2"><Star size={18} style={{ color: '#d4af37' }} />Submit Performance Review</DialogTitle></DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 mt-2">
                <div className="space-y-1.5">
                  <Label className="font-semibold">Staff Member</Label>
                  <Select value={form.targetUserId} onValueChange={v => { const m = staff.find(x => x.user_id === v); setForm(f => ({ ...f, targetUserId: v, targetUsername: m?.username || v })); }}>
                    <SelectTrigger className="bg-white border-border"><SelectValue placeholder="Select member" /></SelectTrigger>
                    <SelectContent className="bg-white border-border max-h-52">{staff.map(m => <SelectItem key={m.user_id} value={m.user_id}>{m.username}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="font-semibold">Rating</Label>
                  <Select value={form.rating} onValueChange={v => setForm(f => ({ ...f, rating: v }))}>
                    <SelectTrigger className="bg-white border-border"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-white border-border">
                      {[5,4,3,2,1].map(n => <SelectItem key={n} value={String(n)}>{'★'.repeat(n)}{'☆'.repeat(5-n)} ({n}/5)</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="font-semibold">Comments</Label>
                  <Textarea value={form.comments} onChange={e => setForm(f => ({ ...f, comments: e.target.value }))} placeholder="Detailed feedback about this staff member's performance..." className="bg-white border-border min-h-[90px]" required />
                </div>
                {error && <p className="text-red-600 text-sm flex items-center gap-1.5"><AlertCircle size={13} />{error}</p>}
                <div className="flex justify-end gap-2 pt-1">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={submitting || !form.targetUserId} style={{ background: 'linear-gradient(135deg,#d4af37,#ffd700)', color: '#5a3e10', border: 'none' }}>
                    {submitting ? <><Loader2 size={13} className="animate-spin mr-1" />Submitting...</> : "Submit Review"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Leaderboard */}
      {leaderboard.length > 0 && (
        <Card className="border-border bg-white shadow-sm">
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Trophy size={15} style={{ color: '#d4af37' }} />Top Performers</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {leaderboard.slice(0, 5).map((e, i) => (
              <div key={e.target_user_id} className="flex items-center gap-3 p-2 rounded-lg border border-border">
                <span className="text-lg w-6 text-center flex-shrink-0">{medals[i] ?? `${i+1}.`}</span>
                <div className="flex-1 min-w-0">
                  <span className="font-semibold text-sm">{e.target_username}</span>
                  <span className="text-xs text-muted-foreground ml-2">({e.review_count} reviews)</span>
                </div>
                <div className="flex-shrink-0 text-sm"><Stars rating={Math.round(parseFloat(e.avg_rating))} /> <span className="text-xs text-muted-foreground ml-1">{parseFloat(e.avg_rating).toFixed(1)}</span></div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* All reviews */}
      {reviews.length === 0 ? (
        <Card className="border-border bg-white shadow-sm"><CardContent className="py-16 text-center"><Star className="w-10 h-10 text-muted-foreground mx-auto mb-3" /><p className="font-semibold text-muted-foreground">No reviews yet</p><p className="text-sm text-muted-foreground mt-1">Submit performance reviews to track staff quality over time.</p></CardContent></Card>
      ) : (
        <div className="space-y-3">
          {reviews.map(r => (
            <Card key={r.id} className="border-border bg-white shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <span className="font-semibold text-sm">{r.target_username}</span>
                    <span className="text-xs text-muted-foreground ml-2">reviewed by {r.reviewer_username}</span>
                    <span className="text-xs text-muted-foreground ml-2">{new Date(r.created_at).toLocaleDateString()}</span>
                  </div>
                  <div className="flex-shrink-0"><Stars rating={r.rating} /></div>
                </div>
                <p className="text-sm text-muted-foreground">{r.comments}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
