import { useAuth } from "@/lib/auth";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { SiDiscord } from "react-icons/si";

export default function LoginPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-[#0d0f14]">
        <div className="sm:mx-auto sm:w-full sm:max-w-md animate-pulse flex flex-col items-center">
          <div className="w-16 h-16 rounded-xl mb-6" style={{ background: "rgba(212,175,55,.2)" }}></div>
          <div className="h-6 w-32 rounded mb-2" style={{ background: "rgba(255,255,255,.08)" }}></div>
          <div className="h-4 w-48 rounded" style={{ background: "rgba(255,255,255,.05)" }}></div>
        </div>
      </div>
    );
  }

  if (isAuthenticated) {
    setLocation("/servers");
    return null;
  }

  const handleLogin = () => {
    window.location.href = "/api/auth/discord";
  };

  return (
    <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden" style={{ background: "#0d0f14" }}>
      {/* Subtle glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full opacity-10 pointer-events-none" style={{ background: "radial-gradient(ellipse,#d4af37,transparent 70%)", filter: "blur(80px)" }} />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <Link href="/" className="flex justify-center mb-6 hover:opacity-90 transition-opacity">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center font-bold text-4xl text-black shadow-lg" style={{ background: "linear-gradient(135deg,#d4af37,#ffd700)", boxShadow: "0 8px 32px rgba(212,175,55,.3)" }}>
            Z
          </div>
        </Link>
        <h2 className="mt-2 text-center text-3xl font-extrabold text-white tracking-tight">
          Sign in to Zenith
        </h2>
        <p className="mt-2 text-center text-sm" style={{ color: "rgba(255,255,255,.4)" }}>
          The command center for serious ERLC staff teams.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="py-8 px-4 sm:rounded-3xl sm:px-10" style={{ background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)" }}>
          <div className="space-y-6">
            <Button 
              onClick={handleLogin}
              className="w-full flex justify-center py-6 px-4 rounded-xl text-lg font-medium text-white transition-all hover:opacity-90"
              style={{ background: "#5865F2", border: "none" }}
            >
              <SiDiscord className="w-6 h-6 mr-3" />
              Sign in with Discord
            </Button>
            
            <div className="text-center">
              <p className="text-xs font-medium italic" style={{ color: "rgba(255,255,255,.3)" }}>
                We promise we won't DM your server.
              </p>
            </div>
          </div>
          
          <div className="mt-8 pt-6" style={{ borderTop: "1px solid rgba(255,255,255,.07)" }}>
            <p className="text-xs text-center" style={{ color: "rgba(255,255,255,.25)" }}>
              By signing in, you agree to our{" "}
              <Link href="/tos" className="underline hover:text-white/50 transition-colors">Terms of Service</Link>
              {" "}and{" "}
              <Link href="/privacy" className="underline hover:text-white/50 transition-colors">Privacy Policy</Link>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
