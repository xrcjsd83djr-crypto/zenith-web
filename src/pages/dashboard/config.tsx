import { useState, useEffect, useCallback } from "react";
  import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
  import { Button } from "@/components/ui/button";
  import { Label } from "@/components/ui/label";
  import { Input } from "@/components/ui/input";
  import { Switch } from "@/components/ui/switch";
  import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
  import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
  import { Badge } from "@/components/ui/badge";
  import { Loader2, RefreshCw, CheckCircle, AlertCircle, Settings, Hash, Shield, Bell, AlertTriangle, Plus, X, Lock, Zap } from "lucide-react";

  interface Channel { id: string; name: string; }
  interface Role { id: string; name: string; color?: number; }

  function RoleSelector({ values, onChange, roles, placeholder, max = 10 }: { values: string[]; onChange: (v: string[]) => void; roles: Role[]; placeholder: string; max?: number; }) {
    const [open, setOpen] = useState(false);
    const [q, setQ] = useState("");
    const safe = Array.isArray(values) ? values : [];
    const selected = roles.filter(r => safe.includes(r.id));
    const available = roles.filter(r => !safe.includes(r.id) && (!q || r.name.toLowerCase().includes(q.toLowerCase())));
    const color = (c?: number) => c ? "#" + c.toString(16).padStart(6, "0") : "#94a3b8";
    return (
      <div className="space-y-2">
        {selected.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {selected.map(r => (
              <div key={r.id} className="flex items-center gap-1 px-2 py-1 rounded-full border bg-muted/30 text-xs font-medium">
                <span className="w-2 h-2 rounded-full" style={{ background: color(r.color) }} />
                {r.name}
                <button onClick={() => onChange(safe.filter(v => v !== r.id))} className="ml-0.5 text-muted-foreground hover:text-red-500 transition-colors"><X size={10} /></button>
              </div>
            ))}
          </div>
        )}
        {safe.length < max && (
          <div className="relative">
            <Button type="button" variant="outline" size="sm" onClick={() => setOpen(o => !o)} className="w-full justify-start gap-2 text-muted-foreground text-xs h-8">
              <Plus size={12} /> {selected.length > 0 ? "Add role" : placeholder}
            </Button>
            {open && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => { setOpen(false); setQ(""); }} />
                <div className="absolute z-20 top-full mt-1 w-full bg-popover border rounded-lg shadow-lg overflow-hidden">
                  <div className="p-2 border-b"><Input placeholder="Search roles..." value={q} onChange={e => setQ(e.target.value)} className="h-7 text-xs" autoFocus /></div>
                  <div className="max-h-48 overflow-y-auto">
                    {available.slice(0, 30).map(r => (
                      <button key={r.id} onClick={() => { onChange([...safe, r.id]); setQ(""); setOpen(false); }}
                        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted text-xs text-left transition-colors">
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: color(r.color) }} />
                        {r.name}
                      </button>
                    ))}
                    {available.length === 0 && <p className="px-3 py-2 text-xs text-muted-foreground">No roles found</p>}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    );
  }

  function ChannelSelect({ value, onChange, channels, placeholder }: { value: string; onChange: (v: string) => void; channels: Channel[]; placeholder: string; }) {
    const [q, setQ] = useState("");
    const [open, setOpen] = useState(false);
    const selected = channels.find(c => c.id === value);
    const filtered = channels.filter(c => !q || c.name.toLowerCase().includes(q.toLowerCase()));
    return (
      <div className="relative">
        <Button type="button" variant="outline" size="sm" onClick={() => setOpen(o => !o)}
          className="w-full justify-start gap-2 text-xs h-8 font-normal">
          <Hash size={12} className="text-muted-foreground" />
          {selected ? "#" + selected.name : <span className="text-muted-foreground">{placeholder}</span>}
          {value && <button onClick={e => { e.stopPropagation(); onChange(""); }} className="ml-auto text-muted-foreground hover:text-red-500"><X size={10} /></button>}
        </Button>
        {open && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => { setOpen(false); setQ(""); }} />
            <div className="absolute z-20 top-full mt-1 w-full bg-popover border rounded-lg shadow-lg overflow-hidden">
              <div className="p-2 border-b"><Input placeholder="Search channels..." value={q} onChange={e => setQ(e.target.value)} className="h-7 text-xs" autoFocus /></div>
              <div className="max-h-48 overflow-y-auto">
                {filtered.slice(0, 30).map(c => (
                  <button key={c.id} onClick={() => { onChange(c.id); setOpen(false); setQ(""); }}
                    className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted text-xs text-left transition-colors">
                    <Hash size={11} className="text-muted-foreground" /> {c.name}
                  </button>
                ))}
                {filtered.length === 0 && <p className="px-3 py-2 text-xs text-muted-foreground">No channels found</p>}
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  type SaveState = "idle" | "saving" | "saved" | "error";

  export default function ConfigPage({ guildId }: { guildId: string }) {
    const [cfg, setCfg] = useState<Record<string, any>>({});
    const [channels, setChannels] = useState<Channel[]>([]);
    const [roles, setRoles] = useState<Role[]>([]);
    const [loading, setLoading] = useState(true);
    const [save, setSave] = useState<SaveState>("idle");
    const [isPremium, setIsPremium] = useState(false);

    const fetchAll = useCallback(async () => {
      setLoading(true);
      try {
        const [cfgRes, chRes, rolesRes, gRes] = await Promise.all([
          fetch(`/api/guilds/${guildId}/config`, { credentials: "include" }),
          fetch(`/api/guilds/${guildId}/channels`, { credentials: "include" }),
          fetch(`/api/guilds/${guildId}/roles`, { credentials: "include" }),
          fetch(`/api/guilds/${guildId}`, { credentials: "include" }),
        ]);
        if (cfgRes.ok) setCfg(await cfgRes.json());
        if (chRes.ok) setChannels(await chRes.json());
        if (rolesRes.ok) setRoles(await rolesRes.json());
        if (gRes.ok) { const g = await gRes.json(); setIsPremium(g.isPremium ?? false); }
      } catch {}
      setLoading(false);
    }, [guildId]);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    const set = (key: string, val: any) => setCfg(c => ({ ...c, [key]: val }));

    const handleSave = async () => {
      setSave("saving");
      try {
        const res = await fetch(`/api/guilds/${guildId}/config`, {
          method: "PUT", credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(cfg),
        });
        setSave(res.ok ? "saved" : "error");
      } catch { setSave("error"); }
      setTimeout(() => setSave("idle"), 3000);
    };

    const gold = { background: "#d4af37", color: "#000" };

    if (loading) return (
      <div className="flex justify-center py-24">
        <div className="w-7 h-7 rounded-full border-2 animate-spin" style={{ borderColor: "#d4af37", borderTopColor: "transparent" }} />
      </div>
    );

    return (
      <div className="space-y-5 max-w-3xl">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight flex items-center gap-2"><Settings className="w-6 h-6" style={{ color: "#d4af37" }} />Configuration</h2>
            <p className="text-muted-foreground mt-0.5 text-sm">All server settings in one place — no duplicate pages.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchAll} className="gap-1.5"><RefreshCw size={13} />Refresh</Button>
            <Button size="sm" onClick={handleSave} disabled={save === "saving"} style={gold} className="gap-1.5 min-w-24">
              {save === "saving" ? <><Loader2 size={13} className="animate-spin" />Saving…</>
                : save === "saved" ? <><CheckCircle size={13} />Saved!</>
                : save === "error" ? <><AlertCircle size={13} />Error</>
                : "Save All Changes"}
            </Button>
          </div>
        </div>

        <Tabs defaultValue="general">
          <TabsList className="flex-wrap h-auto gap-1">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="channels">Channels</TabsTrigger>
            <TabsTrigger value="roles">Roles</TabsTrigger>
            <TabsTrigger value="strikes">Strikes</TabsTrigger>
            <TabsTrigger value="loa">LOA</TabsTrigger>
            <TabsTrigger value="logging">Logging</TabsTrigger>
          </TabsList>

          {/* GENERAL */}
          <TabsContent value="general" className="mt-4 space-y-4">
            <Card><CardContent className="p-5 space-y-4">
              <CardHeader className="p-0 pb-2"><CardTitle className="text-base">General Settings</CardTitle><CardDescription className="text-xs">Basic server configuration</CardDescription></CardHeader>
              <div className="grid grid-cols-2 gap-4">
                <div><Label className="text-xs font-medium">Timezone</Label>
                  <Select value={cfg.timezone || "UTC"} onValueChange={v => set("timezone", v)}>
                    <SelectTrigger className="h-9 text-sm mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["UTC","America/New_York","America/Chicago","America/Denver","America/Los_Angeles","Europe/London","Europe/Paris","Asia/Tokyo","Asia/Singapore","Australia/Sydney"].map(tz => (
                        <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div><Label className="text-xs font-medium">Bot Prefix (legacy)</Label>
                  <Input value={cfg.prefix || "!"} onChange={e => set("prefix", e.target.value)} className="h-9 text-sm mt-1" maxLength={5} />
                </div>
              </div>
              <div className="flex items-center justify-between py-1">
                <div><p className="text-sm font-medium">Activity Tracking</p><p className="text-xs text-muted-foreground">Track all staff activity automatically</p></div>
                <Switch checked={!!cfg.activity_tracking} onCheckedChange={v => set("activity_tracking", v)} />
              </div>
              <div className="flex items-center justify-between py-1">
                <div><p className="text-sm font-medium">Shift Tracking</p><p className="text-xs text-muted-foreground">Allow staff to track shift time via /shift</p></div>
                <Switch checked={!!cfg.shift_tracking_enabled} onCheckedChange={v => set("shift_tracking_enabled", v)} />
              </div>
            </CardContent></Card>
          </TabsContent>

          {/* CHANNELS */}
          <TabsContent value="channels" className="mt-4 space-y-4">
            <Card><CardContent className="p-5 space-y-4">
              <CardHeader className="p-0 pb-2"><CardTitle className="text-base flex items-center gap-2"><Hash size={16} />Channel Configuration</CardTitle><CardDescription className="text-xs">Where bot messages and logs are sent</CardDescription></CardHeader>
              {[
                { label: "Logs Channel", key: "logs_channel_id", desc: "General activity & audit logs" },
                { label: "Strike Log Channel", key: "strike_log_channel_id", desc: "Strike issuance notifications" },
                { label: "Promotion Log Channel", key: "promotion_log_channel_id", desc: "Promotion/demotion announcements" },
                { label: "LOA Channel", key: "loa_channel_id", desc: "Leave of absence requests" },
                { label: "Applications Channel", key: "applications_channel_id", desc: "Where applications are posted" },
                { label: "Applications Review Channel", key: "applications_review_channel_id", desc: "Where staff review applications" },
                { label: "Commendation Channel", key: "commendation_channel_id", desc: "Where commendations are posted" },
                { label: "Shift Cards Channel", key: "shift_cards_channel_id", desc: "Where auto shift cards are sent" },
                { label: "Welcome Channel", key: "welcome_channel_id", desc: "New staff welcome messages" },
              ].map(({ label, key, desc }) => (
                <div key={key}>
                  <Label className="text-xs font-medium">{label}</Label>
                  <p className="text-xs text-muted-foreground mb-1">{desc}</p>
                  <ChannelSelect value={cfg[key] || ""} onChange={v => set(key, v)} channels={channels} placeholder={"Select " + label} />
                </div>
              ))}
            </CardContent></Card>
          </TabsContent>

          {/* ROLES */}
          <TabsContent value="roles" className="mt-4 space-y-4">
            <Card><CardContent className="p-5 space-y-4">
              <CardHeader className="p-0 pb-2"><CardTitle className="text-base flex items-center gap-2"><Shield size={16} />Role Configuration</CardTitle><CardDescription className="text-xs">Which Discord roles map to which permission level</CardDescription></CardHeader>
              {[
                { label: "Staff Roles", key: "staff_role_ids", desc: "Roles counted as staff members", multi: true },
                { label: "Admin Roles", key: "admin_role_ids", desc: "Full dashboard access", multi: true },
                { label: "Management Roles", key: "management_role_ids", desc: "Can manage staff below them", multi: true },
                { label: "On LOA Role", key: "on_loa_role_id", desc: "Role applied when staff is on LOA", multi: false },
                { label: "Rank Request Reviewer Role", key: "rank_request_reviewer_role_id", desc: "Who can approve rank requests", multi: false },
              ].map(({ label, key, desc, multi }) => (
                <div key={key}>
                  <Label className="text-xs font-medium">{label}</Label>
                  <p className="text-xs text-muted-foreground mb-1">{desc}</p>
                  {multi ? (
                    <RoleSelector values={cfg[key] || []} onChange={v => set(key, v)} roles={roles} placeholder={"Select " + label} />
                  ) : (
                    <RoleSelector values={cfg[key] ? [cfg[key]] : []} onChange={v => set(key, v[v.length - 1] || "")} roles={roles} placeholder={"Select " + label} max={1} />
                  )}
                </div>
              ))}
            </CardContent></Card>
          </TabsContent>

          {/* STRIKES */}
          <TabsContent value="strikes" className="mt-4 space-y-4">
            <Card><CardContent className="p-5 space-y-4">
              <CardHeader className="p-0 pb-2"><CardTitle className="text-base flex items-center gap-2"><AlertTriangle size={16} />Strike Settings & Automation</CardTitle><CardDescription className="text-xs">Strike thresholds and automated actions — all in one place</CardDescription></CardHeader>
              <div className="grid grid-cols-2 gap-4">
                <div><Label className="text-xs font-medium">Strike Threshold</Label>
                  <p className="text-xs text-muted-foreground mb-1">Number of active strikes before action triggers</p>
                  <Input type="number" min={1} max={20} value={cfg.strike_threshold || 3} onChange={e => set("strike_threshold", parseInt(e.target.value))} className="h-9 text-sm" />
                </div>
                <div><Label className="text-xs font-medium">Threshold Action</Label>
                  <p className="text-xs text-muted-foreground mb-1">What happens when threshold is reached</p>
                  <Select value={cfg.strike_action || "demotion"} onValueChange={v => set("strike_action", v)}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Action (manual)</SelectItem>
                      <SelectItem value="warn">Send Warning</SelectItem>
                      <SelectItem value="demotion">Auto Demotion</SelectItem>
                      <SelectItem value="kick">Remove from Staff</SelectItem>
                      <SelectItem value="ban">Server Ban</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-3 pt-2 border-t">
                {[
                  { key: "strike_automation", label: "Strike Automation Enabled", desc: "Automatically execute action when threshold is hit" },
                  { key: "strike_dm_user", label: "DM Staff on Strike", desc: "Send a DM to staff member when they receive a strike" },
                  { key: "strike_log_enabled", label: "Log Strikes to Channel", desc: "Post strike details to the configured strike log channel" },
                ].map(({ key, label, desc }) => (
                  <div key={key} className="flex items-center justify-between">
                    <div><p className="text-sm font-medium">{label}</p><p className="text-xs text-muted-foreground">{desc}</p></div>
                    <Switch checked={!!cfg[key]} onCheckedChange={v => set(key, v)} />
                  </div>
                ))}
              </div>
            </CardContent></Card>
          </TabsContent>

          {/* LOA */}
          <TabsContent value="loa" className="mt-4 space-y-4">
            <Card><CardContent className="p-5 space-y-4">
              <CardHeader className="p-0 pb-2"><CardTitle className="text-base">LOA Settings</CardTitle><CardDescription className="text-xs">Leave of absence rules and approval flow</CardDescription></CardHeader>
              <div className="grid grid-cols-2 gap-4">
                <div><Label className="text-xs font-medium">Maximum LOA Duration (days)</Label>
                  <Input type="number" min={1} max={365} value={cfg.loa_max_days || 14} onChange={e => set("loa_max_days", parseInt(e.target.value))} className="h-9 text-sm mt-1" />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div><p className="text-sm font-medium">Require Approval</p><p className="text-xs text-muted-foreground">LOA requests need admin approval before being active</p></div>
                <Switch checked={!!cfg.loa_require_approval} onCheckedChange={v => set("loa_require_approval", v)} />
              </div>
            </CardContent></Card>
          </TabsContent>

          {/* LOGGING */}
          <TabsContent value="logging" className="mt-4 space-y-4">
            <Card><CardContent className="p-5 space-y-4">
              <CardHeader className="p-0 pb-2"><CardTitle className="text-base flex items-center gap-2"><Bell size={16} />Event Logging</CardTitle><CardDescription className="text-xs">Choose which events get logged to your logs channel</CardDescription></CardHeader>
              {[
                { key: "log_strikes", label: "Log Strikes", desc: "Strike additions and removals" },
                { key: "log_promotions", label: "Log Promotions", desc: "Rank changes and transfers" },
                { key: "log_loa", label: "Log LOA Requests", desc: "Leave requests and approvals" },
                { key: "log_commendations", label: "Log Commendations", desc: "When staff are commended" },
                { key: "log_applications", label: "Log Applications", desc: "New application submissions" },
                { key: "log_staff_changes", label: "Log Staff Changes", desc: "Staff added/removed from roster" },
                { key: "log_shifts", label: "Log Shift Events", desc: "Shift start and end events" },
              ].map(({ key, label, desc }) => (
                <div key={key} className="flex items-center justify-between py-1">
                  <div><p className="text-sm font-medium">{label}</p><p className="text-xs text-muted-foreground">{desc}</p></div>
                  <Switch checked={cfg[key] !== false} onCheckedChange={v => set(key, v)} />
                </div>
              ))}
            </CardContent></Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end pt-2">
          <Button onClick={handleSave} disabled={save === "saving"} style={gold} className="gap-1.5 min-w-32">
            {save === "saving" ? <><Loader2 size={13} className="animate-spin" />Saving…</>
              : save === "saved" ? <><CheckCircle size={13} />Saved!</>
              : save === "error" ? <><AlertCircle size={13} />Error — retry</>
              : "Save All Changes"}
          </Button>
        </div>
      </div>
    );
  }
  