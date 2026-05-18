import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TrendingUp, Plus, RefreshCw, CheckCircle, XCircle, AlertCircle, Loader2, Clock } from "lucide-react";

interface RankRequest { id: string; user_id: string; username: string; current_rank: string | null; requested_rank: string; reason: string; status: string; reviewed_by_name: string | null; reviewed_at: string | null; created_at: string; }

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-700 border-amber-200',
    approved: 'bg-green-100 text-green-700 border-green-200',
    denied: 'bg-red-100 text-red-700 border-red-200',
  };
  const icons: Record<string, JSX.Element> = {
    pending: <Clock size={10} />, approved: <CheckCircle size={10} />, denied: <XCircle size={10} />,
  };
  return <Badge className={`${map[status] || map.pending} border text-[10px] flex items-center gap-0.5`}>{icons[status]}{status}</Badge>;
}

export default function RankRequestsPage({ guildId }: { guildId: string }) {
  const [requests, setRequests] = useState<RankRequest[]>([]);
  const [ranks, setRanks] = useState<any[]>([]);
  const [me, setMe] = useState<any>(null);
  const [staff, setStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ requestedRank: '', reason: '' });
  const [toast, setToast] = useState<{ type: "ok"|"err"; text: string } | null>(null);

  const showToast = (type: "ok"|"err", text: string) => { setToast({ type, text }); setTimeout(() => setToast(null), 4000); };

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [rRes, rkRes, sRes, meRes] = await Promise.all([
        fetch(`/api/guilds/${guildId}/rank-requests`, { credentials: 'include' }),
        fetch(`/api/guilds/${guildId}/ranks`, { credentials: 'include' }),
        fetch(`/api/guilds/${guildId}/staff`, { credentials: 'include' }),
        fetch('/api/me', { credentials: 'include' }),
      ]);
      if (rRes.ok) setRequests(await rRes.json());
      if (rkRes.ok) setRanks(await rkRes.json());
      if (sRes.ok) setStaff(await sRes.json());
      if (meRes.ok) setMe(await meRes.json());
    } catch {}
    setLoading(false);
  }, [guildId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.requestedRank || !form.reason.trim()) return;
    setSubmitting(true);
    try {
      const myStaff = staff.find(s => s.user_id === me?.id);
      const res = await fetch(`/api/guilds/${guildId}/rank-requests`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({ userId: me?.id, username: me?.username, currentRank: myStaff?.rank || '', ...form }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      setOpen(false); setForm({ requestedRank: '', reason: '' });
      fetchAll(); showToast('ok', 'Rank request submitted! Management will review it.');
    } catch (err: any) { showToast('err', err.message); }
    setSubmitting(false);
  };

  const review = async (id: string, status: 'approved' | 'denied') => {
    try {
      const res = await fetch(`/api/guilds/${guildId}/rank-requests/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({ status, reviewedBy: me?.id, reviewedByName: me?.username }),
      });
      if (!res.ok) throw new Error('Failed');
      fetchAll(); showToast('ok', `Request ${status}.`);
    } catch { showToast('err', 'Failed to review request.'); }
  };

  const pending = requests.filter(r => r.status === 'pending');
  const reviewed = requests.filter(r => r.status !== 'pending');

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
          <h2 className="text-2xl font-extrabold tracking-tight flex items-center gap-2"><TrendingUp className="w-6 h-6" style={{ color: '#d4af37' }} />Rank Requests</h2>
          <p className="text-muted-foreground mt-0.5 text-sm">Staff can submit promotion requests for management review. Keeps the process transparent and documented.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchAll} className="gap-1.5"><RefreshCw size={13} />Refresh</Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" style={{ background: 'linear-gradient(135deg,#d4af37,#ffd700)', color: '#5a3e10', border: 'none' }} className="gap-1.5 font-semibold">
                <Plus size={14} /> Request Promotion
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-white border-border max-w-md">
              <DialogHeader><DialogTitle className="flex items-center gap-2"><TrendingUp size={18} style={{ color: '#d4af37' }} />Request Rank Promotion</DialogTitle></DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 mt-2">
                <p className="text-sm text-muted-foreground bg-muted/40 rounded-lg p-3">You can only have one pending request at a time. Management will review it and notify you.</p>
                <div className="space-y-1.5">
                  <Label className="font-semibold">Requested Rank</Label>
                  {ranks.length > 0 ? (
                    <Select value={form.requestedRank} onValueChange={v => setForm(f => ({ ...f, requestedRank: v }))}>
                      <SelectTrigger className="bg-white border-border"><SelectValue placeholder="Select target rank" /></SelectTrigger>
                      <SelectContent className="bg-white border-border">{ranks.map(r => <SelectItem key={r.id} value={r.name}>{r.name}</SelectItem>)}</SelectContent>
                    </Select>
                  ) : (
                    <Input value={form.requestedRank} onChange={e => setForm(f => ({ ...f, requestedRank: e.target.value }))} placeholder="e.g. Senior Officer" className="bg-white border-border" required />
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label className="font-semibold">Reason / Justification</Label>
                  <Textarea value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} placeholder="Why do you deserve this promotion? Include achievements, hours served, and contributions." className="bg-white border-border min-h-[100px]" required />
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={submitting} style={{ background: 'linear-gradient(135deg,#d4af37,#ffd700)', color: '#5a3e10', border: 'none' }}>
                    {submitting ? <><Loader2 size={13} className="animate-spin mr-1" />Submitting...</> : "Submit Request"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Pending */}
      {pending.length > 0 && (
        <div>
          <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Pending Review ({pending.length})</h3>
          <div className="space-y-3">
            {pending.map(r => (
              <Card key={r.id} className="border-amber-200 bg-amber-50/30 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-bold text-sm">{r.username}</span>
                        <span className="text-xs text-muted-foreground">{r.current_rank || 'No rank'} → <strong>{r.requested_rank}</strong></span>
                        <StatusBadge status={r.status} />
                        <span className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">{r.reason}</p>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <Button size="sm" onClick={() => review(r.id, 'approved')} className="bg-green-500 hover:bg-green-600 text-white border-none gap-1 text-xs h-7">
                        <CheckCircle size={11} />Approve
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => review(r.id, 'denied')} className="border-red-200 text-red-600 hover:bg-red-50 gap-1 text-xs h-7">
                        <XCircle size={11} />Deny
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* History */}
      {reviewed.length > 0 && (
        <div>
          <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Review History</h3>
          <div className="space-y-2">
            {reviewed.slice(0, 20).map(r => (
              <Card key={r.id} className="border-border bg-white shadow-sm">
                <CardContent className="p-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{r.username}</span>
                      <span className="text-xs text-muted-foreground">→ {r.requested_rank}</span>
                      <StatusBadge status={r.status} />
                    </div>
                    {r.reviewed_by_name && <p className="text-xs text-muted-foreground mt-0.5">By {r.reviewed_by_name} · {r.reviewed_at ? new Date(r.reviewed_at).toLocaleDateString() : ''}</p>}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {requests.length === 0 && (
        <Card className="border-border bg-white shadow-sm"><CardContent className="py-16 text-center"><TrendingUp className="w-10 h-10 text-muted-foreground mx-auto mb-3" /><p className="font-semibold text-muted-foreground">No rank requests yet</p><p className="text-sm text-muted-foreground mt-1">Staff can submit promotion requests here. Management reviews and approves or denies them.</p></CardContent></Card>
      )}
    </div>
  );
}
