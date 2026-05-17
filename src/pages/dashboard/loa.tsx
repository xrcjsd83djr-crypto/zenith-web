import { useState, useEffect, useCallback } from "react";
  import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
  import { Button } from "@/components/ui/button";
  import { Badge } from "@/components/ui/badge";
  import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
  import { Label } from "@/components/ui/label";
  import { Input } from "@/components/ui/input";
  import { Textarea } from "@/components/ui/textarea";
  import { Plus, Loader2, RefreshCw, Calendar, CheckCircle, XCircle, Clock, CalendarClock, AlertCircle } from "lucide-react";

  interface LOA { id: number; user_id: string; username: string; reason: string; start_date: string; end_date: string; status: string; approved_by?: string; approved_by_name?: string; created_at: string; }

  function StatusBadge({ status }: { status: string }) {
    const map: Record<string, { cls: string; label: string }> = {
      pending:  { cls: "bg-amber-100 text-amber-700 border-amber-200",  label: "Pending" },
      approved: { cls: "bg-green-100 text-green-700 border-green-200",  label: "Approved" },
      denied:   { cls: "bg-red-100 text-red-700 border-red-200",         label: "Denied" },
      active:   { cls: "bg-blue-100 text-blue-700 border-blue-200",      label: "Active" },
      expired:  { cls: "bg-gray-100 text-gray-600 border-gray-200",      label: "Expired" },
    };
    const s = map[status] || map.pending;
    return <Badge className={`${s.cls} text-xs border capitalize font-medium`}>{s.label}</Badge>;
  }

  function formatDate(d: string) {
    return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }
  function dayDiff(a: string, b: string) {
    return Math.ceil((new Date(b).getTime() - new Date(a).getTime()) / 86400000);
  }

  export default function LoaPage({ guildId }: { guildId: string }) {
    const [loas, setLoas] = useState<LOA[]>([]);
    const [loading, setLoading] = useState(true);
    const [open, setOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [actioning, setActioning] = useState<number | null>(null);
    const [form, setForm] = useState({ username: "", reason: "", startDate: "", endDate: "" });
    const [error, setError] = useState("");
    const [me, setMe] = useState<any>(null);
    const [toast, setToast] = useState<{ type: "ok" | "err"; text: string } | null>(null);

    const showToast = (type: "ok" | "err", text: string) => {
      setToast({ type, text });
      setTimeout(() => setToast(null), 4000);
    };

    const fetchLoas = useCallback(async () => {
      setLoading(true);
      try {
        const [lRes, mRes] = await Promise.all([
          fetch(`/api/guilds/${guildId}/loa`, { credentials: 'include' }),
          fetch('/api/me', { credentials: 'include' }),
        ]);
        if (lRes.ok) setLoas(await lRes.json());
        if (mRes.ok) setMe(await mRes.json());
      } catch { }
      setLoading(false);
    }, [guildId]);

    useEffect(() => { fetchLoas(); }, [fetchLoas]);

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!form.reason.trim() || !form.startDate || !form.endDate) { setError("All fields are required."); return; }
      setSubmitting(true); setError("");
      try {
        const res = await fetch(`/api/guilds/${guildId}/loa`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
          body: JSON.stringify({ userId: me?.id, username: form.username || me?.username, reason: form.reason, startDate: form.startDate, endDate: form.endDate }),
        });
        if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Failed to submit'); }
        setOpen(false);
        setForm({ username: "", reason: "", startDate: "", endDate: "" });
        fetchLoas();
        showToast("ok", "LOA request submitted successfully!");
      } catch (err: any) { setError(err.message); }
      setSubmitting(false);
    };

    const handleAction = async (id: number, status: string) => {
      setActioning(id);
      try {
        const res = await fetch(`/api/guilds/${guildId}/loa/${id}`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
          body: JSON.stringify({ status, approvedBy: me?.id, approvedByName: me?.username }),
        });
        if (!res.ok) throw new Error("Action failed");
        await fetchLoas();
        const label = status === 'approved' ? 'approved (LOA role assigned)' : status;
        showToast("ok", `Request ${label} successfully.`);
      } catch (err: any) { showToast("err", err.message); }
      setActioning(null);
    };

    const pending = loas.filter(l => l.status === 'pending');
    const others = loas.filter(l => l.status !== 'pending');

    if (loading) return (
      <div className="flex justify-center items-center py-20">
        <div className="w-7 h-7 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#d4af37', borderTopColor: 'transparent' }} />
      </div>
    );

    return (
      <div className="space-y-5 max-w-4xl">
        {toast && (
          <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium flex items-center gap-2 ${
            toast.type === 'ok' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            {toast.type === 'ok' ? <CheckCircle size={15} /> : <AlertCircle size={15} />} {toast.text}
          </div>
        )}

        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight flex items-center gap-2">
              <CalendarClock className="w-6 h-6" style={{ color: '#d4af37' }} /> Leave of Absence
            </h2>
            <p className="text-muted-foreground mt-0.5 text-sm">Manage staff leave requests. Approving assigns the LOA role in Discord automatically.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={fetchLoas} className="gap-1.5"><RefreshCw size={13} />Refresh</Button>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button size="sm" style={{ background: 'linear-gradient(135deg,#d4af37,#ffd700)', color: '#5a3e10', border: 'none' }} className="gap-1.5 font-semibold">
                  <Plus size={14} /> New Request
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-white border-border max-w-md">
                <DialogHeader>
                  <DialogTitle>Submit LOA Request</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 mt-2">
                  <div className="space-y-1.5">
                    <Label className="font-semibold">Username</Label>
                    <Input value={form.username || me?.username || ''} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} placeholder={me?.username || 'Your username'} className="bg-white border-border" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="font-semibold">Start Date</Label>
                      <Input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} className="bg-white border-border" required />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="font-semibold">End Date</Label>
                      <Input type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} className="bg-white border-border" required />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="font-semibold">Reason</Label>
                    <Textarea value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} placeholder="Reason for your leave of absence..." className="bg-white border-border min-h-[80px]" required />
                  </div>
                  {error && <p className="text-red-600 text-sm flex items-center gap-1.5"><AlertCircle size={13} />{error}</p>}
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

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total Requests', val: loas.length, color: 'text-foreground' },
            { label: 'Pending Review', val: pending.length, color: 'text-amber-600' },
            { label: 'Approved', val: loas.filter(l => l.status === 'approved' || l.status === 'active').length, color: 'text-green-600' },
            { label: 'Denied', val: loas.filter(l => l.status === 'denied').length, color: 'text-red-500' },
          ].map(s => (
            <Card key={s.label} className="border-border bg-white shadow-sm">
              <CardContent className="p-4">
                <div className={`text-2xl font-extrabold ${s.color}`}>{s.val}</div>
                <div className="text-xs text-muted-foreground font-medium mt-0.5">{s.label}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Pending */}
        {pending.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Awaiting Review ({pending.length})</h3>
            {pending.map(loa => (
              <Card key={loa.id} className="border-amber-200 bg-amber-50/50 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-foreground">{loa.username}</span>
                        <StatusBadge status={loa.status} />
                        <span className="text-xs text-muted-foreground">
                          {formatDate(loa.start_date)} → {formatDate(loa.end_date)} ({dayDiff(loa.start_date, loa.end_date)} days)
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{loa.reason}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Button size="sm" variant="outline" onClick={() => handleAction(loa.id, 'denied')}
                        disabled={actioning === loa.id}
                        className="gap-1.5 text-red-600 border-red-200 hover:bg-red-50">
                        {actioning === loa.id ? <Loader2 size={12} className="animate-spin" /> : <XCircle size={12} />} Deny
                      </Button>
                      <Button size="sm" onClick={() => handleAction(loa.id, 'approved')}
                        disabled={actioning === loa.id}
                        className="gap-1.5" style={{ background: 'linear-gradient(135deg,#d4af37,#ffd700)', color: '#5a3e10', border: 'none' }}>
                        {actioning === loa.id ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle size={12} />} Approve
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* All others */}
        {others.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">History ({others.length})</h3>
            {others.map(loa => (
              <Card key={loa.id} className="border-border bg-white shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-foreground">{loa.username}</span>
                        <StatusBadge status={loa.status} />
                        <span className="text-xs text-muted-foreground">
                          {formatDate(loa.start_date)} → {formatDate(loa.end_date)} ({dayDiff(loa.start_date, loa.end_date)} days)
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{loa.reason}</p>
                      {loa.approved_by_name && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Reviewed by <span className="font-medium">{loa.approved_by_name}</span>
                        </p>
                      )}
                    </div>
                    {loa.status === 'approved' && (
                      <Button size="sm" variant="outline" onClick={() => handleAction(loa.id, 'returned')}
                        disabled={actioning === loa.id} className="gap-1.5 flex-shrink-0 text-xs">
                        {actioning === loa.id ? <Loader2 size={11} className="animate-spin" /> : <Clock size={11} />} Mark Returned
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {loas.length === 0 && (
          <Card className="border-border bg-white shadow-sm">
            <CardContent className="py-16 text-center">
              <Calendar className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="font-semibold text-muted-foreground">No LOA requests yet</p>
              <p className="text-sm text-muted-foreground mt-1">Requests submitted here or via Discord panel will appear here.</p>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }
  