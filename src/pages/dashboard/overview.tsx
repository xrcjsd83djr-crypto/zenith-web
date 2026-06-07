import { useState, useEffect, useCallback } from "react";
import {
  Users, AlertTriangle, Clock, TrendingUp, Star, Zap, Shield,
  ChevronRight, RefreshCw, CheckCircle, XCircle, Activity, Inbox, Bell,
  Award, Lock, Unlock, BarChart2, MessageSquare, UserPlus, Flag, Settings,
  Sparkles, ArrowRight, X
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface Stats {
  totalStaff: number; activeStaff?: number; pendingApplications: number;
  activeStrikes: number; activeLoa: number; recentPromotions?: number;
  recentHires?: number; avgActivityScore?: number;
}
interface ActivityEntry {
  id: string; action: string; username?: string; details?: any; created_at: string;
}
interface GuildInfo {
  name: string; icon?: string; memberCount?: number; isPremium?: boolean;
  customBotName?: string;
}

const DEFAULT_STATS: Stats = {
  totalStaff: 0, pendingApplications: 0, activeStrikes: 0, activeLoa: 0,
  recentPromotions: 0, recentHires: 0, avgActivityScore: 0,
};

function timeSince(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000), h = Math.floor(m / 60), d = Math.floor(h / 24);
  if (d > 0) return `${d}d ago`;
  if (h > 0) return `${h}h ago`;
  if (m > 0) return `${m}m ago`;
  return "just now";
}

const ACTION_META: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
  staff_add:             { icon: <UserPlus size={11} />,     label: "Staff Added",           color: "#57F287" },
  staff_remove:          { icon: <XCircle size={11} />,      label: "Staff Removed",         color: "#ED4245" },
  strike_issued:         { icon: <AlertTriangle size={11} />,label: "Strike Issued",          color: "#FEE75C" },
  loa_request:           { icon: <Clock size={11} />,        label: "LOA Requested",          color: "#5865F2" },
  loa_approved:          { icon: <CheckCircle size={11} />,  label: "LOA Approved",           color: "#57F287" },
  loa_rejected:          { icon: <XCircle size={11} />,      label: "LOA Rejected",           color: "#ED4245" },
  application_accepted:  { icon: <CheckCircle size={11} />,  label: "Application Accepted",   color: "#57F287" },
  application_rejected:  { icon: <XCircle size={11} />,      label: "Application Rejected",   color: "#ED4245" },
  application_flagged:   { icon: <Flag size={11} />,         label: "Application Flagged",    color: "#F57731" },
  hub_posted:            { icon: <MessageSquare size={11} />, label: "Hub Posted",            color: "#5865F2" },
  staff_promotion:       { icon: <Award size={11} />,        label: "Promotion",              color: "#d4af37" },
  config_update:         { icon: <Settings size={11} />,     label: "Config Updated",         color: "#99aab5" },
  panel_posted:          { icon: <Bell size={11} />,         label: "Panel Posted",           color: "#5865F2" },
  performance_review:    { icon: <Star size={11} />,         label: "Performance Review",     color: "#d4af37" },
};

const PRO_FEATURES = [
  { key: "insights",        label: "Application Insights",   desc: "Charts, acceptance rates & response times",  icon: <BarChart2 size={14} />, href: "/applications?tab=insights" },
  { key: "results_channel", label: "Results Channel",        desc: "Post accept/reject decisions to Discord",    icon: <MessageSquare size={14} />, href: "/applications" },
  { key: "custom_bot",      label: "Bot Customization",      desc: "Custom name, avatar & embed colour",         icon: <Sparkles size={14} />,  href: "/bot-settings" },
  { key: "webhooks",        label: "Webhook Posting",        desc: "Hub posts use custom bot identity",          icon: <Zap size={14} />,       href: "/applications" },
  { key: "reapply",         label: "Re-apply Cooldowns",     desc: "Control how often users can re-apply",       icon: <Clock size={14} />,     href: "/applications" },
  { key: "divisions",       label: "Role Auto-assign",       desc: "Auto-assign roles on application accept",    icon: <Shield size={14} />,    href: "/staff-roster" },
];

export default function OverviewPage({ guildId }: { guildId: string }) {
  const [stats, setStats]           = useState<Stats>(DEFAULT_STATS);
  const [guild, setGuild]           = useState<GuildInfo | null>(null);
  const [activities, setActivities] = useState<ActivityEntry[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [isLoading, setIsLoading]   = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const fetchAll = useCallback(async () => {
    setIsLoading(true);
    try {
      const [sR, gR, aR, lR] = await Promise.all([
        fetch(`/api/guilds/${guildId}/stats`,               { credentials: "include" }),
        fetch(`/api/guilds/${guildId}`,                     { credentials: "include" }),
        fetch(`/api/guilds/${guildId}/activity?limit=15`,   { credentials: "include" }),
        fetch(`/api/guilds/${guildId}/activity/leaderboard`,{ credentials: "include" }),
      ]);
      if (sR.ok) setStats({ ...DEFAULT_STATS, ...await sR.json() });
      if (gR.ok) {
        const g = await gR.json();
        setGuild({ name: g.name, icon: g.icon, memberCount: g.memberCount, isPremium: g.isPremium, customBotName: g.customBotName });
      }
      if (aR.ok) setActivities(await aR.json());
      if (lR.ok) setLeaderboard(await lR.json());
    } catch (e) { console.error("Overview fetch failed:", e); }
    setIsLoading(false);
    setLastRefresh(new Date());
  }, [guildId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const isPremium = guild?.isPremium || false;
  const iconUrl   = guild?.icon ? `https://cdn.discordapp.com/icons/${guildId}/${guild.icon}.png?size=128` : null;

  const chartData = (() => {
    const days: Record<string, number> = {};
    for (let i = 6; i >= 0; i--) {
      const d  = new Date(Date.now() - i * 86400000);
      const key = d.toLocaleDateString("en-US", { weekday: "short" });
      days[key] = 0;
    }
    for (const a of activities) {
      if (Date.now() - new Date(a.created_at).getTime() < 7 * 86400000) {
        const key = new Date(a.created_at).toLocaleDateString("en-US", { weekday: "short" });
        if (key in days) days[key]++;
      }
    }
    return Object.entries(days).map(([day, count]) => ({ day, count }));
  })();

  return (
    <div className="space-y-5 max-w-5xl">

      {/* ─── Server banner ────────────────────────────────────────────────────── */}
      <div className="relative rounded-2xl overflow-hidden border border-border p-5 flex items-center gap-4"
        style={{ background: "linear-gradient(135deg,rgba(212,175,55,0.07) 0%,transparent 55%)" }}>
        {iconUrl
          ? <img src={iconUrl} alt="" className="w-16 h-16 rounded-2xl object-cover flex-shrink-0 shadow-lg" />
          : <div className="w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0 text-2xl font-black shadow-lg"
              style={{ background: "linear-gradient(135deg,#d4af37,#f0c040)", color: "#000" }}>
              {guild?.name?.[0] || "Z"}
            </div>}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            <h1 className="text-2xl font-extrabold truncate">{guild?.name || "Your Server"}</h1>
            {isPremium && (
              <Badge className="bg-yellow-100 text-yellow-700 border border-yellow-200 gap-1 text-[11px]">
                <Star size={9} className="fill-current" /> Premium
              </Badge>
            )}
            {guild?.customBotName && (
              <Badge className="bg-blue-50 text-blue-700 border border-blue-200 text-[10px]">
                Bot: {guild.customBotName}
              </Badge>
            )}
          </div>
          {guild?.memberCount && (
            <p className="text-sm text-muted-foreground">{guild.memberCount.toLocaleString()} members</p>
          )}
          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
            <Activity size={10} /> Refreshed {timeSince(lastRefresh.toISOString())}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchAll} className="gap-1.5 flex-shrink-0">
          <RefreshCw size={13} className={isLoading ? "animate-spin" : ""} /> Refresh
        </Button>
      </div>

      {/* ─── KPI cards ────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {([
          { label: "Active Staff",          value: stats.totalStaff,           icon: <Users size={16} />,        color: "#5865F2", href: "/staff-roster" },
          { label: "Pending Applications",  value: stats.pendingApplications,  icon: <Inbox size={16} />,        color: "#d4af37", href: "/applications", alert: stats.pendingApplications > 0 },
          { label: "Active Strikes",        value: stats.activeStrikes,        icon: <AlertTriangle size={16} />,color: "#ED4245", href: "/strikes",       alert: stats.activeStrikes > 0 },
          { label: "Active LOAs",           value: stats.activeLoa,            icon: <Clock size={16} />,        color: "#57F287", href: "/inactivity" },
        ] as const).map(kpi => (
          <Link key={kpi.label} href={kpi.href}>
            <Card className="cursor-pointer hover:shadow-md transition-all hover:border-border/80">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ background: kpi.color + "1a", color: kpi.color }}>{kpi.icon}</div>
                  {"alert" in kpi && kpi.alert && kpi.value > 0 && (
                    <span className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black text-black"
                      style={{ background: kpi.color }}>{kpi.value > 9 ? "9+" : kpi.value}</span>
                  )}
                </div>
                <p className="text-2xl font-extrabold tabular-nums" style={{ color: kpi.color }}>
                  {isLoading ? "…" : kpi.value}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-tight">{kpi.label}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* ─── Main content ─────────────────────────────────────────────────────── */}
      <div className="grid md:grid-cols-[1fr_290px] gap-5">

        {/* Left column */}
        <div className="space-y-5">

          {/* Activity chart */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold flex items-center gap-1.5">
                  <TrendingUp size={14} style={{ color: "#d4af37" }} /> Activity — Last 7 Days
                </p>
                <span className="text-xs text-muted-foreground">{activities.length} events total</span>
              </div>
              <ResponsiveContainer width="100%" height={130}>
                <BarChart data={chartData} margin={{ top: 0, right: 0, left: -28, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip contentStyle={{ fontSize: 12, background: "#1a1b1e", border: "1px solid #333", borderRadius: 8 }} />
                  <Bar dataKey="count" fill="#d4af37" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Quick actions */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <p className="text-sm font-semibold flex items-center gap-1.5">
                <Zap size={14} style={{ color: "#d4af37" }} /> Quick Actions
              </p>
              <div className="grid grid-cols-2 gap-2">
                {([
                  { label: "Review Applications", href: "/applications",   icon: <Inbox size={13} />,        badge: stats.pendingApplications || null },
                  { label: "Add Staff Member",    href: "/staff-roster",   icon: <UserPlus size={13} /> },
                  { label: "Issue a Strike",      href: "/strikes",        icon: <AlertTriangle size={13} /> },
                  { label: "Post Announcement",   href: "/announcements",  icon: <Bell size={13} /> },
                  { label: "Top Performers",      href: "/staff-roster",   icon: <Award size={13} /> },
                  { label: "Bot Settings",        href: "/bot-settings",   icon: <Settings size={13} /> },
                ] as const).map(a => (
                  <Link key={a.label} href={a.href}>
                    <button className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl border border-border hover:bg-muted/40 transition-colors text-sm group">
                      <span className="text-muted-foreground group-hover:text-foreground transition-colors">{a.icon}</span>
                      <span className="flex-1 text-xs font-medium text-left truncate">{a.label}</span>
                      {"badge" in a && a.badge ? (
                        <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full text-black"
                          style={{ background: "#d4af37" }}>{a.badge > 9 ? "9+" : a.badge}</span>
                      ) : (
                        <ChevronRight size={11} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      )}
                    </button>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Leaderboard */}
          {leaderboard.length > 0 && (
            <Card>
              <CardContent className="p-4 space-y-3">
                <p className="text-sm font-semibold flex items-center gap-1.5">
                  <Award size={14} style={{ color: "#d4af37" }} /> Top Active Staff
                </p>
                <div className="space-y-2">
                  {leaderboard.slice(0, 5).map((m: any, i: number) => (
                    <div key={m.user_id || i} className="flex items-center gap-3">
                      <span className="text-xs font-bold text-muted-foreground w-4 text-center">{i + 1}</span>
                      <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs font-bold flex-shrink-0"
                        style={i === 0 ? { background: "rgba(212,175,55,0.2)", color: "#d4af37" } : {}}>
                        {(m.username || m.name || "?")[0]?.toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold truncate">{m.username || m.name}</p>
                        {m.rank && <p className="text-[10px] text-muted-foreground">{m.rank}</p>}
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-bold tabular-nums">{m.shift_count || m.total_shifts || m.activity_score || 0}</p>
                        <p className="text-[10px] text-muted-foreground">shifts</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-5">

          {/* Recent activity feed */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <p className="text-sm font-semibold flex items-center gap-1.5">
                <Activity size={14} style={{ color: "#d4af37" }} /> Recent Activity
              </p>
              {isLoading ? (
                <div className="space-y-2">
                  {[1,2,3,4].map(i => <div key={i} className="h-10 bg-muted/30 rounded-lg animate-pulse" />)}
                </div>
              ) : activities.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">No recent activity yet</p>
              ) : (
                <div className="space-y-1.5 max-h-72 overflow-y-auto pr-0.5">
                  {activities.slice(0, 15).map((a, i) => {
                    const meta = ACTION_META[a.action] ?? { icon: <Activity size={11} />, label: a.action.replace(/_/g, " "), color: "#99aab5" };
                    return (
                      <div key={a.id || i} className="flex items-start gap-2 text-xs">
                        <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                          style={{ background: meta.color + "1a", color: meta.color }}>{meta.icon}</div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium leading-tight">{meta.label}</p>
                          {a.username && <p className="text-[10px] text-muted-foreground">by {a.username}</p>}
                        </div>
                        <span className="text-[10px] text-muted-foreground flex-shrink-0 mt-0.5">{timeSince(a.created_at)}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pro features */}
          <Card className={isPremium ? "border-yellow-300/25" : ""}
            style={isPremium ? { background: "linear-gradient(135deg,rgba(212,175,55,0.04),transparent 60%)" } : {}}>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold flex items-center gap-1.5">
                  <Star size={14} style={{ color: "#d4af37" }} /> {isPremium ? "Premium Active" : "Go Premium"}
                </p>
                {isPremium
                  ? <Badge className="bg-yellow-100 text-yellow-700 border border-yellow-200 text-[10px] gap-1"><CheckCircle size={9} /> Active</Badge>
                  : <Link href="/manage-premium">
                      <Button size="sm" className="h-6 text-[10px] px-2" style={{ background: "#d4af37", color: "#000" }}>Upgrade</Button>
                    </Link>}
              </div>
              <div className="space-y-1">
                {PRO_FEATURES.map(f => (
                  <Link key={f.key} href={f.href}>
                    <div className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer transition-colors ${isPremium ? "hover:bg-muted/30" : "opacity-55"}`}>
                      <div className="w-6 h-6 rounded flex items-center justify-center flex-shrink-0"
                        style={{ background: isPremium ? "rgba(212,175,55,0.12)" : "rgba(255,255,255,0.05)", color: isPremium ? "#d4af37" : "#777" }}>
                        {f.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-semibold truncate">{f.label}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{f.desc}</p>
                      </div>
                      {isPremium
                        ? <Unlock size={9} className="text-green-500 flex-shrink-0" />
                        : <Lock size={9} className="text-muted-foreground flex-shrink-0" />}
                    </div>
                  </Link>
                ))}
              </div>
              {!isPremium && (
                <Link href="/manage-premium">
                  <Button className="w-full h-8 text-xs gap-1 font-bold mt-1"
                    style={{ background: "linear-gradient(135deg,#d4af37,#f0c040)", color: "#000" }}>
                    <Star size={10} className="fill-current" /> Unlock All Features <ArrowRight size={10} />
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
