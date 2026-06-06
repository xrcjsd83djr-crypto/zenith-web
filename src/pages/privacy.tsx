import { Link } from "wouter";
  import { ArrowLeft } from "lucide-react";

  export default function PrivacyPage() {
    return (
      <div className="min-h-screen py-12" style={{ background: "#0d0f14", color: "rgba(255,255,255,.85)" }}>
        <div className="max-w-3xl mx-auto px-4">
          <Link href="/" className="inline-flex items-center gap-2 mb-8 hover:opacity-70 transition-opacity text-sm" style={{ color: "rgba(255,255,255,.4)" }}>
            <ArrowLeft className="w-4 h-4" /> Back to home
          </Link>
          <div className="flex items-center gap-3 mb-8">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-black font-bold" style={{ background: "linear-gradient(135deg,#d4af37,#ffd700)" }}>Z</div>
            <h1 className="text-3xl font-bold text-white">Privacy Policy</h1>
          </div>
          <p className="text-sm mb-8" style={{ color: "rgba(255,255,255,.35)" }}>Last updated: June 2025</p>
          <div className="space-y-8 text-sm leading-relaxed" style={{ color: "rgba(255,255,255,.7)" }}>
            {[
              { title: "1. Information We Collect", body: "We collect your Discord user ID, username, and server information when you authenticate with our service. We also collect usage data such as commands run, activity logs, and configuration settings for the servers where Zenith is installed." },
              { title: "2. How We Use Your Information", body: "We use your information to provide and improve the Service, process transactions, send administrative notifications, and respond to support requests. We do not sell your personal information to third parties." },
              { title: "3. Data Storage", body: "Your data is stored on secured servers. We implement appropriate technical and organizational security measures to protect your personal data against unauthorized access, alteration, disclosure, or destruction." },
              { title: "4. Data Retention", body: "We retain your data for as long as your account is active or as needed to provide the Service. Server data is retained for the duration the bot remains in your server. You may request deletion of your data at any time." },
              { title: "5. Sharing of Information", body: "We do not share your personal information with third parties except as necessary to provide the Service (e.g., database hosting providers), comply with legal obligations, or protect the rights and safety of our users." },
              { title: "6. Cookies and Tracking", body: "We use session cookies to maintain your login state. We do not use tracking cookies or third-party analytics services that would share your browsing data." },
              { title: "7. Discord Integration", body: "Our Service uses Discord's OAuth2 system for authentication. By logging in, you grant us access to your basic Discord profile information. We only request the minimum permissions necessary for the Service to function." },
              { title: "8. Children's Privacy", body: "Our Service is not directed to children under the age of 13. We do not knowingly collect personal information from children under 13. If you are under 13, please do not use the Service." },
              { title: "9. Your Rights", body: "You have the right to access, correct, or delete your personal data. To exercise these rights, please contact us through our support Discord server. We will respond to your request within 30 days." },
              { title: "10. Changes to This Policy", body: "We may update this Privacy Policy from time to time. We will notify you of significant changes by posting a notice on our website. Continued use of the Service after changes constitutes your acceptance of the updated policy." },
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
  