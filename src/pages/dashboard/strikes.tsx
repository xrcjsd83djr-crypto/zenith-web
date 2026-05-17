import { useState, useEffect, useCallback } from "react";
  import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
  import { Button } from "@/components/ui/button";
  import { Badge } from "@/components/ui/badge";
  import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
  import { Label } from "@/components/ui/label";
  import { Input } from "@/components/ui/input";
  import { Textarea } from "@/components/ui/textarea";
  import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
  import { Plus, Loader2, RefreshCw, AlertTriangle, X, CheckCircle, AlertCircle, Shield } from "lucide-react";

  interface Strike { id: number; user_id: string; username: string; reason: string; evidence?: string; issued_by: string; issued_by_name: string; severity: string; active: boolean; created_at: string; }
  interface Member { id: string; username: string; }

  function SeverityBadge({ severity }: { severity: string }) {
    const map: Record<string, string> = {
      strike: "bg-orange-100 text-orange-700 border-orange-200",
      final_warning: "bg-red-100 text-red-700 border-red-200",
      auto: "bg-gray-100 text-gray-600 border-gray-200",
    };
    const label: Record<string, string> = { strike: "Strike", final_warning: "Final Warning", auto: "Auto" };
    return <Badge className={`${map[severity] || map.strike} text-xs border font-medium`}>{label[severity] || severity}</Badge>;
  }

  export default function StrikesPage({ guildId }: { guildId: string }) {
    const [strikes, setStrikes] = useState<Strike[]>([]);
    const [members, setMembers] = useState<Member[]>([]);
    const [me, setMe] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [open, setOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [form, setForm] = useState({ userId: '', username: '', reason: '', evidence: '', severity: 'strike' });
    const [error, setError] = useState('');
    const [toast, setToast] = useState<{ type: "ok"|"err"; text: string } | null>(null);

    const showToast = (type: "ok"|"err", text: string) => { setToast({ type, text }); setTimeout(() => setToast(null), 4000); };

    const fetchAll = useCallback(async () => {
      setLoading(true);
      try {
        const [sRes, mRes, meRes] = await Promise.all([
          fetch(`/api/guilds/${guildId}/strikes`, { credentials: 'include' }),
          fetch(`/api/guilds/${guildId}/members`, { credentials: 'include' }),
          fetch('/api/me', { credentials: 'include' }),
        ]);
        if (sRes.ok) setStrikes(await sRes.json());
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
        const res = await fetch(`/api/guilds/${guildId}/strikes`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
          body: JSON.stringify({ ...form, issuedBy: me?.id, issuedByName: me?.username }),
        });
        if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Failed to issue strike'); }
        setOpen(false); setForm({ userId: '', username: '', reason: '', evidence: '', severity: 'strike' });
        fetchAll(); showToast('ok', 'Strike issued successfully.');
      } catch (err: any) { setError(err.message); }
      setSubmitting(false);
    };

    const removeStrike = async (id: number) => {
      try {
        await fetch(`/api/guilds/${guildId}/strikes/${id}`, { method: 'DELETE', credentials: 'include' });
        setStrikes(s => s.filter(x => x.id !== id));
        showToast('ok', 'Strike removed.');
      } catch { showToast('err', 'Failed to remove strike.'); }
    };

    const activeStrikes = strikes.filter(s => s.active);
    const byUser: Record<string, Strike[]> = {};
    activeStrikes.forEach(s => { if (!byUser[s.user_id]) byUser[s.user_id] = []; byUser[s.user_id].push(s); });

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

        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight flex items-center gap-2">
              <AlertTriangle className="w-6 h-6" style={{ color: '#d4af37' }} /> Strikes
            </h2>
            <p className="text-muted-foreground mt-0.5 text-sm">Formal disciplinary actions. Strikes persist on a staff member's record and can trigger automatic demotion.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={fetchAll} className="gap-1.5"><RefreshCw size={13} />Refresh</Button>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button size="sm" style={{ background: 'linear-gradient(135deg,#d4af37,#ffd700)', color: '#5a3e10', border: 'none' }} className="gap-1.5 font-semibold">
                  <Plus size={14} /> Issue Strike
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-white border-border max-w-md">
                <DialogHeader><DialogTitle className="flex items-center gap-2"><AlertTriangle size={18} style={{ color: '#d4af37' }} />Issue Strike</DialogTitle></DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 mt-2">
                  <div className="space-y-1.5">
                    <Label className="font-semibold">Staff Member</Label>
                    <Select value={form.userId} onValueChange={v => { const m = members.find(x => x.id === v); setForm(f => ({ ...f, userId: v, username: m?.username || v })); }}>
                      <SelectTrigger className="bg-white border-border"><SelectValue placeholder="Select member" /></SelectTrigger>
                      <SelectContent className="bg-white border-border max-h-52">
                        {members.map(m => <SelectItem key={m.id} value={m.id}>{m.username}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="font-semibold">Strike Type</Label>
                    <Select value={form.severity} onValueChange={v => setForm(f => ({ ...f, severity: v }))}>
                      <SelectTrigger className="bg-white border-border"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-white border-border">
                        <SelectItem value="strike">Strike</SelectItem>
                        <SelectItem value="final_warning">Final Warning</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="font-semibold">Reason</Label>
                    <Textarea value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} placeholder="Detailed reason for this strike..." className="bg-white border-border min-h-[80px]" required />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="font-semibold">Evidence (optional)</Label>
                    <Input value={form.evidence} onChange={e => setForm(f => ({ ...f, evidence: e.target.value }))} placeholder="Screenshot URL, clip link, etc." className="bg-white border-border" />
                  </div>
                  {error && <p className="text-red-600 text-sm flex items-center gap-1.5"><AlertCircle size={13} />{error}</p>}
                  <div className="flex justify-end gap-2 pt-1">
                    <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                    <Button type="submit" disabled={submitting} style={{ background: 'linear-gradient(135deg,#d4af37,#ffd700)', color: '#5a3e10', border: 'none' }}>
                      {submitting ? <><Loader2 size={13} className="animate-spin mr-1" />Issuing...</> : "Issue Strike"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Active Strikes', val: activeStrikes.length, color: 'text-orange-500' },
            { label: 'Staff Struck', val: Object.keys(byUser).length, color: 'text-foreground' },
            { label: 'Final Warnings', val: activeStrikes.filter(s => s.severity === 'final_warning').length, color: 'text-red-500' },
            { label: 'Total Issued', val: strikes.length, color: 'text-muted-foreground' },
          ].map(s => (
            <Card key={s.label} className="border-border bg-white shadow-sm">
              <CardContent className="p-4">
                <div className={`text-2xl font-extrabold ${s.color}`}>{s.val}</div>
                <div className="text-xs text-muted-foreground font-medium mt-0.5">{s.label}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Grouped by staff member */}
        {Object.entries(byUser).length > 0 ? (
          Object.entries(byUser).map(([userId, userStrikes]) => (
            <Card key={userId} className="border-border bg-white shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Shield className="w-4 h-4" style={{ color: '#d4af37' }} />
                  {userStrikes[0].username}
                  <Badge className="ml-1 bg-orange-100 text-orange-700 border-orange-200">{userStrikes.length} strike{userStrikes.length !== 1 ? 's' : ''}</Badge>
                  {userStrikes.length >= 3 && <Badge className="bg-red-100 text-red-700 border-red-200 text-[10px]">⚠ Threshold reached</Badge>}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {userStrikes.map(s => (
                  <div key={s.id} className="flex items-start justify-between gap-3 p-3 rounded-lg border border-border bg-muted/20">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <SeverityBadge severity={s.severity} />
                        <span className="text-xs text-muted-foreground">{new Date(s.created_at).toLocaleDateString()}</span>
                        {s.issued_by_name && <span className="text-xs text-muted-foreground">by {s.issued_by_name}</span>}
                      </div>
                      <p className="text-sm text-foreground">{s.reason}</p>
                      {s.evidence && (
                        <a href={s.evidence} target="_blank" rel="noreferrer" className="text-xs underline mt-1 block" style={{ color: '#d4af37' }}>View Evidence</a>
                      )}
                    </div>
                    <button onClick={() => removeStrike(s.id)} className="text-muted-foreground hover:text-red-500 transition-colors flex-shrink-0 mt-0.5">
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))
        ) : (
          <Card className="border-border bg-white shadow-sm">
            <CardContent className="py-16 text-center">
              <AlertTriangle className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="font-semibold text-muted-foreground">No active strikes</p>
              <p className="text-sm text-muted-foreground mt-1">Strike records appear here when issued through the dashboard or via Discord commands.</p>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }
  