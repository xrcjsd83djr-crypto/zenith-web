import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function StrikesPage({ guildId }: { guildId: string }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Strikes</h2>
        <p className="text-gray-500 mt-1">Manage staff strikes and discipline</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Strikes</CardTitle>
          <CardDescription>Coming soon</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500">This section is under development</p>
        </CardContent>
      </Card>
    </div>
  );
}
