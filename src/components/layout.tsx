import { ReactNode, useState, useEffect } from "react";
  import { Link, useLocation } from "wouter";
  import { useAuth } from "@/lib/auth";
  import {
    LayoutDashboard, Users, Inbox, AlertTriangle,
    CalendarClock, ActivitySquare, BadgeCent,
    Settings, ChevronLeft, Star, BarChart2, LogOut,
  } from "lucide-react";
  import { Button } from "./ui/button";

  export interface Guild {
    id: string;
    name: string;
    icon?: string;
    iconUrl?: string;
    isPremium?: boolean;
  }

  export default function DashboardLayout({ guildId, children }: { guildId: string; children: ReactNode }) {
    const [location] = useLocation();
    const { user, logout } = useAuth();
    const [guild, setGuild] = useState<Guild | null>(null);
    const [guildLoading, setGuildLoading] = useState(true);

    useEffect(() => {
      if (!guildId) return;
      fetch(`/api/guilds/${guildId}`)
        .then(r => r.ok ? r.json() : null)
        .then(data => { if (data) setGuild(data); })
        .catch(() => {})
        .finally(() => setGuildLoading(false));
    }, [guildId]);

    const navItems = [
      { name: "Overview",     path: `/dashboard/${guildId}`,             icon: <LayoutDashboard className="w-4 h-4" /> },
      { name: "Staff Roster", path: `/dashboard/${guildId}/staff`,        icon: <Users className="w-4 h-4" /> },
      { name: "Applications", path: `/dashboard/${guildId}/applications`, icon: <Inbox className="w-4 h-4" /> },
      { name: "Strikes",      path: `/dashboard/${guildId}/strikes`,      icon: <AlertTriangle className="w-4 h-4" /> },
      { name: "LOA Requests", path: `/dashboard/${guildId}/loa`,          icon: <CalendarClock className="w-4 h-4" /> },
      { name: "Activity",     path: `/dashboard/${guildId}/activity`,     icon: <ActivitySquare className="w-4 h-4" /> },
      { name: "Statistics",   path: `/dashboard/${guildId}/stats`,        icon: <BarChart2 className="w-4 h-4" /> },
      { name: "Ranks",        path: `/dashboard/${guildId}/ranks`,        icon: <BadgeCent className="w-4 h-4" /> },
    ];

    if (guildLoading) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#d4af37', borderTopColor: 'transparent' }} />
        </div>
      );
    }

    if (!guild) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-background text-center px-4">
          <AlertTriangle className="w-12 h-12 text-muted-foreground mb-4" />
          <h2 className="text-xl font-bold mb-2">Server not found</h2>
          <p className="text-muted-foreground mb-6 text-sm">You may not have permission to view this server.</p>
          <Link href="/servers"><Button>Back to Servers</Button></Link>
        </div>
      );
    }

    const iconUrl = guild.iconUrl || (guild.icon ? `https://cdn.discordapp.com/icons/${guildId}/${guild.icon}.png` : null);

    const currentPageName =
      location === `/dashboard/${guildId}` ? "Overview" :
      navItems.find(i => i.path !== `/dashboard/${guildId}` && location.startsWith(i.path))?.name ||
      (location.includes("/config") ? "Configuration" : location.includes("/premium") ? "Premium" : "");

    return (
      <div className="min-h-screen bg-background flex">
        {/* Sidebar */}
        <aside className="w-60 bg-white flex-shrink-0 flex flex-col sticky top-0 h-screen overflow-y-auto shadow-sm"
          style={{ borderRight: '2px solid rgba(212,175,55,.35)' }}>

          {/* Logo row */}
          <div className="px-4 py-4 border-b border-border flex items-center gap-2.5">
            <Link href="/servers" className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0">
              <ChevronLeft className="w-4 h-4" />
            </Link>
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                style={{ background: 'linear-gradient(135deg,#d4af37,#ffd700)' }}>Z</div>
              <span className="font-bold text-sm tracking-tight" style={{ color: '#b8941f' }}>Zenith</span>
            </div>
          </div>

          {/* Server pill */}
          <div className="px-3 py-3 border-b border-border">
            <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-muted/40 border border-border">
              {iconUrl ? (
                <img src={iconUrl} alt={guild.name}
                  className="w-9 h-9 rounded-lg object-cover flex-shrink-0"
                  style={{ outline: '2px solid rgba(212,175,55,.3)' }} />
              ) : (
                <div className="w-9 h-9 rounded-lg flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg,#d4af37,#ffd700)' }}>
                  {guild.name.charAt(0)}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold truncate">{guild.name}</div>
                {guild.isPremium ? (
                  <div className="text-[10px] font-bold flex items-center gap-0.5 uppercase tracking-wider mt-0.5" style={{ color: '#d4af37' }}>
                    <Star className="w-2.5 h-2.5 fill-current" /> Pro
                  </div>
                ) : (
                  <div className="text-[10px] text-muted-foreground font-medium mt-0.5">Free Plan</div>
                )}
              </div>
            </div>
          </div>

          {/* Nav links */}
          <nav className="flex-1 px-3 py-3 space-y-0.5">
            {navItems.map((item) => {
              const isActive = location === item.path ||
                (item.path !== `/dashboard/${guildId}` && location.startsWith(item.path));
              return (
                <Link key={item.path} href={item.path}>
                  <div style={isActive ? {
                    color: '#b8941f',
                    background: 'rgba(212,175,55,.10)',
                    borderRight: '3px solid #d4af37',
                  } : {}}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-l-lg text-sm font-medium transition-all duration-150 ${
                      isActive ? 'font-semibold' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                    }`}>
                    {item.icon}
                    {item.name}
                  </div>
                </Link>
              );
            })}

            <div className="pt-2 mt-2 border-t border-border space-y-0.5">
              {[
                { name: "Configuration", path: `/dashboard/${guildId}/config`, icon: <Settings className="w-4 h-4" />, matchFn: (l: string) => l.includes("/config") },
                { name: "Premium", path: "/premium", icon: <Star className="w-4 h-4" />, matchFn: (l: string) => l === "/premium" },
              ].map(item => {
                const isActive = item.matchFn(location);
                return (
                  <Link key={item.path} href={item.path}>
                    <div style={isActive ? { color: '#b8941f', background: 'rgba(212,175,55,.10)', borderRight: '3px solid #d4af37' } : {}}
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-l-lg text-sm font-medium transition-all duration-150 ${
                        isActive ? 'font-semibold' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                      }`}>
                      {item.icon}
                      {item.name}
                    </div>
                  </Link>
                );
              })}
            </div>
          </nav>

          {/* User footer */}
          {user && (
            <div className="px-3 py-3 border-t border-border bg-muted/20">
              <div className="flex items-center gap-2.5">
                {(user as any).avatarUrl || (user as any).avatar ? (
                  <img
                    src={(user as any).avatarUrl || `https://cdn.discordapp.com/avatars/${(user as any).id}/${(user as any).avatar}.png`}
                    alt={user.username}
                    className="w-8 h-8 rounded-full flex-shrink-0"
                    style={{ outline: '2px solid rgba(212,175,55,.3)' }}
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 text-white"
                    style={{ background: 'linear-gradient(135deg,#d4af37,#ffd700)' }}>
                    {user.username?.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold truncate">{user.username}</div>
                  <button onClick={logout}
                    className="text-[11px] text-muted-foreground hover:text-destructive transition-colors flex items-center gap-1 mt-0.5">
                    <LogOut className="w-2.5 h-2.5" /> Log out
                  </button>
                </div>
              </div>
            </div>
          )}
        </aside>

        {/* Main content */}
        <main className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
          <header className="h-12 border-b border-border bg-white/80 backdrop-blur-sm flex items-center px-6 sticky top-0 z-10">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{guild.name}</span>
              <span className="opacity-40">/</span>
              <span className="font-semibold text-foreground">{currentPageName}</span>
            </div>
          </header>
          <div className="p-6 max-w-7xl mx-auto w-full">
            {children}
          </div>
        </main>
      </div>
    );
  }
  