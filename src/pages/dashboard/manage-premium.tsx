import { useState, useEffect, useCallback } from "react";
  import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
  import { Badge } from "@/components/ui/badge";
  import { Button } from "@/components/ui/button";
  import { Star, RefreshCw, Clock, CheckCircle, Crown, Zap, Shield, Users, BarChart2, Bot, Megaphone, Calendar } from "lucide-react";

  const PREMIUM_FEATURES = [
    { icon: <BarChart2 size={18} />, name: "Advanced Analytics", description: "7-day trends, top performers, activity breakdown" },
    { icon: <Users size={18} />, name: "Unlimited Staff", description: "No cap on staff roster size (free: 25)" },
    { icon: <Star size={18} />, name: "Unlimited Ranks", description: "Create as many ranks as you need (free: 5)" },
    { icon: <Zap size={18} />, name: "Strike Automation", description: "Auto-demote or auto-kick on strike threshold" },
    { icon: <Bot size={18} />, name: "Custom Bot Branding", description: "Change bot name, avatar, and embed colors" },
    { icon: <Megaphone size={18} />, name: "Mass DM", description: "Send DMs to all active staff at once" },
    { icon: <Shield size={18} />, name: "50 Divisions", description: "Create up to 50 divisions (free: 5)" },
    { icon: <Calendar size={18} />, name: "Auto Shift Cards", description: "Automatically send shift cards on schedule" },
    { icon: <CheckCircle size={18} />, name: "Unlimited Custom Commands", description: "Unlimited bot commands (free: 5)" },
    { icon: <Crown size={18} />, name: "Handbook Role Visibility", description: "Restrict handbook articles by role" },
    { icon: <BarChart2 size={18} />, name: "90-Day Log Retention", description: "Keep activity logs for 90 days (free: 7)" },
    { icon: <Zap size={18} />, name: "Application Panels", description: "Unlimited application panels and questions" },
  ];

  function daysLeft(expiresAt: string | null): number | null {
    if (!expiresAt) return null;
    const diff = new Date(expiresAt).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }

  export default function ManagePremiumPage({ guildId }: { guildId: string }) {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const fetch_ = useCallback(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/guilds/${guildId}/premium`, { credentials: 'include' });
        if (res.ok) setData(await res.json());
      } catch {}
      setLoading(false);
    }, [guildId]);
    useEffect(() => { fetch_(); }, [fetch_]);

    const days = daysLeft(data?.expiresAt);
    const isPremium = data?.isPremium;

    return (
      <div className="space-y-6 max-w-3xl">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight flex items-center gap-2"><Crown className="w-6 h-6 text-amber-400" />Premium</h2>
            <p className="text-muted-foreground mt-0.5 text-sm">Manage your Zenith Premium subscription</p>
          </div>
          <Button variant="outline" size="sm" onClick={fetch_} className="gap-1.5"><RefreshCw size={13} />Refresh</Button>
        </div>

        {loading ? <div className="flex justify-center py-16"><div className="w-7 h-7 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#d4af37', borderTopColor: 'transparent' }} /></div> : (
          <>
            <Card className={`border-2 ${isPremium ? 'border-amber-300 bg-amber-50/40' : 'border-border'}`}>
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-xl ${isPremium ? 'bg-amber-100' : 'bg-muted'}`}>
                    <Crown size={24} className={isPremium ? 'text-amber-500' : 'text-muted-foreground'} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-lg">{isPremium ? 'Zenith Premium' : 'Free Tier'}</h3>
                      {isPremium && <Badge className="bg-amber-100 text-amber-700 border-amber-300 text-xs">Active</Badge>}
                    </div>
                    {isPremium ? (
                      <div className="mt-1 space-y-0.5">
                        {days !== null && (
                          <p className="text-sm flex items-center gap-1.5">
                            <Clock size={13} className={days <= 7 ? 'text-red-500' : 'text-muted-foreground'} />
                            <span className={days <= 7 ? 'text-red-600 font-medium' : 'text-muted-foreground'}>
                              {days === 0 ? 'Expires today!' : `${days} days remaining`}
                            </span>
                          </p>
                        )}
                        {data?.expiresAt && <p className="text-xs text-muted-foreground">Expires: {new Date(data.expiresAt).toLocaleDateString('en-US', { dateStyle: 'long' })}</p>}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground mt-0.5">Upgrade to unlock all premium features</p>
                    )}
                  </div>
                  {!isPremium && (
                    <a href="/premium" className="ml-auto px-4 py-2 rounded-lg text-sm font-semibold text-black" style={{ background: '#d4af37' }}>Upgrade Now</a>
                  )}
                </div>
              </CardContent>
            </Card>

            {isPremium && days !== null && days <= 7 && (
              <Card className="border-red-200 bg-red-50">
                <CardContent className="p-4 flex items-center gap-3">
                  <Clock size={18} className="text-red-500 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-sm text-red-800">Premium expiring soon!</p>
                    <p className="text-xs text-red-700 mt-0.5">Your premium expires in {days} day{days !== 1 ? 's' : ''}. Contact support to renew.</p>
                  </div>
                </CardContent>
              </Card>
            )}

            <div>
              <h3 className="font-bold text-base mb-3">{isPremium ? 'Your Premium Features' : 'What you get with Premium'}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {PREMIUM_FEATURES.map((f, i) => (
                  <div key={i} className={`flex items-start gap-3 p-3 rounded-lg border ${isPremium ? 'bg-amber-50/30 border-amber-200' : 'bg-muted/20 border-border'}`}>
                    <div className={`mt-0.5 flex-shrink-0 ${isPremium ? 'text-amber-500' : 'text-muted-foreground'}`}>{f.icon}</div>
                    <div>
                      <p className="font-medium text-sm">{f.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{f.description}</p>
                    </div>
                    {isPremium && <CheckCircle size={14} className="ml-auto mt-0.5 text-green-500 flex-shrink-0" />}
                  </div>
                ))}
              </div>
            </div>

            {!isPremium && (
              <div className="text-center py-4">
                <a href="/premium" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-black text-sm" style={{ background: 'linear-gradient(135deg, #d4af37, #f5cc5a)' }}>
                  <Crown size={16} />Upgrade to Premium
                </a>
                <p className="text-xs text-muted-foreground mt-2">Contact your administrator or visit the premium page</p>
              </div>
            )}
          </>
        )}
      </div>
    );
  }
  