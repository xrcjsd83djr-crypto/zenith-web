import { useState, useEffect } from "react";
import { Users, FileText, AlertTriangle, Clock, TrendingUp, UserPlus, Activity, Star } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Link } from "wouter";

export default function OverviewPage({ guildId }: { guildId: string }) {
  const [stats, setStats] = useState<any>(null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [strikes, setStrikes] = useState<any[]>([]);
  const [loas, setLoas] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, leaderboardRes, strikesRes, loasRes] = await Promise.all([
          fetch(`/api/guilds/${guildId}/stats`),
          fetch(`/api/guilds/${guildId}/activity/leaderboard`),
          fetch(`/api/guilds/${guildId}/strikes`),
          fetch(`/api/guilds/${guildId}/loa`),
        ]);

        if (statsRes.ok) setStats(await statsRes.json());
        if (leaderboardRes.ok) setLeaderboard(await leaderboardRes.json());
        if (strikesRes.ok) setStrikes(await strikesRes.json());
        if (loasRes.ok) setLoas(await loasRes.json());
      } catch (error) {
        console.error("Failed to fetch overview data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (guildId) {
      fetchData();
    }
  }, [guildId]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="h-28 bg-white rounded-2xl border border-gray-100 animate-pulse" />)}
        </div>
      </div>
    );
  }

  if (!stats) return null;

  const statCards = [
    { label: "Total Staff", value: stats.totalStaff, icon: <Users className="w-4 h-4" />, color: "text-blue-500", bg: "bg-blue-50" },
    { label: "Active Staff", value: stats.activeStaff, icon: <Activity className="w-4 h-4" />, color: "text-emerald-500", bg: "bg-emerald-50" },
    { label: "Pending Apps", value: stats.pendingApplications, icon: <FileText className="w-4 h-4" />, color: "text-purple-500", bg: "bg-purple-50" },
    { label: "Active Strikes", value: stats.activeStrikes, icon: <AlertTriangle className="w-4 h-4" />, color: "text-red-500", bg: "bg-red-50" },
    { label: "On LOA", value: stats.activeLoa, icon: <Clock className="w-4 h-4" />, color: "text-amber-500", bg: "bg-amber-50" },
    { label: "Recent Promos", value: stats.recentPromotions, icon: <TrendingUp className="w-4 h-4" />, color: "text-emerald-500", bg: "bg-emerald-50" },
    { label: "Recent Hires", value: stats.recentHires, icon: <UserPlus className="w-4 h-4" />, color: "text-cyan-500", bg: "bg-cyan-50" },
    { label: "Avg Activity", value: `${stats.avgActivityScore}pts`, icon: <Star className="w-4 h-4" />, color: "text-yellow-500", bg: "bg-yellow-50" },
  ];

  const top5 = leaderboard.slice(0, 5);
  const chartData = top5.map((e: any) => ({ name: (e.username ?? "?").slice(0, 8), score: e.score }));

  const recentStrikes = strikes.filter((s: any) => s.active).slice(0, 5);
  const pendingLoas = loas.filter((l: any) => l.status === "pending").slice(0, 5);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Overview</h1>
        <p className="text-gray-500 text-sm mt-0.5">Your server's staff health at a glance.</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {statCards.map((stat, i) => (
          <div key={i} className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
            <div className={`inline-flex p-2 rounded-xl ${stat.bg} ${stat.color} mb-3`}>{stat.icon}</div>
            <div className="text-2xl font-extrabold text-gray-900">{stat.value}</div>
            <div className="text-xs font-medium text-gray-500 mt-0.5">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
          <h3 className="text-sm font-bold text-gray-900 mb-4">Activity Leaderboard</h3>
          {chartData.length === 0 ? (
            <div className="h-52 flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-gray-100 rounded-xl">
              <Activity className="w-8 h-8 mb-2 opacity-40" />
              <p className="text-sm font-medium">No activity yet</p>
              <p className="text-xs mt-1">Activity will appear once your bot is running</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={210}>
              <BarChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#6b7280" }} />
                <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} />
                <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb", fontSize: 12 }} />
                <Bar dataKey="score" fill="#5BA4CF" radius={[4, 4, 0, 0]} name="Activity Score" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
            <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center justify-between">
              Needs Attention
              {(stats.pendingApplications > 0 || stats.activeStrikes > 0) && (
                <span className="text-[10px] bg-red-50 text-red-500 font-bold rounded-full px-2 py-0.5">
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
                <div className="text-center py-6 text-gray-400 text-xs">Everything looks good!</div>
              )}
            </div>
          </div>

          {recentStrikes.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
              <h3 className="text-sm font-bold text-gray-900 mb-3">Recent Strikes</h3>
              <div className="space-y-2">
                {recentStrikes.map((s: any) => (
                  <div key={s.id} className="flex items-center gap-2">
                    <AlertTriangle className="w-3 h-3 text-red-400 flex-shrink-0" />
                    <span className="text-xs text-gray-700 truncate flex-1">{s.username}</span>
                    <span className="text-[10px] text-gray-400">{new Date(s.createdAt).toLocaleDateString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {pendingLoas.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
              <h3 className="text-sm font-bold text-gray-900 mb-3">Pending LOAs</h3>
              <div className="space-y-2">
                {pendingLoas.map((l: any) => (
                  <div key={l.id} className="flex items-center gap-2">
                    <Clock className="w-3 h-3 text-amber-400 flex-shrink-0" />
                    <span className="text-xs text-gray-700 truncate flex-1">{l.username}</span>
                    <span className="text-[10px] text-gray-400">{new Date(l.endDate).toLocaleDateString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
