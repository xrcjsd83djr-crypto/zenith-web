import { useState } from "react";
import { useListRanks, useCreateRank, useUpdateRank, useDeleteRank } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { BadgeCent, Plus, Trash2, Edit2, GripVertical, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface RanksPageProps { guildId: string; }

export default function RanksPage({ guildId }: RanksPageProps) {
  const [addOpen, setAddOpen] = useState(false);
  const [editRank, setEditRank] = useState<any>(null);
  const [form, setForm] = useState({ name: "", level: "", color: "#5BA4CF", division: "", discordRoleId: "" });
  const { toast } = useToast();

  const { data: ranks = [], isLoading, refetch } = useListRanks(guildId);
  const createMutation = useCreateRank();
  const updateMutation = useUpdateRank();
  const deleteMutation = useDeleteRank();

  const handleCreate = async () => {
    if (!form.name || !form.level) return;
    try {
      await createMutation.mutateAsync({ guildId, data: {
        name: form.name, level: parseInt(form.level), color: form.color || null,
        division: form.division || null, discordRoleId: form.discordRoleId || null,
      }});
      toast({ title: "Rank created" });
      setAddOpen(false); setForm({ name: "", level: "", color: "#5BA4CF", division: "", discordRoleId: "" });
      refetch();
    } catch {
      toast({ title: "Failed to create rank", variant: "destructive" });
    }
  };

  const handleUpdate = async () => {
    if (!editRank || !form.name || !form.level) return;
    try {
      await updateMutation.mutateAsync({ guildId, rankId: editRank.id, data: {
        name: form.name, level: parseInt(form.level), color: form.color || null,
        division: form.division || null, discordRoleId: form.discordRoleId || null,
      }});
      toast({ title: "Rank updated" });
      setEditRank(null); setForm({ name: "", level: "", color: "#5BA4CF", division: "", discordRoleId: "" });
      refetch();
    } catch {
      toast({ title: "Failed to update rank", variant: "destructive" });
    }
  };

  const handleDelete = async (rankId: number) => {
    try {
      await deleteMutation.mutateAsync({ guildId, rankId });
      toast({ title: "Rank deleted" });
      refetch();
    } catch {
      toast({ title: "Failed to delete rank", variant: "destructive" });
    }
  };

  const openEdit = (r: any) => {
    setEditRank(r);
    setForm({ name: r.name, level: String(r.level), color: r.color || "#5BA4CF", division: r.division || "", discordRoleId: r.discordRoleId || "" });
  };

  if (isLoading) {
    return <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="h-20 bg-white rounded-xl border border-gray-100 animate-pulse" />)}</div>;
  }

  const RankForm = () => (
    <div className="space-y-4 py-2">
      <div className="grid grid-cols-[1fr_100px] gap-3">
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1.5">Rank Name <span className="text-red-500">*</span></label>
          <Input placeholder="e.g. Sergeant" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1.5">Level <span className="text-red-500">*</span></label>
          <Input type="number" min="1" placeholder="1" value={form.level} onChange={e => setForm(f => ({ ...f, level: e.target.value }))} />
        </div>
      </div>
      <div className="grid grid-cols-[1fr_80px] gap-3">
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1.5">Division</label>
          <Input placeholder="e.g. Patrol, Command" value={form.division} onChange={e => setForm(f => ({ ...f, division: e.target.value }))} />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1.5">Color</label>
          <input type="color" value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} className="w-full h-10 rounded-lg border border-gray-200 cursor-pointer p-1" />
        </div>
      </div>
      <div>
        <label className="text-sm font-medium text-gray-700 block mb-1.5">Discord Role ID</label>
        <Input placeholder="Role ID to sync" value={form.discordRoleId} onChange={e => setForm(f => ({ ...f, discordRoleId: e.target.value }))} />
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ranks</h1>
          <p className="text-gray-500 text-sm mt-1">{(ranks as any[]).length} ranks configured</p>
        </div>
        <Button onClick={() => { setForm({ name: "", level: "", color: "#5BA4CF", division: "", discordRoleId: "" }); setAddOpen(true); }} className="gap-2">
          <Plus className="w-4 h-4" /> Add Rank
        </Button>
      </div>

      {(ranks as any[]).length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 py-20 text-center">
          <BadgeCent className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No ranks configured</p>
          <p className="text-gray-400 text-sm mt-1">Create ranks to organize your staff hierarchy</p>
          <Button className="mt-6" onClick={() => setAddOpen(true)}><Plus className="w-4 h-4 mr-2" /> Create First Rank</Button>
        </div>
      ) : (
        <div className="space-y-3">
          {(ranks as any[]).sort((a: any, b: any) => b.level - a.level).map((r: any) => (
            <div key={r.id} className="bg-white border border-gray-200 rounded-2xl px-6 py-4 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow group">
              <GripVertical className="w-4 h-4 text-gray-300" />
              <div className="w-4 h-4 rounded-full flex-shrink-0 shadow-sm ring-2 ring-white" style={{ backgroundColor: r.color || "#5BA4CF" }} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-gray-900">{r.name}</span>
                  <span className="text-xs bg-gray-100 text-gray-500 font-semibold px-2 py-0.5 rounded-full">Level {r.level}</span>
                  {r.division && <span className="text-xs bg-primary/10 text-primary font-semibold px-2 py-0.5 rounded-full">{r.division}</span>}
                </div>
                {r.discordRoleId && <p className="text-xs text-gray-400 mt-0.5">Role ID: {r.discordRoleId}</p>}
              </div>
              <div className="flex items-center gap-2 text-gray-400">
                <Users className="w-4 h-4" />
                <span className="text-sm font-medium">{r.staffCount}</span>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(r)}>
                  <Edit2 className="w-3.5 h-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:text-red-600 hover:bg-red-50" onClick={() => handleDelete(r.id)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Create Rank</DialogTitle></DialogHeader>
          <RankForm />
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!form.name || !form.level || createMutation.isPending}>
              {createMutation.isPending ? "Creating..." : "Create Rank"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editRank} onOpenChange={() => setEditRank(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Edit Rank</DialogTitle></DialogHeader>
          <RankForm />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditRank(null)}>Cancel</Button>
            <Button onClick={handleUpdate} disabled={!form.name || !form.level || updateMutation.isPending}>
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
