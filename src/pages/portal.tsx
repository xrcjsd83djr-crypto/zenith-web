import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ShieldAlert, Inbox, CheckCircle, XCircle } from "lucide-react";
import { useAuth } from "@/lib/auth";

export default function ApplicationPortal({ apak }: { apak: string }) {
  const { user, isLoading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [guild, setGuild] = useState<any>(null);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      window.location.href = "/login?redirect=" + encodeURIComponent(window.location.pathname);
      return;
    }

    const checkAccess = async () => {
      try {
        const res = await fetch(`/api/portal/${apak}/access`);
        if (res.ok) {
          const data = await res.json();
          setAuthorized(true);
          setGuild(data.guild);
          fetchSubmissions();
        } else {
          const data = await res.json();
          setError(data.error || "You do not have access to this portal.");
        }
      } catch (e) {
        setError("Failed to verify access.");
      }
      setLoading(false);
    };

    const fetchSubmissions = async () => {
      try {
        const res = await fetch(`/api/portal/${apak}/submissions`);
        if (res.ok) {
          const data = await res.json();
          setSubmissions(data);
        }
      } catch (e) {
        console.error("Failed to fetch submissions");
      }
    };

    checkAccess();
  }, [apak, user, authLoading]);

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#d4af37]" />
      </div>
    );
  }

  if (!authorized) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 text-center">
        <ShieldAlert className="w-16 h-16 text-red-500 mb-4" />
        <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
        <p className="text-muted-foreground max-w-md">{error}</p>
        <Button className="mt-6" onClick={() => window.location.href = "/servers"}>Back to Dashboard</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-8">
      <div className="max-w-5xl mx-auto">
        <header className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-3">
              <Inbox className="w-8 h-8 text-[#d4af37]" />
              Application Review Portal
            </h1>
            <p className="text-muted-foreground mt-1">
              Reviewing applications for <span className="font-bold text-foreground">{guild?.name}</span>
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-bold">{user?.username}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Reviewer</p>
            </div>
            {user?.avatarUrl && <img src={user.avatarUrl} className="w-10 h-10 rounded-full border-2 border-[#d4af37]" />}
          </div>
        </header>

        <div className="grid gap-6">
          {submissions.length === 0 ? (
            <Card className="border-border bg-white text-center py-12">
              <CardContent>
                <Inbox className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-20" />
                <p className="text-muted-foreground">No pending applications to review.</p>
              </CardContent>
            </Card>
          ) : (
            submissions.map((sub) => (
              <Card key={sub.id} className="border-border bg-white overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="bg-muted/30 pb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg font-bold">{sub.username}</CardTitle>
                      <CardDescription>Submitted {new Date(sub.created_at).toLocaleString()}</CardDescription>
                    </div>
                    <Badge variant="outline" className="bg-yellow-100 text-yellow-700 border-yellow-200 uppercase text-[10px] font-bold">
                      {sub.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  <div className="grid gap-4">
                    {sub.answers.map((ans: any, i: number) => (
                      <div key={i} className="space-y-1">
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-tight">{ans.question}</p>
                        <p className="text-sm bg-gray-50 p-3 rounded-lg border border-border">{ans.answer}</p>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center gap-3 pt-4 border-t border-border">
                    <Button variant="outline" className="flex-1 gap-2 text-red-600 hover:bg-red-50 hover:text-red-700 border-red-200">
                      <XCircle size={16} /> Reject
                    </Button>
                    <Button className="flex-1 gap-2 bg-green-600 hover:bg-green-700 text-white border-none">
                      <CheckCircle size={16} /> Accept
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
