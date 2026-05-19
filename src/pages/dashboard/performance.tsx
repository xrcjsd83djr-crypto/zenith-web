import { useState, useEffect, useCallback } from "react";
  import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
  import { Button } from "@/components/ui/button";
  import { Badge } from "@/components/ui/badge";
  import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
  import { Label } from "@/components/ui/label";
  import { Textarea } from "@/components/ui/textarea";
  import { Input } from "@/components/ui/input";
  import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
  import { Star, RefreshCw, Plus, AlertCircle, CheckCircle, Loader2, ChevronDown, ChevronUp, Trophy } from "lucide-react";

  interface Review { id: string; target_user_id: string; target_username: string; reviewer_id: string; reviewer_username: string; rating: number; strengths?: string; improvements?: string; notes?: string; period?: string; created_at: string; }
  interface StaffMember { user_id: string; username: string; }

  function StarRating({ rating }: { rating: number }) {
    return <div className="flex gap-0.5">{[1,2,3,4,5].map(i => <Star key={i} size={14} className={i<=rating?'text-amber-400 fill-amber-400':'text-gray-300'}/>)}</div>;
  }

  function ReviewCard({ r }: { r: Review }) {
    const [open, setOpen] = useState(false);
    return (
      <div className="border border-border rounded-lg overflow-hidden mb-2">
        <button onClick={() => setOpen(o=>!o)} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors text-left">
          <StarRating rating={r.rating}/>
          <div className="flex-1 min-w-0">
            <span className="font-semibold text-sm">{r.target_username}</span>
            {r.period && <span className="text-muted-foreground text-xs ml-2">({r.period})</span>}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-muted-foreground text-xs">{new Date(r.created_at).toLocaleDateString()}</span>
            {open?<ChevronUp size={14} className="text-muted-foreground"/>:<ChevronDown size={14} className="text-muted-foreground"/>}
          </div>
        </button>
        {open && (
          <div className="px-4 pb-4 border-t bg-muted/20">
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div><p className="text-xs text-muted-foreground font-medium">Staff Member</p><p className="text-sm font-semibold">{r.target_username}</p></div>
              <div><p className="text-xs text-muted-foreground font-medium">Reviewed By</p><p className="text-sm">{r.reviewer_username}</p></div>
              <div><p className="text-xs text-muted-foreground font-medium">Rating</p><StarRating rating={r.rating}/></div>
              {r.period && <div><p className="text-xs text-muted-foreground font-medium">Period</p><p className="text-sm">{r.period}</p></div>}
              <div><p className="text-xs text-muted-foreground font-medium">Date</p><p className="text-sm">{new Date(r.created_at).toLocaleString()}</p></div>
              {r.strengths && <div className="col-span-2"><p className="text-xs text-muted-foreground font-medium">Strengths</p><p className="text-sm text-green-700">{r.strengths}</p></div>}
              {r.improvements && <div className="col-span-2"><p className="text-xs text-muted-foreground font-medium">Areas to Improve</p><p className="text-sm text-orange-700">{r.improvements}</p></div>}
              {r.notes && <div className="col-span-2"><p className="text-xs text-muted-foreground font-medium">Additional Notes</p><p className="text-sm">{r.notes}</p></div>}
            </div>
          </div>
        )}
      </div>
    );
  }

  export default function PerformancePage({ guildId }: { guildId: string }) {
    const [reviews, setReviews] = useState<Review[]>([]);
    const [staff, setStaff] = useState<StaffMember[]>([]);
    const [me, setMe] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [open, setOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [form, setForm] = useState({ targetUserId: '', targetUsername: '', rating: 3, strengths: '', improvements: '', notes: '', period: '' });
    const [toast, setToast] = useState<{ type: "ok"|"err"; text: string } | null>(null);
    const showToast = (type: "ok"|"err", text: string) => { setToast({ type, text }); setTimeout(() => setToast(null), 4000); };

    const fetchAll = useCallback(async () => {
      setLoading(true);
      try {
        const [rRes, sRes, meRes] = await Promise.all([
          fetch(`/api/guilds/${guildId}/performance`, { credentials: 'include' }),
          fetch(`/api/guilds/${guildId}/staff`, { credentials: 'include' }),
          fetch('/api/me', { credentials: 'include' }),
        ]);
        if (rRes.ok) setReviews(await rRes.json());
        if (sRes.ok) { const s = await sRes.json(); setStaff(s.map((m: any) => ({ user_id: m.user_id, username: m.username }))); }
        if (meRes.ok) setMe(await meRes.json());
      } catch {}
      setLoading(false);
    }, [guildId]);
    useEffect(() => { fetchAll(); }, [fetchAll]);

    const avgRating = reviews.length ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : '—';

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!form.targetUserId || form.rating < 1) return showToast("err", "Select a staff member and rating.");
      setSubmitting(true);
      try {
        const res = await fetch(`/api/guilds/${guildId}/performance`, {
          method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ targetUserId: form.targetUserId, targetUsername: form.targetUsername, reviewerId: me?.id, reviewerUsername: me?.username, rating: form.rating, strengths: form.strengths, improvements: form.improvements, notes: form.notes, period: form.period }),
        });
        const d = await res.json();
        if (!res.ok) throw new Error(d.error || 'Failed to submit review');
        showToast("ok", "Review submitted!");
        setOpen(false); setForm({ targetUserId:'',targetUsername:'',rating:3,strengths:'',improvements:'',notes:'',period:'' }); fetchAll();
      } catch (err: any) { showToast("err", err.message); }
      setSubmitting(false);
    };

    return (
      <div className="space-y-5 max-w-4xl">
        {toast && <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm font-medium ${toast.type==='ok'?'bg-green-50 text-green-800 border border-green-200':'bg-red-50 text-red-800 border border-red-200'}`}>{toast.type==='ok'?<CheckCircle size={15}/>:<AlertCircle size={15}/>}{toast.text}</div>}
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight flex items-center gap-2"><Trophy className="w-6 h-6" style={{color:'#d4af37'}}/>Performance Reviews</h2>
            <p className="text-muted-foreground mt-0.5 text-sm">{reviews.length} reviews — avg rating: {avgRating} ★ — click to expand</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchAll} className="gap-1.5"><RefreshCw size={13}/>Refresh</Button>
            <Button size="sm" onClick={() => setOpen(true)} className="gap-1.5" style={{background:'#d4af37',color:'#000'}}><Plus size={13}/>New Review</Button>
          </div>
        </div>
        {reviews.length > 0 && (
          <div className="grid grid-cols-3 gap-3">
            <Card><CardContent className="p-3 text-center"><p className="text-2xl font-bold">{reviews.length}</p><p className="text-xs text-muted-foreground">Total Reviews</p></CardContent></Card>
            <Card><CardContent className="p-3 text-center"><p className="text-2xl font-bold">{avgRating}</p><p className="text-xs text-muted-foreground">Avg Rating</p></CardContent></Card>
            <Card><CardContent className="p-3 text-center"><p className="text-2xl font-bold">{reviews.filter(r=>r.rating>=4).length}</p><p className="text-xs text-muted-foreground">High Rated</p></CardContent></Card>
          </div>
        )}
        {loading ? <div className="flex justify-center py-16"><div className="w-7 h-7 rounded-full border-2 border-t-transparent animate-spin" style={{borderColor:'#d4af37',borderTopColor:'transparent'}}/></div>
          : reviews.length === 0 ? <Card><CardContent className="py-12 text-center text-muted-foreground text-sm">No reviews yet. Submit the first performance review above.</CardContent></Card>
          : <div>{reviews.map(r => <ReviewCard key={r.id} r={r}/>)}</div>}
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>New Performance Review</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-2">
              <div className="space-y-1.5">
                <Label>Staff Member *</Label>
                <Select value={form.targetUserId} onValueChange={v => { const m=staff.find(s=>s.user_id===v); setForm(f=>({...f,targetUserId:v,targetUsername:m?.username||''})); }}>
                  <SelectTrigger><SelectValue placeholder="Select staff member"/></SelectTrigger>
                  <SelectContent>{staff.map(m=><SelectItem key={m.user_id} value={m.user_id}>{m.username}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Rating (1–5) *</Label>
                <div className="flex gap-2">{[1,2,3,4,5].map(i=>(
                  <button key={i} type="button" onClick={()=>setForm(f=>({...f,rating:i}))} className="p-1">
                    <Star size={24} className={i<=form.rating?'text-amber-400 fill-amber-400':'text-gray-300'}/>
                  </button>
                ))}</div>
              </div>
              <div className="space-y-1.5"><Label>Period (optional)</Label><Input value={form.period} onChange={e=>setForm(f=>({...f,period:e.target.value}))} placeholder="e.g. May 2026, Q2 2026"/></div>
              <div className="space-y-1.5"><Label>Strengths</Label><Textarea value={form.strengths} onChange={e=>setForm(f=>({...f,strengths:e.target.value}))} placeholder="What does this staff member do well?" rows={3}/></div>
              <div className="space-y-1.5"><Label>Areas to Improve</Label><Textarea value={form.improvements} onChange={e=>setForm(f=>({...f,improvements:e.target.value}))} placeholder="What could be improved?" rows={3}/></div>
              <div className="space-y-1.5"><Label>Additional Notes</Label><Textarea value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} placeholder="Any other comments..." rows={2}/></div>
              <div className="flex justify-end gap-2 pt-1">
                <Button type="button" variant="outline" onClick={()=>setOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={submitting} style={{background:'#d4af37',color:'#000'}}>
                  {submitting?<><Loader2 size={14} className="animate-spin mr-1.5"/>Submitting…</>:<><Star size={14} className="mr-1.5"/>Submit Review</>}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    );
  }
  