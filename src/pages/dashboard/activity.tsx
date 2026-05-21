import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ActivitySquare, RefreshCw, Search, ChevronDown, ChevronUp, Clock, User, Tag } from "lucide-react";

interface ActivityLog {
  id: number; guild_id: string; user_id?: string; username?: string;
  action: string; details?: Record<string, any>; ip_address?: string; created_at: string;
}

const ACTION_ICONS: Record<string, string> = {
  shift_start: '⏱', shift_end: '✅', strike_issued: '⚠️', warning_issued: '🔔',
  loa_approved: '📅', loa_denied: '❌', promotion: '📈', demotion: '📉',
  commendation: '🏆', note_added: '📝', login: '🔑', mass_dm: '📨',
  training_complete: '🎓', performance_review: '⭐', blacklist_added: '🚫',
  blacklist_removed: '✔️', embed_sent: '📤', shift_cards_sent: '🃏',
  rank_request: '🎖', announcement: '📢', loa_request: '📋',
};

const ACTION_LABELS: Record<string, string> = {
  shift_start: 'Shift Started', shift_end: 'Shift Ended', strike_issued: 'Strike Issued',
  warning_issued: 'Warning Issued', loa_approved: 'LOA Approved', loa_denied: 'LOA Denied',
  promotion: 'Promotion', demotion: 'Demotion', commendation: 'Commendation',
  note_added: 'Note Added', login: 'Login', mass_dm: 'Mass DM Sent',
  training_complete: 'Training Complete', performance_review: 'Review Written',
  blacklist_added: 'Blacklisted', blacklist_removed: 'Blacklist Removed',
  embed_sent: 'Embed Sent', shift_cards_sent: 'Shift Cards Sent',
  rank_request: 'Rank Requested', announcement: 'Announcement', loa_request: 'LOA Requested',
};

const ACTION_COLORS: Record<string, string> = {
  shift_start: 'bg-green-100 text-green-700 border-green-200',
  shift_end: 'bg-blue-100 text-blue-700 border-blue-200',
  strike_issued: 'bg-orange-100 text-orange-700 border-orange-200',
  warning_issued: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  promotion: 'bg-purple-100 text-purple-700 border-purple-200',
  demotion: 'bg-red-100 text-red-700 border-red-200',
  commendation: 'bg-amber-100 text-amber-700 border-amber-200',
  login: 'bg-gray-100 text-gray-600 border-gray-200',
  mass_dm: 'bg-indigo-100 text-indigo-700 border-indigo-200',
};

function ActivityRow({ log }: { log: ActivityLog }) {
  const [open, setOpen] = useState(false);
  const ts = new Date(log.created_at);
  const icon = ACTION_ICONS[log.action] || '📌';
  const label = ACTION_LABELS[log.action] || log.action.replace(/_/g, ' ');
  const colorClass = ACTION_COLORS[log.action] || 'bg-muted text-muted-foreground border-border';
  const hasDetails = log.details && Object.keys(log.details).length > 0;

  return (
    <div className="border-b border-border last:border-0">
      <button
        onClick={() => hasDetails && setOpen(o => !o)}
        className={`w-full flex items-center gap-3 px-4 py-3 ${hasDetails ? 'hover:bg-muted/30 cursor-pointer' : 'cursor-default'} transition-colors text-left`}
      >
        <span className="text-lg flex-shrink-0 w-6 text-center">{icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className={`text-[10px] border ${colorClass}`}>{label}</Badge>
            {log.username && <span className="text-sm font-medium">{log.username}</span>}
          </div>
          {log.details?.target && <p className="text-xs text-muted-foreground mt-0.5">Target: {log.details.target}</p>}
          {log.details?.reason && <p className="text-xs text-muted-foreground mt-0.5">"{String(log.details.reason).slice(0, 60)}"</p>}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xs text-muted-foreground hidden sm:block" title={ts.toLocaleString()}>
            {ts.toLocaleDateString()} {ts.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
          {hasDetails && (open ? <ChevronUp size={13} className="text-muted-foreground" /> : <ChevronDown size={13} className="text-muted-foreground" />)}
        </div>
      </button>
      {open && hasDetails && (
        <div className="px-4 pb-3 bg-muted/10">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2">
            <div>
              <p className="text-xs text-muted-foreground font-medium flex items-center gap-1"><Clock size={9} />Timestamp</p>
              <p className="text-xs">{ts.toLocaleString()}</p>
            </div>
            {log.user_id && (
              <div>
                <p className="text-xs text-muted-foreground font-medium flex items-center gap-1"><User size={9} />User ID</p>
                <p className="text-xs font-mono">{log.user_id}</p>
              </div>
            )}
            {Object.entries(log.details || {}).map(([k, v]) => (
              <div key={k}>
                <p className="text-xs text-muted-foreground font-medium flex items-center gap-1"><Tag size={9} />{k.replace(/_/g, ' ')}</p>
                <p className="text-xs break-all">{typeof v === 'object' ? JSON.stringify(v) : String(v)}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ActivityPage({ guildId }: { guildId: string }) {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [limit, setLimit] = useState('100');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/guilds/${guildId}/activity?limit=${limit}`, { credentials: 'include' });
      if (res.ok) { const d = await res.json().catch(() => []); setLogs(Array.isArray(d) ? d : []); }
    } catch {}
    setLoading(false);
  }, [guildId, limit]);
  useEffect(() => { fetchAll(); }, [fetchAll]);

  const uniqueActions = [...new Set(logs.map(l => l.action))].sort();
  const filtered = logs.filter(l => {
    if (actionFilter !== 'all' && l.action !== actionFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      return (l.username || '').toLowerCase().includes(s) || l.action.toLowerCase().includes(s) || JSON.stringify(l.details || {}).toLowerCase().includes(s);
    }
    return true;
  });

  return (
    <div className="space-y-5 max-w-5xl">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight flex items-center gap-2">
            <ActivitySquare className="w-6 h-6" style={{ color: '#d4af37' }} />Activity Logs
          </h2>
          <p className="text-muted-foreground mt-0.5 text-sm">{logs.length} entries — click any row to expand full details</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchAll} className="gap-1.5"><RefreshCw size={13} />Refresh</Button>
      </div>

      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search logs..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9 text-sm" />
        </div>
        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="h-9 w-44 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Actions</SelectItem>
            {uniqueActions.map(a => <SelectItem key={a} value={a}>{ACTION_LABELS[a] || a}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={limit} onValueChange={setLimit}>
          <SelectTrigger className="h-9 w-32 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="50">Last 50</SelectItem>
            <SelectItem value="100">Last 100</SelectItem>
            <SelectItem value="250">Last 250</SelectItem>
            <SelectItem value="500">Last 500</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="w-7 h-7 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#d4af37', borderTopColor: 'transparent' }} /></div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground text-sm">
          <ActivitySquare size={32} className="mx-auto mb-2 text-muted-foreground/40" />
          No activity logs found.
        </CardContent></Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            {filtered.map(log => <ActivityRow key={log.id} log={log} />)}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
