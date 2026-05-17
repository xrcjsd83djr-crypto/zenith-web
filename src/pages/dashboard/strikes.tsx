import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle, Plus, Trash2, Search, Loader2, RefreshCw } from "lucide-react";

interface Strike { id: number; user_id: string; username: string; reason: string; evidence?: string; issued_by: string; issued_by_name: string; active: boolean; created_at: string; severity?: string; }

export default function StrikesPage({ guildId }: { guildId: string }) {
  const [strikes, setStrikes] = useState<Strike[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [issuing, setIssuing] = useState(false);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ userId: "", username: "", reason: "", evidence: "" });
  const [error, setError] = useState("");
  const [me, setMe] = useState<any>(null);

  const fetchStrikes = useCallback(async () => {
    setLoading(true);
    try {
      const [sRes, meRes] = await Promise.all([
        fetch(`/api/guilds/${guildId}/strikes`, { credentials: 'include' }),
        fetch('/api/me', { credentials: 'include' }),
      ]);
      if (sRes.ok) setStrikes(await sRes.json());
      if (meRes.ok) setMe(await meRes.json());
    } catch { }
    setLoading(false);
  }, [guildId]);

  useEffect(() => { fetchStrikes(); }, [fetchStrikes]);

  const handleIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    setIssuing(true); setError("");
    try {
      const res = await fetch(`/api/guilds/${guildId}/strikes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ ...form, issuedBy: me?.id, issuedByName: me?.username }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      setOpen(false);
      setForm({ userId: "", username: "", reason: "", evidence: "" });
      fetchStrikes();
    } catch (err: any) { setError(err.message); }
    setIssuing(false);
  };

  const handleRevoke = async (id: number) => {
    if (!confirm("Revoke this strike?")) return;
    await fetch(`/api/guilds/${guildId}/strikes/${id}`, { method: 'DELETE', credentials: 'include' });
    fetchStrikes();
  };

  const filtered = strikes.filter(s => !search || s.username?.toLowerCase().includes(search.toLowerCase()) || s.reason?.toLowerCase().includes(search.toLowerCase()));
  const active = filtered.filter(s => s.active);
  const inactive = filtered.filter(s => !s.active);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Strike Management</h2>
          <p className="text-gray-400 text-sm mt-1">Issue, view and revoke staff strikes</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchStrikes} className="border-[#3a3d4a] text-gray-300"><RefreshCw size={14} /></Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-red-600 hover:bg-red-700 text-white"><Plus size={14} className="mr-2" />Issue Strike</Button>
            </DialogTrigger>
            <DialogContent className="bg-[#161820] border-[#3a3d4a] text-white">
              <DialogHeader><DialogTitle className="text-white flex items-center gap-2"><AlertTriangle className="text-red-400" size={18} />Issue Strike</DialogTitle></DialogHeader>
              <form onSubmit={handleIssue} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-gray-300">Discord User ID</Label>
                    <Input value={form.userId} onChange={e => setForm(f => ({ ...f, userId: e.target.value }))} placeholder="123456789" required className="bg-[#1e2028] border-[#3a3d4a] text-white" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-gray-300">Username</Label>
                    <Input value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} placeholder="john_doe" required className="bg-[#1e2028] border-[#3a3d4a] text-white" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-gray-300">Reason *</Label>
                  <Textarea value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} placeholder="Reason for the strike..." required className="bg-[#1e2028] border-[#3a3d4a] text-white" rows={3} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-gray-300">Evidence (optional)</Label>
                  <Input value={form.evidence} onChange={e => setForm(f => ({ ...f, evidence: e.target.value }))} placeholder="Screenshot link or description" className="bg-[#1e2028] border-[#3a3d4a] text-white" />
                </div>
                {error && <p className="text-red-400 text-sm">{error}</p>}
                <Button type="submit" disabled={issuing} className="w-full bg-red-600 hover:bg-red-700 text-white">
                  {issuing ? <><Loader2 size={14} className="animate-spin mr-2" />Issuing...</> : "Issue Strike"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Active Strikes", value: strikes.filter(s => s.active).length, color: "text-red-400" },
          { label: "Total Issued", value: strikes.length, color: "text-white" },
          { label: "Revoked", value: strikes.filter(s => !s.active).length, color: "text-green-400" },
        ].map(s => (
          <Card key={s.label} className="bg-[#161820] border-[#3a3d4a]">
            <CardContent className="p-4 text-center">
              <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-gray-500 text-xs mt-1">{s.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by username or reason..." className="bg-[#1e2028] border-[#3a3d4a] text-white pl-9" />
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-blue-400" size={24} /></div>
      ) : (
        <div className="space-y-4">
          {active.length === 0 && inactive.length === 0 ? (
            <Card className="bg-[#161820] border-[#3a3d4a]">
              <CardContent className="py-12 text-center">
                <AlertTriangle className="mx-auto mb-3 text-gray-600" size={32} />
                <p className="text-gray-400">No strikes found.</p>
              </CardContent>
            </Card>
          ) : (
            <>
              {active.length > 0 && (
                <Card className="bg-[#161820] border-[#3a3d4a]">
                  <CardHeader className="pb-2"><CardTitle className="text-white text-base flex items-center gap-2"><AlertTriangle className="text-red-400" size={16} />Active Strikes ({active.length})</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    {active.map(s => (
                      <div key={s.id} className="flex items-start justify-between p-3 bg-[#1e2028] rounded-lg border border-red-900/30">
                        <div className="space-y-1 flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-white font-medium">{s.username || s.user_id}</span>
                            <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-xs">#{s.id}</Badge>
                            {s.severity && s.severity !== 'strike' && <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-xs">{s.severity}</Badge>}
                          </div>
                          <p className="text-gray-300 text-sm">{s.reason}</p>
                          {s.evidence && <p className="text-gray-500 text-xs">Evidence: {s.evidence}</p>}
                          <p className="text-gray-500 text-xs">By {s.issued_by_name || s.issued_by} · {new Date(s.created_at).toLocaleDateString()}</p>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => handleRevoke(s.id)} className="text-red-400 hover:text-red-300 hover:bg-red-900/20 ml-3 flex-shrink-0"><Trash2 size={14} /></Button>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
              {inactive.length > 0 && (
                <Card className="bg-[#161820] border-[#3a3d4a]">
                  <CardHeader className="pb-2"><CardTitle className="text-gray-400 text-base">Revoked Strikes ({inactive.length})</CardTitle></CardHeader>
                  <CardContent className="space-y-2">
                    {inactive.slice(0, 20).map(s => (
                      <div key={s.id} className="flex items-center gap-3 p-3 bg-[#1e2028] rounded-lg opacity-60">
                        <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30 text-xs">#{s.id}</Badge>
                        <span className="text-gray-400 text-sm">{s.username}</span>
                        <span className="text-gray-500 text-xs flex-1 truncate">{s.reason}</span>
                        <span className="text-gray-600 text-xs">{new Date(s.created_at).toLocaleDateString()}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
