import { useState, useEffect, useCallback } from "react";
  import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
  import { Button } from "@/components/ui/button";
  import { Badge } from "@/components/ui/badge";
  import { Input } from "@/components/ui/input";
  import { AlertTriangle, RefreshCw, Search, Clock, CheckCircle, Loader2, Star, Users, Eye } from "lucide-react";

  interface InactiveMember { id: string; user_id: string; username: string; last_activity?: string; days_inactive: number; status: string; scanned_at: string; action_taken?: string; }

  export default function InactivityPage({ guildId }: { guildId: string }) {
    const [members, setMembers] = useState<InactiveMember[]>([]);
    const [loading, setLoading] = useState(true);
    const [scanning, setScanning] = useState(false);
    const [isPremium, setIsPremium] = useState(false);
    const [search, setSearch] = useState('');
    const [threshold, setThreshold] = useState(7);
    const [toast, setToast] = useState<{ type: "ok"|"err"; text: string } | null>(null);
    const showToast = (type: "ok"|"err", text: string) => { setToast({ type, text }); setTimeout(() => setToast(null), 4000); };

    const fetchData = useCallback(async () => {
      setLoading(true);
      try {
        const [iRes, pRes] = await Promise.all([
          fetch(`/api/guilds/${guildId}/inactivity`, { credentials: 'include' }),
          fetch(`/api/guilds/${guildId}/premium`, { credentials: 'include' }),
        ]);
        if (iRes.ok) setMembers(await iRes.json());
        if (pRes.ok) { const p = await pRes.json(); setIsPremium(p.isPremium); }
      } catch {}
      setLoading(false);
    }, [guildId]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleScan = async () => {
      setScanning(true);
      try {
        const res = await fetch(`/api/guilds/${guildId}/inactivity/scan`, {
          method: 'POST', credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ thresholdDays: threshold }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Scan failed');
        showToast("ok", `Scan complete — ${data.flagged ?? 0} staff members flagged.`);
        fetchData();
      } catch (err: any) { showToast("err", err.message); }
      setScanning(false);
    };

    const handleDismiss = async (id: string) => {
      try {
        await fetch(`/api/guilds/${guildId}/inactivity/${id}/dismiss`, { method: 'POST', credentials: 'include' });
        setMembers(m => m.filter(x => x.id !== id));
      } catch {}
    };

    const filtered = members.filter(m => !search || m.username.toLowerCase().includes(search.toLowerCase()));
    const flagged = filtered.filter(m => m.status === 'flagged');
    const dismissed = filtered.filter(m => m.status === 'dismissed');

    return (
      <div className="space-y-5 max-w-4xl">
        {toast && <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm font-medium ${toast.type==='ok'?'bg-green-50 text-green-800 border border-green-200':'bg-red-50 text-red-800 border border-red-200'}`}>{toast.type==='ok'?<CheckCircle size={15}/>:<AlertTriangle size={15}/>}{toast.text}</div>}
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight flex items-center gap-2">
              <AlertTriangle className="w-6 h-6" style={{ color: '#d4af37' }} />Inactivity Scanner
              {isPremium && <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-[10px]"><Star size={9} className="mr-1"/>Premium</Badge>}
            </h2>
            <p className="text-muted-foreground mt-0.5 text-sm">{flagged.length} staff flagged for inactivity</p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchData} className="gap-1.5"><RefreshCw size={13}/>Refresh</Button>
        </div>

        {!isPremium && (
          <Card className="border-amber-200 bg-amber-50/50">
            <CardContent className="p-4 flex items-start gap-3">
              <Star className="text-amber-500 flex-shrink-0 mt-0.5" size={18}/>
              <div>
                <p className="font-semibold text-sm text-amber-800">Premium Feature Preview</p>
                <p className="text-xs text-amber-700 mt-0.5">The Inactivity Scanner automatically identifies staff who haven't logged activity beyond your threshold. Set custom thresholds, auto-notify, or flag for review. Upgrade to Premium to activate full scanning.</p>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold">Run Inactivity Scan</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <label className="text-sm text-muted-foreground">Flag staff inactive for more than</label>
                <Input type="number" min={1} max={90} value={threshold} onChange={e => setThreshold(Number(e.target.value))} className="w-20 h-8 text-sm text-center"/>
                <span className="text-sm text-muted-foreground">days</span>
              </div>
              <Button onClick={handleScan} disabled={scanning} size="sm" style={{ background: '#d4af37', color: '#000' }}>
                {scanning ? <><Loader2 size={13} className="animate-spin mr-1.5"/>Scanning…</> : <><Search size={13} className="mr-1.5"/>Run Scan</>}
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="relative"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"/><Input placeholder="Search staff..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9 text-sm"/></div>

        {loading ? <div className="flex justify-center py-16"><div className="w-7 h-7 rounded-full border-2 border-t-transparent animate-spin" style={{borderColor:'#d4af37',borderTopColor:'transparent'}}/></div>
          : flagged.length === 0 ? <Card><CardContent className="py-12 text-center"><CheckCircle size={32} className="mx-auto text-green-400 mb-2"/><p className="text-muted-foreground text-sm">No inactive staff flagged. Run a scan to check.</p></CardContent></Card>
          : (
            <div className="space-y-2">
              {flagged.map(m => (
                <Card key={m.id} className="border-orange-200">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0"><AlertTriangle size={16} className="text-orange-500"/></div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm">{m.username}</span>
                          <Badge className="bg-orange-100 text-orange-700 border-orange-200 text-xs"><Clock size={9} className="mr-1"/>{m.days_inactive}d inactive</Badge>
                        </div>
                        {m.last_activity && <p className="text-xs text-muted-foreground mt-0.5">Last activity: {new Date(m.last_activity).toLocaleDateString()}</p>}
                        <p className="text-xs text-muted-foreground">Scanned: {new Date(m.scanned_at).toLocaleDateString()}</p>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => handleDismiss(m.id)} className="flex-shrink-0 text-xs">Dismiss</Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
      </div>
    );
  }
  