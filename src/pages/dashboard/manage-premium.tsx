import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Crown, Star, CheckCircle, AlertCircle, RefreshCw, ExternalLink, Zap, Users, BarChart2, MessageSquare, Layers, Award, Clock, Infinity, Shield } from "lucide-react";

const PREMIUM_FEATURES = [
  { icon: <Users size={15} />, label: "Unlimited Staff Members", free: "Up to 25" },
  { icon: <Award size={15} />, label: "Unlimited Custom Ranks", free: "Up to 5" },
  { icon: <Layers size={15} />, label: "Up to 50 Divisions", free: "Up to 5" },
  { icon: <Zap size={15} />, label: "Strike Automation (auto-demote/kick)", free: "Manual only" },
  { icon: <MessageSquare size={15} />, label: "Mass DM All Staff", free: "Not available" },
  { icon: <Star size={15} />, label: "Unlimited Custom Commands", free: "Up to 5" },
  { icon: <Clock size={15} />, label: "Auto Shift Cards Delivery", free: "Manual send only" },
  { icon: <BarChart2 size={15} />, label: "90-Day Activity Log Retention", free: "7 days" },
  { icon: <Shield size={15} />, label: "Handbook Role Visibility Control", free: "Public only" },
  { icon: <Infinity size={15} />, label: "Unlimited Application Panels & Questions", free: "5 panels, 13 questions" },
  { icon: <Zap size={15} />, label: "Auto Inactivity Alerts & DMs", free: "View only" },
  { icon: <BarChart2 size={15} />, label: "Advanced Analytics & Reporting", free: "Basic stats" },
  { icon: <Star size={15} />, label: "Priority Support", free: "Community support" },
];

export default function ManagePremiumPage({ guildId }: { guildId: string }) {
  const [premium, setPremium] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchPremium = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/guilds/${guildId}/premium`, { credentials: 'include' });
      if (res.ok) setPremium(await res.json().catch(() => null));
    } catch {}
    setLoading(false);
  }, [guildId]);
  useEffect(() => { fetchPremium(); }, [fetchPremium]);

  const isPremium = !!premium?.isPremium;
  const expiresAt = premium?.expiresAt ? new Date(premium.expiresAt) : null;
  const daysLeft = expiresAt ? Math.max(0, Math.ceil((expiresAt.getTime() - Date.now()) / 86_400_000)) : null;
  const plan = premium?.plan || 'free';
  const grantedBy = premium?.grantedBy;
  const startedAt = premium?.startedAt ? new Date(premium.startedAt) : null;

  if (loading) return (
    <div className="flex justify-center py-20">
      <div className="w-7 h-7 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#d4af37', borderTopColor: 'transparent' }} />
    </div>
  );

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight flex items-center gap-2">
            <Crown className="w-6 h-6" style={{ color: '#d4af37' }} />Manage Premium
          </h2>
          <p className="text-muted-foreground mt-0.5 text-sm">View and manage your Zenith Premium subscription</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchPremium} className="gap-1.5"><RefreshCw size={13} />Refresh</Button>
      </div>

      {/* Status Card */}
      <Card className={isPremium ? 'border-amber-300 bg-amber-50/30' : 'border-border'}>
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${isPremium ? 'bg-amber-100' : 'bg-muted'}`}>
              <Crown size={24} className={isPremium ? 'text-amber-600' : 'text-muted-foreground'} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h3 className="text-lg font-bold">{isPremium ? 'Zenith Premium' : 'Free Plan'}</h3>
                {isPremium ? (
                  <Badge className="bg-amber-100 text-amber-700 border-amber-300 border gap-1">
                    <Star size={10} />Active
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-muted-foreground">Free Tier</Badge>
                )}
              </div>

              {isPremium ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">Plan</p>
                    <p className="text-sm font-semibold">{plan === 'premium' ? 'Zenith Premium' : plan.charAt(0).toUpperCase() + plan.slice(1)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">Status</p>
                    <p className="text-sm font-semibold text-green-700 flex items-center gap-1"><CheckCircle size={13} />Active</p>
                  </div>
                  {startedAt && (
                    <div>
                      <p className="text-xs text-muted-foreground font-medium">Started</p>
                      <p className="text-sm">{startedAt.toLocaleDateString()}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">Expires</p>
                    {expiresAt ? (
                      <p className={`text-sm font-semibold ${daysLeft !== null && daysLeft <= 7 ? 'text-red-600' : 'text-foreground'}`}>
                        {expiresAt.toLocaleDateString()} ({daysLeft} day{daysLeft !== 1 ? 's' : ''} left)
                      </p>
                    ) : (
                      <p className="text-sm font-semibold text-green-700">Never (Lifetime)</p>
                    )}
                  </div>
                  {grantedBy && (
                    <div>
                      <p className="text-xs text-muted-foreground font-medium">Granted By</p>
                      <p className="text-sm">{grantedBy}</p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground mt-1">You're on the free plan. Upgrade to unlock the full power of Zenith.</p>
              )}

              {isPremium && daysLeft !== null && daysLeft <= 7 && (
                <div className="mt-3 flex items-center gap-2 p-2.5 rounded-lg bg-red-50 border border-red-200">
                  <AlertCircle size={14} className="text-red-600 flex-shrink-0" />
                  <p className="text-xs text-red-700">Premium expires in <strong>{daysLeft} day{daysLeft !== 1 ? 's' : ''}</strong>. Contact support to renew.</p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {!isPremium && (
        <Card className="border-amber-200">
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-4">
              <Star className="text-amber-500 flex-shrink-0" size={20} />
              <div>
                <p className="font-bold">Ready to upgrade?</p>
                <p className="text-xs text-muted-foreground mt-0.5">Get the most out of Zenith with a Premium subscription</p>
              </div>
            </div>
            <Button className="gap-1.5" style={{ background: '#d4af37', color: '#000' }} onClick={() => window.open('/premium', '_blank')}>
              <ExternalLink size={14} />View Premium Plans
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Features Comparison */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Zap size={16} className="text-amber-500" />Features Comparison
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Feature</th>
                  <th className="text-center px-4 py-2.5 text-xs font-semibold text-muted-foreground">Free</th>
                  <th className="text-center px-4 py-2.5 text-xs font-semibold" style={{ color: '#d4af37' }}>Premium</th>
                </tr>
              </thead>
              <tbody>
                {PREMIUM_FEATURES.map((f, i) => (
                  <tr key={i} className={`border-b border-border last:border-0 ${isPremium ? 'bg-amber-50/20' : ''}`}>
                    <td className="px-4 py-2.5 flex items-center gap-2">
                      <span className="text-muted-foreground">{f.icon}</span>
                      <span>{f.label}</span>
                    </td>
                    <td className="px-4 py-2.5 text-center text-xs text-muted-foreground">{f.free}</td>
                    <td className="px-4 py-2.5 text-center">
                      <CheckCircle size={14} className="mx-auto" style={{ color: '#d4af37' }} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground text-center">
        Need help? Contact our support team or use <code className="bg-muted px-1 py-0.5 rounded">/premium</code> in Discord.
      </p>
    </div>
  );
}
