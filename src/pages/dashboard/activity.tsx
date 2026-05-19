import { useState, useEffect, useCallback } from "react";
  import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
  import { Button } from "@/components/ui/button";
  import { Badge } from "@/components/ui/badge";
  import { Input } from "@/components/ui/input";
  import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
  import { Activity, RefreshCw, ChevronDown, ChevronUp, Search, Filter, Clock, User, Info } from "lucide-react";

  interface LogEntry {
    id: number; guild_id: string; user_id?: string; username?: string;
    action: string; details: Record<string, any>; created_at: string;
  }

  const ACTION_LABELS: Record<string, { label: string; color: string; icon: string }> = {
    staff_add:       { label: "Staff Added",       color: "bg-green-100 text-green-700",  icon: "➕" },
    staff_remove:    { label: "Staff Removed",     color: "bg-red-100 text-red-700",      icon: "➖" },
    strike_add:      { label: "Strike Issued",     color: "bg-orange-100 text-orange-700",icon: "⚠️" },
    strike_remove:   { label: "Strike Removed",    color: "bg-blue-100 text-blue-700",    icon: "✅" },
    warning_add:     { label: "Warning Issued",    color: "bg-yellow-100 text-yellow-700",icon: "⚡" },
    promotion:       { label: "Promotion",         color: "bg-purple-100 text-purple-700",icon: "⬆️" },
    demotion:        { label: "Demotion",          color: "bg-pink-100 text-pink-700",    icon: "⬇️" },
    blacklist_add:   { label: "Blacklisted",       color: "bg-red-100 text-red-800",      icon: "🚫" },
    blacklist_remove:{ label: "Unblacklisted",     color: "bg-green-100 text-green-700",  icon: "✔️" },
    loa_request:     { label: "LOA Request",       color: "bg-cyan-100 text-cyan-700",    icon: "📅" },
    loa_approved:    { label: "LOA Approved",      color: "bg-teal-100 text-teal-700",    icon: "✅" },
    config_update:   { label: "Config Updated",    color: "bg-gray-100 text-gray-700",    icon: "⚙️" },
    shift_start:     { label: "Shift Started",     color: "bg-indigo-100 text-indigo-700",icon: "🕐" },
    shift_end:       { label: "Shift Ended",       color: "bg-indigo-100 text-indigo-600",icon: "🕔" },
    rank_create:     { label: "Rank Created",      color: "bg-violet-100 text-violet-700",icon: "🏅" },
    note_added:      { label: "Note Added",        color: "bg-amber-100 text-amber-700",  icon: "📝" },
    panel_posted:    { label: "Panel Posted",      color: "bg-sky-100 text-sky-700",      icon: "📌" },
    commendation:    { label: "Commendation",      color: "bg-pink-100 text-pink-600",    icon: "🌟" },
  };

  function ActionBadge({ action }: { action: string }) {
    const info = ACTION_LABELS[action] || { label: action.replace(/_/g,' '), color: "bg-gray-100 text-gray-600", icon: "•" };
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${info.color}`}>
        <span>{info.icon}</span>{info.label}
      </span>
    );
  }

  function LogRow({ log }: { log: LogEntry }) {
    const [open, setOpen] = useState(false);
    const ts = new Date(log.created_at);
    const details = typeof log.details === 'object' ? log.details : {};
    const detailKeys = Object.keys(details).filter(k => details[k] !== null && details[k] !== undefined && details[k] !== '');

    return (
      <div className="border border-border rounded-lg overflow-hidden mb-2">
        <button
          onClick={() => setOpen(o => !o)}
          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors text-left"
        >
          <ActionBadge action={log.action} />
          <div className="flex-1 min-w-0">
            {log.username && (
              <span className="font-medium text-sm mr-2">{log.username}</span>
            )}
            {details.target && <span className="text-muted-foreground text-xs">→ {details.target}</span>}
            {details.reason && <span className="text-muted-foreground text-xs ml-2 truncate">"{String(details.reason).slice(0,60)}"</span>}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-muted-foreground text-xs hidden sm:block">
              {ts.toLocaleDateString()} {ts.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
            {open ? <ChevronUp size={14} className="text-muted-foreground" /> : <ChevronDown size={14} className="text-muted-foreground" />}
          </div>
        </button>
        {open && (
          <div className="px-4 pb-4 border-t border-border bg-muted/20">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-3">
              <div>
                <p className="text-xs text-muted-foreground font-medium mb-0.5">Action</p>
                <p className="text-sm">{ACTION_LABELS[log.action]?.label || log.action}</p>
              </div>
              {log.username && (
                <div>
                  <p className="text-xs text-muted-foreground font-medium mb-0.5">By</p>
                  <p className="text-sm font-medium">{log.username}</p>
                </div>
              )}
              {log.user_id && (
                <div>
                  <p className="text-xs text-muted-foreground font-medium mb-0.5">User ID</p>
                  <p className="text-sm font-mono text-xs">{log.user_id}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-muted-foreground font-medium mb-0.5">Timestamp</p>
                <p className="text-sm">{ts.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium mb-0.5">Log ID</p>
                <p className="text-sm font-mono text-xs">#{log.id}</p>
              </div>
              {detailKeys.map(key => (
                <div key={key}>
                  <p className="text-xs text-muted-foreground font-medium mb-0.5 capitalize">{key.replace(/_/g,' ')}</p>
                  <p className="text-sm break-words">{String(details[key]).slice(0,200)}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  export default function ActivityPage({ guildId }: { guildId: string }) {
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [actionFilter, setActionFilter] = useState('all');
    const [page, setPage] = useState(1);
    const PER_PAGE = 25;

    const fetchLogs = useCallback(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/guilds/${guildId}/activity`, { credentials: 'include' });
        if (res.ok) setLogs(await res.json());
      } catch {}
      setLoading(false);
    }, [guildId]);

    useEffect(() => { fetchLogs(); }, [fetchLogs]);

    const filtered = logs.filter(l => {
      const matchSearch = !search || l.username?.toLowerCase().includes(search.toLowerCase()) ||
        l.action.includes(search.toLowerCase()) ||
        JSON.stringify(l.details).toLowerCase().includes(search.toLowerCase());
      const matchAction = actionFilter === 'all' || l.action === actionFilter;
      return matchSearch && matchAction;
    });

    const paged = filtered.slice(0, page * PER_PAGE);
    const uniqueActions = [...new Set(logs.map(l => l.action))].sort();

    return (
      <div className="space-y-5 max-w-4xl">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight flex items-center gap-2">
              <Activity className="w-6 h-6" style={{ color: '#d4af37' }} />Activity Log
            </h2>
            <p className="text-muted-foreground mt-0.5 text-sm">
              {filtered.length} of {logs.length} entries — click any row to expand details
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchLogs} className="gap-1.5"><RefreshCw size={13} />Refresh</Button>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search by user, action, or detail..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} className="pl-9 h-9 text-sm" />
          </div>
          <Select value={actionFilter} onValueChange={v => { setActionFilter(v); setPage(1); }}>
            <SelectTrigger className="w-[180px] h-9 text-sm">
              <Filter size={12} className="mr-1" /><SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Actions</SelectItem>
              {uniqueActions.map(a => (
                <SelectItem key={a} value={a}>{ACTION_LABELS[a]?.label || a}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><div className="w-7 h-7 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#d4af37', borderTopColor: 'transparent' }} /></div>
        ) : filtered.length === 0 ? (
          <Card><CardContent className="py-12 text-center text-muted-foreground text-sm">No activity logs found.</CardContent></Card>
        ) : (
          <>
            <div>{paged.map(log => <LogRow key={log.id} log={log} />)}</div>
            {paged.length < filtered.length && (
              <Button variant="outline" className="w-full" onClick={() => setPage(p => p + 1)}>
                Load more ({filtered.length - paged.length} remaining)
              </Button>
            )}
          </>
        )}
      </div>
    );
  }
  