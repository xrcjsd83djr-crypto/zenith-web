import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { 
  ShieldCheck, 
  Settings2, 
  Activity, 
  Users, 
  ChevronRight,
  ArrowRight,
  Star,
  Zap,
  Lock,
  TrendingUp,
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0d0f14] text-white">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0d0f14]/80 backdrop-blur-md border-b border-white/5">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-black font-bold text-xl" style={{ background: "linear-gradient(135deg,#d4af37,#ffd700)" }}>
              Z
            </div>
            <span className="font-bold text-xl tracking-tight text-white">Zenith</span>
          </div>
          <div className="hidden md:flex items-center gap-6">
            <Link href="/tos" className="text-sm font-medium text-white/50 hover:text-white transition-colors">Terms</Link>
            <a href="https://discord.gg/UmDQqXPCfF" target="_blank" rel="noreferrer" className="text-sm font-medium text-white/50 hover:text-white transition-colors">Support</a>
            <Link href="/privacy" className="text-sm font-medium text-white/50 hover:text-white transition-colors">Privacy</Link>
            <Link href="/login" className="text-sm font-medium text-white/50 hover:text-white transition-colors">Log in</Link>
            <Link href="/servers">
              <Button className="font-semibold text-black" style={{ background: "linear-gradient(135deg,#d4af37,#f0c040)" }}>Try the demo</Button>
            </Link>
          </div>
          <Link href="/login" className="md:hidden">
            <Button size="sm" className="font-semibold text-black" style={{ background: "linear-gradient(135deg,#d4af37,#f0c040)" }}>Log in</Button>
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-40 pb-24 px-4 relative overflow-hidden">
        {/* Glow effects */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full opacity-10" style={{ background: "radial-gradient(ellipse,#d4af37,transparent 70%)", filter: "blur(60px)" }} />
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/5 text-sm font-medium text-white/70 mb-8">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            V2 Now Available
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight leading-[1.1] mb-6">
            Built for servers that
            <br/>
            <span style={{ background: "linear-gradient(90deg,#d4af37,#ffd700)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              take things seriously.
            </span>
          </h1>
          <p className="text-lg md:text-xl text-white/50 mb-10 max-w-2xl mx-auto leading-relaxed">
            Zenith gives your ERLC staff team a single command center — applications, strikes, activity tracking, ranks, and more. Clean, fast, and built to scale.
          </p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Link href="/servers">
              <Button size="lg" className="h-12 px-8 text-base font-semibold text-black shadow-lg hover:opacity-90 transition-opacity" style={{ background: "linear-gradient(135deg,#d4af37,#f0c040)" }}>
                Get Started <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
            <a href="https://discord.com/oauth2/authorize?client_id=1501773810368643172" target="_blank" rel="noreferrer">
              <Button size="lg" variant="outline" className="h-12 px-8 text-base font-semibold border-white/10 bg-white/5 text-white hover:bg-white/10">
                Add to Discord
              </Button>
            </a>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24 border-y border-white/5">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-white">Everything you need to run a server.</h2>
            <p className="text-white/40 mt-2">Built for efficiency. No fluff, no bloat.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: <Users className="w-6 h-6" />,
                title: "Staff Management",
                desc: "Track every staff member's history, strikes, and activity in one unified roster."
              },
              {
                icon: <Activity className="w-6 h-6" />,
                title: "Activity Tracking",
                desc: "Automated leaderboards and activity logging so you always know who's putting in the work."
              },
              {
                icon: <Settings2 className="w-6 h-6" />,
                title: "Deep Configuration",
                desc: "Customize every aspect of your bot — channels, roles, and strike thresholds."
              },
              {
                icon: <ShieldCheck className="w-6 h-6" />,
                title: "Application Pipeline",
                desc: "Review, accept, and deny staff applications with custom questionnaires."
              },
              {
                icon: <TrendingUp className="w-6 h-6" />,
                title: "Rank & Promotion",
                desc: "Streamline rank requests, promotions, and hierarchy management."
              },
              {
                icon: <Lock className="w-6 h-6" />,
                title: "Blacklist System",
                desc: "Keep bad actors out with a persistent blacklist system tied to your community."
              },
              {
                icon: <Zap className="w-6 h-6" />,
                title: "Smart Automations",
                desc: "Set up triggers for repetitive tasks so your team can focus on what matters."
              },
              {
                icon: <Star className="w-6 h-6" />,
                title: "Performance Reviews",
                desc: "Score and evaluate staff with structured performance review workflows."
              }
            ].map((f, i) => (
              <div key={i} className="p-6 rounded-2xl border border-white/5 bg-white/[0.03] hover:bg-white/[0.06] transition-colors group">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4" style={{ background: "rgba(212,175,55,.15)", color: "#d4af37" }}>
                  {f.icon}
                </div>
                <h3 className="text-base font-bold text-white mb-1">{f.title}</h3>
                <p className="text-white/40 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing / Premium */}
      <section className="py-24 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-white">Choose your tier</h2>
            <p className="text-white/40 mt-2">Start for free, upgrade when you need more power.</p>
          </div>
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Free */}
            <div className="p-8 rounded-3xl border border-white/10 bg-white/[0.03]">
              <h3 className="text-2xl font-bold text-white">Standard</h3>
              <p className="text-white/40 mt-2 min-h-12">Perfect for growing communities starting to organize.</p>
              <div className="text-4xl font-extrabold text-white my-6">Free</div>
              <ul className="space-y-4 mb-8">
                {['Basic staff roster', 'Standard application system', 'Strike tracking', 'Basic configuration'].map(f => (
                  <li key={f} className="flex items-center text-white/60">
                    <ChevronRight className="w-5 h-5 text-white/20 mr-2 flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <Button variant="outline" className="w-full h-12 text-base font-semibold border-white/10 bg-white/5 text-white hover:bg-white/10">
                Start for free
              </Button>
            </div>
            
            {/* Premium */}
            <div className="p-8 rounded-3xl relative overflow-hidden" style={{ border: "2px solid #d4af37", background: "rgba(212,175,55,.06)" }}>
              <div className="absolute top-4 right-4 flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider text-black" style={{ background: "#d4af37" }}>
                <Star className="w-3 h-3 mr-1 fill-current" /> Zenith Pro
              </div>
              <h3 className="text-2xl font-bold text-white">Premium</h3>
              <p className="text-white/40 mt-2 min-h-12">Advanced features for established roleplay servers.</p>
              <div className="text-4xl font-extrabold text-white my-6">500 <span className="text-lg font-medium text-white/40">R$ / mo</span></div>
              <ul className="space-y-4 mb-8">
                {['Custom bot branding', 'Advanced activity analytics', 'Multi-server syncing', 'Priority support', 'Unlimited applications'].map(f => (
                  <li key={f} className="flex items-center text-white font-medium">
                    <Star className="w-5 h-5 mr-2 flex-shrink-0" style={{ color: "#d4af37", fill: "#d4af37" }} />
                    {f}
                  </li>
                ))}
              </ul>
              <Button className="w-full h-12 text-base font-semibold text-black border-0 hover:opacity-90" style={{ background: "linear-gradient(135deg,#d4af37,#f0c040)" }}>
                Get Premium
              </Button>
            </div>
          </div>
        </div>
      </section>
      
      {/* Footer */}
      <footer className="border-t border-white/5 py-12">
        <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded flex items-center justify-center font-bold text-xs text-black" style={{ background: "#d4af37" }}>
              Z
            </div>
            <span className="font-semibold text-white">Zenith</span>
          </div>
          <div className="flex items-center gap-5 flex-wrap justify-center">
            <a href="https://discord.com/oauth2/authorize?client_id=1501773810368643172" target="_blank" rel="noreferrer" className="text-sm font-semibold hover:opacity-80 transition-opacity" style={{ color: '#d4af37' }}>Add to Discord</a>
            <a href="https://discord.gg/UmDQqXPCfF" target="_blank" rel="noreferrer" className="text-sm text-white/40 hover:text-white/70 transition-colors">Support Server</a>
            <Link href="/tos" className="text-sm text-white/40 hover:text-white/70 transition-colors">Terms</Link>
            <Link href="/privacy" className="text-sm text-white/40 hover:text-white/70 transition-colors">Privacy</Link>
          </div>
          <div className="text-sm text-white/30">
            © {new Date().getFullYear()} Zenith. Not affiliated with Discord or ERLC.
          </div>
        </div>
      </footer>
    </div>
  );
}
