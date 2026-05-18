import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, RefreshCw, CheckCircle, Settings2, AlertCircle, Star } from "lucide-react";

interface BotCustomization {
  customBotName: string;
  customBotAvatar: string;
  customBotStatus: string;
  isPremium: boolean;
}

export default function BotCustomizationPage({ guildId }: { guildId: string }) {
  const [data, setData] = useState<BotCustomization>({
    customBotName: "",
    customBotAvatar: "",
    customBotStatus: "",
    isPremium: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/guilds/${guildId}/bot-customization`);
      if (res.ok) {
        const d = await res.json();
        setData(d);
      }
    } catch (e) {
      setError("Failed to fetch bot customization data.");
    }
    setLoading(false);
  }, [guildId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSave = async () => {
    if (!data.isPremium) return;
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const res = await fetch(`/api/guilds/${guildId}/bot-customization`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to save customization");
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      setError(err.message);
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-24">
        <div
          className="w-7 h-7 rounded-full border-2 animate-spin"
          style={{ borderColor: "#d4af37", borderTopColor: "transparent" }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight flex items-center gap-2">
            <Settings2 className="w-6 h-6" style={{ color: "#d4af37" }} />
            Bot Customization
          </h2>
          <p className="text-muted-foreground mt-0.5 text-sm">
            Make the bot yours by customizing its name, avatar, and status.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {saved && (
            <span className="text-green-600 text-sm flex items-center gap-1.5 font-medium">
              <CheckCircle size={14} /> Saved!
            </span>
          )}
          {error && (
            <span className="text-red-600 text-sm flex items-center gap-1.5">
              <AlertCircle size={14} /> {error}
            </span>
          )}
          <Button variant="outline" size="sm" onClick={fetchData} className="gap-1.5">
            <RefreshCw size={13} /> Refresh
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || !data.isPremium}
            size="sm"
            style={{
              background: saving || !data.isPremium ? undefined : "linear-gradient(135deg,#d4af37,#ffd700)",
              color: "#5a3e10",
              border: "none",
            }}
          >
            {saving ? (
              <>
                <Loader2 size={13} className="animate-spin mr-1" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </div>
      </div>

      {!data.isPremium && (
        <Card className="border-border bg-yellow-50/50 border-yellow-200">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center flex-shrink-0">
              <Star className="w-5 h-5 text-yellow-600 fill-current" />
            </div>
            <div>
              <p className="font-bold text-yellow-900">Premium Feature</p>
              <p className="text-yellow-800 text-sm">
                Bot customization is only available for Premium servers. Upgrade to unlock!
              </p>
            </div>
            <Button size="sm" className="ml-auto bg-yellow-600 hover:bg-yellow-700 text-white border-none">
              Upgrade
            </Button>
          </CardContent>
        </Card>
      )}

      <Card className={`border-border bg-white shadow-sm ${!data.isPremium ? "opacity-60 grayscale-[0.5]" : ""}`}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Bot Identity</CardTitle>
          <CardDescription>Customize how the bot appears in your server.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Custom Bot Name</Label>
            <Input
              disabled={!data.isPremium}
              value={data.customBotName}
              onChange={(e) => setData({ ...data, customBotName: e.target.value })}
              placeholder="e.g. Zenith Assistant"
              className="bg-white border-border"
            />
          </div>
          <div className="space-y-2">
            <Label>Custom Bot Avatar URL</Label>
            <Input
              disabled={!data.isPremium}
              value={data.customBotAvatar}
              onChange={(e) => setData({ ...data, customBotAvatar: e.target.value })}
              placeholder="https://example.com/avatar.png"
              className="bg-white border-border"
            />
          </div>
          <div className="space-y-2">
            <Label>Custom Bot Status</Label>
            <Input
              disabled={!data.isPremium}
              value={data.customBotStatus}
              onChange={(e) => setData({ ...data, customBotStatus: e.target.value })}
              placeholder="e.g. Watching Liberty County"
              className="bg-white border-border"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
