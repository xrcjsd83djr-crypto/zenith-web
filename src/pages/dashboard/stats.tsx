import { useGetGuildStats, useGetActivityLeaderboard, useListActivity, useListStaff } from "@/lib/api-client";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line, Area, AreaChart
} from "recharts";
import { Users, AlertTriangle, Clock, TrendingUp, Activity, MessageSquare, Mic, UserCheck } from "lucide-react";

interface StatsPageProps { guildId: string; }

const COLORS = ["#5BA4CF", "#F5B800", "#10b981", "#f43f5e", "#8b5cf6", "#06b6d4"];

export default function StatsPage({ guildId }: StatsPageProps) {
  const { data: stats, isLoading: statsLoading } = useGetGuildStats(guildId, { query: { enabled: !!guildId, queryKey: [`/api/guilds/${guildId}/stats`] } });
  const { data: leaderboard = [], isLoading: lbLoading } = useGetActivityLeaderboard(guildId, { query: { enabled: !!guildId, queryKey: [`/api/guilds/${guildId}/activity/leaderboard`] } });
  const { data: logs = [], isLoading: logsLoading } = useListActivity(guildId, { query: { enabled: !!guildId, queryKey: [`/api/guilds/${guildId}/activity`] } });
  const { data: staff = [], isLoading: staffLoading } = useListStaff(guildId, { query: { enabled: !!guildId, queryKey: [`/api/guilds/${guildId}/staff`] } });

  const isLoading = statsLoading || lbLoading || logsLoading || staffLoading;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
        <div className="grid grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="h-28 bg-white rounded-2xl border border-gray-100 animate-pulse" />)}
        </div>
        <div className="grid grid-cols-2 gap-6">
          {[1,2].map(i => <div key={i} className="h-72 bg-white rounded-2xl border border-gray-100 animate-pulse" />)}
        </div>
      </div>
    );
  }

  const activityByType = (logs as any[]).reduce((acc: any, log: any) => {
    acc[log.type] = (acc[log.type] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const activityPieData = Object.entries(activityByType).map(([name, value]) => ({ name, value }));

  const activityByDay: Record<string, number> = {};
  for (const log of logs as any[]) {
    const day = new Date(log.createdAt).toLocaleDateString("en-US", { weekday: "short" });
    activityByDay[day] = (activityByDay[day] ?? 0) + 1;
  }
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const activityBarData = days.map(d => ({ day: d, logs: activityByDay[d] ?? 0 }));

  const staffByStatus = (staff as any[]).reduce((acc: any, m: any) => {
    acc[m.status] = (acc[m.status] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const staffPieData = Object.entries(staffByStatus).map(([name, value]) => ({ name, value }));

  const top5 = (leaderboard as any[]).slice(0, 5);
  const leaderboardBarData = top5.map((e: any) => ({
    name: e.username?.slice(0, 10) ?? "Unknown",
    score: e.score,
    messages: e.messageCount,
    voice: e.voiceMinutes,
  }));

  const kpiCards = [
    { label: "Total Staff", value: stats?.totalStaff ?? 0, icon: <Users className="w-5 h-5" />, color: "text-blue-500", bg: "bg-blue-50" },
    { label: "Active", value: stats?.activeStaff ?? 0, icon: <UserCheck className="w-5 h-5" />, color: "text-emerald-500", bg: "bg-emerald-50" },
    { label: "On LOA", value: stats?.activeLoa ?? 0, icon: <Clock className="w-5 h-5" />, color: "text-amber-500", bg: "bg-amber-50" },
    { label: "Active Strikes", value: stats?.activeStrikes ?? 0, icon: <AlertTriangle className="w-5 h-5" />, color: "text-red-500", bg: "bg-red-50" },
    { label: "Pending Apps", value: stats?.pendingApplications ?? 0, icon: <TrendingUp className="w-5 h-5" />, color: "text-purple-500", bg: "bg-purple-50" },
    { label: "Recent Hires", value: stats?.recentHires ?? 0, icon: <Activity className="w-5 h-5" />, color: "text-cyan-500", bg: "bg-cyan-50" },
    { label: "Avg Activity", value: `${stats?.avgActivityScore ?? 0} pts`, icon: <MessageSquare className="w-5 h-5" />, color: "text-indigo-500", bg: "bg-indigo-50" },
    { label: "Voice Mins", value: top5.reduce((a: number, e: any) => a + (e.voiceMinutes ?? 0), 0), icon: <Mic className="w-5 h-5" />, color: "text-rose-500", bg: "bg-rose-50" },
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Statistics</h1>
        <p className="text-gray-500 mt-1">A deep dive into your server's performance.</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {kpiCards.map((card, i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 flex items-center gap-4">
            <div className={`p-2.5 rounded-xl ${card.bg} ${card.color} flex-shrink-0`}>{card.icon}</div>
            <div>
              <div className="text-2xl font-extrabold text-gray-900">{card.value}</div>
              <div className="text-xs font-medium text-gray-500">{card.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <h3 className="text-base font-bold text-gray-900 mb-4">Activity This Week</h3>
          {activityBarData.every(d => d.logs === 0) ? (
            <div className="h-56 flex items-center justify-center text-gray-400 text-sm">No activity data this week</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={activityBarData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="day" tick={{ fontSize: 12, fill: "#6b7280" }} />
                <YAxis tick={{ fontSize: 12, fill: "#6b7280" }} />
                <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb", fontSize: 12 }} />
                <Bar dataKey="logs" fill="#5BA4CF" radius={[4, 4, 0, 0]} name="Activity Logs" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <h3 className="text-base font-bold text-gray-900 mb-4">Top 5 Activity Scores</h3>
          {leaderboardBarData.length === 0 ? (
            <div className="h-56 flex items-center justify-center text-gray-400 text-sm">No leaderboard data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={leaderboardBarData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#6b7280" }} />
                <YAxis tick={{ fontSize: 12, fill: "#6b7280" }} />
                <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb", fontSize: 12 }} />
                <Bar dataKey="score" fill="#5BA4CF" radius={[4, 4, 0, 0]} name="Score" />
                <Bar dataKey="messages" fill="#F5B800" radius={[4, 4, 0, 0]} name="Messages" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <h3 className="text-base font-bold text-gray-900 mb-4">Activity by Type</h3>
          {activityPieData.length === 0 ? (
            <div className="h-56 flex items-center justify-center text-gray-400 text-sm">No activity data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={activityPieData} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3} dataKey="value">
                  {activityPieData.map((_: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb", fontSize: 12 }} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <h3 className="text-base font-bold text-gray-900 mb-4">Staff by Status</h3>
          {staffPieData.length === 0 ? (
            <div className="h-56 flex items-center justify-center text-gray-400 text-sm">No staff data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={staffPieData} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3} dataKey="value">
                  {staffPieData.map((_: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb", fontSize: 12 }} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
        <h3 className="text-base font-bold text-gray-900 mb-4">Recent Activity Feed</h3>
        {(logs as any[]).length === 0 ? (
          <div className="text-center py-10 text-gray-400 text-sm">No activity logs yet. Activity will appear here once your bot is set up.</div>
        ) : (
          <div className="divide-y divide-gray-50">
            {(logs as any[]).slice(0, 15).map((log: any) => (
              <div key={log.id} className="py-3 flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold flex-shrink-0">
                  {(log.username ?? "?").charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-gray-900">{log.username}</div>
                  <div className="text-sm text-gray-600">{log.description}</div>
                </div>
                <div className="text-xs text-gray-400 flex-shrink-0">
                  {new Date(log.createdAt).toLocaleDateString()}
                </div>
                <span className="text-xs font-medium bg-gray-100 text-gray-600 rounded-full px-2 py-0.5 flex-shrink-0">{log.type}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
