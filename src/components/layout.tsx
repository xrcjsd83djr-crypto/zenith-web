import { ReactNode, useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import {
  LayoutDashboard,
  Users,
  Inbox,
  AlertTriangle,
  CalendarClock,
  ActivitySquare,
  BadgeCent,
  Settings,
  ChevronLeft,
  Star,
  BarChart2,
  LogOut,
} from "lucide-react";
import { Button } from "./ui/button";

export interface Guild {
  id: string;
  name: string;
  icon?: string;
  isPremium?: boolean;
}

export default function DashboardLayout({ guildId, children }: { guildId: string, children: ReactNode }) {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const [guild, setGuild] = useState<Guild | null>(null);
  const [guildLoading, setGuildLoading] = useState(true);

  useEffect(() => {
    const fetchGuild = async () => {
      try {
        const res = await fetch(`/api/guilds/${guildId}`);
        if (res.ok) {
          const data = await res.json();
          setGuild(data);
        }
      } catch (error) {
        console.error("Failed to fetch guild:", error);
      } finally {
        setGuildLoading(false);
      }
    };

    if (guildId) {
      fetchGuild();
    }
  }, [guildId]);

  const navItems = [
    { name: "Overview", path: `/dashboard/${guildId}`, icon: <LayoutDashboard className="w-4 h-4" /> },
    { name: "Staff Roster", path: `/dashboard/${guildId}/staff`, icon: <Users className="w-4 h-4" /> },
    { name: "Applications", path: `/dashboard/${guildId}/applications`, icon: <Inbox className="w-4 h-4" /> },
    { name: "Strikes", path: `/dashboard/${guildId}/strikes`, icon: <AlertTriangle className="w-4 h-4" /> },
    { name: "LOA Requests", path: `/dashboard/${guildId}/loa`, icon: <CalendarClock className="w-4 h-4" /> },
    { name: "Activity", path: `/dashboard/${guildId}/activity`, icon: <ActivitySquare className="w-4 h-4" /> },
    { name: "Statistics", path: `/dashboard/${guildId}/stats`, icon: <BarChart2 className="w-4 h-4" /> },
    { name: "Ranks", path: `/dashboard/${guildId}/ranks`, icon: <BadgeCent className="w-4 h-4" /> },
  ];

  if (guildLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-pulse w-12 h-12 bg-gray-200 rounded-xl" />
      </div>
    );
  }

  if (!guild) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 text-center px-4">
        <AlertTriangle className="w-12 h-12 text-gray-400 mb-4" />
        <h2 className="text-xl font-bold text-gray-900 mb-2">Server not found</h2>
        <p className="text-gray-500 mb-6">You might not have permission to view this server.</p>
        <Link href="/servers"><Button>Back to Servers</Button></Link>
      </div>
    );
  }

  const currentPageName =
    location === `/dashboard/${guildId}` ? "Overview" :
    navItems.find(i => i.path !== `/dashboard/${guildId}` && location.startsWith(i.path))?.name ||
    (location.includes("/config") ? "Configuration" :
     location.includes("/premium") ? "Premium" : "");

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <aside className="w-60 bg-white border-r border-gray-200 flex-shrink-0 flex flex-col sticky top-0 h-screen overflow-y-auto">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
          <Link href="/servers" className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0">
            <ChevronLeft className="w-4 h-4" />
          </Link>
          <div className="flex items-center gap-2 flex-1">
            <div className="w-5 h-5 rounded bg-primary flex items-center justify-center text-white font-bold text-[10px] shadow-sm flex-shrink-0">Z</div>
            <span className="font-bold text-gray-900 text-sm tracking-tight">Zenith</span>
          </div>
        </div>

        <div className="px-3 py-3 border-b border-gray-100">
          <div className="flex items-center gap-2.5 p-2 rounded-xl bg-gray-50 border border-gray-100">
            {guild.icon ? (
              <img src={guild.icon} alt={guild.name} className="w-8 h-8 rounded-lg object-cover flex-shrink-0" />
            ) : (
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold text-sm flex-shrink-0">
                {guild.name.charAt(0)}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold text-gray-900 truncate">{guild.name}</div>
              {guild.isPremium ? (
                <div className="text-[10px] font-bold text-premium flex items-center gap-0.5 uppercase tracking-wider">
                  <Star className="w-2.5 h-2.5 fill-current" /> Pro
                </div>
              ) : (
                <div className="text-[10px] text-gray-400 font-medium">Free Plan</div>
              )}
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-3 space-y-0.5">
          {navItems.map((item) => {
            const isActive = location === item.path || (item.path !== `/dashboard/${guildId}` && location.startsWith(item.path));
            return (
              <Link key={item.path} href={item.path}>
                <div className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-100 ${
                  isActive ? "bg-primary/10 text-primary" : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                }`}>
                  {item.icon}
                  {item.name}
                </div>
              </Link>
            );
          })}

          <div className="pt-2 pb-1 border-t border-gray-100 mt-2 space-y-0.5">
            <Link href={`/dashboard/${guildId}/config`}>
              <div className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-100 ${
                location.includes("/config") ? "bg-gray-900 text-white" : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              }`}>
                <Settings className="w-4 h-4" />
                Configuration
              </div>
            </Link>
            <Link href="/premium">
              <div className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-100 ${
                location === "/premium" ? "bg-premium/10 text-premium" : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              }`}>
                <Star className="w-4 h-4" />
                Premium
              </div>
            </Link>
          </div>
        </nav>

        {user && (
          <div className="px-3 py-3 border-t border-gray-100 bg-gray-50/50">
            <div className="flex items-center gap-2.5">
              {user.avatar ? (
                <img src={user.avatar} alt={user.username} className="w-8 h-8 rounded-full ring-2 ring-white shadow-sm flex-shrink-0" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center font-bold text-gray-500 text-sm flex-shrink-0">
                  {user.username.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold text-gray-900 truncate">{user.username}</div>
                <button
                  onClick={logout}
                  className="text-[11px] text-gray-400 hover:text-red-500 transition-colors flex items-center gap-1 mt-0.5"
                >
                  <LogOut className="w-2.5 h-2.5" />
                  Log out
                </button>
              </div>
            </div>
          </div>
        )}
      </aside>

      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        <header className="h-12 border-b border-gray-200 bg-white flex items-center px-6 sticky top-0 z-10">
          <div className="flex items-center text-sm text-gray-500">
            <span className="text-gray-400 text-xs">{guild.name}</span>
            <span className="mx-2 text-gray-300">/</span>
            <span className="text-gray-900 font-semibold text-xs">{currentPageName}</span>
          </div>
        </header>
        <div className="p-6 max-w-7xl mx-auto w-full">
          {children}
        </div>
      </main>
    </div>
  );
}
