import { useTheme } from "next-themes";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Sun, Moon, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AccountSettingsPage({ guildId }: { guildId: string }) {
  const { theme, setTheme } = useTheme();

  const themes = [
    { value: "dark", label: "Dark", icon: Moon, desc: "Easier on the eyes at night." },
    { value: "light", label: "Light", icon: Sun, desc: "Clean, bright interface." },
    { value: "system", label: "System", icon: Monitor, desc: "Matches your OS preference." },
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Account Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage your personal preferences for this dashboard.</p>
      </div>

      {/* Appearance */}
      <div className="rounded-2xl border bg-card p-6 space-y-5">
        <div>
          <h2 className="font-semibold text-base">Appearance</h2>
          <p className="text-muted-foreground text-sm mt-0.5">Choose how the dashboard looks to you.</p>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {themes.map((t) => {
            const Icon = t.icon;
            const active = theme === t.value;
            return (
              <button
                key={t.value}
                onClick={() => setTheme(t.value)}
                className="flex flex-col items-center gap-2 p-4 rounded-xl border text-center transition-all"
                style={active
                  ? { borderColor: "#d4af37", background: "rgba(212,175,55,.1)", color: "#d4af37" }
                  : { borderColor: "var(--border)", background: "transparent" }
                }
              >
                <Icon className="w-5 h-5" />
                <span className="text-sm font-semibold">{t.label}</span>
                <span className="text-xs text-muted-foreground leading-tight">{t.desc}</span>
                {active && (
                  <span className="text-[10px] font-bold uppercase tracking-widest mt-1" style={{ color: "#d4af37" }}>Active</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Quick toggle */}
      <div className="rounded-2xl border bg-card p-6">
        <div className="flex items-center justify-between">
          <div>
            <Label className="font-semibold text-base">Dark Mode</Label>
            <p className="text-muted-foreground text-sm mt-0.5">Toggle between dark and light mode quickly.</p>
          </div>
          <Switch
            checked={theme === "dark"}
            onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
          />
        </div>
      </div>

      {/* Account info placeholder */}
      <div className="rounded-2xl border bg-card p-6 space-y-3">
        <h2 className="font-semibold text-base">Session</h2>
        <p className="text-muted-foreground text-sm">You are logged in via Discord OAuth. Your session is managed securely server-side.</p>
        <p className="text-xs text-muted-foreground">Server: <span className="font-mono">{guildId}</span></p>
      </div>
    </div>
  );
}
