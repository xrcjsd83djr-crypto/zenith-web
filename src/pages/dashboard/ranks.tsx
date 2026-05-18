import { useState, useEffect, useCallback } from "react";
  import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
  import { Button } from "@/components/ui/button";
  import { Badge } from "@/components/ui/badge";
  import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
  import { Label } from "@/components/ui/label";
  import { Input } from "@/components/ui/input";
  import { Plus, Trash2, Loader2, RefreshCw, Trophy, AlertCircle } from "lucide-react";
  import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

  interface Rank { id: string; name: string; level: number; color: string; discord_role_id?: string; is_default: boolean; created_at: string; }

  export default function RanksPage({ guildId }: { guildId: string }) {
    const [ranks, setRanks] = useState<Rank[]>([]);
    const [roles, setRoles] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [open, setOpen] = useState(false);
    const [creating, setCreating] = useState(false);
    const [form, setForm] = useState({ name: "", level: "1", color: "#d4af37", discordRoleId: "" });
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
      if (!form.name.trim()) { setError("Rank name is required."); return; }
      setCreating(true); setError("");
      try {
        const res = await fetch(`/api/guilds/${guildId}/ranks`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
          body: JSON.stringify({ name: form.name, level: parseInt(form.level) || 1, color: form.color, discordRoleId: form.discordRoleId || null }),
        });
        if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Failed'); }
        setOpen(false); setForm({ name: "", level: "1", color: "#d4af37", discordRoleId: "" });
        fetchAll();
      } catch (err: any) { setError(err.message); }
      setCreating(false);
    };

    const handleDelete = async (id: string) => {
      if (!confirm("Delete this rank?")) return;
      await fetch(`/api/guilds/${guildId}/ranks/${id}`, { method: 'DELETE', credentials: 'include' });
      fetchAll();
    };

    const sorted = [...ranks].sort((a, b) => b.level - a.level);

    if (loading) return (
      <div className="flex justify-center items-center py-20">
        <div className="w-7 h-7 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#d4af37', borderTopColor: 'transparent' }} />
      </div>
    );

    return (
      <div className="space-y-5 max-w-3xl">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight flex items-center gap-2">
              <Trophy className="w-6 h-6" style={{ color: '#d4af37' }} /> Rank Hierarchy
            </h2>
            <p className="text-muted-foreground mt-0.5 text-sm">Define staff ranks and link them to Discord roles.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={fetchAll} className="gap-1.5"><RefreshCw size={13} />Refresh</Button>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button size="sm" style={{ background: 'linear-gradient(135deg,#d4af37,#ffd700)', color: '#5a3e10', border: 'none' }} className="gap-1.5 font-semibold">
                  <Plus size={14} /> Add Rank
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-white border-border max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Trophy size={18} style={{ color: '#d4af37' }} /> Add Rank
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreate} className="space-y-4 mt-2">
                  <div className="space-y-1.5">
                    <Label className="font-semibold">Rank Name *</Label>
                    <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Senior Officer" required className="bg-white border-border" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="font-semibold">Level</Label>
                      <p className="text-xs text-muted-foreground">Higher = more senior</p>
                      <Input type="number" value={form.level} onChange={e => setForm(f => ({ ...f, level: e.target.value }))} className="bg-white border-border" min={1} max={100} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="font-semibold">Color</Label>
                      <div className="flex gap-2">
                        <input type="color" value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} className="w-10 h-9 rounded cursor-pointer border border-border" />
                        <Input value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} className="bg-white border-border font-mono text-sm" />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="font-semibold">Link to Discord Role (optional)</Label>
                    <Select value={form.discordRoleId || "none"} onValueChange={v => setForm(f => ({ ...f, discordRoleId: v === 'none' ? '' : v }))}>
                      <SelectTrigger className="bg-white border-border"><SelectValue placeholder="Select role" /></SelectTrigger>
                      <SelectContent className="bg-white border-border">
                        <SelectItem value="none">None</SelectItem>
                        {roles.map(r => <SelectItem key={r.id} value={r.id}>@{r.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  {error && <p className="text-red-600 text-sm flex items-center gap-1.5"><AlertCircle size={13} />{error}</p>}
                  <div className="flex justify-end gap-2 pt-1">
                    <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                    <Button type="submit" disabled={creating} style={{ background: 'linear-gradient(135deg,#d4af37,#ffd700)', color: '#5a3e10', border: 'none' }}>
                      {creating ? <><Loader2 size={13} className="animate-spin mr-1" />Creating...</> : "Create Rank"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {sorted.length === 0 ? (
          <Card className="border-border bg-white shadow-sm">
            <CardContent className="py-16 text-center">
              <Trophy className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="font-semibold text-muted-foreground">No ranks configured yet</p>
              <p className="text-sm text-muted-foreground mt-1">Add ranks to define your staff hierarchy from lowest to highest.</p>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-border bg-white shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold text-muted-foreground uppercase tracking-wider">{sorted.length} Rank{sorted.length !== 1 ? 's' : ''} — highest to lowest</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 pt-0">
              {sorted.map((rank, i) => {
                const linkedRole = roles.find(r => r.id === rank.discord_role_id);
                return (
                  <div key={rank.id} className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border bg-muted/20 hover:bg-muted/40 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-xs font-bold text-muted-foreground w-5 flex-shrink-0">{i + 1}.</span>
                      <div className="w-3.5 h-3.5 rounded-full flex-shrink-0" style={{ background: rank.color || '#d4af37' }} />
                      <div className="min-w-0">
                        <div className="font-semibold text-sm truncate">{rank.name}</div>
                        <div className="text-xs text-muted-foreground">Level {rank.level}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {linkedRole && (
                        <Badge variant="outline" className="text-[10px] hidden sm:flex">@{linkedRole.name}</Badge>
                      )}
                      {rank.is_default && (
                        <Badge className="text-[10px] bg-amber-100 text-amber-700 border-amber-200">Default</Badge>
                      )}
                      <button onClick={() => handleDelete(rank.id)} className="text-muted-foreground hover:text-red-500 transition-colors">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}
      </div>
    );
  }
  