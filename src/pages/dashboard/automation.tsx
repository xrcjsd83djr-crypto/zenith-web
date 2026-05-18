import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Zap, RefreshCw, Loader2, AlertCircle, CheckCircle, Star, Save } from "lucide-react";

interface AutoConfig { enabled: boolean; threshold: number; action: string; dm_message: string; remove_role_id: string; }

export default function AutomationPage({ guildId }: { guildId: string }) {
  const [config, setConfig] = useState<AutoConfig>({ enabled: false, threshold: 3, action: 'dm_warn', dm_message: '', remove_role_id: '' });
  const [isPremium, setIsPremium] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: "ok"|"err"; text: string } | null>(null);

  const showToast = (type: "ok"|"err", text: string) => { setToast({ type, text }); setTimeout(() => setToast(null), 4000); };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const pRes = await fetch(`/api/guilds/${guildId}/is-premium`, { credentials: 'include' });
      if (pRes.ok) { const p = await pRes.json(); setIsPremium(p.isPremium); if (!p.isPremium) { setLoading(false); return; } }
      const res = await fetch(`/api/guilds/${guildId}/strike-automation`, { credentials: 'include' });
      if (res.ok) { const d = await res.json(); setConfig({ enabled: d.enabled ?? false, threshold: d.threshold ?? 3, action: d.action ?? 'dm_warn', dm_message: d.dm_message ?? '', remove_role_id: d.remove_role_id ?? '' }); }
    } catch {}
    setLoading(false);
  }, [guildId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/guilds/${guildId}/strike-automation`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({ ...config, removeRoleId: config.remove_role_id, dmMessage: config.dm_message }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      showToast('ok', 'Automation settings saved!');
    } catch (err: any) { showToast('err', err.message); }
    setSaving(false);
  };

  if (loading) return <div className="flex justify-center py-20"><div className="w-7 h-7 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#d4af37', borderTopColor: 'transparent' }} /></div>;

  return (
    <div className="space-y-5 max-w-2xl">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium flex items-center gap-2 ${toast.type === 'ok' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {toast.type === 'ok' ? <CheckCircle size={15} /> : <AlertCircle size={15} />} {toast.text}
        </div>
      )}

      <div>
        <h2 className="text-2xl font-extrabold tracking-tight flex items-center gap-2">
          <Zap className="w-6 h-6" style={{ color: '#d4af37' }} />Strike Automation
          <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-[10px]"><Star size={9} className="mr-0.5" />Premium</Badge>
        </h2>
        <p className="text-muted-foreground mt-0.5 text-sm">Automatically take action when a staff member hits the strike threshold — DM them, remove their role, or both.</p>
      </div>

      {!isPremium ? (
        <Card className="border-amber-200 bg-amber-50 shadow-sm">
          <CardContent className="p-6 text-center">
            <Star className="w-10 h-10 mx-auto mb-3" style={{ color: '#d4af37' }} />
            <h3 className="font-bold text-amber-800 mb-1">Premium Feature</h3>
            <p className="text-amber-700 text-sm mb-4">Strike Automation is only available on Zenith Premium. When enabled, the bot automatically DMs staff and/or removes their roles when they hit your configured strike threshold.</p>
            <a href="/premium" className="inline-block px-5 py-2 rounded-xl font-semibold text-sm" style={{ background: 'linear-gradient(135deg,#d4af37,#ffd700)', color: '#5a3e10' }}>Upgrade to Premium</a>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Status toggle card */}
          <Card className="border-border bg-white shadow-sm">
            <CardContent className="p-4 flex items-center justify-between gap-4">
              <div>
                <p className="font-semibold text-sm">Automation Status</p>
                <p className="text-xs text-muted-foreground">When enabled, actions trigger automatically at the threshold.</p>
              </div>
              <button
                onClick={() => setConfig(c => ({ ...c, enabled: !c.enabled }))}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${config.enabled ? '' : 'bg-gray-200'}`}
                style={config.enabled ? { background: 'linear-gradient(135deg,#d4af37,#ffd700)' } : {}}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${config.enabled ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </CardContent>
          </Card>

          {/* Settings */}
          <Card className="border-border bg-white shadow-sm">
            <CardHeader className="pb-3"><CardTitle className="text-sm">Trigger Settings</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="font-semibold">Strike Threshold</Label>
                  <Select value={String(config.threshold)} onValueChange={v => setConfig(c => ({ ...c, threshold: parseInt(v) }))}>
                    <SelectTrigger className="bg-white border-border"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-white border-border">
                      {[1,2,3,4,5,6,7,8,9,10].map(n => <SelectItem key={n} value={String(n)}>{n} strike{n !== 1 ? 's' : ''}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="font-semibold">Action</Label>
                  <Select value={config.action} onValueChange={v => setConfig(c => ({ ...c, action: v }))}>
                    <SelectTrigger className="bg-white border-border"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-white border-border">
                      <SelectItem value="dm_warn">DM Warning only</SelectItem>
                      <SelectItem value="remove_role">Remove role only</SelectItem>
                      <SelectItem value="dm_and_role">DM + Remove role</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {(config.action === 'remove_role' || config.action === 'dm_and_role') && (
                <div className="space-y-1.5">
                  <Label className="font-semibold">Discord Role ID to Remove</Label>
                  <Input value={config.remove_role_id} onChange={e => setConfig(c => ({ ...c, remove_role_id: e.target.value }))} placeholder="e.g. 123456789012345678 (Staff role)" className="bg-white border-border font-mono text-sm" />
                  <p className="text-xs text-muted-foreground">This role is removed from the staff member when the threshold is hit.</p>
                </div>
              )}

              {(config.action === 'dm_warn' || config.action === 'dm_and_role') && (
                <div className="space-y-1.5">
                  <Label className="font-semibold">DM Message (optional)</Label>
                  <Textarea value={config.dm_message} onChange={e => setConfig(c => ({ ...c, dm_message: e.target.value }))} placeholder="Leave blank for the default message, or customize it here..." className="bg-white border-border min-h-[80px]" />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Preview */}
          <Card className="border-border bg-muted/30 shadow-sm">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground font-medium mb-1">Preview</p>
              <p className="text-sm">
                {config.enabled ? '✅ Enabled — ' : '❌ Disabled — '}
                When a staff member hits <strong>{config.threshold} active strikes</strong>, the bot will{' '}
                {config.action === 'dm_warn' && 'send them a DM warning.'}
                {config.action === 'remove_role' && `remove their <@&${config.remove_role_id || 'role'}>.`}
                {config.action === 'dm_and_role' && `DM them and remove their <@&${config.remove_role_id || 'role'}>.`}
              </p>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving} style={{ background: 'linear-gradient(135deg,#d4af37,#ffd700)', color: '#5a3e10', border: 'none' }} className="gap-1.5 font-semibold">
              {saving ? <><Loader2 size={13} className="animate-spin" />Saving...</> : <><Save size={13} />Save Settings</>}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
