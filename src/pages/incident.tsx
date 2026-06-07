import { useState, useEffect, useCallback } from "react";
import { Link } from "wouter";
import { CheckCircle2, AlertTriangle, Clock, ArrowLeft, RefreshCw, Zap, Database, Bot, Wifi, Circle } from "lucide-react";

interface OutageUpdate {
  id: string;
  status: string;
  message: string;
  created_at: string;
}

interface Outage {
  id: string;
  slug: string;
  title: string;
  description: string;
  severity: string;
  status: string;
  affected_systems: string[];
  resolution?: string;
  started_at: string;
  resolved_at?: string;
  updates?: OutageUpdate[];
}

const SEV_COLORS: Record<string, { bg: string; text: string; border: string; label: string }> = {
  minor:    { bg: "bg-yellow-500/10",  text: "text-yellow-400",  border: "border-yellow-500/20",  label: "Minor" },
  moderate: { bg: "bg-orange-500/10",  text: "text-orange-400",  border: "border-orange-500/20",  label: "Moderate" },
  major:    { bg: "bg-red-500/10",     text: "text-red-400",     border: "border-red-500/20",     label: "Major" },
  critical: { bg: "bg-purple-500/10",  text: "text-purple-400",  border: "border-purple-500/20",  label: "Critical" },
};

const UPDATE_STATUS: Record<string, { icon: string; color: string; label: string }> = {
  investigating: { icon: "🔍", color: "text-yellow-400",  label: "Investigating" },
  identified:    { icon: "🎯", color: "text-orange-400",  label: "Identified" },
  monitoring:    { icon: "👁️", color: "text-blue-400",    label: "Monitoring" },
  resolved:      { icon: "✅", color: "text-emerald-400", label: "Resolved" },
  update:        { icon: "📢", color: "text-white/60",    label: "Update" },
};

function duration(start: string, end?: string | null) {
  const ms = new Date(end || Date.now()).getTime() - new Date(start).getTime();
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export default function IncidentPage({ slug }: { slug: string }) {
  const [outage, setOutage]     = useState<Outage | null>(null);
  const [loading, setLoading]   = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [refreshing, setRefreshing]   = useState(false);

  const fetchOutage = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const r = await fetch(`/api/outages/by-slug/${slug}`);
      if (r.status === 404) { setNotFound(true); setLoading(false); return; }
      if (r.ok) {
        const data = await r.json();
        setOutage(data);
        setLastChecked(new Date());
      }
    } catch {}
    setLoading(false);
    setRefreshing(false);
  }, [slug]);

  useEffect(() => {
    fetchOutage();
    const isLive = !outage || outage.status !== "resolved";
    if (isLive) {
      const interval = setInterval(() => fetchOutage(true), 30000);
      return () => clearInterval(interval);
    }
  }, [fetchOutage, outage?.status]);

  const sev  = outage ? (SEV_COLORS[outage.severity] || SEV_COLORS.minor) : null;
  const isResolved = outage?.status === "resolved";

  return (
    <div className="min-h-screen bg-[#0d0f14] text-white">
      {/* Navbar */}
      <nav className="border-b border-white/5 bg-[#0d0f14]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-black font-bold text-lg" style={{ background: "linear-gradient(135deg,#d4af37,#ffd700)" }}>Z</div>
            <span className="font-bold text-white">Zenith</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/status" className="text-sm text-white/40 hover:text-white transition-colors flex items-center gap-1.5">
              <ArrowLeft className="w-3.5 h-3.5" /> Status
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-4 py-12">

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center gap-3 py-24">
            <div className="w-8 h-8 rounded-full border-2 animate-spin" style={{ borderColor: "#d4af37", borderTopColor: "transparent" }} />
            <p className="text-sm text-white/30">Loading incident...</p>
          </div>
        )}

        {/* Not found */}
        {notFound && (
          <div className="text-center py-24">
            <div className="text-5xl mb-4">🔍</div>
            <h1 className="text-xl font-bold text-white mb-2">Incident Not Found</h1>
            <p className="text-white/40 text-sm mb-6">The incident <code className="font-mono text-white/60">#{slug}</code> doesn't exist.</p>
            <Link href="/status" className="inline-flex items-center gap-2 text-sm text-white/60 hover:text-white border border-white/10 hover:border-white/20 px-4 py-2 rounded-lg transition-colors">
              <ArrowLeft className="w-4 h-4" /> Back to status
            </Link>
          </div>
        )}

        {/* Incident detail */}
        {outage && !loading && (
          <div className="space-y-8">

            {/* Header */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Link href="/status" className="text-xs text-white/30 hover:text-white transition-colors flex items-center gap-1">
                  <ArrowLeft className="w-3 h-3" /> All incidents
                </Link>
                <span className="text-white/10">/</span>
                <span className="text-xs font-mono text-white/30">#{outage.slug}</span>
              </div>

              <div className="flex items-start justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-white leading-tight mb-3">{outage.title}</h1>
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Severity badge */}
                    {sev && (
                      <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full border ${sev.bg} ${sev.text} ${sev.border}`}>
                        {sev.label} Severity
                      </span>
                    )}
                    {/* Status badge */}
                    <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full ${
                      isResolved ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                      : "bg-red-500/10 text-red-400 border border-red-500/20 animate-pulse"
                    }`}>
                      <Circle className={`w-1.5 h-1.5 fill-current ${isResolved ? "text-emerald-400" : "text-red-400"}`} />
                      {outage.status.charAt(0).toUpperCase() + outage.status.slice(1)}
                    </span>
                    {/* Duration */}
                    <span className="text-xs text-white/25 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Duration: {duration(outage.started_at, outage.resolved_at)}
                    </span>
                  </div>
                </div>
                <button onClick={() => fetchOutage(true)} disabled={refreshing}
                  className="flex-shrink-0 flex items-center gap-2 text-sm text-white/40 hover:text-white transition-colors px-3 py-1.5 rounded-lg border border-white/10 hover:border-white/20">
                  <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
                </button>
              </div>
            </div>

            {/* Impact banner */}
            <div className={`rounded-2xl border p-5 ${isResolved ? "border-white/[0.08] bg-white/[0.02]" : "border-red-500/30 bg-red-500/5"}`}>
              <p className="text-sm text-white/60 leading-relaxed">{outage.description}</p>
              {outage.affected_systems?.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4">
                  <span className="text-xs text-white/30 self-center">Affected:</span>
                  {outage.affected_systems.map(s => (
                    <span key={s} className="text-xs bg-white/5 border border-white/10 text-white/50 px-2.5 py-1 rounded-full">{s}</span>
                  ))}
                </div>
              )}
            </div>

            {/* Timeline */}
            <div>
              <h2 className="text-xs font-bold uppercase tracking-widest text-white/30 mb-5">Incident Timeline</h2>
              <div className="relative">
                {/* Vertical line */}
                <div className="absolute left-[7px] top-2 bottom-2 w-px bg-white/[0.07]" />

                <div className="space-y-6">
                  {/* Synthesized opening entry if no updates or as first entry */}
                  {(!outage.updates || outage.updates.length === 0) && (
                    <div className="flex gap-4">
                      <div className="w-3.5 h-3.5 rounded-full bg-yellow-500/20 border border-yellow-500/40 flex-shrink-0 mt-0.5 z-10" />
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-bold text-yellow-400">Investigating</span>
                          <span className="text-xs text-white/20">{new Date(outage.started_at).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                        </div>
                        <p className="text-sm text-white/50 leading-relaxed">{outage.description}</p>
                      </div>
                    </div>
                  )}

                  {outage.updates?.map((u, i) => {
                    const us = UPDATE_STATUS[u.status] || UPDATE_STATUS.update;
                    const isLast = i === (outage.updates?.length ?? 0) - 1;
                    return (
                      <div key={u.id} className="flex gap-4">
                        <div className={`w-3.5 h-3.5 rounded-full flex-shrink-0 mt-0.5 z-10 border ${
                          u.status === "resolved" ? "bg-emerald-500/20 border-emerald-500/40"
                          : u.status === "monitoring" ? "bg-blue-500/20 border-blue-500/40"
                          : u.status === "identified" ? "bg-orange-500/20 border-orange-500/40"
                          : "bg-yellow-500/20 border-yellow-500/40"
                        }`} />
                        <div className={isLast && u.status === "resolved" ? "pb-0" : ""}>
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-xs font-bold ${us.color}`}>{us.icon} {us.label}</span>
                            <span className="text-xs text-white/20">{new Date(u.created_at).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                          </div>
                          <p className="text-sm text-white/50 leading-relaxed">{u.message}</p>
                        </div>
                      </div>
                    );
                  })}

                  {/* Resolved entry if resolved but no explicit resolved update */}
                  {isResolved && outage.resolved_at && (!outage.updates || !outage.updates.some(u => u.status === "resolved")) && (
                    <div className="flex gap-4">
                      <div className="w-3.5 h-3.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex-shrink-0 mt-0.5 z-10" />
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-bold text-emerald-400">✅ Resolved</span>
                          <span className="text-xs text-white/20">{new Date(outage.resolved_at).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                        </div>
                        {outage.resolution && <p className="text-sm text-white/50 leading-relaxed">{outage.resolution}</p>}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Resolved banner */}
            {isResolved && (
              <div className="rounded-2xl bg-emerald-500/5 border border-emerald-500/15 p-5">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-emerald-400 text-sm">This incident has been resolved</p>
                    {outage.resolved_at && (
                      <p className="text-xs text-emerald-400/50 mt-0.5">
                        Resolved on {new Date(outage.resolved_at).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })} after {duration(outage.started_at, outage.resolved_at)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between pt-4 border-t border-white/[0.07]">
              <p className="text-xs text-white/20">
                {lastChecked ? `Last updated ${lastChecked.toLocaleTimeString()}` : ""}
                {!isResolved && " • Auto-refreshing every 30s"}
              </p>
              <Link href="/status" className="text-xs text-white/30 hover:text-white transition-colors flex items-center gap-1.5">
                <ArrowLeft className="w-3 h-3" /> All incidents
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
