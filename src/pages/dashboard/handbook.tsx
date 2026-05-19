import { useState, useEffect, useCallback } from "react";
  import { Card, CardContent } from "@/components/ui/card";
  import { Button } from "@/components/ui/button";
  import { Badge } from "@/components/ui/badge";
  import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
  import { Label } from "@/components/ui/label";
  import { Input } from "@/components/ui/input";
  import { Textarea } from "@/components/ui/textarea";
  import { Switch } from "@/components/ui/switch";
  import { BookOpen, Plus, RefreshCw, CheckCircle, AlertCircle, Loader2, Edit2, Trash2, ChevronDown, ChevronUp, Terminal } from "lucide-react";

  interface Entry { id: string; title: string; content: string; category?: string; is_public: boolean; order_index: number; created_at: string; updated_at?: string; }

  function EntryCard({ entry, onEdit, onDelete }: { entry: Entry; onEdit: () => void; onDelete: () => void }) {
    const [open, setOpen] = useState(false);
    return (
      <div className="border border-border rounded-lg overflow-hidden mb-2">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => setOpen(o=>!o)} className="flex-1 flex items-center gap-3 text-left hover:text-foreground">
            <BookOpen size={15} className="text-amber-500 flex-shrink-0"/>
            <div className="flex-1 min-w-0">
              <span className="font-semibold text-sm">{entry.title}</span>
              {entry.category && <span className="text-muted-foreground text-xs ml-2">[{entry.category}]</span>}
            </div>
            {!entry.is_public && <Badge className="text-xs bg-gray-100 text-gray-600 border">Private</Badge>}
            {open ? <ChevronUp size={14} className="text-muted-foreground flex-shrink-0"/> : <ChevronDown size={14} className="text-muted-foreground flex-shrink-0"/>}
          </button>
          <div className="flex gap-1 ml-2">
            <Button variant="ghost" size="sm" onClick={onEdit} className="h-7 w-7 p-0"><Edit2 size={13}/></Button>
            <Button variant="ghost" size="sm" onClick={onDelete} className="h-7 w-7 p-0 text-red-400 hover:text-red-600"><Trash2 size={13}/></Button>
          </div>
        </div>
        {open && (
          <div className="px-4 pb-4 border-t bg-muted/20">
            <p className="text-sm whitespace-pre-wrap mt-3">{entry.content}</p>
            <p className="text-xs text-muted-foreground mt-3">Last updated: {new Date(entry.updated_at||entry.created_at).toLocaleDateString()}</p>
          </div>
        )}
      </div>
    );
  }

  export default function HandbookPage({ guildId }: { guildId: string }) {
    const [entries, setEntries] = useState<Entry[]>([]);
    const [loading, setLoading] = useState(true);
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState<Entry | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [form, setForm] = useState({ title:'', content:'', category:'', isPublic:true });
    const [toast, setToast] = useState<{type:"ok"|"err";text:string}|null>(null);
    const showToast = (type:"ok"|"err", text:string) => { setToast({type,text}); setTimeout(()=>setToast(null),4000); };

    const fetchAll = useCallback(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/guilds/${guildId}/handbook`, {credentials:'include'});
        if (res.ok) setEntries(await res.json());
      } catch {}
      setLoading(false);
    }, [guildId]);
    useEffect(() => { fetchAll(); }, [fetchAll]);

    const openNew = () => { setEditing(null); setForm({title:'',content:'',category:'',isPublic:true}); setOpen(true); };
    const openEdit = (e: Entry) => { setEditing(e); setForm({title:e.title,content:e.content,category:e.category||'',isPublic:e.is_public}); setOpen(true); };

    const handleSubmit = async (ev: React.FormEvent) => {
      ev.preventDefault();
      if (!form.title.trim() || !form.content.trim()) return showToast("err","Title and content required.");
      setSubmitting(true);
      try {
        const url = editing ? `/api/guilds/${guildId}/handbook/${editing.id}` : `/api/guilds/${guildId}/handbook`;
        const method = editing ? 'PUT' : 'POST';
        const res = await fetch(url, {
          method, credentials:'include', headers:{'Content-Type':'application/json'},
          body: JSON.stringify({ title:form.title, content:form.content, category:form.category||null, isPublic:form.isPublic }),
        });
        const d = await res.json();
        if (!res.ok) throw new Error(d.error||'Failed');
        showToast("ok", editing ? "Entry updated!" : "Entry added!");
        setOpen(false); fetchAll();
      } catch (err:any) { showToast("err", err.message); }
      setSubmitting(false);
    };

    const handleDelete = async (id: string, title: string) => {
      if (!confirm(`Delete "${title}"?`)) return;
      await fetch(`/api/guilds/${guildId}/handbook/${id}`, {method:'DELETE',credentials:'include'});
      fetchAll();
    };

    const categories = [...new Set(entries.map(e=>e.category).filter(Boolean))];
    const grouped = categories.length > 0 ? categories.map(cat => ({ cat, items: entries.filter(e=>e.category===cat) })) : [{ cat: null, items: entries }];
    const uncategorized = categories.length > 0 ? entries.filter(e=>!e.category) : [];

    return (
      <div className="space-y-5 max-w-4xl">
        {toast && <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm font-medium ${toast.type==='ok'?'bg-green-50 text-green-800 border border-green-200':'bg-red-50 text-red-800 border border-red-200'}`}>{toast.type==='ok'?<CheckCircle size={15}/>:<AlertCircle size={15}/>}{toast.text}</div>}
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight flex items-center gap-2"><BookOpen className="w-6 h-6" style={{color:'#d4af37'}}/>Staff Handbook</h2>
            <p className="text-muted-foreground mt-0.5 text-sm">{entries.length} entries — use <code className="bg-muted px-1 py-0.5 rounded text-xs font-mono">/handbook</code> in Discord to view</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchAll} className="gap-1.5"><RefreshCw size={13}/>Refresh</Button>
            <Button size="sm" onClick={openNew} className="gap-1.5" style={{background:'#d4af37',color:'#000'}}><Plus size={13}/>Add Entry</Button>
          </div>
        </div>

        <Card className="border-blue-200 bg-blue-50/50">
          <CardContent className="p-4 flex items-start gap-3">
            <Terminal size={16} className="text-blue-500 mt-0.5 flex-shrink-0"/>
            <div>
              <p className="font-semibold text-sm text-blue-800">Discord Command</p>
              <p className="text-xs text-blue-700 mt-0.5">Staff can view handbook entries in Discord using <code className="bg-blue-100 px-1 rounded">/handbook</code>. They'll see a searchable list of all public entries. Private entries are only visible here in the dashboard.</p>
            </div>
          </CardContent>
        </Card>

        {loading ? <div className="flex justify-center py-16"><div className="w-7 h-7 rounded-full border-2 border-t-transparent animate-spin" style={{borderColor:'#d4af37',borderTopColor:'transparent'}}/></div>
          : entries.length === 0 ? <Card><CardContent className="py-12 text-center text-muted-foreground text-sm">No handbook entries yet. Add your first rule, guideline, or policy using the button above.</CardContent></Card>
          : (
            <>
              {grouped.map(({cat, items}) => cat ? (
                <div key={cat}>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{cat}</p>
                  {items.map(e => <EntryCard key={e.id} entry={e} onEdit={()=>openEdit(e)} onDelete={()=>handleDelete(e.id,e.title)}/>)}
                </div>
              ) : <div>{items.map(e => <EntryCard key={e.id} entry={e} onEdit={()=>openEdit(e)} onDelete={()=>handleDelete(e.id,e.title)}/>)}</div>)}
              {uncategorized.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Uncategorized</p>
                  {uncategorized.map(e => <EntryCard key={e.id} entry={e} onEdit={()=>openEdit(e)} onDelete={()=>handleDelete(e.id,e.title)}/>)}
                </div>
              )}
            </>
          )}

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>{editing ? 'Edit' : 'New'} Handbook Entry</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-2">
              <div className="space-y-1.5"><Label>Title *</Label><Input value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} placeholder="e.g. Code of Conduct, Shift Guidelines" required/></div>
              <div className="space-y-1.5"><Label>Category (optional)</Label><Input value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))} placeholder="e.g. Rules, Procedures, Benefits"/></div>
              <div className="space-y-1.5"><Label>Content *</Label><Textarea value={form.content} onChange={e=>setForm(f=>({...f,content:e.target.value}))} placeholder="Write the handbook content here. Supports plain text and line breaks." rows={8} required/></div>
              <div className="flex items-center justify-between rounded-lg border border-border p-3">
                <div><p className="text-sm font-medium">Public Entry</p><p className="text-xs text-muted-foreground mt-0.5">Public entries are visible via /handbook in Discord</p></div>
                <Switch checked={form.isPublic} onCheckedChange={v=>setForm(f=>({...f,isPublic:v}))}/>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={()=>setOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={submitting} style={{background:'#d4af37',color:'#000'}}>{submitting?<><Loader2 size={14} className="animate-spin mr-1.5"/>Saving…</>:editing?"Update Entry":"Add Entry"}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    );
  }
  