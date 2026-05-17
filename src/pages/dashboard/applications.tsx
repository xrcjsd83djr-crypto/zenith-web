import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Loader2, RefreshCw, CheckCircle, Hash, GripVertical } from "lucide-react";

interface Channel { id: string; name: string; }
interface Question { text: string; placeholder?: string; required: boolean; }
interface AppConfig { enabled: boolean; channel: string; reviewChannel: string; title: string; questions: Question[]; requireRecommendations: boolean; autoReject: boolean; }

export default function ApplicationsPage({ guildId }: { guildId: string }) {
  const [cfg, setCfg] = useState<AppConfig>({ enabled: false, channel: '', reviewChannel: '', title: '', questions: [], requireRecommendations: false, autoReject: false });
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
  const updateQuestion = (i: number, key: keyof Question, val: any) => setCfg(c => ({ ...c, questions: c.questions.map((q, idx) => idx === i ? { ...q, [key]: val } : q) }));

  const handleSave = async () => {
    setSaving(true); setError(''); setSaved(false);
    try {
      const res = await fetch(`/api/guilds/${guildId}/applications-config`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify(cfg),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      setSaved(true); setTimeout(() => setSaved(false), 3000);
    } catch (err: any) { setError(err.message); }
    setSaving(false);
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="animate-spin text-blue-400" size={24} /></div>;

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Applications Configuration</h2>
          <p className="text-gray-400 text-sm mt-1">Set up and manage staff application forms</p>
        </div>
        <div className="flex items-center gap-3">
          {saved && <span className="text-green-400 text-sm flex items-center gap-1.5"><CheckCircle size={14} />Saved!</span>}
          {error && <span className="text-red-400 text-sm">{error}</span>}
          <Button variant="outline" size="sm" onClick={fetchData} className="border-[#3a3d4a] text-gray-300"><RefreshCw size={14} /></Button>
          <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white">
            {saving ? <><Loader2 size={14} className="animate-spin mr-2" />Saving...</> : "Save Changes"}
          </Button>
        </div>
      </div>

      {/* Toggle */}
      <Card className="bg-[#161820] border-[#3a3d4a]">
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white font-medium">Enable Application System</p>
              <p className="text-gray-400 text-sm mt-0.5">Allow users to apply for staff positions through Discord.</p>
            </div>
            <Switch checked={cfg.enabled} onCheckedChange={v => setCfg(c => ({ ...c, enabled: v }))} />
          </div>
        </CardContent>
      </Card>

      {cfg.enabled && (
        <>
          {/* Channels */}
          <Card className="bg-[#161820] border-[#3a3d4a]">
            <CardHeader><CardTitle className="text-white text-base flex items-center gap-2"><Hash className="text-blue-400" size={16} />Channels</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-gray-300 text-sm">Applications Channel</Label>
                <Select value={cfg.channel || ""} onValueChange={v => setCfg(c => ({ ...c, channel: v }))}>
                  <SelectTrigger className="bg-[#1e2028] border-[#3a3d4a] text-white"><SelectValue placeholder="Select channel" /></SelectTrigger>
                  <SelectContent className="bg-[#1e2028] border-[#3a3d4a] text-white">
                    <SelectItem value="">Not set</SelectItem>
                    {channels.map(c => <SelectItem key={c.id} value={c.id} className="hover:bg-[#2a2d3a]">#{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-gray-300 text-sm">Review Channel</Label>
                <Select value={cfg.reviewChannel || ""} onValueChange={v => setCfg(c => ({ ...c, reviewChannel: v }))}>
                  <SelectTrigger className="bg-[#1e2028] border-[#3a3d4a] text-white"><SelectValue placeholder="Select channel" /></SelectTrigger>
                  <SelectContent className="bg-[#1e2028] border-[#3a3d4a] text-white">
                    <SelectItem value="">Not set</SelectItem>
                    {channels.map(c => <SelectItem key={c.id} value={c.id} className="hover:bg-[#2a2d3a]">#{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Title */}
          <Card className="bg-[#161820] border-[#3a3d4a]">
            <CardHeader><CardTitle className="text-white text-base">Application Title</CardTitle></CardHeader>
            <CardContent>
              <Input value={cfg.title} onChange={e => setCfg(c => ({ ...c, title: e.target.value }))} placeholder="Staff Application — Server Name" className="bg-[#1e2028] border-[#3a3d4a] text-white" />
            </CardContent>
          </Card>

          {/* Options */}
          <Card className="bg-[#161820] border-[#3a3d4a]">
            <CardHeader><CardTitle className="text-white text-base">Options</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {[
                { key: 'requireRecommendations', label: 'Require Recommendations', desc: 'Applicants must provide a recommendation from existing staff.' },
                { key: 'autoReject', label: 'Auto-Reject Inactive', desc: 'Automatically reject applications that have no response after 7 days.' },
              ].map(opt => (
                <div key={opt.key} className="flex items-center justify-between p-3 bg-[#1e2028] rounded-lg border border-[#3a3d4a]">
                  <div>
                    <p className="text-white text-sm font-medium">{opt.label}</p>
                    <p className="text-gray-400 text-xs">{opt.desc}</p>
                  </div>
                  <Switch checked={!!(cfg as any)[opt.key]} onCheckedChange={v => setCfg(c => ({ ...c, [opt.key]: v }))} />
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Questions */}
          <Card className="bg-[#161820] border-[#3a3d4a]">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-white text-base">Application Questions</CardTitle>
                <CardDescription className="text-gray-400 text-xs mt-0.5">{cfg.questions.length} questions configured</CardDescription>
              </div>
              <Button onClick={addQuestion} size="sm" className="bg-blue-600 hover:bg-blue-700 text-white"><Plus size={14} className="mr-1" />Add</Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {cfg.questions.length === 0 ? (
                <div className="text-center py-6 text-gray-500 text-sm">No questions yet. Click "Add" to create the application form.</div>
              ) : cfg.questions.map((q, i) => (
                <div key={i} className="p-3 bg-[#1e2028] rounded-lg border border-[#3a3d4a] space-y-3">
                  <div className="flex items-center gap-2">
                    <GripVertical size={14} className="text-gray-600 flex-shrink-0" />
                    <span className="text-gray-400 text-xs">Q{i + 1}</span>
                    <div className="flex-1" />
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400 text-xs">Required</span>
                      <Switch checked={q.required} onCheckedChange={v => updateQuestion(i, 'required', v)} />
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => removeQuestion(i)} className="text-red-400 hover:text-red-300 h-7 w-7 p-0"><Trash2 size={13} /></Button>
                  </div>
                  <Input value={q.text} onChange={e => updateQuestion(i, 'text', e.target.value)} placeholder="Question text..." className="bg-[#252830] border-[#3a3d4a] text-white text-sm" />
                  <Input value={q.placeholder || ''} onChange={e => updateQuestion(i, 'placeholder', e.target.value)} placeholder="Placeholder hint (optional)..." className="bg-[#252830] border-[#3a3d4a] text-gray-400 text-xs" />
                </div>
              ))}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
