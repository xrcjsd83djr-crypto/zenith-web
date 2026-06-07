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
  import { Checkbox } from "@/components/ui/checkbox";
  import {
    Plus, Trash2, RefreshCw, CheckCircle, X, Copy, Lock, Inbox,
    Settings, User, Loader2, ArrowLeft, Clock, Calendar, Star,
    Search, AlertTriangle, Zap, ClipboardList, Flag, CheckCheck,
    Layers, Send, Eye, ChevronDown, Sparkles, Hash
  } from "lucide-react";

  // ── Types ─────────────────────────────────────────────────────────────────────
  interface AppPanel {
    id: string; title: string; description: string; questions: Question[];
    button_label: string; review_role_ids: string[]; review_channel_id: string;
    enabled: boolean; created_at: string;
  }
  interface AppHub {
    id: string; guild_id: string; title: string; description: string;
    embed_color: string; panel_ids: string[]; channel_id: string; footer_text: string;
    created_at: string;
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

  // ── Helpers ───────────────────────────────────────────────────────────────────
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

  // ── MCQ choices helper ────────────────────────────────────────────────────────
  function useChoices(initial: string[] = []) {
    const [choices, setChoices] = useState<string[]>(initial);
    const [draft, setDraft] = useState("");
    const key = JSON.stringify(initial);
    useEffect(() => { setChoices(initial); }, [key]);
    const add = () => { const v = draft.trim(); if (v) { setChoices(c => [...c, v]); setDraft(""); } };
    const remove = (i: number) => setChoices(c => c.filter((_,ii) => ii !== i));
    const update = (i: number, v: string) => setChoices(c => c.map((cc,ii) => ii===i ? v : cc));
    return { choices, draft, setDraft, add, remove, update };
  }

  // ── QEditor ───────────────────────────────────────────────────────────────────
  function QEditor({ q, onChange, onDelete, count }: { q: Question; onChange:(q:Question)=>void; onDelete:()=>void; count:number; }) {
    const ch = useChoices(q.type === "choice" ? (q.choices || []) : []);
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
                <Input value={c} onChange={e => ch.update(i, e.target.value)} className="h-7 text-xs flex-1" placeholder={`Choice ${i+1}...`} />
                <Button size="sm" variant="ghost" onClick={() => ch.remove(i)} className="h-7 w-7 p-0 text-muted-foreground hover:text-red-500"><X size={11}/></Button>
              </div>
            ))}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground w-5 font-semibold">{String.fromCharCode(65+ch.choices.length)}.</span>
              <Input value={ch.draft} onChange={e => ch.setDraft(e.target.value)}
                onKeyDown={e => { if (e.key==="Enter") { e.preventDefault(); ch.add(); } }}
                placeholder="Type a choice and press Enter..." className="h-7 text-xs flex-1" />
              <Button size="sm" variant="outline" onClick={ch.add} disabled={!ch.draft.trim()} className="h-7 px-2 text-xs gap-1"><Plus size={11}/>Add</Button>
            </div>
            {ch.choices.length === 0 && <p className="text-xs text-red-400/80 pl-5">Add at least one choice</p>}
          </div>
        )}
      </div>
    );
  }

  // ── Member Info Card ──────────────────────────────────────────────────────────
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
    if (loading) return <div className="flex items-center gap-2 text-xs text-muted-foreground py-2 justify-center"><Loader2 className="w-3 h-3 animate-spin"/>Loading...</div>;
    if (err) return <p className="text-xs text-red-500 py-1">{err}</p>;
    if (!info) return null;
    return (
      <div className="rounded-xl border bg-muted/20 p-3 space-y-3">
        <div className="flex items-center gap-2.5">
          {info.avatar ? <img src={info.avatar} alt="" className="w-9 h-9 rounded-full border flex-shrink-0"/>
            : <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-sm font-bold flex-shrink-0">{info.username?.[0]?.toUpperCase()}</div>}
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-sm truncate">{info.globalName||info.username}</p>
            <p className="text-xs text-muted-foreground">@{info.username}</p>
          </div>
          <div className="flex flex-col items-end gap-1">
            {info.isMember ? <Badge className="text-[10px] bg-green-100 text-green-700 border-green-200 border">In Server</Badge>
              : <Badge className="text-[10px] bg-red-100 text-red-700 border-red-200 border">Left</Badge>}
            {info.premiumSince && <Badge className="text-[10px] bg-purple-100 text-purple-700 border-purple-200 border"><Star size={8}/>Booster</Badge>}
          </div>
        </div>
        {newAccount && (
          <div className="flex items-center gap-1.5 rounded-lg bg-yellow-500/10 border border-yellow-500/20 px-2.5 py-1.5 text-xs text-yellow-600">
            <AlertTriangle size={11}/> Account only <strong>{age} days old</strong> — review carefully
          </div>
        )}
        <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
          {created && <><span className="text-muted-foreground flex items-center gap-1"><Calendar size={10}/>Created</span><span>{created.toLocaleDateString()} ({age}d)</span></>}
          {info.joinedServer && <><span className="text-muted-foreground flex items-center gap-1"><Clock size={10}/>Joined</span><span>{new Date(info.joinedServer).toLocaleDateString()}</span></>}
        </div>
        {info.roles && info.roles.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {info.roles.slice(0,10).map(r => (
              <span key={r.id} className="text-[10px] px-1.5 py-0.5 rounded-full border font-medium"
                style={{ color: rc(r.color)||"inherit", borderColor: rc(r.color)?rc(r.color)+"40":undefined, background: rc(r.color)?rc(r.color)+"15":undefined }}>
                {r.name}
              </span>
            ))}
            {info.roles.length>10 && <span className="text-[10px] text-muted-foreground">+{info.roles.length-10}</span>}
          </div>
        )}
        <button onClick={() => copyText(userId)} className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1">
          <Copy size={9}/> {userId}
        </button>
      </div>
    );
  }

  // ── Submission Detail ─────────────────────────────────────────────────────────
  function SubmissionDetail({ s, guildId, panelQuestions, onUpdate, onClose }: {
    s:Submission; guildId:string; panelQuestions:Question[];
    onUpdate:(id:string,status:string,notes:string)=>Promise<void>; onClose:()=>void;
  }) {
    const [notes, setNotes] = useState(s.reviewer_notes||"");
    const [deciding, setDeciding] = useState(false);
    const [copied, setCopied] = useState(false);
    const pending = s.status === "pending" || s.status === "flagged";
    const badge: Record<string,string> = {
      pending:"bg-yellow-100 text-yellow-700 border-yellow-200",
      accepted:"bg-green-100 text-green-700 border-green-200",
      rejected:"bg-red-100 text-red-700 border-red-200",
      flagged:"bg-orange-100 text-orange-700 border-orange-200",
    };
    const doUpdate = async (status: string) => { setDeciding(true); await onUpdate(s.id, status, notes); setDeciding(false); };
    const copyAll = () => {
      const qs = panelQuestions.length ? panelQuestions : Object.keys(s.answers).map(k=>({id:k,text:k,type:"short" as const,required:false}));
      const text = qs.map((q,i) => `**Q${i+1}: ${q.text}**\n${s.answers[q.id]||s.answers[q.text]||"(no answer)"}`).join("\n\n");
      copyText(`📋 Application from ${s.username}\n\n${text}`);
      setCopied(true); setTimeout(()=>setCopied(false),2000);
    };
    const getAnswer = (q: Question) => s.answers[q.id] || s.answers[q.text] || "";
    const elapsed = Math.floor((Date.now()-new Date(s.created_at).getTime())/3600000);
    return (
      <div className="border border-border rounded-xl overflow-hidden bg-card">
        <div className="flex items-center gap-3 px-4 py-3 border-b bg-muted/20">
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><ArrowLeft size={15}/></button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm">{s.username}</span>
              <Badge className={`${badge[s.status]||badge.pending} border text-[10px] capitalize`}>{s.status}</Badge>
              {elapsed>24&&s.status==="pending"&&<Badge className="bg-orange-100 text-orange-700 border-orange-200 border text-[10px]"><Clock size={9} className="mr-0.5"/>{Math.floor(elapsed/24)}d</Badge>}
            </div>
            <p className="text-xs text-muted-foreground">{new Date(s.created_at).toLocaleString()} · {timeSince(s.created_at)}</p>
          </div>
          <button onClick={copyAll} className="text-xs flex items-center gap-1 text-muted-foreground hover:text-foreground border rounded-md px-2 py-1">
            {copied?<CheckCheck size={11} className="text-green-500"/>:<Copy size={11}/>}{copied?"Copied!":"Copy Q&A"}
          </button>
        </div>
        <div className="grid md:grid-cols-[1fr_280px] divide-y md:divide-y-0 md:divide-x divide-border">
          <div className="p-4 space-y-4">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5"><ClipboardList size={11}/>Application Answers</p>
              <div className="space-y-3">
                {panelQuestions.length > 0 ? panelQuestions.map((q,i) => (
                  <div key={q.id} className="space-y-1.5">
                    <div className="flex items-start gap-2">
                      <span className="text-[10px] font-bold text-muted-foreground mt-0.5 flex-shrink-0 w-5">{i+1}.</span>
                      <div className="flex-1">
                        <p className="text-xs font-semibold text-foreground/80 leading-snug">{q.text}{q.required&&<span className="text-red-400 ml-0.5">*</span>}</p>
                        <div className="mt-1 bg-muted/30 rounded-lg px-3 py-2 border border-border/50 min-h-[32px]">
                          {getAnswer(q)?<p className="text-sm whitespace-pre-wrap">{getAnswer(q)}</p>:<p className="text-xs text-muted-foreground italic">No answer</p>}
                        </div>
                      </div>
                    </div>
                  </div>
                )) : Object.entries(s.answers||{}).map(([k,v]) => (
                  <div key={k}>
                    <p className="text-xs font-semibold text-foreground/70 mb-1">{k}</p>
                    <div className="bg-muted/30 rounded-lg px-3 py-2 border"><p className="text-sm whitespace-pre-wrap">{String(v)}</p></div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5"><Zap size={11}/>Timeline</p>
              <div className="flex items-center gap-2 text-xs flex-wrap">
                <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-blue-400"/><span className="text-muted-foreground">Submitted</span><span className="font-medium">{new Date(s.created_at).toLocaleDateString()}</span></div>
                <div className="flex-1 h-px bg-border min-w-4"/>
                {s.reviewed_at?<div className="flex items-center gap-1.5"><div className={`w-2 h-2 rounded-full ${s.status==="accepted"?"bg-green-400":s.status==="rejected"?"bg-red-400":"bg-orange-400"}`}/><span className="text-muted-foreground">Reviewed</span><span className="font-medium">{new Date(s.reviewed_at).toLocaleDateString()}</span>{s.reviewer_username&&<span className="text-muted-foreground">by {s.reviewer_username}</span>}</div>
                :<div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-muted border-2 animate-pulse"/><span className="text-muted-foreground">Awaiting review</span></div>}
              </div>
            </div>
          </div>
          <div className="p-4 space-y-4">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5"><User size={11}/>Discord Profile</p>
              <MemberInfoCard guildId={guildId} userId={s.user_id}/>
            </div>
            {pending && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5"><CheckCheck size={11}/>Decision</p>
                <Textarea value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Notes for applicant (sent via DM)..." rows={3} className="text-xs resize-none"/>
                <div className="grid grid-cols-2 gap-2">
                  <Button size="sm" onClick={()=>doUpdate("accepted")} disabled={deciding} className="bg-green-600 hover:bg-green-700 text-white gap-1.5">
                    {deciding?<Loader2 size={12} className="animate-spin"/>:<CheckCircle size={12}/>}Accept
                  </Button>
                  <Button size="sm" onClick={()=>doUpdate("rejected")} disabled={deciding} variant="outline" className="text-red-600 border-red-200 hover:bg-red-50 gap-1.5">
                    {deciding?<Loader2 size={12} className="animate-spin"/>:<X size={12}/>}Reject
                  </Button>
                </div>
                <Button size="sm" onClick={()=>doUpdate("flagged")} disabled={deciding} variant="outline" className="w-full text-orange-600 border-orange-200 hover:bg-orange-50 gap-1.5 text-xs">
                  <Flag size={11}/>Flag for Further Review
                </Button>
                <p className="text-[10px] text-muted-foreground text-center">Applicant gets a Discord DM with decision + notes.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Hub Discord Preview ───────────────────────────────────────────────────────
  function HubDiscordPreview({ hub, panels }: { hub: Partial<AppHub>; panels: AppPanel[] }) {
    const selectedPanels = (hub.panel_ids || []).map(id => panels.find(p => p.id === id)).filter(Boolean) as AppPanel[];
    return (
      <div className="rounded-lg bg-[#2b2d31] p-3 font-sans text-sm" style={{fontFamily:"Whitney,Helvetica Neue,Helvetica,Arial,sans-serif"}}>
        <div className="flex gap-2">
          <div className="w-10 h-10 rounded-full flex-shrink-0" style={{background:"linear-gradient(135deg,#d4af37,#f0c040)",display:"flex",alignItems:"center",justifyContent:"center"}}>
            <span className="text-black font-black text-lg">Z</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1 mb-1"><span className="text-white font-semibold text-sm">Zenith Bot</span><span className="text-[10px] bg-[#5865f2] text-white rounded px-1 py-px">BOT</span></div>
            <div className="rounded-lg overflow-hidden border-l-4" style={{borderColor:hub.embed_color||"#d4af37",background:"#2f3136"}}>
              <div className="p-3 space-y-1.5">
                {hub.title && <p className="text-white font-bold text-sm">{hub.title}</p>}
                {hub.description && <p className="text-[#dcddde] text-xs leading-relaxed">{hub.description}</p>}
              </div>
              {hub.footer_text && <p className="text-[#72767d] text-[10px] px-3 pb-2">{hub.footer_text}</p>}
            </div>
            {selectedPanels.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {selectedPanels.map(p => (
                  <div key={p.id} className="bg-[#4f545c] hover:bg-[#686d73] rounded px-3 py-1.5 text-white text-xs font-medium cursor-pointer transition-colors">
                    🔗 {p.button_label || p.title}
                  </div>
                ))}
              </div>
            )}
            {selectedPanels.length === 0 && (
              <div className="mt-2 flex gap-1.5">
                <div className="bg-[#4f545c] rounded px-3 py-1.5 text-[#72767d] text-xs">🔗 Select panels below to add buttons</div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Hub Card ──────────────────────────────────────────────────────────────────
  function HubCard({ hub, panels, onEdit, onDelete, onPost, posting }: {
    hub: AppHub; panels: AppPanel[]; onEdit:()=>void; onDelete:()=>void; onPost:()=>void; posting: boolean;
  }) {
    const hubPanels = (hub.panel_ids||[]).map(id=>panels.find(p=>p.id===id)).filter(Boolean) as AppPanel[];
    return (
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-3 h-10 rounded-full flex-shrink-0 mt-0.5" style={{background:hub.embed_color||"#d4af37"}}/>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-sm">{hub.title}</h3>
              {hub.description && <p className="text-xs text-muted-foreground truncate">{hub.description}</p>}
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {hubPanels.length > 0 ? hubPanels.map(p => (
              <Badge key={p.id} className="text-[10px] bg-muted text-foreground border">{p.button_label||p.title}</Badge>
            )) : <span className="text-xs text-muted-foreground italic">No panels selected</span>}
          </div>
          {hub.channel_id && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Hash size={10}/> Channel: {hub.channel_id}
            </div>
          )}
          <div className="flex items-center gap-2 pt-1 border-t">
            <Button size="sm" onClick={onPost} disabled={posting||!hub.channel_id||!hub.panel_ids?.length}
              style={{background:"#5865F2",color:"#fff"}} className="gap-1.5 text-xs flex-1">
              {posting?<Loader2 size={11} className="animate-spin"/>:<Send size={11}/>}Post to Discord
            </Button>
            <Button size="sm" variant="outline" onClick={onEdit} className="gap-1 text-xs h-8"><Settings size={11}/></Button>
            <Button size="sm" variant="ghost" onClick={onDelete} className="text-red-400 hover:text-red-600 h-8 w-8 p-0"><Trash2 size={11}/></Button>
          </div>
          {!hub.channel_id && <p className="text-[10px] text-muted-foreground">Add a channel ID to enable posting.</p>}
        </CardContent>
      </Card>
    );
  }

  // ── Main Component ────────────────────────────────────────────────────────────
  export default function ApplicationsPage({ guildId }: { guildId: string }) {
    const [panels, setPanels] = useState<AppPanel[]>([]);
    const [hubs, setHubs] = useState<AppHub[]>([]);
    const [submissions, setSubmissions] = useState<Submission[]>([]);
    const [isPremium, setIsPremium] = useState(false);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState<"panels"|"hubs">("panels");
    const [editPanel, setEditPanel] = useState<Partial<AppPanel>|null>(null);
    const [editHub, setEditHub] = useState<Partial<AppHub>|null>(null);
    const [saving, setSaving] = useState(false);
    const [postingHubId, setPostingHubId] = useState<string|null>(null);
    const [postResult, setPostResult] = useState<{ok:boolean;msg:string}|null>(null);
    const [selectedPanel, setSelectedPanel] = useState<AppPanel|null>(null);
    const [selectedSub, setSelectedSub] = useState<Submission|null>(null);
    const [subFilter, setSubFilter] = useState("pending");
    const [search, setSearch] = useState("");
    const [reviewError, setReviewError] = useState("");

    const fetchAll = useCallback(async () => {
      setLoading(true);
      try {
        const [pRes, sRes, hRes, gRes] = await Promise.all([
          fetch(`/api/guilds/${guildId}/application-panels`, {credentials:"include"}),
          fetch(`/api/guilds/${guildId}/applications`, {credentials:"include"}),
          fetch(`/api/guilds/${guildId}/application-hubs`, {credentials:"include"}),
          fetch(`/api/guilds/${guildId}`, {credentials:"include"}),
        ]);
        if (pRes.ok) setPanels(await pRes.json());
        if (sRes.ok) setSubmissions(await sRes.json());
        if (hRes.ok) setHubs(await hRes.json());
        if (gRes.ok) { const g=await gRes.json(); setIsPremium(g.isPremium??false); }
      } catch {}
      setLoading(false);
    }, [guildId]);

    useEffect(()=>{ fetchAll(); },[fetchAll]);

    const canAddPanel = isPremium || panels.length < FREE_PANEL_LIMIT;
    const qLimit = isPremium ? 100 : FREE_QUESTION_LIMIT;

    const newPanel = (): Partial<AppPanel> => ({
      title:"", description:"", button_label:"Apply Now", questions:[], review_role_ids:[], review_channel_id:"", enabled:true
    });
    const newHub = (): Partial<AppHub> => ({
      title:"Apply for Staff", description:"", embed_color:"#d4af37", panel_ids:[], channel_id:"", footer_text:""
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

    const saveHub = async () => {
      if (!editHub) return;
      setSaving(true);
      try {
        const method = editHub.id?"PUT":"POST";
        const url = editHub.id?`/api/guilds/${guildId}/application-hubs/${editHub.id}`:`/api/guilds/${guildId}/application-hubs`;
        const res = await fetch(url,{method,credentials:"include",headers:{"Content-Type":"application/json"},body:JSON.stringify(editHub)});
        if (res.ok) { setEditHub(null); fetchAll(); }
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

    const deleteHub = async (id:string) => {
      if (!confirm("Delete this hub?")) return;
      await fetch(`/api/guilds/${guildId}/application-hubs/${id}`,{method:"DELETE",credentials:"include"});
      fetchAll();
    };

    const postHub = async (hub: AppHub) => {
      setPostingHubId(hub.id); setPostResult(null);
      try {
        const r = await fetch(`/api/guilds/${guildId}/application-hubs/${hub.id}/post`,{method:"POST",credentials:"include"});
        const d = await r.json();
        if (r.ok) setPostResult({ok:true,msg:"Posted to Discord successfully!"});
        else setPostResult({ok:false,msg:d.error||"Failed to post"});
      } catch(e:any) { setPostResult({ok:false,msg:e.message}); }
      setPostingHubId(null);
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
    const panelSubs = selectedPanel ? submissions.filter(s=>s.panel_id===selectedPanel.id) : [];
    const filteredSubs = panelSubs.filter(s => {
      if (subFilter!=="all" && s.status!==subFilter) return false;
      if (search) { const q=search.toLowerCase(); return s.username.toLowerCase().includes(q)||Object.values(s.answers||{}).some(a=>String(a).toLowerCase().includes(q)); }
      return true;
    }).sort((a,b)=>new Date(b.created_at).getTime()-new Date(a.created_at).getTime());

    const pendingAll = submissions.filter(s=>s.status==="pending"||s.status==="flagged").length;
    const panelQuestions = selectedPanel?.questions || [];

    return (
      <div className="space-y-5 max-w-5xl">
        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight flex items-center gap-2">
              <Inbox className="w-6 h-6" style={{color:"#d4af37"}}/>
              Applications
              {pendingAll>0&&<span className="text-sm font-bold px-2.5 py-0.5 rounded-full text-black" style={{background:"linear-gradient(135deg,#d4af37,#f0c040)"}}>{pendingAll}</span>}
            </h2>
            <p className="text-muted-foreground mt-0.5 text-sm">{panels.length} panels · {submissions.length} total · {submissions.filter(s=>s.status==="accepted").length} accepted</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchAll} className="gap-1.5"><RefreshCw size={13}/>Refresh</Button>
            {view==="panels"
              ? <Button size="sm" disabled={!canAddPanel} onClick={()=>setEditPanel(newPanel())} className="gap-1.5" style={{background:"#d4af37",color:"#000"}}><Plus size={13}/>New Panel</Button>
              : <Button size="sm" onClick={()=>setEditHub(newHub())} className="gap-1.5" style={{background:"#d4af37",color:"#000"}}><Plus size={13}/>New Hub</Button>}
          </div>
        </div>

        {reviewError && (
          <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2.5 text-red-500 text-sm">
            <AlertTriangle size={14}/> Review failed: {reviewError}
            <button onClick={()=>setReviewError("")} className="ml-auto"><X size={14}/></button>
          </div>
        )}

        {postResult && (
          <div className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm ${postResult.ok?"bg-green-500/10 border border-green-500/20 text-green-600":"bg-red-500/10 border border-red-500/20 text-red-500"}`}>
            {postResult.ok?<CheckCheck size={14}/>:<AlertTriangle size={14}/>} {postResult.msg}
            <button onClick={()=>setPostResult(null)} className="ml-auto"><X size={14}/></button>
          </div>
        )}

        {/* View toggle */}
        {!selectedPanel && (
          <div className="flex gap-1 p-1 bg-muted rounded-xl w-fit">
            <button onClick={()=>setView("panels")} className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-1.5 ${view==="panels"?"bg-background shadow text-foreground":"text-muted-foreground hover:text-foreground"}`}>
              <Inbox size={14}/> Panels
            </button>
            <button onClick={()=>setView("hubs")} className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-1.5 ${view==="hubs"?"bg-background shadow text-foreground":"text-muted-foreground hover:text-foreground"}`}>
              <Layers size={14}/> Hubs
              <span className="text-[10px] bg-[#5865F2] text-white rounded px-1">Discord</span>
            </button>
          </div>
        )}

        {/* ── PANELS VIEW ── */}
        {view==="panels" && !selectedPanel && !selectedSub && (
          <>
            {!canAddPanel && (
              <Card className="border-dashed border-yellow-300">
                <CardContent className="p-3 flex items-center gap-3">
                  <Lock size={16} style={{color:"#d4af37"}}/>
                  <div><p className="font-semibold text-sm">Free tier: 1 panel</p><p className="text-xs text-muted-foreground">Upgrade to Premium for unlimited panels.</p></div>
                </CardContent>
              </Card>
            )}
            {loading ? (
              <div className="flex justify-center py-16"><div className="w-7 h-7 rounded-full border-2 animate-spin" style={{borderColor:"#d4af37",borderTopColor:"transparent"}}/></div>
            ) : panels.length===0 ? (
              <Card><CardContent className="py-16 text-center text-muted-foreground text-sm">No panels yet. Create one to get started.</CardContent></Card>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {panels.map(p=>{
                  const panelSubs2=submissions.filter(s=>s.panel_id===p.id);
                  const pending=panelSubs2.filter(s=>s.status==="pending"||s.status==="flagged").length;
                  const accepted=panelSubs2.filter(s=>s.status==="accepted").length;
                  const total=panelSubs2.length;
                  const rate=total>0?Math.round(accepted/total*100):null;
                  const oldest=panelSubs2.filter(s=>s.status==="pending").sort((a,b)=>new Date(a.created_at).getTime()-new Date(b.created_at).getTime())[0];
                  const oldestH=oldest?Math.floor((Date.now()-new Date(oldest.created_at).getTime())/3600000):null;
                  return (
                    <Card key={p.id} className={`relative overflow-hidden transition-all hover:shadow-md cursor-pointer ${pending>0?"ring-1 ring-[#d4af37]/30":""}`}
                      onClick={()=>{ setSelectedPanel(p); setSubFilter("pending"); setSearch(""); }}>
                      {pending>0&&<div className="absolute top-3 right-3 z-10 min-w-[22px] h-6 px-1.5 rounded-full flex items-center justify-center text-xs font-bold text-black" style={{background:"linear-gradient(135deg,#d4af37,#f0c040)"}}>{pending}</div>}
                      <CardContent className="p-4 space-y-3">
                        <div className="pr-10">
                          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                            <h3 className="font-bold text-sm truncate">{p.title||"Untitled"}</h3>
                            <Badge className={`text-[10px] ${p.enabled?"bg-green-100 text-green-700 border-green-200":"bg-gray-100 text-gray-500 border"} border`}>{p.enabled?"Active":"Off"}</Badge>
                          </div>
                          {p.description&&<p className="text-xs text-muted-foreground truncate">{p.description}</p>}
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div className="bg-muted/30 rounded-lg py-1.5"><p className="text-xs font-bold">{pending}</p><p className="text-[10px] text-muted-foreground">Pending</p></div>
                          <div className="bg-muted/30 rounded-lg py-1.5"><p className="text-xs font-bold">{total}</p><p className="text-[10px] text-muted-foreground">Total</p></div>
                          <div className="bg-muted/30 rounded-lg py-1.5"><p className="text-xs font-bold">{rate!==null?`${rate}%`:"—"}</p><p className="text-[10px] text-muted-foreground">Accept %</p></div>
                        </div>
                        {oldestH!==null&&oldestH>48&&<div className="flex items-center gap-1.5 text-[10px] text-orange-600 bg-orange-500/10 rounded-md px-2 py-1"><Clock size={9}/>Oldest: {Math.floor(oldestH/24)}d — needs review</div>}
                        <div className="flex items-center gap-1.5 pt-1 border-t">
                          <span className="text-[10px] text-muted-foreground truncate flex-1">{appLink(p).replace("https://","")}</span>
                          <button onClick={e=>{e.stopPropagation();copyText(appLink(p));}} className="text-muted-foreground hover:text-foreground flex-shrink-0"><Copy size={11}/></button>
                          <button onClick={e=>{e.stopPropagation();setEditPanel(p);}} className="text-muted-foreground hover:text-foreground flex-shrink-0"><Settings size={11}/></button>
                          <button onClick={e=>{e.stopPropagation();deletePanel(p.id);}} className="text-red-400 hover:text-red-600 flex-shrink-0"><Trash2 size={11}/></button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* ── HUBS VIEW ── */}
        {view==="hubs" && !selectedPanel && !selectedSub && (
          <div className="space-y-4">
            <div className="rounded-xl border bg-muted/20 p-4 flex items-start gap-3">
              <Layers className="w-5 h-5 mt-0.5 flex-shrink-0" style={{color:"#5865F2"}}/>
              <div>
                <p className="font-semibold text-sm">Application Hubs</p>
                <p className="text-xs text-muted-foreground mt-0.5">Post one Discord message with link buttons to multiple application panels. Applicants click the button for the role they want to apply for — all from a single post.</p>
              </div>
            </div>
            {hubs.length===0 ? (
              <Card><CardContent className="py-12 text-center space-y-3">
                <Sparkles className="w-8 h-8 mx-auto text-muted-foreground/40"/>
                <p className="text-sm text-muted-foreground">No hubs yet. Create one to post a multi-panel application message to Discord.</p>
                <Button size="sm" onClick={()=>setEditHub(newHub())} style={{background:"#d4af37",color:"#000"}} className="gap-1.5"><Plus size={13}/>Create Hub</Button>
              </CardContent></Card>
            ) : (
              <div className="grid sm:grid-cols-2 gap-4">
                {hubs.map(h=>(
                  <HubCard key={h.id} hub={h} panels={panels}
                    onEdit={()=>setEditHub(h)} onDelete={()=>deleteHub(h.id)}
                    onPost={()=>postHub(h)} posting={postingHubId===h.id}/>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── SUBMISSIONS VIEW (drill-down) ── */}
        {selectedPanel && !selectedSub && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <button onClick={()=>setSelectedPanel(null)} className="text-muted-foreground hover:text-foreground text-sm flex items-center gap-1.5"><ArrowLeft size={14}/>All Panels</button>
              <span className="text-muted-foreground">/</span>
              <h3 className="font-bold">{selectedPanel.title}</h3>
              <Badge className={`text-[10px] ${selectedPanel.enabled?"bg-green-100 text-green-700 border-green-200":"bg-gray-100 text-gray-500 border"} border`}>{selectedPanel.enabled?"Active":"Off"}</Badge>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground"/>
                <Input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search username or answers..." className="pl-8 h-8 text-sm"/>
              </div>
              <div className="flex gap-1.5 flex-wrap">
                {["pending","accepted","rejected","flagged","all"].map(f=>{
                  const cnt=f==="all"?panelSubs.length:panelSubs.filter(s=>s.status===f).length;
                  return <Button key={f} size="sm" variant={subFilter===f?"default":"outline"} onClick={()=>setSubFilter(f)} className="capitalize text-xs h-8" style={subFilter===f?{background:"#d4af37",color:"#000"}:{}}>{f}{cnt>0&&<span className="ml-1 text-[10px] opacity-70">({cnt})</span>}</Button>;
                })}
              </div>
            </div>
            {filteredSubs.length===0 ? (
              <Card><CardContent className="py-12 text-center text-muted-foreground text-sm">No {subFilter==="all"?"":subFilter} submissions.</CardContent></Card>
            ) : (
              <div className="space-y-2">
                {filteredSubs.map(s=>{
                  const b2: Record<string,string>={pending:"bg-yellow-100 text-yellow-700 border-yellow-200",accepted:"bg-green-100 text-green-700 border-green-200",rejected:"bg-red-100 text-red-700 border-red-200",flagged:"bg-orange-100 text-orange-700 border-orange-200"};
                  const el2=Math.floor((Date.now()-new Date(s.created_at).getTime())/3600000);
                  return (
                    <button key={s.id} onClick={()=>setSelectedSub(s)} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border hover:bg-muted/30 transition-colors text-left">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm">{s.username}</span>
                          <Badge className={`${b2[s.status]||b2.pending} border text-[10px] capitalize`}>{s.status}</Badge>
                          {el2>48&&s.status==="pending"&&<Badge className="bg-orange-100 text-orange-700 border-orange-200 border text-[10px]"><Clock size={9} className="mr-0.5"/>{Math.floor(el2/24)}d</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{timeSince(s.created_at)} · {Object.keys(s.answers||{}).length} answers</p>
                      </div>
                      <ChevronDown size={14} className="text-muted-foreground -rotate-90 flex-shrink-0"/>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── SUBMISSION DETAIL ── */}
        {selectedPanel && selectedSub && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <button onClick={()=>setSelectedPanel(null)} className="hover:text-foreground flex items-center gap-1"><ArrowLeft size={13}/>Panels</button>
              <span>/</span>
              <button onClick={()=>setSelectedSub(null)} className="hover:text-foreground">{selectedPanel.title}</button>
              <span>/</span>
              <span className="text-foreground font-medium">{selectedSub.username}</span>
            </div>
            <SubmissionDetail s={selectedSub} guildId={guildId} panelQuestions={panelQuestions} onUpdate={updateSubmission} onClose={()=>setSelectedSub(null)}/>
          </div>
        )}

        {/* Panel Editor Dialog */}
        <Dialog open={!!editPanel} onOpenChange={o=>{if(!o)setEditPanel(null);}}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editPanel?.id?"Edit Panel":"New Panel"}</DialogTitle></DialogHeader>
            {editPanel && (
              <div className="space-y-4 pt-2">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2"><Label className="text-xs">Panel Title *</Label><Input value={editPanel.title||""} onChange={e=>setEditPanel(p=>({...p,title:e.target.value}))} className="h-9 text-sm mt-1"/></div>
                  <div className="col-span-2"><Label className="text-xs">Description</Label><Textarea value={editPanel.description||""} onChange={e=>setEditPanel(p=>({...p,description:e.target.value}))} rows={2} className="text-sm mt-1"/></div>
                  <div><Label className="text-xs">Apply Button Label</Label><Input value={editPanel.button_label||"Apply Now"} onChange={e=>setEditPanel(p=>({...p,button_label:e.target.value}))} className="h-9 text-sm mt-1"/></div>
                  <div className="flex items-center gap-2 mt-5"><Switch checked={editPanel.enabled!==false} onCheckedChange={v=>setEditPanel(p=>({...p,enabled:v}))}/><Label className="text-sm">Panel Active</Label></div>
                </div>
                <div className="border-t pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <div><Label className="text-sm font-semibold">Questions</Label><p className="text-xs text-muted-foreground">{(editPanel.questions||[]).length}/{isPremium?"unlimited":FREE_QUESTION_LIMIT}</p></div>
                    <Button size="sm" variant="outline" onClick={addQuestion} disabled={(editPanel.questions||[]).length>=qLimit} className="gap-1 text-xs"><Plus size={12}/>Add</Button>
                  </div>
                  <div className="space-y-2">
                    {(editPanel.questions||[]).map((q,i)=>(
                      <QEditor key={q.id} q={q} count={i+1}
                        onChange={updated=>setEditPanel(p=>({...p,questions:(p.questions||[]).map((qq,ii)=>ii===i?updated:qq)}))}
                        onDelete={()=>setEditPanel(p=>({...p,questions:(p.questions||[]).filter((_,ii)=>ii!==i)}))}/>
                    ))}
                    {(editPanel.questions||[]).length===0&&<p className="text-xs text-muted-foreground text-center py-4">No questions yet.</p>}
                  </div>
                </div>
                <div className="flex gap-2 pt-2 border-t">
                  <Button onClick={savePanel} disabled={saving||!editPanel.title?.trim()} style={{background:"#d4af37",color:"#000"}} className="flex-1">{saving?"Saving…":editPanel.id?"Save Changes":"Create Panel"}</Button>
                  <Button variant="outline" onClick={()=>setEditPanel(null)}>Cancel</Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Hub Editor Dialog */}
        <Dialog open={!!editHub} onOpenChange={o=>{if(!o)setEditHub(null);}}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle className="flex items-center gap-2"><Layers size={16} style={{color:"#5865F2"}}/>{editHub?.id?"Edit Hub":"New Application Hub"}</DialogTitle></DialogHeader>
            {editHub && (
              <div className="space-y-5 pt-2">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2"><Label className="text-xs">Hub Title *</Label><Input value={editHub.title||""} onChange={e=>setEditHub(h=>({...h,title:e.target.value}))} placeholder="Apply for Staff" className="h-9 text-sm mt-1"/></div>
                  <div className="col-span-2"><Label className="text-xs">Description</Label><Textarea value={editHub.description||""} onChange={e=>setEditHub(h=>({...h,description:e.target.value}))} placeholder="Choose which role you want to apply for below." rows={2} className="text-sm mt-1"/></div>
                  <div>
                    <Label className="text-xs">Embed Color</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <input type="color" value={editHub.embed_color||"#d4af37"} onChange={e=>setEditHub(h=>({...h,embed_color:e.target.value}))} className="h-9 w-14 rounded border cursor-pointer"/>
                      <Input value={editHub.embed_color||"#d4af37"} onChange={e=>setEditHub(h=>({...h,embed_color:e.target.value}))} className="h-9 text-sm flex-1"/>
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">Footer Text</Label>
                    <Input value={editHub.footer_text||""} onChange={e=>setEditHub(h=>({...h,footer_text:e.target.value}))} placeholder="Zenith Applications" className="h-9 text-sm mt-1"/>
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs">Discord Channel ID *</Label>
                    <Input value={editHub.channel_id||""} onChange={e=>setEditHub(h=>({...h,channel_id:e.target.value}))} placeholder="e.g. 123456789012345678" className="h-9 text-sm mt-1"/>
                    <p className="text-[10px] text-muted-foreground mt-1">Right-click a channel in Discord → Copy Channel ID (Developer Mode must be enabled)</p>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <Label className="text-sm font-semibold">Select Panels to Include</Label>
                  <p className="text-xs text-muted-foreground mb-3">Each selected panel becomes a link button in the Discord post.</p>
                  {panels.length===0 ? (
                    <p className="text-xs text-muted-foreground italic">No panels yet. Create panels first.</p>
                  ) : (
                    <div className="space-y-2">
                      {panels.map(p=>{
                        const checked=(editHub.panel_ids||[]).includes(p.id);
                        return (
                          <label key={p.id} className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-all ${checked?"border-[#d4af37]/50 bg-[#d4af37]/5":"border-border hover:bg-muted/30"}`}>
                            <Checkbox checked={checked} onCheckedChange={v=>{
                              setEditHub(h=>({...h,panel_ids:v?[...(h.panel_ids||[]),p.id]:(h.panel_ids||[]).filter(id=>id!==p.id)}));
                            }}/>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-sm">{p.title}</p>
                              {p.description&&<p className="text-xs text-muted-foreground truncate">{p.description}</p>}
                            </div>
                            <Badge className={`text-[10px] ${p.enabled?"bg-green-100 text-green-700 border-green-200":"bg-gray-100 text-gray-500 border"} border`}>{p.enabled?"Active":"Off"}</Badge>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="border-t pt-4">
                  <Label className="text-sm font-semibold flex items-center gap-1.5 mb-3"><Eye size={13}/>Discord Preview</Label>
                  <HubDiscordPreview hub={editHub} panels={panels}/>
                </div>

                <div className="flex gap-2 pt-2 border-t">
                  <Button onClick={saveHub} disabled={saving||!editHub.title?.trim()} style={{background:"#d4af37",color:"#000"}} className="flex-1">{saving?"Saving…":editHub.id?"Save Hub":"Create Hub"}</Button>
                  <Button variant="outline" onClick={()=>setEditHub(null)}>Cancel</Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    );
  }