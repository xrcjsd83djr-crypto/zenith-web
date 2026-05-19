import { useState, useEffect, useCallback } from "react";
  import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
  import { Badge } from "@/components/ui/badge";
  import { Button } from "@/components/ui/button";
  import { Input } from "@/components/ui/input";
  import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
  import { Users, Search, RefreshCw, Loader2, CheckCircle, UserCheck, AlertCircle, Shield, ChevronDown, X, Star, AlertTriangle, Clock } from "lucide-react";

  interface StaffMember {
    id: string; user_id?: string; userId?: string; username: string;
    displayName?: string; avatar?: string; avatar_url?: string;
    rank?: string; role?: string; division?: string; callsign?: string;
    roblox_username?: string; notes?: string; joined_at?: string;
    last_active?: string; is_active?: boolean; roles?: string[];
  }
  interface Role { id: string; name: string; color?: number; }
  interface StaffDetail extends StaffMember {
    strikes?: { id: string; reason: string; severity: string; active: boolean; created_at: string; issued_by_name?: string }[];
    loaHistory?: { id: string; status: string; reason: string; start_date: string; end_date: string }[];
  }

  function roleColor(color?: number) {
    if (!color) return '#94a3b8';
    return '#' + color.toString(16).padStart(6, '0');
  }

  function Avatar({ member, size = 10 }: { member: StaffMember; size?: number }) {
    const avatarUrl = member.avatar_url || member.avatar;
    const name = member.displayName || member.username || '?';
    const sizeClass = size === 10 ? 'w-10 h-10 text-base' : size === 8 ? 'w-8 h-8 text-sm' : 'w-12 h-12 text-lg';
    if (avatarUrl) {
      return (
        <img
          src={avatarUrl}
          alt={name}
          className={`${sizeClass} rounded-full object-cover flex-shrink-0 border border-amber-200`}
          onError={(e: any) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
        />
      );
    }
    return (
      <div className={`${sizeClass} rounded-full bg-gradient-to-br from-amber-100 to-amber-50 border border-amber-200 flex items-center justify-center flex-shrink-0 font-bold text-amber-700`}>
        {name[0].toUpperCase()}
      </div>
    );
  }

  function StaffPopup({ member, onClose, guildId }: { member: StaffMember; onClose: () => void; guildId: string }) {
    const [detail, setDetail] = useState<StaffDetail | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
      const uid = member.user_id || member.userId;
      if (!uid) { setLoading(false); setDetail(member as StaffDetail); return; }
      fetch(`/api/guilds/${guildId}/staff/${uid}`, { credentials: 'include' })
        .then(r => r.ok ? r.json() : null)
        .then(d => { setDetail(d || (member as StaffDetail)); setLoading(false); })
        .catch(() => { setDetail(member as StaffDetail); setLoading(false); });
    }, [guildId, member]);

    const d = detail;
    const activeLoa = d?.loaHistory?.find(l => ['approved', 'active'].includes(l.status));
    const activeStrikes = (d?.strikes || []).filter(s => s.active !== false);

    return (
      <Dialog open onOpenChange={v => { if (!v) onClose(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <Avatar member={member} size={10} />
              <div>
                <p className="font-bold text-base">{member.displayName || member.username}</p>
                {member.displayName && member.username && member.displayName !== member.username && (
                  <p className="text-xs text-muted-foreground font-normal">@{member.username}</p>
                )}
              </div>
            </DialogTitle>
          </DialogHeader>
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="animate-spin text-muted-foreground" size={20} /></div>
          ) : d ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><p className="text-xs text-muted-foreground font-medium mb-0.5">Rank</p><p className="font-semibold">{d.rank || d.role || '—'}</p></div>
                <div><p className="text-xs text-muted-foreground font-medium mb-0.5">Division</p><p>{d.division || '—'}</p></div>
                <div><p className="text-xs text-muted-foreground font-medium mb-0.5">Callsign</p><p className="font-mono">{d.callsign || '—'}</p></div>
                {d.roblox_username && <div><p className="text-xs text-muted-foreground font-medium mb-0.5">Roblox</p><p>{d.roblox_username}</p></div>}
                <div><p className="text-xs text-muted-foreground font-medium mb-0.5">Joined</p><p>{d.joined_at ? new Date(d.joined_at).toLocaleDateString() : '—'}</p></div>
                {d.last_active && <div><p className="text-xs text-muted-foreground font-medium mb-0.5">Last Active</p><p>{new Date(d.last_active).toLocaleDateString()}</p></div>}
              </div>
              <div className="flex gap-2">
                <div className={`flex-1 rounded-lg p-3 border text-center ${activeStrikes.length > 0 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
                  <p className={`text-xl font-bold ${activeStrikes.length > 0 ? 'text-red-600' : 'text-green-600'}`}>{activeStrikes.length}</p>
                  <p className="text-xs text-muted-foreground">Active Strikes</p>
                </div>
                <div className={`flex-1 rounded-lg p-3 border text-center ${activeLoa ? 'bg-yellow-50 border-yellow-200' : 'bg-muted/30 border-border'}`}>
                  <p className={`text-xl font-bold ${activeLoa ? 'text-yellow-600' : 'text-muted-foreground'}`}>{activeLoa ? activeLoa.status : '—'}</p>
                  <p className="text-xs text-muted-foreground">LOA Status</p>
                </div>
              </div>
              {activeStrikes.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Active Strikes</p>
                  {activeStrikes.slice(0, 3).map(s => (
                    <div key={s.id} className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs">
                      <span className="font-semibold capitalize">{s.severity}</span>
                      {s.issued_by_name && <span className="text-muted-foreground"> · by {s.issued_by_name}</span>}
                      <p className="text-muted-foreground mt-0.5">{s.reason}</p>
                    </div>
                  ))}
                </div>
              )}
              {d.notes && (
                <div><p className="text-xs font-semibold text-muted-foreground mb-1">Notes</p><p className="text-sm bg-muted/30 rounded-lg p-3 border">{d.notes}</p></div>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">No details available.</p>
          )}
        </DialogContent>
      </Dialog>
    );
  }

  export default function StaffPage({ guildId }: { guildId: string }) {
    const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
    const [roles, setRoles] = useState<Role[]>([]);
    const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
    const [search, setSearch] = useState('');
    const [roleSearch, setRoleSearch] = useState('');
    const [roleOpen, setRoleOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [membersLoading, setMembersLoading] = useState(false);
    const [staffLoaded, setStaffLoaded] = useState(false);
    const [selectedMember, setSelectedMember] = useState<StaffMember | null>(null);

    const fetchRoles = useCallback(async () => {
      try {
        const [rolesRes, savedRolesRes, staffRes] = await Promise.all([
          fetch(`/api/guilds/${guildId}/roles`, { credentials: 'include' }),
          fetch(`/api/guilds/${guildId}/staff-roles`, { credentials: 'include' }),
          fetch(`/api/guilds/${guildId}/staff`, { credentials: 'include' }),
        ]);
        if (rolesRes.ok) setRoles(await rolesRes.json());
        if (savedRolesRes.ok) {
          const { staffRoleIds } = await savedRolesRes.json();
          if (staffRoleIds?.length > 0) setSelectedRoles(staffRoleIds);
        }
        if (staffRes.ok) {
          const members = await staffRes.json();
          if (members?.length > 0) { setStaffMembers(members); setStaffLoaded(true); }
        }
      } catch { }
      setIsLoading(false);
    }, [guildId]);

    useEffect(() => { fetchRoles(); }, [fetchRoles]);

    const loadStaff = async () => {
      if (selectedRoles.length === 0) return;
      setMembersLoading(true);
      try {
        const saveRes = await fetch(`/api/guilds/${guildId}/staff-roles`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ roleIds: selectedRoles }),
        });
        if (saveRes.ok) {
          const staffRes = await fetch(`/api/guilds/${guildId}/staff`, { credentials: 'include' });
          if (staffRes.ok) {
            setStaffMembers(await staffRes.json());
            setStaffLoaded(true);
          }
        }
      } catch { }
      setMembersLoading(false);
    };

    const toggleRole = (id: string) => {
      setSelectedRoles(prev => prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]);
      setStaffLoaded(false);
    };

    const filteredRoles = roles.filter(r => r.name.toLowerCase().includes(roleSearch.toLowerCase()));
    const selectedRoleObjects = roles.filter(r => selectedRoles.includes(r.id));

    const filteredStaff = staffMembers.filter(m =>
      (m.username || '').toLowerCase().includes(search.toLowerCase()) ||
      (m.displayName || '').toLowerCase().includes(search.toLowerCase()) ||
      (m.rank || m.role || '').toLowerCase().includes(search.toLowerCase())
    );

    if (isLoading) return (
      <div className="flex justify-center items-center py-20">
        <div className="w-7 h-7 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#d4af37', borderTopColor: 'transparent' }} />
      </div>
    );

    return (
      <div className="space-y-5 max-w-4xl">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6" style={{ color: '#d4af37' }} /> Staff Directory
          </h2>
          <p className="text-muted-foreground mt-0.5 text-sm">Select the Discord roles that represent your staff tiers to load members. Click any member to view their profile.</p>
        </div>

        <Card className="border-border bg-white shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold">Select Staff Roles</CardTitle>
            <p className="text-xs text-muted-foreground">Choose which roles should be considered as staff. Members with these roles will appear in the directory.</p>
          </CardHeader>
          <CardContent className="space-y-3">
            {selectedRoleObjects.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {selectedRoleObjects.map(r => (
                  <div key={r.id} className="flex items-center gap-1 px-2 py-1 rounded-full border border-border bg-muted/30 text-xs font-medium">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: roleColor(r.color) }} />
                    @{r.name}
                    <button onClick={() => toggleRole(r.id)} className="ml-0.5 text-muted-foreground hover:text-red-500 transition-colors">
                      <X size={10} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="relative">
              <Button variant="outline" size="sm" onClick={() => setRoleOpen(o => !o)}
                className="w-full sm:w-72 justify-between gap-2 font-normal text-xs h-9 bg-white border-border">
                <span className="flex items-center gap-1.5">
                  <Shield size={12} className="text-muted-foreground" />
                  {selectedRoles.length > 0 ? `${selectedRoles.length} role${selectedRoles.length !== 1 ? 's' : ''} selected` : 'Add a staff role...'}
                </span>
                <ChevronDown size={12} className="text-muted-foreground" />
              </Button>
              {roleOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setRoleOpen(false)} />
                  <div className="absolute top-full left-0 mt-1 w-full sm:w-80 bg-white border border-border rounded-xl shadow-xl z-20 overflow-hidden">
                    <div className="p-2 border-b border-border">
                      <Input value={roleSearch} onChange={e => setRoleSearch(e.target.value)}
                        placeholder="Search roles..." className="h-7 text-xs bg-white border-border" autoFocus />
                    </div>
                    <div className="max-h-52 overflow-y-auto py-1">
                      {filteredRoles.length === 0 ? (
                        <div className="px-3 py-3 text-xs text-muted-foreground text-center">
                          {roleSearch ? 'No roles found' : 'No roles available'}
                        </div>
                      ) : filteredRoles.map(r => (
                        <button key={r.id} onClick={() => { toggleRole(r.id); setRoleSearch(''); }}
                          className={`w-full flex items-center gap-2 px-3 py-2 hover:bg-muted/40 text-xs text-left transition-colors ${selectedRoles.includes(r.id) ? 'bg-amber-50' : ''}`}>
                          <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: roleColor(r.color) }} />
                          <span className="flex-1 truncate">@{r.name}</span>
                          {selectedRoles.includes(r.id) && <CheckCircle size={11} className="text-amber-600 flex-shrink-0" />}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            <Button onClick={loadStaff} disabled={selectedRoles.length === 0 || membersLoading}
              style={{ background: 'linear-gradient(135deg,#d4af37,#ffd700)', color: '#5a3e10', border: 'none' }}
              size="sm" className="font-semibold gap-1.5">
              {membersLoading ? <><Loader2 size={13} className="animate-spin" />Loading...</> : <><UserCheck size={13} />Save & Load Staff</>}
            </Button>
          </CardContent>
        </Card>

        {staffLoaded && (
          <div className="space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <p className="text-sm font-semibold">{filteredStaff.length} staff member{filteredStaff.length !== 1 ? 's' : ''}</p>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search staff..." className="pl-8 h-8 text-xs w-48 bg-white border-border" />
                </div>
                <Button variant="outline" size="sm" onClick={() => { setStaffLoaded(false); setSearch(''); setSelectedRoles([]); }}><RefreshCw size={12} /></Button>
              </div>
            </div>

            {filteredStaff.length === 0 ? (
              <Card className="border-border bg-white shadow-sm">
                <CardContent className="py-14 text-center">
                  <AlertCircle className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm font-semibold text-muted-foreground">
                    {search ? 'No matching staff members' : 'No staff found with the selected roles'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {search ? 'Try a different search term' : 'Make sure your staff have the selected roles in Discord'}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {filteredStaff.map(member => {
                  const memberRoles = selectedRoleObjects.filter(r => (member as any).roles?.includes(r.id));
                  const avatarUrl = member.avatar_url || member.avatar;
                  const name = member.displayName || member.username || '?';
                  return (
                    <button
                      key={member.id || member.user_id || member.userId}
                      onClick={() => setSelectedMember(member)}
                      className="text-left w-full"
                    >
                      <Card className="border-border bg-white shadow-sm hover:shadow-md hover:border-amber-200 transition-all cursor-pointer">
                        <CardContent className="p-3 flex items-center gap-3">
                          <div className="relative flex-shrink-0">
                            {avatarUrl ? (
                              <img
                                src={avatarUrl}
                                alt={name}
                                className="w-10 h-10 rounded-full object-cover border border-amber-200"
                                onError={(e: any) => {
                                  e.target.style.display = 'none';
                                  const fallback = e.target.parentNode.querySelector('.avatar-fallback');
                                  if (fallback) fallback.style.display = 'flex';
                                }}
                              />
                            ) : null}
                            <div
                              className="avatar-fallback w-10 h-10 rounded-full bg-gradient-to-br from-amber-100 to-amber-50 border border-amber-200 items-center justify-center text-sm font-bold text-amber-700"
                              style={{ display: avatarUrl ? 'none' : 'flex' }}
                            >
                              {name[0].toUpperCase()}
                            </div>
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="font-semibold text-sm truncate">{name}</div>
                            {member.displayName && member.username && member.displayName !== member.username && (
                              <div className="text-xs text-muted-foreground truncate">@{member.username}</div>
                            )}
                            {(member.rank || member.role) && (
                              <div className="text-xs text-muted-foreground truncate">{member.rank || member.role}</div>
                            )}
                            {memberRoles.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {memberRoles.slice(0, 2).map(r => (
                                  <span key={r.id} className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: roleColor(r.color) + '20', color: roleColor(r.color) }}>
                                    {r.name}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          <ChevronDown size={12} className="text-muted-foreground flex-shrink-0 -rotate-90" />
                        </CardContent>
                      </Card>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {selectedMember && (
          <StaffPopup member={selectedMember} guildId={guildId} onClose={() => setSelectedMember(null)} />
        )}
      </div>
    );
  }
