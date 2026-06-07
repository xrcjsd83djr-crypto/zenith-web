import { useState, useEffect } from "react";
  import { useAuth } from "@/lib/auth";
  import { Loader2, ShieldAlert, UserX, LogIn, CheckCircle2, ChevronRight, AlertTriangle } from "lucide-react";
  import { Button } from "@/components/ui/button";
  import { Textarea } from "@/components/ui/textarea";
  import { Input } from "@/components/ui/input";

  interface Question { id: string; text: string; type: "short"|"long"|"choice"; required: boolean; choices?: string[]; }
  interface Panel { id: string; title: string; description: string; button_label: string; questions: Question[]; enabled: boolean; guildName: string; guildIcon?: string; }
  interface MemberCheck { isMember: boolean | null; guildName?: string; guildIcon?: string; reason?: string; }

  export default function ApplyPage({ guildId, panelId }: { guildId: string; panelId: string }) {
    const { user, isLoading: authLoading } = useAuth();
    const [panel, setPanel] = useState<Panel|null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [memberCheck, setMemberCheck] = useState<MemberCheck|null>(null);
    const [memberLoading, setMemberLoading] = useState(false);
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState("");
    const [submitted, setSubmitted] = useState(false);
    const [started, setStarted] = useState(false);

    useEffect(() => {
      fetch(`/api/guilds/${guildId}/application-panels/${panelId}/public`)
        .then(r => r.json())
        .then(d => { if (d.error) setError(d.error); else setPanel(d); })
        .catch(() => setError("Failed to load application."))
        .finally(() => setLoading(false));
    }, [guildId, panelId]);

    useEffect(() => {
      if (!user || !panel) return;
      setMemberLoading(true);
      fetch(`/api/guilds/${guildId}/members/${user.id}/check`, { credentials: "include" })
        .then(r => r.json())
        .then(d => setMemberCheck(d))
        .catch(() => setMemberCheck({ isMember: null }))
        .finally(() => setMemberLoading(false));
    }, [user, panel, guildId]);

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      const qs = panel?.questions || [];
      for (const q of qs) {
        if (q.required && !answers[q.id]?.trim()) {
          setSubmitError(`Please answer: "${q.text}"`);
          return;
        }
      }
      setSubmitting(true); setSubmitError("");
      try {
        const res = await fetch(`/api/guilds/${guildId}/application-panels/${panelId}/submit`, {
          method: "POST", credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ answers }),
        });
        const data = await res.json();
        if (res.ok) setSubmitted(true);
        else setSubmitError(data.error || "Failed to submit. Please try again.");
      } catch { setSubmitError("Network error. Please try again."); }
      setSubmitting(false);
    };

    const avatarUrl = user?.avatar
      ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=80`
      : `https://cdn.discordapp.com/embed/avatars/${Math.abs(parseInt(user?.id||"0",10)) % 6}.png`;

    // ── Screens ──────────────────────────────────────────────────────────────
    if (loading || authLoading) return (
      <div className="min-h-screen bg-[#0d0f14] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#d4af37" }} />
      </div>
    );

    if (error) return (
      <div className="min-h-screen bg-[#0d0f14] flex flex-col items-center justify-center p-6 text-center text-white">
        <ShieldAlert className="w-16 h-16 text-red-400 mb-4" />
        <h1 className="text-2xl font-bold mb-2">Application Unavailable</h1>
        <p className="text-white/50 max-w-md">{error}</p>
        <Button className="mt-6" variant="outline" onClick={() => history.back()}>Go Back</Button>
      </div>
    );

    // ── Not logged in ─────────────────────────────────────────────────────────
    if (!user) return (
      <div className="min-h-screen bg-[#0d0f14] flex flex-col items-center justify-center p-6 text-center text-white">
        {panel?.guildIcon && <img src={panel.guildIcon} alt="" className="w-20 h-20 rounded-2xl mb-4 object-cover shadow-xl" />}
        {!panel?.guildIcon && (
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center mb-4 text-3xl font-black"
            style={{ background: "linear-gradient(135deg,#d4af37,#f0c040)", color: "#000" }}>Z</div>
        )}
        <p className="text-white/40 text-sm uppercase tracking-widest font-semibold mb-1">{panel?.guildName || "Application"}</p>
        <h1 className="text-2xl font-extrabold mb-1">{panel?.title || "Apply Now"}</h1>
        {panel?.description && <p className="text-white/50 text-sm max-w-sm mb-6">{panel.description}</p>}
        <div className="w-full max-w-xs bg-white/5 rounded-2xl p-5 border border-white/10 mb-6 space-y-4">
          <div className="flex items-center gap-2 text-sm text-white/60">
            <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{background:"rgba(212,175,55,.15)"}}>
              <LogIn className="w-4 h-4" style={{ color: "#d4af37" }} />
            </div>
            Sign in with Discord to begin your application
          </div>
        </div>
        <Button
          className="gap-2 font-bold px-8 py-3 text-base rounded-xl shadow-lg"
          style={{ background: "linear-gradient(135deg,#5865F2,#4752C4)", color: "#fff" }}
          onClick={() => { window.location.href = `/auth/discord?redirect=${encodeURIComponent(window.location.pathname)}`; }}
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.79 19.79 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057A19.9 19.9 0 005.9 21.19a.077.077 0 00.084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028A19.839 19.839 0 0020.9 18.114a.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03z"/></svg>
          Continue with Discord
        </Button>
        <p className="text-white/20 text-xs mt-5">Powered by <a href="https://zenithbot.up.railway.app/" target="_blank" rel="noreferrer" className="hover:text-white/40 transition-colors">Zenith</a></p>
      </div>
    );

    // ── Checking membership ───────────────────────────────────────────────────
    if (memberLoading || memberCheck === null) return (
      <div className="min-h-screen bg-[#0d0f14] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#d4af37" }} />
      </div>
    );

    // ── Not a member ──────────────────────────────────────────────────────────
    if (memberCheck.isMember === false) return (
      <div className="min-h-screen bg-[#0d0f14] flex flex-col items-center justify-center p-6 text-center text-white">
        {(memberCheck.guildIcon || panel?.guildIcon) && <img src={memberCheck.guildIcon || panel?.guildIcon} alt="" className="w-20 h-20 rounded-2xl mb-4 object-cover shadow-xl" />}
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ background: "rgba(239,68,68,.12)" }}>
          <UserX className="w-8 h-8 text-red-400" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Not a Member</h1>
        <p className="text-white/50 max-w-sm">You must be a member of <strong className="text-white">{memberCheck.guildName || panel?.guildName || "this server"}</strong> to apply.</p>
        <p className="text-white/30 text-xs mt-6">Applying as: {user.username}</p>
        <p className="text-white/20 text-xs mt-2">Powered by <a href="https://zenithbot.up.railway.app/" target="_blank" rel="noreferrer" className="hover:text-white/40 transition-colors">Zenith</a></p>
      </div>
    );

    // ── Submitted ─────────────────────────────────────────────────────────────
    if (submitted) return (
      <div className="min-h-screen bg-[#0d0f14] flex flex-col items-center justify-center p-6 text-center text-white">
        {panel?.guildIcon && <img src={panel.guildIcon} alt="" className="w-16 h-16 rounded-2xl mb-4 object-cover" />}
        <div className="w-20 h-20 rounded-full flex items-center justify-center mb-5" style={{ background: "rgba(34,197,94,.12)" }}>
          <CheckCircle2 className="w-10 h-10 text-green-400" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Application Submitted!</h1>
        <p className="text-white/50 max-w-sm">Thanks {user.username}! Your application for <strong className="text-white">{panel?.title}</strong> has been received. You'll be notified via Discord DM with the decision.</p>
        <p className="text-white/20 text-xs mt-8">Powered by <a href="https://zenithbot.up.railway.app/" target="_blank" rel="noreferrer" className="hover:text-white/40 transition-colors">Zenith</a></p>
      </div>
    );

    // ── Intro / confirmation screen (shown before form) ───────────────────────
    if (!started) return (
      <div className="min-h-screen bg-[#0d0f14] flex flex-col items-center justify-center p-6 text-center text-white">
        {panel?.guildIcon
          ? <img src={panel.guildIcon} alt="" className="w-20 h-20 rounded-2xl mb-4 object-cover shadow-xl" />
          : <div className="w-20 h-20 rounded-2xl flex items-center justify-center mb-4 text-3xl font-black shadow-xl"
              style={{ background: "linear-gradient(135deg,#d4af37,#f0c040)", color: "#000" }}>Z</div>}
        <p className="text-white/40 text-xs uppercase tracking-widest font-semibold mb-1">{panel?.guildName}</p>
        <h1 className="text-2xl font-extrabold mb-2">{panel?.title}</h1>
        {panel?.description && <p className="text-white/50 text-sm max-w-sm mb-6">{panel.description}</p>}

        {/* Signed-in identity card */}
        <div className="w-full max-w-xs bg-white/5 border border-white/10 rounded-2xl p-4 mb-6 flex items-center gap-3 text-left">
          <img src={avatarUrl} alt="" className="w-10 h-10 rounded-full flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-white/40 mb-0.5">Applying as</p>
            <p className="font-bold text-sm truncate">{user.username}</p>
          </div>
          <button onClick={() => { window.location.href = `/auth/discord?redirect=${encodeURIComponent(window.location.pathname)}`; }}
            className="text-xs text-white/30 hover:text-white/60 transition-colors whitespace-nowrap">Switch</button>
        </div>

        <div className="w-full max-w-xs space-y-2 text-left mb-6">
          <p className="text-[11px] text-white/30 uppercase tracking-wider font-semibold text-center mb-3">What to expect</p>
          <div className="flex items-center gap-2 text-sm text-white/50">
            <span className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-bold flex-shrink-0">1</span>
            Answer {panel?.questions?.length || 0} question{panel?.questions?.length !== 1 ? "s" : ""}
          </div>
          <div className="flex items-center gap-2 text-sm text-white/50">
            <span className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-bold flex-shrink-0">2</span>
            Wait for the team to review
          </div>
          <div className="flex items-center gap-2 text-sm text-white/50">
            <span className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-bold flex-shrink-0">3</span>
            Receive decision via Discord DM
          </div>
        </div>

        <Button className="gap-2 font-bold px-8 py-3 text-base rounded-xl shadow-lg w-full max-w-xs"
          style={{ background: "linear-gradient(135deg,#d4af37,#f0c040)", color: "#000" }}
          onClick={() => setStarted(true)}>
          {panel?.button_label || "Begin Application"} <ChevronRight className="w-4 h-4" />
        </Button>
        <p className="text-white/20 text-xs mt-5">Powered by <a href="https://zenithbot.up.railway.app/" target="_blank" rel="noreferrer" className="hover:text-white/40 transition-colors">Zenith</a></p>
      </div>
    );

    // ── Application form ──────────────────────────────────────────────────────
    return (
      <div className="min-h-screen bg-[#0d0f14] flex flex-col items-center py-10 px-4 text-white">
        <div className="w-full max-w-lg">
          {/* Brand header */}
          <div className="text-center mb-8">
            {panel?.guildIcon
              ? <img src={panel.guildIcon} alt="" className="w-14 h-14 rounded-xl mx-auto mb-3 object-cover shadow-lg" />
              : <div className="w-14 h-14 rounded-xl mx-auto mb-3 flex items-center justify-center text-2xl font-black shadow-lg"
                  style={{ background: "linear-gradient(135deg,#d4af37,#f0c040)", color: "#000" }}>Z</div>}
            <h1 className="text-xl font-extrabold">{panel?.title}</h1>
            {panel?.description && <p className="text-white/40 text-sm mt-1">{panel.description}</p>}
            <div className="mt-3 inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-3 py-1">
              <img src={avatarUrl} alt="" className="w-4 h-4 rounded-full" />
              <span className="text-xs text-white/60">Applying as <strong className="text-white">{user.username}</strong></span>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {(panel?.questions || []).map((q, i) => (
              <div key={q.id} className="space-y-2">
                <label className="block text-sm font-semibold">
                  <span className="text-white/40 text-xs font-normal mr-1.5">{i + 1}.</span>
                  {q.text}
                  {q.required && <span className="text-red-400 ml-1 text-xs">*</span>}
                </label>
                {q.type === "short" && (
                  <Input value={answers[q.id] || ""} onChange={e => setAnswers(a => ({ ...a, [q.id]: e.target.value }))}
                    placeholder="Your answer..." className="bg-white/5 border-white/10 text-white placeholder:text-white/25 focus:border-[#d4af37]/50 h-10" />
                )}
                {q.type === "long" && (
                  <Textarea value={answers[q.id] || ""} onChange={e => setAnswers(a => ({ ...a, [q.id]: e.target.value }))}
                    placeholder="Your answer..." rows={4}
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/25 focus:border-[#d4af37]/50 resize-none" />
                )}
                {q.type === "choice" && (
                  <div className="space-y-2">
                    {(q.choices || []).map((choice, ci) => (
                      <label key={ci} className="flex items-center gap-3 cursor-pointer group">
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${answers[q.id] === choice ? "border-[#d4af37] bg-[#d4af37]" : "border-white/25 group-hover:border-white/50"}`}>
                          {answers[q.id] === choice && <div className="w-1.5 h-1.5 rounded-full bg-black" />}
                        </div>
                        <input type="radio" name={q.id} value={choice} checked={answers[q.id] === choice}
                          onChange={() => setAnswers(a => ({ ...a, [q.id]: choice }))} className="sr-only" />
                        <span className={`text-sm transition-colors ${answers[q.id] === choice ? "text-white" : "text-white/60 group-hover:text-white/80"}`}>{choice}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {submitError && (
              <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-red-400 text-sm">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" /> {submitError}
              </div>
            )}

            <Button type="submit" disabled={submitting} className="w-full h-11 font-bold text-base rounded-xl mt-2 gap-2"
              style={{ background: "linear-gradient(135deg,#d4af37,#f0c040)", color: "#000" }}>
              {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting…</> : (panel?.button_label || "Submit Application")}
            </Button>
          </form>

          <p className="text-center text-white/20 text-xs mt-8">
            Powered by <a href="https://zenithbot.up.railway.app/" target="_blank" rel="noreferrer" className="hover:text-white/30 transition-colors">Zenith</a>
          </p>
        </div>
      </div>
    );
  }