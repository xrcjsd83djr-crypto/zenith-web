import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { StickyNote, Plus, RefreshCw, AlertCircle, CheckCircle, Loader2, Lock, Search, Trash2, ChevronDown, ChevronUp, User } from "lucide-react";

interface Note { id: string; target_user_id: string; target_username: string; content: string; author_id?: string; author_username?: string; is_private: boolean; created_at: string; }
interface Member { id: string; username: string; }

function NoteCard({ note, me, guildId, onDeleted }: { note: Note; me: any; guildId: string; onDeleted: () => void }) {
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm(`Delete this note for ${note.target_username}?`)) return;
    setDeleting(true);
    try {
      await fetch(`/api/guilds/${guildId}/notes/${note.id}`, { method: 'DELETE', credentials: 'include' });
      onDeleted();
    } catch {}
    setDeleting(false);
  };

  const ts = new Date(note.created_at);
  const isLong = note.content.length > 120;

  return (
    <Card className={note.is_private ? 'border-amber-200' : ''}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <StickyNote size={16} className="mt-0.5 flex-shrink-0 text-amber-500" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="font-semibold text-sm">{note.target_username}</span>
              {note.is_private && (
                <Badge className="bg-amber-100 text-amber-700 border-amber-200 border text-[10px] gap-0.5">
                  <Lock size={9} />Private
                </Badge>
              )}
            </div>
            <p className="text-sm whitespace-pre-wrap">
              {isLong && !open ? note.content.slice(0, 120) + '…' : note.content}
            </p>
            {isLong && (
              <button onClick={() => setOpen(o => !o)} className="text-xs text-muted-foreground hover:text-foreground mt-1 flex items-center gap-1 transition-colors">
                {open ? <><ChevronUp size={11} />Show less</> : <><ChevronDown size={11} />Read more</>}
              </button>
            )}
            <p className="text-xs text-muted-foreground mt-1.5">
              Added by <span className="font-medium">{note.author_username || 'Unknown'}</span> • {ts.toLocaleDateString()} at {ts.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={handleDelete} disabled={deleting} className="text-red-400 hover:text-red-600 hover:bg-red-50 flex-shrink-0 h-7 w-7 p-0">
            {deleting ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function NotesPage({ guildId }: { guildId: string }) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [me, setMe] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [targetUserId, setTargetUserId] = useState('');
  const [targetUsername, setTargetUsername] = useState('');
  const [content, setContent] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const showToast = (type: "ok" | "err", text: string) => { setToast({ type, text }); setTimeout(() => setToast(null), 4000); };

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [nRes, mRes, meRes] = await Promise.allSettled([
        fetch(`/api/guilds/${guildId}/notes`, { credentials: 'include' }),
        fetch(`/api/guilds/${guildId}/members`, { credentials: 'include' }),
        fetch('/api/me', { credentials: 'include' }),
      ]);
      if (nRes.status === 'fulfilled') {
        if (nRes.value.ok) {
          const d = await nRes.value.json().catch(() => []);
          setNotes(Array.isArray(d) ? d : []);
        } else {
          const err = await nRes.value.json().catch(() => ({}));
          setError((err as any).error || `Server error ${nRes.value.status}`);
        }
      }
      if (mRes.status === 'fulfilled' && mRes.value.ok) { const d = await mRes.value.json().catch(() => []); setMembers(Array.isArray(d) ? d : []); }
      if (meRes.status === 'fulfilled' && meRes.value.ok) setMe(await meRes.value.json().catch(() => null));
    } catch (e: any) {
      setError(e.message || 'Network error');
    }
    setLoading(false);
  }, [guildId]);
  useEffect(() => { fetchAll(); }, [fetchAll]);

  const filtered = notes.filter(n =>
    !search || n.target_username.toLowerCase().includes(search.toLowerCase()) || n.content.toLowerCase().includes(search.toLowerCase())
  );
  const privateCount = notes.filter(n => n.is_private).length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUserId || !content.trim()) return showToast("err", "Select a staff member and enter note content.");
    setSubmitting(true);
    try {
      const res = await fetch(`/api/guilds/${guildId}/notes`, {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId, targetUsername, content: content.trim(), isPrivate, authorId: me?.id, authorUsername: me?.username }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((d as any).error || 'Failed to add note');
      showToast("ok", "Note added!");
      setOpen(false);
      setTargetUserId(''); setTargetUsername(''); setContent(''); setIsPrivate(false);
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
            <StickyNote className="w-6 h-6" style={{ color: '#d4af37' }} />Staff Notes
          </h2>
          <p className="text-muted-foreground mt-0.5 text-sm">
            {notes.length} notes on file — {privateCount} private (management only)
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchAll} className="gap-1.5"><RefreshCw size={13} />Refresh</Button>
          <Button size="sm" onClick={() => setOpen(true)} className="gap-1.5" style={{ background: '#d4af37', color: '#000' }}>
            <Plus size={13} />Add Note
          </Button>
        </div>
      </div>

      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search notes by name or content..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9 text-sm" />
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="w-7 h-7 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#d4af37', borderTopColor: 'transparent' }} /></div>
      ) : error ? (
        <Card className="border-red-200"><CardContent className="py-8 text-center">
          <AlertCircle size={24} className="mx-auto mb-2 text-red-500" />
          <p className="text-sm font-medium text-red-700 mb-3">{error}</p>
          <Button variant="outline" size="sm" onClick={fetchAll} className="gap-1.5"><RefreshCw size={13} />Try Again</Button>
        </CardContent></Card>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground text-sm">
          <StickyNote size={32} className="mx-auto mb-2 text-muted-foreground/40" />
          {search ? `No notes matching "${search}"` : 'No notes yet. Add the first one above.'}
        </CardContent></Card>
      ) : (
        <div className="space-y-2">{filtered.map(n => <NoteCard key={n.id} note={n} me={me} guildId={guildId} onDeleted={fetchAll} />)}</div>
      )}

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setTargetUserId(''); setTargetUsername(''); setContent(''); setIsPrivate(false); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><StickyNote size={18} />Add Staff Note</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label>Staff Member *</Label>
              {members.length > 0 ? (
                <Select value={targetUserId} onValueChange={v => { const m = members.find(m => m.id === v); setTargetUserId(v); setTargetUsername(m?.username || ''); }}>
                  <SelectTrigger><SelectValue placeholder="Select staff member" /></SelectTrigger>
                  <SelectContent>{members.map(m => <SelectItem key={m.id} value={m.id}>{m.username}</SelectItem>)}</SelectContent>
                </Select>
              ) : (
                <Input placeholder="Enter username" value={targetUsername} onChange={e => { setTargetUsername(e.target.value); setTargetUserId(e.target.value); }} />
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Note Content *</Label>
              <Textarea value={content} onChange={e => setContent(e.target.value)} placeholder="Write your note here..." rows={4} required />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <p className="text-sm font-medium flex items-center gap-1.5"><Lock size={13} />Private Note</p>
                <p className="text-xs text-muted-foreground mt-0.5">Only visible to management, not the staff member</p>
              </div>
              <Switch checked={isPrivate} onCheckedChange={setIsPrivate} />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={submitting} style={{ background: '#d4af37', color: '#000' }}>
                {submitting ? <><Loader2 size={14} className="animate-spin mr-1.5" />Adding…</> : "Add Note"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
