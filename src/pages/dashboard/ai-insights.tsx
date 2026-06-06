import { useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Brain, TrendingUp, TrendingDown, Shield, Users, Star, RefreshCw, Sparkles, Target, ArrowRight, CheckCircle, AlertTriangle, Zap } from "lucide-react";
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

const GOLD = "#d4af37";

function ScoreRing({ score, size = 140 }: { score: number; size?: number }) {
  const r = (size - 16) / 2;
  const circ = 2 * Math.PI * r;
  const color = score >= 80 ? "#22c55e" : score >= 65 ? GOLD : score >= 45 ? "#f97316" : "#ef4444";
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,.07)" strokeWidth="10" />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="10"
          strokeDasharray={circ} strokeDashoffset={circ * (1 - Math.max(0,Math.min(100,score))/100)}
          strokeLinecap="round" style={{ transition: "stroke-dashoffset 1.2s ease" }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-black" style={{ color }}>{score}</span>
        <span className="text-[10px] text-muted-foreground">/ 100</span>
      </div>
    </div>
  );
}

function grade(s: number) {
  if (s >= 90) return { g: "A+", label: "Outstanding", color: "#22c55e" };
  if (s >= 80) return { g: "A",  label: "Excellent",   color: "#22c55e" };
  if (s >= 70) return { g: "B",  label: "Good",        color: "#84cc16" };
  if (s >= 60) return { g: "C",  label: "Average",     color: GOLD };
  if (s >= 40) return { g: "D",  label: "At Risk",     color: "#f97316" };
  return              { g: "F",  label: "Critical",    color: "#ef4444" };
}

function buildNarrative(d: any): string[] {
  const { overall, actScore, discScore, retScore, engScore, totalStaff, activeStaff, strikes, warnings, loas, topPerformer } = d;
  const actPct = Math.round((activeStaff / Math.max(totalStaff, 1)) * 100);
  const topName = topPerformer?.username || "N/A";

  const p1 = overall >= 75
    ? `Your server is operating at a high performance tier with an Intelligence Score of ${overall}/100. ${actPct}% of your ${totalStaff} staff members are actively engaged, which reflects strong leadership and a well-structured management system. The current trajectory indicates sustained team health and consistent activity across key performance dimensions.`
    : overall >= 55
    ? `Your server is performing at a moderate level with an Intelligence Score of ${overall}/100. While ${actPct}% of your ${totalStaff} staff are active, there are clear opportunities to elevate team performance. Addressing the identified risk areas below will help push your server into the high-performance tier.`
    : `Your server requires strategic intervention with an Intelligence Score of ${overall}/100. Only ${actPct}% of ${totalStaff} staff members are currently active. Immediate action on the priorities outlined below is recommended to stabilize team operations and prevent further degradation.`;

  const p2 = strikes > 5
    ? `Disciplinary data reveals ${strikes} active strike(s) across your staff team, which is above the healthy threshold. A focused disciplinary review cycle is recommended. ${warnings > 3 ? `Additionally, ${warnings} active warning(s) suggest a pattern that warrants proactive management before escalation.` : "Warning levels appear manageable at this time."}`
    : `Disciplinary metrics are within acceptable bounds with ${strikes} active strike(s) and ${warnings} warning(s). Your current disciplinary framework is functioning effectively, keeping your team accountable without creating unnecessary friction. Maintain this balance by addressing infractions consistently and transparently.`;

  const p3 = topName !== "N/A"
    ? `Top performer recognition goes to ${topName}, whose activity and engagement scores rank highest on your leaderboard. Recognizing and rewarding high performers creates positive incentive structures that elevate overall team morale. ${loas > 0 ? `Note: ${loas} staff member(s) are currently on approved Leave of Absence — factor this into your active roster planning.` : "No current LOA requests, keeping your full team operational."}`
    : `Leaderboard data is still accumulating as staff log activity through the bot. Once your team begins using slash commands and shift tracking, the Intelligence Engine will generate increasingly precise performance insights. Encourage your staff to use bot commands regularly to unlock the full power of Zenith Analytics.`;

  return [p1, p2, p3];
}

function buildActions(d: any): { text: string; link: string; priority: "high"|"medium"|"low" }[] {
  const actions: { text: string; link: string; priority: "high"|"medium"|"low" }[] = [];
  if (d.actScore < 50) actions.push({ text: `Only ${d.activeStaff}/${d.totalStaff} staff active — run inactivity scan`, link: "inactivity-radar", priority: "high" });
  if (d.strikes > 5)   actions.push({ text: `${d.strikes} active strikes pending — schedule disciplinary review`, link: "strikes", priority: "high" });
  if (d.pendingApps > 0) actions.push({ text: `${d.pendingApps} application(s) awaiting review`, link: "applications", priority: "medium" });
  if (d.loas > 3)      actions.push({ text: `${d.loas} staff on LOA — check capacity before scheduling`, link: "loa", priority: "medium" });
  if (d.discScore < 60) actions.push({ text: "Disciplinary index low — review warning patterns", link: "warnings", priority: "medium" });
  if (d.retScore < 60)  actions.push({ text: "Retention signals dropping — review LOA policies", link: "loa", priority: "medium" });
  if (actions.length === 0) actions.push({ text: "All systems healthy — keep up the excellent work!", link: "overview", priority: "low" });
  return actions.slice(0, 6);
}

export default function AIInsightsPage({ guildId }: { guildId: string }) {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [lastRun, setLastRun] = useState<string | null>(null);

  const runAnalysis = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, strikesRes, warningsRes, loaRes, lbRes, appsRes] = await Promise.all([
        fetch(`/api/guilds/${guildId}/stats`, { credentials: "include" }),
        fetch(`/api/guilds/${guildId}/strikes`, { credentials: "include" }),
        fetch(`/api/guilds/${guildId}/warnings`, { credentials: "include" }),
        fetch(`/api/guilds/${guildId}/loa`, { credentials: "include" }),
        fetch(`/api/guilds/${guildId}/activity/leaderboard`, { credentials: "include" }),
        fetch(`/api/guilds/${guildId}/application-panels`, { credentials: "include" }),
      ]);
      const stats   = statsRes.ok   ? await statsRes.json()   : {};
      const strikes = strikesRes.ok ? await strikesRes.json() : [];
      const warns   = warningsRes.ok? await warningsRes.json(): [];
      const loas    = loaRes.ok     ? await loaRes.json()     : [];
      const lb      = lbRes.ok      ? await lbRes.json()      : [];
      const apps    = appsRes.ok    ? await appsRes.json()    : [];

      const totalStaff  = stats.totalStaff  || 1;
      const activeStaff = stats.activeStaff || 0;
      const activeStrikes = (strikes as any[]).filter((s:any) => s.active !== false).length;
      const activeWarns   = (warns as any[]).filter((w:any) => w.active !== false).length;
      const activeLoas    = (loas as any[]).filter((l:any) => l.status === "active").length;
      const pendingApps   = (loas as any[]).filter((l:any) => l.status === "pending").length;

      const actScore  = Math.round((activeStaff / totalStaff) * 100);
      const discScore = Math.max(0, Math.round(100 - (activeStrikes / totalStaff) * 60));
      const retScore  = Math.max(0, Math.round(100 - (activeLoas / totalStaff) * 50));
      const engScore  = Math.min(100, Math.round((stats.avgActivityScore || 0) * 2));
      const growScore = Math.min(100, Math.round((stats.recentHires || 0) * 25 + 40));
      const overall   = Math.round(actScore*0.3 + discScore*0.25 + retScore*0.2 + engScore*0.15 + growScore*0.1);

      const radarData = [
        { subject: "Activity",   A: actScore   },
        { subject: "Discipline", A: discScore  },
        { subject: "Retention",  A: retScore   },
        { subject: "Engagement", A: engScore   },
        { subject: "Growth",     A: growScore  },
      ];

      const barData = [
        { name: "Active Staff",  value: activeStaff,   fill: "#22c55e" },
        { name: "On LOA",        value: activeLoas,    fill: GOLD },
        { name: "Strikes",       value: activeStrikes, fill: "#ef4444" },
        { name: "Warnings",      value: activeWarns,   fill: "#f97316" },
        { name: "Pending Apps",  value: pendingApps,   fill: "#a855f7" },
      ];

      const payload = {
        overall, actScore, discScore, retScore, engScore, growScore,
        totalStaff, activeStaff, strikes: activeStrikes, warnings: activeWarns,
        loas: activeLoas, pendingApps, topPerformer: lb[0] || null,
        radarData, barData, stats,
      };

      setResult(payload);
      setLastRun(new Date().toLocaleTimeString());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [guildId]);

  const { g: gradeLabel, label: gradeText, color: gradeColor } = result ? grade(result.overall) : { g: "—", label: "Not analyzed", color: "#64748b" };

  return (
    <div className="space-y-5 max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight flex items-center gap-2">
            <Brain className="w-6 h-6" style={{ color: GOLD }} />
            AI Insights Engine
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full ml-1" style={{ background: "rgba(212,175,55,.15)", color: GOLD, border: `1px solid rgba(212,175,55,.3)` }}>PRO</span>
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {lastRun ? `Last analyzed at ${lastRun} · Powered by Zenith Intelligence` : "Run a full analysis to generate AI-powered insights for your server."}
          </p>
        </div>
        <Button onClick={runAnalysis} disabled={loading} className="gap-2 font-semibold" style={{ background: GOLD, color: "#000" }}>
          {loading ? <><RefreshCw className="w-4 h-4 animate-spin" />Analyzing...</> : <><Sparkles className="w-4 h-4" />Run Analysis</>}
        </Button>
      </div>

      {!result && !loading && (
        <Card className="border-dashed">
          <CardContent className="py-20 text-center">
            <Brain className="w-14 h-14 mx-auto mb-4 opacity-20" />
            <p className="font-semibold text-lg">Ready to analyze your server</p>
            <p className="text-muted-foreground text-sm mt-1 max-w-md mx-auto">Click "Run Analysis" to generate a comprehensive AI intelligence report covering team health, discipline, retention, engagement, and growth.</p>
            <Button onClick={runAnalysis} className="mt-5 gap-2" style={{ background: GOLD, color: "#000" }}>
              <Sparkles className="w-4 h-4" /> Start Analysis
            </Button>
          </CardContent>
        </Card>
      )}

      {loading && (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-full border-2 animate-spin" style={{ borderColor: GOLD, borderTopColor: "transparent" }} />
              <p className="font-semibold">Zenith Intelligence is analyzing your server...</p>
              <p className="text-sm text-muted-foreground">Fetching data across all systems</p>
            </div>
          </CardContent>
        </Card>
      )}

      {result && !loading && (
        <>
          {/* Score + Grade */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Card>
              <CardContent className="p-6 flex flex-col items-center justify-center gap-4">
                <ScoreRing score={result.overall} />
                <div className="text-center">
                  <span className="text-4xl font-black" style={{ color: gradeColor }}>{gradeLabel}</span>
                  <p className="text-sm text-muted-foreground mt-1">{gradeText} · {result.totalStaff} staff members</p>
                </div>
                <div className="grid grid-cols-2 gap-3 w-full mt-1">
                  {[
                    { label: "Activity",   score: result.actScore,  icon: <Zap className="w-3 h-3" />         },
                    { label: "Discipline", score: result.discScore, icon: <Shield className="w-3 h-3" />      },
                    { label: "Retention",  score: result.retScore,  icon: <Users className="w-3 h-3" />       },
                    { label: "Engagement", score: result.engScore,  icon: <Star className="w-3 h-3" />        },
                  ].map(m => (
                    <div key={m.label} className="rounded-xl p-3 border border-border bg-muted/20">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">{m.icon}{m.label}</div>
                      <div className="text-lg font-bold">{m.score}<span className="text-xs text-muted-foreground font-normal">/100</span></div>
                      <div className="mt-1.5 h-1.5 rounded-full bg-muted">
                        <div className="h-1.5 rounded-full transition-all" style={{ width: `${m.score}%`, background: m.score >= 70 ? "#22c55e" : m.score >= 50 ? GOLD : "#ef4444" }} />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <h3 className="text-sm font-bold mb-4 flex items-center gap-2"><Target className="w-4 h-4" style={{ color: GOLD }} />Team Intelligence Radar</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <RadarChart data={result.radarData}>
                    <PolarGrid stroke="rgba(255,255,255,0.07)" />
                    <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: "rgba(255,255,255,0.5)" }} />
                    <Radar name="Score" dataKey="A" stroke={GOLD} fill={GOLD} fillOpacity={0.15} strokeWidth={2} />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Metric Bar Chart */}
          <Card>
            <CardContent className="p-5">
              <h3 className="text-sm font-bold mb-4">Staff Distribution Snapshot</h3>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={result.barData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: "rgba(255,255,255,0.4)" }} />
                  <YAxis tick={{ fontSize: 10, fill: "rgba(255,255,255,0.4)" }} allowDecimals={false} />
                  <Tooltip contentStyle={{ background: "#1a1d23", border: "1px solid rgba(255,255,255,.1)", borderRadius: 8, fontSize: 11 }} />
                  <Bar dataKey="value" radius={[4,4,0,0]}>
                    {result.barData.map((d: any, i: number) => (
                      <rect key={i} fill={d.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* AI Narrative */}
          <Card style={{ borderColor: "rgba(212,175,55,.2)", background: "rgba(212,175,55,.03)" }}>
            <CardContent className="p-6 space-y-4">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <Brain className="w-4 h-4" style={{ color: GOLD }} />
                Intelligence Narrative
                <span className="text-[10px] text-muted-foreground font-normal ml-1">Generated by Zenith AI · {new Date().toLocaleDateString()}</span>
              </h3>
              {buildNarrative(result).map((para, i) => (
                <p key={i} className="text-sm text-muted-foreground leading-relaxed">{para}</p>
              ))}
            </CardContent>
          </Card>

          {/* Action Items */}
          <Card>
            <CardContent className="p-5">
              <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                Recommended Actions
              </h3>
              <div className="space-y-2">
                {buildActions(result).map((a, i) => (
                  <a key={i} href={`/dashboard/${guildId}/${a.link}`}
                    className="flex items-center gap-3 p-3 rounded-xl border hover:bg-muted/30 transition-colors cursor-pointer"
                    style={{ borderColor: a.priority === "high" ? "rgba(239,68,68,.3)" : a.priority === "medium" ? "rgba(212,175,55,.25)" : "rgba(34,197,94,.25)" }}>
                    <div className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ background: a.priority === "high" ? "#ef4444" : a.priority === "medium" ? GOLD : "#22c55e" }} />
                    <span className="text-sm flex-1">{a.text}</span>
                    {a.link !== "overview" && <ArrowRight className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />}
                    {a.link === "overview" && <CheckCircle className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />}
                  </a>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
