import { useState, useEffect, useCallback } from "react";
  import { Card, CardContent } from "@/components/ui/card";
  import { Button } from "@/components/ui/button";
  import { Badge } from "@/components/ui/badge";
  import { Input } from "@/components/ui/input";
  import { Label } from "@/components/ui/label";
  import { Textarea } from "@/components/ui/textarea";
  import { Switch } from "@/components/ui/switch";
  import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
  import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
  import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
  import { Plus, Trash2, RefreshCw, ChevronDown, ChevronUp, CheckCircle, X, Copy, Lock, Inbox, Settings } from "lucide-react";

  interface AppPanel { id: string; title: string; description: string; questions: Question[]; button_label: string; review_role_ids: string[]; review_channel_id: string; enabled: boolean; created_at: string; submission_count?: number; }
  interface Question { id: string; text: string; type: "short" | "long" | "choice"; required: boolean; choices?: string[]; }
  interface Submission { id: string; panel_id: string; panel_title: string; user_id: string; username: string; answers: Record<string, string>; status: "pending" | "accepted" | "rejected"; reviewer_id?: string; reviewer_username?: string; reviewer_notes?: string; created_at: string; }

  const FREE_PANEL_LIMIT = 1;
  const FREE_QUESTION_LIMIT = 13;

  function QEditor({ q, onChange, onDelete, isPremium, count }: { q: Question; onChange: (q: Question) => void; onDelete: () => void; isPremium: boolean; count: number; }) {
    const [newChoice, setNewChoice] = useState("");
    return (
      <div className="border border-border rounded-lg p-3 space-y-2 bg-card">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-muted-foreground w-5">{count}.</span>
          <Input value={q.text} onChange={e => onChange({ ...q, text: e.target.value })} placeholder="Question text..." className="flex-1 h-8 text-sm" />
          <Select value={q.type} onValueChange={v => onChange({ ...q, type: v as any, choices: v === 'choice' ? (q.choices || []) : undefined })}>
            <SelectTrigger className="w-28 h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="short">Short</SelectItem>
              <SelectItem value="long">Long</SelectItem>
              <SelectItem value="choice">Multiple Choice</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center gap-1.5">
            <Switch checked={q.required} onCheckedChange={v => onChange({ ...q, required: v })} />
            <span className="text-xs text-muted-foreground">Req.</span>
          </div>
          <button onClick={onDelete} className="text-muted-foreground hover:text-red-500 transition-colors p-1"><Trash2 size={13} /></button>
        </div>
        {q.type === "choice" && (
          <div className="ml-5 space-y-1.5">
            <p className="text-xs text-muted-foreground font-medium">Answer choices:</p>
            {(q.choices || []).map((c, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground w-4">{String.fromCharCode(65 + i)}.</span>
                <Input
                  value={c}
                  onChange={e => {
                    const choices = [...(q.choices || [])];
                    choices[i] = e.target.value;
                    onChange({ ...q, choices });
                  }}
                  className="flex-1 h-7 text-xs"
                  placeholder={`Choice ${String.fromCharCode(65 + i)}`}
                />
                <button
                  onClick={() => {
                    const choices = (q.choices || []).filter((_, ii) => ii !== i);
                    onChange({ ...q, choices });
                  }}
                  className="text-muted-foreground hover:text-red-500 transition-colors"
                >
                  <X size={11} />
                </button>
              </div>
            ))}
            {(q.choices || []).length < 10 && (
              <div className="flex items-center gap-2">
                <Input
                  value={newChoice}
                  onChange={e => setNewChoice(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && newChoice.trim()) {
                      onChange({ ...q, choices: [...(q.choices || []), newChoice.trim()] });
                      setNewChoice("");
                    }
                  }}
                  className="flex-1 h-7 text-xs"
                  placeholder="Type a choice and press Enter..."
                />
                <Button
                  size="sm" variant="outline"
                  className="h-7 text-xs px-2"
                  disabled={!newChoice.trim()}
                  onClick={() => {
                    if (newChoice.trim()) {
                      onChange({ ...q, choices: [...(q.choices || []), newChoice.trim()] });
                      setNewChoice("");
                    }
                  }}
                >
                  <Plus size={11} />
                </Button>
              </div>
            )}
            {(q.choices || []).length === 0 && (
              <p className="text-xs text-muted-foreground italic">Add at least one choice.</p>
            )}
          </div>
        )}
      </div>
    );
  }

  function SubmissionRow({ s, onUpdate }: { s: Submission; onUpdate: (id: string, status: string, notes: string) => void; }) {
    const [open, setOpen] = useState(false);
    const [notes, setNotes] = useState("");
    const [deciding, setDeciding] = useState(false);
    const status = s.status;
    const badge = status === "pending" ? "bg-yellow-100 text-yellow-700 border-yellow-200" : status === "accepted" ? "bg-green-100 text-green-700 border-green-200" : "bg-red-100 text-red-700 border-red-200";
    return (
      <div className="border border-border rounded-lg overflow-hidden mb-2">
        <button onClick={() => setOpen(o => !o)} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors text-left">
          <Badge className={`${badge} border text-xs capitalize`}>{status}</Badge>
          <div className="flex-1 min-w-0">
            <span className="font-semibold text-sm">{s.username}</span>
            <span className="text-muted-foreground text-xs ml-2">{s.panel_title}</span>
          </div>
          <span className="text-muted-foreground text-xs flex-shrink-0">{new Date(s.created_at).toLocaleDateString()}</span>
          {open ? <ChevronUp size={14} className="text-muted-foreground" /> : <ChevronDown size={14} className="text-muted-foreground" />}
        </button>
        {open && (
          <div className="px-4 pb-4 border-t bg-muted/20 space-y-3">
            <div className="grid grid-cols-2 gap-3 mt-3 text-sm">
              <div><p className="text-xs text-muted-foreground font-medium">Applicant</p><p className="font-semibold">{s.username}</p></div>
              <div><p className="text-xs text-muted-foreground font-medium">Panel</p><p>{s.panel_title}</p></div>
              <div><p className="text-xs text-muted-foreground font-medium">Submitted</p><p>{new Date(s.created_at).toLocaleString()}</p></div>
              <div><p className="text-xs text-muted-foreground font-medium">Status</p><Badge className={`${badge} border text-xs capitalize`}>{status}</Badge></div>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground">Answers</p>
              {Object.entries(s.answers || {}).map(([q, a]) => (
                <div key={q} className="bg-background rounded-lg p-3 border">
                  <p className="text-xs font-medium text-muted-foreground mb-1">{q}</p>
                  <p className="text-sm">{a || <span className="text-muted-foreground italic">No answer</span>}</p>
                </div>
              ))}
            </div>
            {status === "pending" && (
              <div className="space-y-2 pt-2 border-t">
                <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Review notes (optional, sent to applicant via DM)..." rows={2} className="text-sm" />
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => { setDeciding(true); onUpdate(s.id, "accepted", notes); }} disabled={deciding} className="bg-green-600 hover:bg-green-700 text-white flex-1 gap-1.5"><CheckCircle size={13} />Accept</Button>
                  <Button size="sm" onClick={() => { setDeciding(true); onUpdate(s.id, "rejected", notes); }} disabled={deciding} variant="outline" className="text-red-600 border-red-200 hover:bg-red-50 flex-1 gap-1.5"><X size={13} />Reject</Button>
                </div>
                <p className="text-xs text-muted-foreground text-center">The applicant will receive a DM with the decision and your notes.</p>
              </div>
            )}
            {s.reviewer_notes && <div className="bg-muted/30 rounded-lg p-3 border"><p className="text-xs font-medium text-muted-foreground mb-1">Review Notes</p><p className="text-sm">{s.reviewer_notes}</p></div>}
          </div>
        )}
      </div>
    );
  }

  export default function ApplicationsPage({ guildId }: { guildId: string }) {
    const [panels, setPanels] = useState<AppPanel[]>([]);
    const [submissions, setSubmissions] = useState<Submission[]>([]);
    const [isPremium, setIsPremium] = useState(false);
    const [loading, setLoading] = useState(true);
    const [editPanel, setEditPanel] = useState<Partial<AppPanel> | null>(null);
    const [saving, setSaving] = useState(false);
    const [tab, setTab] = useState("submissions");
    const [subFilter, setSubFilter] = useState("pending");

    const fetchAll = useCallback(async () => {
      setLoading(true);
      try {
        const [pRes, sRes, gRes] = await Promise.all([
          fetch(`/api/guilds/${guildId}/application-panels`, { credentials: "include" }),
          fetch(`/api/guilds/${guildId}/applications`, { credentials: "include" }),
          fetch(`/api/guilds/${guildId}`, { credentials: "include" }),
        ]);
        if (pRes.ok) setPanels(await pRes.json());
        if (sRes.ok) setSubmissions(await sRes.json());
        if (gRes.ok) { const g = await gRes.json(); setIsPremium(g.isPremium ?? false); }
      } catch {}
      setLoading(false);
    }, [guildId]);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    const canAddPanel = isPremium || panels.length < FREE_PANEL_LIMIT;
    const qLimit = isPremium ? 100 : FREE_QUESTION_LIMIT;

    const newPanel = (): Partial<AppPanel> => ({
      title: "", description: "", button_label: "Apply Now",
      questions: [], review_role_ids: [], review_channel_id: "", enabled: true,
    });

    const addQuestion = () => {
      if (!editPanel) return;
      const qs = editPanel.questions || [];
      if (qs.length >= qLimit) return;
      setEditPanel({ ...editPanel, questions: [...qs, { id: Date.now().toString(), text: "", type: "short", required: true }] });
    };

    const savePanel = async () => {
      if (!editPanel) return;
      setSaving(true);
      try {
        const method = editPanel.id ? "PUT" : "POST";
        const url = editPanel.id ? `/api/guilds/${guildId}/application-panels/${editPanel.id}` : `/api/guilds/${guildId}/application-panels`;
        const res = await fetch(url, {
          method, credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(editPanel),
        });
        if (res.ok) {
          setEditPanel(null);
          fetchAll();
        } else {
          const err = await res.json().catch(() => ({ error: "Request failed" }));
          alert(`Failed to save panel: ${err.error || res.statusText}`);
        }
      } catch (e: any) {
        alert(`Failed to save panel: ${e.message || "Network error"}`);
      }
      setSaving(false);
    };

    const deletePanel = async (id: string) => {
      if (!confirm("Delete this panel? All submissions will be lost.")) return;
      await fetch(`/api/guilds/${guildId}/application-panels/${id}`, { method: "DELETE", credentials: "include" });
      fetchAll();
    };

    const updateSubmission = async (id: string, status: string, notes: string) => {
      try {
        await fetch(`/api/guilds/${guildId}/applications/${id}/review`, {
          method: "POST", credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status, reviewerNotes: notes }),
        });
        fetchAll();
      } catch {}
    };

    const appLink = (panel: AppPanel) => `${window.location.origin}/portal/${guildId}/${panel.id}`;
    const pending = submissions.filter(s => s.status === "pending");
    const filteredSubs = subFilter === "all" ? submissions : submissions.filter(s => s.status === subFilter);

    return (
      <div className="space-y-5 max-w-4xl">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight flex items-center gap-2"><Inbox className="w-6 h-6" style={{ color: "#d4af37" }} />Applications</h2>
            <p className="text-muted-foreground mt-0.5 text-sm">{pending.length} pending reviews • {panels.length} panel{panels.length !== 1 ? "s" : ""} • applicants receive DMs on decision</p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchAll} className="gap-1.5"><RefreshCw size={13} />Refresh</Button>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="submissions">Submissions {pending.length > 0 && <Badge className="ml-1.5 text-[10px] px-1.5" style={{ background: "#d4af37", color: "#000" }}>{pending.length}</Badge>}</TabsTrigger>
            <TabsTrigger value="panels">Panels <span className="ml-1.5 text-xs text-muted-foreground">({panels.length})</span></TabsTrigger>
          </TabsList>

          <TabsContent value="submissions" className="mt-4 space-y-3">
            <div className="flex gap-2">
              {["pending","accepted","rejected","all"].map(s => (
                <Button key={s} size="sm" variant={subFilter === s ? "default" : "outline"} onClick={() => setSubFilter(s)} className="capitalize text-xs" style={subFilter === s ? { background: "#d4af37", color: "#000" } : {}}>{s}</Button>
              ))}
            </div>
            {loading ? <div className="flex justify-center py-12"><div className="w-7 h-7 rounded-full border-2 animate-spin" style={{ borderColor: "#d4af37", borderTopColor: "transparent" }} /></div>
              : filteredSubs.length === 0 ? <Card><CardContent className="py-12 text-center text-muted-foreground text-sm">No {subFilter === "all" ? "" : subFilter} submissions yet.</CardContent></Card>
              : filteredSubs.map(s => <SubmissionRow key={s.id} s={s} onUpdate={updateSubmission} />)}
          </TabsContent>

          <TabsContent value="panels" className="mt-4 space-y-3">
            {!canAddPanel && (
              <Card className="border-dashed border-yellow-300">
                <CardContent className="p-4 flex items-center gap-3">
                  <Lock size={18} style={{ color: "#d4af37" }} />
                  <div>
                    <p className="font-semibold text-sm">Free tier: 1 application panel</p>
                    <p className="text-xs text-muted-foreground">Upgrade to Premium for unlimited panels, unlimited questions, and more.</p>
                  </div>
                </CardContent>
              </Card>
            )}
            <div className="flex justify-end">
              <Button size="sm" disabled={!canAddPanel} onClick={() => setEditPanel(newPanel())} className="gap-1.5" style={{ background: "#d4af37", color: "#000" }}>
                <Plus size={13} />New Panel
              </Button>
            </div>
            {panels.length === 0 ? (
              <Card><CardContent className="py-12 text-center text-muted-foreground text-sm">No application panels yet. Create one to get started.</CardContent></Card>
            ) : panels.map(p => (
              <Card key={p.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-sm">{p.title || "Untitled Panel"}</h3>
                        <Badge className={p.enabled ? "bg-green-100 text-green-700 border-green-200 border text-xs" : "bg-gray-100 text-gray-500 border text-xs"}>{p.enabled ? "Active" : "Disabled"}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">{p.description || "No description"}</p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>{(p.questions || []).length} questions</span>
                        <span>•</span>
                        <span>{(p.questions || []).filter(q => q.type === 'choice').length} multiple choice</span>
                        <span>•</span>
                        <span>{p.submission_count || 0} submissions</span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-2 bg-muted/40 rounded-md px-2 py-1 w-fit">
                        <span className="text-xs text-muted-foreground truncate max-w-64">{appLink(p)}</span>
                        <button onClick={() => navigator.clipboard?.writeText(appLink(p))} className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"><Copy size={11} /></button>
                      </div>
                    </div>
                    <div className="flex gap-1.5 flex-shrink-0">
                      <Button size="sm" variant="outline" onClick={() => setEditPanel(p)} className="gap-1 text-xs h-8"><Settings size={12} />Edit</Button>
                      <Button size="sm" variant="outline" onClick={() => deletePanel(p.id)} className="text-red-500 border-red-200 hover:bg-red-50 h-8"><Trash2 size={12} /></Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>

        {/* Panel Editor Dialog */}
        <Dialog open={!!editPanel} onOpenChange={o => { if (!o) setEditPanel(null); }}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editPanel?.id ? "Edit Panel" : "New Application Panel"}</DialogTitle></DialogHeader>
            {editPanel && (
              <div className="space-y-4 pt-2">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2"><Label className="text-xs">Panel Title *</Label><Input value={editPanel.title || ""} onChange={e => setEditPanel(p => ({ ...p, title: e.target.value }))} placeholder="Staff Application 2026" className="h-9 text-sm mt-1" /></div>
                  <div className="col-span-2"><Label className="text-xs">Description</Label><Textarea value={editPanel.description || ""} onChange={e => setEditPanel(p => ({ ...p, description: e.target.value }))} placeholder="Brief description shown to applicants..." rows={2} className="text-sm mt-1" /></div>
                  <div><Label className="text-xs">Apply Button Label</Label><Input value={editPanel.button_label || "Apply Now"} onChange={e => setEditPanel(p => ({ ...p, button_label: e.target.value }))} className="h-9 text-sm mt-1" /></div>
                  <div className="flex items-center gap-2 mt-5"><Switch checked={editPanel.enabled !== false} onCheckedChange={v => setEditPanel(p => ({ ...p, enabled: v }))} /><Label className="text-sm">Panel Active</Label></div>
                </div>
                <div className="border-t pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <Label className="text-sm font-semibold">Questions</Label>
                      <p className="text-xs text-muted-foreground">{(editPanel.questions || []).length}/{isPremium ? "unlimited" : FREE_QUESTION_LIMIT} — supports short, long, and multiple-choice</p>
                    </div>
                    <Button size="sm" variant="outline" onClick={addQuestion} disabled={(editPanel.questions || []).length >= qLimit} className="gap-1 text-xs"><Plus size={12} />Add Question</Button>
                  </div>
                  <div className="space-y-2">
                    {(editPanel.questions || []).map((q, i) => (
                      <QEditor key={q.id} q={q} count={i + 1} isPremium={isPremium}
                        onChange={updated => setEditPanel(p => ({ ...p, questions: (p.questions || []).map((qq, ii) => ii === i ? updated : qq) }))}
                        onDelete={() => setEditPanel(p => ({ ...p, questions: (p.questions || []).filter((_, ii) => ii !== i) }))} />
                    ))}
                    {(editPanel.questions || []).length === 0 && <p className="text-xs text-muted-foreground text-center py-4">No questions yet. Add at least one question.</p>}
                  </div>
                </div>
                <div className="flex gap-2 pt-2 border-t">
                  <Button onClick={savePanel} disabled={saving || !editPanel.title?.trim()} style={{ background: "#d4af37", color: "#000" }} className="flex-1">{saving ? "Saving…" : editPanel.id ? "Save Changes" : "Create Panel"}</Button>
                  <Button variant="outline" onClick={() => setEditPanel(null)}>Cancel</Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    );
  }
