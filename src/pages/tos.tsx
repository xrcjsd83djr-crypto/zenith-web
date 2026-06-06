import { Link } from "wouter";
  import { ArrowLeft } from "lucide-react";

  export default function TOSPage() {
    return (
      <div className="min-h-screen py-12" style={{ background: "#0d0f14", color: "rgba(255,255,255,.85)" }}>
        <div className="max-w-3xl mx-auto px-4">
          <Link href="/" className="inline-flex items-center gap-2 mb-8 hover:opacity-70 transition-opacity text-sm" style={{ color: "rgba(255,255,255,.4)" }}>
            <ArrowLeft className="w-4 h-4" /> Back to home
          </Link>
          <div className="flex items-center gap-3 mb-8">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-black font-bold" style={{ background: "linear-gradient(135deg,#d4af37,#ffd700)" }}>Z</div>
            <h1 className="text-3xl font-bold text-white">Terms of Service</h1>
          </div>
          <p className="text-sm mb-8" style={{ color: "rgba(255,255,255,.35)" }}>Last updated: June 2025</p>
          <div className="space-y-8 text-sm leading-relaxed" style={{ color: "rgba(255,255,255,.7)" }}>
            {[
              { title: "1. Acceptance of Terms", body: "By accessing or using Zenith (the \"Service\"), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the Service." },
              { title: "2. Description of Service", body: "Zenith is a Discord bot management platform designed for ERLC (Emergency Response: Liberty County) staff teams. The Service provides tools for staff management, activity tracking, and server administration." },
              { title: "3. User Accounts", body: "You must have a valid Discord account to use Zenith. You are responsible for maintaining the security of your account and all activities that occur under your account. You agree to immediately notify us of any unauthorized use of your account." },
              { title: "4. Acceptable Use", body: "You agree not to use the Service for any unlawful purpose, to harass or harm others, to distribute spam or malware, to attempt to gain unauthorized access to any part of the Service, or to interfere with the proper working of the Service." },
              { title: "5. Premium Services", body: "Zenith offers premium features available through Robux payment. All premium purchases are final and non-refundable unless required by applicable law. Premium features are tied to the Discord server and not transferable." },
              { title: "6. Data and Privacy", body: "By using the Service, you agree to our Privacy Policy. We collect and process data as described therein. You are responsible for ensuring that your use of the Service complies with applicable data protection laws regarding your server members." },
              { title: "7. Intellectual Property", body: "The Service and its original content, features, and functionality are owned by Zenith and are protected by international copyright, trademark, and other intellectual property laws." },
              { title: "8. Limitation of Liability", body: "Zenith shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of or inability to use the Service. The Service is provided \"as is\" without warranty of any kind." },
              { title: "9. Changes to Terms", body: "We reserve the right to modify these terms at any time. We will notify users of significant changes. Continued use of the Service after changes constitutes acceptance of the new terms." },
              { title: "10. Contact", body: "If you have questions about these Terms of Service, please contact us through our support Discord server." },
            ].map((s) => (
              <div key={s.title}>
                <h2 className="text-base font-semibold mb-2 text-white">{s.title}</h2>
                <p>{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }
  