import { useState, useEffect } from "react";
  import { Card, CardContent } from "@/components/ui/card";
  import { Badge } from "@/components/ui/badge";
  import { Button } from "@/components/ui/button";
  import { Trophy, Flame, TrendingUp, Star, Crown, RefreshCw, Zap } from "lucide-react";

  type Filter = "weekly" | "monthly" | "alltime";

  function getLevel(xp: number): { name: string; color: string; next: number } {
    if (xp >= 10000) return { name: "Legend",      color: "#d4af37", next: 99999 };
    if (xp >= 5000)  return { name: "Commander",   color: "#a855f7", next: 10000 };
    if (xp >= 2000)  return { name: "Supervisor",  color: "#3b82f6", next: 5000  };
    if (xp >= 500)   return { name: "Officer",     color: "#22c55e", next: 2000  };
    if (xp >= 100)   return { name: "Senior Staff", color: "#64748b", next: 500  };
    return              { name: "Recruit",         color: "#94a3b8", next: 100   };
  }

  function Podium({ entries }: { entries: any[] }) {
    if (entries.length < 3) return null;
    const order = [entries[1], entries[0], entries[2]];
    const heights = [80, 110, 60];
    const medals = ["🥈", "🥇", "🥉"];
    const colors = ["#94a3b8", "#d4af37", "#cd7f32"];
    return (
      <div className="flex items-end justify-center gap-4 mb-8 mt-2">
        {order.map((e, i) => {
          const lvl = getLevel(e.score || 0);
          return (
            <div key={e.discord_id || i} className="flex flex-col items-center gap-2">
              <div className="text-2xl">{medals[i]}</div>
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold"
                style={{ background: `${colors[i]}20`, border: `2px solid ${colors[i]}`, color: colors[i] }}>
                {(e.username || "?")[0]?.toUpperCase()}
              </div>
              <p className="text-xs font-semibold truncate max-w-[70px] text-center">{e.username || "Unknown"}</p>
              <p className="text-[10px] text-muted-foreground">{(e.score || 0).toLocaleString()} pts</p>
              <div className="w-16 rounded-t-lg flex items-end justify-center pb-1"
                style={{ height: heights[i], background: `${colors[i]}15`, border: `1px solid ${colors[i]}30` }}>
                <span className="text-xs font-bold" style={{ color: colors[i] }}>#{i === 0 ? 2 : i === 1 ? 1 : 3}</span>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  export default function LeaderboardPage({ guildId }: { guildId: string }) {
    const [filter, setFilter] = useState<Filter>("weekly");
    const [entries, setEntries] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    async function loadData() {
      try {
        const res = await fetch(`/api/guilds/${guildId}/activity/leaderboard?period=${filter}`, { credentials: "include" });
        if (res.ok) setEntries(await res.json());
      } catch {} finally { setLoading(false); setRefreshing(false); }
    }

    useEffect(() => { if (guildId) { setLoading(true); loadData(); } }, [guildId, filter]);
    const refresh = () => { setRefreshing(true); loadData(); };

    if (loading) return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-muted/40 rounded animate-pulse" />
        {[1,2,3,4,5].map(i => <div key={i} className="h-14 bg-muted/30 rounded-xl animate-pulse" />)}
      </div>
    );

    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight flex items-center gap-2">
              <Trophy className="w-6 h-6" style={{ color: "#d4af37" }} /> Staff Leaderboard
            </h1>
            <p className="text-muted-foreground text-sm mt-0.5">Staff ranked by activity points and performance.</p>
          </div>
          <Button variant="outline" size="sm" onClick={refresh} disabled={refreshing} className="gap-2">
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2">
          {(["weekly","monthly","alltime"] as Filter[]).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className="px-4 py-1.5 rounded-full text-xs font-semibold transition-all"
              style={filter === f ? { background: "rgba(212,175,55,.15)", color: "#d4af37", border: "1px solid rgba(212,175,55,.3)" }
                                 : { background: "transparent", color: "rgba(255,255,255,.4)", border: "1px solid rgba(255,255,255,.1)" }}>
              {f === "weekly" ? "This Week" : f === "monthly" ? "This Month" : "All Time"}
            </button>
          ))}
        </div>

        {entries.length === 0 ? (
          <Card className="bg-card border-border">
            <CardContent className="p-12 text-center">
              <Trophy className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-40" />
              <p className="font-semibold">No activity recorded yet</p>
              <p className="text-sm text-muted-foreground mt-1">Leaderboard updates as staff log activity.</p>
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-card border-border">
            <CardContent className="p-5">
              {entries.length >= 3 && <Podium entries={entries} />}
              <div className="space-y-2">
                {entries.slice(0, 20).map((e: any, i: number) => {
                  const lvl = getLevel(e.score || 0);
                  const isTop3 = i < 3;
                  return (
                    <div key={e.discord_id || i}
                      className="flex items-center gap-3 p-3 rounded-xl border transition-all hover:bg-muted/20"
                      style={isTop3 ? { borderColor: "rgba(212,175,55,.2)", background: "rgba(212,175,55,.04)" } : { borderColor: "rgba(255,255,255,.06)" }}>
                      <div className="w-8 text-center font-black text-sm" style={{ color: isTop3 ? "#d4af37" : "rgba(255,255,255,.3)" }}>
                        {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i+1}`}
                      </div>
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                        style={{ background: `${lvl.color}20`, color: lvl.color }}>
                        {(e.username || "?")[0]?.toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{e.username || "Unknown"}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: `${lvl.color}20`, color: lvl.color }}>{lvl.name}</span>
                          {i === 0 && <span className="text-[10px] text-amber-400 flex items-center gap-0.5"><Flame className="w-2.5 h-2.5" /> Top Performer</span>}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold">{(e.score || 0).toLocaleString()}</p>
                        <p className="text-[10px] text-muted-foreground">points</p>
                      </div>
                      <div className="w-16">
                        <div className="h-1.5 rounded-full bg-muted">
                          <div className="h-1.5 rounded-full" style={{ width: `${Math.min(100,(e.score||0)/(entries[0]?.score||1)*100)}%`, background: lvl.color }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }
  