import { useState, useEffect, useCallback } from "react";
import { Link } from "wouter";
import { ChevronDown, ChevronRight, RefreshCw, CheckCircle2, AlertTriangle, XCircle, Minus, Activity, Database, Bot, Wifi, Zap, Users, Shield, Clock, BarChart2, Book, Award, Megaphone, MessageSquare, FileText, Brain, Command, Radio, Target, Calendar, Inbox, ArrowRight, Server } from "lucide-react";

interface SystemStatus { status: string; latency?: number; }
interface StatusData { api: SystemStatus; database: SystemStatus; bot: SystemStatus; overall: string; timestamp: string; features?: Record<string,string>; }
interface ChangelogEntry { version: string; date: string; type: string; changes: string[]; }
interface Outage { id: string; slug?: string; title: string; description: string; severity: string; status: string; affected_systems: string[]; resolution?: string; started_at: string; resolved_at?: string; }
interface Stats { activeServers: number; usersManaged: number; uptimeHours: number; uptimeMinutes: number; responseTime: number; }

const STATUS_COLORS: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  operational:    { bg: "bg-emerald-500/10", text: "text-emerald-400", dot: "bg-emerald-400", label: "Operational" },
  degraded:       { bg: "bg-yellow-500/10",  text: "text-yellow-400",  dot: "bg-yellow-400",  label: "Degraded" },
  not_configured: { bg: "bg-zinc-500/10",    text: "text-zinc-400",    dot: "bg-zinc-500",    label: "Not Configured" },
  partial:        { bg: "bg-orange-500/10",  text: "text-orange-400",  dot: "bg-orange-400",  label: "Partial Outage" },
  unknown:        { bg: "bg-zinc-500/10",    text: "text-zinc-400",    dot: "bg-zinc-500",    label: "Unknown" },
};

const FEATURES = [
  { id: "applications", name: "Applications",    desc: "Staff application panels, public apply form, submission review workflow, and DM notifications on decision.", icon: Inbox,        category: "Core" },
  { id: "strikes",      name: "Strikes",          desc: "Strike issuance, history log, auto-escalation to warnings, and appeal tracking.",                          icon: Shield,        category: "Discipline" },
  { id: "warnings",     name: "Warnings",         desc: "Formal warning system with severity levels, staff history, and Discord logging.",                          icon: AlertTriangle, category: "Discipline" },
  { id: "loa",          name: "Leave of Absence", desc: "LOA requests, manager approvals, active duration tracking, and auto-expiry.",                              icon: Clock,         category: "Core" },
  { id: "shifts",       name: "Shift Tracking",   desc: "Real-time on-duty timer, shift history, duration summaries, and shift card exports.",                     icon: Activity,      category: "Core" },
  { id: "roster",       name: "Duty Roster",      desc: "Check-in/out of duty assignments with live roster view.",                                                  icon: Users,         category: "Core" },
  { id: "promotions",   name: "Promotions",       desc: "Rank promotion and demotion history with reviewer tracking and Discord notifications.",                    icon: Zap,           category: "Management" },
  { id: "training",     name: "Training",         desc: "Training program builder, completion tracking, and trainer/trainee history.",                              icon: Award,         category: "Management" },
  { id: "analytics",    name: "Analytics",        desc: "Staff performance analytics with 7-day trend charts and activity breakdowns.",                            icon: BarChart2,     category: "Intelligence" },
  { id: "ai_insights",  name: "AI Insights",      desc: "AI-powered staff health scoring, performance predictions, and smart recommendations.",                    icon: Brain,         category: "Intelligence" },
  { id: "patrol",       name: "Patrol Monitor",   desc: "Live patrol activity tracker integrating with ERLC session data.",                                        icon: Radio,         category: "Intelligence" },
  { id: "announcements",name: "Announcements",    desc: "Staff broadcast system with optional mass DM to all staff members.",                                      icon: Megaphone,     category: "Communication" },
  { id: "custom_cmds",  name: "Custom Commands",  desc: "Guild slash command builder — create /commands that trigger bot responses.",                              icon: Command,       category: "Automation" },
  { id: "autopromotion",name: "Auto-Promotion",   desc: "Automated rank promotion rules based on activity thresholds and time-in-role.",                          icon: Target,        category: "Automation" },
  { id: "goals",        name: "Staff Goals",      desc: "Set and track performance goals for individual staff members.",                                            icon: Calendar,      category: "Management" },
  { id: "incidents",    name: "Incident Reports", desc: "Document and track in-game incidents, severity, and resolution status.",                                  icon: FileText,      category: "Discipline" },
  { id: "handbook",     name: "Handbook",         desc: "Configurable staff handbook sections accessible from the bot and dashboard.",                             icon: Book,          category: "Core" },
  { id: "discord_bot",  name: "Discord Bot",      desc: "Bot commands, slash command registration, interaction handling, and event listeners.",                    icon: MessageSquare, category: "Infrastructure" },
];

const CATEGORIES = ["Core", "Discipline", "Management", "Intelligence", "Automation", "Communication", "Infrastructure"];

const SEV_BADGE: Record<string, string> = {
  minor:    "bg-yellow-500/15 text-yellow-400 border border-yellow-500/20",
  moderate: "bg-orange-500/15 text-orange-400 border border-orange-500/20",
  major:    "bg-red-500/15 text-red-400 border border-red-500/20",
  critical: "bg-purple-500/15 text-purple-400 border border-purple-500/20",
};

function StatusPill({ status }: { status: string }) {
  const s = STATUS_COLORS[status] || STATUS_COLORS.unknown;
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${s.bg} ${s.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot} ${status === "operational" ? "animate-pulse" : ""}`} />
      {s.label}
    </span>
  );
}

function ServiceCard({ name, icon: Icon, status }: { name: string; icon: any; status: SystemStatus }) {
  const s = STATUS_COLORS[status.status] || STATUS_COLORS.unknown;
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center">
            <Icon className="w-4.5 h-4.5 text-white/60" />
          </div>
          <span className="font-semibold text-sm text-white">{name}</span>
        </div>
        <StatusPill status={status.status} />
      </div>
      {status.latency !== undefined && status.latency !== null && (
        <div className="text-xs text-white/30 font-mono">{status.latency}ms response</div>
      )}
    </div>
  );
}

export default function StatusPage() {
  const [statusData, setStatusData]   = useState<StatusData | null>(null);
  const [changelog, setChangelog]     = useState<ChangelogEntry[]>([]);
  const [loading, setLoading]         = useState(true);
  const [refreshing, setRefreshing]   = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [expanded, setExpanded]       = useState<Record<string, boolean>>({});
  const [outages, setOutages]         = useState<Outage[]>([]);
  const [stats, setStats]             = useState<Stats | null>(null);

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const [s, c, o, st] = await Promise.all([
        fetch("/api/status").then(r => r.ok ? r.json() : null),
        fetch("/api/changelog").then(r => r.ok ? r.json() : []),
        fetch("/api/outages").then(r => r.ok ? r.json() : []),
        fetch("/api/stats").then(r => r.ok ? r.json() : null),
      ]);
      if (s)  setStatusData(s);
      if (c)  setChangelog(c);
      if (o)  setOutages(o);
      if (st) setStats(st);
      setLastChecked(new Date());
    } catch {}
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => fetchData(true), 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const overall      = statusData?.overall || "unknown";
  const overallStyle = STATUS_COLORS[overall] || STATUS_COLORS.unknown;
  const activeOutages = outages.filter(o => o.status !== "resolved");

  const featuresWithStatus = FEATURES.map(f => ({
    ...f,
    status: statusData?.features?.[f.id] || (statusData ? "operational" : "unknown"),
  }));

  const TYPE_STYLES: Record<string, { badge: string; label: string }> = {
    major:   { badge: "bg-purple-500/20 text-purple-300 border border-purple-500/30",  label: "Major Release" },
    feature: { badge: "bg-blue-500/20 text-blue-300 border border-blue-500/30",        label: "New Features" },
    fix:     { badge: "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30", label: "Bug Fix" },
    patch:   { badge: "bg-zinc-500/20 text-zinc-300 border border-zinc-500/30",        label: "Patch" },
  };

  const uptimeDisplay = stats
    ? `${stats.uptimeHours}h ${stats.uptimeMinutes}m`
    : loading ? "—" : "—";

  return (
    <div className="min-h-screen bg-[#0d0f14] text-white">
      {/* Navbar */}
      <nav className="border-b border-white/5 bg-[#0d0f14]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-black font-bold text-lg" style={{ background: "linear-gradient(135deg,#d4af37,#ffd700)" }}>Z</div>
            <span className="font-bold text-white">Zenith</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/updates" className="text-sm text-white/40 hover:text-white transition-colors">Updates</Link>
            <Link href="/servers" className="text-sm font-medium text-white/70 hover:text-white transition-colors">Dashboard</Link>
          </div>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-4 py-12 space-y-10">

        {/* Overall status banner */}
        <div>
          <div className={`rounded-2xl border ${overallStyle.bg} border-white/10 p-6 flex items-center justify-between`}>
            <div className="flex items-center gap-4">
              {overall === "operational"
                ? <CheckCircle2 className={`w-8 h-8 ${overallStyle.text}`} />
                : overall === "degraded"
                ? <AlertTriangle className={`w-8 h-8 ${overallStyle.text}`} />
                : <Minus className={`w-8 h-8 ${overallStyle.text}`} />}
              <div>
                <h1 className={`text-xl font-bold ${overall === "operational" ? "text-white" : overallStyle.text}`}>
                  {overall === "operational" ? "All Systems Operational" : overall === "degraded" ? "Some Systems Degraded" : "Status Unknown"}
                </h1>
                <p className="text-white/40 text-sm mt-0.5">
                  {lastChecked ? `Last checked ${lastChecked.toLocaleTimeString()}` : "Checking..."}
                  {" "}• Auto-refreshes every 30s
                </p>
              </div>
            </div>
            <button onClick={() => fetchData(true)} disabled={refreshing}
              className="flex items-center gap-2 text-sm text-white/40 hover:text-white transition-colors px-3 py-1.5 rounded-lg border border-white/10 hover:border-white/20">
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Active Servers",  value: stats ? stats.activeServers.toLocaleString() : "—", icon: Server },
            { label: "Users Managed",   value: stats ? stats.usersManaged.toLocaleString()  : "—", icon: Users },
            { label: "Uptime",          value: uptimeDisplay,                                       icon: Clock },
            { label: "Response Time",   value: stats ? `${stats.responseTime}ms`            : (statusData?.api?.latency != null ? `${statusData.api.latency}ms` : "—"), icon: Activity },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4 flex flex-col gap-1">
              <div className="flex items-center gap-2 text-white/30">
                <Icon className="w-3.5 h-3.5" />
                <span className="text-xs font-medium">{label}</span>
              </div>
              <div className="text-lg font-bold text-white">{value}</div>
            </div>
          ))}
        </div>

        {/* Active incident alert */}
        {activeOutages.length > 0 && (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-5">
            <div className="flex items-start gap-3">
              <XCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-red-400 text-sm mb-1">Active Incident{activeOutages.length > 1 ? "s" : ""}</p>
                {activeOutages.map(o => (
                  <div key={o.id} className="flex items-center gap-2 mt-1">
                    <span className="text-sm text-white/70 truncate">{o.title}</span>
                    {o.slug && (
                      <Link href={`/status/incidents/${o.slug}`}
                        className="text-xs text-red-400/70 hover:text-red-400 transition-colors whitespace-nowrap flex items-center gap-1">
                        View <ArrowRight className="w-3 h-3" />
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Incident History */}
        {outages.length > 0 && (
          <div>
            <h2 className="text-xs font-bold uppercase tracking-widest text-white/30 mb-4">Incident History</h2>
            <div className="space-y-2">
              {outages.map(o => {
                const isResolved = o.status === "resolved";
                const isOpen = expanded[`inc-${o.id}`];
                return (
                  <div key={o.id} className={`rounded-2xl border overflow-hidden ${isResolved ? "border-white/[0.08] bg-white/[0.02]" : "border-red-500/30 bg-red-500/5"}`}>
                    <button className="w-full flex items-start gap-3 px-5 py-4 hover:bg-white/5 transition-colors text-left"
                      onClick={() => setExpanded(e => ({ ...e, [`inc-${o.id}`]: !e[`inc-${o.id}`] }))}>
                      <div className="flex-shrink-0 mt-0.5">
                        {isResolved ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertTriangle className="w-4 h-4 text-red-400" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="font-semibold text-sm text-white truncate">{o.title}</span>
                          {o.slug && (
                            <span className="text-[10px] font-mono text-white/20 bg-white/5 px-1.5 py-0.5 rounded">#{o.slug}</span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${SEV_BADGE[o.severity] || SEV_BADGE.minor}`}>
                            {o.severity.toUpperCase()}
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isResolved ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>
                            {o.status.charAt(0).toUpperCase() + o.status.slice(1)}
                          </span>
                          <span className="text-xs text-white/25">{new Date(o.started_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {o.slug && (
                          <Link href={`/status/incidents/${o.slug}`}
                            onClick={e => e.stopPropagation()}
                            className="text-xs text-white/30 hover:text-white transition-colors flex items-center gap-1 px-2 py-1 rounded-lg border border-white/10 hover:border-white/20">
                            View <ArrowRight className="w-3 h-3" />
                          </Link>
                        )}
                        {isOpen ? <ChevronDown className="w-3.5 h-3.5 text-white/20" /> : <ChevronRight className="w-3.5 h-3.5 text-white/20" />}
                      </div>
                    </button>
                    {isOpen && (
                      <div className="px-5 pb-5 border-t border-white/[0.07] bg-black/10 space-y-3 pt-4">
                        <p className="text-sm text-white/50 leading-relaxed">{o.description}</p>
                        {o.affected_systems?.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {o.affected_systems.map(s => (
                              <span key={s} className="text-xs bg-white/5 border border-white/10 text-white/50 px-2.5 py-1 rounded-full">{s}</span>
                            ))}
                          </div>
                        )}
                        {o.resolution && (
                          <div className="rounded-xl bg-emerald-500/5 border border-emerald-500/15 p-4">
                            <p className="text-xs font-bold text-emerald-400 mb-1.5 uppercase tracking-wide">Resolution</p>
                            <p className="text-sm text-white/50 leading-relaxed">{o.resolution}</p>
                            {o.resolved_at && (
                              <p className="text-xs text-emerald-400/50 mt-2">Resolved {new Date(o.resolved_at).toLocaleString()}</p>
                            )}
                          </div>
                        )}
                        {o.slug && (
                          <Link href={`/status/incidents/${o.slug}`}
                            className="inline-flex items-center gap-1.5 text-xs text-white/30 hover:text-white transition-colors">
                            View full incident page <ArrowRight className="w-3 h-3" />
                          </Link>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Service cards */}
        <div>
          <h2 className="text-xs font-bold uppercase tracking-widest text-white/30 mb-4">Infrastructure</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <ServiceCard name="API Server"  icon={Wifi}     status={statusData?.api      || { status: loading ? "unknown" : "operational" }} />
            <ServiceCard name="Database"    icon={Database} status={statusData?.database  || { status: "unknown" }} />
            <ServiceCard name="Discord Bot" icon={Bot}      status={statusData?.bot       || { status: "unknown" }} />
          </div>
        </div>

        {/* Feature matrix */}
        <div>
          <h2 className="text-xs font-bold uppercase tracking-widest text-white/30 mb-4">Features</h2>
          <div className="space-y-1">
            {CATEGORIES.map(cat => {
              const catFeatures = featuresWithStatus.filter(f => f.category === cat);
              if (!catFeatures.length) return null;
              return (
                <div key={cat}>
                  <div className="text-xs text-white/20 font-semibold uppercase tracking-widest px-2 py-2 mt-3">{cat}</div>
                  {catFeatures.map(f => {
                    const isOpen = expanded[f.id];
                    const Icon = f.icon;
                    return (
                      <div key={f.id} className="rounded-xl border border-white/[0.07] bg-white/[0.03] overflow-hidden mb-1">
                        <button className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-left"
                          onClick={() => setExpanded(e => ({ ...e, [f.id]: !e[f.id] }))}>
                          <Icon className="w-4 h-4 text-white/40 flex-shrink-0" />
                          <span className="flex-1 text-sm font-medium text-white/80">{f.name}</span>
                          <StatusPill status={f.status} />
                          {isOpen ? <ChevronDown className="w-3.5 h-3.5 text-white/20 ml-2" /> : <ChevronRight className="w-3.5 h-3.5 text-white/20 ml-2" />}
                        </button>
                        {isOpen && (
                          <div className="px-4 pb-4 pt-1 border-t border-white/[0.07] bg-white/[0.02]">
                            <p className="text-sm text-white/40 leading-relaxed">{f.desc}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent updates from changelog */}
        {changelog.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-bold uppercase tracking-widest text-white/30">Recent Changes</h2>
              <Link href="/updates" className="text-xs text-white/30 hover:text-white transition-colors">View all →</Link>
            </div>
            <div className="space-y-3">
              {changelog.slice(0, 3).map(entry => {
                const t = TYPE_STYLES[entry.type] || TYPE_STYLES.patch;
                const isOpen = expanded[`cl-${entry.version}`];
                return (
                  <div key={entry.version} className="rounded-xl border border-white/[0.07] bg-white/[0.03] overflow-hidden">
                    <button className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-left"
                      onClick={() => setExpanded(e => ({ ...e, [`cl-${entry.version}`]: !e[`cl-${entry.version}`] }))}>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${t.badge}`}>{t.label}</span>
                      <span className="font-mono text-sm text-white/80 font-semibold">v{entry.version}</span>
                      <span className="text-xs text-white/30 flex-1">{entry.date}</span>
                      <span className="text-xs text-white/30 mr-2">{entry.changes.length} change{entry.changes.length !== 1 ? "s" : ""}</span>
                      {isOpen ? <ChevronDown className="w-3.5 h-3.5 text-white/20" /> : <ChevronRight className="w-3.5 h-3.5 text-white/20" />}
                    </button>
                    {isOpen && (
                      <ul className="px-4 pb-4 pt-1 border-t border-white/[0.07] space-y-1">
                        {entry.changes.map((c, i) => (
                          <li key={i} className="text-sm text-white/40 flex items-start gap-2">
                            <span className="text-white/20 mt-1 flex-shrink-0">•</span>{c}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
