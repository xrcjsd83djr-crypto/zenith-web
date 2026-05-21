import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TrendingUp, TrendingDown, ArrowLeftRight, Plus, RefreshCw, AlertCircle, CheckCircle, Loader2, ChevronDown, ChevronUp, Search, User, Calendar, FileText } from "lucide-react";

interface PromotionRecord {
  id: string; guild_id: string; user_id: string; username: string;
  type: "promotion" | "demotion" | "transfer" | string;
  from_rank?: string; to_rank?: string; reason?: string; evidence?: string;
  promoted_by: string; promoted_by_name?: string;
  old_division?: string; new_division?: string;
  created_at: string;
}
interface Member { id: string; username: string; }
interface Rank { id: string; name: string; level?: number; }

const TYPE_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string; badgeClass: string }> = {
  promotion: { label: "Promotion", icon: <TrendingUp size={14} />, color: "text-green-600", badgeClass: "bg-green-100 text-green-700 border-green-200" },
  demotion: { label: "Demotion", icon: <TrendingDown size={14} />, color: "text-red-600", badgeClass: "bg-red-100 text-red-700 border-red-200" },
  transfer: { label: "Transfer", icon: <ArrowLeftRight size={14} />, color: "text-blue-600", badgeClass: "bg-blue-100 text-blue-700 border-blue-200" },
};

function PromotionRow({ record }: { record: PromotionRecord }) {
  const [open, setOpen] = useState(false);
  const cfg = TYPE_CONFIG[record.type] || TYPE_CONFIG.promotion;
  const ts = new Date(record.created_at);

  return (
    <div className="border border-border rounded-lg overflow-hidden mb-2">
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors text-left">
        <span className={cfg.color + " flex-shrink-0"}>{cfg.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm">{record.username}</span>
            <Badge className={`text-[10px] border ${cfg.badgeClass}`}>{cfg.label}</Badge>
            {record.from_rank && record.to_rank && (
              <span className="text-xs text-muted-foreground">{record.from_rank} → {record.to_rank}</span>
            )}
          </div>
          {record.reason && <p className="text-xs text-muted-foreground truncate mt-0.5">"{record.reason.slice(0, 70)}"</p>}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xs text-muted-foreground hidden sm:block">{ts.toLocaleDateString()}</span>
          {open ? <ChevronUp size={14} className="text-muted-foreground" /> : <ChevronDown size={14} className="text-muted-foreground" />}
        </div>
      </button>
      {open && (
        <div className="px-4 pb-4 border-t border-border bg-muted/20">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-3">
            <div>
              <p className="text-xs text-muted-foreground font-medium flex items-center gap-1"><User size={10} />Staff Member</p>
              <p className="text-sm font-semibold">{record.username}</p>
              {record.user_id && <p className="text-xs text-muted-foreground font-mono">{record.user_id}</p>}
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Action Type</p>
              <Badge className={`text-xs border ${cfg.badgeClass} gap-1`}>{cfg.icon}{cfg.label}</Badge>
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium flex items-center gap-1"><User size={10} />Actioned By</p>
              <p className="text-sm">{record.promoted_by_name || record.promoted_by}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium flex items-center gap-1"><Calendar size={10} />Date</p>
              <p className="text-sm">{ts.toLocaleString()}</p>
            </div>
            {record.from_rank && (
              <div>
                <p className="text-xs text-muted-foreground font-medium">Previous Rank</p>
                <p className="text-sm font-medium">{record.from_rank}</p>
              </div>
            )}
            {record.to_rank && (
              <div>
                <p className="text-xs text-muted-foreground font-medium">New Rank</p>
                <p className="text-sm font-medium text-green-700">{record.to_rank}</p>
              </div>
            )}
            {record.old_division && (
              <div>
                <p className="text-xs text-muted-foreground font-medium">Previous Division</p>
                <p className="text-sm">{record.old_division}</p>
              </div>
            )}
            {record.new_division && (
              <div>
                <p className="text-xs text-muted-foreground font-medium">New Division</p>
                <p className="text-sm">{record.new_division}</p>
              </div>
            )}
            {record.reason && (
              <div className="col-span-2 sm:col-span-3">
                <p className="text-xs text-muted-foreground font-medium flex items-center gap-1"><FileText size={10} />Reason</p>
                <p className="text-sm">{record.reason}</p>
              </div>
            )}
            {record.evidence && (
              <div className="col-span-2 sm:col-span-3">
                <p className="text-xs text-muted-foreground font-medium">Evidence</p>
                <p className="text-sm break-all">{record.evidence}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function PromotionsPage({ guildId }: { guildId: string }) {
  const [records, setRecords] = useState<PromotionRecord[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [ranks, setRanks] = useState<Rank[]>([]);
  const [me, setMe] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [form, setForm] = useState({ userId: '', username: '', type: 'promotion', fromRank: '', toRank: '', reason: '', evidence: '' });
  const [toast, setToast] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const showToast = (type: "ok" | "err", text: string) => { setToast({ type, text }); setTimeout(() => setToast(null), 4000); };

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [pRes, mRes, rRes, meRes] = await Promise.allSettled([
        fetch(`/api/guilds/${guildId}/promotions`, { credentials: 'include' }),
        fetch(`/api/guilds/${guildId}/members`, { credentials: 'include' }),
        fetch(`/api/guilds/${guildId}/ranks`, { credentials: 'include' }),
        fetch('/api/me', { credentials: 'include' }),
      ]);
      if (pRes.status === 'fulfilled' && pRes.value.ok) { const d = await pRes.value.json().catch(() => []); setRecords(Array.isArray(d) ? d : []); }
      if (mRes.status === 'fulfilled' && mRes.value.ok) { const d = await mRes.value.json().catch(() => []); setMembers(Array.isArray(d) ? d : []); }
      if (rRes.status === 'fulfilled' && rRes.value.ok) { const d = await rRes.value.json().catch(() => []); setRanks(Array.isArray(d) ? d : []); }
      if (meRes.status === 'fulfilled' && meRes.value.ok) setMe(await meRes.value.json().catch(() => null));
    } catch {}
    setLoading(false);
  }, [guildId]);
  useEffect(() => { fetchAll(); }, [fetchAll]);

  const filtered = records.filter(r => {
    if (typeFilter !== 'all' && r.type !== typeFilter) return false;
    if (search && !r.username.toLowerCase().includes(search.toLowerCase()) && !(r.reason || '').toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const counts = { total: records.length, promotion: records.filter(r => r.type === 'promotion').length, demotion: records.filter(r => r.type === 'demotion').length, transfer: records.filter(r => r.type === 'transfer').length };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.userId || !form.toRank) return showToast("err", "Select a staff member and new rank.");
    setSubmitting(true);
    try {
      const res = await fetch(`/api/guilds/${guildId}/promotions`, {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: form.userId, username: form.username, type: form.type, fromRank: form.fromRank || null, toRank: form.toRank, reason: form.reason, evidence: form.evidence || null, promotedBy: me?.id, promotedByName: me?.username }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((d as any).error || 'Failed');
      showToast("ok", `${form.type.charAt(0).toUpperCase() + form.type.slice(1)} recorded for ${form.username}.`);
      setOpen(false);
      setForm({ userId: '', username: '', type: 'promotion', fromRank: '', toRank: '', reason: '', evidence: '' });
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
            <TrendingUp className="w-6 h-6 text-green-500" />Promotions & History
          </h2>
          <p className="text-muted-foreground mt-0.5 text-sm">{records.length} records — click any row to expand full details</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchAll} className="gap-1.5"><RefreshCw size={13} />Refresh</Button>
          <Button size="sm" onClick={() => setOpen(true)} className="gap-1.5" style={{ background: '#d4af37', color: '#000' }}>
            <Plus size={13} />Record Action
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total", value: counts.total, color: "text-foreground" },
          { label: "Promotions", value: counts.promotion, color: "text-green-600" },
          { label: "Demotions", value: counts.demotion, color: "text-red-500" },
          { label: "Transfers", value: counts.transfer, color: "text-blue-600" },
        ].map(s => (
          <Card key={s.label}><CardContent className="p-4">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
          </CardContent></Card>
        ))}
      </div>

      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search by name or reason..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9 text-sm" />
        </div>
        <div className="flex gap-1">
          {['all', 'promotion', 'demotion', 'transfer'].map(t => (
            <Button key={t} size="sm" variant={typeFilter === t ? 'default' : 'outline'} onClick={() => setTypeFilter(t)} className="text-xs capitalize h-9">
              {t === 'all' ? 'All' : t}
            </Button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-7 h-7 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#d4af37', borderTopColor: 'transparent' }} />
        </div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground text-sm">No records found.</CardContent></Card>
      ) : (
        <div>{filtered.map(r => <PromotionRow key={r.id} record={r} />)}</div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Record Promotion / Demotion / Transfer</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-3 mt-2">
            <div className="space-y-1.5">
              <Label>Action Type *</Label>
              <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="promotion">🟢 Promotion</SelectItem>
                  <SelectItem value="demotion">🔴 Demotion</SelectItem>
                  <SelectItem value="transfer">🔵 Transfer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Staff Member *</Label>
              <Select value={form.userId} onValueChange={v => { const m = members.find(m => m.id === v); setForm(f => ({ ...f, userId: v, username: m?.username || '' })); }}>
                <SelectTrigger><SelectValue placeholder="Select member" /></SelectTrigger>
                <SelectContent>{members.map(m => <SelectItem key={m.id} value={m.id}>{m.username}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Previous Rank</Label>
                <Select value={form.fromRank} onValueChange={v => setForm(f => ({ ...f, fromRank: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select rank" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {ranks.map(r => <SelectItem key={r.id} value={r.name}>{r.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>New Rank *</Label>
                <Select value={form.toRank} onValueChange={v => setForm(f => ({ ...f, toRank: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select rank" /></SelectTrigger>
                  <SelectContent>
                    {ranks.map(r => <SelectItem key={r.id} value={r.name}>{r.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5"><Label>Reason</Label><Textarea value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} placeholder="Why is this action being taken?" rows={3} /></div>
            <div className="space-y-1.5"><Label>Evidence (optional)</Label><Input value={form.evidence} onChange={e => setForm(f => ({ ...f, evidence: e.target.value }))} placeholder="Screenshot link or notes" /></div>
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={submitting} style={{ background: '#d4af37', color: '#000' }}>
                {submitting ? <><Loader2 size={14} className="animate-spin mr-1.5" />Recording…</> : "Record"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
