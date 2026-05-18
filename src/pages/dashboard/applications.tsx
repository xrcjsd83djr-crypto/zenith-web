import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Loader2, RefreshCw, CheckCircle, Hash, GripVertical, Settings2, AlertCircle } from "lucide-react";

  interface Channel { id: string; name: string; }
  interface Question { text: string; placeholder?: string; required: boolean; }
  interface AppConfig {
    enabled: boolean;
    channel: string | null;
    reviewChannel: string | null;
    title: string;
    questions: Question[];
    requireRecommendations: boolean;
    autoReject: boolean;
    reviewerRoleIds: string[];
    apakKey: string | null;
  }

  const DEFAULT_CFG: AppConfig = {
    enabled: false, channel: null, reviewChannel: null, title: '',
    questions: [], requireRecommendations: false, autoReject: false,
    reviewerRoleIds: [], apakKey: null,
  };

  export default function ApplicationsPage({ guildId }: { guildId: string }) {
    const [cfg, setCfg] = useState<AppConfig>(DEFAULT_CFG);
    const [channels, setChannels] = useState<Channel[]>([]);
    const [roles, setRoles] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState('');
    const [fetchError, setFetchError] = useState('');

    const fetchData = useCallback(async () => {
      setLoading(true);
      setFetchError('');
      try {
        const [cfgRes, chanRes, roleRes] = await Promise.all([
          fetch(`/api/guilds/${guildId}/applications-config`, { credentials: 'include' }),
          fetch(`/api/guilds/${guildId}/channels`, { credentials: 'include' }),
          fetch(`/api/guilds/${guildId}/roles`, { credentials: 'include' }),
        ]);
        if (roleRes.ok) {
          const d = await roleRes.json();
          setRoles(Array.isArray(d) ? d : []);
        }
        if (cfgRes.ok) {
          const d = await cfgRes.json();
          setCfg({ ...DEFAULT_CFG, ...d });
        }
        if (chanRes.ok) {
          const d = await chanRes.json();
          setChannels(Array.isArray(d) ? d : []);
        }
      } catch (e: any) {
        setFetchError('Could not reach the server. Check your connection.');
      }
      setLoading(false);
    }, [guildId]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const addQuestion = () => {
      if (cfg.questions.length >= 5) return;
      setCfg(c => ({ ...c, questions: [...c.questions, { text: '', placeholder: '', required: true }] }));
    };
    const removeQuestion = (i: number) =>
      setCfg(c => ({ ...c, questions: c.questions.filter((_, idx) => idx !== i) }));
    const updateQuestion = (i: number, key: keyof Question, val: any) =>
      setCfg(c => ({ ...c, questions: c.questions.map((q, idx) => idx === i ? { ...q, [key]: val } : q) }));

    const handleSave = async () => {
      setSaving(true); setError(''); setSaved(false);
      try {
        const res = await fetch(`/api/guilds/${guildId}/applications-config`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(cfg),
        });
        if (!res.ok) {
          const d = await res.json().catch(() => ({ error: 'Save failed' }));
          throw new Error(d.error || 'Failed to save');
        }
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } catch (err: any) {
        setError(err.message);
      }
      setSaving(false);
    };

    // Helper: channel select — uses "none" sentinel to avoid empty-string value crash
    const ChannelPicker = ({ value, onChange, label, desc }: {
      value: string | null; onChange: (v: string | null) => void; label: string; desc: string;
    }) => (
      <div className="space-y-1.5">
        <Label className="text-sm font-semibold">{label}</Label>
        <p className="text-xs text-muted-foreground">{desc}</p>
        <Select
          value={value ?? 'none'}
          onValueChange={v => onChange(v === 'none' ? null : v)}
        >
          <SelectTrigger className="bg-white border-border text-sm">
            <SelectValue placeholder="Select a channel" />
          </SelectTrigger>
          <SelectContent className="bg-white border-border max-h-60 overflow-y-auto">
            <SelectItem value="none">Not configured</SelectItem>
            {channels.map(c => (
              <SelectItem key={c.id} value={c.id}>#{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );

    if (loading) {
      return (
        <div className="flex justify-center items-center py-24">
          <div className="w-7 h-7 rounded-full border-2 animate-spin"
            style={{ borderColor: '#d4af37', borderTopColor: 'transparent' }} />
        </div>
      );
    }

    return (
      <div className="space-y-5 max-w-3xl">
        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight flex items-center gap-2">
              <Settings2 className="w-6 h-6" style={{ color: '#d4af37' }} />
              Application System
            </h2>
            <p className="text-muted-foreground mt-0.5 text-sm">
              Configure how staff applications work in your Discord server.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {saved && (
              <span className="text-green-600 text-sm flex items-center gap-1.5 font-medium">
                <CheckCircle size={14} /> Saved!
              </span>
            )}
            {error && (
              <span className="text-red-600 text-sm flex items-center gap-1.5">
                <AlertCircle size={14} /> {error}
              </span>
            )}
            <Button variant="outline" size="sm" onClick={fetchData} className="gap-1.5">
              <RefreshCw size={13} /> Refresh
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              size="sm"
              style={{ background: saving ? undefined : 'linear-gradient(135deg,#d4af37,#ffd700)', color: '#5a3e10', border: 'none' }}
            >
              {saving
                ? <><Loader2 size={13} className="animate-spin mr-1" />Saving...</>
                : "Save Changes"}
            </Button>
          </div>
        </div>

        {fetchError && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
            <AlertCircle size={14} /> {fetchError}
          </div>
        )}

        {/* Enable / Disable toggle */}
        <Card className="border-border bg-white shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-semibold">Enable Application System</p>
                <p className="text-muted-foreground text-sm mt-0.5">
                  Allow users to submit staff applications through Discord panels.
                </p>
              </div>
              <Switch
                checked={cfg.enabled}
                onCheckedChange={v => setCfg(c => ({ ...c, enabled: v }))}
              />
            </div>
          </CardContent>
        </Card>

        {/* Only show the rest when enabled */}
        {cfg.enabled && (
          <>
            {/* Channels */}
            <Card className="border-border bg-white shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Hash className="w-4 h-4" style={{ color: '#d4af37' }} /> Channels
                </CardTitle>
                <CardDescription>
                  Where the panel is posted and where applications are reviewed.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <ChannelPicker
                  value={cfg.channel}
                  onChange={v => setCfg(c => ({ ...c, channel: v }))}
                  label="Application Panel Channel"
                  desc='Post the "Apply Now" button panel here.'
                />
                <ChannelPicker
                  value={cfg.reviewChannel}
                  onChange={v => setCfg(c => ({ ...c, reviewChannel: v }))}
                  label="Review Channel (Staff Only)"
                  desc="Applications land here for management to review."
                />
              </CardContent>
            </Card>

            {/* Panel Customization */}
            <Card className="border-border bg-white shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Settings2 className="w-4 h-4" style={{ color: '#d4af37' }} /> Panel Customization
                </CardTitle>
                <CardDescription>
                  Customize the message and appearance of the application panel in Discord.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Application Title</Label>
                  <Input
                    value={cfg.title}
                    onChange={e => setCfg(c => ({ ...c, title: e.target.value }))}
                    placeholder="e.g. Staff Application — Zenith Roleplay"
                    className="bg-white border-border"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Panel Message (Description)</Label>
                  <textarea
                    value={(cfg as any).panelDescription || ''}
                    onChange={e => setCfg(c => ({ ...c, panelDescription: e.target.value } as any))}
                    placeholder="Enter the message that will appear on the application panel..."
                    className="w-full min-h-[100px] p-3 text-sm bg-white border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-[#d4af37]/20"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Button Label</Label>
                    <Input
                      value={(cfg as any).buttonLabel || 'Apply Now'}
                      onChange={e => setCfg(c => ({ ...c, buttonLabel: e.target.value } as any))}
                      placeholder="e.g. Apply Now"
                      className="bg-white border-border"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Embed Color (Hex)</Label>
                    <div className="flex gap-2">
                      <div className="w-10 h-10 rounded border border-border flex-shrink-0" style={{ backgroundColor: (cfg as any).embedColor || '#d4af37' }} />
                      <Input
                        value={(cfg as any).embedColor || '#d4af37'}
                        onChange={e => setCfg(c => ({ ...c, embedColor: e.target.value } as any))}
                        placeholder="#d4af37"
                        className="bg-white border-border"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Reviewer Roles */}
            <Card className="border-border bg-white shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Reviewer Roles</CardTitle>
                <CardDescription>Select up to 4 roles that can access the application review portal.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[0, 1, 2, 3].map(i => (
                    <div key={i} className="space-y-1.5">
                      <Label className="text-xs font-semibold">Reviewer Role {i + 1}</Label>
                      <Select
                        value={cfg.reviewerRoleIds[i] || 'none'}
                        onValueChange={v => {
                          const newRoles = [...cfg.reviewerRoleIds];
                          if (v === 'none') {
                            newRoles.splice(i, 1);
                          } else {
                            newRoles[i] = v;
                          }
                          setCfg({ ...cfg, reviewerRoleIds: newRoles });
                        }}
                      >
                        <SelectTrigger className="bg-white border-border text-sm">
                          <SelectValue placeholder="Select a role" />
                        </SelectTrigger>
                        <SelectContent className="bg-white border-border max-h-60 overflow-y-auto">
                          <SelectItem value="none">None</SelectItem>
                          {roles.map(r => (
                            <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* APAK */}
            {cfg.apakKey && (
              <Card className="border-border bg-white shadow-sm border-l-4 border-l-[#d4af37]">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-[#d4af37]" /> Application Portal Access Key (APAK)
                  </CardTitle>
                  <CardDescription>Share this link with your staff to access the review portal.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2">
                    <Input
                      readOnly
                      value={`${window.location.origin}/portal/${cfg.apakKey}`}
                      className="bg-muted/50 font-mono text-xs"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/portal/${cfg.apakKey}`);
                        alert('Link copied to clipboard!');
                      }}
                    >
                      Copy
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Settings */}
            <Card className="border-border bg-white shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Account Age Limit (Days)</Label>
                    <Input
                      type="number"
                      value={(cfg as any).accountAgeLimit || 0}
                      onChange={e => setCfg(c => ({ ...c, accountAgeLimit: parseInt(e.target.value) } as any))}
                      className="bg-white border-border"
                    />
                    <p className="text-[10px] text-muted-foreground">Minimum Discord account age to apply.</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Server Time Limit (Days)</Label>
                    <Input
                      type="number"
                      value={(cfg as any).serverTimeLimit || 0}
                      onChange={e => setCfg(c => ({ ...c, serverTimeLimit: parseInt(e.target.value) } as any))}
                      className="bg-white border-border"
                    />
                    <p className="text-[10px] text-muted-foreground">Minimum time in server to apply.</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Rejection Cooldown (Days)</Label>
                    <Input
                      type="number"
                      value={(cfg as any).rejectionCooldown || 0}
                      onChange={e => setCfg(c => ({ ...c, rejectionCooldown: parseInt(e.target.value) } as any))}
                      className="bg-white border-border"
                    />
                    <p className="text-[10px] text-muted-foreground">Days to wait before re-applying if rejected.</p>
                  </div>
                </div>

                <div className="pt-2 space-y-3">
                  {[
                    {
                      key: 'requireRecommendations',
                      label: 'Require a Staff Recommendation',
                      desc: 'Applicants must name an existing staff member who vouches for them.',
                    },
                    {
                      key: 'autoReject',
                      label: 'Auto-Reject Stale Applications',
                      desc: 'Automatically deny applications with no review action after 7 days. (Premium)',
                    },
                  ].map(opt => (
                    <div key={opt.key} className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30 gap-4">
                      <div>
                        <p className="text-sm font-semibold">{opt.label}</p>
                        <p className="text-muted-foreground text-xs mt-0.5">{opt.desc}</p>
                      </div>
                      <Switch
                        checked={!!(cfg as any)[opt.key]}
                        onCheckedChange={v => setCfg(c => ({ ...c, [opt.key]: v }))}
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Questions */}
            <Card className="border-border bg-white shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">Application Questions</CardTitle>
                    <CardDescription className="mt-0.5">
                      {cfg.questions.length}/5 questions — shown in the Discord modal when users apply.
                    </CardDescription>
                  </div>
                  <Button
                    onClick={addQuestion}
                    size="sm"
                    variant="outline"
                    className="gap-1.5"
                    disabled={cfg.questions.length >= 5}
                  >
                    <Plus size={13} /> Add
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {cfg.questions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm border border-dashed border-border rounded-lg">
                    No questions yet. Add up to 5 questions for the application modal.
                  </div>
                ) : cfg.questions.map((q, i) => (
                  <div key={i} className="p-4 border border-border rounded-lg bg-muted/20 space-y-3">
                    <div className="flex items-center gap-2">
                      <GripVertical size={14} className="text-muted-foreground flex-shrink-0" />
                      <Badge variant="outline" className="text-xs">Q{i + 1}</Badge>
                      <div className="flex-1" />
                      <span className="text-xs text-muted-foreground">Required</span>
                      <Switch
                        checked={q.required}
                        onCheckedChange={v => updateQuestion(i, 'required', v)}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeQuestion(i)}
                        className="text-red-500 hover:bg-red-50 h-7 w-7 p-0"
                      >
                        <Trash2 size={13} />
                      </Button>
                    </div>
                    <Input
                      value={q.text}
                      onChange={e => updateQuestion(i, 'text', e.target.value)}
                      placeholder="Question text e.g. Why do you want to join?"
                      className="bg-white border-border text-sm"
                    />
                    <Input
                      value={q.placeholder || ''}
                      onChange={e => updateQuestion(i, 'placeholder', e.target.value)}
                      placeholder="Hint text shown inside the answer field (optional)"
                      className="bg-white border-border text-xs"
                    />
                  </div>
                ))}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    );
  }
  