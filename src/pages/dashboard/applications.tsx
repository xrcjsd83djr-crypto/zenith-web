import { useState } from "react";
import { useListApplications, useUpdateApplication } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Inbox, Search, CheckCircle2, XCircle, Clock, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ApplicationsPageProps { guildId: string; }

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
  denied: "bg-red-50 text-red-600 border-red-200",
};

export default function ApplicationsPage({ guildId }: ApplicationsPageProps) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<any>(null);
  const [reviewNote, setReviewNote] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const { toast } = useToast();

  const { data: apps = [], isLoading, refetch } = useListApplications(guildId);
  const updateMutation = useUpdateApplication();

  const filtered = (apps as any[]).filter((a: any) => {
    const matchSearch = a.username?.toLowerCase().includes(search.toLowerCase()) || a.rankAppliedFor?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || a.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const counts = {
    all: (apps as any[]).length,
    pending: (apps as any[]).filter((a: any) => a.status === "pending").length,
    approved: (apps as any[]).filter((a: any) => a.status === "approved").length,
    denied: (apps as any[]).filter((a: any) => a.status === "denied").length,
  };

  const handleReview = async (status: string) => {
    if (!selected) return;
    try {
      await updateMutation.mutateAsync({ guildId, applicationId: selected.id, data: { status, reviewNote } });
      toast({ title: `Application ${status}` });
      setSelected(null); setReviewNote("");
      refetch();
    } catch {
      toast({ title: "Failed to review application", variant: "destructive" });
    }
  };

  if (isLoading) {
    return <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="h-20 bg-white rounded-xl border border-gray-100 animate-pulse" />)}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Applications</h1>
          <p className="text-gray-500 text-sm mt-1">{counts.pending} pending review</p>
        </div>
      </div>

      {/* Status tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {(["all","pending","approved","denied"] as const).map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all capitalize ${statusFilter === s ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"}`}
          >
            {s} <span className={`ml-1 text-xs font-bold ${statusFilter === s ? "text-primary" : "text-gray-400"}`}>{counts[s]}</span>
          </button>
        ))}
      </div>

      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <Input placeholder="Search applications..." className="pl-9 bg-white" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
        {filtered.length === 0 ? (
          <div className="py-20 text-center">
            <Inbox className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No applications found</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filtered.map((a: any) => (
              <button key={a.id} className="w-full text-left px-6 py-4 flex items-center gap-4 hover:bg-gray-50/60 transition-colors group" onClick={() => { setSelected(a); setReviewNote(a.reviewNote || ""); }}>
                {a.avatar ? (
                  <img src={`https://cdn.discordapp.com/avatars/${a.userId}/${a.avatar}.webp?size=64`} alt={a.username} className="w-10 h-10 rounded-full ring-2 ring-white shadow-sm" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold shadow-sm">
                    {a.username.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-900">{a.username}</span>
                    <Badge variant="outline" className={`text-xs border ${STATUS_STYLES[a.status]}`}>{a.status}</Badge>
                  </div>
                  {a.rankAppliedFor && <p className="text-sm text-gray-500 mt-0.5">Applied for: <span className="font-medium text-gray-700">{a.rankAppliedFor}</span></p>}
                  <p className="text-xs text-gray-400 mt-0.5">{new Date(a.createdAt).toLocaleDateString()}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Review Dialog */}
      {selected && (
        <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
          <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3">
                {selected.avatar ? (
                  <img src={`https://cdn.discordapp.com/avatars/${selected.userId}/${selected.avatar}.webp?size=64`} className="w-8 h-8 rounded-full" alt="" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                    {selected.username.charAt(0).toUpperCase()}
                  </div>
                )}
                {selected.username}'s Application
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-2">
              {selected.rankAppliedFor && (
                <div className="bg-primary/5 border border-primary/10 rounded-xl px-4 py-3">
                  <p className="text-sm text-primary font-semibold">Applying for: {selected.rankAppliedFor}</p>
                </div>
              )}

              {(selected.answers as any[])?.map((ans: any, i: number) => (
                <div key={i} className="border border-gray-100 rounded-xl p-4 bg-gray-50/50">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Q{i + 1}</p>
                  <p className="text-sm font-medium text-gray-800 mb-2">{ans.question}</p>
                  <p className="text-sm text-gray-600 leading-relaxed">{ans.answer}</p>
                </div>
              ))}

              {selected.status === "pending" && (
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1.5">Review Note (optional)</label>
                  <Textarea placeholder="Add a note to send with your decision..." value={reviewNote} onChange={e => setReviewNote(e.target.value)} rows={2} />
                </div>
              )}

              {selected.status !== "pending" && selected.reviewNote && (
                <div className="border border-gray-100 rounded-xl p-4 bg-gray-50">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Reviewer Note</p>
                  <p className="text-sm text-gray-700">{selected.reviewNote}</p>
                  {selected.reviewedByName && <p className="text-xs text-gray-400 mt-2">— {selected.reviewedByName}</p>}
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setSelected(null)}>Close</Button>
              {selected.status === "pending" && (
                <>
                  <Button variant="outline" className="gap-1.5 text-red-600 border-red-200 hover:bg-red-50" onClick={() => handleReview("denied")} disabled={updateMutation.isPending}>
                    <XCircle className="w-4 h-4" /> Deny
                  </Button>
                  <Button className="gap-1.5 bg-emerald-600 hover:bg-emerald-700" onClick={() => handleReview("approved")} disabled={updateMutation.isPending}>
                    <CheckCircle2 className="w-4 h-4" /> Approve
                  </Button>
                </>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
