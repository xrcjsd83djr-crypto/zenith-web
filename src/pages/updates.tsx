import { useState, useEffect } from "react";
  import { Link } from "wouter";
  import { Zap, CheckCircle2, Wrench, Package, ChevronDown, ChevronRight, Search, Filter } from "lucide-react";
  import { Input } from "@/components/ui/input";

  interface ChangelogEntry { version: string; date: string; type: string; changes: string[]; }

  const TYPE_CONFIG: Record<string, { label: string; icon: any; badge: string; border: string }> = {
    major:   { label: "Major Release", icon: Zap,          badge: "bg-purple-500/20 text-purple-300 border border-purple-500/30",   border: "border-l-purple-500" },
    feature: { label: "Features",      icon: CheckCircle2,  badge: "bg-blue-500/20 text-blue-300 border border-blue-500/30",         border: "border-l-blue-500" },
    fix:     { label: "Bug Fix",       icon: Wrench,        badge: "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30", border: "border-l-emerald-500" },
    patch:   { label: "Patch",         icon: Package,       badge: "bg-zinc-500/20 text-zinc-400 border border-zinc-500/30",         border: "border-l-zinc-600" },
  };

  function UpdateEntry({ entry, defaultOpen = false }: { entry: ChangelogEntry; defaultOpen?: boolean }) {
    const [open, setOpen] = useState(defaultOpen);
    const t = TYPE_CONFIG[entry.type] || TYPE_CONFIG.patch;
    const Icon = t.icon;

    return (
      <div className={`rounded-2xl border border-white/[0.08] bg-white/[0.03] overflow-hidden border-l-2 ${t.border}`}>
        <button className="w-full flex items-center gap-4 px-5 py-4 hover:bg-white/5 transition-colors text-left group"
          onClick={() => setOpen(o => !o)}>
          <div className="flex-1 flex items-center gap-3 min-w-0">
            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${t.badge} flex-shrink-0`}>{t.label}</span>
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="font-mono font-bold text-white text-sm">v{entry.version}</span>
              <span className="text-white/20">—</span>
              <span className="text-white/50 text-sm truncate">{entry.changes[0]}{entry.changes.length > 1 ? ` +${entry.changes.length-1} more` : ""}</span>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <span className="text-xs text-white/25 font-mono">{entry.date}</span>
            {open ? <ChevronDown className="w-4 h-4 text-white/20 group-hover:text-white/40 transition-colors" />
                  : <ChevronRight className="w-4 h-4 text-white/20 group-hover:text-white/40 transition-colors" />}
          </div>
        </button>
        {open && (
          <div className="px-5 pb-5 pt-2 border-t border-white/[0.07] space-y-2">
            <div className="flex items-center gap-2 mb-3">
              <Icon className="w-3.5 h-3.5 text-white/30" />
              <span className="text-xs text-white/30 font-semibold uppercase tracking-widest">{entry.changes.length} change{entry.changes.length !== 1 ? "s" : ""}</span>
            </div>
            {entry.changes.map((c, i) => (
              <div key={i} className="flex items-start gap-3 text-sm">
                <span className="text-white/20 mt-1.5 w-1 h-1 rounded-full bg-white/20 flex-shrink-0" />
                <span className="text-white/60 leading-relaxed">{c}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  export default function UpdatesPage() {
    const [entries, setEntries] = useState<ChangelogEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState("all");
    const [search, setSearch] = useState("");

    useEffect(() => {
      fetch("/api/changelog")
        .then(r => r.ok ? r.json() : [])
        .then(d => { setEntries(d); setLoading(false); })
        .catch(() => setLoading(false));
    }, []);

    const filtered = entries.filter(e => {
      if (filter !== "all" && e.type !== filter) return false;
      if (search) {
        const q = search.toLowerCase();
        return e.version.includes(q) || e.changes.some(c => c.toLowerCase().includes(q));
      }
      return true;
    });

    const totalChanges = entries.reduce((acc, e) => acc + e.changes.length, 0);

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
              <Link href="/status" className="text-sm text-white/40 hover:text-white transition-colors">Status</Link>
              <Link href="/servers" className="text-sm font-medium text-white/70 hover:text-white transition-colors">Dashboard</Link>
            </div>
          </div>
        </nav>

        <div className="max-w-5xl mx-auto px-4 py-12">
          {/* Header */}
          <div className="mb-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(212,175,55,.15)" }}>
                <Package className="w-5 h-5" style={{ color: "#d4af37" }} />
              </div>
              <div>
                <h1 className="text-2xl font-extrabold tracking-tight">Update Log</h1>
                <p className="text-white/40 text-sm">{entries.length} releases · {totalChanges} total changes</p>
              </div>
            </div>

            {/* Filters & search */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search changes..."
                  className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-white/25 h-9" />
              </div>
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-white/30 flex-shrink-0" />
                {["all", "major", "feature", "fix", "patch"].map(f => (
                  <button key={f} onClick={() => setFilter(f)}
                    className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${filter === f ? "text-black" : "text-white/40 hover:text-white bg-white/5 hover:bg-white/10"}`}
                    style={filter === f ? { background: "linear-gradient(135deg,#d4af37,#f0c040)" } : {}}>
                    {f === "all" ? "All" : TYPE_CONFIG[f]?.label || f}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Timeline */}
          {loading ? (
            <div className="flex items-center justify-center py-20 text-white/30 text-sm">Loading changelog...</div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-white/20 text-sm gap-2">
              <Package className="w-10 h-10 mb-2 opacity-40" />
              No results found.
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((entry, i) => <UpdateEntry key={entry.version} entry={entry} defaultOpen={i === 0} />)}
            </div>
          )}
        </div>
      </div>
    );
  }