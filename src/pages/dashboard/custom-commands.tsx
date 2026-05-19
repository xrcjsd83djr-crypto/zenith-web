import { useState, useEffect, useCallback } from "react";
  import { Card, CardContent } from "@/components/ui/card";
  import { Button } from "@/components/ui/button";
  import { Badge } from "@/components/ui/badge";
  import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
  import { Label } from "@/components/ui/label";
  import { Input } from "@/components/ui/input";
  import { Textarea } from "@/components/ui/textarea";
  import { Switch } from "@/components/ui/switch";
  import { Terminal, Plus, RefreshCw, CheckCircle, AlertCircle, Loader2, Edit2, Trash2, Star, ChevronDown, ChevronUp } from "lucide-react";

  interface Command { id: string; name: string; description: string; response: string; is_embed: boolean; embed_title?: string; embed_color?: string; is_active: boolean; use_count: number; created_at: string; }

  function CommandCard({ cmd, onEdit, onDelete }: { cmd: Command; onEdit: () => void; onDelete: () => void }) {
    const [open, setOpen] = useState(false);
    return (
      <div className="border border-border rounded-lg overflow-hidden mb-2">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => setOpen(o=>!o)} className="flex-1 flex items-center gap-3 text-left hover:text-foreground">
            <Terminal size={14} className="text-blue-500 flex-shrink-0"/>
            <div className="flex-1 min-w-0">
              <span className="font-mono font-semibold text-sm">/{cmd.name}</span>
              <span className="text-muted-foreground text-xs ml-2">{cmd.description}</span>
            </div>
            <div className="flex items-center gap-2">
              {!cmd.is_active && <Badge className="text-xs bg-gray-100 text-gray-500 border">Disabled</Badge>}
              {cmd.use_count > 0 && <span className="text-xs text-muted-foreground">{cmd.use_count} uses</span>}
              {open?<ChevronUp size={14} className="text-muted-foreground"/>:<ChevronDown size={14} className="text-muted-foreground"/>}
            </div>
          </button>
          <div className="flex gap-1 ml-2">
            <Button variant="ghost" size="sm" onClick={onEdit} className="h-7 w-7 p-0"><Edit2 size={13}/></Button>
            <Button variant="ghost" size="sm" onClick={onDelete} className="h-7 w-7 p-0 text-red-400 hover:text-red-600"><Trash2 size={13}/></Button>
          </div>
        </div>
        {open && (
          <div className="px-4 pb-4 border-t bg-muted/20">
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div><p className="text-xs text-muted-foreground font-medium">Command</p><p className="text-sm font-mono">/{cmd.name}</p></div>
              <div><p className="text-xs text-muted-foreground font-medium">Uses</p><p className="text-sm">{cmd.use_count}</p></div>
              {cmd.is_embed && cmd.embed_title && <div><p className="text-xs text-muted-foreground font-medium">Embed Title</p><p className="text-sm">{cmd.embed_title}</p></div>}
              {cmd.is_embed && cmd.embed_color && <div><p className="text-xs text-muted-foreground font-medium">Color</p><div className="flex items-center gap-2"><div className="w-4 h-4 rounded-full border" style={{background:cmd.embed_color}}/><span className="text-sm font-mono text-xs">{cmd.embed_color}</span></div></div>}
              <div className="col-span-2"><p className="text-xs text-muted-foreground font-medium">Response</p><p className="text-sm whitespace-pre-wrap">{cmd.response}</p></div>
            </div>
          </div>
        )}
      </div>
    );
  }

  export default function CustomCommandsPage({ guildId }: { guildId: string }) {
    const [commands, setCommands] = useState<Command[]>([]);
    const [isPremium, setIsPremium] = useState(false);
    const [loading, setLoading] = useState(true);
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState<Command|null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [form, setForm] = useState({ name:'', description:'', response:'', isEmbed:false, embedTitle:'', embedColor:'#5865F2' });
    const [toast, setToast] = useState<{type:"ok"|"err";text:string}|null>(null);
    const showToast = (type:"ok"|"err", text:string) => { setToast({type,text}); setTimeout(()=>setToast(null),4000); };
    const FREE_LIMIT = 5;

    const fetchAll = useCallback(async () => {
      setLoading(true);
      try {
        const [cRes, pRes] = await Promise.all([
          fetch(`/api/guilds/${guildId}/custom-commands`, {credentials:'include'}),
          fetch(`/api/guilds/${guildId}/premium`, {credentials:'include'}),
        ]);
        if (cRes.ok) setCommands(await cRes.json());
        if (pRes.ok) { const p = await pRes.json(); setIsPremium(p.isPremium); }
      } catch {}
      setLoading(false);
    }, [guildId]);
    useEffect(() => { fetchAll(); }, [fetchAll]);

    const openNew = () => {
      if (!isPremium && commands.length >= FREE_LIMIT) return showToast("err", `Free tier is limited to ${FREE_LIMIT} custom commands. Upgrade to Premium for unlimited.`);
      setEditing(null); setForm({name:'',description:'',response:'',isEmbed:false,embedTitle:'',embedColor:'#5865F2'}); setOpen(true);
    };
    const openEdit = (c: Command) => { setEditing(c); setForm({name:c.name,description:c.description,response:c.response,isEmbed:c.is_embed,embedTitle:c.embed_title||'',embedColor:c.embed_color||'#5865F2'}); setOpen(true); };

    const handleSubmit = async (ev: React.FormEvent) => {
      ev.preventDefault();
      if (!form.name.trim() || !form.response.trim()) return showToast("err","Name and response required.");
      if (!/^[a-z0-9-]+$/.test(form.name)) return showToast("err","Command name must be lowercase letters, numbers, and hyphens only.");
      setSubmitting(true);
      try {
        const url = editing ? `/api/guilds/${guildId}/custom-commands/${editing.id}` : `/api/guilds/${guildId}/custom-commands`;
        const res = await fetch(url, {
          method: editing?'PUT':'POST', credentials:'include', headers:{'Content-Type':'application/json'},
          body: JSON.stringify({ name:form.name, description:form.description||form.name, response:form.response, isEmbed:form.isEmbed, embedTitle:form.embedTitle||null, embedColor:form.embedColor }),
        });
        const d = await res.json();
        if (!res.ok) throw new Error(d.error||'Failed');
        showToast("ok", editing?"Command updated!":"Command created!");
        setOpen(false); fetchAll();
      } catch (err:any) { showToast("err",err.message); }
      setSubmitting(false);
    };

    const handleDelete = async (id:string, name:string) => {
      if (!confirm(`Delete /${name}?`)) return;
      await fetch(`/api/guilds/${guildId}/custom-commands/${id}`, {method:'DELETE',credentials:'include'});
      fetchAll();
    };

    return (
      <div className="space-y-5 max-w-4xl">
        {toast && <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm font-medium ${toast.type==='ok'?'bg-green-50 text-green-800 border border-green-200':'bg-red-50 text-red-800 border border-red-200'}`}>{toast.type==='ok'?<CheckCircle size={15}/>:<AlertCircle size={15}/>}{toast.text}</div>}
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight flex items-center gap-2"><Terminal className="w-6 h-6" style={{color:'#d4af37'}}/>Custom Commands</h2>
            <p className="text-muted-foreground mt-0.5 text-sm">{commands.length}{!isPremium?'/'+FREE_LIMIT:''} commands — use /commandname in Discord</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchAll} className="gap-1.5"><RefreshCw size={13}/>Refresh</Button>
            <Button size="sm" onClick={openNew} className="gap-1.5" style={{background:'#d4af37',color:'#000'}}><Plus size={13}/>New Command</Button>
          </div>
        </div>
        {!isPremium && <div className="h-1.5 rounded-full bg-muted overflow-hidden"><div className="h-full rounded-full bg-amber-400 transition-all" style={{width:`${Math.min(100,(commands.length/FREE_LIMIT)*100)}%`}}/></div>}
        {!isPremium && commands.length >= FREE_LIMIT && (
          <Card className="border-amber-200 bg-amber-50/50"><CardContent className="p-4 flex items-start gap-3">
            <Star size={18} className="text-amber-500 flex-shrink-0 mt-0.5"/>
            <div><p className="font-semibold text-sm text-amber-800">Limit Reached — Upgrade to Premium</p><p className="text-xs text-amber-700 mt-0.5">You've used all {FREE_LIMIT} free custom command slots. Upgrade to Premium for unlimited custom commands.</p></div>
          </CardContent></Card>
        )}
        {loading ? <div className="flex justify-center py-16"><div className="w-7 h-7 rounded-full border-2 border-t-transparent animate-spin" style={{borderColor:'#d4af37',borderTopColor:'transparent'}}/></div>
          : commands.length === 0 ? <Card><CardContent className="py-12 text-center text-muted-foreground text-sm">No custom commands yet. Create your first bot command above.</CardContent></Card>
          : <div>{commands.map(c=><CommandCard key={c.id} cmd={c} onEdit={()=>openEdit(c)} onDelete={()=>handleDelete(c.id,c.name)}/>)}</div>}
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>{editing?'Edit':'New'} Custom Command</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-3 mt-2">
              <div className="space-y-1.5"><Label>Command Name *</Label><div className="flex items-center border rounded-md overflow-hidden"><span className="px-3 py-2 text-sm bg-muted border-r text-muted-foreground">/</span><Input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value.toLowerCase().replace(/[^a-z0-9-]/g,'')}))} placeholder="my-command" className="border-0 rounded-none" required/></div><p className="text-xs text-muted-foreground">Lowercase letters, numbers, hyphens only</p></div>
              <div className="space-y-1.5"><Label>Description</Label><Input value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} placeholder="Brief description of what this command does"/></div>
              <div className="space-y-1.5"><Label>Response *</Label><Textarea value={form.response} onChange={e=>setForm(f=>({...f,response:e.target.value}))} placeholder="What should the bot reply with?" rows={4} required/></div>
              <div className="flex items-center justify-between rounded-lg border p-3"><div><p className="text-sm font-medium">Send as Embed</p><p className="text-xs text-muted-foreground">Fancy Discord embed instead of plain text</p></div><Switch checked={form.isEmbed} onCheckedChange={v=>setForm(f=>({...f,isEmbed:v}))}/></div>
              {form.isEmbed && (
                <div className="space-y-3 pl-2 border-l-2 border-border">
                  <div className="space-y-1.5"><Label>Embed Title</Label><Input value={form.embedTitle} onChange={e=>setForm(f=>({...f,embedTitle:e.target.value}))} placeholder="Embed title (optional)"/></div>
                  <div className="space-y-1.5"><Label>Embed Color</Label><div className="flex items-center gap-2"><input type="color" value={form.embedColor} onChange={e=>setForm(f=>({...f,embedColor:e.target.value}))} className="h-9 w-16 rounded border cursor-pointer"/><Input value={form.embedColor} onChange={e=>setForm(f=>({...f,embedColor:e.target.value}))} className="flex-1 h-9 font-mono text-sm"/></div></div>
                </div>
              )}
              <div className="flex justify-end gap-2 pt-1">
                <Button type="button" variant="outline" onClick={()=>setOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={submitting} style={{background:'#d4af37',color:'#000'}}>{submitting?<><Loader2 size={14} className="animate-spin mr-1.5"/>Saving…</>:editing?"Update":"Create"}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    );
  }
  