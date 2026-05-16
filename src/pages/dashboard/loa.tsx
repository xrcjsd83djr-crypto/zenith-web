import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function LoaPage({ guildId }: { guildId: string }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Leave of Absence</h2>
        <p className="text-gray-500 mt-1">Manage staff LOA requests</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>LOA Requests</CardTitle>
          <CardDescription>Coming soon</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500">This section is under development</p>
        </CardContent>
      </Card>
    </div>
  );
}
