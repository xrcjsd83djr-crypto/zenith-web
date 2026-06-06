import { useState, useEffect } from "react";
  import { Card, CardContent } from "@/components/ui/card";
  import { Badge } from "@/components/ui/badge";
  import { Button } from "@/components/ui/button";
  import { Activity, TrendingUp, TrendingDown, AlertTriangle, Users, Shield, Star, RefreshCw, ChevronRight } from "lucide-react";
  import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
  import { Link } from "wouter";

  function ScoreRing({ score, size = 160 }: { score: number; size?: number }) {
    const r = (size - 20) / 2;
    const circ = 2 * Math.PI * r;
    const pct = Math.max(0, Math.min(100, score)) / 100;
    const color = score >= 80 ? "#22c55e" : score >= 60 ? "#d4af37" : score >= 40 ? "#f97316" : "#ef4444";
    return (
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,.07)" strokeWidth="12" />
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="12"
            strokeDasharray={circ} strokeDashoffset={circ * (1 - pct)}
            strokeLinecap="round" style={{ transition: "stroke-dashoffset 1s ease" }} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center rotate-0">
          <span className="text-4xl font-black" style={{ color }}>{score}</span>
          <span className="text-xs text-muted-foreground font-medium">/ 100</span>
        </div>
      </div>
    );
  }

  function getGrade(score: number) {
    if (score >= 90) return { grade: "A+", label: "Excellent", color: "#22c55e" };
    if (score >= 80) return { grade: "A",  label: "Great",     color: "#22c55e" };
    if (score >= 70) return { grade: "B",  label: "Good",      color: "#84cc16" };
    if (score >= 60) return { grade: "C",  label: "Average",   color: "#d4af37" };
    if (score >= 40) return { grade: "D",  label: "Needs Work",color: "#f97316" };
    return                   { grade: "F",  label: "Critical",  color: "#ef4444" };
  }

  export default function StaffHealthPage({ guildId }: { guildId: string }) {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    async function loadData() {
      try {
        const [statsRes, strikesRes, loaRes, leaderboardRes] = await Promise.all([
          fetch(`/api/guilds/${guildId}/stats`, { credentials: "include" }),
          fetch(`/api/guilds/${guildId}/strikes`, { credentials: "include" }),
          fetch(`/api/guilds/${guildId}/loa`, { credentials: "include" }),
          fetch(`/api/guilds/${guildId}/activity/leaderboard`, { credentials: "include" }),
        ]);
        const stats = statsRes.ok ? await statsRes.json() : {};
        const strikes = strikesRes.ok ? await strikesRes.json() : [];
        const loas = loaRes.ok ? await loaRes.json() : [];
        const leaderboard = leaderboardRes.ok ? await leaderboardRes.json() : [];

        const totalStaff = stats.totalStaff || 1;
        const activeStaff = stats.activeStaff || 0;
        const activeStrikes = (strikes as any[]).filter((s: any) => s.active).length;
        const activeLoas = (loas as any[]).filter((l: any) => l.status === "active").length;
        const avgScore = stats.avgActivityScore || 0;

        const activityScore  = Math.round((activeStaff / totalStaff) * 100);
        const disciplineScore = Math.max(0, 100 - (activeStrikes / totalStaff) * 50);
        const retentionScore = Math.max(0, 100 - (activeLoas / totalStaff) * 40);
        const engagementScore = Math.min(100, avgScore * 2);
        const overall = Math.round((activityScore * 0.35 + disciplineScore * 0.25 + retentionScore * 0.2 + engagementScore * 0.2));

        const radarData = [
          { subject: "Activity",    A: activityScore },
          { subject: "Discipline",  A: Math.round(disciplineScore) },
          { subject: "Retention",   A: Math.round(retentionScore) },
          { subject: "Engagement",  A: Math.round(engagementScore) },
          { subject: "Growth",      A: Math.min(100, stats.recentHires * 20 || 50) },
        ];

        const recommendations: { text: string; link: string; severity: "high"|"medium"|"low" }[] = [];
        if (activityScore < 50) recommendations.push({ text: `Only ${activeStaff}/${totalStaff} staff active — review activity requirements`, link: `/dashboard/${guildId}/activity`, severity: "high" });
        if (activeStrikes > 3) recommendations.push({ text: `${activeStrikes} active strikes — consider disciplinary review`, link: `/dashboard/${guildId}/strikes`, severity: "high" });
        if (activeLoas > totalStaff * 0.3) recommendations.push({ text: `${activeLoas} staff on LOA — capacity may be impacted`, link: `/dashboard/${guildId}/loa`, severity: "medium" });
        if (stats.pendingApplications > 0) recommendations.push({ text: `${stats.pendingApplications} applications pending review`, link: `/dashboard/${guildId}/applications`, severity: "low" });

        setData({ overall, activityScore: Math.round(activityScore), disciplineScore: Math.round(disciplineScore), retentionScore: Math.round(retentionScore), engagementScore: Math.round(engagementScore), radarData, recommendations, stats, totalStaff, activeStaff, activeStrikes, activeLoas });
      } catch (e) { console.error(e); }
      finally { setLoading(false); setRefreshing(false); }
    }

    useEffect(() => { if (guildId) loadData(); }, [guildId]);
    const refresh = () => { setRefreshing(true); loadData(); };

    if (loading) return (
      <div className="space-y-6">
        <div className="h-8 w-64 bg-muted/40 rounded animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[1,2,3].map(i => <div key={i} className="h-48 bg-muted/30 rounded-2xl animate-pulse" />)}
        </div>
      </div>
    );

    if (!data) return <div className="text-muted-foreground text-sm">Failed to load health data.</div>;
    const { grade, label, color: gradeColor } = getGrade(data.overall);

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight flex items-center gap-2">
              <Activity className="w-6 h-6" style={{ color: "#d4af37" }} /> Staff Health Score
            </h1>
            <p className="text-muted-foreground text-sm mt-0.5">Real-time health analysis of your staff team.</p>
          </div>
          <Button variant="outline" size="sm" onClick={refresh} disabled={refreshing} className="gap-2">
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>

        {/* Main Score + Radar */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <Card className="bg-card border-border">
            <CardContent className="p-6 flex flex-col items-center justify-center gap-4">
              <ScoreRing score={data.overall} />
              <div className="text-center">
                <span className="text-3xl font-black" style={{ color: gradeColor }}>{grade}</span>
                <p className="text-sm text-muted-foreground mt-1">{label} — {data.totalStaff} staff members</p>
              </div>
              <div className="grid grid-cols-2 gap-3 w-full mt-2">
                {[
                  { label: "Activity",   score: data.activityScore,   icon: <Activity className="w-3.5 h-3.5" /> },
                  { label: "Discipline", score: data.disciplineScore, icon: <Shield className="w-3.5 h-3.5" /> },
                  { label: "Retention",  score: data.retentionScore,  icon: <Users className="w-3.5 h-3.5" /> },
                  { label: "Engagement", score: data.engagementScore, icon: <Star className="w-3.5 h-3.5" /> },
                ].map(m => (
                  <div key={m.label} className="rounded-xl p-3 border border-border bg-background/50">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">{m.icon} {m.label}</div>
                    <div className="text-xl font-bold">{m.score}<span className="text-xs text-muted-foreground font-normal">/100</span></div>
                    <div className="mt-1.5 h-1.5 rounded-full bg-muted">
                      <div className="h-1.5 rounded-full transition-all" style={{ width: `${m.score}%`, background: m.score >= 70 ? "#22c55e" : m.score >= 50 ? "#d4af37" : "#ef4444" }} />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="p-6">
              <h3 className="text-sm font-bold mb-4">Performance Radar</h3>
              <ResponsiveContainer width="100%" height={220}>
                <RadarChart data={data.radarData}>
                  <PolarGrid stroke="rgba(255,255,255,0.08)" />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: "rgba(255,255,255,0.5)" }} />
                  <Radar name="Score" dataKey="A" stroke="#d4af37" fill="#d4af37" fillOpacity={0.15} strokeWidth={2} />
                </RadarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Recommendations */}
        {data.recommendations.length > 0 && (
          <Card className="bg-card border-border">
            <CardContent className="p-5">
              <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" /> Action Recommendations
              </h3>
              <div className="space-y-2">
                {data.recommendations.map((r: any, i: number) => (
                  <Link key={i} href={r.link}>
                    <div className="flex items-center gap-3 p-3 rounded-xl border cursor-pointer hover:bg-muted/30 transition-colors"
                      style={{ borderColor: r.severity === "high" ? "rgba(239,68,68,.3)" : r.severity === "medium" ? "rgba(251,146,60,.3)" : "rgba(212,175,55,.2)" }}>
                      <div className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ background: r.severity === "high" ? "#ef4444" : r.severity === "medium" ? "#f97316" : "#d4af37" }} />
                      <span className="text-sm flex-1">{r.text}</span>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {data.recommendations.length === 0 && (
          <Card className="bg-card border-border">
            <CardContent className="p-6 text-center">
              <div className="text-4xl mb-2">🎉</div>
              <p className="font-semibold">Everything looks great!</p>
              <p className="text-sm text-muted-foreground mt-1">No critical issues detected in your staff team.</p>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }
  