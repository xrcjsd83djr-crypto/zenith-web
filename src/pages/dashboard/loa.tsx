import { useState } from "react";
import { useListLoa, useCreateLoa, useUpdateLoa } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { CalendarClock, Plus, CheckCircle2, XCircle, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface LoaPageProps { guildId: string; }

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
  denied: "bg-red-50 text-red-600 border-red-200",
};

export default function LoaPage({ guildId }: LoaPageProps) {
  const [addOpen, setAddOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const { toast } = useToast();

  const { data: loas = [], isLoading, refetch } = useListLoa(guildId);
  const createMutation = useCreateLoa();
  const updateMutation = useUpdateLoa();

  const pending = (loas as any[]).filter((l: any) => l.status === "pending");
  const approved = (loas as any[]).filter((l: any) => l.status === "approved");
  const denied = (loas as any[]).filter((l: any) => l.status === "denied");

  const handleCreate = async () => {
    if (!reason || !startDate || !endDate) return;
    try {
      await createMutation.mutateAsync({ guildId, data: { reason, startDate: new Date(startDate).toISOString(), endDate: new Date(endDate).toISOString() } });
      toast({ title: "LOA request submitted" });
      setAddOpen(false); setReason(""); setStartDate(""); setEndDate("");
      refetch();
    } catch {
      toast({ title: "Failed to submit LOA", variant: "destructive" });
    }
  };

  const handleReview = async (id: number, status: string) => {
    try {
      await updateMutation.mutateAsync({ guildId, loaId: id, data: { status } });
      toast({ title: `LOA ${status}` });
      refetch();
    } catch {
      toast({ title: "Failed to update LOA", variant: "destructive" });
    }
  };

  const daysLeft = (end: string) => {
    const days = Math.ceil((new Date(end).getTime() - Date.now()) / 86400000);
    return days > 0 ? `${days} day${days !== 1 ? "s" : ""} remaining` : "Expired";
  };

  const LoaCard = ({ loa }: { loa: any }) => (
    <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow group">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
            {loa.username.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-bold text-gray-900">{loa.username}</p>
            <p className="text-xs text-gray-400">
              {new Date(loa.startDate).toLocaleDateString()} → {new Date(loa.endDate).toLocaleDateString()}
              {loa.status === "approved" && <span className="ml-2 text-primary">{daysLeft(loa.endDate)}</span>}
            </p>
          </div>
        </div>
        <Badge variant="outline" className={`text-xs border flex-shrink-0 ${STATUS_STYLES[loa.status]}`}>
          {loa.status}
        </Badge>
      </div>
      <p className="text-sm text-gray-600 mt-3 leading-relaxed">{loa.reason}</p>
      {loa.status === "pending" && (
        <div className="flex gap-2 mt-4">
          <Button size="sm" className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => handleReview(loa.id, "approved")}>
            <CheckCircle2 className="w-3.5 h-3.5" /> Approve
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5 text-red-600 border-red-200 hover:bg-red-50" onClick={() => handleReview(loa.id, "denied")}>
            <XCircle className="w-3.5 h-3.5" /> Deny
          </Button>
        </div>
      )}
    </div>
  );

  if (isLoading) {
    return <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="h-32 bg-white rounded-2xl border border-gray-100 animate-pulse" />)}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">LOA Requests</h1>
          <p className="text-gray-500 text-sm mt-1">{pending.length} pending review</p>
        </div>
        <Button onClick={() => setAddOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" /> Request LOA
        </Button>
      </div>

      {pending.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-amber-600 uppercase tracking-wider flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" /> Pending Review ({pending.length})
          </h2>
          {pending.map((l: any) => <LoaCard key={l.id} loa={l} />)}
        </div>
      )}

      {approved.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-emerald-600 uppercase tracking-wider flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" /> Approved ({approved.length})
          </h2>
          {approved.map((l: any) => <LoaCard key={l.id} loa={l} />)}
        </div>
      )}

      {denied.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-red-500 uppercase tracking-wider flex items-center gap-1.5">
            <XCircle className="w-3.5 h-3.5" /> Denied ({denied.length})
          </h2>
          {denied.map((l: any) => <LoaCard key={l.id} loa={l} />)}
        </div>
      )}

      {(loas as any[]).length === 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 py-20 text-center">
          <CalendarClock className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No LOA requests yet</p>
        </div>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Submit LOA Request</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1.5">Reason</label>
              <Textarea placeholder="Why do you need time off?" value={reason} onChange={e => setReason(e.target.value)} rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1.5">Start Date</label>
                <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1.5">End Date</label>
                <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!reason || !startDate || !endDate || createMutation.isPending}>
              {createMutation.isPending ? "Submitting..." : "Submit Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
