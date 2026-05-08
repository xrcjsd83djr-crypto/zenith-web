import { useState, useEffect } from "react";
import { useGetConfig, useUpdateConfig, useGetGuildChannels, useGetGuildRoles, useGetApplicationQuestions, useUpdateApplicationQuestions } from "@workspace/api-client-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  ChevronRight, ChevronDown, Hash, Volume2, Megaphone,
  Settings, Bell, Shield, Users, FileText, Activity,
  Zap, Save, Loader2, Search, Plus, Trash2, GripVertical,
  CheckCircle2
} from "lucide-react";

interface ConfigPageProps { guildId: string; }

type Channel = { id: string; name: string; type: number; parentId: string | null; parentName: string | null };
type Role = { id: string; name: string; color: number; position: number };

function colorToHex(color: number) {
  if (!color) return "#99aab5";
  return `#${color.toString(16).padStart(6, "0")}`;
}

function ChannelPicker({ value, onChange, channels, placeholder = "Select channel...", filter }: {
  value: string; onChange: (v: string) => void;
  channels: Channel[]; placeholder?: string; filter?: (c: Channel) => boolean;
}) {
  const [search, setSearch] = useState("");
  const filtered = (filter ? channels.filter(filter) : channels).filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.parentName || "").toLowerCase().includes(search.toLowerCase())
  );
  const selected = channels.find(c => c.id === value);

  return (
    <Select value={value || "__none__"} onValueChange={v => onChange(v === "__none__" ? "" : v)}>
      <SelectTrigger className="w-full">
        <div className="flex items-center gap-2 truncate">
          {selected ? (
            <>
              {selected.type === 2 ? <Volume2 className="w-3.5 h-3.5 text-gray-400" /> : <Hash className="w-3.5 h-3.5 text-gray-400" />}
              <span className="truncate">{selected.parentName ? `${selected.parentName} / ${selected.name}` : selected.name}</span>
            </>
          ) : (
            <span className="text-gray-400">{placeholder}</span>
          )}
        </div>
      </SelectTrigger>
      <SelectContent className="max-h-64">
        <div className="px-2 pb-2 pt-1 sticky top-0 bg-white z-10">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input className="h-7 pl-7 text-xs" placeholder="Search channels..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
        <SelectItem value="__none__"><span className="text-gray-400 italic">None</span></SelectItem>
        {filtered.map(c => (
          <SelectItem key={c.id} value={c.id}>
            <div className="flex items-center gap-1.5">
              {c.type === 2 ? <Volume2 className="w-3 h-3 text-gray-400" /> : <Hash className="w-3 h-3 text-gray-400" />}
              <span>{c.parentName ? <span className="text-gray-400 text-xs">{c.parentName} / </span> : null}{c.name}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function RolePicker({ value, onChange, roles, placeholder = "Select role..." }: {
  value: string; onChange: (v: string) => void; roles: Role[]; placeholder?: string;
}) {
  const [search, setSearch] = useState("");
  const filtered = roles.filter(r => r.name.toLowerCase().includes(search.toLowerCase()));
  const selected = roles.find(r => r.id === value);

  return (
    <Select value={value || "__none__"} onValueChange={v => onChange(v === "__none__" ? "" : v)}>
      <SelectTrigger className="w-full">
        <div className="flex items-center gap-2 truncate">
          {selected ? (
            <>
              <span className="w-3 h-3 rounded-full flex-shrink-0 ring-1 ring-black/10" style={{ backgroundColor: colorToHex(selected.color) }} />
              <span className="truncate">{selected.name}</span>
            </>
          ) : (
            <span className="text-gray-400">{placeholder}</span>
          )}
        </div>
      </SelectTrigger>
      <SelectContent className="max-h-64">
        <div className="px-2 pb-2 pt-1 sticky top-0 bg-white z-10">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input className="h-7 pl-7 text-xs" placeholder="Search roles..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
        <SelectItem value="__none__"><span className="text-gray-400 italic">None</span></SelectItem>
        {filtered.map(r => (
          <SelectItem key={r.id} value={r.id}>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full ring-1 ring-black/10" style={{ backgroundColor: colorToHex(r.color) }} />
              {r.name}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  badge?: string;
  children?: { id: string; label: string }[];
}

const NAV_ITEMS: NavItem[] = [
  {
    id: "channels", label: "Channels", icon: <Hash className="w-4 h-4" />, badge: "10",
    children: [
      { id: "channels-logging", label: "Logging" },
      { id: "channels-staff", label: "Staff Channels" },
      { id: "channels-apps", label: "Applications" },
      { id: "channels-other", label: "Other Channels" },
    ]
  },
  {
    id: "roles", label: "Roles", icon: <Shield className="w-4 h-4" />, badge: "4",
    children: [
      { id: "roles-main", label: "Core Roles" },
    ]
  },
  {
    id: "behavior", label: "Bot Behavior", icon: <Settings className="w-4 h-4" />,
    children: [
      { id: "behavior-general", label: "General" },
      { id: "behavior-strikes", label: "Strike Settings" },
      { id: "behavior-loa", label: "LOA Settings" },
      { id: "behavior-activity", label: "Activity Tracking" },
    ]
  },
  {
    id: "notifications", label: "Notifications", icon: <Bell className="w-4 h-4" />,
    children: [
      { id: "notifications-welcome", label: "Welcome Message" },
    ]
  },
  {
    id: "applications", label: "Applications", icon: <FileText className="w-4 h-4" />,
    children: [
      { id: "applications-questions", label: "Custom Questions" },
      { id: "applications-settings", label: "Settings" },
    ]
  },
  { id: "embed", label: "Appearance", icon: <Zap className="w-4 h-4" /> },
];

export default function ConfigPage({ guildId }: ConfigPageProps) {
  const [activeSection, setActiveSection] = useState("channels-logging");
  const [expanded, setExpanded] = useState<Set<string>>(new Set(["channels", "behavior"]));
  const [localConfig, setLocalConfig] = useState<any>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [questions, setQuestions] = useState<any[]>([]);
  const [questionsDirty, setQuestionsDirty] = useState(false);
  const { toast } = useToast();

  const { data: config, isLoading: configLoading } = useGetConfig(guildId);
  const { data: channels = [], isLoading: channelsLoading } = useGetGuildChannels(guildId);
  const { data: roles = [], isLoading: rolesLoading } = useGetGuildRoles(guildId);
  const { data: rawQuestions = [] } = useGetApplicationQuestions(guildId);

  const updateConfigMutation = useUpdateConfig();
  const updateQuestionsMutation = useUpdateApplicationQuestions();

  useEffect(() => {
    if (config && !localConfig) setLocalConfig(config);
  }, [config]);

  useEffect(() => {
    if (rawQuestions && !questionsDirty) setQuestions(rawQuestions as any[]);
  }, [rawQuestions]);

  const set = (key: string, value: unknown) => {
    setLocalConfig((c: any) => ({ ...c, [key]: value }));
    setDirty(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateConfigMutation.mutateAsync({ guildId, data: localConfig });
      if (questionsDirty) {
        await updateQuestionsMutation.mutateAsync({ guildId, data: { questions } });
      }
      toast({ title: "Configuration saved" });
      setDirty(false);
      setQuestionsDirty(false);
    } catch {
      toast({ title: "Failed to save configuration", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const toggleExpand = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const textChannels = (channels as Channel[]).filter(c => c.type === 0 || c.type === 5);
  const voiceChannels = (channels as Channel[]).filter(c => c.type === 2);

  if (configLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const cfg = localConfig || config || {};

  const renderSection = () => {
    switch (activeSection) {
      case "channels-logging":
        return (
          <Section title="Logging Channel" description="Where the bot posts audit logs, moderation actions, and important events.">
            <Field label="Log Channel" hint="All bot activity and moderation logs are posted here">
              <ChannelPicker value={cfg.logChannelId || ""} onChange={v => set("logChannelId", v)} channels={textChannels} placeholder="Select log channel..." />
            </Field>
          </Section>
        );
      case "channels-staff":
        return (
          <Section title="Staff Channels" description="Channels used for staff-related communications and announcements.">
            <Field label="Staff Channel">
              <ChannelPicker value={cfg.staffChannelId || ""} onChange={v => set("staffChannelId", v)} channels={textChannels} />
            </Field>
            <Field label="Announcement Channel">
              <ChannelPicker value={cfg.announcementChannelId || ""} onChange={v => set("announcementChannelId", v)} channels={textChannels} />
            </Field>
            <Field label="Promotion Channel" hint="Where promotion and demotion announcements are posted">
              <ChannelPicker value={cfg.promotionChannelId || ""} onChange={v => set("promotionChannelId", v)} channels={textChannels} />
            </Field>
            <Field label="Meeting Channel">
              <ChannelPicker value={cfg.meetingChannelId || ""} onChange={v => set("meetingChannelId", v)} channels={[...textChannels, ...voiceChannels]} />
            </Field>
          </Section>
        );
      case "channels-apps":
        return (
          <Section title="Application Channels" description="Channels for managing the staff application process.">
            <Field label="Application Channel" hint="Where application forms are posted">
              <ChannelPicker value={cfg.applicationChannelId || ""} onChange={v => set("applicationChannelId", v)} channels={textChannels} />
            </Field>
            <Field label="Application Results Channel" hint="Where acceptance/denial messages are sent">
              <ChannelPicker value={cfg.applicationResultChannelId || ""} onChange={v => set("applicationResultChannelId", v)} channels={textChannels} />
            </Field>
          </Section>
        );
      case "channels-other":
        return (
          <Section title="Other Channels" description="Additional channels for specific bot functions.">
            <Field label="Strike Channel" hint="Where strike notifications are posted">
              <ChannelPicker value={cfg.strikeChannelId || ""} onChange={v => set("strikeChannelId", v)} channels={textChannels} />
            </Field>
            <Field label="LOA Channel" hint="Where LOA request notifications are posted">
              <ChannelPicker value={cfg.loaChannelId || ""} onChange={v => set("loaChannelId", v)} channels={textChannels} />
            </Field>
            <Field label="Welcome Channel">
              <ChannelPicker value={cfg.welcomeChannelId || ""} onChange={v => set("welcomeChannelId", v)} channels={textChannels} />
            </Field>
            <Field label="Appeal Channel">
              <ChannelPicker value={cfg.appealChannelId || ""} onChange={v => set("appealChannelId", v)} channels={textChannels} />
            </Field>
          </Section>
        );
      case "roles-main":
        return (
          <Section title="Core Roles" description="Role assignments for staff hierarchy and permissions.">
            <Field label="Staff Role" hint="Base role for all staff members">
              <RolePicker value={cfg.staffRoleId || ""} onChange={v => set("staffRoleId", v)} roles={roles as Role[]} />
            </Field>
            <Field label="Admin Role" hint="High-level administration role">
              <RolePicker value={cfg.adminRoleId || ""} onChange={v => set("adminRoleId", v)} roles={roles as Role[]} />
            </Field>
            <Field label="Mute Role">
              <RolePicker value={cfg.muteRoleId || ""} onChange={v => set("muteRoleId", v)} roles={roles as Role[]} />
            </Field>
            <Field label="LOA Role" hint="Applied to staff members on leave">
              <RolePicker value={cfg.loaRoleId || ""} onChange={v => set("loaRoleId", v)} roles={roles as Role[]} />
            </Field>
          </Section>
        );
      case "behavior-general":
        return (
          <Section title="General Settings" description="Core bot behavior and configuration.">
            <Field label="Command Prefix" hint="Prefix for bot commands (e.g. !)">
              <Input value={cfg.prefix || "!"} onChange={e => set("prefix", e.target.value)} maxLength={5} className="w-24" />
            </Field>
            <Field label="Bot Nickname" hint="Display name for the bot in your server">
              <Input value={cfg.botNickname || ""} onChange={e => set("botNickname", e.target.value)} placeholder="Zenith" />
            </Field>
            <Field label="Timezone" hint="Used for scheduling and timestamps">
              <Select value={cfg.timezone || "America/New_York"} onValueChange={v => set("timezone", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[
                    "America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles",
                    "America/Toronto", "Europe/London", "Europe/Paris", "Europe/Berlin",
                    "Asia/Tokyo", "Australia/Sydney", "UTC"
                  ].map(tz => <SelectItem key={tz} value={tz}>{tz}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Require Roblox Verification">
              <div className="flex items-center gap-3">
                <Switch checked={!!cfg.requireRobloxVerification} onCheckedChange={v => set("requireRobloxVerification", v)} />
                <span className="text-sm text-gray-500">Staff members must verify their Roblox account</span>
              </div>
            </Field>
          </Section>
        );
      case "behavior-strikes":
        return (
          <Section title="Strike Settings" description="Configure how strikes are handled and what happens when thresholds are hit.">
            <Field label="Strike Threshold" hint="Number of strikes before automatic action is taken">
              <Input type="number" min="1" max="20" value={cfg.strikeThreshold || 3} onChange={e => set("strikeThreshold", parseInt(e.target.value))} className="w-24" />
            </Field>
            <Field label="Strike Action" hint="What happens when the threshold is reached">
              <Select value={cfg.strikeAction || "demotion"} onValueChange={v => set("strikeAction", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="demotion">Automatic Demotion</SelectItem>
                  <SelectItem value="suspension">Suspension</SelectItem>
                  <SelectItem value="termination">Termination</SelectItem>
                  <SelectItem value="notify">Notify Only</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Auto-Kick Inactive Staff">
              <div className="flex items-center gap-3">
                <Switch checked={!!cfg.autoKickInactiveEnabled} onCheckedChange={v => set("autoKickInactiveEnabled", v)} />
                <span className="text-sm text-gray-500">Automatically remove staff who go inactive</span>
              </div>
            </Field>
            {cfg.autoKickInactiveEnabled && (
              <Field label="Inactivity Threshold (days)">
                <Input type="number" min="7" max="90" value={cfg.autoKickInactiveDays || 30} onChange={e => set("autoKickInactiveDays", parseInt(e.target.value))} className="w-24" />
              </Field>
            )}
          </Section>
        );
      case "behavior-loa":
        return (
          <Section title="LOA Settings" description="Configure leave of absence request handling.">
            <Field label="Maximum LOA Duration (days)" hint="Maximum days a staff member can request">
              <Input type="number" min="1" max="90" value={cfg.loaMaxDays || 14} onChange={e => set("loaMaxDays", parseInt(e.target.value))} className="w-24" />
            </Field>
          </Section>
        );
      case "behavior-activity":
        return (
          <Section title="Activity Tracking" description="Configure how staff activity is monitored.">
            <Field label="Enable Activity Tracking">
              <div className="flex items-center gap-3">
                <Switch checked={!!cfg.activityTrackingEnabled} onCheckedChange={v => set("activityTrackingEnabled", v)} />
                <span className="text-sm text-gray-500">Track messages and voice minutes for staff members</span>
              </div>
            </Field>
          </Section>
        );
      case "notifications-welcome":
        return (
          <Section title="Welcome Message" description="Message sent when a new staff member joins.">
            <Field label="Welcome Message" hint="Use {user} for the member mention, {server} for server name">
              <Textarea
                placeholder="Welcome {user} to the {server} staff team! 🎉"
                value={cfg.welcomeMessage || ""}
                onChange={e => set("welcomeMessage", e.target.value)}
                rows={4}
              />
            </Field>
          </Section>
        );
      case "applications-questions":
        return (
          <Section title="Application Questions" description="Custom questions shown on staff applications. Drag to reorder.">
            <div className="space-y-3">
              {questions.map((q, i) => (
                <div key={i} className="flex items-start gap-3 group">
                  <div className="flex flex-col gap-2 flex-1">
                    <Input
                      value={q.question}
                      onChange={e => {
                        const updated = [...questions];
                        updated[i] = { ...updated[i], question: e.target.value };
                        setQuestions(updated);
                        setQuestionsDirty(true);
                      }}
                      placeholder="Question text..."
                    />
                    <div className="flex items-center gap-2">
                      <Select value={q.type} onValueChange={v => {
                        const updated = [...questions];
                        updated[i] = { ...updated[i], type: v };
                        setQuestions(updated);
                        setQuestionsDirty(true);
                      }}>
                        <SelectTrigger className="h-8 w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="text">Short Text</SelectItem>
                          <SelectItem value="textarea">Long Text</SelectItem>
                          <SelectItem value="yesno">Yes / No</SelectItem>
                        </SelectContent>
                      </Select>
                      <div className="flex items-center gap-1.5">
                        <Switch
                          checked={!!q.required}
                          onCheckedChange={v => {
                            const updated = [...questions];
                            updated[i] = { ...updated[i], required: v };
                            setQuestions(updated);
                            setQuestionsDirty(true);
                          }}
                        />
                        <span className="text-xs text-gray-500">Required</span>
                      </div>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="h-9 w-9 mt-1 opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-600 hover:bg-red-50" onClick={() => {
                    setQuestions(questions.filter((_, j) => j !== i));
                    setQuestionsDirty(true);
                  }}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
              <Button variant="outline" size="sm" className="gap-1.5 mt-2" onClick={() => {
                setQuestions([...questions, { question: "", type: "text", required: true, order: questions.length, placeholder: "" }]);
                setQuestionsDirty(true);
              }}>
                <Plus className="w-3.5 h-3.5" /> Add Question
              </Button>
            </div>
          </Section>
        );
      case "applications-settings":
        return (
          <Section title="Application Settings" description="Configure application submission behavior.">
            <Field label="Application Cooldown (days)" hint="How long users must wait before re-applying">
              <Input type="number" min="0" max="30" value={cfg.applicationCooldownDays || 7} onChange={e => set("applicationCooldownDays", parseInt(e.target.value))} className="w-24" />
            </Field>
          </Section>
        );
      case "embed":
        return (
          <Section title="Appearance" description="Customize how the bot appears in your server.">
            <Field label="Embed Color" hint="Color used for bot embeds">
              <div className="flex items-center gap-3">
                <input type="color" value={cfg.embedColor || "#5BA4CF"} onChange={e => set("embedColor", e.target.value)} className="w-12 h-10 rounded-lg border border-gray-200 cursor-pointer p-1" />
                <Input value={cfg.embedColor || "#5BA4CF"} onChange={e => set("embedColor", e.target.value)} className="w-36 font-mono text-sm" />
                <div className="w-8 h-8 rounded-lg shadow-sm ring-1 ring-black/10" style={{ backgroundColor: cfg.embedColor || "#5BA4CF" }} />
              </div>
            </Field>
          </Section>
        );
      default:
        return <div className="text-gray-400 py-8 text-center">Select a section from the sidebar</div>;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Configuration</h1>
          <p className="text-gray-500 text-sm mt-1">Customize every aspect of your Zenith setup</p>
        </div>
        {(dirty || questionsDirty) && (
          <Button onClick={handleSave} disabled={saving} className="gap-2 shadow-md">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        )}
      </div>

      <div className="flex gap-6 min-h-[600px]">
        {/* Sidebar */}
        <aside className="w-56 flex-shrink-0">
          <nav className="space-y-0.5">
            {NAV_ITEMS.map(item => (
              <div key={item.id}>
                {item.children ? (
                  <>
                    <button
                      onClick={() => toggleExpand(item.id)}
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition-all text-left ${expanded.has(item.id) ? "text-gray-900" : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"}`}
                    >
                      <span className="text-gray-400">{item.icon}</span>
                      <span className="flex-1">{item.label}</span>
                      {expanded.has(item.id) ? <ChevronDown className="w-3.5 h-3.5 text-gray-400" /> : <ChevronRight className="w-3.5 h-3.5 text-gray-400" />}
                    </button>
                    {expanded.has(item.id) && (
                      <div className="ml-4 border-l border-gray-200 pl-3 space-y-0.5 mt-0.5 mb-1">
                        {item.children.map(child => (
                          <button
                            key={child.id}
                            onClick={() => setActiveSection(child.id)}
                            className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all text-left ${activeSection === child.id ? "bg-primary/10 text-primary font-semibold" : "text-gray-500 hover:text-gray-900 hover:bg-gray-100 font-medium"}`}
                          >
                            {child.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <button
                    onClick={() => setActiveSection(item.id)}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition-all text-left ${activeSection === item.id ? "bg-primary/10 text-primary" : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"}`}
                  >
                    <span className="text-gray-400">{item.icon}</span>
                    {item.label}
                  </button>
                )}
              </div>
            ))}
          </nav>
        </aside>

        {/* Main */}
        <div className="flex-1 bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
          {channelsLoading || rolesLoading ? (
            <div className="flex items-center gap-2 text-gray-400">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Loading server data...</span>
            </div>
          ) : renderSection()}
        </div>
      </div>
    </div>
  );
}

function Section({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <div className="pb-4 border-b border-gray-100">
        <h2 className="text-lg font-bold text-gray-900">{title}</h2>
        <p className="text-sm text-gray-500 mt-0.5">{description}</p>
      </div>
      <div className="space-y-5">{children}</div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[220px_1fr] gap-8 items-start">
      <div>
        <label className="text-sm font-semibold text-gray-700 block">{label}</label>
        {hint && <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{hint}</p>}
      </div>
      <div className="max-w-sm">{children}</div>
    </div>
  );
}
