import { ReactNode, useState, useEffect } from "react";
  import { Link, useLocation } from "wouter";
  import { useAuth } from "@/lib/auth";
  import { useIsMobile } from "@/hooks/use-mobile";
  import {
    LayoutDashboard, Users, Inbox, AlertTriangle,
    CalendarClock, ActivitySquare, BadgeCent,
    Settings, Settings2, Star, BarChart2, LogOut, Menu, X,
    AlertOctagon, ShieldBan, ChevronLeft,
  } from "lucide-react";
  import { Button } from "./ui/button";

  export interface Guild {
    id: string; name: string; icon?: string; iconUrl?: string; isPremium?: boolean;
  }

  export default function DashboardLayout({ guildId, children }: { guildId: string; children: ReactNode }) {
    const [location] = useLocation();
    const { user, logout } = useAuth();
    const [guild, setGuild] = useState<Guild | null>(null);
    const [guildLoading, setGuildLoading] = useState(true);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const isMobile = useIsMobile();

    useEffect(() => {
      if (!guildId) return;
      fetch(`/api/guilds/${guildId}`)
        .then(r => r.ok ? r.json() : null)
        .then(data => { if (data) setGuild(data); })
        .catch(() => {})
        .finally(() => setGuildLoading(false));
    }, [guildId]);

    // Close sidebar on navigation
    useEffect(() => { setSidebarOpen(false); }, [location]);

    const navItems = [
      { name: "Overview",     path: `/dashboard/${guildId}`,             icon: <LayoutDashboard className="w-4 h-4" />, exact: true },
      { name: "Staff Roster", path: `/dashboard/${guildId}/staff`,        icon: <Users className="w-4 h-4" /> },
      { name: "Applications", path: `/dashboard/${guildId}/applications`, icon: <Inbox className="w-4 h-4" /> },
      { name: "Strikes",      path: `/dashboard/${guildId}/strikes`,      icon: <AlertTriangle className="w-4 h-4" /> },
      { name: "Warnings",     path: `/dashboard/${guildId}/warnings`,     icon: <AlertOctagon className="w-4 h-4" /> },
      { name: "LOA Requests", path: `/dashboard/${guildId}/loa`,          icon: <CalendarClock className="w-4 h-4" /> },
      { name: "Activity",     path: `/dashboard/${guildId}/activity`,     icon: <ActivitySquare className="w-4 h-4" /> },
      { name: "Statistics",   path: `/dashboard/${guildId}/stats`,        icon: <BarChart2 className="w-4 h-4" /> },
      { name: "Ranks",        path: `/dashboard/${guildId}/ranks`,        icon: <BadgeCent className="w-4 h-4" /> },
      { name: "Blacklist",    path: `/dashboard/${guildId}/blacklist`,    icon: <ShieldBan className="w-4 h-4" /> },
      { name: "Bot Customization", path: `/dashboard/${guildId}/bot-customization`, icon: <Settings2 className="w-4 h-4" /> },
    ];

    const bottomItems = [
      { name: "Configuration", path: `/dashboard/${guildId}/config`, matchFn: (l: string) => l.includes("/config"), icon: <Settings className="w-4 h-4" /> },
      { name: "Premium",       path: "/premium", matchFn: (l: string) => l === "/premium", icon: <Star className="w-4 h-4" /> },
    ];

    const checkActive = (item: { path: string; exact?: boolean }) =>
      item.exact ? location === item.path : location === item.path || (item.path !== `/dashboard/${guildId}` && location.startsWith(item.path));

    const iconUrl = guild?.iconUrl || (guild?.icon ? `https://cdn.discordapp.com/icons/${guildId}/${guild.icon}.png` : null);

    if (guildLoading) return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#d4af37', borderTopColor: 'transparent' }} />
      </div>
    );

    if (!guild) return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background text-center px-4">
        <AlertTriangle className="w-12 h-12 text-muted-foreground mb-4" />
        <h2 className="text-xl font-bold mb-2">Server not found</h2>
        <p className="text-muted-foreground mb-6 text-sm">You may not have permission to view this server.</p>
        <Link href="/servers"><Button>Back to Servers</Button></Link>
      </div>
    );

    const NavLink = ({ item, isActive }: { item: any; isActive: boolean }) => (
      <Link href={item.path}>
        <div
          style={isActive ? { color: '#b8941f', background: 'rgba(212,175,55,.10)', borderRight: '3px solid #d4af37' } : {}}
          className={`flex items-center gap-2.5 px-3 py-2.5 rounded-l-lg text-sm font-medium transition-all duration-150 ${
            isActive ? 'font-semibold' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
          }`}
        >
          {item.icon}{item.name}
        </div>
      </Link>
    );

    const SidebarInner = () => (
      <>
        {/* Logo row */}
        <div className="px-4 py-4 border-b border-border flex items-center gap-2.5 flex-shrink-0">
          <Link href="/servers" className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0">
            <ChevronLeft className="w-4 h-4" />
          </Link>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
              style={{ background: 'linear-gradient(135deg,#d4af37,#ffd700)' }}>Z</div>
            <span className="font-bold text-sm tracking-tight" style={{ color: '#b8941f' }}>Zenith</span>
          </div>
          {isMobile && (
            <button onClick={() => setSidebarOpen(false)} className="text-muted-foreground hover:text-foreground transition-colors">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Server pill */}
        <div className="px-3 py-3 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-muted/40 border border-border">
            {iconUrl ? (
              <img src={iconUrl} alt={guild.name} className="w-8 h-8 rounded-lg object-cover flex-shrink-0" style={{ outline: '2px solid rgba(212,175,55,.3)' }} />
            ) : (
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                style={{ background: 'linear-gradient(135deg,#d4af37,#ffd700)' }}>{guild.name.charAt(0)}</div>
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
        <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
          {navItems.map(item => <NavLink key={item.path} item={item} isActive={checkActive(item)} />)}
          <div className="pt-2 mt-2 border-t border-border space-y-0.5">
            {bottomItems.map(item => (
              <NavLink key={item.path} item={item} isActive={item.matchFn(location)} />
            ))}
          </div>
        </nav>

        {/* User footer */}
        <div className="px-3 py-3 border-t border-border flex-shrink-0">
          <div className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-muted/50 transition-colors group">
            {user?.avatarUrl ? (
              <img src={user.avatarUrl} alt={user?.username} className="w-7 h-7 rounded-full object-cover flex-shrink-0" />
            ) : (
              <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs font-bold flex-shrink-0">
                {user?.username?.charAt(0) || '?'}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold truncate">{user?.username}</div>
              <div className="text-[10px] text-muted-foreground">Logged in</div>
            </div>
            <button onClick={logout} className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-red-500" title="Logout">
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </>
    );

    return (
      <div className="min-h-screen bg-background flex">
        {/* Mobile top bar */}
        {isMobile && (
          <div className="fixed top-0 left-0 right-0 z-40 bg-white h-14 flex items-center px-4 gap-3"
            style={{ borderBottom: '2px solid rgba(212,175,55,.35)' }}>
            <button onClick={() => setSidebarOpen(true)} className="p-1 text-muted-foreground hover:text-foreground transition-colors">
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div className="w-6 h-6 rounded-md flex items-center justify-center text-white font-bold text-xs flex-shrink-0"
                style={{ background: 'linear-gradient(135deg,#d4af37,#ffd700)' }}>Z</div>
              <span className="font-semibold text-sm truncate" style={{ color: '#b8941f' }}>
                {guild.name}
              </span>
            </div>
            <Link href="/servers" className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0">
              <ChevronLeft className="w-4 h-4" />
            </Link>
          </div>
        )}

        {/* Mobile overlay backdrop */}
        {isMobile && sidebarOpen && (
          <div className="fixed inset-0 z-40 bg-black/50" onClick={() => setSidebarOpen(false)} />
        )}

        {/* Sidebar */}
        <aside
          className={`${
            isMobile
              ? `fixed top-0 left-0 h-full z-50 w-64 transition-transform duration-300 ease-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`
              : 'w-60 flex-shrink-0 sticky top-0 h-screen'
          } bg-white flex flex-col overflow-hidden shadow-sm`}
          style={{ borderRight: '2px solid rgba(212,175,55,.35)' }}
        >
          <SidebarInner />
        </aside>

        {/* Main content */}
        <main className={`flex-1 min-w-0 ${isMobile ? 'pt-14' : ''}`}>
          <div className="p-4 sm:p-6 max-w-5xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    );
  }
  