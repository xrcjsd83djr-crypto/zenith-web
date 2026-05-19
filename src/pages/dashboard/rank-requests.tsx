import { useState, useEffect, useCallback } from "react";
  import { Card, CardContent } from "@/components/ui/card";
  import { Button } from "@/components/ui/button";
  import { Badge } from "@/components/ui/badge";
  import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
  import { Label } from "@/components/ui/label";
  import { Textarea } from "@/components/ui/textarea";
  import { Input } from "@/components/ui/input";
  import { TrendingUp, RefreshCw, CheckCircle, AlertCircle, Loader2, ChevronDown, ChevronUp, Clock, X } from "lucide-react";

  interface RankRequest { id: string; user_id: string; username: string; current_rank?: string; requested_rank: string; reason: string; evidence?: string; status: string; reviewer_id?: string; reviewer_username?: string; reviewer_notes?: string; created_at: string; reviewed_at?: string; }

  function StatusBadge({ status }: { status: string }) {
    const map: Record<string,string> = { pending:"bg-yellow-100 text-yellow-700 border-yellow-200", approved:"bg-green-100 text-green-700 border-green-200", denied:"bg-red-100 text-red-700 border-red-200" };
    return <Badge className={`${map[status]||'bg-gray-100 text-gray-600'} text-xs border`}>{status.charAt(0).toUpperCase()+status.slice(1)}</Badge>;
  }

  function RequestRow({ r, me, guildId, onRefresh }: { r: RankRequest; me: any; guildId: string; onRefresh: () => void }) {
    const [open, setOpen] = useState(false);
    const [reviewing, setReviewing] = useState(false);
    const [reviewForm, setReviewForm] = useState({ decision:'', notes:'' });
    const [reviewOpen, setReviewOpen] = useState(false);

    const handleReview = async (decision: string) => {
      setReviewing(true);
      try {
        const res = await fetch(`/api/guilds/${guildId}/rank-requests/${r.id}/review`, {
          method:'POST', credentials:'include', headers:{'Content-Type':'application/json'},
          body: JSON.stringify({ status: decision, reviewerNotes: reviewForm.notes, reviewerId: me?.id, reviewerUsername: me?.username }),
        });
        if (res.ok) { setReviewOpen(false); onRefresh(); }
      } catch {}
      setReviewing(false);
    };

    const ts = new Date(r.created_at);
    return (
      <div className="border border-border rounded-lg overflow-hidden mb-2">
        <button onClick={() => setOpen(o=>!o)} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors text-left">
          <StatusBadge status={r.status}/>
          <div className="flex-1 min-w-0">
            <span className="font-semibold text-sm">{r.username}</span>
            <span className="text-muted-foreground text-xs ml-2">{r.current_rank||'—'} → {r.requested_rank}</span>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-muted-foreground text-xs">{ts.toLocaleDateString()}</span>
            {open?<ChevronUp size={14} className="text-muted-foreground"/>:<ChevronDown size={14} className="text-muted-foreground"/>}
          </div>
        </button>
        {open && (
          <div className="px-4 pb-4 border-t bg-muted/20">
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div><p className="text-xs text-muted-foreground font-medium">Staff Member</p><p className="text-sm font-semibold">{r.username}</p></div>
              <div><p className="text-xs text-muted-foreground font-medium">Status</p><StatusBadge status={r.status}/></div>
              <div><p className="text-xs text-muted-foreground font-medium">Current Rank</p><p className="text-sm">{r.current_rank||'None'}</p></div>
              <div><p className="text-xs text-muted-foreground font-medium">Requested Rank</p><p className="text-sm font-semibold text-green-700">{r.requested_rank}</p></div>
              <div><p className="text-xs text-muted-foreground font-medium">Submitted</p><p className="text-sm">{ts.toLocaleString()}</p></div>
              {r.reviewer_username && <div><p className="text-xs text-muted-foreground font-medium">Reviewed By</p><p className="text-sm">{r.reviewer_username}</p></div>}
              <div className="col-span-2"><p className="text-xs text-muted-foreground font-medium">Reason</p><p className="text-sm">{r.reason}</p></div>
              {r.evidence && <div className="col-span-2"><p className="text-xs text-muted-foreground font-medium">Evidence</p><p className="text-sm break-all">{r.evidence}</p></div>}
              {r.reviewer_notes && <div className="col-span-2"><p className="text-xs text-muted-foreground font-medium">Review Notes</p><p className="text-sm">{r.reviewer_notes}</p></div>}
              {r.status === 'pending' && (
                <div className="col-span-2 pt-2">
                  {reviewOpen ? (
                    <div className="space-y-2">
                      <Textarea value={reviewForm.notes} onChange={e=>setReviewForm(f=>({...f,notes:e.target.value}))} placeholder="Review notes (optional)..." rows={2} className="text-sm"/>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={()=>handleReview('approved')} disabled={reviewing} className="bg-green-600 hover:bg-green-700 text-white flex-1 gap-1.5"><CheckCircle size={13}/>Approve</Button>
                        <Button size="sm" onClick={()=>handleReview('denied')} disabled={reviewing} variant="outline" className="text-red-600 border-red-200 hover:bg-red-50 flex-1 gap-1.5"><X size={13}/>Deny</Button>
                        <Button size="sm" variant="outline" onClick={()=>setReviewOpen(false)}>Cancel</Button>
                      </div>
                    </div>
                  ) : <Button size="sm" variant="outline" onClick={()=>setReviewOpen(true)} className="gap-1.5"><TrendingUp size={13}/>Review Request</Button>}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  export default function RankRequestsPage({ guildId }: { guildId: string }) {
    const [requests, setRequests] = useState<RankRequest[]>([]);
    const [me, setMe] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('pending');

    const fetchAll = useCallback(async () => {
      setLoading(true);
      try {
        const [rRes, meRes] = await Promise.all([
          fetch(`/api/guilds/${guildId}/rank-requests`, {credentials:'include'}),
          fetch('/api/me', {credentials:'include'}),
        ]);
        if (rRes.ok) setRequests(await rRes.json());
        if (meRes.ok) setMe(await meRes.json());
      } catch {}
      setLoading(false);
    }, [guildId]);
    useEffect(() => { fetchAll(); }, [fetchAll]);

    const pending = requests.filter(r=>r.status==='pending');
    const filtered = filter === 'all' ? requests : requests.filter(r=>r.status===filter);

    return (
      <div className="space-y-5 max-w-4xl">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight flex items-center gap-2"><TrendingUp className="w-6 h-6" style={{color:'#d4af37'}}/>Rank Requests</h2>
            <p className="text-muted-foreground mt-0.5 text-sm">{pending.length} pending • {requests.length} total — click to review</p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchAll} className="gap-1.5"><RefreshCw size={13}/>Refresh</Button>
        </div>
        <div className="flex gap-2">
          {['pending','approved','denied','all'].map(s=>(
            <Button key={s} variant={filter===s?"default":"outline"} size="sm" onClick={()=>setFilter(s)} className="capitalize text-xs" style={filter===s?{background:'#d4af37',color:'#000'}:{}}>{s}</Button>
          ))}
        </div>
        {loading ? <div className="flex justify-center py-16"><div className="w-7 h-7 rounded-full border-2 border-t-transparent animate-spin" style={{borderColor:'#d4af37',borderTopColor:'transparent'}}/></div>
          : filtered.length === 0 ? <Card><CardContent className="py-12 text-center text-muted-foreground text-sm">No {filter === 'all' ? '' : filter} rank requests.</CardContent></Card>
          : <div>{filtered.map(r=><RequestRow key={r.id} r={r} me={me} guildId={guildId} onRefresh={fetchAll}/>)}</div>}
      </div>
    );
  }
  