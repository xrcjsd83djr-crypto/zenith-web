import { Link } from "wouter";
  import { ArrowLeft, Star, Check, Zap, Shield, Crown, Sparkles } from "lucide-react";
  import { Button } from "@/components/ui/button";
  import { Card, CardContent } from "@/components/ui/card";
  import { Badge } from "@/components/ui/badge";
  import { useState } from "react";

  const PLANS = [
    {
      name: "Free",
      price: "0",
      color: "#6b7280",
      icon: <Shield className="w-5 h-5" />,
      description: "Perfect for getting started",
      features: [
        "Up to 25 staff members",
        "Basic slash commands",
        "Strike & warning system",
        "LOA management",
        "Activity tracking",
        "1 application panel",
        "Community support",
      ],
      cta: "Current Plan",
      disabled: true,
    },
    {
      name: "Premium",
      price: "800",
      priceNote: "Robux / month",
      color: "#d4af37",
      icon: <Star className="w-5 h-5" />,
      description: "For serious staff teams",
      badge: "POPULAR",
      features: [
        "Unlimited staff members",
        "All slash commands",
        "Custom bot prefix",
        "Advanced analytics",
        "Unlimited app panels",
        "Priority support",
        "Custom embed colors",
        "Staff leaderboard",
        "Automated promotions",
        "Smart Reports",
      ],
      cta: "Upgrade to Premium",
    },
    {
      name: "Enterprise",
      price: "2,000",
      priceNote: "Robux / month",
      color: "#a855f7",
      icon: <Crown className="w-5 h-5" />,
      description: "For large organizations",
      features: [
        "Everything in Premium",
        "Custom bot branding",
        "Custom bot avatar & name",
        "Dedicated support",
        "Custom features on request",
        "White-glove onboarding",
        "Multiple server support",
        "AI-powered insights",
      ],
      cta: "Contact Us",
    },
  ];

  export default function PremiumPage() {
    const [billing, setBilling] = useState<"monthly"|"yearly">("monthly");

    return (
      <div className="min-h-screen py-12 px-4" style={{ background: "#0d0f14" }}>
        <div className="max-w-5xl mx-auto">
          <Link href="/" className="inline-flex items-center gap-2 mb-10 text-sm hover:opacity-70 transition-opacity" style={{ color: "rgba(255,255,255,.4)" }}>
            <ArrowLeft className="w-4 h-4" /> Back to home
          </Link>

          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-5 text-xs font-bold" style={{ background: "rgba(212,175,55,.1)", color: "#d4af37", border: "1px solid rgba(212,175,55,.2)" }}>
              <Sparkles className="w-3.5 h-3.5" /> Zenith Premium Plans
            </div>
            <h1 className="text-4xl font-black text-white mb-4">Upgrade your<br /><span style={{ color: "#d4af37" }}>staff management</span></h1>
            <p className="text-lg max-w-xl mx-auto" style={{ color: "rgba(255,255,255,.5)" }}>
              Unlock the full power of Zenith with premium features built for serious ERLC staff teams.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {PLANS.map((plan, i) => (
              <div key={plan.name} className="relative rounded-2xl p-6 border transition-all"
                style={plan.badge
                  ? { background: "rgba(212,175,55,.06)", borderColor: "rgba(212,175,55,.4)", boxShadow: "0 0 40px rgba(212,175,55,.08)" }
                  : { background: "rgba(255,255,255,.03)", borderColor: "rgba(255,255,255,.08)" }}>
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-[10px] font-black" style={{ background: "#d4af37", color: "#000" }}>
                    {plan.badge}
                  </div>
                )}
                <div className="flex items-center gap-2.5 mb-4">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${plan.color}20`, color: plan.color }}>
                    {plan.icon}
                  </div>
                  <span className="font-bold text-white">{plan.name}</span>
                </div>
                <div className="mb-1">
                  <span className="text-3xl font-black text-white">{plan.price}</span>
                  {plan.priceNote && <span className="text-sm ml-1.5" style={{ color: "rgba(255,255,255,.4)" }}>{plan.priceNote}</span>}
                  {!plan.priceNote && <span className="text-sm ml-1.5" style={{ color: "rgba(255,255,255,.4)" }}>forever</span>}
                </div>
                <p className="text-sm mb-6" style={{ color: "rgba(255,255,255,.4)" }}>{plan.description}</p>

                <div className="space-y-2.5 mb-6">
                  {plan.features.map(f => (
                    <div key={f} className="flex items-start gap-2.5 text-sm" style={{ color: "rgba(255,255,255,.75)" }}>
                      <Check className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: plan.color }} />
                      {f}
                    </div>
                  ))}
                </div>

                <button
                  disabled={plan.disabled}
                  className="w-full py-2.5 rounded-xl font-semibold text-sm transition-all"
                  style={plan.badge
                    ? { background: "#d4af37", color: "#000" }
                    : plan.disabled
                      ? { background: "rgba(255,255,255,.06)", color: "rgba(255,255,255,.3)", cursor: "not-allowed" }
                      : { background: "rgba(255,255,255,.08)", color: "rgba(255,255,255,.7)", border: "1px solid rgba(255,255,255,.1)" }}>
                  {plan.cta}
                </button>
              </div>
            ))}
          </div>

          <div className="mt-12 text-center" style={{ color: "rgba(255,255,255,.3)" }}>
            <p className="text-sm">Have questions? Join our <a href="https://discord.gg/UmDQqXPCfF" target="_blank" rel="noreferrer" className="underline hover:text-white transition-colors">support server</a></p>
          </div>
        </div>
      </div>
    );
  }
  