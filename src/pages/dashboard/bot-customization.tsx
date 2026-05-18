import { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, RefreshCw, CheckCircle, Settings2, AlertCircle, Star, Upload, Image, Palette, Eye } from "lucide-react";

interface BotCustomization {
  customBotName: string; customBotAvatar: string; customBotStatus: string;
  embedColor: string; embedFooter: string; isPremium: boolean;
}

function ImageUpload({ label, desc, value, onChange, disabled }: { label: string; desc?: string; value: string; onChange: (url: string) => void; disabled: boolean }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [previewErr, setPreviewErr] = useState(false);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { alert('Image must be under 2MB'); return; }
    setUploading(true);
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      onChange(base64);
      setUploading(false);
      setPreviewErr(false);
    };
    reader.onerror = () => setUploading(false);
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-2">
      <Label className="font-semibold text-sm">{label}</Label>
      {desc && <p className="text-xs text-muted-foreground">{desc}</p>}
      <div className="flex items-start gap-3">
        {/* Preview */}
        <div className="w-16 h-16 rounded-xl border-2 border-dashed border-border bg-muted/30 flex items-center justify-center flex-shrink-0 overflow-hidden">
          {value && !previewErr ? (
            <img src={value} alt="Preview" className="w-full h-full object-cover rounded-xl" onError={() => setPreviewErr(true)} />
          ) : (
            <Image size={20} className="text-muted-foreground" />
          )}
        </div>
        {/* Controls */}
        <div className="flex-1 space-y-1.5">
          <div className="flex gap-2">
            <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/gif,image/webp" className="hidden" onChange={handleFile} disabled={disabled} />
            <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={disabled || uploading} className="gap-1.5 text-xs">
              {uploading ? <><Loader2 size={11} className="animate-spin" />Uploading...</> : <><Upload size={11} />Upload Image</>}
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground">Or paste a URL:</p>
          <Input
            value={value.startsWith('data:') ? '' : value}
            onChange={e => { onChange(e.target.value); setPreviewErr(false); }}
            placeholder="https://example.com/image.png"
            className="bg-white border-border text-xs h-7"
            disabled={disabled}
          />
          {value.startsWith('data:') && <p className="text-[10px] text-green-600">✓ Local image uploaded</p>}
        </div>
      </div>
    </div>
  );
}

export default function BotCustomizationPage({ guildId }: { guildId: string }) {
  const [data, setData] = useState<BotCustomization>({
    customBotName: '', customBotAvatar: '', customBotStatus: '',
    embedColor: '#d4af37', embedFooter: 'Zenith Staff Management', isPremium: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingEmbed, setSavingEmbed] = useState(false);
  const [toast, setToast] = useState<{ type: "ok"|"err"; text: string } | null>(null);

  const showToast = (type: "ok"|"err", text: string) => { setToast({ type, text }); setTimeout(() => setToast(null), 4000); };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [botRes, embedRes] = await Promise.all([
        fetch(`/api/guilds/${guildId}/bot-customization`, { credentials: 'include' }),
        fetch(`/api/guilds/${guildId}/embed-config`, { credentials: 'include' }),
      ]);
      const botData = botRes.ok ? await botRes.json() : {};
      const embedData = embedRes.ok ? await embedRes.json() : {};
      setData(d => ({
        ...d,
        isPremium: !!botData.isPremium,
        customBotName: botData.customBotName || '',
        customBotAvatar: botData.customBotAvatar || '',
        customBotStatus: botData.customBotStatus || '',
        embedColor: embedData.color || '#d4af37',
        embedFooter: embedData.footer || 'Zenith Staff Management',
      }));
    } catch {}
    setLoading(false);
  }, [guildId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const saveBotIdentity = async () => {
    if (!data.isPremium) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/guilds/${guildId}/bot-customization`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({ customBotName: data.customBotName, customBotAvatar: data.customBotAvatar, customBotStatus: data.customBotStatus }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      showToast('ok', 'Bot identity saved! Changes apply on next bot restart.');
    } catch (err: any) { showToast('err', err.message); }
    setSaving(false);
  };

  const saveEmbedConfig = async () => {
    setSavingEmbed(true);
    try {
      const res = await fetch(`/api/guilds/${guildId}/embed-config`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({ color: data.embedColor, footer: data.embedFooter }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error((await res.json()).error); }
      showToast('ok', 'Embed settings saved! All bot embeds now use your custom color and footer.');
    } catch (err: any) { showToast('err', err.message || 'Failed to save embed config'); }
    setSavingEmbed(false);
  };

  if (loading) return (
    <div className="flex justify-center items-center py-24">
      <div className="w-7 h-7 rounded-full border-2 animate-spin" style={{ borderColor: '#d4af37', borderTopColor: 'transparent' }} />
    </div>
  );

  // Preview of what the embed looks like
  const EmbedPreview = () => (
    <div className="rounded-lg overflow-hidden border border-border bg-[#313338] p-3">
      <div className="flex gap-3">
        <div className="w-1 flex-shrink-0 rounded-full" style={{ background: data.embedColor }} />
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-semibold">✅ Example Embed Title</p>
          <p className="text-[#b9bbbe] text-xs mt-1">This is what your bot embeds will look like with your custom color and footer text.</p>
          <p className="text-[#72767d] text-[10px] mt-2">{data.embedFooter || 'Zenith Staff Management'} • Today at {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
        </div>
      </div>
    </div>
  );

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
            <Settings2 className="w-6 h-6" style={{ color: '#d4af37' }} /> Bot Customization
          </h2>
          <p className="text-muted-foreground mt-0.5 text-sm">Control how the bot looks and behaves in your server. Embed config is free — bot identity requires Premium.</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData} className="gap-1.5"><RefreshCw size={13} />Refresh</Button>
      </div>

      <Tabs defaultValue="embed" className="w-full">
        <TabsList className="bg-muted/50 border border-border w-full justify-start flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="embed" className="flex items-center gap-1.5 text-xs data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <Palette size={13} />Embed Settings
          </TabsTrigger>
          <TabsTrigger value="identity" className="flex items-center gap-1.5 text-xs data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <Settings2 size={13} />Bot Identity
            <Star size={10} className="ml-0.5" style={{ color: '#d4af37' }} />
          </TabsTrigger>
        </TabsList>

        {/* Embed Settings — available to all */}
        <TabsContent value="embed" className="mt-4 space-y-4">
          <Card className="border-border bg-white shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">Embed Appearance <span className="text-xs font-normal text-muted-foreground">(free for all servers)</span></CardTitle>
              <CardDescription>Customize the color and footer of all bot embeds in your server.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label className="font-semibold text-sm">Embed Color</Label>
                <div className="flex items-center gap-3">
                  <input type="color" value={data.embedColor} onChange={e => setData(d => ({ ...d, embedColor: e.target.value }))} className="w-12 h-10 rounded-lg border border-border cursor-pointer" />
                  <Input value={data.embedColor} onChange={e => setData(d => ({ ...d, embedColor: e.target.value }))} className="bg-white border-border font-mono w-36" placeholder="#d4af37" />
                  <div className="flex gap-2 flex-wrap">
                    {['#d4af37', '#5865F2', '#57F287', '#ED4245', '#FEE75C', '#EB459E', '#3BA55C'].map(c => (
                      <button key={c} type="button" onClick={() => setData(d => ({ ...d, embedColor: c }))} className="w-7 h-7 rounded-full border-2 transition-all hover:scale-110" style={{ background: c, borderColor: data.embedColor === c ? '#000' : 'transparent' }} />
                    ))}
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="font-semibold text-sm">Footer Text</Label>
                <Input value={data.embedFooter} onChange={e => setData(d => ({ ...d, embedFooter: e.target.value }))} placeholder="Zenith Staff Management" className="bg-white border-border" maxLength={100} />
                <p className="text-xs text-muted-foreground">Appears at the bottom of every bot embed. Keep it short and professional.</p>
              </div>

              {/* Live preview */}
              <div className="space-y-2">
                <Label className="font-semibold text-sm flex items-center gap-1.5"><Eye size={13} />Live Preview</Label>
                <EmbedPreview />
              </div>

              <div className="flex justify-end">
                <Button onClick={saveEmbedConfig} disabled={savingEmbed} style={{ background: 'linear-gradient(135deg,#d4af37,#ffd700)', color: '#5a3e10', border: 'none' }} className="gap-1.5 font-semibold">
                  {savingEmbed ? <><Loader2 size={13} className="animate-spin" />Saving...</> : "Save Embed Settings"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Bot Identity — premium only */}
        <TabsContent value="identity" className="mt-4 space-y-4">
          {!data.isPremium && (
            <Card className="border-amber-200 bg-amber-50 shadow-sm">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                  <Star className="w-5 h-5 fill-current" style={{ color: '#d4af37' }} />
                </div>
                <div>
                  <p className="font-bold text-amber-900">Premium Feature</p>
                  <p className="text-amber-800 text-sm">Customize the bot's name, avatar, and status. This changes how the bot appears in your server.</p>
                </div>
                <a href="/premium" className="ml-auto px-4 py-1.5 rounded-lg text-sm font-semibold flex-shrink-0" style={{ background: 'linear-gradient(135deg,#d4af37,#ffd700)', color: '#5a3e10' }}>Upgrade</a>
              </CardContent>
            </Card>
          )}

          <Card className={`border-border bg-white shadow-sm ${!data.isPremium ? 'opacity-60 pointer-events-none' : ''}`}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Bot Identity</CardTitle>
              <CardDescription>These settings are applied when the bot restarts. They affect how the bot appears in your Discord server.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label className="font-semibold text-sm">Custom Bot Name</Label>
                <Input
                  disabled={!data.isPremium}
                  value={data.customBotName}
                  onChange={e => setData(d => ({ ...d, customBotName: e.target.value }))}
                  placeholder="e.g. Liberty County HR Bot"
                  className="bg-white border-border"
                />
                <p className="text-xs text-muted-foreground">The display name shown in Discord. Changing the actual username requires Bot Token scope.</p>
              </div>

              <ImageUpload
                label="Bot Avatar"
                desc="Upload an image or paste a URL. Shown as the bot's profile picture."
                value={data.customBotAvatar}
                onChange={v => setData(d => ({ ...d, customBotAvatar: v }))}
                disabled={!data.isPremium}
              />

              <div className="space-y-2">
                <Label className="font-semibold text-sm">Custom Status</Label>
                <Input
                  disabled={!data.isPremium}
                  value={data.customBotStatus}
                  onChange={e => setData(d => ({ ...d, customBotStatus: e.target.value }))}
                  placeholder="e.g. Watching Liberty County | /help"
                  className="bg-white border-border"
                  maxLength={128}
                />
              </div>

              <div className="flex justify-end">
                <Button onClick={saveBotIdentity} disabled={saving || !data.isPremium} style={data.isPremium ? { background: 'linear-gradient(135deg,#d4af37,#ffd700)', color: '#5a3e10', border: 'none' } : {}} className="gap-1.5 font-semibold">
                  {saving ? <><Loader2 size={13} className="animate-spin" />Saving...</> : "Save Bot Identity"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
