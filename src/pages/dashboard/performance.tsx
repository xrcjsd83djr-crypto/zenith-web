import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Star, Plus, RefreshCw, AlertCircle, CheckCircle, Loader2, ChevronDown, ChevronUp, User, Calendar, TrendingUp, Search } from "lucide-react";

interface Review {
  id: string; target_user_id: string; target_username: string;
  reviewer_id: string; reviewer_username: string;
  rating: number; strengths?: string; improvements?: string;
  notes?: string; period?: string; is_public: boolean; created_at: string;
}
interface Member { id: string; username: string; }

function StarRating({ rating, max = 5 }: { rating: number; max?: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: max }).map((_, i) => (
        <Star key={i} size={13} className={i < rating ? 'text-amber-400 fill-amber-400' : 'text-muted-foreground/30'} />
      ))}
    </div>
  );
}

function ReviewRow({ review }: { review: Review }) {
  const [open, setOpen] = useState(false);
  const ts = new Date(review.created_at);

  return (
    <div className="border border-border rounded-lg overflow-hidden mb-2">
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors text-left">
        <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ background: 'rgba(212,175,55,.15)', color: '#d4af37' }}>
          {review.target_username[0]?.toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm">{review.target_username}</span>
            <StarRating rating={review.rating} />
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">By {review.reviewer_username} • {ts.toLocaleDateString()}</p>
        </div>
        {open ? <ChevronUp size={14} className="text-muted-foreground flex-shrink-0" /> : <ChevronDown size={14} className="text-muted-foreground flex-shrink-0" />}
      </button>
      {open && (
        <div className="px-4 pb-4 border-t border-border bg-muted/20">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-3">
            <div><p className="text-xs text-muted-foreground font-medium">Staff Member</p><p className="text-sm font-semibold">{review.target_username}</p></div>
            <div><p className="text-xs text-muted-foreground font-medium">Reviewer</p><p className="text-sm">{review.reviewer_username}</p></div>
            <div><p className="text-xs text-muted-foreground font-medium">Rating</p><StarRating rating={review.rating} /><p className="text-xs text-muted-foreground mt-0.5">{review.rating}/5</p></div>
            <div><p className="text-xs text-muted-foreground font-medium">Date</p><p className="text-sm">{ts.toLocaleString()}</p></div>
            {review.period && <div><p className="text-xs text-muted-foreground font-medium">Period</p><p className="text-sm">{review.period}</p></div>}
            <div><p className="text-xs text-muted-foreground font-medium">Visibility</p><Badge className={`text-[10px] border ${review.is_public ? 'bg-green-100 text-green-700 border-green-200' : 'bg-gray-100 text-gray-600 border-gray-200'}`}>{review.is_public ? 'Public' : 'Private'}</Badge></div>
            {review.strengths && <div className="col-span-2 sm:col-span-3"><p className="text-xs text-muted-foreground font-medium flex items-center gap-1"><TrendingUp size={10} className="text-green-500" />Strengths</p><p className="text-sm">{review.strengths}</p></div>}
            {review.improvements && <div className="col-span-2 sm:col-span-3"><p className="text-xs text-muted-foreground font-medium">Areas for Improvement</p><p className="text-sm">{review.improvements}</p></div>}
            {review.notes && <div className="col-span-2 sm:col-span-3"><p className="text-xs text-muted-foreground font-medium">Additional Notes</p><p className="text-sm">{review.notes}</p></div>}
          </div>
        </div>
      )}
    </div>
  );
}

export default function PerformancePage({ guildId }: { guildId: string }) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [me, setMe] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ targetUserId: '', targetUsername: '', rating: '3', strengths: '', improvements: '', notes: '', period: '', isPublic: true });
  const [toast, setToast] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const showToast = (type: "ok" | "err", text: string) => { setToast({ type, text }); setTimeout(() => setToast(null), 4000); };

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [pRes, mRes, meRes] = await Promise.allSettled([
        fetch(`/api/guilds/${guildId}/performance`, { credentials: 'include' }),
        fetch(`/api/guilds/${guildId}/members`, { credentials: 'include' }),
        fetch('/api/me', { credentials: 'include' }),
      ]);
      if (pRes.status === 'fulfilled' && pRes.value.ok) { const d = await pRes.value.json().catch(() => []); setReviews(Array.isArray(d) ? d : []); }
      if (mRes.status === 'fulfilled' && mRes.value.ok) { const d = await mRes.value.json().catch(() => []); setMembers(Array.isArray(d) ? d : []); }
      if (meRes.status === 'fulfilled' && meRes.value.ok) setMe(await meRes.value.json().catch(() => null));
    } catch {}
    setLoading(false);
  }, [guildId]);
  useEffect(() => { fetchAll(); }, [fetchAll]);

  const filtered = reviews.filter(r => !search || r.target_username.toLowerCase().includes(search.toLowerCase()) || r.reviewer_username.toLowerCase().includes(search.toLowerCase()));
  const avgRating = reviews.length > 0 ? reviews.reduce((a, r) => a + r.rating, 0) / reviews.length : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.targetUserId || !form.rating) return showToast("err", "Select a staff member and rating.");
    setSubmitting(true);
    try {
      const res = await fetch(`/api/guilds/${guildId}/performance`, {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetUserId: form.targetUserId,
          targetUsername: form.targetUsername,
          rating: parseInt(form.rating),
          strengths: form.strengths || null,
          improvements: form.improvements || null,
          notes: form.notes || null,
          period: form.period || null,
          isPublic: form.isPublic,
          reviewerId: me?.id,
          reviewerUsername: me?.username,
        }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((d as any).error || 'Failed to submit review');
      showToast("ok", `Review submitted for ${form.targetUsername}!`);
      setOpen(false);
      setForm({ targetUserId: '', targetUsername: '', rating: '3', strengths: '', improvements: '', notes: '', period: '', isPublic: true });
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
            <Star className="w-6 h-6 text-amber-500" />Performance Reviews
          </h2>
          <p className="text-muted-foreground mt-0.5 text-sm">{reviews.length} reviews • click any to expand full details</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchAll} className="gap-1.5"><RefreshCw size={13} />Refresh</Button>
          <Button size="sm" onClick={() => setOpen(true)} className="gap-1.5" style={{ background: '#d4af37', color: '#000' }}><Plus size={13} />Write Review</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Card><CardContent className="p-4"><p className="text-2xl font-bold">{reviews.length}</p><p className="text-xs text-muted-foreground mt-0.5">Total Reviews</p></CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-2"><p className="text-2xl font-bold text-amber-500">{avgRating.toFixed(1)}</p><StarRating rating={Math.round(avgRating)} /></div>
          <p className="text-xs text-muted-foreground mt-0.5">Average Rating</p>
        </CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-2xl font-bold">{new Set(reviews.map(r => r.target_user_id)).size}</p><p className="text-xs text-muted-foreground mt-0.5">Staff Reviewed</p></CardContent></Card>
      </div>

      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search reviews by staff or reviewer..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9 text-sm" />
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="w-7 h-7 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#d4af37', borderTopColor: 'transparent' }} /></div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground text-sm">
          <Star size={32} className="mx-auto mb-2 text-muted-foreground/40" />
          No reviews yet. Write the first performance review above.
        </CardContent></Card>
      ) : (
        <div>{filtered.map(r => <ReviewRow key={r.id} review={r} />)}</div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Star size={18} className="text-amber-500" />Write Performance Review</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-3 mt-2">
            <div className="space-y-1.5">
              <Label>Staff Member *</Label>
              <Select value={form.targetUserId} onValueChange={v => { const m = members.find(m => m.id === v); setForm(f => ({ ...f, targetUserId: v, targetUsername: m?.username || '' })); }}>
                <SelectTrigger><SelectValue placeholder="Select member" /></SelectTrigger>
                <SelectContent>{members.map(m => <SelectItem key={m.id} value={m.id}>{m.username}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Overall Rating *</Label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map(n => (
                  <button key={n} type="button" onClick={() => setForm(f => ({ ...f, rating: String(n) }))} className={`flex-1 h-9 rounded-md border text-sm font-medium transition-colors ${parseInt(form.rating) === n ? 'border-amber-400 bg-amber-50 text-amber-700' : 'border-border hover:border-amber-200'}`}>
                    {n}{'⭐'.repeat(n).slice(0, n)}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Review Period</Label>
                <Input value={form.period} onChange={e => setForm(f => ({ ...f, period: e.target.value }))} placeholder="e.g. Q1 2026, May 2026" />
              </div>
              <div className="space-y-1.5">
                <Label>Visibility</Label>
                <Select value={form.isPublic ? 'public' : 'private'} onValueChange={v => setForm(f => ({ ...f, isPublic: v === 'public' }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="public">Public (staff can see)</SelectItem><SelectItem value="private">Private (management only)</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5"><Label>Strengths</Label><Textarea value={form.strengths} onChange={e => setForm(f => ({ ...f, strengths: e.target.value }))} placeholder="What does this staff member do well?" rows={2} /></div>
            <div className="space-y-1.5"><Label>Areas for Improvement</Label><Textarea value={form.improvements} onChange={e => setForm(f => ({ ...f, improvements: e.target.value }))} placeholder="What could they work on?" rows={2} /></div>
            <div className="space-y-1.5"><Label>Additional Notes</Label><Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Any other comments..." rows={2} /></div>
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={submitting} style={{ background: '#d4af37', color: '#000' }}>
                {submitting ? <><Loader2 size={14} className="animate-spin mr-1.5" />Submitting…</> : "Submit Review"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
