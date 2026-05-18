import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BookOpen, Plus, RefreshCw, Trash2, Pencil, AlertCircle, CheckCircle, Loader2 } from "lucide-react";

interface HandbookEntry { id: string; title: string; content: string; section: string; sort_order: number; created_at: string; }
const SECTIONS = ['General', 'Rules & Conduct', 'Procedures', 'Promotions', 'Disciplinary', 'Duty & Activity', 'Emergency Protocols', 'Other'];

export default function HandbookPage({ guildId }: { guildId: string }) {
  const [entries, setEntries] = useState<HandbookEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editEntry, setEditEntry] = useState<HandbookEntry | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [form, setForm] = useState({ title: '', content: '', section: 'General', sortOrder: 0 });
  const [toast, setToast] = useState<{ type: "ok"|"err"; text: string } | null>(null);

  const showToast = (type: "ok"|"err", text: string) => { setToast({ type, text }); setTimeout(() => setToast(null), 4000); };

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/guilds/${guildId}/handbook`, { credentials: 'include' });
      if (res.ok) setEntries(await res.json());
    } catch {}
    setLoading(false);
  }, [guildId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const openEdit = (e: HandbookEntry) => {
    setEditEntry(e);
    setForm({ title: e.title, content: e.content, section: e.section, sortOrder: e.sort_order });
    setOpen(true);
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setSubmitting(true);
    try {
      const url = editEntry
        ? `/api/guilds/${guildId}/handbook/${editEntry.id}`
        : `/api/guilds/${guildId}/handbook`;
      const res = await fetch(url, {
        method: editEntry ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(form),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      setOpen(false); setEditEntry(null); setForm({ title: '', content: '', section: 'General', sortOrder: 0 });
      fetchAll(); showToast('ok', editEntry ? 'Entry updated.' : 'Entry added!');
    } catch (err: any) { showToast('err', err.message); }
    setSubmitting(false);
  };

  const deleteEntry = async (id: string) => {
    if (!confirm('Delete this handbook entry?')) return;
    try {
      await fetch(`/api/guilds/${guildId}/handbook/${id}`, { method: 'DELETE', credentials: 'include' });
      setEntries(e => e.filter(x => x.id !== id));
      showToast('ok', 'Entry deleted.');
    } catch { showToast('err', 'Failed.'); }
  };

  const sections = [...new Set(entries.map(e => e.section))];

  if (loading) return <div className="flex justify-center py-20"><div className="w-7 h-7 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#d4af37', borderTopColor: 'transparent' }} /></div>;

  return (
    <div className="space-y-5 max-w-3xl">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium flex items-center gap-2 ${toast.type === 'ok' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {toast.type === 'ok' ? <CheckCircle size={15} /> : <AlertCircle size={15} />} {toast.text}
        </div>
      )}

      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight flex items-center gap-2"><BookOpen className="w-6 h-6" style={{ color: '#d4af37' }} />Staff Handbook</h2>
          <p className="text-muted-foreground mt-0.5 text-sm">Centralized rules, procedures, and reference guides for your staff team.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchAll} className="gap-1.5"><RefreshCw size={13} />Refresh</Button>
          <Dialog open={open} onOpenChange={v => { if (!v) { setEditEntry(null); setForm({ title: '', content: '', section: 'General', sortOrder: 0 }); } setOpen(v); }}>
            <DialogTrigger asChild>
              <Button size="sm" style={{ background: 'linear-gradient(135deg,#d4af37,#ffd700)', color: '#5a3e10', border: 'none' }} className="gap-1.5 font-semibold">
                <Plus size={14} /> Add Entry
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-white border-border max-w-lg">
              <DialogHeader><DialogTitle className="flex items-center gap-2"><BookOpen size={18} style={{ color: '#d4af37' }} />{editEntry ? 'Edit Entry' : 'Add Handbook Entry'}</DialogTitle></DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 mt-2">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5 col-span-2">
                    <Label className="font-semibold">Title</Label>
                    <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Patrol Procedures" className="bg-white border-border" required />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="font-semibold">Section</Label>
                    <Select value={form.section} onValueChange={v => setForm(f => ({ ...f, section: v }))}>
                      <SelectTrigger className="bg-white border-border"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-white border-border">{SECTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="font-semibold">Sort Order</Label>
                    <Input type="number" value={form.sortOrder} onChange={e => setForm(f => ({ ...f, sortOrder: parseInt(e.target.value) || 0 }))} className="bg-white border-border" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="font-semibold">Content</Label>
                  <Textarea value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} placeholder="Write the content for this section. Markdown-style formatting is preserved." className="bg-white border-border min-h-[150px]" required />
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={submitting} style={{ background: 'linear-gradient(135deg,#d4af37,#ffd700)', color: '#5a3e10', border: 'none' }}>
                    {submitting ? <><Loader2 size={13} className="animate-spin mr-1" />Saving...</> : editEntry ? "Update" : "Add Entry"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {entries.length === 0 ? (
        <Card className="border-border bg-white shadow-sm"><CardContent className="py-16 text-center"><BookOpen className="w-10 h-10 text-muted-foreground mx-auto mb-3" /><p className="font-semibold text-muted-foreground">No handbook entries yet</p><p className="text-sm text-muted-foreground mt-1">Add rules, procedures, and guidelines for your staff. Organize by section.</p></CardContent></Card>
      ) : sections.map(section => (
        <div key={section}>
          <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">{section}</h3>
          <div className="space-y-2">
            {entries.filter(e => e.section === section).map(entry => (
              <Card key={entry.id} className="border-border bg-white shadow-sm cursor-pointer" onClick={() => setExpanded(expanded === entry.id ? null : entry.id)}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-sm">{entry.title}</h4>
                      <Badge className="bg-muted text-muted-foreground border-border text-[10px]">{entry.section}</Badge>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button onClick={ev => { ev.stopPropagation(); openEdit(entry); }} className="p-1.5 rounded hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-colors">
                        <Pencil size={13} />
                      </button>
                      <button onClick={ev => { ev.stopPropagation(); deleteEntry(entry.id); }} className="p-1.5 rounded hover:bg-muted/60 text-muted-foreground hover:text-red-500 transition-colors">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                  {expanded === entry.id && (
                    <div className="mt-3 pt-3 border-t border-border text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                      {entry.content}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
