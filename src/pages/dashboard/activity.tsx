import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { RefreshCw, Loader2, Activity, Search, Shield, AlertTriangle, Calendar, Settings, Users } from "lucide-react";

interface LogEntry { id: string; type?: string; action: string; action_name?: string; user: string; user_name?: string; target?: string; target_name?: string; reason?: string; timestamp: string; }

const ACTION_COLORS: Record<string, string> = {
  'strike-issued': 'bg-red-500/20 text-red-400 border-red-500/30',
  'strike': 'bg-red-500/20 text-red-400 border-red-500/30',
  'loa-request': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  'loa': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  'staff_add': 'bg-green-500/20 text-green-400 border-green-500/30',
  'staff_remove': 'bg-red-500/20 text-red-400 border-red-500/30',
  'config_update': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  'bot-add': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
};

const ACTION_ICONS: Record<string, any> = {
  strike: AlertTriangle, loa: Calendar, config: Settings, staff: Users,
};

export default function ActivityPage({ guildId }: { guildId: string }) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/guilds/${guildId}/audit-logs`, { credentials: 'include' });
      if (res.ok) setLogs(await res.json());
    } catch { }
    setLoading(false);
  }, [guildId]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const filters = [
    { key: 'all', label: 'All' },
    { key: 'strike', label: 'Strikes' },
    { key: 'loa', label: 'LOA' },
    { key: 'discord', label: 'Discord' },
    { key: 'activity', label: 'Activity' },
  ];

  const filtered = logs.filter(l => {
    if (activeFilter !== 'all' && !l.type?.includes(activeFilter) && !l.action?.includes(activeFilter)) return false;
    if (search) {
      const q = search.toLowerCase();
      return (l.user_name || l.user || '').toLowerCase().includes(q) ||
        (l.target_name || l.target || '').toLowerCase().includes(q) ||
        (l.action_name || l.action || '').toLowerCase().includes(q) ||
        (l.reason || '').toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Audit Logs</h2>
          <p className="text-gray-400 text-sm mt-1">All Discord and bot actions for this server</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchLogs} className="border-[#3a3d4a] text-gray-300"><RefreshCw size={14} className="mr-2" />Refresh</Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by user, action, reason..." className="bg-[#1e2028] border-[#3a3d4a] text-white pl-9" />
        </div>
        <div className="flex gap-2 flex-wrap">
          {filters.map(f => (
            <Button key={f.key} size="sm" variant={activeFilter === f.key ? "default" : "outline"}
              onClick={() => setActiveFilter(f.key)}
              className={activeFilter === f.key ? "bg-blue-600 text-white" : "border-[#3a3d4a] text-gray-400 hover:text-white"}
            >{f.label}</Button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-blue-400" size={24} /></div>
      ) : filtered.length === 0 ? (
        <Card className="bg-[#161820] border-[#3a3d4a]">
          <CardContent className="py-12 text-center">
            <Activity className="mx-auto mb-3 text-gray-600" size={32} />
            <p className="text-gray-400">No audit log entries found.</p>
            <p className="text-gray-600 text-sm mt-1">Make sure the bot has the correct permissions.</p>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-[#161820] border-[#3a3d4a]">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-base flex items-center gap-2">
              <Activity className="text-blue-400" size={16} />
              {filtered.length} {filtered.length === 1 ? 'entry' : 'entries'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 p-3">
            {filtered.map((log, i) => {
              const actionKey = Object.keys(ACTION_COLORS).find(k => log.action?.includes(k) || log.type?.includes(k)) || 'default';
              const colorClass = ACTION_COLORS[actionKey] || 'bg-gray-500/20 text-gray-400 border-gray-500/30';
              return (
                <div key={log.id || i} className="flex items-start gap-3 p-3 bg-[#1e2028] rounded-lg hover:bg-[#252830] transition-colors">
                  <div className="flex-shrink-0 mt-0.5">
                    <div className="w-8 h-8 rounded-full bg-[#2a2d3a] flex items-center justify-center">
                      <Shield size={14} className="text-gray-400" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className={`${colorClass} text-xs border`}>{log.action_name || log.action}</Badge>
                      {log.user_name && <span className="text-white text-sm font-medium">{log.user_name}</span>}
                      {log.target_name && <><span className="text-gray-500 text-xs">→</span><span className="text-gray-300 text-sm">{log.target_name}</span></>}
                    </div>
                    {log.reason && <p className="text-gray-400 text-xs truncate">{log.reason}</p>}
                    <p className="text-gray-600 text-xs">{log.timestamp ? new Date(log.timestamp).toLocaleString() : ''}</p>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
