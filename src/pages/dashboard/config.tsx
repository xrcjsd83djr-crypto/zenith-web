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
import { ScrollArea } from "@/components/ui/scroll-area";
import { CheckCircle, AlertCircle, Loader2, Hash, Shield, Settings, Bell, Users, FileText, Lock } from "lucide-react";

interface Channel { id: string; name: string; type: number; }
interface Role { id: string; name: string; color: string; }
interface Config { [key: string]: any; }

function ChannelSelect({ value, onChange, channels, placeholder = "Select a channel", loading }: {
  value: string; onChange: (v: string) => void;
  channels: Channel[]; placeholder?: string; loading?: boolean;
}) {
  return (
    <Select value={value || ""} onValueChange={onChange}>
      <SelectTrigger className="w-full bg-[#1e2028] border-[#3a3d4a] text-white">
        <SelectValue placeholder={loading ? "Loading channels..." : placeholder}>
          {value ? (
            <span className="flex items-center gap-2">
              <Hash size={14} className="text-gray-400" />
              {channels.find(c => c.id === value)?.name || value}
            </span>
          ) : (loading ? "Loading..." : placeholder)}
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="bg-[#1e2028] border-[#3a3d4a] text-white">
        <SelectItem value="none" className="text-gray-400 hover:bg-[#2a2d3a]">
          <span className="flex items-center gap-2">
            <AlertCircle size={14} />
            Not set
          </span>
        </SelectItem>
        {channels.map(c => (
          <SelectItem key={c.id} value={c.id} className="hover:bg-[#2a2d3a]">
            <span className="flex items-center gap-2">
              <Hash size={14} className="text-gray-400" />
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
      <SelectTrigger className="w-full bg-[#1e2028] border-[#3a3d4a] text-white">
        <SelectValue placeholder={loading ? "Loading roles..." : placeholder}>
          {value ? (
            <span className="flex items-center gap-2">
              <Shield size={14} className="text-gray-400" />
              {roles.find(r => r.id === value)?.name || value}
            </span>
          ) : (loading ? "Loading..." : placeholder)}
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="bg-[#1e2028] border-[#3a3d4a] text-white">
        <SelectItem value="none" className="text-gray-400 hover:bg-[#2a2d3a]">
          <span className="flex items-center gap-2">
            <AlertCircle size={14} />
            Not set
          </span>
        </SelectItem>
        {roles.map(r => (
          <SelectItem key={r.id} value={r.id} className="hover:bg-[#2a2d3a]">
            <span className="flex items-center gap-2">
              <span
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: r.color === '#000000' || r.color === '#99aab5' ? '#6b7280' : r.color }}
              />
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
    <div className="space-y-2">
      <Label className="text-sm font-medium text-gray-200">{label}</Label>
      {description && <p className="text-xs text-gray-500">{description}</p>}
      {children}
    </div>
  );
}

function StatusBadge({ configured }: { configured: boolean }) {
  return configured ? (
    <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">Configured</Badge>
  ) : (
    <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30 text-xs">Not set</Badge>
  );
}

export default function ConfigPage({ guildId }: { guildId: string }) {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [config, setConfig] = useState<Config>({});
  const [loadingData, setLoadingData] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const fetchAll = useCallback(async () => {
    setLoadingData(true);
    try {
      const [chanRes, rolesRes, cfgRes] = await Promise.all([
        fetch(`/api/guilds/${guildId}/channels`, { credentials: 'include' }),
        fetch(`/api/guilds/${guildId}/roles`, { credentials: 'include' }),
        fetch(`/api/guilds/${guildId}/config`, { credentials: 'include' }),
      ]);
      if (chanRes.ok) setChannels(await chanRes.json());
      if (rolesRes.ok) setRoles(await rolesRes.json());
      if (cfgRes.ok) setConfig(await cfgRes.json());
    } catch (err) {
      setError("Failed to load configuration data");
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
      // Convert "none" sentinel back to null
      const payload: Config = {};
      for (const [k, v] of Object.entries(config)) {
        payload[k] = v === "none" ? null : v;
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
      setConfig(data.config || config);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loadingData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-blue-400 mx-auto" />
          <p className="text-gray-400 text-sm">Loading configuration...</p>
        </div>
      </div>
    );
  }

  const chanVal = (key: string) => config[key] || "";
  const roleVal = (key: string) => config[key] || "";

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Server Configuration</h2>
          <p className="text-gray-400 mt-1 text-sm">Configure Zenith for your server. All settings are saved to the database.</p>
        </div>
        <div className="flex items-center gap-3">
          {saved && (
            <span className="flex items-center gap-1.5 text-green-400 text-sm font-medium">
              <CheckCircle size={16} /> Saved!
            </span>
          )}
          {error && (
            <span className="flex items-center gap-1.5 text-red-400 text-sm">
              <AlertCircle size={14} /> {error}
            </span>
          )}
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6"
          >
            {saving ? <><Loader2 size={14} className="animate-spin mr-2" />Saving...</> : "Save Changes"}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="channels" className="space-y-4">
        <TabsList className="bg-[#1e2028] border border-[#3a3d4a] p-1 flex flex-wrap gap-1 h-auto">
          <TabsTrigger value="channels" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-gray-400 flex items-center gap-1.5">
            <Hash size={14} /> Channels
          </TabsTrigger>
          <TabsTrigger value="roles" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-gray-400 flex items-center gap-1.5">
            <Shield size={14} /> Roles
          </TabsTrigger>
          <TabsTrigger value="strikes" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-gray-400 flex items-center gap-1.5">
            <AlertCircle size={14} /> Strikes
          </TabsTrigger>
          <TabsTrigger value="loa" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-gray-400 flex items-center gap-1.5">
            <Bell size={14} /> LOA
          </TabsTrigger>
          <TabsTrigger value="general" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-gray-400 flex items-center gap-1.5">
            <Settings size={14} /> General
          </TabsTrigger>
          <TabsTrigger value="embed" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-gray-400 flex items-center gap-1.5">
            <FileText size={14} /> Embed
          </TabsTrigger>
        </TabsList>

        {/* ── CHANNELS TAB ── */}
        <TabsContent value="channels">
          <Card className="bg-[#161820] border-[#3a3d4a]">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Hash className="text-blue-400" size={18} /> Channel Configuration
              </CardTitle>
              <CardDescription className="text-gray-400">
                Set up channels for different bot features. All dropdown lists are pulled directly from your server.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FieldGroup label="Logs Channel" description="All bot actions and mod logs will be sent here.">
                  <div className="flex items-center gap-2">
                    <ChannelSelect
                      value={chanVal('logs_channel_id')}
                      onChange={v => updateConfig('logs_channel_id', v)}
                      channels={channels}
                      placeholder="Select logs channel"
                    />
                    <StatusBadge configured={!!config.logs_channel_id} />
                  </div>
                </FieldGroup>

                <FieldGroup label="LOA Channel" description="Leave of absence requests will be posted here.">
                  <div className="flex items-center gap-2">
                    <ChannelSelect
                      value={chanVal('loa_channel_id')}
                      onChange={v => updateConfig('loa_channel_id', v)}
                      channels={channels}
                      placeholder="Select LOA channel"
                    />
                    <StatusBadge configured={!!config.loa_channel_id} />
                  </div>
                </FieldGroup>

                <FieldGroup label="Applications Channel" description="Staff applications will be posted here for review.">
                  <div className="flex items-center gap-2">
                    <ChannelSelect
                      value={chanVal('applications_channel_id')}
                      onChange={v => updateConfig('applications_channel_id', v)}
                      channels={channels}
                      placeholder="Select applications channel"
                    />
                    <StatusBadge configured={!!config.applications_channel_id} />
                  </div>
                </FieldGroup>

                <FieldGroup label="Applications Review Channel" description="Management review thread for applications.">
                  <div className="flex items-center gap-2">
                    <ChannelSelect
                      value={chanVal('applications_review_channel_id')}
                      onChange={v => updateConfig('applications_review_channel_id', v)}
                      channels={channels}
                      placeholder="Select review channel"
                    />
                    <StatusBadge configured={!!config.applications_review_channel_id} />
                  </div>
                </FieldGroup>

                <FieldGroup label="Welcome Channel" description="New staff welcome messages will be sent here.">
                  <div className="flex items-center gap-2">
                    <ChannelSelect
                      value={chanVal('welcome_channel_id')}
                      onChange={v => updateConfig('welcome_channel_id', v)}
                      channels={channels}
                      placeholder="Select welcome channel"
                    />
                    <StatusBadge configured={!!config.welcome_channel_id} />
                  </div>
                </FieldGroup>

                <FieldGroup label="Strike Log Channel" description="Strike records will be logged here.">
                  <div className="flex items-center gap-2">
                    <ChannelSelect
                      value={chanVal('strike_log_channel_id')}
                      onChange={v => updateConfig('strike_log_channel_id', v)}
                      channels={channels}
                      placeholder="Select strike log channel"
                    />
                    <StatusBadge configured={!!config.strike_log_channel_id} />
                  </div>
                </FieldGroup>
              </div>

              <Separator className="bg-[#3a3d4a]" />
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Hash size={12} />
                <span>Showing {channels.length} text channels from your server. If channels are missing, make sure the bot has the correct permissions.</span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── ROLES TAB ── */}
        <TabsContent value="roles">
          <Card className="bg-[#161820] border-[#3a3d4a]">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Shield className="text-blue-400" size={18} /> Role Configuration
              </CardTitle>
              <CardDescription className="text-gray-400">
                Configure which roles have what access. Roles are pulled directly from your Discord server.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FieldGroup label="Staff Role" description="Members with this role are considered staff.">
                  <div className="flex items-center gap-2">
                    <RoleSelect
                      value={roleVal('staff_role_id')}
                      onChange={v => updateConfig('staff_role_id', v)}
                      roles={roles}
                      placeholder="Select staff role"
                    />
                    <StatusBadge configured={!!config.staff_role_id} />
                  </div>
                </FieldGroup>

                <FieldGroup label="Admin Role" description="Members with this role can use admin bot commands.">
                  <div className="flex items-center gap-2">
                    <RoleSelect
                      value={roleVal('admin_role_id')}
                      onChange={v => updateConfig('admin_role_id', v)}
                      roles={roles}
                      placeholder="Select admin role"
                    />
                    <StatusBadge configured={!!config.admin_role_id} />
                  </div>
                </FieldGroup>

                <FieldGroup label="Management Role" description="Senior staff who can approve LOAs and strikes.">
                  <div className="flex items-center gap-2">
                    <RoleSelect
                      value={roleVal('management_role_id')}
                      onChange={v => updateConfig('management_role_id', v)}
                      roles={roles}
                      placeholder="Select management role"
                    />
                    <StatusBadge configured={!!config.management_role_id} />
                  </div>
                </FieldGroup>

                <FieldGroup label="On LOA Role" description="Automatically assigned when a LOA is approved.">
                  <div className="flex items-center gap-2">
                    <RoleSelect
                      value={roleVal('on_loa_role_id')}
                      onChange={v => updateConfig('on_loa_role_id', v)}
                      roles={roles}
                      placeholder="Select on-LOA role"
                    />
                    <StatusBadge configured={!!config.on_loa_role_id} />
                  </div>
                </FieldGroup>
              </div>

              <Separator className="bg-[#3a3d4a]" />
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Shield size={12} />
                <span>Showing {roles.length} roles. Sorted by position (highest first).</span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── STRIKES TAB ── */}
        <TabsContent value="strikes">
          <Card className="bg-[#161820] border-[#3a3d4a]">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <AlertCircle className="text-red-400" size={18} /> Strike Settings
              </CardTitle>
              <CardDescription className="text-gray-400">
                Configure how the strike system works, including automation triggers and thresholds.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FieldGroup label="Strike Threshold" description="Number of active strikes before automatic action is taken.">
                  <Input
                    type="number"
                    min={1} max={20}
                    value={config.strike_threshold ?? 3}
                    onChange={e => updateConfig('strike_threshold', parseInt(e.target.value) || 3)}
                    className="bg-[#1e2028] border-[#3a3d4a] text-white"
                  />
                </FieldGroup>

                <FieldGroup label="Strike Action" description="What happens when the threshold is reached.">
                  <Select
                    value={config.strike_action || 'demotion'}
                    onValueChange={v => updateConfig('strike_action', v)}
                  >
                    <SelectTrigger className="bg-[#1e2028] border-[#3a3d4a] text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1e2028] border-[#3a3d4a] text-white">
                      <SelectItem value="demotion" className="hover:bg-[#2a2d3a]">Demotion</SelectItem>
                      <SelectItem value="kick" className="hover:bg-[#2a2d3a]">Kick from server</SelectItem>
                      <SelectItem value="ban" className="hover:bg-[#2a2d3a]">Ban from server</SelectItem>
                      <SelectItem value="fire" className="hover:bg-[#2a2d3a]">Remove from staff</SelectItem>
                      <SelectItem value="notify" className="hover:bg-[#2a2d3a]">Notify management only</SelectItem>
                    </SelectContent>
                  </Select>
                </FieldGroup>
              </div>

              <Separator className="bg-[#3a3d4a]" />

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-[#1e2028] rounded-lg border border-[#3a3d4a]">
                  <div className="space-y-1">
                    <p className="text-white font-medium text-sm">Strike Automation</p>
                    <p className="text-gray-400 text-xs">Automatically apply the strike action when threshold is reached.</p>
                  </div>
                  <Switch
                    checked={!!config.strike_automation}
                    onCheckedChange={v => updateConfig('strike_automation', v)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── LOA TAB ── */}
        <TabsContent value="loa">
          <Card className="bg-[#161820] border-[#3a3d4a]">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Bell className="text-yellow-400" size={18} /> Leave of Absence Settings
              </CardTitle>
              <CardDescription className="text-gray-400">
                Configure LOA request handling and limits.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FieldGroup label="Maximum LOA Duration (days)" description="Maximum number of days for a single LOA request.">
                  <Input
                    type="number"
                    min={1} max={365}
                    value={config.loa_max_days ?? 14}
                    onChange={e => updateConfig('loa_max_days', parseInt(e.target.value) || 14)}
                    className="bg-[#1e2028] border-[#3a3d4a] text-white"
                  />
                </FieldGroup>
              </div>

              <Separator className="bg-[#3a3d4a]" />

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-[#1e2028] rounded-lg border border-[#3a3d4a]">
                  <div className="space-y-1">
                    <p className="text-white font-medium text-sm">Require Approval</p>
                    <p className="text-gray-400 text-xs">LOA requests must be approved by management before taking effect.</p>
                  </div>
                  <Switch
                    checked={config.loa_require_approval !== false}
                    onCheckedChange={v => updateConfig('loa_require_approval', v)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── GENERAL TAB ── */}
        <TabsContent value="general">
          <Card className="bg-[#161820] border-[#3a3d4a]">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Settings className="text-gray-400" size={18} /> General Settings
              </CardTitle>
              <CardDescription className="text-gray-400">
                Basic bot configuration for your server.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FieldGroup label="Command Prefix" description="Prefix for text commands (e.g. ! or ?)">
                  <Input
                    value={config.prefix || '!'}
                    onChange={e => updateConfig('prefix', e.target.value)}
                    maxLength={5}
                    className="bg-[#1e2028] border-[#3a3d4a] text-white w-24"
                  />
                </FieldGroup>

                <FieldGroup label="Timezone" description="Server timezone for scheduling and time displays.">
                  <Select
                    value={config.timezone || 'UTC'}
                    onValueChange={v => updateConfig('timezone', v)}
                  >
                    <SelectTrigger className="bg-[#1e2028] border-[#3a3d4a] text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1e2028] border-[#3a3d4a] text-white">
                      {['UTC', 'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
                        'America/Toronto', 'Europe/London', 'Europe/Paris', 'Europe/Berlin',
                        'Asia/Tokyo', 'Asia/Singapore', 'Australia/Sydney'].map(tz => (
                        <SelectItem key={tz} value={tz} className="hover:bg-[#2a2d3a]">{tz}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FieldGroup>
              </div>

              <Separator className="bg-[#3a3d4a]" />

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-[#1e2028] rounded-lg border border-[#3a3d4a]">
                  <div className="space-y-1">
                    <p className="text-white font-medium text-sm">Activity Tracking</p>
                    <p className="text-gray-400 text-xs">Track and log staff activity in the server.</p>
                  </div>
                  <Switch
                    checked={config.activity_tracking !== false}
                    onCheckedChange={v => updateConfig('activity_tracking', v)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── EMBED TAB ── */}
        <TabsContent value="embed">
          <Card className="bg-[#161820] border-[#3a3d4a]">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <FileText className="text-purple-400" size={18} /> Embed Settings
              </CardTitle>
              <CardDescription className="text-gray-400">
                Customize how bot messages look in your server.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FieldGroup label="Embed Color" description="The accent color used on all bot embeds.">
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={config.embed_color || '#5BA4CF'}
                      onChange={e => updateConfig('embed_color', e.target.value)}
                      className="w-10 h-10 rounded cursor-pointer border-0 bg-transparent"
                    />
                    <Input
                      value={config.embed_color || '#5BA4CF'}
                      onChange={e => updateConfig('embed_color', e.target.value)}
                      className="bg-[#1e2028] border-[#3a3d4a] text-white font-mono"
                      placeholder="#5BA4CF"
                    />
                  </div>
                </FieldGroup>

                <FieldGroup label="Embed Footer" description="The footer text shown on all bot embeds.">
                  <Input
                    value={config.embed_footer || ''}
                    onChange={e => updateConfig('embed_footer', e.target.value)}
                    placeholder="Zenith Staff Management"
                    className="bg-[#1e2028] border-[#3a3d4a] text-white"
                    maxLength={100}
                  />
                </FieldGroup>
              </div>

              {/* Preview */}
              <Separator className="bg-[#3a3d4a]" />
              <div>
                <p className="text-xs text-gray-500 mb-3">Preview</p>
                <div
                  className="bg-[#2f3136] rounded-lg p-4 border-l-4 max-w-sm"
                  style={{ borderLeftColor: config.embed_color || '#5BA4CF' }}
                >
                  <p className="text-white font-semibold text-sm">Example Embed</p>
                  <p className="text-gray-300 text-xs mt-1">This is what bot messages will look like.</p>
                  <p className="text-gray-500 text-xs mt-3">{config.embed_footer || 'Zenith Staff Management'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Quick Status Overview */}
      <Card className="bg-[#161820] border-[#3a3d4a]">
        <CardHeader>
          <CardTitle className="text-white text-sm">Configuration Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Logs Channel', key: 'logs_channel_id' },
              { label: 'LOA Channel', key: 'loa_channel_id' },
              { label: 'Staff Role', key: 'staff_role_id' },
              { label: 'Admin Role', key: 'admin_role_id' },
              { label: 'Management Role', key: 'management_role_id' },
              { label: 'Applications Channel', key: 'applications_channel_id' },
              { label: 'Strike Log Channel', key: 'strike_log_channel_id' },
              { label: 'On LOA Role', key: 'on_loa_role_id' },
            ].map(item => (
              <div key={item.key} className="flex items-center gap-2 p-2 rounded bg-[#1e2028]">
                {config[item.key] ? (
                  <CheckCircle size={14} className="text-green-400 flex-shrink-0" />
                ) : (
                  <AlertCircle size={14} className="text-gray-500 flex-shrink-0" />
                )}
                <span className="text-xs text-gray-300 truncate">{item.label}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
