import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckSquare, Plus, RefreshCw, CheckCircle, AlertCircle, Loader2, ChevronDown, ChevronUp, Search, Calendar, User, X } from "lucide-react";

interface Task {
  id: string; guild_id: string; title: string; description?: string;
  assignee_id?: string; assignee_username?: string; assigned_by?: string; assigned_by_name?: string;
  priority: "low" | "medium" | "high" | "urgent"; status: "open" | "in_progress" | "completed" | "cancelled";
  due_date?: string; created_at: string; completed_at?: string;
}
interface Member { id: string; username: string; }

const PRIORITY_CONFIG: Record<string, { label: string; class: string }> = {
  low: { label: "Low", class: "bg-gray-100 text-gray-600 border-gray-200" },
  medium: { label: "Medium", class: "bg-blue-100 text-blue-700 border-blue-200" },
  high: { label: "High", class: "bg-orange-100 text-orange-700 border-orange-200" },
  urgent: { label: "Urgent", class: "bg-red-100 text-red-700 border-red-200" },
};
const STATUS_CONFIG: Record<string, { label: string; class: string }> = {
  open: { label: "Open", class: "bg-blue-100 text-blue-700 border-blue-200" },
  in_progress: { label: "In Progress", class: "bg-amber-100 text-amber-700 border-amber-200" },
  completed: { label: "Done", class: "bg-green-100 text-green-700 border-green-200" },
  cancelled: { label: "Cancelled", class: "bg-gray-100 text-gray-500 border-gray-200" },
};

function TaskCard({ task, guildId, onUpdated }: { task: Task; guildId: string; onUpdated: () => void }) {
  const [open, setOpen] = useState(false);
  const [updating, setUpdating] = useState(false);

  const updateStatus = async (status: string) => {
    setUpdating(true);
    try {
      await fetch(`/api/guilds/${guildId}/tasks/${task.id}`, {
        method: 'PATCH', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      onUpdated();
    } catch {}
    setUpdating(false);
  };

  const prio = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium;
  const status = STATUS_CONFIG[task.status] || STATUS_CONFIG.open;
  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status === 'open';

  return (
    <div className={`border rounded-lg overflow-hidden mb-2 ${isOverdue ? 'border-red-200' : 'border-border'}`}>
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors text-left">
        <CheckSquare size={16} className={`flex-shrink-0 ${task.status === 'completed' ? 'text-green-500' : 'text-muted-foreground'}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`font-semibold text-sm ${task.status === 'completed' ? 'line-through text-muted-foreground' : ''}`}>{task.title}</span>
            <Badge className={`text-[10px] border ${prio.class}`}>{prio.label}</Badge>
            <Badge className={`text-[10px] border ${status.class}`}>{status.label}</Badge>
            {isOverdue && <Badge className="text-[10px] border bg-red-100 text-red-700 border-red-200">Overdue</Badge>}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {task.assignee_username ? `Assigned to ${task.assignee_username}` : 'Unassigned'}
            {task.due_date && ` • Due ${new Date(task.due_date).toLocaleDateString()}`}
          </p>
        </div>
        {open ? <ChevronUp size={14} className="text-muted-foreground" /> : <ChevronDown size={14} className="text-muted-foreground" />}
      </button>
      {open && (
        <div className="px-4 pb-4 border-t border-border bg-muted/10">
          <div className="space-y-3 mt-3">
            {task.description && <div><p className="text-xs text-muted-foreground font-medium">Description</p><p className="text-sm">{task.description}</p></div>}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {task.assignee_username && <div><p className="text-xs text-muted-foreground font-medium">Assigned To</p><p className="text-sm font-medium">{task.assignee_username}</p></div>}
              {task.assigned_by_name && <div><p className="text-xs text-muted-foreground font-medium">Assigned By</p><p className="text-sm">{task.assigned_by_name}</p></div>}
              {task.due_date && <div><p className="text-xs text-muted-foreground font-medium">Due Date</p><p className={`text-sm ${isOverdue ? 'text-red-600 font-semibold' : ''}`}>{new Date(task.due_date).toLocaleDateString()}</p></div>}
              <div><p className="text-xs text-muted-foreground font-medium">Created</p><p className="text-sm">{new Date(task.created_at).toLocaleDateString()}</p></div>
            </div>
            {task.status !== 'completed' && task.status !== 'cancelled' && (
              <div className="flex gap-2 flex-wrap">
                <Button size="sm" variant="outline" onClick={() => updateStatus('in_progress')} disabled={updating || task.status === 'in_progress'} className="text-xs h-8 gap-1">
                  {updating ? <Loader2 size={11} className="animate-spin" /> : null}In Progress
                </Button>
                <Button size="sm" onClick={() => updateStatus('completed')} disabled={updating} className="text-xs h-8 gap-1 bg-green-600 hover:bg-green-700 text-white">
                  <CheckCircle size={11} />Mark Complete
                </Button>
                <Button size="sm" variant="outline" onClick={() => updateStatus('cancelled')} disabled={updating} className="text-xs h-8 text-red-500 border-red-200 hover:bg-red-50 gap-1">
                  <X size={11} />Cancel
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function TasksPage({ guildId }: { guildId: string }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [me, setMe] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('open');
  const [form, setForm] = useState({ title: '', description: '', assigneeId: '', priority: 'medium', dueDate: '' });
  const [toast, setToast] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const showToast = (type: "ok" | "err", text: string) => { setToast({ type, text }); setTimeout(() => setToast(null), 4000); };

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [tRes, mRes, meRes] = await Promise.allSettled([
        fetch(`/api/guilds/${guildId}/tasks`, { credentials: 'include' }),
        fetch(`/api/guilds/${guildId}/members`, { credentials: 'include' }),
        fetch('/api/me', { credentials: 'include' }),
      ]);
      if (tRes.status === 'fulfilled' && tRes.value.ok) { const d = await tRes.value.json().catch(() => []); setTasks(Array.isArray(d) ? d : []); }
      if (mRes.status === 'fulfilled' && mRes.value.ok) { const d = await mRes.value.json().catch(() => []); setMembers(Array.isArray(d) ? d : []); }
      if (meRes.status === 'fulfilled' && meRes.value.ok) setMe(await meRes.value.json().catch(() => null));
    } catch {}
    setLoading(false);
  }, [guildId]);
  useEffect(() => { fetchAll(); }, [fetchAll]);

  const filtered = tasks.filter(t => {
    if (statusFilter !== 'all' && t.status !== statusFilter) return false;
    if (search && !t.title.toLowerCase().includes(search.toLowerCase()) && !(t.assignee_username || '').toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const counts = { open: tasks.filter(t => t.status === 'open').length, in_progress: tasks.filter(t => t.status === 'in_progress').length, completed: tasks.filter(t => t.status === 'completed').length };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return showToast("err", "Title is required.");
    setSubmitting(true);
    try {
      const assignee = members.find(m => m.id === form.assigneeId);
      const res = await fetch(`/api/guilds/${guildId}/tasks`, {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title, description: form.description || null,
          assigneeId: form.assigneeId || null, assigneeUsername: assignee?.username || null,
          priority: form.priority, dueDate: form.dueDate || null,
          assignedBy: me?.id, assignedByName: me?.username,
        }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((d as any).error || 'Failed');
      showToast("ok", "Task created!");
      setOpen(false);
      setForm({ title: '', description: '', assigneeId: '', priority: 'medium', dueDate: '' });
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
            <CheckSquare className="w-6 h-6" style={{ color: '#d4af37' }} />Task Manager
          </h2>
          <p className="text-muted-foreground mt-0.5 text-sm">Assign and track tasks across your team</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchAll} className="gap-1.5"><RefreshCw size={13} />Refresh</Button>
          <Button size="sm" onClick={() => setOpen(true)} className="gap-1.5" style={{ background: '#d4af37', color: '#000' }}><Plus size={13} />New Task</Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card><CardContent className="p-4"><p className="text-2xl font-bold text-blue-600">{counts.open}</p><p className="text-xs text-muted-foreground">Open</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-2xl font-bold text-amber-600">{counts.in_progress}</p><p className="text-xs text-muted-foreground">In Progress</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-2xl font-bold text-green-600">{counts.completed}</p><p className="text-xs text-muted-foreground">Completed</p></CardContent></Card>
      </div>

      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search tasks..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9 text-sm" />
        </div>
        <div className="flex gap-1">
          {[['all', 'All'], ['open', 'Open'], ['in_progress', 'In Progress'], ['completed', 'Done']].map(([v, l]) => (
            <Button key={v} size="sm" variant={statusFilter === v ? 'default' : 'outline'} onClick={() => setStatusFilter(v)} className="text-xs h-9">{l}</Button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="w-7 h-7 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#d4af37', borderTopColor: 'transparent' }} /></div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground text-sm">
          <CheckSquare size={32} className="mx-auto mb-2 text-muted-foreground/40" />
          {statusFilter !== 'all' ? `No ${statusFilter.replace('_', ' ')} tasks.` : 'No tasks yet. Create one above.'}
        </CardContent></Card>
      ) : (
        <div>{filtered.map(t => <TaskCard key={t.id} task={t} guildId={guildId} onUpdated={fetchAll} />)}</div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><CheckSquare size={18} />New Task</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-3 mt-2">
            <div className="space-y-1.5"><Label>Task Title *</Label><Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="What needs to be done?" required /></div>
            <div className="space-y-1.5"><Label>Description</Label><Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Details about this task..." rows={3} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Assign To</Label>
                <Select value={form.assigneeId} onValueChange={v => setForm(f => ({ ...f, assigneeId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select member" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Unassigned</SelectItem>
                    {members.map(m => <SelectItem key={m.id} value={m.id}>{m.username}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Priority</Label>
                <Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5"><Label>Due Date (optional)</Label><Input type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} /></div>
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={submitting} style={{ background: '#d4af37', color: '#000' }}>
                {submitting ? <><Loader2 size={14} className="animate-spin mr-1.5" />Creating…</> : "Create Task"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
