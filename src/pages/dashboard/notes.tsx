import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { StickyNote, Plus, RefreshCw, Trash2, Lock, AlertCircle, CheckCircle, Loader2 } from "lucide-react";

interface Note { id: string; target_user_id: string; target_username: string; content: string; author_username: string; is_private: boolean; created_at: string; }
interface StaffMember { user_id: string; username: string; }

export default function NotesPage({ guildId }: { guildId: string }) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [me, setMe] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ targetUserId: '', targetUsername: '', content: '', isPrivate: false });
  const [filterUser, setFilterUser] = useState('');
  const [toast, setToast] = useState<{ type: "ok"|"err"; text: string } | null>(null);

  const showToast = (type: "ok"|"err", text: string) => { setToast({ type, text }); setTimeout(() => setToast(null), 4000); };

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [nRes, sRes, meRes] = await Promise.all([
        fetch(`/api/guilds/${guildId}/notes${filterUser ? `?userId=${filterUser}` : ''}`, { credentials: 'include' }),
        fetch(`/api/guilds/${guildId}/staff`, { credentials: 'include' }),
        fetch('/api/me', { credentials: 'include' }),
      ]);
      if (nRes.ok) setNotes(await nRes.json());
      if (sRes.ok) setStaff(await sRes.json());
      if (meRes.ok) setMe(await meRes.json());
    } catch {}
    setLoading(false);
  }, [guildId, filterUser]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.targetUserId || !form.content.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/guilds/${guildId}/notes`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({ ...form, authorId: me?.id, authorUsername: me?.username }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      setOpen(false); setForm({ targetUserId: '', targetUsername: '', content: '', isPrivate: false });
      fetchAll(); showToast('ok', 'Note added.');
    } catch (err: any) { showToast('err', err.message); }
    setSubmitting(false);
  };

  const deleteNote = async (id: string) => {
    try {
      await fetch(`/api/guilds/${guildId}/notes/${id}`, { method: 'DELETE', credentials: 'include' });
      setNotes(n => n.filter(x => x.id !== id));
      showToast('ok', 'Note deleted.');
    } catch { showToast('err', 'Failed.'); }
  };

  const filtered = filterUser ? notes.filter(n => n.target_user_id === filterUser) : notes;

  if (loading) return <div className="flex justify-center py-20"><div className="w-7 h-7 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#d4af37', borderTopColor: 'transparent' }} /></div>;

  return (
    <div className="space-y-5 max-w-3xl">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium flex items-center gap-2 ${toast.type === 'ok' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {toast.type === 'ok' ? <CheckCircle size={15} /> : <AlertCircle size={15} />} {toast.text}
        </div>
      )}

      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight flex items-center gap-2"><StickyNote className="w-6 h-6" style={{ color: '#d4af37' }} />Staff Notes</h2>
          <p className="text-muted-foreground mt-0.5 text-sm">Internal management notes on staff members. Private notes are only visible to management.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchAll} className="gap-1.5"><RefreshCw size={13} />Refresh</Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" style={{ background: 'linear-gradient(135deg,#d4af37,#ffd700)', color: '#5a3e10', border: 'none' }} className="gap-1.5 font-semibold">
                <Plus size={14} /> Add Note
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-white border-border max-w-md">
              <DialogHeader><DialogTitle className="flex items-center gap-2"><StickyNote size={18} style={{ color: '#d4af37' }} />Add Staff Note</DialogTitle></DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 mt-2">
                <div className="space-y-1.5">
                  <Label className="font-semibold">Staff Member</Label>
                  <Select value={form.targetUserId} onValueChange={v => { const m = staff.find(x => x.user_id === v); setForm(f => ({ ...f, targetUserId: v, targetUsername: m?.username || v })); }}>
                    <SelectTrigger className="bg-white border-border"><SelectValue placeholder="Select member" /></SelectTrigger>
                    <SelectContent className="bg-white border-border max-h-52">{staff.map(m => <SelectItem key={m.user_id} value={m.user_id}>{m.username}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="font-semibold">Note</Label>
                  <Textarea value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} placeholder="Internal note about this staff member..." className="bg-white border-border min-h-[100px]" required />
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/30">
                  <Switch checked={form.isPrivate} onCheckedChange={v => setForm(f => ({ ...f, isPrivate: v }))} />
                  <div><p className="text-sm font-medium">Private note</p><p className="text-xs text-muted-foreground">Only visible to management</p></div>
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={submitting || !form.targetUserId} style={{ background: 'linear-gradient(135deg,#d4af37,#ffd700)', color: '#5a3e10', border: 'none' }}>
                    {submitting ? <><Loader2 size={13} className="animate-spin mr-1" />Saving...</> : "Add Note"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2 items-center">
        <Select value={filterUser} onValueChange={setFilterUser}>
          <SelectTrigger className="bg-white border-border text-sm w-52"><SelectValue placeholder="Filter by member" /></SelectTrigger>
          <SelectContent className="bg-white border-border">
            <SelectItem value="">All staff members</SelectItem>
            {staff.map(m => <SelectItem key={m.user_id} value={m.user_id}>{m.username}</SelectItem>)}
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground">{filtered.length} note{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {filtered.length === 0 ? (
        <Card className="border-border bg-white shadow-sm"><CardContent className="py-16 text-center"><StickyNote className="w-10 h-10 text-muted-foreground mx-auto mb-3" /><p className="font-semibold text-muted-foreground">No notes yet</p><p className="text-sm text-muted-foreground mt-1">Add internal management notes on staff members. These are private to your management team.</p></CardContent></Card>
      ) : (
        <div className="space-y-2">
          {filtered.map(n => (
            <Card key={n.id} className={`border-border bg-white shadow-sm ${n.is_private ? 'border-l-4 border-l-purple-300' : ''}`}>
              <CardContent className="p-4 flex gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-semibold text-sm">{n.target_username}</span>
                    {n.is_private && <Badge className="bg-purple-50 text-purple-700 border-purple-200 text-[10px] flex items-center gap-0.5"><Lock size={9} />Private</Badge>}
                    <span className="text-xs text-muted-foreground">by {n.author_username}</span>
                    <span className="text-xs text-muted-foreground">{new Date(n.created_at).toLocaleDateString()}</span>
                  </div>
                  <p className="text-sm text-foreground whitespace-pre-wrap">{n.content}</p>
                </div>
                <button onClick={() => deleteNote(n.id)} className="text-muted-foreground hover:text-red-500 transition-colors flex-shrink-0 mt-0.5">
                  <Trash2 size={14} />
                </button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
