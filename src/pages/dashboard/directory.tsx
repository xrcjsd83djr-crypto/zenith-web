import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Users, RefreshCw, Search, Copy, ExternalLink, ChevDown, ChevronDown, ChevronUp, Shield, Star } from "lucide-react";

interface StaffMember {
  id: string; user_id: string; username: string; avatar_url?: string;
  role?: string; rank?: string; division?: string; callsign?: string;
  roblox_username?: string; strikes?: number; is_active: boolean; joined_at: string;
}

function MemberCard({ member }: { member: StaffMember }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const copyId = () => {
    navigator.clipboard.writeText(member.user_id).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  };

  const initial = member.username[0]?.toUpperCase();

  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <button onClick={() => setOpen(o => !o)} className="w-full text-left hover:bg-muted/30 transition-colors p-4">
        <div className="flex items-center gap-3">
          {member.avatar_url ? (
            <img src={member.avatar_url} alt={member.username} className="w-10 h-10 rounded-full flex-shrink-0" />
          ) : (
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0" style={{ background: 'rgba(212,175,55,.15)', color: '#d4af37' }}>{initial}</div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-sm">{member.username}</span>
              {member.rank && <Badge className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200">{member.rank}</Badge>}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {member.division ? member.division : member.role || 'Staff Member'}
              {member.callsign && ` • ${member.callsign}`}
            </p>
          </div>
          {open ? <ChevronUp size={14} className="text-muted-foreground flex-shrink-0" /> : <ChevronDown size={14} className="text-muted-foreground flex-shrink-0" />}
        </div>
      </button>
      {open && (
        <div className="px-4 pb-4 border-t border-border bg-muted/10">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-3">
            <div><p className="text-xs text-muted-foreground font-medium">Discord Username</p><p className="text-sm font-medium">{member.username}</p></div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Discord ID</p>
              <div className="flex items-center gap-1">
                <p className="text-xs font-mono">{member.user_id}</p>
                <button onClick={copyId} className="text-muted-foreground hover:text-foreground transition-colors p-0.5 rounded">
                  {copied ? <span className="text-[10px] text-green-600">✓</span> : <Copy size={10} />}
                </button>
              </div>
            </div>
            {member.roblox_username && <div><p className="text-xs text-muted-foreground font-medium">Roblox Username</p><p className="text-sm">{member.roblox_username}</p></div>}
            {member.rank && <div><p className="text-xs text-muted-foreground font-medium">Rank</p><p className="text-sm font-medium">{member.rank}</p></div>}
            {member.division && <div><p className="text-xs text-muted-foreground font-medium">Division</p><p className="text-sm">{member.division}</p></div>}
            {member.callsign && <div><p className="text-xs text-muted-foreground font-medium">Callsign</p><p className="text-sm font-mono">{member.callsign}</p></div>}
            <div><p className="text-xs text-muted-foreground font-medium">Strikes</p><p className={`text-sm font-bold ${member.strikes ? 'text-red-500' : 'text-green-500'}`}>{member.strikes || 0}</p></div>
            <div><p className="text-xs text-muted-foreground font-medium">Joined</p><p className="text-sm">{new Date(member.joined_at).toLocaleDateString()}</p></div>
          </div>
          {member.roblox_username && (
            <a href={`https://www.roblox.com/users/profile?username=${member.roblox_username}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 mt-3 text-xs text-blue-600 hover:text-blue-700">
              <ExternalLink size={11} />View Roblox Profile
            </a>
          )}
        </div>
      )}
    </div>
  );
}

export default function DirectoryPage({ guildId }: { guildId: string }) {
  const [members, setMembers] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [rankFilter, setRankFilter] = useState('');
  const [divisionFilter, setDivisionFilter] = useState('');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/guilds/${guildId}/staff`, { credentials: 'include' });
      if (res.ok) { const d = await res.json().catch(() => []); setMembers(Array.isArray(d) ? d.filter((m: StaffMember) => m.is_active) : []); }
    } catch {}
    setLoading(false);
  }, [guildId]);
  useEffect(() => { fetchAll(); }, [fetchAll]);

  const uniqueRanks = [...new Set(members.map(m => m.rank).filter(Boolean))].sort() as string[];
  const uniqueDivisions = [...new Set(members.map(m => m.division).filter(Boolean))].sort() as string[];

  const filtered = members.filter(m => {
    if (rankFilter && m.rank !== rankFilter) return false;
    if (divisionFilter && m.division !== divisionFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      return m.username.toLowerCase().includes(s) || (m.roblox_username || '').toLowerCase().includes(s) || (m.rank || '').toLowerCase().includes(s) || (m.division || '').toLowerCase().includes(s) || (m.callsign || '').toLowerCase().includes(s);
    }
    return true;
  });

  return (
    <div className="space-y-5 max-w-5xl">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6" style={{ color: '#d4af37' }} />Staff Directory
          </h2>
          <p className="text-muted-foreground mt-0.5 text-sm">{filtered.length} of {members.length} staff members</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchAll} className="gap-1.5"><RefreshCw size={13} />Refresh</Button>
      </div>

      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search by name, rank, division, or Roblox..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9 text-sm" />
        </div>
        {uniqueRanks.length > 0 && (
          <select value={rankFilter} onChange={e => setRankFilter(e.target.value)} className="h-9 px-3 text-sm rounded-md border border-input bg-background">
            <option value="">All Ranks</option>
            {uniqueRanks.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        )}
        {uniqueDivisions.length > 0 && (
          <select value={divisionFilter} onChange={e => setDivisionFilter(e.target.value)} className="h-9 px-3 text-sm rounded-md border border-input bg-background">
            <option value="">All Divisions</option>
            {uniqueDivisions.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        )}
        {(search || rankFilter || divisionFilter) && (
          <Button variant="ghost" size="sm" onClick={() => { setSearch(''); setRankFilter(''); setDivisionFilter(''); }} className="text-xs h-9">Clear</Button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="w-7 h-7 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#d4af37', borderTopColor: 'transparent' }} /></div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground text-sm">
          <Users size={32} className="mx-auto mb-2 text-muted-foreground/40" />
          {search ? `No staff matching "${search}"` : 'No active staff found.'}
        </CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filtered.map(m => <MemberCard key={m.id} member={m} />)}
        </div>
      )}
    </div>
  );
}
