import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Plus, RefreshCw, Trash2, AlertCircle, CheckCircle, Loader2, Star, Terminal } from "lucide-react";

interface CustomCommand { id: string; name: string; description: string; response: string; embed_title: string | null; embed_color: string; requires_role: string | null; created_at: string; }

export default function CustomCommandsPage({ guildId }: { guildId: string }) {
  const [commands, setCommands] = useState<CustomCommand[]>([]);
  const [isPremium, setIsPremium] = useState(false);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', response: '', embedTitle: '', embedColor: '#5865F2', requiresRole: '' });
  const [toast, setToast] = useState<{ type: "ok"|"err"; text: string } | null>(null);

  const showToast = (type: "ok"|"err", text: string) => { setToast({ type, text }); setTimeout(() => setToast(null), 4000); };

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [cRes, pRes] = await Promise.all([
        fetch(`/api/guilds/${guildId}/custom-commands`, { credentials: 'include' }),
        fetch(`/api/guilds/${guildId}/is-premium`, { credentials: 'include' }),
      ]);
      if (cRes.ok) setCommands(await cRes.json());
      if (pRes.ok) { const p = await pRes.json(); setIsPremium(p.isPremium); }
    } catch {}
    setLoading(false);
  }, [guildId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch(`/api/guilds/${guildId}/custom-commands`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify(form),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      setOpen(false); setForm({ name: '', description: '', response: '', embedTitle: '', embedColor: '#5865F2', requiresRole: '' });
      fetchAll(); showToast('ok', `/${form.name} command created! Restart the bot to register it.`);
    } catch (err: any) { showToast('err', err.message); }
    setSubmitting(false);
  };

  const deleteCmd = async (id: string, name: string) => {
    if (!confirm(`Delete /${name}?`)) return;
    try {
      await fetch(`/api/guilds/${guildId}/custom-commands/${id}`, { method: 'DELETE', credentials: 'include' });
      setCommands(c => c.filter(x => x.id !== id));
      showToast('ok', `/${name} deleted.`);
    } catch { showToast('err', 'Failed to delete.'); }
  };

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
          <h2 className="text-2xl font-extrabold tracking-tight flex items-center gap-2">
            <Sparkles className="w-6 h-6" style={{ color: '#d4af37' }} />Custom Commands
            <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-[10px]"><Star size={9} className="mr-0.5" />Premium</Badge>
          </h2>
          <p className="text-muted-foreground mt-0.5 text-sm">Create custom slash commands unique to your server. The bot serves them dynamically — no code changes needed.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchAll} className="gap-1.5"><RefreshCw size={13} />Refresh</Button>
          {isPremium && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button size="sm" style={{ background: 'linear-gradient(135deg,#d4af37,#ffd700)', color: '#5a3e10', border: 'none' }} className="gap-1.5 font-semibold">
                  <Plus size={14} /> New Command
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-white border-border max-w-md">
                <DialogHeader><DialogTitle className="flex items-center gap-2"><Terminal size={18} style={{ color: '#d4af37' }} />Create Custom Command</DialogTitle></DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 mt-2">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="font-semibold">Command Name</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">/</span>
                        <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, '') }))} placeholder="rules" className="bg-white border-border pl-6 font-mono text-sm" required />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="font-semibold">Embed Color</Label>
                      <div className="flex gap-2">
                        <input type="color" value={form.embedColor} onChange={e => setForm(f => ({ ...f, embedColor: e.target.value }))} className="w-10 h-9 rounded border border-border cursor-pointer flex-shrink-0" />
                        <Input value={form.embedColor} onChange={e => setForm(f => ({ ...f, embedColor: e.target.value }))} className="bg-white border-border font-mono text-xs" />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="font-semibold">Description (shown in /help)</Label>
                    <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Shows server rules" className="bg-white border-border" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="font-semibold">Embed Title (optional)</Label>
                    <Input value={form.embedTitle} onChange={e => setForm(f => ({ ...f, embedTitle: e.target.value }))} placeholder="📋 Server Rules" className="bg-white border-border" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="font-semibold">Response</Label>
                    <Textarea value={form.response} onChange={e => setForm(f => ({ ...f, response: e.target.value }))} placeholder="The message or embed content the bot will send..." className="bg-white border-border min-h-[100px]" required />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="font-semibold">Require Role ID (optional)</Label>
                    <Input value={form.requiresRole} onChange={e => setForm(f => ({ ...f, requiresRole: e.target.value }))} placeholder="Role ID — leave blank for everyone" className="bg-white border-border font-mono text-sm" />
                  </div>
                  <div className="flex justify-end gap-2 pt-1">
                    <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                    <Button type="submit" disabled={submitting || !form.name || !form.response} style={{ background: 'linear-gradient(135deg,#d4af37,#ffd700)', color: '#5a3e10', border: 'none' }}>
                      {submitting ? <><Loader2 size={13} className="animate-spin mr-1" />Creating...</> : "Create Command"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {!isPremium ? (
        <Card className="border-amber-200 bg-amber-50 shadow-sm">
          <CardContent className="p-6 text-center">
            <Sparkles className="w-10 h-10 mx-auto mb-3" style={{ color: '#d4af37' }} />
            <h3 className="font-bold text-amber-800 mb-1">Premium Feature</h3>
            <p className="text-amber-700 text-sm mb-4">Custom Commands let you create slash commands unique to your server — /rules, /sop, /roster, anything you need. The bot serves them live with no code changes required.</p>
            <a href="/premium" className="inline-block px-5 py-2 rounded-xl font-semibold text-sm" style={{ background: 'linear-gradient(135deg,#d4af37,#ffd700)', color: '#5a3e10' }}>Upgrade to Premium</a>
          </CardContent>
        </Card>
      ) : commands.length === 0 ? (
        <Card className="border-border bg-white shadow-sm"><CardContent className="py-16 text-center"><Terminal className="w-10 h-10 text-muted-foreground mx-auto mb-3" /><p className="font-semibold text-muted-foreground">No custom commands yet</p><p className="text-sm text-muted-foreground mt-1">Create your first custom command — /rules, /sop, /contact — anything you need for your server.</p></CardContent></Card>
      ) : (
        <div className="space-y-3">
          {commands.map(cmd => (
            <Card key={cmd.id} className="border-border bg-white shadow-sm">
              <CardContent className="p-4 flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: cmd.embed_color, opacity: 0.8 }}>
                  <span className="text-white font-bold text-xs">/</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <code className="font-mono font-bold text-sm">/{cmd.name}</code>
                    {cmd.requires_role && <Badge className="bg-purple-50 text-purple-700 border-purple-200 text-[10px]">Role restricted</Badge>}
                    <span className="text-xs text-muted-foreground">{new Date(cmd.created_at).toLocaleDateString()}</span>
                  </div>
                  {cmd.description && <p className="text-xs text-muted-foreground mt-0.5">{cmd.description}</p>}
                  {cmd.embed_title && <p className="text-xs font-medium mt-1 text-foreground">Embed: {cmd.embed_title}</p>}
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{cmd.response}</p>
                </div>
                <button onClick={() => deleteCmd(cmd.id, cmd.name)} className="text-muted-foreground hover:text-red-500 transition-colors flex-shrink-0">
                  <Trash2 size={14} />
                </button>
              </CardContent>
            </Card>
          ))}
          <p className="text-xs text-muted-foreground text-center">Commands are served by the bot dynamically. You may need to restart the bot if commands don't appear in Discord immediately.</p>
        </div>
      )}
    </div>
  );
}
