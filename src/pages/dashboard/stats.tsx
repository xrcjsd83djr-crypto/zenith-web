import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, Loader2, Users, AlertTriangle, Calendar, TrendingUp, Hash, Shield } from "lucide-react";

interface Stats { staff: number; activeStrikes: number; pendingLoa: number; ranks: number; channels: number; roles: number; }

export default function StatsPage({ guildId }: { guildId: string }) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [guildInfo, setGuildInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const [staffRes, strikesRes, loaRes, ranksRes, guildRes] = await Promise.all([
        fetch(`/api/guilds/${guildId}/staff`, { credentials: 'include' }),
        fetch(`/api/guilds/${guildId}/strikes`, { credentials: 'include' }),
        fetch(`/api/guilds/${guildId}/loa`, { credentials: 'include' }),
        fetch(`/api/guilds/${guildId}/ranks`, { credentials: 'include' }),
        fetch(`/api/guilds/${guildId}/detailed`, { credentials: 'include' }),
      ]);
      const [staff, strikes, loas, ranks, guild] = await Promise.all([
        staffRes.ok ? staffRes.json() : [],
        strikesRes.ok ? strikesRes.json() : [],
        loaRes.ok ? loaRes.json() : [],
        ranksRes.ok ? ranksRes.json() : [],
        guildRes.ok ? guildRes.json() : null,
      ]);
      setStats({
        staff: staff.length,
        activeStrikes: strikes.filter((s: any) => s.active).length,
        pendingLoa: loas.filter((l: any) => l.status === 'pending').length,
        ranks: ranks.length,
        channels: guild?.channels || 0,
        roles: guild?.roles || 0,
      });
      setGuildInfo(guild);
    } catch { }
    setLoading(false);
  }, [guildId]);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  const statCards = stats ? [
    { label: "Active Staff", value: stats.staff, icon: Users, color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20" },
    { label: "Active Strikes", value: stats.activeStrikes, icon: AlertTriangle, color: "text-red-400", bg: "bg-red-500/10 border-red-500/20" },
    { label: "Pending LOAs", value: stats.pendingLoa, icon: Calendar, color: "text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/20" },
    { label: "Rank Tiers", value: stats.ranks, icon: TrendingUp, color: "text-purple-400", bg: "bg-purple-500/10 border-purple-500/20" },
    { label: "Channels", value: stats.channels, icon: Hash, color: "text-green-400", bg: "bg-green-500/10 border-green-500/20" },
    { label: "Roles", value: stats.roles, icon: Shield, color: "text-indigo-400", bg: "bg-indigo-500/10 border-indigo-500/20" },
  ] : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Server Stats</h2>
          <p className="text-gray-400 text-sm mt-1">Overview of your server's Zenith data</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchStats} className="border-[#3a3d4a] text-gray-300"><RefreshCw size={14} className="mr-2" />Refresh</Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-blue-400" size={24} /></div>
      ) : (
        <>
          {guildInfo && (
            <Card className="bg-[#161820] border-[#3a3d4a]">
              <CardContent className="p-5">
                <div className="flex items-center gap-4">
                  {guildInfo.iconUrl && <img src={guildInfo.iconUrl} alt="Server" className="w-14 h-14 rounded-xl" />}
                  <div>
                    <h3 className="text-xl font-bold text-white">{guildInfo.name}</h3>
                    <div className="flex gap-3 mt-1">
                      <span className="text-gray-400 text-sm"><span className="text-white font-medium">{guildInfo.member_count?.toLocaleString()}</span> members</span>
                      <span className="text-gray-400 text-sm"><span className="text-white font-medium">{guildInfo.online_count?.toLocaleString()}</span> online</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {statCards.map(card => {
              const Icon = card.icon;
              return (
                <Card key={card.label} className={`bg-[#161820] border ${card.bg}`}>
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className={`text-3xl font-bold ${card.color}`}>{card.value}</div>
                        <div className="text-gray-400 text-sm mt-1">{card.label}</div>
                      </div>
                      <Icon className={`${card.color} opacity-60`} size={28} />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
