import { Link } from "wouter";
import { useGetGuilds, Guild } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { LogOut, Plus, Star } from "lucide-react";
import { useLogout } from "@workspace/api-client-react";
import { useLocation } from "wouter";

export default function ServersPage() {
  const { data: guilds, isLoading } = useGetGuilds({ query: { retry: false } });
  const logout = useLogout();
  const [, setLocation] = useLocation();

  const handleLogout = async () => {
    await logout.mutateAsync(undefined);
    window.location.href = "/";
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white font-bold text-xl shadow-sm">
              Z
            </div>
            <span className="font-bold text-xl tracking-tight text-gray-900">Zenith</span>
          </Link>
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={handleLogout} className="text-gray-600 hover:text-gray-900">
              <LogOut className="w-4 h-4 mr-2" />
              Log out
            </Button>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 pt-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Select Server</h1>
            <p className="text-gray-500 mt-1">Choose a server to manage or add Zenith to a new one.</p>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-40 bg-white rounded-2xl border border-gray-100 shadow-sm animate-pulse" />
            ))}
          </div>
        ) : guilds?.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-gray-200 shadow-sm">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Plus className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">No servers found</h3>
            <p className="text-gray-500 mb-6 max-w-sm mx-auto">You don't have manage permissions in any servers, or you haven't added the bot yet.</p>
            <Button onClick={() => window.open("https://discord.com/api/oauth2/authorize?client_id=1341142514936381552&permissions=8&scope=bot%20applications.commands", "_blank")}>
              Add Bot to Server
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {guilds?.map((guild: Guild) => (
              <ServerCard key={guild.id} guild={guild} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function ServerCard({ guild }: { guild: Guild }) {
  const isSetup = guild.botInstalled;

  return (
    <div className={`group relative bg-white rounded-2xl border border-gray-200 p-6 flex flex-col items-center text-center transition-all duration-200 hover:-translate-y-1 hover:shadow-md ${guild.isPremium ? 'border-premium/30 ring-1 ring-premium/10' : ''}`}>
      {guild.isPremium && (
        <div className="absolute top-4 right-4 bg-premium/10 text-premium-foreground px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider flex items-center shadow-sm">
          <Star className="w-3 h-3 mr-1 fill-current" /> Pro
        </div>
      )}
      
      {guild.icon ? (
        <img 
          src={guild.icon} 
          alt={guild.name} 
          className="w-20 h-20 rounded-2xl shadow-sm object-cover mb-4 ring-1 ring-gray-100"
        />
      ) : (
        <div className="w-20 h-20 rounded-2xl bg-gray-100 flex items-center justify-center mb-4 ring-1 ring-gray-200 text-gray-500 font-bold text-2xl">
          {guild.name.charAt(0)}
        </div>
      )}
      
      <h3 className="text-lg font-bold text-gray-900 leading-tight mb-1 truncate w-full px-2" title={guild.name}>
        {guild.name}
      </h3>
      
      <p className="text-sm text-gray-500 mb-6">
        {guild.memberCount ? `${guild.memberCount.toLocaleString()} members` : 'Member count hidden'}
      </p>

      {isSetup ? (
        <Link href={`/dashboard/${guild.id}`} className="w-full mt-auto">
          <Button className="w-full font-semibold shadow-sm group-hover:bg-primary/90 transition-colors">
            Manage Server
          </Button>
        </Link>
      ) : (
        <Button 
          variant="outline" 
          className="w-full mt-auto border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-colors text-gray-700"
          onClick={() => window.open(`https://discord.com/api/oauth2/authorize?client_id=1341142514936381552&permissions=8&scope=bot%20applications.commands&guild_id=${guild.id}`, "_blank")}
        >
          Add to Server
        </Button>
      )}
    </div>
  );
}