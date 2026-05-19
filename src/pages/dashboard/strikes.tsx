import { useState, useEffect, useCallback } from "react";
  import { Card, CardContent } from "@/components/ui/card";
  import { Button } from "@/components/ui/button";
  import { Badge } from "@/components/ui/badge";
  import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
  import { Label } from "@/components/ui/label";
  import { Input } from "@/components/ui/input";
  import { Textarea } from "@/components/ui/textarea";
  import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
  import { Switch } from "@/components/ui/switch";
  import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
  import { AlertTriangle, Plus, RefreshCw, X, CheckCircle, AlertCircle, Loader2, ChevronDown, ChevronUp, Zap, Star, Shield } from "lucide-react";

  interface Strike { id: number; user_id: string; username: string; reason: string; evidence?: string; issued_by: string; issued_by_name?: string; severity: string; active: boolean; removed_at?: string; removed_by?: string; removed_by_name?: string; removal_reason?: string; expires_at?: string; appeal_status?: string; created_at: string; }
  interface Member { id: string; username: string; }
  interface Config { strike_threshold?: number; strike_action?: string; strike_automation?: boolean; strike_dm_user?: boolean; strike_log_enabled?: boolean; strike_log_channel_id?: string; [k: string]: any; }

  function SeverityBadge({ s }: { s: string }) {
    const map: Record<string,string> = { strike:"bg-orange-100 text-orange-700 border-orange-200", final_warning:"bg-red-100 text-red-700 border-red-200", warning:"bg-yellow-100 text-yellow-700 border-yellow-200" };
    const labels: Record<string,string> = { strike:"Strike", final_warning:"Final Warning", warning:"Warning" };
    return <Badge className={`${map[s]||map.strike} text-xs border font-medium`}>{labels[s]||s}</Badge>;
  }

  function StrikeRow({ s, me, guildId, onRemoved }: { s: Strike; me: any; guildId: string; onRemoved: () => void }) {
    const [open, setOpen] = useState(false);
    const [removing, setRemoving] = useState(false);
    const [removeForm, setRemoveForm] = useState({ reason: '' });
    const [removeOpen, setRemoveOpen] = useState(false);

    const handleRemove = async () => {
      if (!removeForm.reason.trim()) return;
      setRemoving(true);
      try {
        const res = await fetch(`/api/guilds/${guildId}/strikes/${s.id}`, {
          method: 'DELETE', credentials: 'include', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ removedBy: me?.id, removedByName: me?.username, removalReason: removeForm.reason }),
        });
        if (res.ok) { setRemoveOpen(false); onRemoved(); }
      } catch {}
      setRemoving(false);
    };

    const ts = new Date(s.created_at);
    return (
      <div className="border border-border rounded-lg overflow-hidden mb-2">
        <button onClick={() => setOpen(o=>!o)} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors text-left">
          <SeverityBadge s={s.severity}/>
          <div className="flex-1 min-w-0">
            <span className="font-semibold text-sm">{s.username}</span>
            <span className="text-muted-foreground text-xs ml-2 truncate">"{s.reason.slice(0,60)}{s.reason.length>60?'…':''}"</span>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {!s.active && <Badge className="bg-gray-100 text-gray-500 border text-xs">Removed</Badge>}
            <span className="text-muted-foreground text-xs hidden sm:block">{ts.toLocaleDateString()}</span>
            {open?<ChevronUp size={14} className="text-muted-foreground"/>:<ChevronDown size={14} className="text-muted-foreground"/>}
          </div>
        </button>
        {open && (
          <div className="px-4 pb-4 border-t bg-muted/20">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-3">
              <div><p className="text-xs text-muted-foreground font-medium">Staff Member</p><p className="text-sm font-semibold">{s.username}</p></div>
              <div><p className="text-xs text-muted-foreground font-medium">Severity</p><SeverityBadge s={s.severity}/></div>
              <div><p className="text-xs text-muted-foreground font-medium">Issued By</p><p className="text-sm">{s.issued_by_name||s.issued_by}</p></div>
              <div><p className="text-xs text-muted-foreground font-medium">Date Issued</p><p className="text-sm">{ts.toLocaleString()}</p></div>
              {s.expires_at && <div><p className="text-xs text-muted-foreground font-medium">Expires</p><p className="text-sm">{new Date(s.expires_at).toLocaleDateString()}</p></div>}
              {s.appeal_status && s.appeal_status !== 'none' && <div><p className="text-xs text-muted-foreground font-medium">Appeal</p><Badge className="text-xs">{s.appeal_status}</Badge></div>}
              <div className="col-span-2 sm:col-span-3"><p className="text-xs text-muted-foreground font-medium">Reason</p><p className="text-sm">{s.reason}</p></div>
              {s.evidence && <div className="col-span-2 sm:col-span-3"><p className="text-xs text-muted-foreground font-medium">Evidence</p><p className="text-sm break-all">{s.evidence}</p></div>}
              {!s.active && s.removed_at && (
                <>
                  <div><p className="text-xs text-muted-foreground font-medium">Removed By</p><p className="text-sm">{s.removed_by_name||s.removed_by}</p></div>
                  <div><p className="text-xs text-muted-foreground font-medium">Removed On</p><p className="text-sm">{new Date(s.removed_at).toLocaleDateString()}</p></div>
                  {s.removal_reason && <div className="col-span-2"><p className="text-xs text-muted-foreground font-medium">Removal Reason</p><p className="text-sm">{s.removal_reason}</p></div>}
                </>
              )}
              {s.active && (
                <div className="col-span-2 sm:col-span-3 pt-1">
                  {removeOpen ? (
                    <div className="flex gap-2">
                      <Input value={removeForm.reason} onChange={e=>setRemoveForm(f=>({...f,reason:e.target.value}))} placeholder="Reason for removal..." className="h-8 text-sm flex-1"/>
                      <Button size="sm" onClick={handleRemove} disabled={removing} className="bg-green-600 hover:bg-green-700 text-white text-xs">
                        {removing?<Loader2 size={12} className="animate-spin"/>:"Confirm"}
                      </Button>
                      <Button size="sm" variant="outline" onClick={()=>setRemoveOpen(false)} className="text-xs">Cancel</Button>
                    </div>
                  ) : (
                    <Button size="sm" variant="outline" onClick={()=>setRemoveOpen(true)} className="text-red-600 border-red-200 hover:bg-red-50 text-xs gap-1"><X size={12}/>Remove Strike</Button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  export default function StrikesPage({ guildId }: { guildId: string }) {
    const [strikes, setStrikes] = useState<Strike[]>([]);
    const [members, setMembers] = useState<Member[]>([]);
    const [me, setMe] = useState<any>(null);
    const [config, setConfig] = useState<Config>({});
    const [channels, setChannels] = useState<any[]>([]);
    const [isPremium, setIsPremium] = useState(false);
    const [loading, setLoading] = useState(true);
    const [open, setOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [savingAuto, setSavingAuto] = useState(false);
    const [form, setForm] = useState({ userId:'', username:'', reason:'', evidence:'', severity:'strike', expiresInDays:'' });
    const [autoForm, setAutoForm] = useState<Config>({});
    const [toast, setToast] = useState<{type:"ok"|"err";text:string}|null>(null);
    const showToast = (type:"ok"|"err", text:string) => { setToast({type,text}); setTimeout(()=>setToast(null),4000); };
    const [showAll, setShowAll] = useState(false);

    const fetchAll = useCallback(async () => {
      setLoading(true);
      try {
        const [sRes, mRes, meRes, cfgRes, cRes, pRes] = await Promise.all([
          fetch(`/api/guilds/${guildId}/strikes`, {credentials:'include'}),
          fetch(`/api/guilds/${guildId}/members`, {credentials:'include'}),
          fetch('/api/me', {credentials:'include'}),
          fetch(`/api/guilds/${guildId}/config`, {credentials:'include'}),
          fetch(`/api/guilds/${guildId}/channels`, {credentials:'include'}),
          fetch(`/api/guilds/${guildId}/premium`, {credentials:'include'}),
        ]);
        if (sRes.ok) setStrikes(await sRes.json());
        if (mRes.ok) setMembers(await mRes.json());
        if (meRes.ok) setMe(await meRes.json());
        if (cfgRes.ok) { const c = await cfgRes.json(); setConfig(c); setAutoForm(c); }
        if (cRes.ok) setChannels(await cRes.json());
        if (pRes.ok) { const p = await pRes.json(); setIsPremium(p.isPremium); }
      } catch {}
      setLoading(false);
    }, [guildId]);
    useEffect(() => { fetchAll(); }, [fetchAll]);

    const active = strikes.filter(s => s.active);
    const removed = strikes.filter(s => !s.active);
    const displayed = showAll ? strikes : active;

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!form.userId || !form.reason.trim()) return showToast("err","Select member and enter reason.");
      setSubmitting(true);
      try {
        const res = await fetch(`/api/guilds/${guildId}/strikes`, {
          method:'POST', credentials:'include', headers:{'Content-Type':'application/json'},
          body: JSON.stringify({ userId:form.userId, username:form.username, reason:form.reason, evidence:form.evidence||null, severity:form.severity, issuedBy:me?.id, issuedByName:me?.username, expiresInDays:form.expiresInDays?Number(form.expiresInDays):null }),
        });
        const d = await res.json();
        if (!res.ok) throw new Error(d.error||'Failed');
        showToast("ok",`Strike issued to ${form.username}.`);
        setOpen(false); setForm({userId:'',username:'',reason:'',evidence:'',severity:'strike',expiresInDays:''}); fetchAll();
      } catch (err:any) { showToast("err",err.message); }
      setSubmitting(false);
    };

    const handleSaveAuto = async (e: React.FormEvent) => {
      e.preventDefault();
      setSavingAuto(true);
      try {
        const res = await fetch(`/api/guilds/${guildId}/config`, {
          method:'PUT', credentials:'include', headers:{'Content-Type':'application/json'},
          body: JSON.stringify(autoForm),
        });
        if (!res.ok) throw new Error('Failed to save');
        showToast("ok","Strike automation settings saved!");
        fetchAll();
      } catch (err:any) { showToast("err",err.message); }
      setSavingAuto(false);
    };

    return (
      <div className="space-y-5 max-w-4xl">
        {toast && <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm font-medium ${toast.type==='ok'?'bg-green-50 text-green-800 border border-green-200':'bg-red-50 text-red-800 border border-red-200'}`}>{toast.type==='ok'?<CheckCircle size={15}/>:<AlertCircle size={15}/>}{toast.text}</div>}
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight flex items-center gap-2"><AlertTriangle className="w-6 h-6 text-orange-500"/>Strikes</h2>
            <p className="text-muted-foreground mt-0.5 text-sm">{active.length} active • {removed.length} removed — click any row to expand</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchAll} className="gap-1.5"><RefreshCw size={13}/>Refresh</Button>
            <Button size="sm" onClick={() => setOpen(true)} className="gap-1.5 bg-orange-500 hover:bg-orange-600 text-white"><Plus size={13}/>Issue Strike</Button>
          </div>
        </div>

        <Tabs defaultValue="strikes">
          <TabsList className="h-9">
            <TabsTrigger value="strikes" className="text-sm gap-1.5"><AlertTriangle size={13}/>Strikes <Badge className="ml-1 text-xs bg-orange-100 text-orange-700 border border-orange-200">{active.length}</Badge></TabsTrigger>
            <TabsTrigger value="automation" className="text-sm gap-1.5"><Zap size={13}/>Automation {isPremium && <Badge className="ml-1 text-xs bg-amber-100 text-amber-600 border border-amber-200">On</Badge>}</TabsTrigger>
          </TabsList>

          <TabsContent value="strikes" className="mt-4">
            <div className="flex justify-between items-center mb-3">
              <p className="text-sm text-muted-foreground">Showing {displayed.length} records</p>
              <Button variant="ghost" size="sm" onClick={() => setShowAll(a=>!a)} className="text-xs">{showAll ? 'Show Active Only' : `Show All (incl. ${removed.length} removed)`}</Button>
            </div>
            {loading ? <div className="flex justify-center py-16"><div className="w-7 h-7 rounded-full border-2 border-t-transparent animate-spin" style={{borderColor:'#d4af37',borderTopColor:'transparent'}}/></div>
              : displayed.length === 0 ? <Card><CardContent className="py-12 text-center text-muted-foreground text-sm"><Shield size={32} className="mx-auto mb-2 text-green-400"/>No active strikes. Great job!</CardContent></Card>
              : <div>{displayed.map(s => <StrikeRow key={s.id} s={s} me={me} guildId={guildId} onRemoved={fetchAll}/>)}</div>}
          </TabsContent>

          <TabsContent value="automation" className="mt-4">
            {!isPremium && (
              <Card className="border-amber-200 bg-amber-50/50 mb-4">
                <CardContent className="p-4 flex items-start gap-3">
                  <Star className="text-amber-500 flex-shrink-0 mt-0.5" size={18}/>
                  <div>
                    <p className="font-semibold text-sm text-amber-800">Premium Feature — Strike Automation</p>
                    <p className="text-xs text-amber-700 mt-0.5">With Premium, strikes can automatically trigger actions like demotion or kick when a staff member reaches the configured threshold. You can also configure DM notifications and log channels per-strike. Here's a preview of what it looks like:</p>
                  </div>
                </CardContent>
              </Card>
            )}
            <form onSubmit={handleSaveAuto} className="space-y-4">
              <Card>
                <CardContent className="p-5 space-y-4">
                  <h3 className="font-semibold text-sm flex items-center gap-2"><Zap size={15} className="text-amber-500"/>Automation Settings {!isPremium && <Badge className="text-xs bg-amber-100 text-amber-700 border-amber-200">Preview</Badge>}</h3>
                  <div className="flex items-center justify-between">
                    <div><p className="text-sm font-medium">Enable Automation</p><p className="text-xs text-muted-foreground mt-0.5">Automatically take action when threshold is reached</p></div>
                    <Switch checked={!!autoForm.strike_automation} onCheckedChange={v => setAutoForm(f=>({...f,strike_automation:v}))} disabled={!isPremium}/>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-sm">Strike Threshold</Label>
                      <Input type="number" min={1} max={20} value={autoForm.strike_threshold||3} onChange={e=>setAutoForm(f=>({...f,strike_threshold:Number(e.target.value)}))} className="h-9" disabled={!isPremium}/>
                      <p className="text-xs text-muted-foreground">Action triggers at this many active strikes</p>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm">Automated Action</Label>
                      <Select value={autoForm.strike_action||'demotion'} onValueChange={v=>setAutoForm(f=>({...f,strike_action:v}))} disabled={!isPremium}>
                        <SelectTrigger className="h-9"><SelectValue/></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="demotion">Demotion</SelectItem>
                          <SelectItem value="kick">Kick from Staff</SelectItem>
                          <SelectItem value="notify">Notify Only</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div><p className="text-sm font-medium">DM Staff on Strike</p><p className="text-xs text-muted-foreground mt-0.5">Send a DM to the staff member when they receive a strike</p></div>
                    <Switch checked={autoForm.strike_dm_user !== false} onCheckedChange={v=>setAutoForm(f=>({...f,strike_dm_user:v}))}/>
                  </div>
                  <div className="flex items-center justify-between">
                    <div><p className="text-sm font-medium">Log Strikes to Channel</p><p className="text-xs text-muted-foreground mt-0.5">Post strike events to a designated log channel</p></div>
                    <Switch checked={autoForm.strike_log_enabled !== false} onCheckedChange={v=>setAutoForm(f=>({...f,strike_log_enabled:v}))}/>
                  </div>
                  {autoForm.strike_log_enabled !== false && (
                    <div className="space-y-1.5">
                      <Label className="text-sm">Strike Log Channel</Label>
                      <Select value={autoForm.strike_log_channel_id||''} onValueChange={v=>setAutoForm(f=>({...f,strike_log_channel_id:v}))}>
                        <SelectTrigger className="h-9"><SelectValue placeholder="Select a channel"/></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">No channel</SelectItem>
                          {channels.map(c=><SelectItem key={c.id} value={c.id}>#{c.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </CardContent>
              </Card>
              <div className="flex justify-end">
                <Button type="submit" disabled={savingAuto} style={{background:'#d4af37',color:'#000'}}>
                  {savingAuto?<><Loader2 size={14} className="animate-spin mr-1.5"/>Saving…</>:"Save Automation Settings"}
                </Button>
              </div>
            </form>
          </TabsContent>
        </Tabs>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Issue Strike</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-3 mt-2">
              <div className="space-y-1.5">
                <Label>Staff Member *</Label>
                <Select value={form.userId} onValueChange={v=>{const m=members.find(m=>m.id===v);setForm(f=>({...f,userId:v,username:m?.username||''}));}}>
                  <SelectTrigger><SelectValue placeholder="Select member"/></SelectTrigger>
                  <SelectContent>{members.map(m=><SelectItem key={m.id} value={m.id}>{m.username}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Severity *</Label>
                <Select value={form.severity} onValueChange={v=>setForm(f=>({...f,severity:v}))}>
                  <SelectTrigger><SelectValue/></SelectTrigger>
                  <SelectContent><SelectItem value="warning">Warning</SelectItem><SelectItem value="strike">Strike</SelectItem><SelectItem value="final_warning">Final Warning</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label>Reason *</Label><Textarea value={form.reason} onChange={e=>setForm(f=>({...f,reason:e.target.value}))} placeholder="Reason for this strike..." rows={3} required/></div>
              <div className="space-y-1.5"><Label>Evidence (optional)</Label><Input value={form.evidence} onChange={e=>setForm(f=>({...f,evidence:e.target.value}))} placeholder="Link or description"/></div>
              <div className="space-y-1.5"><Label>Expires in days (optional)</Label><Input type="number" min={1} value={form.expiresInDays} onChange={e=>setForm(f=>({...f,expiresInDays:e.target.value}))} placeholder="Leave blank for permanent"/></div>
              <div className="flex justify-end gap-2 pt-1">
                <Button type="button" variant="outline" onClick={()=>setOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={submitting} className="bg-orange-500 hover:bg-orange-600 text-white">
                  {submitting?<><Loader2 size={14} className="animate-spin mr-1.5"/>Issuing…</>:<><AlertTriangle size={14} className="mr-1.5"/>Issue Strike</>}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    );
  }
  