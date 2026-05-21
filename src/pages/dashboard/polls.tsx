import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { BarChart3, Plus, RefreshCw, CheckCircle, AlertCircle, Loader2, ChevronDown, ChevronUp, X, Clock } from "lucide-react";

interface PollOption { id: string; text: string; votes?: number; voter_ids?: string[]; }
interface Poll {
  id: string; guild_id: string; title: string; description?: string;
  options: PollOption[]; is_active: boolean; is_anonymous: boolean;
  created_by: string; created_by_name?: string;
  expires_at?: string; total_votes?: number; created_at: string;
}

function PollCard({ poll, me, guildId, onUpdated }: { poll: Poll; me: any; guildId: string; onUpdated: () => void }) {
  const [open, setOpen] = useState(false);
  const [voting, setVoting] = useState(false);

  const totalVotes = poll.total_votes ?? poll.options.reduce((a, o) => a + (o.votes || 0), 0);
  const expired = poll.expires_at && new Date(poll.expires_at) < new Date();
  const isActive = poll.is_active && !expired;

  const handleVote = async (optionId: string) => {
    if (!isActive || voting) return;
    setVoting(true);
    try {
      await fetch(`/api/guilds/${guildId}/polls/${poll.id}/vote`, {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ optionId, userId: me?.id, username: me?.username }),
      });
      onUpdated();
    } catch {}
    setVoting(false);
  };

  const handleClose = async () => {
    try {
      await fetch(`/api/guilds/${guildId}/polls/${poll.id}/close`, { method: 'POST', credentials: 'include' });
      onUpdated();
    } catch {}
  };

  return (
    <div className="border border-border rounded-lg overflow-hidden mb-3">
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors text-left">
        <BarChart3 size={16} className="flex-shrink-0 text-blue-500" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm">{poll.title}</span>
            <Badge className={`text-[10px] border ${isActive ? 'bg-green-100 text-green-700 border-green-200' : 'bg-gray-100 text-gray-600 border-gray-200'}`}>
              {isActive ? 'Active' : 'Closed'}
            </Badge>
            <Badge className="bg-blue-50 text-blue-700 border border-blue-200 text-[10px]">{totalVotes} vote{totalVotes !== 1 ? 's' : ''}</Badge>
          </div>
          {poll.description && <p className="text-xs text-muted-foreground mt-0.5 truncate">{poll.description}</p>}
        </div>
        {open ? <ChevronUp size={14} className="text-muted-foreground" /> : <ChevronDown size={14} className="text-muted-foreground" />}
      </button>
      {open && (
        <div className="px-4 pb-4 border-t border-border bg-muted/10">
          <div className="space-y-2 mt-3">
            {poll.options.map(option => {
              const votes = option.votes || 0;
              const pct = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
              const hasVoted = me && option.voter_ids?.includes(me.id);
              return (
                <button
                  key={option.id}
                  onClick={() => handleVote(option.id)}
                  disabled={!isActive || voting || !!hasVoted}
                  className={`w-full text-left rounded-lg border p-3 transition-all ${hasVoted ? 'border-blue-300 bg-blue-50' : isActive ? 'border-border hover:border-blue-200 hover:bg-blue-50/30' : 'border-border cursor-default'}`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-medium">{option.text}</span>
                    <span className="text-xs text-muted-foreground">{votes} vote{votes !== 1 ? 's' : ''} ({pct}%)</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: hasVoted ? '#3b82f6' : '#d4af37' }} />
                  </div>
                </button>
              );
            })}
          </div>
          <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
            <span>By {poll.created_by_name || poll.created_by} • {new Date(poll.created_at).toLocaleDateString()}</span>
            {isActive && (
              <Button size="sm" variant="outline" onClick={handleClose} className="text-xs h-7 gap-1">
                <X size={11} />Close Poll
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function PollsPage({ guildId }: { guildId: string }) {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [me, setMe] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [expiresIn, setExpiresIn] = useState('');
  const [toast, setToast] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const showToast = (type: "ok" | "err", text: string) => { setToast({ type, text }); setTimeout(() => setToast(null), 4000); };

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [pRes, meRes] = await Promise.allSettled([
        fetch(`/api/guilds/${guildId}/polls`, { credentials: 'include' }),
        fetch('/api/me', { credentials: 'include' }),
      ]);
      if (pRes.status === 'fulfilled' && pRes.value.ok) { const d = await pRes.value.json().catch(() => []); setPolls(Array.isArray(d) ? d : []); }
      if (meRes.status === 'fulfilled' && meRes.value.ok) setMe(await meRes.value.json().catch(() => null));
    } catch {}
    setLoading(false);
  }, [guildId]);
  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validOptions = options.filter(o => o.trim());
    if (!title.trim() || validOptions.length < 2) return showToast("err", "Title and at least 2 options are required.");
    setSubmitting(true);
    try {
      const expiresAt = expiresIn ? new Date(Date.now() + parseInt(expiresIn) * 3600000).toISOString() : null;
      const res = await fetch(`/api/guilds/${guildId}/polls`, {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), description: description.trim() || null, options: validOptions, isAnonymous, expiresAt, createdBy: me?.id, createdByName: me?.username }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((d as any).error || 'Failed');
      showToast("ok", "Poll created!");
      setOpen(false);
      setTitle(''); setDescription(''); setOptions(['', '']); setIsAnonymous(false); setExpiresIn('');
      fetchAll();
    } catch (err: any) { showToast("err", err.message); }
    setSubmitting(false);
  };

  const activePolls = polls.filter(p => p.is_active && (!p.expires_at || new Date(p.expires_at) > new Date()));
  const closedPolls = polls.filter(p => !p.is_active || (p.expires_at && new Date(p.expires_at) <= new Date()));

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
            <BarChart3 className="w-6 h-6 text-blue-500" />Staff Polls
          </h2>
          <p className="text-muted-foreground mt-0.5 text-sm">{activePolls.length} active polls</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchAll} className="gap-1.5"><RefreshCw size={13} />Refresh</Button>
          <Button size="sm" onClick={() => setOpen(true)} className="gap-1.5" style={{ background: '#d4af37', color: '#000' }}><Plus size={13} />Create Poll</Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="w-7 h-7 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#d4af37', borderTopColor: 'transparent' }} /></div>
      ) : (
        <>
          {activePolls.length > 0 && (
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Active Polls</p>
              {activePolls.map(p => <PollCard key={p.id} poll={p} me={me} guildId={guildId} onUpdated={fetchAll} />)}
            </div>
          )}
          {closedPolls.length > 0 && (
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Closed Polls</p>
              {closedPolls.map(p => <PollCard key={p.id} poll={p} me={me} guildId={guildId} onUpdated={fetchAll} />)}
            </div>
          )}
          {polls.length === 0 && (
            <Card><CardContent className="py-12 text-center text-muted-foreground text-sm">
              <BarChart3 size={32} className="mx-auto mb-2 text-muted-foreground/40" />
              No polls yet. Create one above to get staff input on important decisions.
            </CardContent></Card>
          )}
        </>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><BarChart3 size={18} />Create Poll</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-3 mt-2">
            <div className="space-y-1.5"><Label>Question / Title *</Label><Input value={title} onChange={e => setTitle(e.target.value)} placeholder="What should we vote on?" required /></div>
            <div className="space-y-1.5"><Label>Description (optional)</Label><Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Additional context..." rows={2} /></div>
            <div className="space-y-2">
              <Label>Options * (minimum 2)</Label>
              {options.map((opt, i) => (
                <div key={i} className="flex gap-2">
                  <Input value={opt} onChange={e => { const n = [...options]; n[i] = e.target.value; setOptions(n); }} placeholder={`Option ${i + 1}`} className="flex-1" />
                  {options.length > 2 && <Button type="button" variant="ghost" size="sm" onClick={() => setOptions(options.filter((_, j) => j !== i))} className="px-2"><X size={13} /></Button>}
                </div>
              ))}
              {options.length < 10 && (
                <Button type="button" variant="outline" size="sm" onClick={() => setOptions([...options, ''])} className="gap-1 text-xs w-full"><Plus size={11} />Add Option</Button>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Expires in (hours, optional)</Label>
              <Input type="number" value={expiresIn} onChange={e => setExpiresIn(e.target.value)} placeholder="e.g. 24 for 24 hours" min={1} />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div><p className="text-sm font-medium">Anonymous Voting</p><p className="text-xs text-muted-foreground mt-0.5">Voters cannot see who voted for what</p></div>
              <Switch checked={isAnonymous} onCheckedChange={setIsAnonymous} />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={submitting} style={{ background: '#d4af37', color: '#000' }}>
                {submitting ? <><Loader2 size={14} className="animate-spin mr-1.5" />Creating…</> : "Create Poll"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
