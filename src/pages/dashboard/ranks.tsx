import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Loader2, RefreshCw, Trophy } from "lucide-react";

interface Rank { id: string; name: string; level: number; color: string; discord_role_id?: string; is_default: boolean; created_at: string; }

export default function RanksPage({ guildId }: { guildId: string }) {
  const [ranks, setRanks] = useState<Rank[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: "", level: "0", color: "#5865F2", discordRoleId: "" });
  const [error, setError] = useState("");

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [rRes, rolesRes] = await Promise.all([
        fetch(`/api/guilds/${guildId}/ranks`, { credentials: 'include' }),
        fetch(`/api/guilds/${guildId}/roles`, { credentials: 'include' }),
      ]);
      if (rRes.ok) setRanks(await rRes.json());
      if (rolesRes.ok) setRoles(await rolesRes.json());
    } catch { }
    setLoading(false);
  }, [guildId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true); setError("");
    try {
      const res = await fetch(`/api/guilds/${guildId}/ranks`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({ name: form.name, level: parseInt(form.level) || 0, color: form.color, discordRoleId: form.discordRoleId || null }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      setOpen(false); setForm({ name: "", level: "0", color: "#5865F2", discordRoleId: "" }); fetchAll();
    } catch (err: any) { setError(err.message); }
    setCreating(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this rank?")) return;
    await fetch(`/api/guilds/${guildId}/ranks/${id}`, { method: 'DELETE', credentials: 'include' });
    fetchAll();
  };

  const sorted = [...ranks].sort((a, b) => b.level - a.level);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Rank Hierarchy</h2>
          <p className="text-gray-400 text-sm mt-1">Define staff ranks and link them to Discord roles</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchAll} className="border-[#3a3d4a] text-gray-300"><RefreshCw size={14} /></Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700 text-white"><Plus size={14} className="mr-2" />Add Rank</Button>
            </DialogTrigger>
            <DialogContent className="bg-[#161820] border-[#3a3d4a] text-white">
              <DialogHeader><DialogTitle className="text-white flex items-center gap-2"><Trophy size={18} className="text-yellow-400" />Add Rank</DialogTitle></DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-gray-300">Rank Name *</Label>
                  <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Senior Officer" required className="bg-[#1e2028] border-[#3a3d4a] text-white" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-gray-300">Level (higher = more senior)</Label>
                    <Input type="number" value={form.level} onChange={e => setForm(f => ({ ...f, level: e.target.value }))} className="bg-[#1e2028] border-[#3a3d4a] text-white" min={0} max={100} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-gray-300">Color</Label>
                    <div className="flex gap-2">
                      <input type="color" value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} className="w-10 h-10 rounded cursor-pointer border-0" />
                      <Input value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} className="bg-[#1e2028] border-[#3a3d4a] text-white font-mono" />
                    </div>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-gray-300">Link to Discord Role (optional)</Label>
                  <select value={form.discordRoleId} onChange={e => setForm(f => ({ ...f, discordRoleId: e.target.value }))}
                    className="w-full bg-[#1e2028] border border-[#3a3d4a] text-white rounded-md px-3 py-2 text-sm">
                    <option value="">None</option>
                    {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                </div>
                {error && <p className="text-red-400 text-sm">{error}</p>}
                <Button type="submit" disabled={creating} className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                  {creating ? <><Loader2 size={14} className="animate-spin mr-2" />Creating...</> : "Create Rank"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-blue-400" size={24} /></div>
      ) : sorted.length === 0 ? (
        <Card className="bg-[#161820] border-[#3a3d4a]">
          <CardContent className="py-12 text-center">
            <Trophy className="mx-auto mb-3 text-gray-600" size={32} />
            <p className="text-gray-400">No ranks configured yet.</p>
            <p className="text-gray-600 text-sm mt-1">Add ranks to define your staff hierarchy.</p>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-[#161820] border-[#3a3d4a]">
          <CardHeader className="pb-2"><CardTitle className="text-white text-base">{sorted.length} Rank{sorted.length !== 1 ? 's' : ''}</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {sorted.map((rank, i) => {
              const linkedRole = roles.find(r => r.id === rank.discord_role_id);
              return (
                <div key={rank.id} className="flex items-center gap-3 p-3 bg-[#1e2028] rounded-lg border border-[#3a3d4a] hover:border-[#4a4d5a] transition-colors">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500 text-xs w-4 text-right">{sorted.length - i}.</span>
                      <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: rank.color || '#5865F2' }} />
                    </div>
                    <span className="text-white font-medium">{rank.name}</span>
                    <Badge className="bg-[#2a2d3a] text-gray-400 border-[#3a3d4a] text-xs">Level {rank.level}</Badge>
                    {linkedRole && (
                      <Badge className="bg-indigo-500/20 text-indigo-300 border-indigo-500/30 text-xs">
                        @{linkedRole.name}
                      </Badge>
                    )}
                    {rank.is_default && <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">Default</Badge>}
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(rank.id)} className="text-red-400 hover:text-red-300 hover:bg-red-900/20 flex-shrink-0 h-7 w-7 p-0"><Trash2 size={13} /></Button>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
