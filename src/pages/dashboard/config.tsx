import { useState, useEffect, useCallback } from "react";
  import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
  import { Button } from "@/components/ui/button";
  import { Input } from "@/components/ui/input";
  import { Label } from "@/components/ui/label";
  import { Switch } from "@/components/ui/switch";
  import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
  import { Badge } from "@/components/ui/badge";
  import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
  import { Separator } from "@/components/ui/separator";
  import { CheckCircle, AlertCircle, Loader2, Hash, Shield, Settings, Bell, Users, FileText, Send, Star, Lock } from "lucide-react";
  import { Textarea } from "@/components/ui/textarea";

  interface Channel { id: string; name: string; type: number; }
  interface Role { id: string; name: string; color: string; }
  interface Config { [key: string]: any; }

  function ChannelSelect({ value, onChange, channels, placeholder = "Select a channel", loading }: {
    value: string; onChange: (v: string) => void;
    channels: Channel[]; placeholder?: string; loading?: boolean;
  }) {
    return (
      <Select value={value || ""} onValueChange={onChange}>
        <SelectTrigger className="w-full bg-white border-border">
          <SelectValue placeholder={loading ? "Loading channels..." : placeholder}>
            {value && value !== "none" ? (
              <span className="flex items-center gap-2 text-foreground">
                <Hash size={13} className="text-muted-foreground flex-shrink-0" />
                {channels.find(c => c.id === value)?.name || value}
              </span>
            ) : (
              <span className="text-muted-foreground">{loading ? "Loading channels..." : placeholder}</span>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="bg-white border-border">
          <SelectItem value="none">
            <span className="flex items-center gap-2 text-muted-foreground">
              <AlertCircle size={13} /> Not configured
            </span>
          </SelectItem>
          {channels.map(c => (
            <SelectItem key={c.id} value={c.id}>
              <span className="flex items-center gap-2">
                <Hash size={13} className="text-muted-foreground flex-shrink-0" />
                {c.name}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  function RoleSelect({ value, onChange, roles, placeholder = "Select a role", loading }: {
    value: string; onChange: (v: string) => void;
    roles: Role[]; placeholder?: string; loading?: boolean;
  }) {
    return (
      <Select value={value || ""} onValueChange={onChange}>
        <SelectTrigger className="w-full bg-white border-border">
          <SelectValue placeholder={loading ? "Loading roles..." : placeholder}>
            {value && value !== "none" ? (
              <span className="flex items-center gap-2 text-foreground">
                <Shield size={13} className="text-muted-foreground flex-shrink-0" />
                {roles.find(r => r.id === value)?.name || value}
              </span>
            ) : (
              <span className="text-muted-foreground">{loading ? "Loading roles..." : placeholder}</span>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="bg-white border-border">
          <SelectItem value="none">
            <span className="flex items-center gap-2 text-muted-foreground">
              <AlertCircle size={13} /> Not configured
            </span>
          </SelectItem>
          {roles.map(r => (
            <SelectItem key={r.id} value={r.id}>
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full flex-shrink-0 border border-border"
                  style={{ backgroundColor: (!r.color || r.color === '#000000' || r.color === '#99aab5') ? '#9ca3af' : r.color }} />
                {r.name}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  function FieldGroup({ label, description, children }: { label: string; description?: string; children: React.ReactNode }) {
    return (
      <div className="space-y-1.5">
        <Label className="text-sm font-semibold text-foreground">{label}</Label>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
        {children}
      </div>
    );
  }

  function StatusBadge({ configured }: { configured: boolean }) {
    return configured ? (
      <Badge className="bg-green-100 text-green-700 border-green-200 text-xs whitespace-nowrap">
        <CheckCircle size={10} className="mr-1" /> Set
      </Badge>
    ) : (
      <Badge variant="outline" className="text-muted-foreground text-xs whitespace-nowrap">Not set</Badge>
    );
  }

  function PremiumLock({ children, isPremium }: { children: React.ReactNode; isPremium: boolean }) {
    if (isPremium) return <>{children}</>;
    return (
      <div className="relative">
        <div className="pointer-events-none opacity-40 select-none">{children}</div>
        <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-white/60 backdrop-blur-[1px]">
          <div className="flex items-center gap-1.5 bg-white border border-border rounded-full px-3 py-1.5 shadow-sm text-xs font-semibold text-muted-foreground">
            <Lock size={12} style={{ color: '#d4af37' }} />
            <span>Premium only</span>
          </div>
        </div>
      </div>
    );
  }

  export default function ConfigPage({ guildId }: { guildId: string }) {
    const [channels, setChannels] = useState<Channel[]>([]);
    const [roles, setRoles] = useState<Role[]>([]);
    const [config, setConfig] = useState<Config>({});
    const [isPremium, setIsPremium] = useState(false);
    const [loadingData, setLoadingData] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState("");
    const [posting, setPosting] = useState<string | null>(null);
    const [postMsg, setPostMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

    const fetchAll = useCallback(async () => {
      setLoadingData(true);
      try {
        const [chanRes, rolesRes, cfgRes, premRes] = await Promise.all([
          fetch(`/api/guilds/${guildId}/channels`, { credentials: 'include' }),
          fetch(`/api/guilds/${guildId}/roles`, { credentials: 'include' }),
          fetch(`/api/guilds/${guildId}/config`, { credentials: 'include' }),
          fetch(`/api/guilds/${guildId}/is-premium`, { credentials: 'include' }),
        ]);
        if (chanRes.ok) setChannels(await chanRes.json());
        if (rolesRes.ok) setRoles(await rolesRes.json());
        if (cfgRes.ok) setConfig(await cfgRes.json());
        if (premRes.ok) { const p = await premRes.json(); setIsPremium(p.isPremium || p.premium); }
      } catch {
        setError("Failed to load configuration. Check bot token and server access.");
      } finally {
        setLoadingData(false);
      }
    }, [guildId]);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    const updateConfig = (key: string, value: any) => {
      setConfig(prev => ({ ...prev, [key]: value }));
      setSaved(false);
    };

    const handleSave = async () => {
      setSaving(true);
      setError("");
      try {
        const payload: Config = {};
        for (const [k, v] of Object.entries(config)) {
          payload[k] = (v === "none" || v === "") ? null : v;
        }
        const res = await fetch(`/api/guilds/${guildId}/config`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || 'Failed to save');
        }
        const data = await res.json();
        if (data.config) setConfig(data.config);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setSaving(false);
      }
    };

    const postPanel = async (type: string) => {
      setPosting(type);
      setPostMsg(null);
      try {
        const res = await fetch(`/api/guilds/${guildId}/config/post-panel`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ type }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to post panel');
        setPostMsg({ type: "ok", text: data.message || 'Panel posted successfully!' });
      } catch (err: any) {
        setPostMsg({ type: "err", text: err.message });
      } finally {
        setPosting(null);
        setTimeout(() => setPostMsg(null), 5000);
      }
    };

    if (loadingData) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-center space-y-3">
            <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin mx-auto"
              style={{ borderColor: '#d4af37', borderTopColor: 'transparent' }} />
            <p className="text-muted-foreground text-sm">Loading configuration...</p>
          </div>
        </div>
      );
    }

    const chanVal = (key: string) => config[key] || "";
    const roleVal = (key: string) => config[key] || "";

    return (
      <div className="space-y-6 max-w-4xl">
        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight">Server Configuration</h2>
            <p className="text-muted-foreground mt-0.5 text-sm">Configure channels, roles, and bot behaviour. All saved to the database.</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {postMsg && (
              <span className={`flex items-center gap-1.5 text-sm font-medium ${postMsg.type === "ok" ? "text-green-600" : "text-destructive"}`}>
                {postMsg.type === "ok" ? <CheckCircle size={15} /> : <AlertCircle size={15} />}
                {postMsg.text}
              </span>
            )}
            {saved && (
              <span className="flex items-center gap-1.5 text-green-600 text-sm font-medium">
                <CheckCircle size={15} /> Saved!
              </span>
            )}
            {error && (
              <span className="flex items-center gap-1.5 text-destructive text-sm">
                <AlertCircle size={14} /> {error}
              </span>
            )}
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              {saving ? <><Loader2 size={14} className="animate-spin" />Saving...</> : "Save Changes"}
            </Button>
          </div>
        </div>

        <Tabs defaultValue="channels" className="space-y-4">
          <TabsList className="flex flex-wrap gap-1 h-auto p-1">
            <TabsTrigger value="channels" className="gap-1.5"><Hash size={13} /> Channels</TabsTrigger>
            <TabsTrigger value="roles" className="gap-1.5"><Shield size={13} /> Roles</TabsTrigger>
            <TabsTrigger value="strikes" className="gap-1.5"><AlertCircle size={13} /> Strikes</TabsTrigger>
            <TabsTrigger value="loa" className="gap-1.5"><Bell size={13} /> LOA</TabsTrigger>
            <TabsTrigger value="applications" className="gap-1.5"><FileText size={13} /> Applications</TabsTrigger>
            <TabsTrigger value="general" className="gap-1.5"><Settings size={13} /> General</TabsTrigger>
          </TabsList>

          {/* ── CHANNELS ── */}
          <TabsContent value="channels">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Hash size={17} style={{ color: '#d4af37' }} /> Channel Configuration
                </CardTitle>
                <CardDescription>Set channels for different bot features. Dropdowns are fetched live from your Discord server.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {[
                    { key: 'logs_channel_id',                label: 'Logs Channel',               desc: 'All mod actions and bot logs.' },
                    { key: 'loa_channel_id',                 label: 'LOA Channel',                desc: 'Leave of absence request posts.' },
                    { key: 'applications_channel_id',        label: 'Applications Channel',       desc: 'Staff application panel posts here.' },
                    { key: 'applications_review_channel_id', label: 'Applications Review',        desc: 'Management review for applications.' },
                    { key: 'welcome_channel_id',             label: 'Welcome Channel',            desc: 'New staff welcome messages.' },
                    { key: 'strike_log_channel_id',          label: 'Strike Log Channel',         desc: 'Strike records logged here.' },
                  ].map(({ key, label, desc }) => (
                    <FieldGroup key={key} label={label} description={desc}>
                      <div className="flex items-center gap-2">
                        <ChannelSelect
                          value={chanVal(key)}
                          onChange={v => updateConfig(key, v)}
                          channels={channels}
                        />
                        <StatusBadge configured={!!config[key]} />
                      </div>
                    </FieldGroup>
                  ))}
                </div>

                <Separator />

                {/* Panel posting buttons */}
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold">Post Panels to Discord</h4>
                  <p className="text-xs text-muted-foreground">Post interactive panels to the configured channels. Save your channel settings first.</p>
                  <div className="flex flex-wrap gap-3">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!config.applications_channel_id || posting === 'applications'}
                      onClick={() => postPanel('applications')}
                      className="gap-2 border-primary/30 text-primary hover:bg-primary/5"
                    >
                      {posting === 'applications' ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                      Post Application Panel
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!config.loa_channel_id || posting === 'loa'}
                      onClick={() => postPanel('loa')}
                      className="gap-2 border-primary/30 text-primary hover:bg-primary/5"
                    >
                      {posting === 'loa' ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                      Post LOA Panel
                    </Button>
                  </div>
                  {(!config.applications_channel_id) && (
                    <p className="text-xs text-amber-600 flex items-center gap-1">
                      <AlertCircle size={12} /> Set and save the Applications Channel above to enable panel posting.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── ROLES ── */}
          <TabsContent value="roles">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Shield size={17} style={{ color: '#d4af37' }} /> Role Configuration
                </CardTitle>
                <CardDescription>Map Discord roles to Zenith's permission system.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {[
                    { key: 'staff_role_id',      label: 'Staff Role',      desc: 'The main staff role in your server.' },
                    { key: 'admin_role_id',       label: 'Admin Role',      desc: 'Full dashboard access.' },
                    { key: 'management_role_id',  label: 'Management Role', desc: 'Can approve LOAs and applications.' },
                    { key: 'on_loa_role_id',      label: 'On LOA Role',     desc: 'Assigned when a staff member goes on leave.' },
                  ].map(({ key, label, desc }) => (
                    <FieldGroup key={key} label={label} description={desc}>
                      <div className="flex items-center gap-2">
                        <RoleSelect value={roleVal(key)} onChange={v => updateConfig(key, v)} roles={roles} />
                        <StatusBadge configured={!!config[key]} />
                      </div>
                    </FieldGroup>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── STRIKES ── */}
          <TabsContent value="strikes">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <AlertCircle size={17} style={{ color: '#d4af37' }} /> Strike Settings
                </CardTitle>
                <CardDescription>Configure automatic strike handling and thresholds.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <FieldGroup label="Strike Threshold" description="Number of active strikes before automatic action.">
                    <Input type="number" min={1} max={10}
                      value={config.strike_threshold ?? 3}
                      onChange={e => updateConfig('strike_threshold', parseInt(e.target.value))}
                      className="bg-white"
                    />
                  </FieldGroup>
                  <FieldGroup label="Automatic Action" description="Action triggered when threshold is reached.">
                    <Select value={config.strike_action || 'demotion'} onValueChange={v => updateConfig('strike_action', v)}>
                      <SelectTrigger className="bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white">
                        <SelectItem value="demotion">Demotion</SelectItem>
                        <SelectItem value="suspension">Suspension</SelectItem>
                        <SelectItem value="termination">Termination</SelectItem>
                        <SelectItem value="warn">Warn only</SelectItem>
                      </SelectContent>
                    </Select>
                  </FieldGroup>
                </div>
                <div className="flex items-center justify-between p-4 bg-muted/40 rounded-xl border border-border">
                  <div>
                    <div className="text-sm font-semibold">Automatic Strike Processing</div>
                    <div className="text-xs text-muted-foreground mt-0.5">Automatically take action when the threshold is reached.</div>
                  </div>
                  <Switch checked={!!config.strike_automation} onCheckedChange={v => updateConfig('strike_automation', v)} />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── LOA ── */}
          <TabsContent value="loa">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Bell size={17} style={{ color: '#d4af37' }} /> LOA Settings
                </CardTitle>
                <CardDescription>Configure leave of absence rules and approval workflows.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <FieldGroup label="Maximum LOA Duration (days)" description="Longest a staff member can request.">
                    <Input type="number" min={1} max={90}
                      value={config.loa_max_days ?? 14}
                      onChange={e => updateConfig('loa_max_days', parseInt(e.target.value))}
                      className="bg-white"
                    />
                  </FieldGroup>
                </div>
                <div className="flex items-center justify-between p-4 bg-muted/40 rounded-xl border border-border">
                  <div>
                    <div className="text-sm font-semibold">Require Management Approval</div>
                    <div className="text-xs text-muted-foreground mt-0.5">LOA requests must be approved by management before taking effect.</div>
                  </div>
                  <Switch checked={config.loa_require_approval !== false} onCheckedChange={v => updateConfig('loa_require_approval', v)} />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── APPLICATIONS ── */}
          <TabsContent value="applications">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileText size={17} style={{ color: '#d4af37' }} /> Application Settings
                </CardTitle>
                <CardDescription>Configure the staff application system.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="flex items-center justify-between p-4 bg-muted/40 rounded-xl border border-border">
                  <div>
                    <div className="text-sm font-semibold">Applications Enabled</div>
                    <div className="text-xs text-muted-foreground mt-0.5">Allow users to apply for staff positions.</div>
                  </div>
                  <Switch checked={!!config.applications_enabled} onCheckedChange={v => updateConfig('applications_enabled', v)} />
                </div>
                <FieldGroup label="Application Title" description="The title shown on the application panel.">
                  <Input
                    value={config.applications_title || ''}
                    onChange={e => updateConfig('applications_title', e.target.value)}
                    placeholder="Staff Application — Zenith"
                    className="bg-white"
                  />
                </FieldGroup>
                <div className="flex items-center justify-between p-4 bg-muted/40 rounded-xl border border-border">
                  <div>
                    <div className="text-sm font-semibold">Require Recommendations</div>
                    <div className="text-xs text-muted-foreground mt-0.5">Applicants must have a staff recommendation.</div>
                  </div>
                  <Switch checked={!!config.require_recommendations} onCheckedChange={v => updateConfig('require_recommendations', v)} />
                </div>
                <PremiumLock isPremium={isPremium}>
                  <div className="space-y-3">
                    <FieldGroup label="Custom Questions" description="Add custom questions to the application form. (Premium)">
                      <Textarea
                        value={Array.isArray(config.applications_questions) ? config.applications_questions.join('\n') : ''}
                        onChange={e => updateConfig('applications_questions', e.target.value.split('\n').filter(Boolean))}
                        placeholder="One question per line..."
                        rows={4}
                        className="bg-white"
                        disabled={!isPremium}
                      />
                    </FieldGroup>
                    <div className="flex items-center justify-between p-4 bg-muted/40 rounded-xl border border-border">
                      <div>
                        <div className="text-sm font-semibold flex items-center gap-1.5">
                          Auto-Reject Failed Applications
                          <Badge className="text-[10px]" style={{ background: 'rgba(212,175,55,.15)', color: '#b8941f', border: '1px solid rgba(212,175,55,.3)' }}>
                            <Star size={9} className="mr-0.5 fill-current" /> Premium
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">Automatically reject applications that fail requirements.</div>
                      </div>
                      <Switch checked={!!config.auto_reject} onCheckedChange={v => updateConfig('auto_reject', v)} disabled={!isPremium} />
                    </div>
                  </div>
                </PremiumLock>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── GENERAL ── */}
          <TabsContent value="general">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Settings size={17} style={{ color: '#d4af37' }} /> General Settings
                </CardTitle>
                <CardDescription>Bot behaviour and tracking preferences.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <FieldGroup label="Bot Prefix" description="Command prefix for non-slash commands.">
                    <Input
                      value={config.prefix || '!'}
                      onChange={e => updateConfig('prefix', e.target.value)}
                      placeholder="!"
                      maxLength={5}
                      className="bg-white w-24"
                    />
                  </FieldGroup>
                  <FieldGroup label="Timezone" description="Used for scheduling and activity windows.">
                    <Select value={config.timezone || 'UTC'} onValueChange={v => updateConfig('timezone', v)}>
                      <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-white">
                        {['UTC','America/New_York','America/Chicago','America/Denver','America/Los_Angeles','Europe/London','Europe/Paris','Asia/Tokyo','Australia/Sydney'].map(tz => (
                          <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FieldGroup>
                </div>
                <div className="flex items-center justify-between p-4 bg-muted/40 rounded-xl border border-border">
                  <div>
                    <div className="text-sm font-semibold">Activity Tracking</div>
                    <div className="text-xs text-muted-foreground mt-0.5">Track message and voice activity for staff leaderboards.</div>
                  </div>
                  <Switch checked={config.activity_tracking !== false} onCheckedChange={v => updateConfig('activity_tracking', v)} />
                </div>
                <PremiumLock isPremium={isPremium}>
                  <FieldGroup label="Custom Embed Footer" description="Shown on all bot embed messages. (Premium)">
                    <Input
                      value={config.embed_footer || ''}
                      onChange={e => updateConfig('embed_footer', e.target.value)}
                      placeholder="Zenith Staff Management"
                      className="bg-white"
                      disabled={!isPremium}
                    />
                  </FieldGroup>
                </PremiumLock>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    );
  }
  