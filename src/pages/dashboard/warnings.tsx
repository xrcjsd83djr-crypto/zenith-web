import { useState, useEffect, useCallback } from "react";
  import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
  import { Button } from "@/components/ui/button";
  import { Badge } from "@/components/ui/badge";
  import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
  import { Label } from "@/components/ui/label";
  import { Input } from "@/components/ui/input";
  import { Textarea } from "@/components/ui/textarea";
  import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
  import { Plus, Loader2, RefreshCw, AlertOctagon, Shield, X, CheckCircle, AlertCircle } from "lucide-react";

  interface Warning { id: number; user_id: string; username: string; reason: string; issued_by: string; issued_by_name: string; severity: string; active: boolean; created_at: string; }
  interface Member { id: string; username: string; }

  function SeverityBadge({ severity }: { severity: string }) {
    const map: Record<string, string> = {
      minor: "bg-yellow-100 text-yellow-700 border-yellow-200",
      moderate: "bg-orange-100 text-orange-700 border-orange-200",
      major: "bg-red-100 text-red-700 border-red-200",
    };
    return <Badge className={`${map[severity] || map.minor} text-xs border capitalize font-medium`}>{severity || 'minor'}</Badge>;
  }

  export default function WarningsPage({ guildId }: { guildId: string }) {
    const [warnings, setWarnings] = useState<Warning[]>([]);
    const [members, setMembers] = useState<Member[]>([]);
    const [me, setMe] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [open, setOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [form, setForm] = useState({ userId: '', username: '', reason: '', severity: 'minor' });
    const [error, setError] = useState('');
    const [toast, setToast] = useState<{ type: "ok"|"err"; text: string } | null>(null);

    const showToast = (type: "ok"|"err", text: string) => { setToast({ type, text }); setTimeout(() => setToast(null), 4000); };

    const fetchAll = useCallback(async () => {
      setLoading(true);
      try {
        const [wRes, mRes, meRes] = await Promise.all([
          fetch(`/api/guilds/${guildId}/warnings`, { credentials: 'include' }),
          fetch(`/api/guilds/${guildId}/members`, { credentials: 'include' }),
          fetch('/api/me', { credentials: 'include' }),
        ]);
        if (wRes.ok) setWarnings(await wRes.json());
        if (mRes.ok) setMembers(await mRes.json());
        if (meRes.ok) setMe(await meRes.json());
      } catch { }
      setLoading(false);
    }, [guildId]);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!form.userId || !form.reason.trim()) { setError('Select a user and enter a reason.'); return; }
      setSubmitting(true); setError('');
      try {
        const res = await fetch(`/api/guilds/${guildId}/warnings`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
          body: JSON.stringify({ ...form, issuedBy: me?.id, issuedByName: me?.username }),
        });
        if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Failed'); }
        setOpen(false); setForm({ userId: '', username: '', reason: '', severity: 'minor' });
        fetchAll(); showToast('ok', 'Warning issued successfully.');
      } catch (err: any) { setError(err.message); }
      setSubmitting(false);
    };

    const removeWarning = async (id: number) => {
      try {
        await fetch(`/api/guilds/${guildId}/warnings/${id}`, { method: 'DELETE', credentials: 'include' });
        setWarnings(w => w.filter(x => x.id !== id));
        showToast('ok', 'Warning removed.');
      } catch { showToast('err', 'Failed to remove.'); }
    };

    const activeWarnings = warnings.filter(w => w.active);
    const byUser: Record<string, Warning[]> = {};
    activeWarnings.forEach(w => { if (!byUser[w.user_id]) byUser[w.user_id] = []; byUser[w.user_id].push(w); });

    if (loading) return <div className="flex justify-center items-center py-20"><div className="w-7 h-7 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#d4af37', borderTopColor: 'transparent' }} /></div>;

    return (
      <div className="space-y-5 max-w-4xl">
        {toast && <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium flex items-center gap-2 ${toast.type === 'ok' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>{toast.type === 'ok' ? <CheckCircle size={15} /> : <AlertCircle size={15} />} {toast.text}</div>}
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight flex items-center gap-2"><AlertOctagon className="w-6 h-6" style={{ color: '#d4af37' }} /> Warnings</h2>
            <p className="text-muted-foreground mt-0.5 text-sm">Issue informal warnings to staff members. 3 major warnings auto-escalate to a formal strike.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={fetchAll} className="gap-1.5"><RefreshCw size={13} />Refresh</Button>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button size="sm" style={{ background: 'linear-gradient(135deg,#d4af37,#ffd700)', color: '#5a3e10', border: 'none' }} className="gap-1.5 font-semibold"><Plus size={14} /> Issue Warning</Button>
              </DialogTrigger>
              <DialogContent className="bg-white border-border max-w-md">
                <DialogHeader><DialogTitle>Issue Warning</DialogTitle></DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 mt-2">
                  <div className="space-y-1.5">
                    <Label className="font-semibold">Staff Member</Label>
                    <Select value={form.userId} onValueChange={v => { const m = members.find(x => x.id === v); setForm(f => ({ ...f, userId: v, username: m?.username || v })); }}>
                      <SelectTrigger className="bg-white border-border"><SelectValue placeholder="Select member" /></SelectTrigger>
                      <SelectContent className="bg-white border-border max-h-52">{members.map(m => <SelectItem key={m.id} value={m.id}>{m.username}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="font-semibold">Severity</Label>
                    <Select value={form.severity} onValueChange={v => setForm(f => ({ ...f, severity: v }))}>
                      <SelectTrigger className="bg-white border-border"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-white border-border">
                        <SelectItem value="minor">Minor — informal note</SelectItem>
                        <SelectItem value="moderate">Moderate — verbal warning</SelectItem>
                        <SelectItem value="major">Major — formal warning</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="font-semibold">Reason</Label>
                    <Textarea value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} placeholder="Be specific about the behaviour..." className="bg-white border-border min-h-[80px]" required />
                  </div>
                  {error && <p className="text-red-600 text-sm flex items-center gap-1.5"><AlertCircle size={13} />{error}</p>}
                  <div className="flex justify-end gap-2 pt-1">
                    <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                    <Button type="submit" disabled={submitting} style={{ background: 'linear-gradient(135deg,#d4af37,#ffd700)', color: '#5a3e10', border: 'none' }}>{submitting ? <><Loader2 size={13} className="animate-spin mr-1" />Issuing...</> : "Issue Warning"}</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Active Warnings', val: activeWarnings.length, color: 'text-amber-600' },
            { label: 'Staff Warned', val: Object.keys(byUser).length, color: 'text-foreground' },
            { label: 'Major Warnings', val: activeWarnings.filter(w => w.severity === 'major').length, color: 'text-red-500' },
            { label: 'Total Issued', val: warnings.length, color: 'text-muted-foreground' },
          ].map(s => <Card key={s.label} className="border-border bg-white shadow-sm"><CardContent className="p-4"><div className={`text-2xl font-extrabold ${s.color}`}>{s.val}</div><div className="text-xs text-muted-foreground font-medium mt-0.5">{s.label}</div></CardContent></Card>)}
        </div>
        {Object.entries(byUser).length > 0 ? Object.entries(byUser).map(([userId, userWarnings]) => (
          <Card key={userId} className="border-border bg-white shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2"><Shield className="w-4 h-4" style={{ color: '#d4af37' }} />{userWarnings[0].username}<Badge className="ml-1 bg-amber-100 text-amber-700 border-amber-200">{userWarnings.length} warning{userWarnings.length !== 1 ? 's' : ''}</Badge></CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {userWarnings.map(w => (
                <div key={w.id} className="flex items-start justify-between gap-3 p-3 rounded-lg border border-border bg-muted/20">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1"><SeverityBadge severity={w.severity} /><span className="text-xs text-muted-foreground">{new Date(w.created_at).toLocaleDateString()}</span>{w.issued_by_name && <span className="text-xs text-muted-foreground">by {w.issued_by_name}</span>}</div>
                    <p className="text-sm">{w.reason}</p>
                  </div>
                  <button onClick={() => removeWarning(w.id)} className="text-muted-foreground hover:text-red-500 transition-colors flex-shrink-0 mt-0.5"><X size={14} /></button>
                </div>
              ))}
            </CardContent>
          </Card>
        )) : (
          <Card className="border-border bg-white shadow-sm"><CardContent className="py-16 text-center"><AlertOctagon className="w-10 h-10 text-muted-foreground mx-auto mb-3" /><p className="font-semibold text-muted-foreground">No active warnings</p><p className="text-sm text-muted-foreground mt-1">Warnings are lighter than strikes — use for informal notices.</p></CardContent></Card>
        )}
      </div>
    );
  }
  