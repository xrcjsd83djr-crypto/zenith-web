import { useState } from "react";
import { useListStaff, useAddStaff, useUpdateStaffMember, useRemoveStaff, useListRanks } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, UserPlus, Search, Trash2, Shield, MoreHorizontal, Edit2, AlertTriangle } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";

interface StaffPageProps { guildId: string; }

const STATUS_COLORS: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700 border-emerald-200",
  inactive: "bg-gray-100 text-gray-600 border-gray-200",
  suspended: "bg-red-100 text-red-700 border-red-200",
  loa: "bg-amber-100 text-amber-700 border-amber-200",
};

export default function StaffPage({ guildId }: StaffPageProps) {
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [editMember, setEditMember] = useState<any>(null);
  const [newUserId, setNewUserId] = useState("");
  const [newRankId, setNewRankId] = useState<string>("");
  const [newDivision, setNewDivision] = useState("");
  const { toast } = useToast();

  const { data: staff = [], isLoading, refetch } = useListStaff(guildId);
  const { data: ranks = [] } = useListRanks(guildId);
  const createMutation = useAddStaff();
  const updateMutation = useUpdateStaffMember();
  const deleteMutation = useRemoveStaff();

  const filtered = (staff as any[]).filter((m: any) =>
    m.username?.toLowerCase().includes(search.toLowerCase()) ||
    m.rankName?.toLowerCase().includes(search.toLowerCase()) ||
    m.division?.toLowerCase().includes(search.toLowerCase())
  );

  const handleAdd = async () => {
    if (!newUserId) return;
    try {
      await createMutation.mutateAsync({ guildId, data: {
        userId: newUserId,
        rankId: newRankId ? parseInt(newRankId) : undefined,
        division: newDivision || undefined,
      }});
      toast({ title: "Staff member added successfully" });
      setAddOpen(false);
      setNewUserId(""); setNewRankId(""); setNewDivision("");
      refetch();
    } catch {
      toast({ title: "Failed to add staff member", variant: "destructive" });
    }
  };

  const handleUpdate = async (userId: string, update: any) => {
    try {
      await updateMutation.mutateAsync({ guildId, userId, data: update });
      toast({ title: "Staff member updated" });
      setEditMember(null);
      refetch();
    } catch {
      toast({ title: "Failed to update", variant: "destructive" });
    }
  };

  const handleDelete = async (userId: string) => {
    try {
      await deleteMutation.mutateAsync({ guildId, userId });
      toast({ title: "Staff member removed" });
      refetch();
    } catch {
      toast({ title: "Failed to remove", variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1,2,3,4,5].map(i => (
          <div key={i} className="h-16 bg-white rounded-xl border border-gray-100 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Staff Roster</h1>
          <p className="text-gray-500 text-sm mt-1">{(staff as any[]).length} total members</p>
        </div>
        <Button onClick={() => setAddOpen(true)} className="gap-2">
          <UserPlus className="w-4 h-4" /> Add Member
        </Button>
      </div>

      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <Input placeholder="Search staff..." className="pl-9 bg-white" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="grid grid-cols-[1fr_1fr_1fr_100px_80px] px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-100 bg-gray-50/50">
          <span>Member</span><span>Rank</span><span>Division</span><span>Status</span><span></span>
        </div>
        {filtered.length === 0 ? (
          <div className="py-20 text-center">
            <Users className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No staff members found</p>
            <p className="text-gray-400 text-sm mt-1">Add your first staff member to get started</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filtered.map((m: any) => (
              <div key={m.id} className="grid grid-cols-[1fr_1fr_1fr_100px_80px] px-6 py-4 items-center hover:bg-gray-50/60 transition-colors group">
                <div className="flex items-center gap-3">
                  {m.avatar ? (
                    <img src={`https://cdn.discordapp.com/avatars/${m.userId}/${m.avatar}.webp?size=64`} alt={m.username} className="w-9 h-9 rounded-full ring-2 ring-white shadow-sm" />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold shadow-sm">
                      {m.username.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <div className="font-semibold text-gray-900 text-sm">{m.displayName || m.username}</div>
                    {m.strikeCount > 0 && (
                      <div className="flex items-center gap-1 text-xs text-red-500 font-medium">
                        <AlertTriangle className="w-3 h-3" /> {m.strikeCount} strike{m.strikeCount !== 1 ? "s" : ""}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-primary/60" />
                  <span className="text-sm font-medium text-gray-700">{m.rankName || <span className="text-gray-400 italic">No rank</span>}</span>
                </div>
                <span className="text-sm text-gray-600">{m.division || <span className="text-gray-300">—</span>}</span>
                <Badge className={`text-xs border w-fit ${STATUS_COLORS[m.status] || STATUS_COLORS.active}`} variant="outline">
                  {m.status}
                </Badge>
                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40">
                      <DropdownMenuItem onClick={() => setEditMember(m)} className="gap-2">
                        <Edit2 className="w-3.5 h-3.5" /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDelete(m.userId)} className="gap-2 text-red-600 focus:text-red-600">
                        <Trash2 className="w-3.5 h-3.5" /> Remove
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Staff Member</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1.5">Discord User ID</label>
              <Input placeholder="123456789012345678" value={newUserId} onChange={e => setNewUserId(e.target.value)} />
              <p className="text-xs text-gray-400 mt-1">Right-click a user in Discord → Copy User ID</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1.5">Rank</label>
              <Select value={newRankId} onValueChange={setNewRankId}>
                <SelectTrigger><SelectValue placeholder="Select rank..." /></SelectTrigger>
                <SelectContent>
                  {(ranks as any[]).map((r: any) => (
                    <SelectItem key={r.id} value={String(r.id)}>{r.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1.5">Division</label>
              <Input placeholder="e.g. Patrol, HR, Command" value={newDivision} onChange={e => setNewDivision(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={!newUserId || createMutation.isPending}>
              {createMutation.isPending ? "Adding..." : "Add Member"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      {editMember && (
        <Dialog open={!!editMember} onOpenChange={() => setEditMember(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Edit {editMember.username}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1.5">Rank</label>
                <Select defaultValue={String(editMember.rankId || "")} onValueChange={v => setEditMember({ ...editMember, rankId: v ? parseInt(v) : null })}>
                  <SelectTrigger><SelectValue placeholder="Select rank..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No rank</SelectItem>
                    {(ranks as any[]).map((r: any) => (
                      <SelectItem key={r.id} value={String(r.id)}>{r.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1.5">Status</label>
                <Select defaultValue={editMember.status} onValueChange={v => setEditMember({ ...editMember, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["active","inactive","suspended","loa"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1.5">Division</label>
                <Input defaultValue={editMember.division || ""} onChange={e => setEditMember({ ...editMember, division: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditMember(null)}>Cancel</Button>
              <Button onClick={() => handleUpdate(editMember.userId, { rankId: editMember.rankId, status: editMember.status, division: editMember.division })} disabled={updateMutation.isPending}>
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
