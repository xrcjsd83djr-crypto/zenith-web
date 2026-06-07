import { useState, useEffect } from "react";
  import { useAuth } from "@/lib/auth";
  import { Loader2, ShieldAlert, UserX, LogIn, CheckCircle2 } from "lucide-react";
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

    // Load panel info (public, no auth needed)
    useEffect(() => {
      fetch(`/api/guilds/${guildId}/application-panels/${panelId}/public`)
        .then(r => r.json())
        .then(d => {
          if (d.error) setError(d.error);
          else setPanel(d);
        })
        .catch(() => setError("Failed to load application."))
        .finally(() => setLoading(false));
    }, [guildId, panelId]);

    // Check guild membership once user is known
    useEffect(() => {
      if (!user || !panel) return;
      setMemberLoading(true);
      fetch(`/api/guilds/${guildId}/members/${user.id}/check`)
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
      setSubmitting(true);
      setSubmitError("");
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

    // Not logged in — show auth wall
    if (!user) return (
      <div className="min-h-screen bg-[#0d0f14] flex flex-col items-center justify-center p-6 text-center text-white">
        {panel?.guildIcon && <img src={panel.guildIcon} alt="" className="w-20 h-20 rounded-2xl mb-4 object-cover" />}
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ background: "rgba(212,175,55,.15)" }}>
          <LogIn className="w-8 h-8" style={{ color: "#d4af37" }} />
        </div>
        <h1 className="text-2xl font-bold mb-2">Sign in to Apply</h1>
        <p className="text-white/50 max-w-sm mb-1">You need to sign in with Discord to apply for</p>
        <p className="font-semibold text-white mb-6">"{panel?.title}"</p>
        <Button
          className="gap-2 font-bold px-6 py-3 text-base"
          style={{ background: "linear-gradient(135deg,#d4af37,#f0c040)", color: "#000" }}
          onClick={() => { window.location.href = `/auth/discord?redirect=${encodeURIComponent(window.location.pathname)}`; }}
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.79 19.79 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057A19.9 19.9 0 005.9 21.19a.077.077 0 00.084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028A19.839 19.839 0 0020.9 18.114a.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03z"/></svg>
          Sign in with Discord
        </Button>
        <p className="text-white/30 text-xs mt-4">Powered by <a href="https://zenithbot.up.railway.app/" target="_blank" rel="noreferrer" className="hover:text-white/50 transition-colors">Zenith</a></p>
      </div>
    );

    // Checking membership
    if (memberLoading) return (
      <div className="min-h-screen bg-[#0d0f14] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#d4af37" }} />
      </div>
    );

    // Not a member of the guild
    if (memberCheck && memberCheck.isMember === false) return (
      <div className="min-h-screen bg-[#0d0f14] flex flex-col items-center justify-center p-6 text-center text-white">
        {memberCheck.guildIcon && <img src={memberCheck.guildIcon} alt="" className="w-20 h-20 rounded-2xl mb-4 object-cover" />}
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ background: "rgba(239,68,68,.12)" }}>
          <UserX className="w-8 h-8 text-red-400" />
        </div>
        <h1 className="text-2xl font-bold mb-2">You're Not in This Server</h1>
        <p className="text-white/50 max-w-sm mb-2">You need to be a member of</p>
        <p className="font-semibold text-white mb-6">"{memberCheck.guildName || "this server"}"</p>
        <p className="text-white/40 text-sm mb-6">Join the server first, then come back to this link to apply.</p>
        <Button variant="outline" onClick={() => window.location.reload()} className="gap-2">
          <CheckCircle2 className="w-4 h-4" /> I've Joined — Try Again
        </Button>
        <p className="text-white/30 text-xs mt-4">Powered by <a href="https://zenithbot.up.railway.app/" target="_blank" rel="noreferrer" className="hover:text-white/50 transition-colors">Zenith</a></p>
      </div>
    );

    if (submitted) return (
      <div className="min-h-screen bg-[#0d0f14] flex flex-col items-center justify-center p-6 text-center text-white">
        <div className="w-20 h-20 rounded-full flex items-center justify-center mb-6" style={{ background: "rgba(212,175,55,.15)" }}>
          <CheckCircle2 className="w-10 h-10" style={{ color: "#d4af37" }} />
        </div>
        <h1 className="text-3xl font-bold mb-3">Application Submitted!</h1>
        <p className="text-white/50 max-w-md mb-2">Your application for <strong className="text-white">{panel?.title}</strong> has been received.</p>
        <p className="text-white/40 text-sm">You'll receive a Discord DM with the decision. Good luck!</p>
        <p className="text-white/30 text-xs mt-8">Powered by <a href="https://zenithbot.up.railway.app/" target="_blank" rel="noreferrer" className="hover:text-white/50 transition-colors">Zenith</a></p>
      </div>
    );

    return (
      <div className="min-h-screen bg-[#0d0f14] text-white flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-xl">
          {/* Header */}
          <div className="text-center mb-8">
            {panel?.guildIcon && <img src={panel.guildIcon} alt="" className="w-16 h-16 rounded-xl mx-auto mb-3 object-cover" />}
            {!panel?.guildIcon && (
              <div className="w-16 h-16 rounded-xl mx-auto mb-3 flex items-center justify-center text-black font-bold text-2xl" style={{ background: "linear-gradient(135deg,#d4af37,#ffd700)" }}>Z</div>
            )}
            <p className="text-white/50 text-sm mb-1">{panel?.guildName}</p>
            <h1 className="text-2xl font-extrabold">{panel?.title}</h1>
            {panel?.description && <p className="text-white/50 text-sm mt-2 max-w-sm mx-auto">{panel.description}</p>}
          </div>

          {/* Logged-in as */}
          <div className="flex items-center gap-2 bg-white/5 rounded-xl px-4 py-2.5 mb-6 text-sm text-white/60">
            <span>Applying as</span>
            <span className="text-white font-semibold">{user?.username}</span>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {(panel?.questions || []).map((q, i) => (
              <div key={q.id} className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-1.5">
                  <span className="text-white/30 font-mono text-xs">{i+1}.</span>
                  {q.text}
                  {q.required && <span className="text-red-400 ml-0.5">*</span>}
                </label>
                {q.type === "long" ? (
                  <Textarea value={answers[q.id] || ""} onChange={e => setAnswers(a => ({ ...a, [q.id]: e.target.value }))}
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/20 min-h-[100px]"
                    placeholder="Your answer..." required={q.required} />
                ) : q.type === "choice" ? (
                  <div className="space-y-2">
                    {(q.choices || []).map(c => (
                      <label key={c} className="flex items-center gap-3 cursor-pointer group">
                        <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${answers[q.id] === c ? "border-[#d4af37]" : "border-white/20 group-hover:border-white/40"}`}
                          onClick={() => setAnswers(a => ({ ...a, [q.id]: c }))}>
                          {answers[q.id] === c && <div className="w-2 h-2 rounded-full" style={{ background: "#d4af37" }} />}
                        </div>
                        <span className="text-sm text-white/70 group-hover:text-white transition-colors">{c}</span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <Input value={answers[q.id] || ""} onChange={e => setAnswers(a => ({ ...a, [q.id]: e.target.value }))}
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/20"
                    placeholder="Your answer..." required={q.required} />
                )}
              </div>
            ))}

            {submitError && (
              <div className="bg-red-500/15 border border-red-500/30 rounded-xl px-4 py-3 text-red-300 text-sm">{submitError}</div>
            )}

            <button type="submit" disabled={submitting}
              className="w-full py-3 rounded-xl font-bold text-base disabled:opacity-50 disabled:cursor-not-allowed transition-opacity flex items-center justify-center gap-2"
              style={{ background: "linear-gradient(135deg,#d4af37,#f0c040)", color: "#000" }}>
              {submitting ? <><Loader2 className="w-4 h-4 animate-spin" />{" Submitting..."}</> : (panel?.button_label || "Apply Now")}
            </button>
          </form>
          <p className="text-center text-white/25 text-xs mt-6">Powered by <a href="https://zenithbot.up.railway.app/" target="_blank" rel="noreferrer" className="hover:text-white/40 transition-colors">Zenith</a></p>
        </div>
      </div>
    );
  }