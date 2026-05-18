import { useState, useEffect } from "react";
  import { Users, FileText, AlertTriangle, Clock, TrendingUp, UserPlus, Activity, Star, LayoutDashboard } from "lucide-react";
  import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
  import { Link } from "wouter";
  import { Card, CardContent } from "@/components/ui/card";

  const DEFAULT_STATS = {
    totalStaff: 0, activeStaff: 0, pendingApplications: 0, activeStrikes: 0,
    activeLoa: 0, recentPromotions: 0, recentHires: 0, avgActivityScore: 0,
  };

  export default function OverviewPage({ guildId }: { guildId: string }) {
    const [stats, setStats] = useState<any>(DEFAULT_STATS);
    const [leaderboard, setLeaderboard] = useState<any[]>([]);
    const [strikes, setStrikes] = useState<any[]>([]);
    const [loas, setLoas] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
      if (!guildId) return;
      const fetchData = async () => {
        try {
          const [statsRes, leaderboardRes, strikesRes, loasRes] = await Promise.all([
            fetch(`/api/guilds/${guildId}/stats`, { credentials: 'include' }),
            fetch(`/api/guilds/${guildId}/activity/leaderboard`, { credentials: 'include' }),
            fetch(`/api/guilds/${guildId}/strikes`, { credentials: 'include' }),
            fetch(`/api/guilds/${guildId}/loa`, { credentials: 'include' }),
          ]);
          if (statsRes.ok) { const d = await statsRes.json(); setStats({ ...DEFAULT_STATS, ...d }); }
          if (leaderboardRes.ok) setLeaderboard(await leaderboardRes.json());
          if (strikesRes.ok) setStrikes(await strikesRes.json());
          if (loasRes.ok) setLoas(await loasRes.json());
        } catch (e) {
          console.error("Overview fetch failed:", e);
        } finally {
          setIsLoading(false);
        }
      };
      fetchData();
    }, [guildId]);

    const statCards = [
      { label: "Total Staff",    value: stats.totalStaff ?? 0,          icon: <Users className="w-4 h-4" />,         color: "text-blue-500",    bg: "bg-blue-50" },
      { label: "Active Staff",   value: stats.activeStaff ?? 0,         icon: <Activity className="w-4 h-4" />,      color: "text-emerald-500", bg: "bg-emerald-50" },
      { label: "Pending Apps",   value: stats.pendingApplications ?? 0, icon: <FileText className="w-4 h-4" />,      color: "text-purple-500",  bg: "bg-purple-50" },
      { label: "Active Strikes", value: stats.activeStrikes ?? 0,       icon: <AlertTriangle className="w-4 h-4" />, color: "text-red-500",     bg: "bg-red-50" },
      { label: "On LOA",         value: stats.activeLoa ?? 0,           icon: <Clock className="w-4 h-4" />,         color: "text-amber-500",   bg: "bg-amber-50" },
      { label: "Recent Promos",  value: stats.recentPromotions ?? 0,    icon: <TrendingUp className="w-4 h-4" />,    color: "text-emerald-500", bg: "bg-emerald-50" },
      { label: "Recent Hires",   value: stats.recentHires ?? 0,         icon: <UserPlus className="w-4 h-4" />,      color: "text-cyan-500",    bg: "bg-cyan-50" },
      { label: "Avg Activity",   value: `${stats.avgActivityScore ?? 0}pts`, icon: <Star className="w-4 h-4" />,   color: "text-yellow-500",  bg: "bg-yellow-50" },
    ];

    const top5 = leaderboard.slice(0, 5);
    const chartData = top5.map((e: any) => ({ name: (e.username ?? "?").slice(0, 8), score: e.score ?? 0 }));
    const recentStrikes = strikes.filter((s: any) => s.active).slice(0, 5);
    const pendingLoas = loas.filter((l: any) => l.status === "pending").slice(0, 5);

    if (isLoading) {
      return (
        <div className="space-y-6">
          <div className="h-8 w-48 bg-muted/60 rounded animate-pulse" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[1,2,3,4,5,6,7,8].map(i => <div key={i} className="h-24 bg-muted/40 rounded-2xl animate-pulse" />)}
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-5">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight flex items-center gap-2">
            <LayoutDashboard className="w-6 h-6" style={{ color: '#d4af37' }} /> Overview
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">Your server's staff health at a glance.</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {statCards.map((stat, i) => (
            <Card key={i} className="border-border bg-white shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className={`inline-flex p-2 rounded-xl ${stat.bg} ${stat.color} mb-3`}>{stat.icon}</div>
                <div className="text-2xl font-extrabold text-foreground">{stat.value}</div>
                <div className="text-xs font-medium text-muted-foreground mt-0.5">{stat.label}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <Card className="lg:col-span-2 border-border bg-white shadow-sm">
            <CardContent className="p-5">
              <h3 className="text-sm font-bold mb-4">Activity Leaderboard</h3>
              {chartData.length === 0 ? (
                <div className="h-52 flex flex-col items-center justify-center text-muted-foreground border-2 border-dashed border-muted rounded-xl">
                  <Activity className="w-8 h-8 mb-2 opacity-40" />
                  <p className="text-sm font-medium">No activity logged yet</p>
                  <p className="text-xs mt-1">Activity appears once your bot is connected</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={210}>
                  <BarChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#6b7280" }} />
                    <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} />
                    <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb", fontSize: 12 }} />
                    <Bar dataKey="score" fill="#d4af37" radius={[4, 4, 0, 0]} name="Activity Score" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Card className="border-border bg-white shadow-sm">
              <CardContent className="p-5">
                <h3 className="text-sm font-bold mb-3 flex items-center justify-between">
                  Needs Attention
                  {(stats.pendingApplications > 0 || stats.activeStrikes > 5) && (
                    <span className="text-[10px] font-bold rounded-full px-2 py-0.5 bg-red-50 text-red-500">
                      {stats.pendingApplications + (stats.activeStrikes > 5 ? 1 : 0)} items
                    </span>
                  )}
                </h3>
                <div className="space-y-2">
                  {stats.pendingApplications > 0 && (
                    <Link href={`/dashboard/${guildId}/applications`}>
                      <div className="flex items-start gap-2 p-2.5 rounded-lg bg-orange-50 border border-orange-100 text-orange-800 hover:bg-orange-100 transition-colors cursor-pointer">
                        <FileText className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-orange-500" />
                        <div className="text-xs font-medium">{stats.pendingApplications} pending application{stats.pendingApplications !== 1 ? "s" : ""}</div>
                      </div>
                    </Link>
                  )}
                  {stats.activeStrikes > 5 && (
                    <Link href={`/dashboard/${guildId}/strikes`}>
                      <div className="flex items-start gap-2 p-2.5 rounded-lg bg-red-50 border border-red-100 text-red-800 hover:bg-red-100 transition-colors cursor-pointer">
                        <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-red-500" />
                        <div className="text-xs font-medium">High strike count ({stats.activeStrikes})</div>
                      </div>
                    </Link>
                  )}
                  {stats.activeLoa > 0 && (
                    <Link href={`/dashboard/${guildId}/loa`}>
                      <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-50 border border-amber-100 text-amber-800 hover:bg-amber-100 transition-colors cursor-pointer">
                        <Clock className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-amber-500" />
                        <div className="text-xs font-medium">{stats.activeLoa} active LOA{stats.activeLoa !== 1 ? "s" : ""}</div>
                      </div>
                    </Link>
                  )}
                  {stats.pendingApplications === 0 && stats.activeStrikes <= 5 && stats.activeLoa === 0 && (
                    <div className="text-center py-6 text-muted-foreground text-xs">Everything looks good!</div>
                  )}
                </div>
              </CardContent>
            </Card>

            {recentStrikes.length > 0 && (
              <Card className="border-border bg-white shadow-sm">
                <CardContent className="p-5">
                  <h3 className="text-sm font-bold mb-3">Recent Strikes</h3>
                  <div className="space-y-2">
                    {recentStrikes.map((s: any) => (
                      <div key={s.id} className="flex items-center gap-2">
                        <AlertTriangle className="w-3 h-3 text-red-400 flex-shrink-0" />
                        <span className="text-xs truncate flex-1">{s.username}</span>
                        <span className="text-[10px] text-muted-foreground">{new Date(s.created_at).toLocaleDateString()}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {pendingLoas.length > 0 && (
              <Card className="border-border bg-white shadow-sm">
                <CardContent className="p-5">
                  <h3 className="text-sm font-bold mb-3">Pending LOAs</h3>
                  <div className="space-y-2">
                    {pendingLoas.map((l: any) => (
                      <div key={l.id} className="flex items-center gap-2">
                        <Clock className="w-3 h-3 text-amber-400 flex-shrink-0" />
                        <span className="text-xs truncate flex-1">{l.username}</span>
                        <span className="text-[10px] text-muted-foreground">{new Date(l.end_date || l.endDate).toLocaleDateString()}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    );
  }
  