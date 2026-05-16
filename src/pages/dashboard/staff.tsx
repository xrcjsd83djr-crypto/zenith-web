import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface StaffMember {
  id: string;
  userId: string;
  username: string;
  displayName: string;
  avatar: string;
  rank: string;
  division: string;
  status: "active" | "inactive" | "on_leave";
  joinedAt: string;
  strikes: number;
  loaStatus: string;
}

interface ServerRole {
  id: string;
  name: string;
  color: number;
}

export default function StaffPage({ guildId }: { guildId: string }) {
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [selectedMember, setSelectedMember] = useState<StaffMember | null>(null);
  const [serverRoles, setServerRoles] = useState<ServerRole[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showRoleSelection, setShowRoleSelection] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        // Fetch server roles
        const rolesRes = await fetch(`/api/guild/${guildId}/roles`);
        if (rolesRes.ok) {
          const roles = await rolesRes.json();
          setServerRoles(roles);
        }
      } catch (error) {
        console.error("Failed to fetch data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [guildId]);

  const handleRoleSelect = (roleId: string) => {
    setSelectedRoles((prev) =>
      prev.includes(roleId) ? prev.filter((r) => r !== roleId) : [...prev, roleId]
    );
  };

  const handleSaveRoles = async () => {
    try {
      const res = await fetch(`/api/guild/${guildId}/staff/roles`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roles: selectedRoles }),
      });

      if (res.ok) {
        const staff = await res.json();
        setStaffMembers(staff);
        setShowRoleSelection(false);
      }
    } catch (error) {
      console.error("Failed to save roles:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-pulse text-center">
          <div className="w-12 h-12 bg-gray-200 rounded-lg mx-auto mb-4" />
          <p className="text-gray-500">Loading staff data...</p>
        </div>
      </div>
    );
  }

  if (showRoleSelection) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Select Staff Roles</h2>
          <p className="text-gray-500 mt-1">
            Choose which roles should be considered as staff roles. Staff members with these roles will appear in the overview.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Server Roles</CardTitle>
            <CardDescription>Select one or more roles</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {serverRoles.map((role) => (
                <div
                  key={role.id}
                  className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                  onClick={() => handleRoleSelect(role.id)}
                >
                  <input
                    type="checkbox"
                    checked={selectedRoles.includes(role.id)}
                    onChange={() => handleRoleSelect(role.id)}
                    className="w-4 h-4 rounded"
                  />
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: `#${role.color.toString(16).padStart(6, "0")}` }}
                  />
                  <span className="font-medium text-sm">{role.name}</span>
                </div>
              ))}
            </div>

            <div className="flex gap-3 pt-4">
              <Button onClick={handleSaveRoles} disabled={selectedRoles.length === 0}>
                Save & Load Staff
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Staff Overview</h2>
        <p className="text-gray-500 mt-1">
          Manage your staff team members and their details
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Staff List */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Staff Members</CardTitle>
              <CardDescription>{staffMembers.length} members</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {staffMembers.map((member) => (
                <div
                  key={member.id}
                  onClick={() => setSelectedMember(member)}
                  className={`p-3 rounded-lg cursor-pointer transition-colors ${
                    selectedMember?.id === member.id
                      ? "bg-blue-50 border-2 border-blue-500"
                      : "hover:bg-gray-50 border border-gray-200"
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={member.avatar} />
                      <AvatarFallback>{member.username.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{member.displayName}</p>
                      <p className="text-xs text-gray-500 truncate">@{member.username}</p>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Member Details */}
        <div className="lg:col-span-2">
          {selectedMember ? (
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-4">
                    <Avatar className="h-16 w-16">
                      <AvatarImage src={selectedMember.avatar} />
                      <AvatarFallback>{selectedMember.username.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle>{selectedMember.displayName}</CardTitle>
                      <CardDescription>@{selectedMember.username}</CardDescription>
                    </div>
                  </div>
                  <Badge
                    variant={
                      selectedMember.status === "active"
                        ? "default"
                        : selectedMember.status === "on_leave"
                          ? "secondary"
                          : "outline"
                    }
                  >
                    {selectedMember.status.replace("_", " ")}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <Tabs defaultValue="info" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="info">Info</TabsTrigger>
                    <TabsTrigger value="discipline">Discipline</TabsTrigger>
                    <TabsTrigger value="activity">Activity</TabsTrigger>
                  </TabsList>

                  <TabsContent value="info" className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-500">Rank</p>
                        <p className="font-medium">{selectedMember.rank || "No rank"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Division</p>
                        <p className="font-medium">{selectedMember.division || "None"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Joined</p>
                        <p className="font-medium">
                          {new Date(selectedMember.joinedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">LOA Status</p>
                        <p className="font-medium">{selectedMember.loaStatus || "Active"}</p>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="discipline" className="space-y-4">
                    <div>
                      <p className="text-sm text-gray-500 mb-2">Active Strikes</p>
                      <Badge variant="destructive">{selectedMember.strikes}</Badge>
                    </div>
                  </TabsContent>

                  <TabsContent value="activity" className="space-y-4">
                    <p className="text-sm text-gray-500">Activity tracking coming soon</p>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          ) : (
            <Card className="flex items-center justify-center h-96">
              <div className="text-center">
                <p className="text-gray-500">Select a staff member to view details</p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
