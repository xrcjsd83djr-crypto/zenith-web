import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useGetGuild, useGetMe, getGetGuildQueryKey } from "@workspace/api-client-react";
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
  Star
} from "lucide-react";
import { Button } from "./ui/button";

export default function DashboardLayout({ guildId, children }: { guildId: string, children: ReactNode }) {
  const [location] = useLocation();
  const { data: guild, isLoading: guildLoading } = useGetGuild(guildId, {
    query: {
      enabled: !!guildId,
      queryKey: getGetGuildQueryKey(guildId)
    }
  });
  const { data: user } = useGetMe();

  const navItems = [
    { name: "Overview", path: `/dashboard/${guildId}`, icon: <LayoutDashboard className="w-5 h-5" /> },
    { name: "Staff Roster", path: `/dashboard/${guildId}/staff`, icon: <Users className="w-5 h-5" /> },
    { name: "Applications", path: `/dashboard/${guildId}/applications`, icon: <Inbox className="w-5 h-5" /> },
    { name: "Strikes", path: `/dashboard/${guildId}/strikes`, icon: <AlertTriangle className="w-5 h-5" /> },
    { name: "LOA Requests", path: `/dashboard/${guildId}/loa`, icon: <CalendarClock className="w-5 h-5" /> },
    { name: "Activity Tracking", path: `/dashboard/${guildId}/activity`, icon: <ActivitySquare className="w-5 h-5" /> },
    { name: "Ranks", path: `/dashboard/${guildId}/ranks`, icon: <BadgeCent className="w-5 h-5" /> },
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

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex-shrink-0 flex flex-col sticky top-0 h-screen overflow-y-auto">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <Link href="/servers" className="text-gray-400 hover:text-gray-600 transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-2 flex-1 justify-center">
            <div className="w-6 h-6 rounded bg-primary flex items-center justify-center text-white font-bold text-xs shadow-sm">
              Z
            </div>
            <span className="font-bold text-gray-900 tracking-tight">Zenith</span>
          </div>
        </div>

        <div className="p-4">
          <div className="flex items-center gap-3 p-2 rounded-xl bg-gray-50 border border-gray-100 mb-6">
            {guild.icon ? (
              <img src={guild.icon} alt={guild.name} className="w-10 h-10 rounded-lg object-cover bg-white shadow-sm ring-1 ring-black/5" />
            ) : (
              <div className="w-10 h-10 rounded-lg bg-gray-200 flex items-center justify-center text-gray-500 font-bold shadow-sm ring-1 ring-black/5">
                {guild.name.charAt(0)}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold text-gray-900 truncate" title={guild.name}>{guild.name}</div>
              {guild.isPremium ? (
                <div className="text-[10px] font-bold text-premium flex items-center uppercase tracking-wider">
                  <Star className="w-3 h-3 mr-0.5 fill-current" /> Pro
                </div>
              ) : (
                <div className="text-xs text-gray-500 font-medium">Free Plan</div>
              )}
            </div>
          </div>

          <div className="space-y-1">
            {navItems.map((item) => {
              const isActive = location === item.path || (location.startsWith(item.path) && item.path !== `/dashboard/${guildId}`);
              return (
                <Link key={item.path} href={item.path}>
                  <div className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all duration-150 ${
                    isActive 
                      ? "bg-primary/10 text-primary" 
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                  }`}>
                    {item.icon}
                    {item.name}
                  </div>
                </Link>
              );
            })}
            
            <div className="my-4 border-t border-gray-100" />
            
            <Link href={`/dashboard/${guildId}/config`}>
              <div className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all duration-150 ${
                location.includes('/config') 
                  ? "bg-gray-900 text-white" 
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              }`}>
                <Settings className="w-5 h-5" />
                Configuration
              </div>
            </Link>
          </div>
        </div>

        {/* User profile at bottom */}
        {user && (
          <div className="mt-auto p-4 border-t border-gray-100 bg-gray-50/50">
            <div className="flex items-center gap-3">
              {user.avatar ? (
                <img src={user.avatar} alt={user.username} className="w-9 h-9 rounded-full ring-2 ring-white shadow-sm" />
              ) : (
                <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center font-bold text-gray-500 shadow-sm ring-2 ring-white">
                  {user.username.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-gray-900 truncate">{user.username}</div>
                <div className="text-xs text-gray-500 truncate">Manage Account</div>
              </div>
            </div>
          </div>
        )}
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto bg-gray-50/30">
        <header className="h-16 border-b border-gray-200 bg-white flex items-center px-8 sticky top-0 z-10 shadow-sm shadow-black/5">
          <div className="flex items-center text-sm font-medium text-gray-500">
            Dashboard <span className="mx-2 text-gray-300">/</span> 
            <span className="text-gray-900">
              {location === `/dashboard/${guildId}` ? 'Overview' : 
               navItems.find(i => location.startsWith(i.path) && i.path !== `/dashboard/${guildId}`)?.name || 
               (location.includes('/config') ? 'Configuration' : '')}
            </span>
          </div>
        </header>
        <div className="p-8 max-w-7xl mx-auto w-full">
          {children}
        </div>
      </main>
    </div>
  );
}