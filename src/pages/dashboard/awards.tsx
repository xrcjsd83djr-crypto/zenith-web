import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trophy, Plus, RefreshCw, CheckCircle, AlertCircle, Loader2, Star, Award, Zap, Heart, Shield, Crown } from "lucide-react";

interface StaffAward {
  id: string; guild_id: string; user_id: string; username: string;
  awarded_by: string; awarded_by_name?: string;
  title: string; description: string; badge_type: string; created_at: string;
}
interface Member { id: string; username: string; }

const BADGE_TYPES = [
  { id: 'star', label: '⭐ Star Employee', icon: <Star size={18} className="text-amber-500" />, desc: 'Exceptional performance' },
  { id: 'trophy', label: '🏆 Outstanding Achievement', icon: <Trophy size={18} className="text-amber-600" />, desc: 'Major accomplishment' },
  { id: 'award', label: '🎖 Merit Award', icon: <Award size={18} className="text-blue-500" />, desc: 'Notable contribution' },
  { id: 'lightning', label: '⚡ Quick Responder', icon: <Zap size={18} className="text-yellow-500" />, desc: 'Fast response & action' },
  { id: 'heart', label: '💜 Team Player', icon: <Heart size={18} className="text-purple-500" />, desc: 'Excellent teamwork' },
  { id: 'shield', label: '🛡 Defender', icon: <Shield size={18} className="text-green-600" />, desc: 'Protecting the community' },
  { id: 'crown', label: '👑 Monthly MVP', icon: <Crown size={18} className="text-amber-500" />, desc: 'Best performer this month' },
];

function AwardCard({ award }: { award: StaffAward }) {
  const badge = BADGE_TYPES.find(b => b.id === award.badge_type) || BADGE_TYPES[0];
  const ts = new Date(award.created_at);
  return (
    <Card>
      <CardContent className="p-4 flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(212,175,55,.1)' }}>
          {badge.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            <span className="font-semibold text-sm">{award.username}</span>
            <Badge className="bg-amber-50 text-amber-700 border border-amber-200 text-[10px]">{badge.label}</Badge>
          </div>
          <p className="text-sm font-medium">{award.title}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{award.description}</p>
          <p className="text-xs text-muted-foreground mt-1">Awarded by {award.awarded_by_name || award.awarded_by} • {ts.toLocaleDateString()}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AwardsPage({ guildId }: { guildId: string }) {
  const [awards, setAwards] = useState<StaffAward[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [me, setMe] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ userId: '', username: '', title: '', description: '', badgeType: 'star' });
  const [toast, setToast] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const showToast = (type: "ok" | "err", text: string) => { setToast({ type, text }); setTimeout(() => setToast(null), 4000); };

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [aRes, mRes, meRes] = await Promise.allSettled([
        fetch(`/api/guilds/${guildId}/awards`, { credentials: 'include' }),
        fetch(`/api/guilds/${guildId}/members`, { credentials: 'include' }),
        fetch('/api/me', { credentials: 'include' }),
      ]);
      if (aRes.status === 'fulfilled' && aRes.value.ok) { const d = await aRes.value.json().catch(() => []); setAwards(Array.isArray(d) ? d : []); }
      if (mRes.status === 'fulfilled' && mRes.value.ok) { const d = await mRes.value.json().catch(() => []); setMembers(Array.isArray(d) ? d : []); }
      if (meRes.status === 'fulfilled' && meRes.value.ok) setMe(await meRes.value.json().catch(() => null));
    } catch {}
    setLoading(false);
  }, [guildId]);
  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.userId || !form.title.trim() || !form.description.trim()) return showToast("err", "Select a member and fill in all fields.");
    setSubmitting(true);
    try {
      const res = await fetch(`/api/guilds/${guildId}/awards`, {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: form.userId, username: form.username, title: form.title, description: form.description, badgeType: form.badgeType, awardedBy: me?.id, awardedByName: me?.username }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((d as any).error || 'Failed');
      showToast("ok", `Award given to ${form.username}!`);
      setOpen(false);
      setForm({ userId: '', username: '', title: '', description: '', badgeType: 'star' });
      fetchAll();
    } catch (err: any) { showToast("err", err.message); }
    setSubmitting(false);
  };

  // Group awards by user
  const byUser: Record<string, { username: string; awards: StaffAward[] }> = {};
  for (const a of awards) {
    if (!byUser[a.user_id]) byUser[a.user_id] = { username: a.username, awards: [] };
    byUser[a.user_id].awards.push(a);
  }
  const topRecipients = Object.entries(byUser).sort((a, b) => b[1].awards.length - a[1].awards.length).slice(0, 3);

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
            <Trophy className="w-6 h-6 text-amber-500" />Staff Awards
          </h2>
          <p className="text-muted-foreground mt-0.5 text-sm">Recognize and reward outstanding staff performance</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchAll} className="gap-1.5"><RefreshCw size={13} />Refresh</Button>
          <Button size="sm" onClick={() => setOpen(true)} className="gap-1.5" style={{ background: '#d4af37', color: '#000' }}><Plus size={13} />Give Award</Button>
        </div>
      </div>

      {topRecipients.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {topRecipients.map(([uid, data], i) => (
            <Card key={uid} className={i === 0 ? 'border-amber-300 bg-amber-50/30' : ''}>
              <CardContent className="p-4 text-center">
                <p className="text-2xl mb-1">{['🥇', '🥈', '🥉'][i]}</p>
                <p className="font-bold text-sm">{data.username}</p>
                <p className="text-xs text-muted-foreground">{data.awards.length} award{data.awards.length !== 1 ? 's' : ''}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16"><div className="w-7 h-7 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#d4af37', borderTopColor: 'transparent' }} /></div>
      ) : awards.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground text-sm">
          <Trophy size={32} className="mx-auto mb-2 text-muted-foreground/40" />
          No awards yet. Recognize your team with the button above.
        </CardContent></Card>
      ) : (
        <div className="space-y-2">{awards.map(a => <AwardCard key={a.id} award={a} />)}</div>
      )}

      {/* Badge type selector */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Trophy size={18} className="text-amber-500" />Give Award</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-3 mt-2">
            <div className="space-y-1.5">
              <Label>Staff Member *</Label>
              <Select value={form.userId} onValueChange={v => { const m = members.find(m => m.id === v); setForm(f => ({ ...f, userId: v, username: m?.username || '' })); }}>
                <SelectTrigger><SelectValue placeholder="Select member" /></SelectTrigger>
                <SelectContent>{members.map(m => <SelectItem key={m.id} value={m.id}>{m.username}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Badge Type</Label>
              <div className="grid grid-cols-1 gap-1.5">
                {BADGE_TYPES.map(badge => (
                  <button key={badge.id} type="button" onClick={() => setForm(f => ({ ...f, badgeType: badge.id }))}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg border text-left transition-colors ${form.badgeType === badge.id ? 'border-amber-400 bg-amber-50' : 'border-border hover:border-amber-200'}`}>
                    {badge.icon}
                    <div><p className="text-sm font-medium">{badge.label}</p><p className="text-xs text-muted-foreground">{badge.desc}</p></div>
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5"><Label>Award Title *</Label><Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Employee of the Month — May" required /></div>
            <div className="space-y-1.5"><Label>Description *</Label><Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Why are they receiving this award?" rows={3} required /></div>
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={submitting} style={{ background: '#d4af37', color: '#000' }}>
                {submitting ? <><Loader2 size={14} className="animate-spin mr-1.5" />Awarding…</> : <><Trophy size={14} className="mr-1.5" />Give Award</>}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
