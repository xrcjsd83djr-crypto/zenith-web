import { useGetGuildStats, getGetGuildStatsQueryKey } from "@workspace/api-client-react";
import { Users, FileText, AlertTriangle, Clock, TrendingUp, UserPlus, Activity } from "lucide-react";

export default function OverviewPage({ guildId }: { guildId: string }) {
  const { data: stats, isLoading } = useGetGuildStats(guildId, {
    query: {
      enabled: !!guildId,
      queryKey: getGetGuildStatsQueryKey(guildId)
    }
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1,2,3,4].map(i => <div key={i} className="h-32 bg-white rounded-2xl border border-gray-100 animate-pulse" />)}
        </div>
      </div>
    );
  }

  if (!stats) return null;

  const statCards = [
    { label: "Total Staff", value: stats.totalStaff, icon: <Users className="w-5 h-5" />, color: "text-blue-500", bg: "bg-blue-50" },
    { label: "Active Staff", value: stats.activeStaff, icon: <Activity className="w-5 h-5" />, color: "text-green-500", bg: "bg-green-50" },
    { label: "Pending Apps", value: stats.pendingApplications, icon: <FileText className="w-5 h-5" />, color: "text-purple-500", bg: "bg-purple-50" },
    { label: "Active Strikes", value: stats.activeStrikes, icon: <AlertTriangle className="w-5 h-5" />, color: "text-red-500", bg: "bg-red-50" },
    { label: "Active LOA", value: stats.activeLoa, icon: <Clock className="w-5 h-5" />, color: "text-orange-500", bg: "bg-orange-50" },
    { label: "Recent Promos", value: stats.recentPromotions, icon: <TrendingUp className="w-5 h-5" />, color: "text-emerald-500", bg: "bg-emerald-50" },
    { label: "Recent Hires", value: stats.recentHires, icon: <UserPlus className="w-5 h-5" />, color: "text-cyan-500", bg: "bg-cyan-50" },
    { label: "Avg Activity", value: `${stats.avgActivityScore} pts`, icon: <Star className="w-5 h-5" />, color: "text-yellow-500", bg: "bg-yellow-50" },
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Overview</h1>
        <p className="text-gray-500 mt-1">A quick glance at your server's staff health.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
            <div className={`absolute -right-4 -top-4 w-24 h-24 ${stat.bg} rounded-full mix-blend-multiply opacity-50 group-hover:scale-110 transition-transform duration-500`} />
            <div className="flex items-center justify-between mb-4">
              <div className={`p-2.5 rounded-xl ${stat.bg} ${stat.color}`}>
                {stat.icon}
              </div>
            </div>
            <div>
              <div className="text-3xl font-extrabold text-gray-900">{stat.value}</div>
              <div className="text-sm font-medium text-gray-500 mt-1">{stat.label}</div>
            </div>
          </div>
        ))}
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Activity Trend</h3>
          <div className="h-64 flex items-center justify-center border-2 border-dashed border-gray-100 rounded-xl bg-gray-50/50">
            <p className="text-gray-400 text-sm font-medium">Chart visualization available in Premium</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Needs Attention</h3>
          <div className="space-y-4">
            {stats.pendingApplications > 0 && (
              <div className="flex items-start gap-3 p-3 rounded-lg bg-orange-50 border border-orange-100 text-orange-800">
                <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5 text-orange-500" />
                <div className="text-sm font-medium">You have {stats.pendingApplications} pending applications waiting for review.</div>
              </div>
            )}
            {stats.activeStrikes > 5 && (
              <div className="flex items-start gap-3 p-3 rounded-lg bg-red-50 border border-red-100 text-red-800">
                <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-500" />
                <div className="text-sm font-medium">High number of active strikes. Consider reviewing staff performance.</div>
              </div>
            )}
            {stats.pendingApplications === 0 && stats.activeStrikes <= 5 && (
              <div className="text-center py-8 text-gray-500 text-sm">
                Everything looks good!
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

import { Star } from "lucide-react";