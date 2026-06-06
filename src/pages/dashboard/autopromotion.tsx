import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Wand2, Plus, Trash2, RefreshCw, PlayCircle, CheckCircle, Crown, TrendingUp, Star, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const GOLD = "#d4af37";

interface PromoRule {
  id: string;
  from_rank: string;
  to_rank: string;
  min_shift_hours: number;
  min_days_at_rank: number;
  require_no_strikes: boolean;
}

interface Rank { id: string; name: string; level: number; }

interface QualifyResult {
  userId: string;
  username: string;
  currentRank: string;
  targetRank: string;
  shiftHours: number;
  daysAtRank: number;
  hasStrikes: boolean;
}

const RuleCard = ({ rule, ranks, onDelete }: { rule: PromoRule; ranks: Rank[]; onDelete: () => void }) => {
  const fromLabel = ranks.find(r => r.name === rule.from_rank)?.name || rule.from_rank;
  const toLabel   = ranks.find(r => r.name === rule.to_rank)?.name   || rule.to_rank;
  const conditions: string[] = [];
  if (rule.min_shift_hours > 0) conditions.push(`${rule.min_shift_hours}h shift time`);
  if (rule.min_days_at_rank > 0) conditions.push(`${rule.min_days_at_rank} days at rank`);
  if (rule.require_no_strikes)   conditions.push("No active strikes");

  return (
    <div className="rounded-xl border border-border p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-semibold px-2 py-0.5 rounded-full border" style={{ borderColor: "rgba(212,175,55,.3)", color: GOLD, background: "rgba(212,175,55,.08)" }}>{fromLabel}</span>
            <TrendingUp className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
            <span className="text-sm font-semibold px-2 py-0.5 rounded-full border border-green-500/30 text-green-400 bg-green-500/08">{toLabel}</span>
          </div>
          {conditions.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {conditions.map(c => (
                <span key={c} className="text-[10px] px-2 py-0.5 rounded-full bg-muted/50 text-muted-foreground border border-border">{c}</span>
              ))}
            </div>
          ) : (
            <span className="text-xs text-muted-foreground">No conditions — promotes all staff at this rank</span>
          )}
        </div>
        <Button size="sm" variant="ghost" onClick={onDelete} className="text-red-400 hover:bg-red-500/10 hover:text-red-400 flex-shrink-0 h-8 w-8 p-0">
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
};

export default function AutoPromotionPage({ guildId }: { guildId: string }) {
  const [rules, setRules] = useState<PromoRule[]>([]);
  const [ranks, setRanks] = useState<Rank[]>([]);
  const [isPremium, setIsPremium] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [qualifyResults, setQualifyResults] = useState<QualifyResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [toast, setToast] = useState<{ type: "ok"|"err"; msg: string } | null>(null);

  const [form, setForm] = useState({ fromRank: "", toRank: "", minShiftHours: "", minDaysAtRank: "", requireNoStrikes: true });

  const showToast = (type: "ok"|"err", msg: string) => { setToast({ type, msg }); setTimeout(() => setToast(null), 4000); };

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [rulesRes, ranksRes, guildRes] = await Promise.all([
        fetch(`/api/guilds/${guildId}/auto-promo-rules`, { credentials: "include" }),
        fetch(`/api/guilds/${guildId}/ranks`, { credentials: "include" }),
        fetch(`/api/guilds/${guildId}`, { credentials: "include" }),
      ]);
      if (rulesRes.ok) setRules(await rulesRes.json());
      if (ranksRes.ok) setRanks(await ranksRes.json());
      if (guildRes.ok) { const g = await guildRes.json(); setIsPremium(!!g.isPremium); }
    } catch {}
    setLoading(false);
  }, [guildId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const addRule = async () => {
    if (!form.fromRank || !form.toRank || form.fromRank === form.toRank) {
      showToast("err", "Select different From and To ranks"); return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/guilds/${guildId}/auto-promo-rules`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromRank: form.fromRank,
          toRank: form.toRank,
          minShiftHours: parseInt(form.minShiftHours) || 0,
          minDaysAtRank: parseInt(form.minDaysAtRank) || 0,
          requireNoStrikes: form.requireNoStrikes,
        }),
      });
      if (res.ok) {
        showToast("ok", "Rule created!");
        setForm({ fromRank: "", toRank: "", minShiftHours: "", minDaysAtRank: "", requireNoStrikes: true });
        fetchAll();
      } else {
        const d = await res.json();
        showToast("err", d.error || "Failed to create rule");
      }
    } catch { showToast("err", "Network error"); }
    setSaving(false);
  };

  const deleteRule = async (id: string) => {
    await fetch(`/api/guilds/${guildId}/auto-promo-rules/${id}`, { method: "DELETE", credentials: "include" });
    fetchAll();
  };

  const runCheck = async () => {
    setRunning(true); setShowResults(false);
    try {
      const [staffRes, strikesRes, shiftsRes] = await Promise.all([
        fetch(`/api/guilds/${guildId}/staff`, { credentials: "include" }),
        fetch(`/api/guilds/${guildId}/strikes`, { credentials: "include" }),
        fetch(`/api/guilds/${guildId}/shifts`, { credentials: "include" }),
      ]);
      const staff   = staffRes.ok   ? await staffRes.json()   : [];
      const strikes = strikesRes.ok ? await strikesRes.json() : [];
      const shifts  = shiftsRes.ok  ? await shiftsRes.json()  : [];

      const qualifying: QualifyResult[] = [];

      for (const rule of rules) {
        const matchingStaff = (staff as any[]).filter((s: any) =>
          (s.rank || s.rank_name) === rule.from_rank
        );

        for (const member of matchingStaff) {
          const uid = member.discord_id || member.user_id;
          const hasStrikes = rule.require_no_strikes
            ? (strikes as any[]).some((s: any) => (s.target_user_id === uid || s.target_username === member.discord_username) && s.active !== false)
            : false;

          const memberShifts = (shifts as any[]).filter((s: any) => s.user_id === uid && s.ended_at);
          const totalHours = memberShifts.reduce((sum: number, s: any) => sum + ((s.duration_mins || 0) / 60), 0);

          const daysAtRank = member.rank_updated_at
            ? Math.floor((Date.now() - new Date(member.rank_updated_at).getTime()) / 86400000)
            : 999;

          const qualifies = !hasStrikes
            && totalHours >= rule.min_shift_hours
            && daysAtRank >= rule.min_days_at_rank;

          if (qualifies) {
            qualifying.push({
              userId:      uid,
              username:    member.discord_username || member.roblox_username || "Unknown",
              currentRank: rule.from_rank,
              targetRank:  rule.to_rank,
              shiftHours:  Math.round(totalHours * 10) / 10,
              daysAtRank,
              hasStrikes,
            });
          }
        }
      }

      setQualifyResults(qualifying);
      setShowResults(true);
    } catch (e) { console.error(e); showToast("err", "Failed to run check"); }
    setRunning(false);
  };

  if (loading) return (
    <div className="space-y-4">
      <div className="h-8 w-64 bg-muted/40 rounded animate-pulse" />
      <div className="h-40 bg-muted/30 rounded-2xl animate-pulse" />
      <div className="h-40 bg-muted/30 rounded-2xl animate-pulse" />
    </div>
  );

  return (
    <div className="space-y-5 max-w-3xl">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium flex items-center gap-2 ${toast.type === "ok" ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
          {toast.type === "ok" ? <CheckCircle size={15} /> : <AlertCircle size={15} />} {toast.msg}
        </div>
      )}

      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight flex items-center gap-2">
            <Wand2 className="w-6 h-6" style={{ color: GOLD }} />
            AutoPromotion Engine
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full ml-1" style={{ background: "rgba(212,175,55,.15)", color: GOLD, border: "1px solid rgba(212,175,55,.3)" }}>PRO</span>
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">Define rules to automatically identify staff ready for promotion.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchAll} className="gap-1.5">
            <RefreshCw className="w-3.5 h-3.5" />
          </Button>
          {rules.length > 0 && (
            <Button size="sm" onClick={runCheck} disabled={running} className="gap-1.5" style={{ background: GOLD, color: "#000" }}>
              {running ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <PlayCircle className="w-3.5 h-3.5" />}
              {running ? "Checking..." : "Run Check"}
            </Button>
          )}
        </div>
      </div>

      {!isPremium && (
        <Card style={{ borderColor: "rgba(212,175,55,.3)" }}>
          <CardContent className="p-4 flex items-start gap-3">
            <Crown className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: GOLD }} />
            <div>
              <p className="font-semibold text-sm">Premium Feature</p>
              <p className="text-xs text-muted-foreground mt-0.5">AutoPromotion Engine requires an active Premium subscription. Upgrade to create and run promotion rules for your server.</p>
            </div>
            <a href={`/dashboard/${guildId}/manage-premium`}>
              <Button size="sm" style={{ background: GOLD, color: "#000" }}>Upgrade</Button>
            </a>
          </CardContent>
        </Card>
      )}

      {/* Existing Rules */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold flex items-center gap-2">
              <TrendingUp className="w-4 h-4" style={{ color: GOLD }} />
              Promotion Rules
              <span className="text-muted-foreground font-normal">({rules.length})</span>
            </h3>
          </div>
          {rules.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              <Wand2 className="w-10 h-10 mx-auto mb-3 opacity-20" />
              <p>No promotion rules configured yet.</p>
              <p className="text-xs mt-1">Add a rule below to get started.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {rules.map(r => (
                <RuleCard key={r.id} rule={r} ranks={ranks} onDelete={() => deleteRule(r.id)} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Rule */}
      {isPremium && (
        <Card>
          <CardContent className="p-5 space-y-4">
            <h3 className="text-sm font-bold flex items-center gap-2">
              <Plus className="w-4 h-4" />New Rule
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs mb-1.5 block">From Rank</Label>
                <Select value={form.fromRank} onValueChange={v => setForm(f => ({ ...f, fromRank: v }))}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select rank..." /></SelectTrigger>
                  <SelectContent>
                    {ranks.map(r => <SelectItem key={r.id} value={r.name}>{r.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs mb-1.5 block">To Rank (Promote To)</Label>
                <Select value={form.toRank} onValueChange={v => setForm(f => ({ ...f, toRank: v }))}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select rank..." /></SelectTrigger>
                  <SelectContent>
                    {ranks.filter(r => r.name !== form.fromRank).map(r => <SelectItem key={r.id} value={r.name}>{r.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs mb-1.5 block">Min Shift Hours</Label>
                <Input type="number" min="0" value={form.minShiftHours} onChange={e => setForm(f => ({ ...f, minShiftHours: e.target.value }))} placeholder="0" className="h-9 text-sm" />
              </div>
              <div>
                <Label className="text-xs mb-1.5 block">Min Days at Rank</Label>
                <Input type="number" min="0" value={form.minDaysAtRank} onChange={e => setForm(f => ({ ...f, minDaysAtRank: e.target.value }))} placeholder="0" className="h-9 text-sm" />
              </div>
            </div>
            <div className="flex items-center gap-3 pt-1">
              <Switch checked={form.requireNoStrikes} onCheckedChange={v => setForm(f => ({ ...f, requireNoStrikes: v }))} />
              <Label className="text-sm">Require no active strikes</Label>
            </div>
            <Button onClick={addRule} disabled={saving || !form.fromRank || !form.toRank} className="w-full gap-2" style={{ background: GOLD, color: "#000" }}>
              {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              {saving ? "Creating..." : "Create Rule"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Check Results */}
      {showResults && (
        <Card style={{ borderColor: qualifyResults.length > 0 ? "rgba(34,197,94,.3)" : "rgba(255,255,255,.1)" }}>
          <CardContent className="p-5">
            <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
              <Star className="w-4 h-4 text-amber-400" />
              Qualifying Staff ({qualifyResults.length})
            </h3>
            {qualifyResults.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No staff currently qualify for promotion. Check again after more shift time and activity.</p>
            ) : (
              <div className="space-y-2">
                {qualifyResults.map((r, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-green-500/5 border border-green-500/15">
                    <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold">{r.username}</p>
                      <p className="text-xs text-muted-foreground">{r.shiftHours}h total · {r.daysAtRank} days at rank</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs text-muted-foreground">{r.currentRank}</p>
                      <p className="text-xs font-semibold text-green-400">→ {r.targetRank}</p>
                    </div>
                  </div>
                ))}
                <p className="text-xs text-muted-foreground pt-2 text-center">Promote these staff members through the Promotions page or via bot command.</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
