import { useState, useEffect, useCallback } from "react";
  import { useTheme } from "next-themes";
  import { Switch } from "@/components/ui/switch";
  import { Label } from "@/components/ui/label";
  import { Sun, Moon, Monitor, Activity, Package, ChevronDown, ChevronRight, CheckCircle2, AlertTriangle, Minus, Database, Bot, Wifi, Wrench, Zap, RefreshCw } from "lucide-react";

  // ── Inline status types ──────────────────────────────────────────────────────
  interface SystemStatus { status: string; latency?: number; }
  interface StatusData { api: SystemStatus; database: SystemStatus; bot: SystemStatus; overall: string; timestamp: string; }
  interface ChangelogEntry { version: string; date: string; type: string; changes: string[]; }

  const STATUS_COLORS: Record<string, { text: string; dot: string; label: string }> = {
    operational:    { text: "text-emerald-400", dot: "bg-emerald-400", label: "Operational" },
    degraded:       { text: "text-yellow-400",  dot: "bg-yellow-400",  label: "Degraded" },
    not_configured: { text: "text-zinc-400",    dot: "bg-zinc-500",    label: "Not Configured" },
    partial:        { text: "text-orange-400",  dot: "bg-orange-400",  label: "Partial Outage" },
    unknown:        { text: "text-zinc-400",    dot: "bg-zinc-500",    label: "Checking..." },
  };

  function StatusPill({ status }: { status: string }) {
    const s = STATUS_COLORS[status] || STATUS_COLORS.unknown;
    return (
      <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${s.text}`}>
        <span className={`w-2 h-2 rounded-full ${s.dot} ${status === "operational" ? "animate-pulse" : ""}`} />
        {s.label}
      </span>
    );
  }

  const TYPE_CONFIG: Record<string, { badge: string; label: string }> = {
    major:   { badge: "bg-purple-500/20 text-purple-400 border border-purple-500/30", label: "Major" },
    feature: { badge: "bg-blue-500/20 text-blue-400 border border-blue-500/30",       label: "Features" },
    fix:     { badge: "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30", label: "Fix" },
    patch:   { badge: "bg-muted/30 text-muted-foreground border-border",               label: "Patch" },
  };

  // ── Inline Status Panel ──────────────────────────────────────────────────────
  function StatusPanel() {
    const [data, setData] = useState<StatusData | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [lastChecked, setLastChecked] = useState<Date | null>(null);

    const fetchStatus = useCallback(async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      try {
        const s = await fetch("/api/status").then(r => r.ok ? r.json() : null);
        if (s) { setData(s); setLastChecked(new Date()); }
      } catch {}
      setLoading(false);
      setRefreshing(false);
    }, []);

    useEffect(() => { fetchStatus(); }, [fetchStatus]);

    const overall = data?.overall || (loading ? "unknown" : "operational");

    const services = [
      { name: "API Server",    icon: Wifi,     status: data?.api?.status || (loading ? "unknown" : "operational"), latency: data?.api?.latency },
      { name: "Database",      icon: Database, status: data?.database?.status || "unknown", latency: data?.database?.latency },
      { name: "Discord Bot",   icon: Bot,      status: data?.bot?.status || "unknown",      latency: data?.bot?.latency },
    ];

    return (
      <div className="rounded-2xl border bg-card p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Activity className="w-5 h-5 text-muted-foreground" />
            <div>
              <h2 className="font-semibold text-base">System Status</h2>
              <p className="text-muted-foreground text-xs mt-0.5">{lastChecked ? `Checked ${lastChecked.toLocaleTimeString()}` : "Checking..."}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <StatusPill status={overall} />
            <button onClick={() => fetchStatus(true)} disabled={refreshing}
              className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded">
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>
        <div className="divide-y border rounded-xl overflow-hidden">
          {services.map(svc => {
            const Icon = svc.icon;
            return (
              <div key={svc.name} className="flex items-center justify-between px-4 py-3 bg-muted/20">
                <div className="flex items-center gap-3">
                  <Icon className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{svc.name}</span>
                  {svc.latency != null && <span className="text-xs text-muted-foreground font-mono">{svc.latency}ms</span>}
                </div>
                <StatusPill status={svc.status} />
              </div>
            );
          })}
        </div>
        <a href="/status" target="_blank" rel="noreferrer"
          className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5">
          View full status page →
        </a>
      </div>
    );
  }

  // ── Inline Updates Panel ─────────────────────────────────────────────────────
  function UpdatesPanel() {
    const [entries, setEntries] = useState<ChangelogEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [expanded, setExpanded] = useState<string | null>(null);

    useEffect(() => {
      fetch("/api/changelog").then(r => r.ok ? r.json() : []).then(d => { setEntries(d); setLoading(false); }).catch(() => setLoading(false));
    }, []);

    return (
      <div className="rounded-2xl border bg-card p-6 space-y-4">
        <div className="flex items-center gap-3">
          <Package className="w-5 h-5 text-muted-foreground" />
          <div>
            <h2 className="font-semibold text-base">Recent Updates</h2>
            <p className="text-muted-foreground text-xs mt-0.5">{entries.length} releases tracked</p>
          </div>
        </div>
        {loading ? <p className="text-sm text-muted-foreground">Loading...</p> : (
          <div className="space-y-2">
            {entries.slice(0, 5).map(entry => {
              const t = TYPE_CONFIG[entry.type] || TYPE_CONFIG.patch;
              const isOpen = expanded === entry.version;
              return (
                <div key={entry.version} className="rounded-xl border overflow-hidden">
                  <button className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted/30 transition-colors text-left"
                    onClick={() => setExpanded(isOpen ? null : entry.version)}>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${t.badge}`}>{t.label}</span>
                    <span className="text-sm font-mono font-semibold text-foreground">v{entry.version}</span>
                    <span className="text-xs text-muted-foreground flex-1">{entry.date}</span>
                    {isOpen ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />}
                  </button>
                  {isOpen && (
                    <ul className="px-4 pb-3 pt-1 border-t bg-muted/20 space-y-1">
                      {entry.changes.map((c, i) => (
                        <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                          <span className="mt-1.5 w-1 h-1 rounded-full bg-muted-foreground/40 flex-shrink-0" />
                          {c}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        )}
        <a href="/updates" target="_blank" rel="noreferrer"
          className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5">
          View full changelog →
        </a>
      </div>
    );
  }

  // ── Main Page ────────────────────────────────────────────────────────────────
  type Tab = "preferences" | "status" | "updates";

  export default function AccountSettingsPage({ guildId }: { guildId: string }) {
    const { theme, setTheme } = useTheme();
    const [tab, setTab] = useState<Tab>("preferences");

    const themes = [
      { value: "dark",   label: "Dark",   icon: Moon,    desc: "Easier on the eyes at night." },
      { value: "light",  label: "Light",  icon: Sun,     desc: "Clean, bright interface." },
      { value: "system", label: "System", icon: Monitor, desc: "Matches your OS preference." },
    ];

    const TABS: { id: Tab; label: string; icon: any }[] = [
      { id: "preferences", label: "Preferences", icon: Monitor },
      { id: "status",      label: "System Status", icon: Activity },
      { id: "updates",     label: "Updates",      icon: Package },
    ];

    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Account Settings</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage preferences, check system health, and view recent updates.</p>
        </div>

        {/* Tab bar */}
        <div className="flex items-center gap-1 border-b pb-0">
          {TABS.map(t => {
            const Icon = t.icon;
            return (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${tab === t.id ? "border-[#d4af37] text-foreground" : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"}`}>
                <Icon className="w-3.5 h-3.5" />
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Preferences tab */}
        {tab === "preferences" && (
          <div className="space-y-6">
            <div className="rounded-2xl border bg-card p-6 space-y-5">
              <div>
                <h2 className="font-semibold text-base">Appearance</h2>
                <p className="text-muted-foreground text-sm mt-0.5">Choose how the dashboard looks to you.</p>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {themes.map((t) => {
                  const Icon = t.icon;
                  const active = theme === t.value;
                  return (
                    <button key={t.value} onClick={() => setTheme(t.value)}
                      className="flex flex-col items-center gap-2 p-4 rounded-xl border text-center transition-all"
                      style={active ? { borderColor: "#d4af37", background: "rgba(212,175,55,.1)", color: "#d4af37" } : { borderColor: "var(--border)", background: "transparent" }}>
                      <Icon className="w-5 h-5" />
                      <span className="text-sm font-semibold">{t.label}</span>
                      <span className="text-xs text-muted-foreground leading-tight">{t.desc}</span>
                      {active && <span className="text-[10px] font-bold uppercase tracking-widest mt-1" style={{ color: "#d4af37" }}>Active</span>}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="rounded-2xl border bg-card p-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="font-semibold text-base">Dark Mode</Label>
                  <p className="text-muted-foreground text-sm mt-0.5">Toggle between dark and light mode quickly.</p>
                </div>
                <Switch checked={theme === "dark"} onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")} />
              </div>
            </div>
            <div className="rounded-2xl border bg-card p-6 space-y-3">
              <h2 className="font-semibold text-base">Session</h2>
              <p className="text-muted-foreground text-sm">You are logged in via Discord OAuth. Your session is managed securely server-side.</p>
              <p className="text-xs text-muted-foreground">Server: <span className="font-mono">{guildId}</span></p>
            </div>
          </div>
        )}

        {/* Status tab */}
        {tab === "status" && <StatusPanel />}

        {/* Updates tab */}
        {tab === "updates" && <UpdatesPanel />}
      </div>
    );
  }