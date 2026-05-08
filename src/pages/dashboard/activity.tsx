import { useGetActivityLeaderboard, useListActivity } from "@workspace/api-client-react";
import { Trophy, ActivitySquare, MessageSquare, Mic, TrendingUp } from "lucide-react";

interface ActivityPageProps { guildId: string; }

export default function ActivityPage({ guildId }: ActivityPageProps) {
  const { data: leaderboard = [], isLoading: lbLoading } = useGetActivityLeaderboard(guildId);
  const { data: logs = [], isLoading: logsLoading } = useListActivity(guildId);

  const isLoading = lbLoading || logsLoading;

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1,2,3].map(i => <div key={i} className="h-16 bg-white rounded-xl border border-gray-100 animate-pulse" />)}
      </div>
    );
  }

  const MEDAL_COLORS = ["text-yellow-500", "text-gray-400", "text-amber-700"];
  const MEDAL = ["🥇", "🥈", "🥉"];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Activity Tracking</h1>
        <p className="text-gray-500 text-sm mt-1">Staff activity leaderboard and recent logs</p>
      </div>

      <div className="grid lg:grid-cols-[1fr_340px] gap-6">
        {/* Leaderboard */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-primary" />
            <h2 className="font-bold text-gray-900">Activity Leaderboard</h2>
          </div>
          {(leaderboard as any[]).length === 0 ? (
            <div className="py-20 text-center">
              <TrendingUp className="w-10 h-10 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No activity data yet</p>
              <p className="text-gray-400 text-sm mt-1">Activity will be tracked once the bot is configured</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {(leaderboard as any[]).map((e: any, i: number) => (
                <div key={e.userId} className={`px-6 py-4 flex items-center gap-4 ${i < 3 ? "bg-gradient-to-r from-gray-50/80 to-transparent" : ""} hover:bg-gray-50/50 transition-colors`}>
                  <div className="w-8 text-center">
                    {i < 3 ? (
                      <span className="text-2xl">{MEDAL[i]}</span>
                    ) : (
                      <span className="text-sm font-bold text-gray-400">#{e.rank}</span>
                    )}
                  </div>
                  {e.avatar ? (
                    <img src={`https://cdn.discordapp.com/avatars/${e.userId}/${e.avatar}.webp?size=64`} alt={e.username} className="w-10 h-10 rounded-full ring-2 ring-white shadow-sm" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold shadow-sm">
                      {e.username.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-gray-900 text-sm">{e.username}</div>
                    {e.rankName && <div className="text-xs text-gray-400">{e.rankName}</div>}
                  </div>
                  <div className="flex gap-4 text-right">
                    <div>
                      <div className="text-xs text-gray-400 flex items-center gap-1 justify-end"><MessageSquare className="w-3 h-3" /> Messages</div>
                      <div className="font-bold text-sm text-gray-900">{e.messageCount.toLocaleString()}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-400 flex items-center gap-1 justify-end"><Mic className="w-3 h-3" /> Voice min</div>
                      <div className="font-bold text-sm text-gray-900">{e.voiceMinutes.toLocaleString()}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-400 flex items-center gap-1 justify-end"><TrendingUp className="w-3 h-3" /> Score</div>
                      <div className={`font-extrabold text-sm ${i < 3 ? MEDAL_COLORS[i] : "text-primary"}`}>{e.score.toLocaleString()}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Logs */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
            <ActivitySquare className="w-4 h-4 text-primary" />
            <h2 className="font-bold text-gray-900 text-sm">Recent Activity</h2>
          </div>
          {(logs as any[]).length === 0 ? (
            <div className="py-16 text-center px-4">
              <ActivitySquare className="w-8 h-8 text-gray-200 mx-auto mb-2" />
              <p className="text-gray-400 text-sm">No activity logs</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 overflow-y-auto max-h-[480px]">
              {(logs as any[]).slice(0, 30).map((l: any) => (
                <div key={l.id} className="px-5 py-3 flex items-start gap-3">
                  <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${l.type === "message" ? "bg-primary" : l.type === "voice" ? "bg-emerald-500" : "bg-gray-400"}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{l.username}</p>
                    <p className="text-xs text-gray-500 truncate">{l.description}</p>
                  </div>
                  <span className="text-[10px] text-gray-300 flex-shrink-0">{new Date(l.createdAt).toLocaleTimeString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
