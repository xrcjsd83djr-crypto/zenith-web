import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Layers, Plus, RefreshCw, AlertCircle, CheckCircle, Loader2, ChevronDown, ChevronUp, Users, Crown, Star, User, Calendar, X } from "lucide-react";

interface Division {
  id: string; guild_id: string; name: string; description?: string;
  discord_role_id?: string; channel_id?: string; color?: string;
  leader_id?: string; leader_name?: string; icon_emoji?: string; is_active: boolean;
  created_at: string; member_count?: number;
}
interface DivisionMember {
  id: string; division_id: string; user_id: string; username: string;
  role?: string; added_at: string;
}
interface Member { id: string; username: string; }

function DivisionCard({
  division, guildId, onUpdated, members: allMembers, isPremium,
}: {
  division: Division; guildId: string; onUpdated: () => void; members: Member[]; isPremium: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [divMembers, setDivMembers] = useState<DivisionMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [addingMember, setAddingMember] = useState(false);
  const [addUserId, setAddUserId] = useState('');
  const [removing, setRemoving] = useState(false);
  const [selectedMember, setSelectedMember] = useState<DivisionMember | null>(null);

  const fetchMembers = async () => {
    setMembersLoading(true);
    try {
      const res = await fetch(`/api/guilds/${guildId}/divisions/${division.id}/members`, { credentials: 'include' });
      if (res.ok) {
        const d = await res.json().catch(() => []);
        setDivMembers(Array.isArray(d) ? d : []);
      }
    } catch {}
    setMembersLoading(false);
  };

  const handleToggle = async () => {
    if (!open) {
      setOpen(true);
      fetchMembers();
    } else {
      setOpen(false);
    }
  };

  const handleAddMember = async () => {
    if (!addUserId) return;
    const member = allMembers.find(m => m.id === addUserId);
    if (!member) return;
    setAddingMember(true);
    try {
      await fetch(`/api/guilds/${guildId}/divisions/${division.id}/members`, {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: member.id, username: member.username }),
      });
      setAddUserId('');
      fetchMembers();
    } catch {}
    setAddingMember(false);
  };

  const handleRemoveMember = async (memberId: string) => {
    setRemoving(true);
    try {
      await fetch(`/api/guilds/${guildId}/divisions/${division.id}/members/${memberId}`, { method: 'DELETE', credentials: 'include' });
      fetchMembers();
    } catch {}
    setRemoving(false);
  };

  const color = division.color || '#5865F2';
  const emoji = division.icon_emoji || '🏢';

  return (
    <div className="border border-border rounded-xl overflow-hidden mb-3">
      <button onClick={handleToggle} className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-muted/30 transition-colors text-left">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-lg flex-shrink-0" style={{ background: color + '22' }}>
          {emoji}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm">{division.name}</span>
            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
          </div>
          {division.description && <p className="text-xs text-muted-foreground truncate mt-0.5">{division.description}</p>}
          <div className="flex items-center gap-3 mt-1">
            {division.leader_name && <span className="text-xs text-muted-foreground flex items-center gap-0.5"><Crown size={9} />{division.leader_name}</span>}
            <span className="text-xs text-muted-foreground flex items-center gap-0.5"><Users size={9} />{division.member_count ?? divMembers.length} members</span>
          </div>
        </div>
        {open ? <ChevronUp size={14} className="text-muted-foreground flex-shrink-0" /> : <ChevronDown size={14} className="text-muted-foreground flex-shrink-0" />}
      </button>

      {open && (
        <div className="px-4 pb-4 border-t border-border bg-muted/10">
          <div className="mt-3 space-y-3">
            {division.discord_role_id && (
              <div><p className="text-xs text-muted-foreground font-medium">Discord Role ID</p><p className="text-sm font-mono">{division.discord_role_id}</p></div>
            )}

            <div>
              <p className="text-xs text-muted-foreground font-medium mb-2 flex items-center gap-1"><Users size={10} />Members</p>
              {membersLoading ? (
                <div className="flex justify-center py-4"><Loader2 size={16} className="animate-spin text-muted-foreground" /></div>
              ) : divMembers.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">No members yet. Add someone below.</p>
              ) : (
                <div className="space-y-1 mb-3">
                  {divMembers.map(m => (
                    <button key={m.id} onClick={() => setSelectedMember(selectedMember?.id === m.id ? null : m)} className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-muted/40 transition-colors text-left group">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 bg-muted text-muted-foreground">
                        {m.username[0]?.toUpperCase()}
                      </div>
                      <span className="text-sm flex-1">{m.username}</span>
                      {m.role && m.role !== 'member' && <Badge className="text-[9px] border">{m.role}</Badge>}
                      <button onClick={e => { e.stopPropagation(); handleRemoveMember(m.id); }} className="opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-600 p-0.5 rounded">
                        <X size={12} />
                      </button>
                    </button>
                  ))}
                  {selectedMember && (
                    <div className="mt-2 p-3 rounded-lg border border-border bg-background text-xs space-y-1.5">
                      <p className="font-semibold text-sm">{selectedMember.username}</p>
                      <div className="grid grid-cols-2 gap-2">
                        <div><p className="text-muted-foreground">Role</p><p className="font-medium">{selectedMember.role || 'Member'}</p></div>
                        <div><p className="text-muted-foreground">Joined Division</p><p className="font-medium">{new Date(selectedMember.added_at).toLocaleDateString()}</p></div>
                        <div><p className="text-muted-foreground">User ID</p><p className="font-mono">{selectedMember.user_id}</p></div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Add member */}
              <div className="flex gap-2">
                <select
                  value={addUserId}
                  onChange={e => setAddUserId(e.target.value)}
                  className="flex-1 h-8 text-xs rounded-md border border-input bg-background px-2"
                >
                  <option value="">Select staff to add…</option>
                  {allMembers.filter(m => !divMembers.some(dm => dm.user_id === m.id)).map(m => (
                    <option key={m.id} value={m.id}>{m.username}</option>
                  ))}
                </select>
                <Button size="sm" onClick={handleAddMember} disabled={!addUserId || addingMember} className="h-8 text-xs gap-1" style={{ background: '#d4af37', color: '#000' }}>
                  {addingMember ? <Loader2 size={11} className="animate-spin" /> : <><Plus size={11} />Add</>}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function DivisionsPage({ guildId }: { guildId: string }) {
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [isPremium, setIsPremium] = useState(false);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', color: '#5865F2', icon_emoji: '🏢', discord_role_id: '' });
  const [toast, setToast] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const showToast = (type: "ok" | "err", text: string) => { setToast({ type, text }); setTimeout(() => setToast(null), 4000); };

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [dRes, mRes, pRes] = await Promise.allSettled([
        fetch(`/api/guilds/${guildId}/divisions`, { credentials: 'include' }),
        fetch(`/api/guilds/${guildId}/members`, { credentials: 'include' }),
        fetch(`/api/guilds/${guildId}/premium`, { credentials: 'include' }),
      ]);
      if (dRes.status === 'fulfilled' && dRes.value.ok) { const d = await dRes.value.json().catch(() => []); setDivisions(Array.isArray(d) ? d : []); }
      if (mRes.status === 'fulfilled' && mRes.value.ok) { const d = await mRes.value.json().catch(() => []); setMembers(Array.isArray(d) ? d : []); }
      if (pRes.status === 'fulfilled' && pRes.value.ok) { const p = await pRes.value.json().catch(() => ({})); setIsPremium(!!p.isPremium); }
    } catch {}
    setLoading(false);
  }, [guildId]);
  useEffect(() => { fetchAll(); }, [fetchAll]);

  const maxDivisions = isPremium ? 50 : 5;
  const canAdd = divisions.length < maxDivisions;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return showToast("err", "Division name is required.");
    if (!canAdd) return showToast("err", `Free plan is limited to 5 divisions. Upgrade to Premium for up to 50.`);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/guilds/${guildId}/divisions`, {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.name, description: form.description, color: form.color, iconEmoji: form.icon_emoji, discordRoleId: form.discord_role_id || null }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((d as any).error || 'Failed');
      showToast("ok", `Division "${form.name}" created!`);
      setOpen(false);
      setForm({ name: '', description: '', color: '#5865F2', icon_emoji: '🏢', discord_role_id: '' });
      fetchAll();
    } catch (err: any) { showToast("err", err.message); }
    setSubmitting(false);
  };

  return (
    <div className="space-y-5 max-w-4xl">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm font-medium ${toast.type === 'ok' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
          {toast.type === 'ok' ? <CheckCircle size={15} /> : <AlertCircle size={15} />}{toast.text}
        </div>
      )}

      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight flex items-center gap-2">
            <Layers className="w-6 h-6" style={{ color: '#d4af37' }} />Divisions
          </h2>
          <p className="text-muted-foreground mt-0.5 text-sm">
            {divisions.length} of {maxDivisions} divisions — click any to expand members
            {!isPremium && <span className="ml-1 text-amber-600">(Free: 5 max)</span>}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchAll} className="gap-1.5"><RefreshCw size={13} />Refresh</Button>
          <Button size="sm" onClick={() => setOpen(true)} disabled={!canAdd} className="gap-1.5" style={{ background: '#d4af37', color: '#000' }}>
            <Plus size={13} />New Division
          </Button>
        </div>
      </div>

      {/* Limit bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium">Division Slots Used</p>
            <span className="text-sm font-bold">{divisions.length} / {maxDivisions}</span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div className="h-full rounded-full transition-all" style={{ width: `${Math.min((divisions.length / maxDivisions) * 100, 100)}%`, background: divisions.length >= maxDivisions ? '#ef4444' : '#d4af37' }} />
          </div>
          {!isPremium && !canAdd && (
            <p className="text-xs text-amber-700 mt-2 flex items-center gap-1"><Star size={11} />Upgrade to Premium to create up to 50 divisions.</p>
          )}
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-7 h-7 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#d4af37', borderTopColor: 'transparent' }} />
        </div>
      ) : divisions.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground text-sm">
          <Layers size={32} className="mx-auto mb-2 text-muted-foreground/40" />
          No divisions yet. Create your first one above.
        </CardContent></Card>
      ) : (
        <div>
          {divisions.map(d => (
            <DivisionCard key={d.id} division={d} guildId={guildId} onUpdated={fetchAll} members={members} isPremium={isPremium} />
          ))}
        </div>
      )}

      {!isPremium && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardContent className="p-4 flex items-start gap-3">
            <Star className="text-amber-500 flex-shrink-0 mt-0.5" size={18} />
            <div>
              <p className="font-semibold text-sm text-amber-800">Premium: Up to 50 Divisions</p>
              <p className="text-xs text-amber-700 mt-0.5">Free plan is limited to 5 divisions. Upgrade to Premium for up to 50 divisions for large, complex organizations.</p>
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Layers size={18} />New Division</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-3 mt-2">
            <div className="space-y-1.5">
              <Label>Division Name *</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Criminal Investigations Division" required />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="What does this division do?" rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Color</Label>
                <div className="flex gap-2">
                  <input type="color" value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} className="h-9 w-12 cursor-pointer rounded border border-input" />
                  <Input value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} className="flex-1 text-sm font-mono" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Icon Emoji</Label>
                <Input value={form.icon_emoji} onChange={e => setForm(f => ({ ...f, icon_emoji: e.target.value }))} placeholder="🏢" maxLength={2} className="text-xl text-center" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Discord Role ID (optional)</Label>
              <Input value={form.discord_role_id} onChange={e => setForm(f => ({ ...f, discord_role_id: e.target.value }))} placeholder="18-digit role ID" />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={submitting} style={{ background: '#d4af37', color: '#000' }}>
                {submitting ? <><Loader2 size={14} className="animate-spin mr-1.5" />Creating…</> : "Create Division"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
