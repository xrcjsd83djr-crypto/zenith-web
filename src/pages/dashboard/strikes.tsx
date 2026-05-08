import { useState } from "react";
import { useListStrikes, useCreateStrike, useRemoveStrike } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertTriangle, Plus, Trash2, Search, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface StrikesPageProps { guildId: string; }

export default function StrikesPage({ guildId }: StrikesPageProps) {
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [userId, setUserId] = useState("");
  const [reason, setReason] = useState("");
  const [evidence, setEvidence] = useState("");
  const { toast } = useToast();

  const { data: strikes = [], isLoading, refetch } = useListStrikes(guildId);
  const createMutation = useCreateStrike();
  const deleteMutation = useRemoveStrike();

  const filtered = (strikes as any[]).filter((s: any) =>
    s.username?.toLowerCase().includes(search.toLowerCase()) ||
    s.reason?.toLowerCase().includes(search.toLowerCase())
  );
  const active = filtered.filter((s: any) => s.active);
  const revoked = filtered.filter((s: any) => !s.active);

  const handleAdd = async () => {
    if (!userId || !reason) return;
    try {
      await createMutation.mutateAsync({ guildId, data: { userId, reason, evidence: evidence || undefined } });
      toast({ title: "Strike issued" });
      setAddOpen(false); setUserId(""); setReason(""); setEvidence("");
      refetch();
    } catch {
      toast({ title: "Failed to issue strike", variant: "destructive" });
    }
  };

  const handleRevoke = async (id: number) => {
    try {
      await deleteMutation.mutateAsync({ guildId, strikeId: id });
      toast({ title: "Strike revoked" });
      refetch();
    } catch {
      toast({ title: "Failed to revoke strike", variant: "destructive" });
    }
  };

  if (isLoading) {
    return <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="h-20 bg-white rounded-xl border border-gray-100 animate-pulse" />)}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Strikes</h1>
          <p className="text-gray-500 text-sm mt-1">{active.length} active strike{active.length !== 1 ? "s" : ""}</p>
        </div>
        <Button onClick={() => setAddOpen(true)} variant="destructive" className="gap-2">
          <Plus className="w-4 h-4" /> Issue Strike
        </Button>
      </div>

      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <Input placeholder="Search strikes..." className="pl-9 bg-white" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {active.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Active</h2>
          {active.map((s: any) => (
            <div key={s.id} className="bg-white border border-red-100 rounded-2xl p-5 flex items-start gap-4 shadow-sm hover:shadow-md transition-shadow group">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-500" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-bold text-gray-900">{s.username}</span>
                  <Badge variant="outline" className="text-xs border-red-200 text-red-600 bg-red-50">Active</Badge>
                </div>
                <p className="text-sm text-gray-700 mb-1">{s.reason}</p>
                {s.evidence && <p className="text-xs text-gray-400 truncate">Evidence: {s.evidence}</p>}
                <p className="text-xs text-gray-400 mt-2">
                  Issued by <span className="font-medium text-gray-600">{s.issuedByName}</span> · {new Date(s.createdAt).toLocaleDateString()}
                </p>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => handleRevoke(s.id)}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {revoked.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Revoked</h2>
          {revoked.map((s: any) => (
            <div key={s.id} className="bg-gray-50 border border-gray-100 rounded-2xl p-5 flex items-start gap-4 opacity-60">
              <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                <Shield className="w-5 h-5 text-gray-400" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-bold text-gray-700">{s.username}</span>
                  <Badge variant="outline" className="text-xs text-gray-400">Revoked</Badge>
                </div>
                <p className="text-sm text-gray-500">{s.reason}</p>
                <p className="text-xs text-gray-400 mt-1">{new Date(s.createdAt).toLocaleDateString()}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {active.length === 0 && revoked.length === 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 py-20 text-center">
          <AlertTriangle className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No strikes on record</p>
          <p className="text-gray-400 text-sm mt-1">Strikes issued to staff members will appear here</p>
        </div>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Issue Strike</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1.5">Discord User ID</label>
              <Input placeholder="123456789012345678" value={userId} onChange={e => setUserId(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1.5">Reason <span className="text-red-500">*</span></label>
              <Textarea placeholder="Describe the reason for this strike..." value={reason} onChange={e => setReason(e.target.value)} rows={3} />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1.5">Evidence (optional)</label>
              <Input placeholder="Screenshot URL or description" value={evidence} onChange={e => setEvidence(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleAdd} disabled={!userId || !reason || createMutation.isPending}>
              {createMutation.isPending ? "Issuing..." : "Issue Strike"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
