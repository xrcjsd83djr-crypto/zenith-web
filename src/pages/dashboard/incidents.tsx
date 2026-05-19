import { useState, useEffect, useCallback } from "react";
  import { Card, CardContent } from "@/components/ui/card";
  import { Button } from "@/components/ui/button";
  import { Badge } from "@/components/ui/badge";
  import { Input } from "@/components/ui/input";
  import { Label } from "@/components/ui/label";
  import { Textarea } from "@/components/ui/textarea";
  import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
  import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
  import { FileWarning, Plus, RefreshCw, ChevronDown, ChevronUp, Search, Trash2 } from "lucide-react";

  interface Incident { id: string; title: string; description: string; severity: string; involved_staff: string; location?: string; reported_by: string; reported_by_name: string; status: string; resolution?: string; created_at: string; }

  function IncidentRow({ r }: { r: Incident }) {
    const [open, setOpen] = useState(false);
    const sev: Record<string, string> = { low: "bg-blue-50 text-blue-700 border-blue-200", medium: "bg-yellow-50 text-yellow-700 border-yellow-200", high: "bg-orange-50 text-orange-700 border-orange-200", critical: "bg-red-50 text-red-700 border-red-200" };
    const status: Record<string, string> = { open: "bg-red-50 text-red-700 border-red-200", investigating: "bg-yellow-50 text-yellow-700 border-yellow-200", resolved: "bg-green-50 text-green-700 border-green-200" };
    return (
      <div className="border border-border rounded-lg overflow-hidden mb-2">
        <button onClick={() => setOpen(o => !o)} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors text-left">
          <Badge className={`${sev[r.severity] || "bg-gray-100 text-gray-600"} border text-xs capitalize`}>{r.severity}</Badge>
          <div className="flex-1 min-w-0"><span className="font-semibold text-sm">{r.title}</span></div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Badge className={`${status[r.status] || ""} border text-xs capitalize`}>{r.status}</Badge>
            <span className="text-muted-foreground text-xs">{new Date(r.created_at).toLocaleDateString()}</span>
            {open ? <ChevronUp size={14} className="text-muted-foreground" /> : <ChevronDown size={14} className="text-muted-foreground" />}
          </div>
        </button>
        {open && (
          <div className="px-4 pb-4 border-t bg-muted/20">
            <div className="grid grid-cols-2 gap-3 mt-3 text-sm">
              <div><p className="text-xs text-muted-foreground font-medium">Severity</p><Badge className={`${sev[r.severity] || ""} border text-xs capitalize`}>{r.severity}</Badge></div>
              <div><p className="text-xs text-muted-foreground font-medium">Status</p><Badge className={`${status[r.status] || ""} border text-xs capitalize`}>{r.status}</Badge></div>
              <div><p className="text-xs text-muted-foreground font-medium">Reported By</p><p>{r.reported_by_name}</p></div>
              <div><p className="text-xs text-muted-foreground font-medium">Date</p><p>{new Date(r.created_at).toLocaleString()}</p></div>
              {r.location && <div><p className="text-xs text-muted-foreground font-medium">Location</p><p>{r.location}</p></div>}
              <div className="col-span-2"><p className="text-xs text-muted-foreground font-medium">Description</p><p>{r.description}</p></div>
              {r.involved_staff && <div className="col-span-2"><p className="text-xs text-muted-foreground font-medium">Involved Staff</p><p>{r.involved_staff}</p></div>}
              {r.resolution && <div className="col-span-2"><p className="text-xs text-muted-foreground font-medium">Resolution</p><p>{r.resolution}</p></div>}
            </div>
          </div>
        )}
      </div>
    );
  }

  export default function IncidentsPage({ guildId }: { guildId: string }) {
    const [incidents, setIncidents] = useState<Incident[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [sevFilter, setSevFilter] = useState("all");
    const [creating, setCreating] = useState(false);
    const [form, setForm] = useState({ title: "", description: "", severity: "medium", involvedStaff: "", location: "", reportedByName: "" });
    const [saving, setSaving] = useState(false);

    const fetchAll = useCallback(async () => {
      setLoading(true);
      try {
        const r = await fetch(`/api/guilds/${guildId}/incidents`, { credentials: "include" });
        if (r.ok) setIncidents(await r.json());
      } catch {}
      setLoading(false);
    }, [guildId]);
    useEffect(() => { fetchAll(); }, [fetchAll]);

    const save = async () => {
      setSaving(true);
      try {
        const r = await fetch(`/api/guilds/${guildId}/incidents`, {
          method: "POST", credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: form.title, description: form.description, severity: form.severity, involvedStaff: form.involvedStaff, location: form.location, reportedByName: form.reportedByName }),
        });
        if (r.ok) { setCreating(false); setForm({ title: "", description: "", severity: "medium", involvedStaff: "", location: "", reportedByName: "" }); fetchAll(); }
      } catch {}
      setSaving(false);
    };

    const gold = { background: "#d4af37", color: "#000" };
    const filtered = incidents
      .filter(i => sevFilter === "all" || i.severity === sevFilter)
      .filter(i => !search || i.title.toLowerCase().includes(search.toLowerCase()) || i.involved_staff?.toLowerCase().includes(search.toLowerCase()));

    const open_ = incidents.filter(i => i.status === "open").length;
    const critical = incidents.filter(i => i.severity === "critical").length;

    return (
      <div className="space-y-5 max-w-4xl">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight flex items-center gap-2"><FileWarning className="w-6 h-6" style={{ color: "#d4af37" }} />Incident Reports</h2>
            <p className="text-muted-foreground mt-0.5 text-sm">{open_} open • {critical > 0 ? critical + " critical • " : ""}{incidents.length} total</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchAll} className="gap-1.5"><RefreshCw size={13} />Refresh</Button>
            <Button size="sm" onClick={() => setCreating(true)} style={gold} className="gap-1.5"><Plus size={13} />File Report</Button>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          {["all","low","medium","high","critical"].map(s => (
            <Button key={s} size="sm" variant={sevFilter === s ? "default" : "outline"} onClick={() => setSevFilter(s)} className="capitalize text-xs" style={sevFilter === s ? gold : {}}>{s}</Button>
          ))}
          <div className="relative flex-1 min-w-40"><Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" /><Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9 text-sm" /></div>
        </div>
        {loading ? <div className="flex justify-center py-12"><div className="w-7 h-7 rounded-full border-2 animate-spin" style={{ borderColor: "#d4af37", borderTopColor: "transparent" }} /></div>
          : filtered.length === 0 ? <Card><CardContent className="py-12 text-center text-muted-foreground text-sm">No incident reports{sevFilter !== "all" ? " with severity: " + sevFilter : ""}.</CardContent></Card>
          : filtered.map(r => <IncidentRow key={r.id} r={r} />)}
        <Dialog open={creating} onOpenChange={o => { if (!o) setCreating(false); }}>
          <DialogContent>
            <DialogHeader><DialogTitle>File Incident Report</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div><Label className="text-xs">Incident Title *</Label><Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Brief description of incident" className="h-9 text-sm mt-1" /></div>
              <div><Label className="text-xs">Severity</Label>
                <Select value={form.severity} onValueChange={v => setForm(f => ({ ...f, severity: v }))}>
                  <SelectTrigger className="h-9 text-sm mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="low">Low</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="high">High</SelectItem><SelectItem value="critical">Critical</SelectItem></SelectContent>
                </Select>
              </div>
              <div><Label className="text-xs">Full Description *</Label><Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} className="text-sm mt-1" /></div>
              <div><Label className="text-xs">Involved Staff</Label><Input value={form.involvedStaff} onChange={e => setForm(f => ({ ...f, involvedStaff: e.target.value }))} placeholder="Usernames, comma separated" className="h-9 text-sm mt-1" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs">Location / Context</Label><Input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="Where it happened" className="h-9 text-sm mt-1" /></div>
                <div><Label className="text-xs">Reported By</Label><Input value={form.reportedByName} onChange={e => setForm(f => ({ ...f, reportedByName: e.target.value }))} placeholder="Your name" className="h-9 text-sm mt-1" /></div>
              </div>
              <div className="flex gap-2">
                <Button onClick={save} disabled={saving || !form.title || !form.description} style={gold} className="flex-1">{saving ? "Filing…" : "Submit Report"}</Button>
                <Button variant="outline" onClick={() => setCreating(false)}>Cancel</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }
  