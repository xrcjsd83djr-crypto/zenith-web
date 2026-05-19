import { useState, useEffect, useCallback } from "react";
  import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
  import { Button } from "@/components/ui/button";
  import { Badge } from "@/components/ui/badge";
  import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
  import { Label } from "@/components/ui/label";
  import { Input } from "@/components/ui/input";
  import { Textarea } from "@/components/ui/textarea";
  import { Switch } from "@/components/ui/switch";
  import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
  import { Megaphone, Plus, RefreshCw, AlertCircle, CheckCircle, Loader2, Send, Users, Clock, Star, ChevronDown, ChevronUp } from "lucide-react";

  interface Announcement { id: string; title: string; content: string; author_username?: string; channel_id?: string; mass_dm?: boolean; dm_sent?: number; dm_failed?: number; sent_at: string; }
  interface Channel { id: string; name: string; }

  function AnnouncementCard({ item }: { item: Announcement }) {
    const [open, setOpen] = useState(false);
    const ts = new Date(item.sent_at);
    return (
      <div className="border border-border rounded-lg overflow-hidden mb-3">
        <button onClick={() => setOpen(o => !o)} className="w-full flex items-start gap-3 px-4 py-3 hover:bg-muted/30 transition-colors text-left">
          <Megaphone size={16} className="mt-0.5 flex-shrink-0 text-amber-500" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-sm">{item.title}</span>
              {item.mass_dm && <Badge className="bg-purple-100 text-purple-700 border-purple-200 text-[10px]"><Users size={9} className="mr-1" />Mass DM</Badge>}
            </div>
            <p className="text-muted-foreground text-xs mt-0.5 truncate">{item.content.slice(0,100)}{item.content.length > 100 ? '…' : ''}</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-muted-foreground text-xs">{ts.toLocaleDateString()}</span>
            {open ? <ChevronUp size={14} className="text-muted-foreground" /> : <ChevronDown size={14} className="text-muted-foreground" />}
          </div>
        </button>
        {open && (
          <div className="px-4 pb-4 border-t border-border bg-muted/20">
            <div className="mt-3 space-y-3">
              <div>
                <p className="text-xs text-muted-foreground font-medium mb-1">Content</p>
                <p className="text-sm whitespace-pre-wrap">{item.content}</p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {item.author_username && <div><p className="text-xs text-muted-foreground font-medium">Sent By</p><p className="text-sm">{item.author_username}</p></div>}
                <div><p className="text-xs text-muted-foreground font-medium">Timestamp</p><p className="text-sm">{ts.toLocaleString()}</p></div>
                {item.channel_id && <div><p className="text-xs text-muted-foreground font-medium">Channel</p><p className="text-sm font-mono text-xs">#{item.channel_id}</p></div>}
                {item.mass_dm && <div><p className="text-xs text-muted-foreground font-medium">DMs Sent</p><p className="text-sm text-green-600">{item.dm_sent ?? 0} ✓ / {item.dm_failed ?? 0} ✗</p></div>}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

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
        const [aRes, cRes, meRes, pRes] = await Promise.all([
          fetch(`/api/guilds/${guildId}/announcements`, { credentials: 'include' }),
          fetch(`/api/guilds/${guildId}/channels`, { credentials: 'include' }),
          fetch('/api/me', { credentials: 'include' }),
          fetch(`/api/guilds/${guildId}/premium`, { credentials: 'include' }),
        ]);
        if (aRes.ok) setItems(await aRes.json());
        if (cRes.ok) setChannels(await cRes.json());
        if (meRes.ok) setMe(await meRes.json());
        if (pRes.ok) { const p = await pRes.json(); setIsPremium(p.isPremium); }
      } catch {}
      setLoading(false);
    }, [guildId]);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!form.title.trim() || !form.content.trim()) return showToast("err", "Title and content are required.");
      setSubmitting(true);
      try {
        const res = await fetch(`/api/guilds/${guildId}/announcements`, {
          method: 'POST', credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: form.title, content: form.content, channelId: form.channelId || null, sendToDiscord: form.sendToDiscord, authorId: me?.id, authorUsername: me?.username }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed');
        showToast("ok", "Announcement sent!");
        setOpen(false);
        setForm({ title: '', content: '', channelId: '', sendToDiscord: true });
        fetchAll();
      } catch (err: any) { showToast("err", err.message); }
      setSubmitting(false);
    };

    const handleMassDm = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!massMsg.title.trim() || !massMsg.message.trim()) return showToast("err", "Title and message required.");
      setMassSubmitting(true); setMassResult(null);
      try {
        const res = await fetch(`/api/guilds/${guildId}/announcements/mass-dm`, {
          method: 'POST', credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: massMsg.title, message: massMsg.message, authorId: me?.id, authorUsername: me?.username }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed');
        setMassResult(data);
        showToast("ok", `Mass DM sent to ${data.sent ?? 0} staff members.`);
        fetchAll();
      } catch (err: any) { showToast("err", err.message); }
      setMassSubmitting(false);
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
              <Megaphone className="w-6 h-6" style={{ color: '#d4af37' }} />Announcements
            </h2>
            <p className="text-muted-foreground mt-0.5 text-sm">{items.length} announcements — click to expand details</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchAll} className="gap-1.5"><RefreshCw size={13} />Refresh</Button>
            <Button size="sm" onClick={() => setOpen(true)} className="gap-1.5" style={{ background: '#d4af37', color: '#000' }}><Plus size={13} />New Announcement</Button>
            {isPremium ? (
              <Button size="sm" variant="outline" onClick={() => setMassOpen(true)} className="gap-1.5 border-purple-300 text-purple-700"><Users size={13} />Mass DM</Button>
            ) : (
              <Button size="sm" variant="outline" className="gap-1.5 opacity-60 cursor-default border-amber-300 text-amber-700" disabled><Star size={12} />Mass DM (Premium)</Button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><div className="w-7 h-7 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#d4af37', borderTopColor: 'transparent' }} /></div>
        ) : items.length === 0 ? (
          <Card><CardContent className="py-12 text-center text-muted-foreground text-sm">No announcements yet. Send your first one above.</CardContent></Card>
        ) : (
          <div>{items.map(item => <AnnouncementCard key={item.id} item={item} />)}</div>
        )}

        {/* Premium preview if not premium */}
        {!isPremium && (
          <Card className="border-amber-200 bg-amber-50/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Star className="text-amber-500 flex-shrink-0" size={20} />
                <div>
                  <p className="font-semibold text-sm text-amber-800">Mass DM — Premium Feature</p>
                  <p className="text-xs text-amber-700 mt-0.5">Send a direct message to every staff member instantly. Configure once, send with a click. Includes delivery tracking showing how many DMs were sent vs. failed.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* New Announcement Dialog */}
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>New Announcement</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-2">
              <div className="space-y-1.5">
                <Label htmlFor="ann-title">Title</Label>
                <Input id="ann-title" value={form.title} onChange={e => setForm(f => ({...f, title: e.target.value}))} placeholder="Announcement title" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ann-content">Content</Label>
                <Textarea id="ann-content" value={form.content} onChange={e => setForm(f => ({...f, content: e.target.value}))} placeholder="Write your announcement here..." rows={5} required />
              </div>
              <div className="space-y-1.5">
                <Label>Post to Discord Channel (optional)</Label>
                <Select value={form.channelId} onValueChange={v => setForm(f => ({...f, channelId: v}))}>
                  <SelectTrigger><SelectValue placeholder="Select a channel" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Don't post to Discord</SelectItem>
                    {channels.map(c => <SelectItem key={c.id} value={c.id}>#{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={submitting} style={{ background: '#d4af37', color: '#000' }}>
                  {submitting ? <><Loader2 size={14} className="animate-spin mr-1.5" />Sending…</> : <><Send size={14} className="mr-1.5" />Send</>}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Mass DM Dialog (Premium) */}
        <Dialog open={massOpen} onOpenChange={v => { setMassOpen(v); if (!v) setMassResult(null); }}>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle className="flex items-center gap-2"><Users size={18} className="text-purple-600" />Mass DM to All Staff</DialogTitle></DialogHeader>
            {massResult ? (
              <div className="space-y-4 mt-2">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="font-semibold text-green-800">Mass DM Complete</p>
                  <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
                    <div className="text-green-700">✅ Sent: <strong>{massResult.sent ?? 0}</strong></div>
                    <div className="text-red-600">❌ Failed: <strong>{massResult.failed ?? 0}</strong></div>
                  </div>
                  {massResult.failed > 0 && <p className="text-xs text-muted-foreground mt-2">Some DMs failed — those users may have DMs disabled.</p>}
                </div>
                <Button className="w-full" variant="outline" onClick={() => { setMassOpen(false); setMassResult(null); }}>Close</Button>
              </div>
            ) : (
              <form onSubmit={handleMassDm} className="space-y-4 mt-2">
                <div className="space-y-1.5">
                  <Label>Title</Label>
                  <Input value={massMsg.title} onChange={e => setMassMsg(m => ({...m, title: e.target.value}))} placeholder="DM subject / title" required />
                </div>
                <div className="space-y-1.5">
                  <Label>Message</Label>
                  <Textarea value={massMsg.message} onChange={e => setMassMsg(m => ({...m, message: e.target.value}))} placeholder="This will be sent to every active staff member's DMs..." rows={5} required />
                </div>
                <p className="text-xs text-muted-foreground">This sends a DM to all active staff members. Delivery is logged automatically.</p>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setMassOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={massSubmitting} className="bg-purple-600 hover:bg-purple-700 text-white">
                    {massSubmitting ? <><Loader2 size={14} className="animate-spin mr-1.5" />Sending…</> : <><Send size={14} className="mr-1.5" />Send to All Staff</>}
                  </Button>
                </div>
              </form>
            )}
          </DialogContent>
        </Dialog>
      </div>
    );
  }
  