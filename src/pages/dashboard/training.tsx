import { useState, useEffect, useCallback } from "react";
  import { Card, CardContent } from "@/components/ui/card";
  import { Button } from "@/components/ui/button";
  import { Badge } from "@/components/ui/badge";
  import { Input } from "@/components/ui/input";
  import { Label } from "@/components/ui/label";
  import { Textarea } from "@/components/ui/textarea";
  import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
  import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
  import { Switch } from "@/components/ui/switch";
  import { GraduationCap, Plus, Trash2, RefreshCw, CheckCircle, Clock, ChevronDown, ChevronUp, X, Search } from "lucide-react";

  interface Program { id: string; name: string; description: string; required: boolean; category: string; created_at: string; completion_count?: number; }
  interface Completion { id: string; program_id: string; program_name: string; user_id: string; username: string; completed_by: string; completed_by_name: string; score?: number; notes?: string; completed_at: string; }

  function CompRow({ c }: { c: Completion }) {
    const [open, setOpen] = useState(false);
    return (
      <div className="border border-border rounded-lg overflow-hidden mb-2">
        <button onClick={() => setOpen(o => !o)} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors text-left">
          <CheckCircle size={14} className="text-green-500 flex-shrink-0" />
          <div className="flex-1 min-w-0"><span className="font-semibold text-sm">{c.username}</span><span className="text-muted-foreground text-xs ml-2">{c.program_name}</span></div>
          <span className="text-muted-foreground text-xs flex-shrink-0">{new Date(c.completed_at).toLocaleDateString()}</span>
          {open ? <ChevronUp size={14} className="text-muted-foreground" /> : <ChevronDown size={14} className="text-muted-foreground" />}
        </button>
        {open && (
          <div className="px-4 pb-4 border-t bg-muted/20">
            <div className="grid grid-cols-2 gap-3 mt-3 text-sm">
              <div><p className="text-xs text-muted-foreground font-medium">Staff</p><p className="font-semibold">{c.username}</p></div>
              <div><p className="text-xs text-muted-foreground font-medium">Program</p><p>{c.program_name}</p></div>
              <div><p className="text-xs text-muted-foreground font-medium">Certified By</p><p>{c.completed_by_name}</p></div>
              <div><p className="text-xs text-muted-foreground font-medium">Completed</p><p>{new Date(c.completed_at).toLocaleString()}</p></div>
              {c.score != null && <div><p className="text-xs text-muted-foreground font-medium">Score</p><p className="font-mono font-bold">{c.score}%</p></div>}
              {c.notes && <div className="col-span-2"><p className="text-xs text-muted-foreground font-medium">Notes</p><p>{c.notes}</p></div>}
            </div>
          </div>
        )}
      </div>
    );
  }

  export default function TrainingPage({ guildId }: { guildId: string }) {
    const [programs, setPrograms] = useState<Program[]>([]);
    const [completions, setCompletions] = useState<Completion[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [newProg, setNewProg] = useState<Partial<Program> | null>(null);
    const [logOpen, setLogOpen] = useState<Program | null>(null);
    const [logForm, setLogForm] = useState({ username: "", userId: "", score: "", notes: "", byName: "", byId: "" });
    const [saving, setSaving] = useState(false);
    const [tab, setTab] = useState<"programs" | "completions">("programs");

    const fetchAll = useCallback(async () => {
      setLoading(true);
      try {
        const [pR, cR] = await Promise.all([
          fetch(`/api/guilds/${guildId}/training/programs`, { credentials: "include" }),
          fetch(`/api/guilds/${guildId}/training/completions`, { credentials: "include" }),
        ]);
        if (pR.ok) setPrograms(await pR.json());
        if (cR.ok) setCompletions(await cR.json());
      } catch {}
      setLoading(false);
    }, [guildId]);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    const saveProgram = async () => {
      if (!newProg?.name) return;
      setSaving(true);
      try {
        const res = await fetch(`/api/guilds/${guildId}/training/programs`, {
          method: "POST", credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newProg),
        });
        if (res.ok) { setNewProg(null); fetchAll(); }
      } catch {}
      setSaving(false);
    };

    const logCompletion = async () => {
      if (!logOpen || !logForm.username) return;
      setSaving(true);
      try {
        const res = await fetch(`/api/guilds/${guildId}/training/completions`, {
          method: "POST", credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ programId: logOpen.id, username: logForm.username, score: logForm.score || null, notes: logForm.notes, completedByName: logForm.byName }),
        });
        if (res.ok) { setLogOpen(null); setLogForm({ username: "", userId: "", score: "", notes: "", byName: "", byId: "" }); fetchAll(); }
      } catch {}
      setSaving(false);
    };

    const deleteProgram = async (id: string) => {
      if (!confirm("Delete this training program?")) return;
      await fetch(`/api/guilds/${guildId}/training/programs/${id}`, { method: "DELETE", credentials: "include" });
      fetchAll();
    };

    const gold = { background: "#d4af37", color: "#000" };
    const filtered = completions.filter(c => !search || c.username.toLowerCase().includes(search.toLowerCase()) || c.program_name.toLowerCase().includes(search.toLowerCase()));

    return (
      <div className="space-y-5 max-w-4xl">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight flex items-center gap-2"><GraduationCap className="w-6 h-6" style={{ color: "#d4af37" }} />Training Management</h2>
            <p className="text-muted-foreground mt-0.5 text-sm">{programs.length} programs • {completions.length} completions logged</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchAll} className="gap-1.5"><RefreshCw size={13} />Refresh</Button>
            <Button size="sm" onClick={() => setTab(t => t === "programs" ? "completions" : "programs")} variant="outline">{tab === "programs" ? "View Completions" : "View Programs"}</Button>
          </div>
        </div>

        {tab === "programs" ? (
          <div className="space-y-3">
            <div className="flex justify-end">
              <Button size="sm" onClick={() => setNewProg({ name: "", description: "", required: false, category: "general" })} style={gold} className="gap-1.5"><Plus size={13} />New Program</Button>
            </div>
            {loading ? <div className="flex justify-center py-12"><div className="w-7 h-7 rounded-full border-2 animate-spin" style={{ borderColor: "#d4af37", borderTopColor: "transparent" }} /></div>
              : programs.length === 0 ? <Card><CardContent className="py-12 text-center text-muted-foreground text-sm">No training programs. Create your first one to start tracking certifications.</CardContent></Card>
              : programs.map(p => (
                <Card key={p.id}>
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <h3 className="font-semibold text-sm">{p.name}</h3>
                        <Badge className={"text-xs border " + (p.required ? "bg-red-50 text-red-700 border-red-200" : "bg-gray-50 text-gray-600 border-gray-200")}>{p.required ? "Required" : "Optional"}</Badge>
                        {p.category && <Badge className="text-xs border bg-blue-50 text-blue-700 border-blue-200 capitalize">{p.category}</Badge>}
                      </div>
                      {p.description && <p className="text-xs text-muted-foreground">{p.description}</p>}
                      <p className="text-xs text-muted-foreground mt-1">{p.completion_count || 0} completions</p>
                    </div>
                    <div className="flex gap-1.5">
                      <Button size="sm" variant="outline" onClick={() => setLogOpen(p)} className="text-xs h-8 gap-1"><CheckCircle size={12} />Log</Button>
                      <Button size="sm" variant="outline" onClick={() => deleteProgram(p.id)} className="text-red-500 border-red-200 hover:bg-red-50 h-8"><Trash2 size={12} /></Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="relative"><Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" /><Input placeholder="Search by name or program..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9 text-sm" /></div>
            {loading ? <div className="flex justify-center py-12"><div className="w-7 h-7 rounded-full border-2 animate-spin" style={{ borderColor: "#d4af37", borderTopColor: "transparent" }} /></div>
              : filtered.length === 0 ? <Card><CardContent className="py-12 text-center text-muted-foreground text-sm">No training completions yet.</CardContent></Card>
              : filtered.map(c => <CompRow key={c.id} c={c} />)}
          </div>
        )}

        {/* New Program Dialog */}
        <Dialog open={!!newProg} onOpenChange={o => { if (!o) setNewProg(null); }}>
          <DialogContent>
            <DialogHeader><DialogTitle>New Training Program</DialogTitle></DialogHeader>
            {newProg && (
              <div className="space-y-4 pt-2">
                <div><Label className="text-xs">Program Name *</Label><Input value={newProg.name || ""} onChange={e => setNewProg(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Basic Patrol Certification" className="h-9 text-sm mt-1" /></div>
                <div><Label className="text-xs">Description</Label><Textarea value={newProg.description || ""} onChange={e => setNewProg(p => ({ ...p, description: e.target.value }))} placeholder="What does this training cover?" rows={2} className="text-sm mt-1" /></div>
                <div><Label className="text-xs">Category</Label>
                  <Select value={newProg.category || "general"} onValueChange={v => setNewProg(p => ({ ...p, category: v }))}>
                    <SelectTrigger className="h-9 text-sm mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="general">General</SelectItem><SelectItem value="patrol">Patrol</SelectItem><SelectItem value="leadership">Leadership</SelectItem><SelectItem value="technical">Technical</SelectItem><SelectItem value="safety">Safety</SelectItem></SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2"><Switch checked={!!newProg.required} onCheckedChange={v => setNewProg(p => ({ ...p, required: v }))} /><Label className="text-sm">Required for all staff</Label></div>
                <div className="flex gap-2 pt-2">
                  <Button onClick={saveProgram} disabled={saving || !newProg.name?.trim()} style={gold} className="flex-1">{saving ? "Saving…" : "Create Program"}</Button>
                  <Button variant="outline" onClick={() => setNewProg(null)}>Cancel</Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Log Completion Dialog */}
        <Dialog open={!!logOpen} onOpenChange={o => { if (!o) setLogOpen(null); }}>
          <DialogContent>
            <DialogHeader><DialogTitle>Log Completion — {logOpen?.name}</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div><Label className="text-xs">Staff Username *</Label><Input value={logForm.username} onChange={e => setLogForm(f => ({ ...f, username: e.target.value }))} placeholder="Discord username" className="h-9 text-sm mt-1" /></div>
              <div><Label className="text-xs">Score (%)</Label><Input type="number" min={0} max={100} value={logForm.score} onChange={e => setLogForm(f => ({ ...f, score: e.target.value }))} placeholder="Optional" className="h-9 text-sm mt-1" /></div>
              <div><Label className="text-xs">Certified By</Label><Input value={logForm.byName} onChange={e => setLogForm(f => ({ ...f, byName: e.target.value }))} placeholder="Your name" className="h-9 text-sm mt-1" /></div>
              <div><Label className="text-xs">Notes</Label><Textarea value={logForm.notes} onChange={e => setLogForm(f => ({ ...f, notes: e.target.value }))} placeholder="Any notes about this completion..." rows={2} className="text-sm mt-1" /></div>
              <div className="flex gap-2">
                <Button onClick={logCompletion} disabled={saving || !logForm.username} style={gold} className="flex-1">{saving ? "Saving…" : "Log Completion"}</Button>
                <Button variant="outline" onClick={() => setLogOpen(null)}>Cancel</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }
  