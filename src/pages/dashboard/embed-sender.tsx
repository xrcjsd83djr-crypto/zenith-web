import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { AlertCircle, CheckCircle, Loader2, Send, Hash, RefreshCw, Sparkles } from "lucide-react";

interface Channel { id: string; name: string; }

function MockDiscordPreview({ channelName, embed }: {
  channelName: string;
  embed: { title: string; description: string; color: string; footer: string; authorName: string; imageUrl: string; thumbnailUrl: string; fields: { name: string; value: string; inline: boolean }[] };
}) {
  const hexColor = embed.color || '#5865f2';
  const colorNum = parseInt(hexColor.replace('#',''), 16);
  const r = (colorNum >> 16) & 255, g = (colorNum >> 8) & 255, b = colorNum & 255;

  const hasContent = embed.title || embed.description || embed.authorName || embed.footer || embed.fields.some(f => f.name || f.value);

  const now = new Date();
  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="rounded-lg overflow-hidden border border-[#1e1f22]" style={{ background: '#313338', fontFamily: 'Whitney,"Helvetica Neue",Helvetica,Arial,sans-serif' }}>
      {/* Channel header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-[#1e1f22]" style={{ background: '#2b2d31' }}>
        <Hash size={18} className="text-[#80848e]" />
        <span className="font-semibold text-white text-sm">{channelName || 'select-a-channel'}</span>
      </div>

      {/* Message area */}
      <div className="px-4 py-4 min-h-[200px]">
        {!hasContent && !embed.imageUrl ? (
          <div className="flex items-center justify-center h-32 text-[#80848e] text-sm">
            Fill in the embed fields to see a preview
          </div>
        ) : (
          <div className="flex gap-4">
            {/* Bot avatar */}
            <div className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center font-bold text-black text-sm" style={{ background: '#d4af37', marginTop: 2 }}>
              Z
            </div>
            <div className="flex-1 min-w-0">
              {/* Bot name + timestamp */}
              <div className="flex items-baseline gap-2 mb-1">
                <span className="font-semibold text-white text-sm">Zenith</span>
                <span className="text-[#80848e] text-[11px]">Today at {timeStr}</span>
              </div>
              {/* Embed */}
              {hasContent || embed.imageUrl ? (
                <div className="rounded max-w-md overflow-hidden" style={{ background: '#2b2d31', borderLeft: `4px solid ${hexColor}` }}>
                  <div className="p-3 space-y-1.5">
                    {embed.authorName && (
                      <div className="flex items-center gap-1.5">
                        <div className="w-5 h-5 rounded-full bg-[#5865f2] flex-shrink-0" />
                        <p className="text-xs font-semibold text-[#dbdee1]">{embed.authorName}</p>
                      </div>
                    )}
                    {embed.title && (
                      <p className="font-semibold text-white text-sm leading-snug">{embed.title}</p>
                    )}
                    {embed.description && (
                      <p className="text-[#dbdee1] text-sm whitespace-pre-wrap leading-relaxed" style={{ fontSize: '0.85rem' }}>{embed.description}</p>
                    )}
                    {embed.fields.some(f => f.name || f.value) && (
                      <div className="grid gap-1.5 mt-1" style={{ gridTemplateColumns: embed.fields.some(f => f.inline) ? 'repeat(3, 1fr)' : '1fr' }}>
                        {embed.fields.filter(f => f.name || f.value).map((f, i) => (
                          <div key={i} style={{ gridColumn: f.inline ? 'span 1' : '1 / -1' }}>
                            <p className="text-[11px] font-bold text-[#dbdee1]">{f.name}</p>
                            <p className="text-[12px] text-[#b5bac1]">{f.value}</p>
                          </div>
                        ))}
                      </div>
                    )}
                    {embed.imageUrl && (
                      <img src={embed.imageUrl} alt="embed" className="rounded mt-1 max-w-full" style={{ maxHeight: 200, objectFit: 'cover' }} onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                    )}
                    {embed.thumbnailUrl && !embed.imageUrl && (
                      <img src={embed.thumbnailUrl} alt="thumbnail" className="rounded float-right ml-2 w-16 h-16 object-cover" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                    )}
                    {embed.footer && (
                      <div className="flex items-center gap-1.5 pt-1 border-t border-[#3d4045]">
                        <p className="text-[11px] text-[#80848e]">{embed.footer}</p>
                      </div>
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const COLORS = [
  { label: 'Gold', value: '#d4af37' }, { label: 'Blurple', value: '#5865f2' },
  { label: 'Green', value: '#57f287' }, { label: 'Red', value: '#ed4245' },
  { label: 'Teal', value: '#1abc9c' }, { label: 'Orange', value: '#f47b25' },
  { label: 'Pink', value: '#eb459e' }, { label: 'Dark', value: '#36393f' },
];

const defaultFields = () => [{ name: '', value: '', inline: false }];

export default function EmbedSenderPage({ guildId }: { guildId: string }) {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const showToast = (type: 'ok' | 'err', text: string) => { setToast({ type, text }); setTimeout(() => setToast(null), 5000); };

  const [selectedChannel, setSelectedChannel] = useState('');
  const [embed, setEmbed] = useState({
    title: '',
    description: '',
    color: '#d4af37',
    footer: 'Zenith Staff Management',
    authorName: '',
    imageUrl: '',
    thumbnailUrl: '',
    fields: defaultFields(),
  });
  const [customColor, setCustomColor] = useState('');

  const fetchChannels = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/guilds/${guildId}/channels`, { credentials: 'include' });
      if (r.ok) setChannels(await r.json());
    } catch {}
    setLoading(false);
  }, [guildId]);

  useEffect(() => { fetchChannels(); }, [fetchChannels]);

  const setField = (key: keyof typeof embed, val: any) => setEmbed(e => ({ ...e, [key]: val }));

  const updateField = (i: number, key: 'name' | 'value' | 'inline', val: any) => {
    setEmbed(e => {
      const fields = [...e.fields];
      fields[i] = { ...fields[i], [key]: val };
      return { ...e, fields };
    });
  };

  const addField = () => setEmbed(e => ({ ...e, fields: [...e.fields, { name: '', value: '', inline: false }] }));
  const removeField = (i: number) => setEmbed(e => ({ ...e, fields: e.fields.filter((_, idx) => idx !== i) }));

  const selectedChannelName = channels.find(c => c.id === selectedChannel)?.name || '';

  const handleSend = async () => {
    if (!selectedChannel) return showToast('err', 'Please select a channel first.');
    if (!embed.title && !embed.description) return showToast('err', 'Embed needs at least a title or description.');
    setSending(true);
    try {
      const fields = embed.fields.filter(f => f.name && f.value);
      const res = await fetch(`/api/guilds/${guildId}/embed-sender/send`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channelId: selectedChannel, ...embed, fields }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send embed');
      showToast('ok', `Embed sent to #${selectedChannelName}!`);
    } catch (err: any) { showToast('err', err.message); }
    setSending(false);
  };

  return (
    <div className="space-y-5 max-w-6xl">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm font-medium ${toast.type === 'ok' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
          {toast.type === 'ok' ? <CheckCircle size={15} /> : <AlertCircle size={15} />}{toast.text}
        </div>
      )}

      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight flex items-center gap-2">
            <Sparkles className="w-6 h-6" style={{ color: '#d4af37' }} />Embed Sender
          </h2>
          <p className="text-muted-foreground mt-0.5 text-sm">Build rich Discord embeds and send them to any channel with a live preview</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchChannels} className="gap-1.5"><RefreshCw size={13} />Refresh Channels</Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Builder */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold flex items-center gap-2"><Hash size={14} />Target Channel</CardTitle></CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 size={14} className="animate-spin" />Loading channels...</div>
              ) : (
                <Select value={selectedChannel} onValueChange={setSelectedChannel}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a channel to send to" />
                  </SelectTrigger>
                  <SelectContent>
                    {channels.length === 0 ? (
                      <div className="px-3 py-2 text-sm text-muted-foreground">No channels found. Make sure the bot has access.</div>
                    ) : (
                      channels.map(c => <SelectItem key={c.id} value={c.id}>#{c.name}</SelectItem>)
                    )}
                  </SelectContent>
                </Select>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold">Embed Content</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Author Name <span className="text-muted-foreground">(optional)</span></Label>
                <Input value={embed.authorName} onChange={e => setField('authorName', e.target.value)} placeholder="e.g. Zenith Staff System" className="h-8 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Title <span className="text-muted-foreground">(optional)</span></Label>
                <Input value={embed.title} onChange={e => setField('title', e.target.value)} placeholder="Embed title" className="h-8 text-sm" maxLength={256} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Description <span className="text-muted-foreground">(supports markdown)</span></Label>
                <Textarea value={embed.description} onChange={e => setField('description', e.target.value)} placeholder="Embed description…" rows={4} className="text-sm resize-y" maxLength={4096} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Footer Text</Label>
                <Input value={embed.footer} onChange={e => setField('footer', e.target.value)} placeholder="Footer text" className="h-8 text-sm" maxLength={2048} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold">Fields <span className="text-muted-foreground font-normal text-xs ml-1">up to 25</span></CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {embed.fields.map((f, i) => (
                <div key={i} className="space-y-2 p-3 rounded-lg border border-border bg-muted/30">
                  <div className="flex gap-2">
                    <Input value={f.name} onChange={e => updateField(i, 'name', e.target.value)} placeholder="Field name" className="h-7 text-xs flex-1" />
                    <Button variant="ghost" size="sm" onClick={() => removeField(i)} className="h-7 px-2 text-red-400 hover:text-red-600 text-xs">×</Button>
                  </div>
                  <Input value={f.value} onChange={e => updateField(i, 'value', e.target.value)} placeholder="Field value" className="h-7 text-xs" />
                  <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                    <input type="checkbox" checked={f.inline} onChange={e => updateField(i, 'inline', e.target.checked)} className="rounded" />
                    Inline
                  </label>
                </div>
              ))}
              {embed.fields.length < 25 && (
                <Button variant="outline" size="sm" onClick={addField} className="w-full text-xs h-7 gap-1">+ Add Field</Button>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold">Appearance</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Accent Color</Label>
                <div className="flex flex-wrap gap-2">
                  {COLORS.map(c => (
                    <button
                      key={c.value}
                      title={c.label}
                      onClick={() => { setField('color', c.value); setCustomColor(''); }}
                      className="w-7 h-7 rounded-full border-2 transition-all"
                      style={{ background: c.value, borderColor: embed.color === c.value && !customColor ? '#000' : 'transparent', outline: embed.color === c.value && !customColor ? '2px solid #d4af37' : 'none' }}
                    />
                  ))}
                  <div className="flex items-center gap-1.5">
                    <input
                      type="color"
                      value={customColor || embed.color}
                      onChange={e => { setCustomColor(e.target.value); setField('color', e.target.value); }}
                      className="w-7 h-7 rounded cursor-pointer border border-border"
                      title="Custom color"
                    />
                    <span className="text-xs text-muted-foreground">Custom</span>
                  </div>
                </div>
              </div>
              <Separator />
              <div className="space-y-1.5">
                <Label className="text-xs">Image URL <span className="text-muted-foreground">(large image below description)</span></Label>
                <Input value={embed.imageUrl} onChange={e => setField('imageUrl', e.target.value)} placeholder="https://..." className="h-8 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Thumbnail URL <span className="text-muted-foreground">(small image top-right)</span></Label>
                <Input value={embed.thumbnailUrl} onChange={e => setField('thumbnailUrl', e.target.value)} placeholder="https://..." className="h-8 text-sm" />
              </div>
            </CardContent>
          </Card>

          <Button
            onClick={handleSend}
            disabled={sending || !selectedChannel}
            className="w-full gap-2"
            style={{ background: '#d4af37', color: '#000' }}
            size="lg"
          >
            {sending ? <><Loader2 size={16} className="animate-spin" />Sending…</> : <><Send size={16} />Send Embed to #{selectedChannelName || 'channel'}</>}
          </Button>
        </div>

        {/* Preview */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold">Live Preview</p>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold" style={{ background: '#5865f2', color: '#fff' }}>Discord</span>
          </div>
          <div className="sticky top-4">
            <MockDiscordPreview channelName={selectedChannelName} embed={embed} />
            <p className="text-[11px] text-muted-foreground mt-2 text-center">Preview updates in real-time as you type</p>
          </div>
        </div>
      </div>
    </div>
  );
}
