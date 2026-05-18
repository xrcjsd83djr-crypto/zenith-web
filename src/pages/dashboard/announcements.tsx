import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Megaphone, Plus, RefreshCw, AlertCircle, CheckCircle, Loader2, Send, Users } from "lucide-react";

interface Announcement { id: string; title: string; content: string; author_username: string; channel_id: string | null; sent_at: string; }
interface Channel { id: string; name: string; }

export default function AnnouncementsPage({ guildId }: { guildId: string }) {
  const [items, setItems] = useState<Announcement[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [isPremium, setIsPremium] = useState(false);
  const [me, setMe] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [massOpen, setMassOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [massSubmitting, setMassSubmitting] = useState(false);
  const [massResult, setMassResult] = useState<any>(null);
  const [form, setForm] = useState({ title: '', content: '', channelId: '', sendToDiscord: true });
  const [massMsg, setMassMsg] = useState({ title: '', message: '' });
  const [toast, setToast] = useState<{ type: "ok"|"err"; text: string } | null>(null);

  const showToast = (type: "ok"|"err", text: string) => { setToast({ type, text }); setTimeout(() => setToast(null), 4000); };

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [aRes, chRes, pRes, meRes] = await Promise.all([
        fetch(`/api/guilds/${guildId}/announcements`, { credentials: 'include' }),
        fetch(`/api/guilds/${guildId}/channels`, { credentials: 'include' }),
        fetch(`/api/guilds/${guildId}/is-premium`, { credentials: 'include' }),
        fetch('/api/me', { credentials: 'include' }),
      ]);
      if (aRes.ok) setItems(await aRes.json());
      if (chRes.ok) setChannels(await chRes.json());
      if (pRes.ok) { const p = await pRes.json(); setIsPremium(p.isPremium); }
      if (meRes.ok) setMe(await meRes.json());
    } catch {}
    setLoading(false);
  }, [guildId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.content.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/guilds/${guildId}/announcements`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({ ...form, authorId: me?.id, authorUsername: me?.username }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      setOpen(false); setForm({ title: '', content: '', channelId: '', sendToDiscord: true });
      fetchAll(); showToast('ok', form.sendToDiscord && form.channelId ? 'Announcement posted to Discord!' : 'Announcement saved.');
    } catch (err: any) { showToast('err', err.message); }
    setSubmitting(false);
  };

  const handleMassDM = async (e: React.FormEvent) => {
    e.preventDefault();
    setMassSubmitting(true); setMassResult(null);
    try {
      const res = await fetch(`/api/guilds/${guildId}/mass-dm`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({ ...massMsg, authorId: me?.id, authorUsername: me?.username }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMassResult(data);
    } catch (err: any) { showToast('err', err.message); }
    setMassSubmitting(false);
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
          <h2 className="text-2xl font-extrabold tracking-tight flex items-center gap-2"><Megaphone className="w-6 h-6" style={{ color: '#d4af37' }} />Announcements</h2>
          <p className="text-muted-foreground mt-0.5 text-sm">Post announcements to Discord channels. Premium: mass DM all staff directly.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchAll} className="gap-1.5"><RefreshCw size={13} />Refresh</Button>
          {isPremium && (
            <Dialog open={massOpen} onOpenChange={v => { setMassOpen(v); if (!v) setMassResult(null); }}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="gap-1.5 border-amber-300 text-amber-700 hover:bg-amber-50">
                  <Users size={14} />Mass DM
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-white border-border max-w-md">
                <DialogHeader><DialogTitle className="flex items-center gap-2"><Users size={18} style={{ color: '#d4af37' }} />Mass DM All Staff</DialogTitle></DialogHeader>
                {massResult ? (
                  <div className="space-y-3 mt-2">
                    <div className="p-4 rounded-xl bg-green-50 border border-green-200 text-center">
                      <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
                      <p className="font-bold text-green-800">Sent to {massResult.sent} staff member{massResult.sent !== 1 ? 's' : ''}</p>
                      {massResult.failed > 0 && <p className="text-xs text-green-700 mt-1">{massResult.failed} failed (DMs may be closed)</p>}
                    </div>
                    <Button onClick={() => { setMassOpen(false); setMassResult(null); }} className="w-full" variant="outline">Done</Button>
                  </div>
                ) : (
                  <form onSubmit={handleMassDM} className="space-y-4 mt-2">
                    <p className="text-sm text-muted-foreground bg-amber-50 border border-amber-200 rounded-lg p-3">⚠️ This will DM every active staff member. Use sparingly.</p>
                    <div className="space-y-1.5">
                      <Label className="font-semibold">Title</Label>
                      <Input value={massMsg.title} onChange={e => setMassMsg(m => ({ ...m, title: e.target.value }))} placeholder="Urgent staff notice" className="bg-white border-border" required />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="font-semibold">Message</Label>
                      <Textarea value={massMsg.message} onChange={e => setMassMsg(m => ({ ...m, message: e.target.value }))} placeholder="Message to send to all staff..." className="bg-white border-border min-h-[100px]" required />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" onClick={() => setMassOpen(false)}>Cancel</Button>
                      <Button type="submit" disabled={massSubmitting} className="bg-amber-600 hover:bg-amber-700 text-white border-none gap-1.5">
                        {massSubmitting ? <><Loader2 size={13} className="animate-spin" />Sending...</> : <><Send size={13} />Send to All Staff</>}
                      </Button>
                    </div>
                  </form>
                )}
              </DialogContent>
            </Dialog>
          )}
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" style={{ background: 'linear-gradient(135deg,#d4af37,#ffd700)', color: '#5a3e10', border: 'none' }} className="gap-1.5 font-semibold">
                <Plus size={14} /> New Announcement
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-white border-border max-w-md">
              <DialogHeader><DialogTitle className="flex items-center gap-2"><Megaphone size={18} style={{ color: '#d4af37' }} />Create Announcement</DialogTitle></DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 mt-2">
                <div className="space-y-1.5">
                  <Label className="font-semibold">Title</Label>
                  <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Weekly staff meeting reminder" className="bg-white border-border" required />
                </div>
                <div className="space-y-1.5">
                  <Label className="font-semibold">Content</Label>
                  <Textarea value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} placeholder="Announcement body..." className="bg-white border-border min-h-[100px]" required />
                </div>
                <div className="space-y-1.5">
                  <Label className="font-semibold">Discord Channel (optional)</Label>
                  <Select value={form.channelId} onValueChange={v => setForm(f => ({ ...f, channelId: v }))}>
                    <SelectTrigger className="bg-white border-border"><SelectValue placeholder="Select channel to post in" /></SelectTrigger>
                    <SelectContent className="bg-white border-border max-h-52">
                      <SelectItem value="">Dashboard only (no Discord post)</SelectItem>
                      {channels.map(c => <SelectItem key={c.id} value={c.id}>#{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                {form.channelId && (
                  <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/30">
                    <Switch checked={form.sendToDiscord} onCheckedChange={v => setForm(f => ({ ...f, sendToDiscord: v }))} />
                    <div><p className="text-sm font-medium">Post embed to Discord</p><p className="text-xs text-muted-foreground">Send as a rich embed in the selected channel</p></div>
                  </div>
                )}
                <div className="flex justify-end gap-2 pt-1">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={submitting} style={{ background: 'linear-gradient(135deg,#d4af37,#ffd700)', color: '#5a3e10', border: 'none' }}>
                    {submitting ? <><Loader2 size={13} className="animate-spin mr-1" />Posting...</> : <><Send size={13} className="mr-1" />Post</>}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {items.length === 0 ? (
        <Card className="border-border bg-white shadow-sm"><CardContent className="py-16 text-center"><Megaphone className="w-10 h-10 text-muted-foreground mx-auto mb-3" /><p className="font-semibold text-muted-foreground">No announcements yet</p><p className="text-sm text-muted-foreground mt-1">Post an announcement to notify your staff team through Discord or this dashboard.</p></CardContent></Card>
      ) : (
        <div className="space-y-3">
          {items.map(a => (
            <Card key={a.id} className="border-border bg-white shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-bold text-sm">📢 {a.title}</h3>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {a.channel_id && <Badge className="bg-blue-50 text-blue-700 border-blue-200 text-[10px]">Posted to Discord</Badge>}
                    <span className="text-xs text-muted-foreground">{new Date(a.sent_at).toLocaleDateString()}</span>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{a.content}</p>
                <p className="text-xs text-muted-foreground mt-2">By {a.author_username}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
