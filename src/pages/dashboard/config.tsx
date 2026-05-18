import { useState, useEffect, useCallback } from "react";
  import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
  import { Button } from "@/components/ui/button";
  import { Label } from "@/components/ui/label";
  import { Input } from "@/components/ui/input";
  import { Switch } from "@/components/ui/switch";
  import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
  import { Badge } from "@/components/ui/badge";
  import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
    import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
  import { Loader2, RefreshCw, CheckCircle, AlertCircle, Settings, Hash, Shield, Bot, Zap, Star, Plus, X, Send } from "lucide-react";

  interface Channel { id: string; name: string; }
  interface Role { id: string; name: string; color?: number; }
  type Config = Record<string, any>;

  // Multi-role selector: allows up to `max` roles to be selected
  function MultiRoleSelect({
    values, onChange, roles, placeholder, loading, max = 4,
  }: { values: string[]; onChange: (v: string[]) => void; roles: Role[]; placeholder: string; loading: boolean; max?: number; }) {
    const [open, setOpen] = useState(false);
    const safeValues = Array.isArray(values) ? values : [];
    const selected = roles.filter(r => safeValues.includes(r.id));
    const available = roles.filter(r => !safeValues.includes(r.id));

    const roleColor = (color?: number) => {
      if (!color) return '#94a3b8';
      return '#' + color.toString(16).padStart(6, '0');
    };

    return (
      <div className="space-y-2">
        {selected.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {selected.map(role => (
              <div key={role.id} className="flex items-center gap-1 px-2 py-1 rounded-full border border-border bg-muted/30 text-xs font-medium">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: roleColor(role.color) }} />
                {role.name}
                <button onClick={() => onChange(safeValues.filter(v => v !== role.id))} className="ml-0.5 text-muted-foreground hover:text-red-500 transition-colors">
                  <X size={10} />
                </button>
              </div>
            ))}
          </div>
        )}
        {safeValues.length < max ? (
          <div className="relative">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setOpen(o => !o)}
              className="w-full justify-start gap-2 text-muted-foreground text-xs h-8"
            >
              <Plus size={12} /> {selected.length > 0 ? `Add role (${selected.length}/${max})` : placeholder}
            </Button>
            {open && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
                <div className="absolute top-full left-0 mt-1 w-full bg-white border border-border rounded-lg shadow-lg z-20 py-1 max-h-48 overflow-y-auto">
                  {loading ? (
                    <div className="px-3 py-2 text-xs text-muted-foreground flex items-center gap-2"><Loader2 size={11} className="animate-spin" />Loading roles...</div>
                  ) : available.length === 0 ? (
                    <div className="px-3 py-2 text-xs text-muted-foreground">No more roles to add</div>
                  ) : available.map(role => (
                    <button key={role.id} type="button" onClick={() => { onChange([...safeValues, role.id]); if (safeValues.length + 1 >= max) setOpen(false); }}
                      className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted/50 text-xs text-left transition-colors">
                      <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: roleColor(role.color) }} />
                      {role.name}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="text-xs text-muted-foreground italic">Maximum {max} roles selected</div>
        )}
      </div>
    );
  }

  export default function ConfigPage({ guildId }: { guildId: string }) {
    const [config, setConfig] = useState<Config>({});
    const [channels, setChannels] = useState<Channel[]>([]);
    const [roles, setRoles] = useState<Role[]>([]);
    const [isPremium, setIsPremium] = useState(false);
    const [loadingData, setLoadingData] = useState(true);
    const [rolesLoading, setRolesLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState('');
    const [posting, setPosting] = useState<string | null>(null);
    const [postMsg, setPostMsg] = useState<{ type: string; text: string } | null>(null);

    const fetchAll = useCallback(async () => {
      setLoadingData(true);
      try {
        const [cfgRes, chanRes, rolesRes, premRes] = await Promise.all([
          fetch(`/api/guilds/${guildId}/config`, { credentials: 'include' }),
          fetch(`/api/guilds/${guildId}/channels`, { credentials: 'include' }),
          fetch(`/api/guilds/${guildId}/roles`, { credentials: 'include' }),
          fetch(`/api/guilds/${guildId}/premium`, { credentials: 'include' }),
        ]);
        if (cfgRes.ok) setConfig(await cfgRes.json());
        if (chanRes.ok) setChannels(await chanRes.json());
        if (rolesRes.ok) setRoles(await rolesRes.json());
        if (premRes.ok) { const p = await premRes.json(); setIsPremium(p.isPremium || p.premium); }
      } catch { setError('Failed to load configuration.'); }
      setLoadingData(false);
    }, [guildId]);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    const updateConfig = (key: string, value: any) => {
      setConfig(prev => ({ ...prev, [key]: value }));
      setSaved(false);
    };

    const handleSave = async () => {
      setSaving(true); setError('');
      try {
        const payload: Config = {};
        for (const [k, v] of Object.entries(config)) {
          payload[k] = (v === 'none' || v === '') ? null : v;
        }
        const res = await fetch(`/api/guilds/${guildId}/config`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
          body: JSON.stringify(payload),
        });
        if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Failed to save'); }
        const data = await res.json();
        if (data.config) setConfig(data.config);
        setSaved(true); setTimeout(() => setSaved(false), 3000);
      } catch (err: any) { setError(err.message); }
      setSaving(false);
    };

    const postPanel = async (type: string) => {
      setPosting(type); setPostMsg(null);
      try {
        const res = await fetch(`/api/guilds/${guildId}/config/post-panel`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
          body: JSON.stringify({ type }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to post panel');
        setPostMsg({ type: 'ok', text: data.message || 'Panel posted!' });
      } catch (err: any) { setPostMsg({ type: 'err', text: err.message }); }
      setPosting(null);
      setTimeout(() => setPostMsg(null), 5000);
    };

    if (loadingData) return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin mx-auto" style={{ borderColor: '#d4af37', borderTopColor: 'transparent' }} />
          <p className="text-muted-foreground text-sm">Loading configuration...</p>
        </div>
      </div>
    );

    const chanVal = (key: string) => config[key] || "";
    const roleVal = (key: string) => config[key] || "";
    const roleArrVal = (key: string): string[] => {
      const v = config[key];
      if (Array.isArray(v)) return v;
      if (typeof v === 'string' && v) return [v];
      return [];
    };

    const ChannelSelect = ({ label, desc, cfgKey }: { label: string; desc?: string; cfgKey: string }) => (
      <div className="space-y-1.5">
        <Label className="text-sm font-semibold">{label}</Label>
        {desc && <p className="text-xs text-muted-foreground">{desc}</p>}
        <Select value={chanVal(cfgKey)} onValueChange={v => updateConfig(cfgKey, v === 'none' ? null : v)}>
          <SelectTrigger className="bg-white border-border text-sm"><SelectValue placeholder="Select channel" /></SelectTrigger>
          <SelectContent className="bg-white border-border">
            <SelectItem value="none">Not set</SelectItem>
            {channels.map(c => <SelectItem key={c.id} value={c.id}>#{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
    );

    const RoleSelect = ({ label, desc, cfgKey }: { label: string; desc?: string; cfgKey: string }) => (
      <div className="space-y-1.5">
        <Label className="text-sm font-semibold">{label}</Label>
        {desc && <p className="text-xs text-muted-foreground">{desc}</p>}
        <Select value={roleVal(cfgKey)} onValueChange={v => updateConfig(cfgKey, v === 'none' ? null : v)}>
          <SelectTrigger className="bg-white border-border text-sm"><SelectValue placeholder="Select role" /></SelectTrigger>
          <SelectContent className="bg-white border-border">
            <SelectItem value="none">Not set</SelectItem>
            {roles.map(r => <SelectItem key={r.id} value={r.id}>@{r.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
    );

    return (
      <div className="space-y-5 max-w-4xl">
        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight flex items-center gap-2">
              <Settings className="w-6 h-6" style={{ color: '#d4af37' }} /> Server Configuration
            </h2>
            <p className="text-muted-foreground mt-0.5 text-sm">Configure channels, roles, and bot behaviour. Changes are saved to the database.</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {saved && <span className="text-green-600 text-sm flex items-center gap-1.5 font-medium"><CheckCircle size={14} /> Saved!</span>}
            {error && <span className="text-red-600 text-sm flex items-center gap-1.5"><AlertCircle size={14} /> {error}</span>}
            <Button variant="outline" size="sm" onClick={fetchAll} className="gap-1.5"><RefreshCw size={13} />Refresh</Button>
            <Button onClick={handleSave} disabled={saving} size="sm" style={{ background: saving ? undefined : 'linear-gradient(135deg,#d4af37,#ffd700)', color: '#5a3e10', border: 'none' }}>
              {saving ? <><Loader2 size={13} className="animate-spin mr-1" />Saving...</> : "Save Configuration"}
            </Button>
          </div>
        </div>

        <Tabs defaultValue="channels" className="w-full">
          <TabsList className="bg-muted/50 border border-border w-full justify-start flex-wrap h-auto gap-1 p-1">
            {[
              { value: 'channels', icon: <Hash size={13} />, label: 'Channels' },
              { value: 'roles', icon: <Shield size={13} />, label: 'Roles' },
              { value: 'strikes', icon: <Zap size={13} />, label: 'Strike System' },
              { value: 'bot', icon: <Bot size={13} />, label: 'Bot Settings' },
              { value: 'panels', icon: <Send size={13} />, label: 'Post Panels' },
            ].map(t => (
              <TabsTrigger key={t.value} value={t.value} className="flex items-center gap-1.5 text-xs data-[state=active]:bg-white data-[state=active]:text-foreground data-[state=active]:shadow-sm">
                {t.icon}{t.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* ── Channels ── */}
          <TabsContent value="channels" className="mt-4 space-y-4">
            <Card className="border-border bg-white shadow-sm">
              <CardHeader className="pb-3"><CardTitle className="text-base">Logging & Notifications</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <ChannelSelect label="Audit Log Channel" desc="Staff actions, strikes, LOA updates." cfgKey="logs_channel_id" />
                <ChannelSelect label="LOA Channel" desc="Where LOA requests are posted." cfgKey="loa_channel_id" />
                <ChannelSelect label="Applications Panel Channel" desc="Where the apply button panel goes." cfgKey="applications_channel_id" />
                <ChannelSelect label="Applications Review Channel" desc="Where submitted applications land (staff only)." cfgKey="applications_review_channel_id" />
                <ChannelSelect label="Strike Log Channel" desc="Strike issuance notifications." cfgKey="strike_log_channel_id" />
                <ChannelSelect label="Welcome Channel" desc="New staff member announcements." cfgKey="welcome_channel_id" />
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Roles ── */}
          <TabsContent value="roles" className="mt-4 space-y-4">
            <Card className="border-border bg-white shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Staff Tier Roles</CardTitle>
                <CardDescription>Select up to 4 roles per tier. All selected roles are treated as that tier level.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold">Staff Roles (up to 4)</Label>
                  <p className="text-xs text-muted-foreground">Base staff tier — lowest management access.</p>
                  <MultiRoleSelect
                    values={roleArrVal('staff_role_ids')}
                    onChange={v => updateConfig('staff_role_ids', v)}
                    roles={roles} placeholder="Add staff roles..." loading={rolesLoading} max={4}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold">Admin Roles (up to 4)</Label>
                  <p className="text-xs text-muted-foreground">Mid-level — can approve LOA, manage applications.</p>
                  <MultiRoleSelect
                    values={roleArrVal('admin_role_ids')}
                    onChange={v => updateConfig('admin_role_ids', v)}
                    roles={roles} placeholder="Add admin roles..." loading={rolesLoading} max={4}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold">Management Roles (up to 4)</Label>
                  <p className="text-xs text-muted-foreground">Highest tier — full dashboard access.</p>
                  <MultiRoleSelect
                    values={roleArrVal('management_role_ids')}
                    onChange={v => updateConfig('management_role_ids', v)}
                    roles={roles} placeholder="Add management roles..." loading={rolesLoading} max={4}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="border-border bg-white shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Special Roles</CardTitle>
                <CardDescription>Single role assignments for specific status effects.</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <RoleSelect label="On-LOA Role" desc="Assigned when a LOA is approved, removed when returned." cfgKey="on_loa_role_id" />
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Strike System ── */}
          <TabsContent value="strikes" className="mt-4 space-y-4">
            <Card className="border-border bg-white shadow-sm">
              <CardHeader className="pb-3"><CardTitle className="text-base">Strike Settings</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-semibold">Strike Threshold</Label>
                    <p className="text-xs text-muted-foreground">Number of strikes before automatic action is taken.</p>
                    <Input
                      type="number" min="1" max="10"
                      value={config.strike_threshold ?? 3}
                      onChange={e => updateConfig('strike_threshold', parseInt(e.target.value))}
                      className="bg-white border-border w-24"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-semibold">Automatic Action</Label>
                    <p className="text-xs text-muted-foreground">What happens when the threshold is reached.</p>
                    <Select value={config.strike_action || 'demotion'} onValueChange={v => updateConfig('strike_action', v)}>
                      <SelectTrigger className="bg-white border-border text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-white border-border">
                        <SelectItem value="demotion">Demotion</SelectItem>
                        <SelectItem value="termination">Termination</SelectItem>
                        <SelectItem value="notify">Notify Only</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30 gap-4">
                  <div>
                    <p className="text-sm font-semibold">Automate Strike Actions <Badge className="ml-2 text-[10px] bg-amber-100 text-amber-700 border-amber-200">Premium</Badge></p>
                    <p className="text-muted-foreground text-xs mt-0.5">Automatically demote or remove staff when threshold is exceeded.</p>
                  </div>
                  <Switch checked={!!config.strike_automation} onCheckedChange={v => updateConfig('strike_automation', v)} disabled={!isPremium} />
                </div>
              </CardContent>
            </Card>

            <Card className="border-border bg-white shadow-sm">
              <CardHeader className="pb-3"><CardTitle className="text-base">LOA Settings</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-semibold">Maximum LOA Duration (days)</Label>
                    <Input type="number" min="1" max="90" value={config.loa_max_days ?? 14} onChange={e => updateConfig('loa_max_days', parseInt(e.target.value))} className="bg-white border-border w-24" />
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30 gap-4">
                  <div>
                    <p className="text-sm font-semibold">Require Management Approval</p>
                    <p className="text-muted-foreground text-xs mt-0.5">LOA requests need manual approval before taking effect.</p>
                  </div>
                  <Switch checked={config.loa_require_approval !== false} onCheckedChange={v => updateConfig('loa_require_approval', v)} />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Bot Settings ── */}
          <TabsContent value="bot" className="mt-4 space-y-4">
            <Card className="border-border bg-white shadow-sm">
              <CardHeader className="pb-3"><CardTitle className="text-base">Appearance</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold">Embed Colour</Label>
                  <div className="flex items-center gap-2">
                    <input type="color" value={config.embed_color || '#d4af37'} onChange={e => updateConfig('embed_color', e.target.value)} className="w-10 h-9 rounded cursor-pointer border border-border" />
                    <Input value={config.embed_color || '#d4af37'} onChange={e => updateConfig('embed_color', e.target.value)} className="bg-white border-border font-mono text-sm" placeholder="#d4af37" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold">Embed Footer Text</Label>
                  <Input value={config.embed_footer || ''} onChange={e => updateConfig('embed_footer', e.target.value)} placeholder="Zenith Staff Management" className="bg-white border-border" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold">Bot Prefix</Label>
                  <Input value={config.prefix || '!'} onChange={e => updateConfig('prefix', e.target.value)} placeholder="!" className="bg-white border-border w-20" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold">Timezone</Label>
                  <Select value={config.timezone || 'UTC'} onValueChange={v => updateConfig('timezone', v)}>
                    <SelectTrigger className="bg-white border-border text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-white border-border">
                      {['UTC','America/New_York','America/Chicago','America/Denver','America/Los_Angeles','Europe/London','Europe/Paris','Asia/Tokyo','Australia/Sydney'].map(tz => (
                        <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border bg-white shadow-sm">
              <CardHeader className="pb-3"><CardTitle className="text-base">Command Registration</CardTitle><CardDescription>Fix duplicate or missing slash commands in your Discord server.</CardDescription></CardHeader>
              <CardContent>
                <Button variant="outline" onClick={async () => {
                  const res = await fetch(`/api/admin/register-commands`, { method: 'POST', credentials: 'include' });
                  const d = await res.json();
                  if (res.ok) setPostMsg({ type: 'ok', text: `Registered ${d.registered} commands.` });
                  else setPostMsg({ type: 'err', text: d.error || 'Failed' });
                  setTimeout(() => setPostMsg(null), 5000);
                }} className="gap-1.5">
                  <RefreshCw size={13} /> Re-register Slash Commands
                </Button>
                {postMsg && <p className={`mt-2 text-sm ${postMsg.type === 'ok' ? 'text-green-600' : 'text-red-600'}`}>{postMsg.text}</p>}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Post Panels ── */}
          <TabsContent value="panels" className="mt-4 space-y-4">
            <Card className="border-border bg-white shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Discord Panels</CardTitle>
                <CardDescription>Post interactive panels to your configured channels. Users click buttons to submit applications or LOA requests — no commands needed.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {postMsg && (
                  <div className={`p-3 rounded-lg text-sm font-medium flex items-center gap-2 ${postMsg.type === 'ok' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                    {postMsg.type === 'ok' ? <CheckCircle size={14} /> : <AlertCircle size={14} />} {postMsg.text}
                  </div>
                )}
                {[
                  { type: 'applications', label: 'Post Application Panel', desc: 'Posts an "Apply Now" button embed to your applications channel.', icon: '📋', channel: config.applications_channel_id },
                  { type: 'loa', label: 'Post LOA Request Panel', desc: 'Posts a "Request LOA" button embed to your LOA channel.', icon: '📅', channel: config.loa_channel_id },
                ].map(panel => (
                  <div key={panel.type} className="flex items-center justify-between p-4 border border-border rounded-lg bg-muted/20 gap-4">
                    <div>
                      <p className="font-semibold text-sm">{panel.icon} {panel.label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{panel.desc}</p>
                      {!panel.channel && <p className="text-xs text-amber-600 mt-1">⚠ Configure the channel first in the Channels tab.</p>}
                    </div>
                    <Button size="sm" onClick={() => postPanel(panel.type)} disabled={!!posting || !panel.channel} className="gap-1.5 flex-shrink-0" style={{ background: panel.channel ? 'linear-gradient(135deg,#d4af37,#ffd700)' : undefined, color: panel.channel ? '#5a3e10' : undefined, border: 'none' }}>
                      {posting === panel.type ? <><Loader2 size={12} className="animate-spin" />Posting...</> : <><Send size={12} />Post</>}
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    );
  }
  