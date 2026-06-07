import { useState, useEffect } from "react";
  import { Button } from "@/components/ui/button";
  import { Input } from "@/components/ui/input";
  import { Textarea } from "@/components/ui/textarea";
  import { Label } from "@/components/ui/label";
  import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
  import { Loader2, Inbox, CheckCircle2, ShieldAlert, Lock, ExternalLink } from "lucide-react";
  import { useAuth } from "@/lib/auth";

  interface Question { id: string; text: string; type: "short"|"long"|"choice"; required: boolean; choices?: string[]; }
  interface Panel { id: string; title: string; description: string; button_label: string; questions: Question[]; enabled: boolean; guildName: string; }

  export default function ApplyPage({ guildId, panelId }: { guildId: string; panelId: string }) {
    const { user, isLoading: authLoading } = useAuth();
    const [panel, setPanel] = useState<Panel|null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [submitError, setSubmitError] = useState("");

    useEffect(() => {
      fetch(`/api/guilds/${guildId}/application-panels/${panelId}/public`)
        .then(r => r.json())
        .then(data => {
          if (data.error) { setError(data.error); }
          else { setPanel(data); }
        })
        .catch(() => setError("Failed to load application."))
        .finally(() => setLoading(false));
    }, [guildId, panelId]);

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!user) { window.location.href = "/login?redirect=" + encodeURIComponent(window.location.pathname); return; }
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
        if (res.ok) { setSubmitted(true); }
        else { setSubmitError(data.error || "Failed to submit. Please try again."); }
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

    if (submitted) return (
      <div className="min-h-screen bg-[#0d0f14] flex flex-col items-center justify-center p-6 text-center text-white">
        <CheckCircle2 className="w-16 h-16 mb-4" style={{ color: "#d4af37" }} />
        <h1 className="text-2xl font-bold mb-2">Application Submitted!</h1>
        <p className="text-white/50 max-w-md">Your application for <strong>{panel?.title}</strong> has been received. You will be notified via Discord DM when a decision is made.</p>
        <p className="text-white/30 text-sm mt-4">You can close this tab.</p>
      </div>
    );

    if (!panel) return null;

    return (
      <div className="min-h-screen bg-[#0d0f14] text-white py-12 px-4">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="mb-8 text-center">
            <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background: "linear-gradient(135deg,#d4af37,#f0c040)" }}>
              <Inbox className="w-7 h-7 text-black" />
            </div>
            <p className="text-sm font-medium mb-1" style={{ color: "#d4af37" }}>{panel.guildName}</p>
            <h1 className="text-3xl font-extrabold tracking-tight">{panel.title}</h1>
            {panel.description && <p className="text-white/50 mt-3 text-base leading-relaxed max-w-lg mx-auto">{panel.description}</p>}
          </div>

          {/* Auth gate */}
          {!user && (
            <div className="mb-6 rounded-xl border border-white/10 bg-white/5 p-5 flex items-start gap-4">
              <Lock className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: "#d4af37" }} />
              <div>
                <p className="font-semibold text-sm">Discord login required</p>
                <p className="text-white/50 text-sm mt-0.5">You must be logged in with Discord to submit this application.</p>
                <Button size="sm" className="mt-3 text-black font-semibold" style={{ background: "linear-gradient(135deg,#d4af37,#f0c040)" }}
                  onClick={() => window.location.href = "/login?redirect=" + encodeURIComponent(window.location.pathname)}>
                  Log in with Discord <ExternalLink className="ml-1.5 w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {panel.questions.map((q, idx) => (
              <div key={q.id} className="rounded-xl border border-white/10 bg-white/[0.04] p-5">
                <Label className="text-sm font-semibold text-white mb-3 flex items-start gap-2 leading-normal">
                  <span className="text-white/30 font-mono min-w-5">{idx + 1}.</span>
                  <span>{q.text}{q.required && <span style={{ color: "#d4af37" }}> *</span>}</span>
                </Label>
                {q.type === "short" && (
                  <Input value={answers[q.id] || ""} onChange={e => setAnswers(a => ({ ...a, [q.id]: e.target.value }))}
                    placeholder="Your answer..." className="mt-2 bg-white/5 border-white/10 text-white placeholder:text-white/30" />
                )}
                {q.type === "long" && (
                  <Textarea value={answers[q.id] || ""} onChange={e => setAnswers(a => ({ ...a, [q.id]: e.target.value }))}
                    placeholder="Your answer..." rows={4} className="mt-2 bg-white/5 border-white/10 text-white placeholder:text-white/30 resize-none" />
                )}
                {q.type === "choice" && (
                  <RadioGroup value={answers[q.id] || ""} onValueChange={v => setAnswers(a => ({ ...a, [q.id]: v }))} className="mt-3 space-y-2">
                    {(q.choices || []).map((c, ci) => (
                      <div key={ci} className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-white/10 hover:border-white/20 transition-colors cursor-pointer"
                        style={answers[q.id] === c ? { borderColor: "#d4af37", background: "rgba(212,175,55,.08)" } : {}}>
                        <RadioGroupItem value={c} id={`${q.id}-${ci}`} />
                        <label htmlFor={`${q.id}-${ci}`} className="text-sm cursor-pointer flex-1">
                          <span className="text-white/40 mr-2 font-mono">{String.fromCharCode(65+ci)}.</span>{c}
                        </label>
                      </div>
                    ))}
                  </RadioGroup>
                )}
              </div>
            ))}

            {panel.questions.length === 0 && (
              <div className="text-center py-8 text-white/30 text-sm">No questions in this panel.</div>
            )}

            {submitError && <div className="rounded-lg bg-red-900/30 border border-red-500/30 text-red-300 text-sm px-4 py-3">{submitError}</div>}

            <Button type="submit" disabled={submitting || !user} className="w-full h-12 text-base font-semibold text-black disabled:opacity-50"
              style={{ background: "linear-gradient(135deg,#d4af37,#f0c040)" }}>
              {submitting ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Submitting...</> : (panel.button_label || "Submit Application")}
            </Button>
            <p className="text-center text-xs text-white/20 pb-4">Powered by <a href="https://zenithbot.up.railway.app/" target="_blank" rel="noreferrer" className="hover:text-white/50 transition-colors">Zenith</a></p>
          </form>
        </div>
      </div>
    );
  }