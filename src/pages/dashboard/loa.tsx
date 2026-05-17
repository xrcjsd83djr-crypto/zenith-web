import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Loader2, RefreshCw, Calendar, CheckCircle, XCircle, Clock } from "lucide-react";

interface LOA { id: number; user_id: string; username: string; reason: string; start_date: string; end_date: string; status: string; approved_by?: string; approved_by_name?: string; created_at: string; }

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = { pending: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30", approved: "bg-green-500/20 text-green-400 border-green-500/30", denied: "bg-red-500/20 text-red-400 border-red-500/30", active: "bg-blue-500/20 text-blue-400 border-blue-500/30", expired: "bg-gray-500/20 text-gray-400 border-gray-500/30" };
  return <Badge className={`${map[status] || map.pending} text-xs border capitalize`}>{status}</Badge>;
}

export default function LoaPage({ guildId }: { guildId: string }) {
  const [loas, setLoas] = useState<LOA[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ username: "", reason: "", startDate: "", endDate: "" });
  const [error, setError] = useState("");
  const [me, setMe] = useState<any>(null);

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
    setSubmitting(true); setError("");
    try {
      const res = await fetch(`/api/guilds/${guildId}/loa`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ userId: me?.id, username: form.username || me?.username, reason: form.reason, startDate: form.startDate, endDate: form.endDate }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      setOpen(false); setForm({ username: "", reason: "", startDate: "", endDate: "" }); fetchLoas();
    } catch (err: any) { setError(err.message); }
    setSubmitting(false);
  };

  const handleAction = async (id: number, status: string) => {
    await fetch(`/api/guilds/${guildId}/loa/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ status, approvedBy: me?.id, approvedByName: me?.username }),
    });
    fetchLoas();
  };

  const pending = loas.filter(l => l.status === 'pending');
  const active = loas.filter(l => l.status === 'approved' || l.status === 'active');
  const other = loas.filter(l => l.status === 'denied' || l.status === 'expired');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Leave of Absence</h2>
          <p className="text-gray-400 text-sm mt-1">Manage staff LOA requests</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchLoas} className="border-[#3a3d4a] text-gray-300"><RefreshCw size={14} /></Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700 text-white"><Plus size={14} className="mr-2" />Submit LOA</Button>
            </DialogTrigger>
            <DialogContent className="bg-[#161820] border-[#3a3d4a] text-white">
              <DialogHeader><DialogTitle className="text-white flex items-center gap-2"><Calendar size={18} className="text-blue-400" />Submit LOA Request</DialogTitle></DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-gray-300">Your Username</Label>
                  <Input value={form.username || me?.username || ""} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} className="bg-[#1e2028] border-[#3a3d4a] text-white" placeholder="Your Discord username" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-gray-300">Reason *</Label>
                  <Textarea value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} className="bg-[#1e2028] border-[#3a3d4a] text-white" placeholder="Reason for leave..." required rows={3} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-gray-300">Start Date *</Label>
                    <Input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} required className="bg-[#1e2028] border-[#3a3d4a] text-white" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-gray-300">End Date *</Label>
                    <Input type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} required className="bg-[#1e2028] border-[#3a3d4a] text-white" />
                  </div>
                </div>
                {error && <p className="text-red-400 text-sm">{error}</p>}
                <Button type="submit" disabled={submitting} className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                  {submitting ? <><Loader2 size={14} className="animate-spin mr-2" />Submitting...</> : "Submit Request"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Pending", value: pending.length, color: "text-yellow-400" },
          { label: "Active LOAs", value: active.length, color: "text-blue-400" },
          { label: "Total Requests", value: loas.length, color: "text-white" },
        ].map(s => (
          <Card key={s.label} className="bg-[#161820] border-[#3a3d4a]">
            <CardContent className="p-4 text-center">
              <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-gray-500 text-xs mt-1">{s.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-blue-400" size={24} /></div>
      ) : (
        <div className="space-y-4">
          {pending.length > 0 && (
            <Card className="bg-[#161820] border-[#3a3d4a]">
              <CardHeader className="pb-2"><CardTitle className="text-white text-base flex items-center gap-2"><Clock className="text-yellow-400" size={16} />Pending ({pending.length})</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {pending.map(l => (
                  <div key={l.id} className="flex items-start justify-between p-3 bg-[#1e2028] rounded-lg border border-yellow-900/30">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2"><span className="text-white font-medium">{l.username || l.user_id}</span><StatusBadge status={l.status} /><Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30 text-xs">#{l.id}</Badge></div>
                      <p className="text-gray-300 text-sm">{l.reason}</p>
                      <p className="text-gray-500 text-xs">{new Date(l.start_date).toLocaleDateString()} → {new Date(l.end_date).toLocaleDateString()}</p>
                    </div>
                    <div className="flex gap-2 ml-3 flex-shrink-0">
                      <Button size="sm" onClick={() => handleAction(l.id, 'approved')} className="bg-green-600 hover:bg-green-700 text-white h-7 text-xs"><CheckCircle size={12} className="mr-1" />Approve</Button>
                      <Button size="sm" onClick={() => handleAction(l.id, 'denied')} className="bg-red-600 hover:bg-red-700 text-white h-7 text-xs"><XCircle size={12} className="mr-1" />Deny</Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {active.length > 0 && (
            <Card className="bg-[#161820] border-[#3a3d4a]">
              <CardHeader className="pb-2"><CardTitle className="text-white text-base flex items-center gap-2"><CheckCircle className="text-green-400" size={16} />Approved ({active.length})</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {active.map(l => (
                  <div key={l.id} className="flex items-center gap-3 p-3 bg-[#1e2028] rounded-lg">
                    <StatusBadge status={l.status} />
                    <span className="text-white text-sm font-medium">{l.username}</span>
                    <span className="text-gray-400 text-xs flex-1 truncate">{l.reason}</span>
                    <span className="text-gray-500 text-xs">{new Date(l.start_date).toLocaleDateString()} → {new Date(l.end_date).toLocaleDateString()}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {other.length > 0 && (
            <Card className="bg-[#161820] border-[#3a3d4a]">
              <CardHeader className="pb-2"><CardTitle className="text-gray-400 text-base">Denied / Expired ({other.length})</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {other.slice(0, 20).map(l => (
                  <div key={l.id} className="flex items-center gap-3 p-3 bg-[#1e2028] rounded-lg opacity-60">
                    <StatusBadge status={l.status} />
                    <span className="text-gray-400 text-sm">{l.username}</span>
                    <span className="text-gray-500 text-xs flex-1 truncate">{l.reason}</span>
                    <span className="text-gray-600 text-xs">{new Date(l.created_at).toLocaleDateString()}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {loas.length === 0 && (
            <Card className="bg-[#161820] border-[#3a3d4a]">
              <CardContent className="py-12 text-center">
                <Calendar className="mx-auto mb-3 text-gray-600" size={32} />
                <p className="text-gray-400">No LOA requests yet.</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
