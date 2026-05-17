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
    enabled: boolean; channel: string; reviewChannel: string; title: string;
    questions: Question[]; requireRecommendations: boolean; autoReject: boolean;
  }

  export default function ApplicationsPage({ guildId }: { guildId: string }) {
    const [cfg, setCfg] = useState<AppConfig>({
      enabled: false, channel: '', reviewChannel: '', title: '', questions: [],
      requireRecommendations: false, autoReject: false,
    });
    const [channels, setChannels] = useState<Channel[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState('');

    const fetchData = useCallback(async () => {
      setLoading(true);
      try {
        const [cfgRes, chanRes] = await Promise.all([
          fetch(`/api/guilds/${guildId}/applications-config`, { credentials: 'include' }),
          fetch(`/api/guilds/${guildId}/channels`, { credentials: 'include' }),
        ]);
        if (cfgRes.ok) setCfg(await cfgRes.json());
        if (chanRes.ok) setChannels(await chanRes.json());
      } catch { }
      setLoading(false);
    }, [guildId]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const addQuestion = () => setCfg(c => ({ ...c, questions: [...c.questions, { text: '', placeholder: '', required: true }] }));
    const removeQuestion = (i: number) => setCfg(c => ({ ...c, questions: c.questions.filter((_, idx) => idx !== i) }));
    const updateQuestion = (i: number, key: keyof Question, val: any) =>
      setCfg(c => ({ ...c, questions: c.questions.map((q, idx) => idx === i ? { ...q, [key]: val } : q) }));

    const handleSave = async () => {
      setSaving(true); setError(''); setSaved(false);
      try {
        const res = await fetch(`/api/guilds/${guildId}/applications-config`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
          body: JSON.stringify(cfg),
        });
        if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Failed to save'); }
        setSaved(true); setTimeout(() => setSaved(false), 3000);
      } catch (err: any) { setError(err.message); }
      setSaving(false);
    };

    if (loading) return (
      <div className="flex justify-center items-center py-20">
        <div className="w-7 h-7 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#d4af37', borderTopColor: 'transparent' }} />
      </div>
    );

    return (
      <div className="space-y-5 max-w-3xl">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight flex items-center gap-2">
              <Settings2 className="w-6 h-6" style={{ color: '#d4af37' }} /> Application System
            </h2>
            <p className="text-muted-foreground mt-0.5 text-sm">Configure how staff applications work in your Discord server.</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {saved && <span className="text-green-600 text-sm flex items-center gap-1.5 font-medium"><CheckCircle size={14} /> Saved!</span>}
            {error && <span className="text-red-600 text-sm flex items-center gap-1.5"><AlertCircle size={14} /> {error}</span>}
            <Button variant="outline" size="sm" onClick={fetchData} className="gap-1.5"><RefreshCw size={13} />Refresh</Button>
            <Button onClick={handleSave} disabled={saving} size="sm" style={{ background: saving ? undefined : 'linear-gradient(135deg,#d4af37,#ffd700)', color: '#5a3e10', border: 'none' }}>
              {saving ? <><Loader2 size={13} className="animate-spin mr-1" />Saving...</> : "Save Changes"}
            </Button>
          </div>
        </div>

        <Card className="border-border bg-white shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-semibold">Enable Application System</p>
                <p className="text-muted-foreground text-sm mt-0.5">Allow users to submit staff applications through Discord panels.</p>
              </div>
              <Switch checked={cfg.enabled} onCheckedChange={v => setCfg(c => ({ ...c, enabled: v }))} />
            </div>
          </CardContent>
        </Card>

        {cfg.enabled && (
          <>
            <Card className="border-border bg-white shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Hash className="w-4 h-4" style={{ color: '#d4af37' }} /> Channels
                </CardTitle>
                <CardDescription>Where the panel is posted and where applications are reviewed.</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold">Application Panel Channel</Label>
                  <p className="text-xs text-muted-foreground">Post the "Apply Now" button panel here.</p>
                  <Select value={cfg.channel || ""} onValueChange={v => setCfg(c => ({ ...c, channel: v }))}>
                    <SelectTrigger className="bg-white border-border"><SelectValue placeholder="Select channel" /></SelectTrigger>
                    <SelectContent className="bg-white border-border">
                      <SelectItem value="">Not configured</SelectItem>
                      {channels.map(c => <SelectItem key={c.id} value={c.id}>#{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold">Review Channel (Staff Only)</Label>
                  <p className="text-xs text-muted-foreground">Applications land here for management to review.</p>
                  <Select value={cfg.reviewChannel || ""} onValueChange={v => setCfg(c => ({ ...c, reviewChannel: v }))}>
                    <SelectTrigger className="bg-white border-border"><SelectValue placeholder="Select channel" /></SelectTrigger>
                    <SelectContent className="bg-white border-border">
                      <SelectItem value="">Not configured</SelectItem>
                      {channels.map(c => <SelectItem key={c.id} value={c.id}>#{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border bg-white shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Application Title</CardTitle>
                <CardDescription>Shown in the Discord embed when the panel is posted.</CardDescription>
              </CardHeader>
              <CardContent>
                <Input value={cfg.title} onChange={e => setCfg(c => ({ ...c, title: e.target.value }))} placeholder="e.g. Staff Application — Zenith Roleplay" className="bg-white border-border" />
              </CardContent>
            </Card>

            <Card className="border-border bg-white shadow-sm">
              <CardHeader className="pb-3"><CardTitle className="text-base">Settings</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {[
                  { key: 'requireRecommendations', label: 'Require a Staff Recommendation', desc: 'Applicants must name an existing staff member who vouches for them.' },
                  { key: 'autoReject', label: 'Auto-Reject Stale Applications (Premium)', desc: 'Automatically deny applications with no review action after 7 days.' },
                ].map(opt => (
                  <div key={opt.key} className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30 gap-4">
                    <div>
                      <p className="text-sm font-semibold">{opt.label}</p>
                      <p className="text-muted-foreground text-xs mt-0.5">{opt.desc}</p>
                    </div>
                    <Switch checked={!!(cfg as any)[opt.key]} onCheckedChange={v => setCfg(c => ({ ...c, [opt.key]: v }))} />
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="border-border bg-white shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">Application Questions</CardTitle>
                    <CardDescription className="mt-0.5">{cfg.questions.length}/5 questions — shown in the Discord modal when users apply.</CardDescription>
                  </div>
                  <Button onClick={addQuestion} size="sm" variant="outline" className="gap-1.5" disabled={cfg.questions.length >= 5}>
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
                      <Switch checked={q.required} onCheckedChange={v => updateQuestion(i, 'required', v)} />
                      <Button variant="ghost" size="sm" onClick={() => removeQuestion(i)} className="text-red-500 hover:bg-red-50 h-7 w-7 p-0">
                        <Trash2 size={13} />
                      </Button>
                    </div>
                    <Input value={q.text} onChange={e => updateQuestion(i, 'text', e.target.value)} placeholder="Question text e.g. Why do you want to join?" className="bg-white border-border text-sm" />
                    <Input value={q.placeholder || ''} onChange={e => updateQuestion(i, 'placeholder', e.target.value)} placeholder="Hint text shown inside the answer field (optional)" className="bg-white border-border text-xs" />
                  </div>
                ))}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    );
  }
  