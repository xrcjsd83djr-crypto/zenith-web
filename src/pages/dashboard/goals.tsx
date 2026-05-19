import { useState, useEffect, useCallback } from "react";
  import { Card, CardContent } from "@/components/ui/card";
  import { Button } from "@/components/ui/button";
  import { Badge } from "@/components/ui/badge";
  import { Input } from "@/components/ui/input";
  import { Label } from "@/components/ui/label";
  import { Textarea } from "@/components/ui/textarea";
  import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
  import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
  import { Progress } from "@/components/ui/progress";
  import { Target, Plus, Trash2, RefreshCw, ChevronDown, ChevronUp, CheckCircle2, Clock } from "lucide-react";

  interface Goal { id: string; title: string; description?: string; target_value?: number; current_value?: number; unit?: string; due_date?: string; status: string; user_id?: string; username?: string; created_by: string; created_by_name: string; created_at: string; }

  function GoalRow({ g, onDelete, onUpdate }: { g: Goal; onDelete: (id: string) => void; onUpdate: (id: string, currentValue: number) => void; }) {
    const [open, setOpen] = useState(false);
    const [newVal, setNewVal] = useState(String(g.current_value ?? 0));
    const pct = g.target_value ? Math.min(100, Math.round(((g.current_value || 0) / g.target_value) * 100)) : 0;
    const statusColor: Record<string, string> = { active: "bg-blue-100 text-blue-700 border-blue-200", completed: "bg-green-100 text-green-700 border-green-200", cancelled: "bg-gray-100 text-gray-500 border-gray-200" };
    return (
      <div className="border border-border rounded-lg overflow-hidden mb-2">
        <button onClick={() => setOpen(o => !o)} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors text-left">
          <Badge className={`${statusColor[g.status] || "bg-gray-100 text-gray-500 border"} border text-xs capitalize`}>{g.status}</Badge>
          <div className="flex-1 min-w-0"><span className="font-semibold text-sm">{g.title}</span>{g.username && <span className="text-muted-foreground text-xs ml-2">→ {g.username}</span>}</div>
          {g.target_value && <span className="text-muted-foreground text-xs flex-shrink-0">{g.current_value || 0}/{g.target_value} {g.unit || ""}</span>}
          {open ? <ChevronUp size={14} className="text-muted-foreground" /> : <ChevronDown size={14} className="text-muted-foreground" />}
        </button>
        {open && (
          <div className="px-4 pb-4 border-t bg-muted/20 space-y-3">
            <div className="grid grid-cols-2 gap-3 mt-3 text-sm">
              <div><p className="text-xs text-muted-foreground font-medium">Assigned To</p><p className="font-semibold">{g.username || "All Staff"}</p></div>
              <div><p className="text-xs text-muted-foreground font-medium">Status</p><Badge className={`${statusColor[g.status] || ""} border text-xs capitalize`}>{g.status}</Badge></div>
              {g.due_date && <div><p className="text-xs text-muted-foreground font-medium">Due Date</p><p>{new Date(g.due_date).toLocaleDateString()}</p></div>}
              <div><p className="text-xs text-muted-foreground font-medium">Created By</p><p>{g.created_by_name}</p></div>
              {g.description && <div className="col-span-2"><p className="text-xs text-muted-foreground font-medium">Description</p><p>{g.description}</p></div>}
            </div>
            {g.target_value && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-xs text-muted-foreground font-medium">Progress</p>
                  <span className="text-xs font-bold">{pct}%</span>
                </div>
                <Progress value={pct} className="h-2" />
                <div className="flex items-center gap-2 mt-2">
                  <Input type="number" value={newVal} onChange={e => setNewVal(e.target.value)} className="h-8 text-sm w-24" />
                  <span className="text-sm text-muted-foreground">{g.unit || ""} current</span>
                  <Button size="sm" variant="outline" className="text-xs h-8" onClick={() => onUpdate(g.id, parseFloat(newVal) || 0)}>Update</Button>
                </div>
              </div>
            )}
            <Button size="sm" variant="outline" onClick={() => onDelete(g.id)} className="text-red-500 border-red-200 hover:bg-red-50 text-xs h-8"><Trash2 size={12} className="mr-1" />Delete Goal</Button>
          </div>
        )}
      </div>
    );
  }

  export default function GoalsPage({ guildId }: { guildId: string }) {
    const [goals, setGoals] = useState<Goal[]>([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [form, setForm] = useState({ title: "", description: "", targetValue: "", unit: "", dueDate: "", username: "", type: "server" });
    const [saving, setSaving] = useState(false);

    const fetchAll = useCallback(async () => {
      setLoading(true);
      try {
        const r = await fetch(`/api/guilds/${guildId}/goals`, { credentials: "include" });
        if (r.ok) setGoals(await r.json());
      } catch {}
      setLoading(false);
    }, [guildId]);
    useEffect(() => { fetchAll(); }, [fetchAll]);

    const saveGoal = async () => {
      setSaving(true);
      try {
        const r = await fetch(`/api/guilds/${guildId}/goals`, {
          method: "POST", credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: form.title, description: form.description, targetValue: form.targetValue ? parseFloat(form.targetValue) : null, unit: form.unit, dueDate: form.dueDate || null, username: form.username || null }),
        });
        if (r.ok) { setCreating(false); setForm({ title: "", description: "", targetValue: "", unit: "", dueDate: "", username: "", type: "server" }); fetchAll(); }
      } catch {}
      setSaving(false);
    };

    const deleteGoal = async (id: string) => {
      await fetch(`/api/guilds/${guildId}/goals/${id}`, { method: "DELETE", credentials: "include" });
      fetchAll();
    };

    const updateGoal = async (id: string, val: number) => {
      await fetch(`/api/guilds/${guildId}/goals/${id}`, {
        method: "PATCH", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentValue: val }),
      });
      fetchAll();
    };

    const gold = { background: "#d4af37", color: "#000" };
    const active = goals.filter(g => g.status === "active");
    const done = goals.filter(g => g.status === "completed");

    return (
      <div className="space-y-5 max-w-4xl">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight flex items-center gap-2"><Target className="w-6 h-6" style={{ color: "#d4af37" }} />Staff Goals</h2>
            <p className="text-muted-foreground mt-0.5 text-sm">{active.length} active • {done.length} completed — set targets, track progress</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchAll} className="gap-1.5"><RefreshCw size={13} />Refresh</Button>
            <Button size="sm" onClick={() => setCreating(true)} style={gold} className="gap-1.5"><Plus size={13} />New Goal</Button>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Card><CardContent className="p-3 text-center"><p className="text-2xl font-bold text-blue-600">{active.length}</p><p className="text-xs text-muted-foreground">Active Goals</p></CardContent></Card>
          <Card><CardContent className="p-3 text-center"><p className="text-2xl font-bold text-green-600">{done.length}</p><p className="text-xs text-muted-foreground">Completed</p></CardContent></Card>
          <Card><CardContent className="p-3 text-center"><p className="text-2xl font-bold">{goals.length}</p><p className="text-xs text-muted-foreground">Total</p></CardContent></Card>
        </div>
        {loading ? <div className="flex justify-center py-12"><div className="w-7 h-7 rounded-full border-2 animate-spin" style={{ borderColor: "#d4af37", borderTopColor: "transparent" }} /></div>
          : goals.length === 0 ? <Card><CardContent className="py-12 text-center text-muted-foreground text-sm">No goals set. Create your first goal to start tracking staff targets.</CardContent></Card>
          : goals.map(g => <GoalRow key={g.id} g={g} onDelete={deleteGoal} onUpdate={updateGoal} />)}
        <Dialog open={creating} onOpenChange={o => { if (!o) setCreating(false); }}>
          <DialogContent>
            <DialogHeader><DialogTitle>New Staff Goal</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div><Label className="text-xs">Goal Title *</Label><Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Complete 10 patrol hours this month" className="h-9 text-sm mt-1" /></div>
              <div><Label className="text-xs">Description</Label><Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} className="text-sm mt-1" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs">Target Value</Label><Input type="number" value={form.targetValue} onChange={e => setForm(f => ({ ...f, targetValue: e.target.value }))} placeholder="e.g. 10" className="h-9 text-sm mt-1" /></div>
                <div><Label className="text-xs">Unit</Label><Input value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} placeholder="hours, strikes, etc." className="h-9 text-sm mt-1" /></div>
                <div><Label className="text-xs">Due Date</Label><Input type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} className="h-9 text-sm mt-1" /></div>
                <div><Label className="text-xs">Assign To (optional)</Label><Input value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} placeholder="Username or leave blank for all" className="h-9 text-sm mt-1" /></div>
              </div>
              <div className="flex gap-2">
                <Button onClick={saveGoal} disabled={saving || !form.title} style={gold} className="flex-1">{saving ? "Saving…" : "Create Goal"}</Button>
                <Button variant="outline" onClick={() => setCreating(false)}>Cancel</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }
  