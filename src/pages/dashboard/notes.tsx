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
  import { StickyNote, Plus, RefreshCw, AlertCircle, CheckCircle, Loader2, Lock, Search, Trash2 } from "lucide-react";

  interface Note { id: string; target_user_id: string; target_username: string; content: string; author_id?: string; author_username?: string; is_private: boolean; created_at: string; }
  interface Member { id: string; username: string; }

  export default function NotesPage({ guildId }: { guildId: string }) {
    const [notes, setNotes] = useState<Note[]>([]);
    const [members, setMembers] = useState<Member[]>([]);
    const [me, setMe] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [open, setOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [form, setForm] = useState({ targetUserId:'', targetUsername:'', content:'', isPrivate:false });
    const [search, setSearch] = useState('');
    const [toast, setToast] = useState<{type:"ok"|"err";text:string}|null>(null);
    const showToast = (type:"ok"|"err", text:string) => { setToast({type,text}); setTimeout(()=>setToast(null),4000); };

    const fetchAll = useCallback(async () => {
      setLoading(true);
      try {
        const [nRes, mRes, meRes] = await Promise.all([
          fetch(`/api/guilds/${guildId}/notes`, {credentials:'include'}),
          fetch(`/api/guilds/${guildId}/members`, {credentials:'include'}),
          fetch('/api/me', {credentials:'include'}),
        ]);
        if (nRes.ok) setNotes(await nRes.json());
        if (mRes.ok) setMembers(await mRes.json());
        if (meRes.ok) setMe(await meRes.json());
      } catch {}
      setLoading(false);
    }, [guildId]);
    useEffect(() => { fetchAll(); }, [fetchAll]);

    const filtered = notes.filter(n => !search || n.target_username.toLowerCase().includes(search.toLowerCase()) || n.content.toLowerCase().includes(search.toLowerCase()));

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!form.targetUserId || !form.content.trim()) return showToast("err","Select member and enter note content.");
      setSubmitting(true);
      try {
        const res = await fetch(`/api/guilds/${guildId}/notes`, {
          method:'POST', credentials:'include', headers:{'Content-Type':'application/json'},
          body: JSON.stringify({ targetUserId:form.targetUserId, targetUsername:form.targetUsername, content:form.content, isPrivate:form.isPrivate, authorId:me?.id, authorUsername:me?.username }),
        });
        const d = await res.json();
        if (!res.ok) throw new Error(d.error||'Failed to add note');
        showToast("ok","Note added!");
        setOpen(false); setForm({targetUserId:'',targetUsername:'',content:'',isPrivate:false}); fetchAll();
      } catch (err:any) { showToast("err",err.message); }
      setSubmitting(false);
    };

    const handleDelete = async (id: string, username: string) => {
      if (!confirm(`Delete this note for ${username}?`)) return;
      await fetch(`/api/guilds/${guildId}/notes/${id}`, {method:'DELETE',credentials:'include'});
      fetchAll();
    };

    return (
      <div className="space-y-5 max-w-4xl">
        {toast && <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm font-medium ${toast.type==='ok'?'bg-green-50 text-green-800 border border-green-200':'bg-red-50 text-red-800 border border-red-200'}`}>{toast.type==='ok'?<CheckCircle size={15}/>:<AlertCircle size={15}/>}{toast.text}</div>}
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight flex items-center gap-2"><StickyNote className="w-6 h-6" style={{color:'#d4af37'}}/>Staff Notes</h2>
            <p className="text-muted-foreground mt-0.5 text-sm">{notes.length} notes on file — private notes only visible to management</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchAll} className="gap-1.5"><RefreshCw size={13}/>Refresh</Button>
            <Button size="sm" onClick={() => setOpen(true)} className="gap-1.5" style={{background:'#d4af37',color:'#000'}}><Plus size={13}/>Add Note</Button>
          </div>
        </div>
        <div className="relative"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"/><Input placeholder="Search notes..." value={search} onChange={e=>setSearch(e.target.value)} className="pl-9 h-9 text-sm"/></div>
        {loading ? <div className="flex justify-center py-16"><div className="w-7 h-7 rounded-full border-2 border-t-transparent animate-spin" style={{borderColor:'#d4af37',borderTopColor:'transparent'}}/></div>
          : filtered.length === 0 ? <Card><CardContent className="py-12 text-center text-muted-foreground text-sm">No notes found. Add the first note using the button above.</CardContent></Card>
          : <div className="space-y-2">{filtered.map(n => (
              <Card key={n.id} className={n.is_private?'border-amber-200':''}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <StickyNote size={16} className="mt-0.5 flex-shrink-0 text-amber-500"/>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-semibold text-sm">{n.target_username}</span>
                        {n.is_private && <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-xs gap-1"><Lock size={9}/>Private</Badge>}
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{n.content}</p>
                      <p className="text-xs text-muted-foreground mt-1.5">Added by {n.author_username||'Unknown'} • {new Date(n.created_at).toLocaleDateString()}</p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(n.id, n.target_username)} className="text-red-400 hover:text-red-600 hover:bg-red-50 flex-shrink-0"><Trash2 size={14}/></Button>
                  </div>
                </CardContent>
              </Card>
            ))}</div>}
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Add Staff Note</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-2">
              <div className="space-y-1.5">
                <Label>Staff Member *</Label>
                <Select value={form.targetUserId} onValueChange={v=>{const m=members.find(m=>m.id===v);setForm(f=>({...f,targetUserId:v,targetUsername:m?.username||''}));}}>
                  <SelectTrigger><SelectValue placeholder="Select staff member"/></SelectTrigger>
                  <SelectContent>{members.map(m=><SelectItem key={m.id} value={m.id}>{m.username}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label>Note *</Label><Textarea value={form.content} onChange={e=>setForm(f=>({...f,content:e.target.value}))} placeholder="Write your note here..." rows={4} required/></div>
              <div className="flex items-center justify-between rounded-lg border border-border p-3">
                <div><p className="text-sm font-medium flex items-center gap-1.5"><Lock size={13}/>Private Note</p><p className="text-xs text-muted-foreground mt-0.5">Only visible to management, not the staff member</p></div>
                <Switch checked={form.isPrivate} onCheckedChange={v=>setForm(f=>({...f,isPrivate:v}))}/>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={()=>setOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={submitting} style={{background:'#d4af37',color:'#000'}}>{submitting?<><Loader2 size={14} className="animate-spin mr-1.5"/>Adding…</>:"Add Note"}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    );
  }
  