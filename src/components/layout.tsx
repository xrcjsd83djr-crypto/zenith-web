import { ReactNode, useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  LayoutDashboard, Users, Inbox, AlertTriangle,
  CalendarClock, ActivitySquare, BadgeCent,
  Settings, Star, BarChart2, LogOut, Menu, X,
  AlertOctagon, ShieldBan, ArrowLeftRight,
  TrendingUp, Clock, Layers, Award, Zap,
  Crown, StickyNote, Megaphone, BookOpen, ClipboardList, UserX, Sparkles, Send,
  GraduationCap, FileWarning, Target, ChevronDown, ChevronRight,
  BarChart3, CheckSquare, Users2, Trophy,
} from "lucide-react";
import { Button } from "./ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "./ui/alert-dialog";

export interface Guild { id: string; name: string; icon?: string; iconUrl?: string; isPremium?: boolean; }

interface NavGroup { label: string; items: NavItem[]; }
interface NavItem { name: string; path: string; icon: React.ReactNode; exact?: boolean; badge?: string; }

export default function DashboardLayout({ guildId, children }: { guildId: string; children: ReactNode }) {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const [guild, setGuild] = useState<Guild | null>(null);
  const [guildLoading, setGuildLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const isMobile = useIsMobile();

  useEffect(() => {
    if (!guildId) return;
    fetch(`/api/guilds/${guildId}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setGuild(data); })
      .catch(() => {})
      .finally(() => setGuildLoading(false));
  }, [guildId]);

  useEffect(() => { setSidebarOpen(false); }, [location]);

  const navGroups: NavGroup[] = [
    {
      label: "Core",
      items: [
        { name: "Overview",       path: `/dashboard/${guildId}`,              icon: <LayoutDashboard className="w-4 h-4" />, exact: true },
        { name: "Staff Roster",   path: `/dashboard/${guildId}/staff`,         icon: <Users className="w-4 h-4" /> },
        { name: "Directory",      path: `/dashboard/${guildId}/directory`,     icon: <Users2 className="w-4 h-4" /> },
        { name: "Applications",   path: `/dashboard/${guildId}/applications`,  icon: <Inbox className="w-4 h-4" /> },
        { name: "Announcements",  path: `/dashboard/${guildId}/announcements`, icon: <Megaphone className="w-4 h-4" /> },
      ],
    },
    {
      label: "Discipline",
      items: [
        { name: "Strikes",          path: `/dashboard/${guildId}/strikes`,    icon: <AlertTriangle className="w-4 h-4" /> },
        { name: "Warnings",         path: `/dashboard/${guildId}/warnings`,   icon: <AlertOctagon className="w-4 h-4" /> },
        { name: "Blacklist",        path: `/dashboard/${guildId}/blacklist`,  icon: <ShieldBan className="w-4 h-4" /> },
        { name: "Inactivity",       path: `/dashboard/${guildId}/inactivity`, icon: <UserX className="w-4 h-4" /> },
        { name: "Incident Reports", path: `/dashboard/${guildId}/incidents`,  icon: <FileWarning className="w-4 h-4" /> },
      ],
    },
    {
      label: "Staff Management",
      items: [
        { name: "Promotions",    path: `/dashboard/${guildId}/promotions`,     icon: <TrendingUp className="w-4 h-4" /> },
        { name: "Rank Requests", path: `/dashboard/${guildId}/rank-requests`,  icon: <ArrowLeftRight className="w-4 h-4" /> },
        { name: "Ranks",         path: `/dashboard/${guildId}/ranks`,          icon: <BadgeCent className="w-4 h-4" /> },
        { name: "Divisions",     path: `/dashboard/${guildId}/divisions`,      icon: <Layers className="w-4 h-4" /> },
        { name: "LOA Requests",  path: `/dashboard/${guildId}/loa`,            icon: <CalendarClock className="w-4 h-4" /> },
        { name: "Staff Notes",   path: `/dashboard/${guildId}/notes`,          icon: <StickyNote className="w-4 h-4" /> },
        { name: "Training",      path: `/dashboard/${guildId}/training`,       icon: <GraduationCap className="w-4 h-4" /> },
        { name: "Staff Goals",   path: `/dashboard/${guildId}/goals`,          icon: <Target className="w-4 h-4" /> },
        { name: "Commendations", path: `/dashboard/${guildId}/commendations`,  icon: <Award className="w-4 h-4" /> },
      ],
    },
    {
      label: "Operations",
      items: [
        { name: "Shifts",          path: `/dashboard/${guildId}/shifts`,         icon: <Clock className="w-4 h-4" /> },
        { name: "Performance",     path: `/dashboard/${guildId}/performance`,     icon: <Star className="w-4 h-4" /> },
        { name: "Handbook",        path: `/dashboard/${guildId}/handbook`,        icon: <BookOpen className="w-4 h-4" /> },
        { name: "Custom Commands", path: `/dashboard/${guildId}/custom-commands`, icon: <Sparkles className="w-4 h-4" /> },
        { name: "Embed Sender",    path: `/dashboard/${guildId}/embed-sender`,    icon: <Send className="w-4 h-4" /> },
      ],
    },
    {
      label: "Engagement",
      items: [
        { name: "Staff Polls",    path: `/dashboard/${guildId}/polls`,   icon: <BarChart3 className="w-4 h-4" /> },
        { name: "Task Manager",   path: `/dashboard/${guildId}/tasks`,   icon: <CheckSquare className="w-4 h-4" /> },
        { name: "Staff Awards",   path: `/dashboard/${guildId}/awards`,  icon: <Trophy className="w-4 h-4" /> },
      ],
    },
    {
      label: "Intelligence",
      items: [
        { name: "Activity Logs", path: `/dashboard/${guildId}/activity`,  icon: <ActivitySquare className="w-4 h-4" /> },
        { name: "Statistics",    path: `/dashboard/${guildId}/stats`,     icon: <BarChart2 className="w-4 h-4" /> },
        { name: "Analytics",     path: `/dashboard/${guildId}/analytics`, icon: <Zap className="w-4 h-4" />, badge: "PRO" },
      ],
    },
  ];

  const bottomItems: NavItem[] = [
    { name: "Configuration",  path: `/dashboard/${guildId}/config`,           icon: <Settings className="w-4 h-4" /> },
    { name: "Bot Settings",   path: `/dashboard/${guildId}/bot-customization`, icon: <Zap className="w-4 h-4" /> },
    { name: "Manage Premium", path: `/dashboard/${guildId}/manage-premium`,    icon: <Crown className="w-4 h-4" /> },
  ];

  const isActive = (item: NavItem) =>
    item.exact ? location === item.path : location === item.path || location.startsWith(item.path + "/");

  const toggleGroup = (label: string) =>
    setCollapsedGroups(g => ({ ...g, [label]: !g[label] }));

  const iconUrl = guild?.iconUrl || (guild?.icon ? `https://cdn.discordapp.com/icons/${guildId}/${guild.icon}.png` : null);

  if (guildLoading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-2 animate-spin" style={{ borderColor: '#d4af37', borderTopColor: 'transparent' }} />
    </div>
  );

  if (!guild) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background text-center px-4">
      <AlertTriangle className="w-12 h-12 text-muted-foreground mb-4" />
      <h2 className="text-xl font-bold mb-2">Server not found</h2>
      <p className="text-muted-foreground mb-4 text-sm">You may not have permission to view this server.</p>
      <Link href="/servers"><Button>Back to Servers</Button></Link>
    </div>
  );

  const NavLink = ({ item }: { item: NavItem }) => {
    const active = isActive(item);
    return (
      <Link href={item.path}>
        <div
          className="flex items-center gap-2.5 px-3 py-2 rounded-lg mx-1 text-sm font-medium cursor-pointer transition-all duration-150 group"
          style={active ? { color: '#b8941f', background: 'rgba(212,175,55,.12)', fontWeight: 600 } : { color: 'var(--muted-foreground)' }}
        >
          <span style={active ? { color: '#d4af37' } : {}} className="flex-shrink-0 group-hover:text-foreground transition-colors">{item.icon}</span>
          <span className="truncate group-hover:text-foreground transition-colors">{item.name}</span>
          {item.badge && <span className="ml-auto text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: '#d4af37', color: '#000' }}>{item.badge}</span>}
        </div>
      </Link>
    );
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Guild Header */}
      <div className="p-4 border-b">
        <div className="flex items-center gap-3">
          {iconUrl ? (
            <img src={iconUrl} alt={guild.name} className="w-9 h-9 rounded-xl object-cover flex-shrink-0" />
          ) : (
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0"
              style={{ background: 'rgba(212,175,55,.2)', color: '#d4af37' }}>
              {guild.name[0]}
            </div>
          )}
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate">{guild.name}</p>
            {guild.isPremium && <p className="text-[10px] font-semibold" style={{ color: '#d4af37' }}>⭐ Premium</p>}
          </div>
        </div>
      </div>

      {/* Nav Groups */}
      <div className="flex-1 overflow-y-auto py-3 space-y-1">
        {navGroups.map(group => {
          const collapsed = !!collapsedGroups[group.label];
          return (
            <div key={group.label}>
              <button onClick={() => toggleGroup(group.label)}
                className="flex items-center justify-between w-full px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 hover:text-muted-foreground transition-colors">
                {group.label}
                {collapsed ? <ChevronRight size={10} /> : <ChevronDown size={10} />}
              </button>
              {!collapsed && (
                <div className="space-y-0.5">
                  {group.items.map(item => <NavLink key={item.path} item={item} />)}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Bottom */}
      <div className="border-t py-3 space-y-0.5">
        {bottomItems.map(item => <NavLink key={item.path} item={item} />)}
        <div className="px-1 pt-2">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button className="flex items-center gap-2.5 px-3 py-2 rounded-lg w-full text-sm font-medium text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-all duration-150 mx-0">
                <LogOut className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">Sign Out</span>
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Sign out?</AlertDialogTitle>
                <AlertDialogDescription>You'll need to sign in again to access the dashboard.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={logout}>Sign Out</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Desktop Sidebar */}
      {!isMobile && (
        <aside className="w-56 border-r bg-card flex-shrink-0 overflow-hidden">
          <SidebarContent />
        </aside>
      )}

      {/* Mobile Sidebar Overlay */}
      {isMobile && sidebarOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <aside className="fixed left-0 top-0 h-full w-64 z-50 border-r bg-card shadow-xl overflow-hidden">
            <SidebarContent />
          </aside>
        </>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {isMobile && (
          <div className="flex items-center gap-3 px-4 py-3 border-b bg-card">
            <button onClick={() => setSidebarOpen(true)} className="p-1.5 rounded-md hover:bg-muted transition-colors">
              <Menu size={20} />
            </button>
            {iconUrl && <img src={iconUrl} className="w-6 h-6 rounded-lg" alt={guild.name} />}
            <span className="font-semibold text-sm truncate">{guild.name}</span>
          </div>
        )}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
