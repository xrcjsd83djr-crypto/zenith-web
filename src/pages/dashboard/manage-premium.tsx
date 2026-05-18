import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Star, Zap, Shield, BarChart2, Clock, Layers, TrendingUp,
  CheckCircle, Crown, MessageSquare, Users, AlertTriangle,
  FileText, Award, Calendar, Sparkles, Lock
} from "lucide-react";

const SUPPORT = "https://discord.gg/UmDQqXPCfF";

const FREE_FEATURES = [
  { icon: <Users size={16} />, label: "Staff Roster (up to 25 members)" },
  { icon: <AlertTriangle size={16} />, label: "Strike tracking & warnings" },
  { icon: <Calendar size={16} />, label: "LOA requests" },
  { icon: <FileText size={16} />, label: "Standard applications" },
  { icon: <TrendingUp size={16} />, label: "Promotion / demotion history" },
  { icon: <Clock size={16} />, label: "Shift tracking (last 50 shifts)" },
  { icon: <Layers size={16} />, label: "Divisions (up to 3)" },
  { icon: <Star size={16} />, label: "Performance reviews (3/member)" },
  { icon: <Award size={16} />, label: "Commendations" },
  { icon: <FileText size={16} />, label: "Staff handbook" },
  { icon: <BarChart2 size={16} />, label: "Basic analytics" },
  { icon: <Users size={16} />, label: "Duty roster" },
  { icon: <MessageSquare size={16} />, label: "Staff notes" },
  { icon: <Calendar size={16} />, label: "Rank requests" },
  { icon: <Shield size={16} />, label: "Blacklist (up to 25 entries)" },
];

const PREMIUM_FEATURES = [
  { icon: <Users size={16} />, label: "Unlimited staff members", desc: "No cap — roster as large as your server needs" },
  { icon: <BarChart2 size={16} />, label: "Advanced analytics + 7-day trends", desc: "Staffing patterns, activity heatmaps, shift trends" },
  { icon: <Zap size={16} />, label: "Strike automation", desc: "Auto DM + remove roles when threshold is hit" },
  { icon: <Layers size={16} />, label: "Unlimited divisions", desc: "Traffic, CID, Patrol, SWAT — organize freely" },
  { icon: <TrendingUp size={16} />, label: "Unlimited performance reviews", desc: "Review every staff member as many times as needed" },
  { icon: <Shield size={16} />, label: "Unlimited blacklist entries", desc: "Never get capped on blacklisted players" },
  { icon: <Clock size={16} />, label: "Unlimited shift history", desc: "Full historical data — never purged" },
  { icon: <Sparkles size={16} />, label: "Custom bot commands", desc: "Create /commands unique to your server" },
  { icon: <Users size={16} />, label: "Mass DM all staff", desc: "One click — announce to every staff member" },
  { icon: <AlertTriangle size={16} />, label: "Inactivity scanner", desc: "Automatically flag inactive staff before they ghost" },
  { icon: <TrendingUp size={16} />, label: "Auto-promotion rules", desc: "Criteria-based auto promotions without manual review" },
  { icon: <Crown size={16} />, label: "Bot customization", desc: "Custom bot name, avatar, embed colors & footer" },
  { icon: <MessageSquare size={16} />, label: "Priority support", desc: "Direct access to Zenith team — fast responses" },
  { icon: <Shield size={16} />, label: "Audit log CSV export", desc: "Download full staff action history as spreadsheet" },
  { icon: <Calendar size={16} />, label: "Warning escalation rules", desc: "Auto-escalate warnings → strikes after threshold" },
];

export default function ManagePremiumPage({ guildId }: { guildId: string }) {
  const [isPremium, setIsPremium] = useState<boolean | null>(null);
  const [guild, setGuild] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`/api/guilds/${guildId}/premium`, { credentials: 'include' }).then(r => r.ok ? r.json() : null),
      fetch(`/api/guilds/${guildId}`, { credentials: 'include' }).then(r => r.ok ? r.json() : null),
    ]).then(([prem, g]) => {
      setIsPremium(prem?.isPremium || prem?.premium || false);
      setGuild(g);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [guildId]);

  if (loading) return (
    <div className="flex justify-center py-20">
      <div className="w-7 h-7 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#d4af37', borderTopColor: 'transparent' }} />
    </div>
  );

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-extrabold tracking-tight flex items-center gap-2">
          <Crown className="w-6 h-6" style={{ color: '#d4af37' }} />
          {isPremium ? 'Manage Premium' : 'Upgrade to Premium'}
        </h2>
        <p className="text-muted-foreground mt-0.5 text-sm">
          {isPremium
            ? 'Your server has Zenith Premium — all features unlocked.'
            : 'Get the most out of Zenith with Premium — built for serious ERLC staff teams.'}
        </p>
      </div>

      {/* Status banner */}
      {isPremium ? (
        <Card className="border-amber-200 shadow-sm overflow-hidden">
          <div className="h-1" style={{ background: 'linear-gradient(90deg,#d4af37,#ffd700)' }} />
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: 'linear-gradient(135deg,#d4af37,#ffd700)' }}>
              <Crown className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <p className="font-bold text-amber-800 text-lg">Premium Active ✓</p>
              <p className="text-amber-700 text-sm">{guild?.name} has all Premium features unlocked. Enjoy!</p>
            </div>
            <Badge className="bg-amber-100 text-amber-700 border-amber-200 font-bold text-sm px-3 py-1">PRO</Badge>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-amber-200 bg-amber-50 shadow-sm overflow-hidden">
          <div className="h-1" style={{ background: 'linear-gradient(90deg,#d4af37,#ffd700)' }} />
          <CardContent className="p-5">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 bg-amber-100">
                <Lock className="w-6 h-6 text-amber-600" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-amber-900 text-lg">You're on the Free Plan</p>
                <p className="text-amber-800 text-sm mt-1">
                  Unlock unlimited staff, advanced analytics, custom commands, inactivity scanning, mass DMs, auto-promotion rules, and much more — all built for growing ERLC departments.
                </p>
                <div className="mt-4 flex gap-3">
                  <a href={SUPPORT} target="_blank" rel="noreferrer">
                    <Button style={{ background: 'linear-gradient(135deg,#d4af37,#ffd700)', color: '#5a3e10', border: 'none' }} className="font-bold gap-2">
                      <Star size={15} /> Get Premium
                    </Button>
                  </a>
                  <Link href="/premium">
                    <Button variant="outline" className="gap-2">See all features</Button>
                  </Link>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Feature comparison */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Free */}
        <Card className="border-border bg-white shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Shield size={15} className="text-muted-foreground" /> Free Plan
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {FREE_FEATURES.map((f, i) => (
              <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                <CheckCircle size={12} className="text-green-500 flex-shrink-0" />
                {f.label}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Premium */}
        <Card className="border-amber-200 bg-amber-50/30 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Star size={15} style={{ color: '#d4af37' }} /> Premium Plan
              <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-[10px] ml-auto">PRO</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {PREMIUM_FEATURES.map((f, i) => (
              <div key={i} className="flex items-start gap-2">
                <div className={`flex-shrink-0 mt-0.5 ${isPremium ? 'text-amber-600' : 'text-muted-foreground'}`}>{f.icon}</div>
                <div>
                  <p className={`text-xs font-medium ${isPremium ? 'text-foreground' : 'text-muted-foreground'}`}>{f.label}</p>
                  <p className="text-[10px] text-muted-foreground">{f.desc}</p>
                </div>
                {isPremium && <CheckCircle size={12} className="text-green-500 flex-shrink-0 ml-auto mt-0.5" />}
                {!isPremium && <Lock size={10} className="text-muted-foreground flex-shrink-0 ml-auto mt-1" />}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* CTA for non-premium */}
      {!isPremium && (
        <Card className="border-border bg-white shadow-sm">
          <CardContent className="p-5 text-center">
            <Crown className="w-10 h-10 mx-auto mb-3" style={{ color: '#d4af37' }} />
            <h3 className="font-bold text-lg mb-1">Ready to unlock everything?</h3>
            <p className="text-sm text-muted-foreground mb-4">Join our Discord server and open a ticket to get Premium for your server. Our team sets it up fast.</p>
            <a href={SUPPORT} target="_blank" rel="noreferrer">
              <Button size="lg" style={{ background: 'linear-gradient(135deg,#d4af37,#ffd700)', color: '#5a3e10', border: 'none' }} className="font-bold gap-2 px-8">
                <Star size={16} /> Get Premium — Join Discord
              </Button>
            </a>
          </CardContent>
        </Card>
      )}

      {/* Premium user — quick links to premium features */}
      {isPremium && (
        <Card className="border-border bg-white shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Your Premium Features</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[
                { label: 'Analytics', path: `/dashboard/${guildId}/analytics`, icon: <BarChart2 size={14} /> },
                { label: 'Strike Automation', path: `/dashboard/${guildId}/automation`, icon: <Zap size={14} /> },
                { label: 'Custom Commands', path: `/dashboard/${guildId}/custom-commands`, icon: <Sparkles size={14} /> },
                { label: 'Inactivity Scan', path: `/dashboard/${guildId}/inactivity`, icon: <AlertTriangle size={14} /> },
                { label: 'Mass DM', path: `/dashboard/${guildId}/announcements`, icon: <MessageSquare size={14} /> },
                { label: 'Bot Customization', path: `/dashboard/${guildId}/bot-customization`, icon: <Crown size={14} /> },
              ].map(item => (
                <Link key={item.path} href={item.path}>
                  <div className="flex items-center gap-2 p-2.5 rounded-lg border border-amber-200 bg-amber-50/50 hover:bg-amber-100/60 transition-colors cursor-pointer text-xs font-medium text-amber-800">
                    <span style={{ color: '#d4af37' }}>{item.icon}</span>
                    {item.label}
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
