import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Megaphone, Plus, RefreshCw, AlertCircle, CheckCircle, Loader2, Send, Users, Star, ChevronDown, ChevronUp, Bell, Hash } from "lucide-react";

interface Announcement { id: string; title: string; content: string; author_username?: string; channel_id?: string; mass_dm?: boolean; dm_sent?: number; dm_failed?: number; sent_at: string; }
interface Channel { id: string; name: string; type?: number; }

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
            {item.mass_dm && <Badge className="bg-purple-100 text-purple-700 border-purple-200 text-[10px] border"><Users size={9} className="mr-1" />Mass DM</Badge>}
          </div>
          <p className="text-muted-foreground text-xs mt-0.5 truncate">{item.content.slice(0, 100)}{item.content.length > 100 ? '…' : ''}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-muted-foreground text-xs hidden sm:block">{ts.toLocaleDateString()}</span>
          {open ? <ChevronUp size={14} className="text-muted-foreground" /> : <ChevronDown size={14} className="text-muted-foreground" />}
        </div>
      </button>
      {open && (
        <div className="px-4 pb-4 border-t border-border bg-muted/20">
          <div className="mt-3 space-y-3">
            <div>
              <p className="text-xs text-muted-foreground font-medium mb-1">Full Content</p>
              <p className="text-sm whitespace-pre-wrap">{item.content}</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1">
              {item.author_username && <div><p className="text-xs text-muted-foreground font-medium">Sent By</p><p className="text-sm font-medium">{item.author_username}</p></div>}
              <div><p className="text-xs text-muted-foreground font-medium">Timestamp</p><p className="text-sm">{ts.toLocaleString()}</p></div>
              {item.channel_id && <div><p className="text-xs text-muted-foreground font-medium">Discord Channel</p><p className="text-sm font-mono text-xs flex items-center gap-1"><Hash size={11}/>{item.channel_id}</p></div>}
              {item.mass_dm && (
                <>
                  <div><p className="text-xs text-muted-foreground font-medium">DMs Sent</p><p className="text-sm text-green-600 font-medium">{item.dm_sent ?? 0} ✓</p></div>
                  <div><p className="text-xs text-muted-foreground font-medium">DMs Failed</p><p className="text-sm text-red-500">{item.dm_failed ?? 0} ✗</p></div>
                </>
              )}
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
  const [channelId, setChannelId] = useState<string>("");
  const [sendToDiscord, setSendToDiscord] = useState(true);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [massTitle, setMassTitle] = useState("");
  const [massMessage, setMassMessage] = useState("");
  const [toast, setToast] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const showToast = (type: "ok" | "err", text: string) => { setToast({ type, text }); setTimeout(() => setToast(null), 4000); };

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [aRes, cRes, meRes, pRes] = await Promise.allSettled([
        fetch(`/api/guilds/${guildId}/announcements`, { credentials: 'include' }),
        fetch(`/api/guilds/${guildId}/channels`, { credentials: 'include' }),
        fetch('/api/me', { credentials: 'include' }),
        fetch(`/api/guilds/${guildId}/premium`, { credentials: 'include' }),
      ]);
      if (aRes.status === 'fulfilled' && aRes.value.ok) {
        const d = await aRes.value.json().catch(() => []);
        setItems(Array.isArray(d) ? d : []);
      }
      if (cRes.status === 'fulfilled' && cRes.value.ok) {
        const d = await cRes.value.json().catch(() => []);
        setChannels(Array.isArray(d) ? d.filter((c: Channel) => c.type === 0 || c.type === undefined) : []);
      }
      if (meRes.status === 'fulfilled' && meRes.value.ok) setMe(await meRes.value.json().catch(() => null));
      if (pRes.status === 'fulfilled' && pRes.value.ok) { const p = await pRes.value.json().catch(() => ({})); setIsPremium(!!p.isPremium); }
    } catch {}
    setLoading(false);
  }, [guildId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const resetForm = () => { setTitle(""); setContent(""); setChannelId(""); setSendToDiscord(true); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return showToast("err", "Title and content are required.");
    setSubmitting(true);
    try {
      const res = await fetch(`/api/guilds/${guildId}/announcements`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          content: content.trim(),
          channelId: (sendToDiscord && channelId) ? channelId : null,
          sendToDiscord: sendToDiscord && !!channelId,
          authorId: me?.id,
          authorUsername: me?.username,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as any).error || 'Failed to send announcement');
      showToast("ok", "Announcement sent!");
      setOpen(false);
      resetForm();
      fetchAll();
    } catch (err: any) { showToast("err", err.message); }
    setSubmitting(false);
  };

  const handleMassDm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!massTitle.trim() || !massMessage.trim()) return showToast("err", "Title and message are required.");
    setMassSubmitting(true); setMassResult(null);
    try {
      const res = await fetch(`/api/guilds/${guildId}/announcements/mass-dm`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: massTitle.trim(), message: massMessage.trim(), authorId: me?.id, authorUsername: me?.username }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as any).error || 'Failed');
      setMassResult(data);
      showToast("ok", `Mass DM sent to ${(data as any).sent ?? 0} staff members.`);
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
          <p className="text-muted-foreground mt-0.5 text-sm">{items.length} announcements — click any to expand full details</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={fetchAll} className="gap-1.5"><RefreshCw size={13} />Refresh</Button>
          <Button size="sm" onClick={() => { resetForm(); setOpen(true); }} className="gap-1.5" style={{ background: '#d4af37', color: '#000' }}>
            <Plus size={13} />New Announcement
          </Button>
          {isPremium ? (
            <Button size="sm" variant="outline" onClick={() => { setMassTitle(""); setMassMessage(""); setMassResult(null); setMassOpen(true); }} className="gap-1.5 border-purple-300 text-purple-700 hover:bg-purple-50">
              <Users size={13} />Mass DM Staff
            </Button>
          ) : (
            <Button size="sm" variant="outline" className="gap-1.5 opacity-50 cursor-not-allowed" disabled title="Premium required">
              <Star size={12} />Mass DM (Premium)
            </Button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-7 h-7 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#d4af37', borderTopColor: 'transparent' }} />
        </div>
      ) : items.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground text-sm">
          <Bell size={32} className="mx-auto mb-2 text-muted-foreground/40" />
          No announcements yet. Send your first one using the button above.
        </CardContent></Card>
      ) : (
        <div>{items.map(item => <AnnouncementCard key={item.id} item={item} />)}</div>
      )}

      {!isPremium && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Star className="text-amber-500 flex-shrink-0 mt-0.5" size={20} />
              <div>
                <p className="font-semibold text-sm text-amber-800">Mass DM — Premium Feature</p>
                <p className="text-xs text-amber-700 mt-0.5">
                  Instantly DM every active staff member with an important message. Includes delivery tracking showing exactly how many DMs succeeded vs. failed. Upgrade to Premium to unlock.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* New Announcement Dialog */}
      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Megaphone size={18} />New Announcement</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label>Title *</Label>
              <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Announcement title" required />
            </div>
            <div className="space-y-1.5">
              <Label>Content *</Label>
              <Textarea value={content} onChange={e => setContent(e.target.value)} placeholder="Write your announcement here..." rows={5} required />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <p className="text-sm font-medium">Post to Discord Channel</p>
                <p className="text-xs text-muted-foreground mt-0.5">Also send this to a Discord channel</p>
              </div>
              <Switch checked={sendToDiscord} onCheckedChange={setSendToDiscord} />
            </div>
            {sendToDiscord && (
              <div className="space-y-1.5">
                <Label>Select Channel</Label>
                <Select value={channelId} onValueChange={setChannelId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a channel (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {channels.length === 0
                      ? <SelectItem value="__none" disabled>No channels available</SelectItem>
                      : channels.map(c => <SelectItem key={c.id} value={c.id}>#{c.name}</SelectItem>)
                    }
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={submitting} style={{ background: '#d4af37', color: '#000' }}>
                {submitting ? <><Loader2 size={14} className="animate-spin mr-1.5" />Sending…</> : <><Send size={14} className="mr-1.5" />Send</>}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Mass DM Dialog */}
      <Dialog open={massOpen} onOpenChange={v => { setMassOpen(v); if (!v) { setMassResult(null); setMassTitle(""); setMassMessage(""); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Users size={18} className="text-purple-600" />Mass DM — All Staff</DialogTitle></DialogHeader>
          {massResult ? (
            <div className="space-y-4 mt-2">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="font-semibold text-green-800 mb-2">Mass DM Complete</p>
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div className="text-center"><p className="text-2xl font-bold text-green-700">{(massResult as any).sent ?? 0}</p><p className="text-xs text-muted-foreground">Sent ✅</p></div>
                  <div className="text-center"><p className="text-2xl font-bold text-red-500">{(massResult as any).failed ?? 0}</p><p className="text-xs text-muted-foreground">Failed ❌</p></div>
                  <div className="text-center"><p className="text-2xl font-bold text-muted-foreground">{(massResult as any).total ?? 0}</p><p className="text-xs text-muted-foreground">Total Staff</p></div>
                </div>
                {(massResult as any).failed > 0 && <p className="text-xs text-muted-foreground mt-3">Some DMs failed — users may have DMs disabled or left the server.</p>}
              </div>
              <Button className="w-full" variant="outline" onClick={() => { setMassOpen(false); setMassResult(null); }}>Close</Button>
            </div>
          ) : (
            <form onSubmit={handleMassDm} className="space-y-4 mt-2">
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 text-xs text-purple-700">
                This will DM every active staff member. The message is logged and includes delivery tracking.
              </div>
              <div className="space-y-1.5">
                <Label>Subject / Title *</Label>
                <Input value={massTitle} onChange={e => setMassTitle(e.target.value)} placeholder="e.g. Important Staff Update" required />
              </div>
              <div className="space-y-1.5">
                <Label>Message *</Label>
                <Textarea value={massMessage} onChange={e => setMassMessage(e.target.value)} placeholder="This message will be sent directly to all active staff members..." rows={6} required />
              </div>
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
