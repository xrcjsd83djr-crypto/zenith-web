import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function ApplicationsPage({ guildId }: { guildId: string }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Applications</h2>
        <p className="text-gray-500 mt-1">Manage staff applications</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Applications</CardTitle>
          <CardDescription>Coming soon</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500">This section is under development</p>
        </CardContent>
      </Card>
    </div>
  );
}
