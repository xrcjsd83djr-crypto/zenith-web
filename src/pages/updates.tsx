import { Badge } from "@/components/ui/badge";
  import { Card, CardContent } from "@/components/ui/card";
  import { Zap, Shield, Layout, Star, Bug, Sparkles, ArrowUpRight } from "lucide-react";

  interface UpdateEntry {
    version: string; date: string; type: "major" | "feature" | "fix" | "improvement";
    title: string; items: string[];
  }

  const UPDATES: UpdateEntry[] = [
    {
      version: "2.6.0", date: "June 7, 2026", type: "major",
      title: "Application Hubs + Full Portal Redesign",
      items: [
        "New Application Hubs — post one Discord embed with link buttons to every panel you choose, fully customizable title, description, color, and footer",
        "Apply page now shows a full pre-application intro screen: who you're signing in as, how many questions, and what to expect before the form starts",
        "Guests (not logged in) see a polished sign-in screen before any form is shown — auth wall is now unmissable",
        "Added 'Switch account' link on the intro screen so applicants can change Discord account before applying",
        "Multiple-choice options now save correctly — all choices persist through edits and reloads",
        "Reviewer columns (notes, ID, username) now auto-migrate on server start — Accept/Reject no longer errors",
        "Applications panel now shows a live 'account age warning' badge for Discord accounts under 30 days old",
      ],
    },
    {
      version: "2.5.0", date: "June 7, 2026", type: "major",
      title: "Applications Complete Overhaul",
      items: [
        "Panel-first navigation — home screen is a grid of panels, each showing pending count badge, acceptance rate, and oldest-pending warning",
        "Click any panel to drill into its submissions; click any submission to view the full Q&A detail",
        "Every answer now shows the question text above it — no more guessing which answer is which",
        "Application timeline shows Submitted → Awaiting Review → Decision with dates and reviewer name",
        "Discord profile card fetched live on demand: account age, join date, color-coded roles, booster status",
        "Flag for Further Review — new intermediate status to hold applications before committing",
        "Copy Q&A button formats the full application as Discord-ready text for pasting to review channels",
        "Review errors are shown visibly at the top of the page instead of silently failing",
      ],
    },
    {
      version: "2.4.0", date: "June 6, 2026", type: "feature",
      title: "Public Application Portal",
      items: [
        "Public portal URL for each panel — shareable link, no login required to view",
        "Auth wall and server membership check before allowing submission",
        "Discord DM notification sent to applicant and reviewer channel on submit",
        "Duplicate application guard — prevents re-applying to the same panel while pending",
      ],
    },
    {
      version: "2.3.0", date: "June 5, 2026", type: "feature",
      title: "Application Panels System",
      items: [
        "Create unlimited application panels per server (1 on free tier)",
        "Short answer, paragraph, and multiple-choice question types",
        "Per-panel review role and review channel configuration",
        "Panel active/inactive toggle",
        "Accept, Reject, and Flag actions with optional notes sent via Discord DM",
      ],
    },
    {
      version: "2.2.0", date: "June 4, 2026", type: "improvement",
      title: "Dashboard Improvements",
      items: [
        "Account Settings with Profile, Notifications, and Danger Zone tabs",
        "Status page showing live bot and API uptime",
        "Updates/changelog page (you're reading it)",
        "Nav links to Status and Updates from the landing page",
      ],
    },
    {
      version: "2.1.0", date: "June 3, 2026", type: "feature",
      title: "Staff Management Suite",
      items: [
        "Performance reviews with ratings, strengths, and improvement notes",
        "Strike system with severity levels and automatic expiry",
        "Warning tracker with audit log",
        "Inactivity notices with return-date tracking",
        "Blacklist with reason and evidence fields",
      ],
    },
    {
      version: "2.0.0", date: "June 2, 2026", type: "major",
      title: "Zenith Dashboard Launch",
      items: [
        "Full web dashboard for managing your Discord server",
        "Discord OAuth login — sign in with your Discord account",
        "Staff Roster with role management",
        "Directory for member lookups",
        "Announcement builder with Discord embed preview",
        "Rank Requests and Rank management system",
      ],
    },
  ];

  const typeConfig: Record<string, { label: string; color: string; icon: any }> = {
    major: { label: "Major", color: "bg-yellow-100 text-yellow-800 border-yellow-200", icon: Sparkles },
    feature: { label: "Feature", color: "bg-blue-100 text-blue-800 border-blue-200", icon: Star },
    improvement: { label: "Improvement", color: "bg-purple-100 text-purple-800 border-purple-200", icon: Zap },
    fix: { label: "Bug Fix", color: "bg-red-100 text-red-800 border-red-200", icon: Bug },
  };

  export default function UpdatesPage() {
    return (
      <div className="space-y-6 max-w-2xl">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight flex items-center gap-2">
            <Sparkles className="w-6 h-6" style={{ color: "#d4af37" }} />
            Updates & Changelog
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">Everything that's been shipped to Zenith.</p>
        </div>

        <div className="relative space-y-4 pl-6 before:absolute before:left-[7px] before:top-2 before:bottom-0 before:w-px before:bg-border">
          {UPDATES.map((u, i) => {
            const cfg = typeConfig[u.type];
            const Icon = cfg.icon;
            return (
              <div key={u.version} className="relative">
                <div className="absolute -left-[25px] top-1 w-4 h-4 rounded-full border-2 flex items-center justify-center"
                  style={{ borderColor: "#d4af37", background: i === 0 ? "#d4af37" : "var(--background)" }}>
                  {i === 0 && <div className="w-1.5 h-1.5 rounded-full bg-black" />}
                </div>
                <Card className={i === 0 ? "ring-1 ring-[#d4af37]/30" : ""}>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-black text-sm">v{u.version}</span>
                          <Badge className={`text-[10px] border ${cfg.color} flex items-center gap-0.5`}>
                            <Icon className="w-2.5 h-2.5" /> {cfg.label}
                          </Badge>
                          {i === 0 && <Badge className="text-[10px] bg-green-100 text-green-700 border-green-200 border">Latest</Badge>}
                        </div>
                        <h3 className="font-bold">{u.title}</h3>
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">{u.date}</span>
                    </div>
                    <ul className="space-y-1.5">
                      {u.items.map((item, j) => (
                        <li key={j} className="flex items-start gap-2 text-sm text-muted-foreground">
                          <span className="mt-1.5 w-1 h-1 rounded-full bg-muted-foreground/50 flex-shrink-0" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </div>
            );
          })}
        </div>
      </div>
    );
  }