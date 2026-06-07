import { useState, useEffect, useCallback, useRef } from "react";
  import { Card, CardContent } from "@/components/ui/card";
  import { Button } from "@/components/ui/button";
  import { Badge } from "@/components/ui/badge";
  import { Input } from "@/components/ui/input";
  import { Label } from "@/components/ui/label";
  import { Textarea } from "@/components/ui/textarea";
  import { Switch } from "@/components/ui/switch";
  import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
  import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
  import {
    Plus, Trash2, RefreshCw, ChevronDown, ChevronUp, CheckCircle, X, Copy, Lock, Inbox,
    Settings, User, Loader2, ArrowLeft, Clock, Calendar, Star, Search, AlertTriangle,
    Zap, TrendingUp, Users, ClipboardList, Filter, Flag, CheckCheck, BarChart3, Shield
  } from "lucide-react";

  interface AppPanel {
    id: string; title: string; description: string; questions: Question[];
    button_label: string; review_role_ids: string[]; review_channel_id: string;
    enabled: boolean; created_at: string; submission_count?: number;
  }
  interface Question { id: string; text: string; type: "short"|"long"|"choice"; required: boolean; choices?: string[]; }
  interface Submission {
    id: string; panel_id: string; panel_title: string; user_id: string; username: string;
    answers: Record<string,string>; status: "pending"|"accepted"|"rejected"|"flagged";
    reviewer_id?: string; reviewer_username?: string; reviewer_notes?: string;
    created_at: string; reviewed_at?: string;
  }
  interface MemberInfo {
    username: string; globalName?: string; avatar?: string; joinedServer?: string;
    accountCreated?: string; nickname?: string; roles?: {id:string;name:string;color:number}[];
    isMember: boolean; premiumSince?: string;
  }

  const FREE_PANEL_LIMIT = 1;
  const FREE_QUESTION_LIMIT = 13;

  // ── Helpers ─────────────────────────────────────────────────────────────────
  function timeSince(iso: string) {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff/60000), h = Math.floor(m/60), d = Math.floor(h/24);
    if (d > 0) return `${d}d ago`;
    if (h > 0) return `${h}h ago`;
    if (m > 0) return `${m}m ago`;
    return "just now";
  }
  function accountAge(iso?: string|null) {
    if (!iso) return null;
    return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  }
  function discordCreated(userId: string) {
    try { return new Date(Number((BigInt(userId) >> 22n) + 1420070400000n)); } catch { return null; }
  }
  function copyText(t: string) { navigator.clipboard?.writeText(t).catch(()=>{}); }

  // ── MCQ-safe choices helper ──────────────────────────────────────────────────
  function useChoices(initial: string[] = []) {
    const [choices, setChoices] = useState<string[]>(initial);
    const [draft, setDraft] = useState("");
    useEffect(() => { setChoices(initial); }, [JSON.stringify(initial)]);
    const add = () => { const v = draft.trim(); if (v) { setChoices(c => [...c, v]); setDraft(""); } };
    const remove = (i: number) => setChoices(c => c.filter((_,ii) => ii !== i));
    const update = (i: number, v: string) => setChoices(c => c.map((cc,ii) => ii===i ? v : cc));
    return { choices, draft, setDraft, add, remove, update };
  }

  // ── QEditor ──────────────────────────────────────────────────────────────────
  function QEditor({ q, onChange, onDelete, count }: { q: Question; onChange:(q:Question)=>void; onDelete:()=>void; count:number; }) {
    const ch = useChoices(q.type === "choice" ? (q.choices || []) : []);

    // Sync choices up whenever they change
    useEffect(() => {
      if (q.type !== "choice") return;
      onChange({ ...q, choices: ch.choices });
    }, [JSON.stringify(ch.choices)]);

    const handleTypeChange = (v: string) => {
      if (v === "choice") onChange({ ...q, type: "choice", choices: ch.choices.length ? ch.choices : [] });
      else onChange({ ...q, type: v as any, choices: undefined });
    };

    return (
      <div className="border border-border rounded-lg p-3 space-y-2 bg-card">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold text-muted-foreground w-5">{count}.</span>
          <Input value={q.text} onChange={e => onChange({...q, text: e.target.value})}
            placeholder="Question text..." className="flex-1 min-w-32 h-8 text-sm" />
          <Select value={q.type} onValueChange={handleTypeChange}>
            <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="short">Short answer</SelectItem>
              <SelectItem value="long">Paragraph</SelectItem>
              <SelectItem value="choice">Multiple choice</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center gap-1">
            <Switch checked={q.required} onCheckedChange={v => onChange({...q, required: v})} className="scale-75" />
            <span className="text-xs text-muted-foreground">Req</span>
          </div>
          <Button size="sm" variant="ghost" onClick={onDelete} className="text-red-500 h-8 w-8 p-0"><Trash2 size={13}/></Button>
        </div>
        {q.type === "choice" && (
          <div className="pl-7 space-y-1.5">
            {ch.choices.map((c,i) => (
              <div key={i} className="flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground font-semibold w-5">{String.fromCharCode(65+i)}.</span>
                <Input value={c} onChange={e => ch.update(i, e.target.value)}
                  className="h-7 text-xs flex-1" placeholder={`Choice ${i+1}...`} />
                <Button size="sm" variant="ghost" onClick={() => ch.remove(i)} className="h-7 w-7 p-0 text-muted-foreground hover:text-red-500"><X size={11}/></Button>
              </div>
            ))}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground w-5 font-semibold">{String.fromCharCode(65+ch.choices.length)}.</span>
              <Input value={ch.draft} onChange={e => ch.setDraft(e.target.value)}
                onKeyDown={e => { if (e.key==="Enter") { e.preventDefault(); ch.add(); } }}
                placeholder="Type a choice and press Enter..." className="h-7 text-xs flex-1" />
              <Button size="sm" variant="outline" onClick={ch.add} disabled={!ch.draft.trim()} className="h-7 px-2 text-xs gap-1">
                <Plus size={11}/>Add
              </Button>
            </div>
            {ch.choices.length === 0 && <p className="text-xs text-red-400/80 pl-5">Add at least one choice</p>}
          </div>
        )}
      </div>
    );
  }

  // ── Member Info (on-demand fetch) ─────────────────────────────────────────────
  function MemberInfoCard({ guildId, userId }: { guildId:string; userId:string }) {
    const [info, setInfo] = useState<MemberInfo|null>(null);
    const [loading, setLoading] = useState(false);
    const [fetched, setFetched] = useState(false);
    const [err, setErr] = useState("");

    const load = async () => {
      setLoading(true); setErr("");
      try {
        const r = await fetch(`/api/guilds/${guildId}/members/${userId}/info`, { credentials:"include" });
        const d = await r.json();
        if (r.ok) setInfo(d); else setErr(d.error||"Failed");
      } catch { setErr("Network error"); }
      setLoading(false); setFetched(true);
    };

    const rc = (c:number) => c ? `#${c.toString(16).padStart(6,"0")}` : undefined;
    const created = discordCreated(userId);
    const age = accountAge(created?.toISOString());
    const newAccount = age !== null && age < 30;

    if (!fetched) return (
      <Button size="sm" variant="outline" onClick={load} className="gap-1.5 text-xs h-7 w-full justify-center">
        <User size={11}/> Fetch Discord Profile
      </Button>
    );
    if (loading) return <div className="flex items-center gap-2 text-xs text-muted-foreground py-2 justify-center"><Loader2 className="w-3 h-3 animate-spin"/>Loading from Discord...</div>;
    if (err) return <p className="text-xs text-red-500 py-1">{err}</p>;
    if (!info) return null;

    return (
      <div className="rounded-xl border bg-muted/20 p-3 space-y-3">
        <div className="flex items-center gap-2.5">
          {info.avatar ? <img src={info.avatar} alt="" className="w-9 h-9 rounded-full border border-border flex-shrink-0"/>
            : <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-sm font-bold flex-shrink-0">{info.username?.[0]?.toUpperCase()}</div>}
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-sm truncate">{info.globalName||info.username}</p>
            <p className="text-xs text-muted-foreground truncate">@{info.username}{info.nickname?<> · <em>"{info.nickname}"</em>:</>:""}</p>
          </div>
          <div className="flex flex-col items-end gap-1">
            {info.isMember ? <Badge className="text-[10px] bg-green-100 text-green-700 border-green-200 border">In Server</Badge>
              : <Badge className="text-[10px] bg-red-100 text-red-700 border-red-200 border">Left Server</Badge>}
            {info.premiumSince && <Badge className="text-[10px] bg-purple-100 text-purple-700 border-purple-200 border flex items-center gap-0.5"><Star size={8}/>Booster</Badge>}
          </div>
        </div>

        {newAccount && (
          <div className="flex items-center gap-1.5 rounded-lg bg-yellow-500/10 border border-yellow-500/20 px-2.5 py-1.5 text-xs text-yellow-600">
            <AlertTriangle size={11}/> <span>Account is only <strong>{age} days old</strong> — review carefully</span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
          {created && <>
            <span className="text-muted-foreground flex items-center gap-1"><Calendar size={10}/>Account created</span>
            <span className="font-medium">{created.toLocaleDateString()} <span className="text-muted-foreground">({age}d ago)</span></span>
          </>}
          {info.joinedServer && <>
            <span className="text-muted-foreground flex items-center gap-1"><Clock size={10}/>Joined server</span>
            <span className="font-medium">{new Date(info.joinedServer).toLocaleDateString()}</span>
          </>}
          {info.premiumSince && <>
            <span className="text-muted-foreground flex items-center gap-1"><Star size={10}/>Boosting since</span>
            <span className="font-medium">{new Date(info.premiumSince).toLocaleDateString()}</span>
          </>}
        </div>

        {info.roles && info.roles.length > 0 && (
          <div>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Roles ({info.roles.length})</p>
            <div className="flex flex-wrap gap-1">
              {info.roles.slice(0,12).map(r => (
                <span key={r.id} className="text-[10px] px-1.5 py-0.5 rounded-full border font-medium"
                  style={{ color: rc(r.color)||"inherit", borderColor: rc(r.color)?rc(r.color)+"40":undefined, background: rc(r.color)?rc(r.color)+"15":undefined }}>
                  {r.name}
                </span>
              ))}
              {info.roles.length>12 && <span className="text-[10px] text-muted-foreground px-1.5 py-0.5">+{info.roles.length-12} more</span>}
            </div>
          </div>
        )}
        <button onClick={() => copyText(userId)} className="text-[10px] text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
          <Copy size={9}/> Copy User ID: {userId}
        </button>
      </div>
    );
  }

  // ── Submission Detail Expanded ────────────────────────────────────────────────
  function SubmissionDetail({
    s, guildId, panelQuestions, onUpdate, onClose
  }: { s:Submission; guildId:string; panelQuestions:Question[]; onUpdate:(id:string,status:string,notes:string)=>Promise<void>; onClose:()=>void; }) {
    const [notes, setNotes] = useState(s.reviewer_notes||"");
    const [deciding, setDeciding] = useState(false);
    const [copied, setCopied] = useState(false);
    const pending = s.status === "pending" || s.status === "flagged";

    const badge: Record<string,string> = {
      pending: "bg-yellow-100 text-yellow-700 border-yellow-200",
      accepted: "bg-green-100 text-green-700 border-green-200",
      rejected: "bg-red-100 text-red-700 border-red-200",
      flagged: "bg-orange-100 text-orange-700 border-orange-200",
    };

    const doUpdate = async (status: string) => {
      setDeciding(true);
      await onUpdate(s.id, status, notes);
      setDeciding(false);
    };

    const copyAll = () => {
      const qs = panelQuestions.length ? panelQuestions : Object.keys(s.answers).map(k => ({id:k,text:k,type:"short" as const,required:false}));
      const text = qs.map((q,i) => `**Q${i+1}: ${q.text}**\n${s.answers[q.id]||s.answers[q.text]||"(no answer)"}`).join("\n\n");
      copyText(`📋 Application from ${s.username}\n\n${text}`);
      setCopied(true); setTimeout(()=>setCopied(false), 2000);
    };

    // Map answers using question id OR question text
    const getAnswer = (q: Question) => s.answers[q.id] || s.answers[q.text] || "";

    const elapsed = Math.floor((Date.now()-new Date(s.created_at).getTime())/3600000);

    return (
      <div className="border border-border rounded-xl overflow-hidden bg-card">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b bg-muted/20">
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors"><ArrowLeft size={15}/></button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm">{s.username}</span>
              <Badge className={`${badge[s.status]||badge.pending} border text-[10px] capitalize`}>{s.status}</Badge>
              {elapsed > 24 && s.status==="pending" && (
                <Badge className="bg-orange-100 text-orange-700 border-orange-200 border text-[10px] flex items-center gap-0.5">
                  <Clock size={9}/> {Math.floor(elapsed/24)}d pending
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">Submitted {new Date(s.created_at).toLocaleString()} · {timeSince(s.created_at)}</p>
          </div>
          <button onClick={copyAll} className="text-xs flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors border border-border rounded-md px-2 py-1">
            {copied ? <CheckCheck size={11} className="text-green-500"/> : <Copy size={11}/>} {copied?"Copied!":"Copy Q&A"}
          </button>
        </div>

        <div className="grid md:grid-cols-[1fr_280px] divide-y md:divide-y-0 md:divide-x divide-border">
          {/* Left: Q&A */}
          <div className="p-4 space-y-4">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <ClipboardList size={11}/> Application Answers
              </p>
              <div className="space-y-3">
                {panelQuestions.length > 0 ? panelQuestions.map((q,i) => (
                  <div key={q.id} className="space-y-1.5">
                    <div className="flex items-start gap-2">
                      <span className="text-[10px] font-bold text-muted-foreground mt-0.5 flex-shrink-0 w-5">{i+1}.</span>
                      <div className="flex-1">
                        <p className="text-xs font-semibold text-foreground/80 leading-snug">{q.text}{q.required && <span className="text-red-400 ml-0.5">*</span>}</p>
                        <div className="mt-1 bg-muted/30 rounded-lg px-3 py-2 border border-border/50 min-h-[32px]">
                          {getAnswer(q) ? (
                            <p className="text-sm whitespace-pre-wrap leading-relaxed">{getAnswer(q)}</p>
                          ) : (
                            <p className="text-xs text-muted-foreground italic">No answer provided</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )) : Object.entries(s.answers||{}).map(([k,v],i) => (
                  <div key={k} className="space-y-1">
                    <p className="text-xs font-semibold text-foreground/70">{k}</p>
                    <div className="bg-muted/30 rounded-lg px-3 py-2 border"><p className="text-sm whitespace-pre-wrap">{String(v)}</p></div>
                  </div>
                ))}
              </div>
            </div>

            {/* Timeline */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5"><Zap size={11}/>Timeline</p>
              <div className="flex items-center gap-2 text-xs">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-blue-400"/>
                  <span className="text-muted-foreground">Submitted</span>
                  <span className="font-medium">{new Date(s.created_at).toLocaleDateString()}</span>
                </div>
                <div className="flex-1 h-px bg-border"/>
                {s.reviewed_at ? (
                  <div className="flex items-center gap-1.5">
                    <div className={`w-2 h-2 rounded-full ${s.status==="accepted"?"bg-green-400":s.status==="rejected"?"bg-red-400":"bg-orange-400"}`}/>
                    <span className="text-muted-foreground">Reviewed</span>
                    <span className="font-medium">{new Date(s.reviewed_at).toLocaleDateString()}</span>
                    {s.reviewer_username && <span className="text-muted-foreground">by {s.reviewer_username}</span>}
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-muted border-2 border-muted-foreground/30 animate-pulse"/>
                    <span className="text-muted-foreground">Awaiting review</span>
                  </div>
                )}
              </div>
            </div>

            {s.reviewer_notes && (
              <div className="rounded-lg bg-muted/30 border p-3">
                <p className="text-xs font-semibold text-muted-foreground mb-1">Review Notes</p>
                <p className="text-sm">{s.reviewer_notes}</p>
              </div>
            )}
          </div>

          {/* Right: Actions + Member Info */}
          <div className="p-4 space-y-4">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5"><Shield size={11}/>Discord Profile</p>
              <MemberInfoCard guildId={guildId} userId={s.user_id}/>
            </div>

            {pending && (
              <div className="space-y-2.5">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5"><CheckCheck size={11}/>Decision</p>
                <Textarea value={notes} onChange={e=>setNotes(e.target.value)}
                  placeholder="Notes for applicant (optional, sent via DM)..." rows={3} className="text-xs resize-none"/>
                <div className="grid grid-cols-2 gap-2">
                  <Button size="sm" onClick={() => doUpdate("accepted")} disabled={deciding}
                    className="bg-green-600 hover:bg-green-700 text-white gap-1.5 font-semibold">
                    {deciding ? <Loader2 size={12} className="animate-spin"/> : <CheckCircle size={12}/>} Accept
                  </Button>
                  <Button size="sm" onClick={() => doUpdate("rejected")} disabled={deciding}
                    variant="outline" className="text-red-600 border-red-200 hover:bg-red-50 gap-1.5 font-semibold">
                    {deciding ? <Loader2 size={12} className="animate-spin"/> : <X size={12}/>} Reject
                  </Button>
                </div>
                <Button size="sm" onClick={() => doUpdate("flagged")} disabled={deciding}
                  variant="outline" className="w-full text-orange-600 border-orange-200 hover:bg-orange-50 gap-1.5 text-xs">
                  <Flag size={11}/> Flag for Further Review
                </Button>
                <p className="text-[10px] text-muted-foreground text-center">Applicant receives a DM with your decision and notes.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Panel Card (main view) ────────────────────────────────────────────────────
  function PanelCard({ p, submissions, onClick, onEdit, onDelete, appLink }: {
    p: AppPanel; submissions: Submission[]; onClick:()=>void;
    onEdit:()=>void; onDelete:()=>void; appLink:string;
  }) {
    const panelSubs = submissions.filter(s=>s.panel_id===p.id);
    const pending = panelSubs.filter(s=>s.status==="pending"||s.status==="flagged").length;
    const accepted = panelSubs.filter(s=>s.status==="accepted").length;
    const total = panelSubs.length;
    const rate = total>0 ? Math.round(accepted/total*100) : null;
    const oldest = panelSubs.filter(s=>s.status==="pending").sort((a,b)=>new Date(a.created_at).getTime()-new Date(b.created_at).getTime())[0];
    const oldestHours = oldest ? Math.floor((Date.now()-new Date(oldest.created_at).getTime())/3600000) : null;

    return (
      <Card className={`relative overflow-hidden transition-all hover:shadow-md cursor-pointer group ${pending>0?"ring-1 ring-[#d4af37]/30":""}`} onClick={onClick}>
        {pending > 0 && (
          <div className="absolute top-3 right-3 z-10">
            <div className="min-w-[22px] h-6 px-1.5 rounded-full flex items-center justify-center text-xs font-bold text-black"
              style={{ background: "linear-gradient(135deg,#d4af37,#f0c040)" }}>
              {pending}
            </div>
          </div>
        )}
        <CardContent className="p-4 space-y-3">
          <div className="flex items-start gap-2 pr-10">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                <h3 className="font-bold text-sm truncate">{p.title||"Untitled Panel"}</h3>
                <Badge className={`text-[10px] ${p.enabled?"bg-green-100 text-green-700 border-green-200":"bg-gray-100 text-gray-500 border"} border`}>{p.enabled?"Active":"Off"}</Badge>
              </div>
              {p.description && <p className="text-xs text-muted-foreground truncate">{p.description}</p>}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-muted/30 rounded-lg py-1.5">
              <p className="text-xs font-bold">{pending}</p>
              <p className="text-[10px] text-muted-foreground">Pending</p>
            </div>
            <div className="bg-muted/30 rounded-lg py-1.5">
              <p className="text-xs font-bold">{total}</p>
              <p className="text-[10px] text-muted-foreground">Total</p>
            </div>
            <div className="bg-muted/30 rounded-lg py-1.5">
              <p className="text-xs font-bold">{rate!==null?`${rate}%`:"—"}</p>
              <p className="text-[10px] text-muted-foreground">Accept rate</p>
            </div>
          </div>

          {oldestHours !== null && oldestHours > 48 && (
            <div className="flex items-center gap-1.5 text-[10px] text-orange-600 bg-orange-500/10 rounded-md px-2 py-1">
              <Clock size={9}/> Oldest pending: {Math.floor(oldestHours/24)}d {oldestHours%24}h — needs review
            </div>
          )}

          <div className="flex items-center gap-1.5 pt-1 border-t">
            <div className="flex items-center gap-1 bg-muted/30 rounded px-1.5 py-0.5 flex-1 min-w-0">
              <span className="text-[10px] text-muted-foreground truncate">{appLink}</span>
            </div>
            <button onClick={e=>{e.stopPropagation();copyText(appLink);}} className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"><Copy size={11}/></button>
            <button onClick={e=>{e.stopPropagation();onEdit();}} className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"><Settings size={11}/></button>
            <button onClick={e=>{e.stopPropagation();onDelete();}} className="text-red-400 hover:text-red-600 transition-colors flex-shrink-0"><Trash2 size={11}/></button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ── Main component ────────────────────────────────────────────────────────────
  export default function ApplicationsPage({ guildId }: { guildId: string }) {
    const [panels, setPanels] = useState<AppPanel[]>([]);
    const [submissions, setSubmissions] = useState<Submission[]>([]);
    const [isPremium, setIsPremium] = useState(false);
    const [loading, setLoading] = useState(true);
    const [editPanel, setEditPanel] = useState<Partial<AppPanel>|null>(null);
    const [saving, setSaving] = useState(false);
    const [selectedPanel, setSelectedPanel] = useState<AppPanel|null>(null);
    const [selectedSub, setSelectedSub] = useState<Submission|null>(null);
    const [subFilter, setSubFilter] = useState<string>("pending");
    const [search, setSearch] = useState("");
    const [reviewError, setReviewError] = useState("");

    const fetchAll = useCallback(async () => {
      setLoading(true);
      try {
        const [pRes, sRes, gRes] = await Promise.all([
          fetch(`/api/guilds/${guildId}/application-panels`, { credentials:"include" }),
          fetch(`/api/guilds/${guildId}/applications`, { credentials:"include" }),
          fetch(`/api/guilds/${guildId}`, { credentials:"include" }),
        ]);
        if (pRes.ok) setPanels(await pRes.json());
        if (sRes.ok) setSubmissions(await sRes.json());
        if (gRes.ok) { const g=await gRes.json(); setIsPremium(g.isPremium??false); }
      } catch {}
      setLoading(false);
    }, [guildId]);

    useEffect(()=>{ fetchAll(); }, [fetchAll]);

    const canAddPanel = isPremium || panels.length < FREE_PANEL_LIMIT;
    const qLimit = isPremium ? 100 : FREE_QUESTION_LIMIT;

    const newPanel = (): Partial<AppPanel> => ({
      title:"", description:"", button_label:"Apply Now", questions:[], review_role_ids:[], review_channel_id:"", enabled:true
    });

    const addQuestion = () => {
      if (!editPanel) return;
      const qs = editPanel.questions||[];
      if (qs.length>=qLimit) return;
      setEditPanel({...editPanel, questions:[...qs,{id:Date.now().toString(),text:"",type:"short",required:true}]});
    };

    const savePanel = async () => {
      if (!editPanel) return;
      setSaving(true);
      try {
        const method = editPanel.id?"PUT":"POST";
        const url = editPanel.id?`/api/guilds/${guildId}/application-panels/${editPanel.id}`:`/api/guilds/${guildId}/application-panels`;
        const res = await fetch(url,{method,credentials:"include",headers:{"Content-Type":"application/json"},body:JSON.stringify(editPanel)});
        if (res.ok) { setEditPanel(null); fetchAll(); }
        else { const e=await res.json().catch(()=>({})); alert(`Save failed: ${e.error||res.statusText}`); }
      } catch(e:any) { alert(`Save failed: ${e.message}`); }
      setSaving(false);
    };

    const deletePanel = async (id:string) => {
      if (!confirm("Delete this panel? All submissions will also be deleted.")) return;
      await fetch(`/api/guilds/${guildId}/application-panels/${id}`,{method:"DELETE",credentials:"include"});
      if (selectedPanel?.id===id) setSelectedPanel(null);
      fetchAll();
    };

    const updateSubmission = async (id:string, status:string, notes:string) => {
      setReviewError("");
      try {
        const r = await fetch(`/api/guilds/${guildId}/applications/${id}/review`,{
          method:"POST",credentials:"include",headers:{"Content-Type":"application/json"},
          body:JSON.stringify({status,reviewerNotes:notes})
        });
        if (!r.ok) { const d=await r.json().catch(()=>({})); setReviewError(d.error||r.statusText); return; }
      } catch(e:any) { setReviewError(e.message); return; }
      setSelectedSub(null);
      await fetchAll();
    };

    const appLink = (p:AppPanel) => `${window.location.origin}/portal/${guildId}/${p.id}`;

    // Filtered submissions for selected panel
    const panelSubs = selectedPanel ? submissions.filter(s=>s.panel_id===selectedPanel.id) : [];
    const filteredSubs = panelSubs.filter(s => {
      if (subFilter!=="all" && s.status!==subFilter) return false;
      if (search) { const q=search.toLowerCase(); return s.username.toLowerCase().includes(q)||Object.values(s.answers||{}).some(a=>String(a).toLowerCase().includes(q)); }
      return true;
    }).sort((a,b)=>new Date(b.created_at).getTime()-new Date(a.created_at).getTime());

    const pendingAll = submissions.filter(s=>s.status==="pending"||s.status==="flagged").length;

    // Global stats
    const accepted = submissions.filter(s=>s.status==="accepted").length;
    const rejected = submissions.filter(s=>s.status==="rejected").length;

    // Panel questions for selected panel
    const panelQuestions = selectedPanel?.questions || [];

    return (
      <div className="space-y-5 max-w-5xl">
        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight flex items-center gap-2">
              <Inbox className="w-6 h-6" style={{color:"#d4af37"}}/>
              Applications
              {pendingAll>0 && <span className="text-sm font-bold px-2.5 py-0.5 rounded-full text-black" style={{background:"linear-gradient(135deg,#d4af37,#f0c040)"}}>{pendingAll}</span>}
            </h2>
            <p className="text-muted-foreground mt-0.5 text-sm">{panels.length} panels · {submissions.length} total submissions · {accepted} accepted · {rejected} rejected</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchAll} className="gap-1.5"><RefreshCw size={13}/>Refresh</Button>
            <Button size="sm" disabled={!canAddPanel} onClick={()=>setEditPanel(newPanel())} className="gap-1.5" style={{background:"#d4af37",color:"#000"}}>
              <Plus size={13}/>New Panel
            </Button>
          </div>
        </div>

        {reviewError && (
          <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2.5 text-red-500 text-sm">
            <AlertTriangle size={14}/> Review failed: {reviewError}
            <button onClick={()=>setReviewError("")} className="ml-auto"><X size={14}/></button>
          </div>
        )}

        {!canAddPanel && (
          <Card className="border-dashed border-yellow-300">
            <CardContent className="p-3 flex items-center gap-3">
              <Lock size={16} style={{color:"#d4af37"}}/>
              <div><p className="font-semibold text-sm">Free tier: 1 panel</p>
              <p className="text-xs text-muted-foreground">Upgrade to Premium for unlimited panels.</p></div>
            </CardContent>
          </Card>
        )}

        {/* PANEL GRID (main view — no panel selected) */}
        {!selectedPanel && !selectedSub && (
          <>
            {loading ? (
              <div className="flex justify-center py-16"><div className="w-7 h-7 rounded-full border-2 animate-spin" style={{borderColor:"#d4af37",borderTopColor:"transparent"}}/></div>
            ) : panels.length===0 ? (
              <Card><CardContent className="py-16 text-center text-muted-foreground text-sm">
                No panels yet. Create one to get started.
              </CardContent></Card>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {panels.map(p=>(
                  <PanelCard key={p.id} p={p} submissions={submissions}
                    onClick={()=>{ setSelectedPanel(p); setSubFilter("pending"); setSearch(""); }}
                    onEdit={()=>setEditPanel(p)} onDelete={()=>deletePanel(p.id)} appLink={appLink(p)}/>
                ))}
              </div>
            )}
          </>
        )}

        {/* PANEL SUBMISSIONS VIEW */}
        {selectedPanel && !selectedSub && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <button onClick={()=>setSelectedPanel(null)} className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5 text-sm">
                <ArrowLeft size={14}/> All Panels
              </button>
              <span className="text-muted-foreground">/</span>
              <h3 className="font-bold">{selectedPanel.title}</h3>
              <Badge className={`text-[10px] ${selectedPanel.enabled?"bg-green-100 text-green-700 border-green-200":"bg-gray-100 text-gray-500 border"} border`}>{selectedPanel.enabled?"Active":"Off"}</Badge>
            </div>

            {/* Filter + Search */}
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground"/>
                <Input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by username or answer..."
                  className="pl-8 h-8 text-sm"/>
              </div>
              <div className="flex gap-1.5">
                {["pending","accepted","rejected","flagged","all"].map(f=>{
                  const cnt = f==="all" ? panelSubs.length : panelSubs.filter(s=>s.status===f||(f==="pending"&&s.status==="flagged"&&false)).length;
                  return (
                    <Button key={f} size="sm" variant={subFilter===f?"default":"outline"} onClick={()=>setSubFilter(f)}
                      className="capitalize text-xs h-8" style={subFilter===f?{background:"#d4af37",color:"#000"}:{}}>
                      {f} {cnt>0&&<span className="ml-1 text-[10px] opacity-70">({cnt})</span>}
                    </Button>
                  );
                })}
              </div>
            </div>

            {filteredSubs.length===0 ? (
              <Card><CardContent className="py-12 text-center text-muted-foreground text-sm">No {subFilter==="all"?"":subFilter} submissions.</CardContent></Card>
            ) : (
              <div className="space-y-2">
                {filteredSubs.map(s=>{
                  const badge2: Record<string,string> = {
                    pending:"bg-yellow-100 text-yellow-700 border-yellow-200",
                    accepted:"bg-green-100 text-green-700 border-green-200",
                    rejected:"bg-red-100 text-red-700 border-red-200",
                    flagged:"bg-orange-100 text-orange-700 border-orange-200",
                  };
                  const elapsed2 = Math.floor((Date.now()-new Date(s.created_at).getTime())/3600000);
                  return (
                    <button key={s.id} onClick={()=>setSelectedSub(s)}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-border hover:bg-muted/30 transition-colors text-left">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm">{s.username}</span>
                          <Badge className={`${badge2[s.status]||badge2.pending} border text-[10px] capitalize`}>{s.status}</Badge>
                          {elapsed2>48&&s.status==="pending"&&<Badge className="bg-orange-100 text-orange-700 border-orange-200 border text-[10px]"><Clock size={9} className="mr-0.5"/>{Math.floor(elapsed2/24)}d pending</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{timeSince(s.created_at)} · {Object.keys(s.answers||{}).length} answers</p>
                      </div>
                      <ChevronDown size={14} className="text-muted-foreground flex-shrink-0 -rotate-90"/>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* SUBMISSION DETAIL */}
        {selectedPanel && selectedSub && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <button onClick={()=>setSelectedPanel(null)} className="hover:text-foreground transition-colors flex items-center gap-1"><ArrowLeft size={13}/> Panels</button>
              <span>/</span>
              <button onClick={()=>setSelectedSub(null)} className="hover:text-foreground transition-colors">{selectedPanel.title}</button>
              <span>/</span>
              <span className="text-foreground font-medium">{selectedSub.username}</span>
            </div>
            <SubmissionDetail s={selectedSub} guildId={guildId} panelQuestions={panelQuestions}
              onUpdate={updateSubmission} onClose={()=>setSelectedSub(null)}/>
          </div>
        )}

        {/* Panel Editor Dialog */}
        <Dialog open={!!editPanel} onOpenChange={o=>{ if(!o) setEditPanel(null); }}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editPanel?.id?"Edit Panel":"New Application Panel"}</DialogTitle></DialogHeader>
            {editPanel && (
              <div className="space-y-4 pt-2">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label className="text-xs">Panel Title *</Label>
                    <Input value={editPanel.title||""} onChange={e=>setEditPanel(p=>({...p,title:e.target.value}))} placeholder="Staff Application 2026" className="h-9 text-sm mt-1"/>
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs">Description</Label>
                    <Textarea value={editPanel.description||""} onChange={e=>setEditPanel(p=>({...p,description:e.target.value}))} placeholder="Brief description shown to applicants..." rows={2} className="text-sm mt-1"/>
                  </div>
                  <div>
                    <Label className="text-xs">Apply Button Label</Label>
                    <Input value={editPanel.button_label||"Apply Now"} onChange={e=>setEditPanel(p=>({...p,button_label:e.target.value}))} className="h-9 text-sm mt-1"/>
                  </div>
                  <div className="flex items-center gap-2 mt-5">
                    <Switch checked={editPanel.enabled!==false} onCheckedChange={v=>setEditPanel(p=>({...p,enabled:v}))}/>
                    <Label className="text-sm">Panel Active</Label>
                  </div>
                </div>
                <div className="border-t pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <Label className="text-sm font-semibold">Questions</Label>
                      <p className="text-xs text-muted-foreground">{(editPanel.questions||[]).length}/{isPremium?"unlimited":FREE_QUESTION_LIMIT}</p>
                    </div>
                    <Button size="sm" variant="outline" onClick={addQuestion} disabled={(editPanel.questions||[]).length>=qLimit} className="gap-1 text-xs"><Plus size={12}/>Add Question</Button>
                  </div>
                  <div className="space-y-2">
                    {(editPanel.questions||[]).map((q,i)=>(
                      <QEditor key={q.id} q={q} count={i+1} isPremium={isPremium}
                        onChange={updated=>setEditPanel(p=>({...p,questions:(p.questions||[]).map((qq,ii)=>ii===i?updated:qq)}))}
                        onDelete={()=>setEditPanel(p=>({...p,questions:(p.questions||[]).filter((_,ii)=>ii!==i)}))}/>
                    ))}
                    {(editPanel.questions||[]).length===0&&<p className="text-xs text-muted-foreground text-center py-4">No questions yet.</p>}
                  </div>
                </div>
                <div className="flex gap-2 pt-2 border-t">
                  <Button onClick={savePanel} disabled={saving||!editPanel.title?.trim()} style={{background:"#d4af37",color:"#000"}} className="flex-1">
                    {saving?"Saving…":editPanel.id?"Save Changes":"Create Panel"}
                  </Button>
                  <Button variant="outline" onClick={()=>setEditPanel(null)}>Cancel</Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    );
  }