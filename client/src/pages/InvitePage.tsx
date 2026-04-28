import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Upload,
  Tv2,
  Eye,
  User,
  CheckCircle2,
  ArrowRight,
  Zap,
  Palette,
  TrendingUp,
  Wrench,
  AtSign,
  Loader2,
  Check,
  X,
} from "lucide-react";
import { SiTwitch, SiKick } from "react-icons/si";

const PRIMARY = "#b5f23d";
const PRIMARY_DIM = "rgba(181,242,61,0.12)";
const PRIMARY_GLOW = "rgba(181,242,61,0.25)";
const BG = "#080e17";
const CARD_BG = "#0d1520";
const CARD_BORDER = "#1c2a3a";

const NAV_LINKS = [
  { label: "Features", href: "#features" },
  { label: "Early Access", href: "#early-access" },
  { label: "Pro", href: "#pro" },
];

function smoothScroll(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
}

function GlowDot({ top, left, size = 300, opacity = 0.08 }: { top: string; left: string; size?: number; opacity?: number }) {
  return (
    <div
      className="absolute rounded-full pointer-events-none"
      style={{
        top,
        left,
        width: size,
        height: size,
        background: `radial-gradient(circle, ${PRIMARY} 0%, transparent 70%)`,
        opacity,
        transform: "translate(-50%, -50%)",
        filter: "blur(40px)",
      }}
    />
  );
}

function BenefitCard({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div
      className="group rounded-2xl p-6 flex flex-col gap-3 transition-all duration-300 hover:translate-y-[-2px] cursor-default"
      style={{
        background: CARD_BG,
        border: `1px solid ${CARD_BORDER}`,
        boxShadow: "0 2px 24px rgba(0,0,0,0.4)",
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.borderColor = PRIMARY_GLOW;
        (e.currentTarget as HTMLElement).style.boxShadow = `0 4px 32px ${PRIMARY_GLOW}`;
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.borderColor = CARD_BORDER;
        (e.currentTarget as HTMLElement).style.boxShadow = "0 2px 24px rgba(0,0,0,0.4)";
      }}
    >
      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: PRIMARY_DIM }}>
        <span style={{ color: PRIMARY }}>{icon}</span>
      </div>
      <h3 className="text-white font-bold text-lg leading-snug">{title}</h3>
      <p className="text-gray-400 text-sm leading-relaxed">{text}</p>
    </div>
  );
}

function ProCard({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div
      className="rounded-2xl p-5 flex flex-col gap-2"
      style={{
        background: "rgba(181,242,61,0.05)",
        border: `1px solid rgba(181,242,61,0.18)`,
      }}
    >
      <div className="flex items-center gap-2">
        <span style={{ color: PRIMARY }}>{icon}</span>
        <h4 className="text-white font-semibold text-sm">{title}</h4>
      </div>
      <p className="text-gray-400 text-xs leading-relaxed">{text}</p>
    </div>
  );
}

function UsernameChecker() {
  const [, setLocation] = useLocation();
  const [value, setValue] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "available" | "taken">("idle");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const check = async (username: string) => {
    if (!username || username.length < 2) { setStatus("idle"); return; }
    setStatus("loading");
    try {
      const res = await fetch(`/api/auth/check-username?username=${encodeURIComponent(username)}`);
      const data = await res.json();
      setStatus(data.available ? "available" : "taken");
    } catch {
      setStatus("idle");
    }
  };

  const handleChange = (val: string) => {
    setValue(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setStatus("idle");
    if (val.trim().length >= 2) {
      debounceRef.current = setTimeout(() => check(val.trim()), 600);
    }
  };

  const handleClaim = () => {
    const target = value.trim() ? `/register?username=${encodeURIComponent(value.trim())}` : "/register";
    setLocation(target);
  };

  return (
    <div id="username-checker" className="flex flex-col gap-3 w-full max-w-lg">
      <p className="text-xs font-bold tracking-widest uppercase" style={{ color: PRIMARY }}>Identity</p>
      <h2 className="text-3xl md:text-4xl font-extrabold text-white leading-tight">Choose your alias</h2>

      <div className="mt-2 flex flex-col sm:flex-row gap-3">
        <div
          className="flex items-center flex-1 rounded-xl px-4 py-3 gap-2"
          style={{ background: "#111c29", border: `1.5px solid ${CARD_BORDER}` }}
        >
          <AtSign className="h-4 w-4 flex-shrink-0" style={{ color: PRIMARY }} />
          <input
            type="text"
            placeholder="GamerTag"
            value={value}
            onChange={e => handleChange(e.target.value.replace(/[^a-zA-Z0-9_]/g, ""))}
            maxLength={24}
            className="bg-transparent outline-none text-white placeholder-gray-500 text-sm flex-1 min-w-0"
            onKeyDown={e => e.key === "Enter" && handleClaim()}
          />
          {status === "loading" && <Loader2 className="h-4 w-4 animate-spin text-gray-500" />}
          {status === "available" && <Check className="h-4 w-4 text-green-400" />}
          {status === "taken" && <X className="h-4 w-4 text-red-400" />}
        </div>
        <button
          onClick={handleClaim}
          className="flex items-center justify-center gap-2 rounded-xl px-6 py-3 font-bold text-sm transition-all duration-200 hover:brightness-110 active:scale-95 flex-shrink-0"
          style={{ background: PRIMARY, color: "#080e17" }}
        >
          {status === "available" ? "Claim it" : "Check"} <ArrowRight className="h-4 w-4" />
        </button>
      </div>

      {status === "available" && value && (
        <p className="text-green-400 text-sm font-medium">✓ @{value} is available — grab it now!</p>
      )}
      {status === "taken" && value && (
        <p className="text-red-400 text-sm">@{value} is taken. Try another.</p>
      )}
      {status === "idle" && (
        <p className="text-gray-500 text-xs">Enter a username to see if it's available before you register.</p>
      )}
    </div>
  );
}

export default function InvitePage() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen" style={{ background: BG, color: "white", fontFamily: "inherit" }}>

      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4" style={{ background: "rgba(8,14,23,0.85)", backdropFilter: "blur(12px)", borderBottom: `1px solid ${CARD_BORDER}` }}>
        <span className="font-extrabold text-lg text-white tracking-tight">Gamefolio</span>
        <div className="hidden md:flex items-center gap-6">
          {NAV_LINKS.map(l => (
            <button key={l.label} onClick={() => smoothScroll(l.href.slice(1))} className="text-gray-400 hover:text-white text-sm transition-colors">{l.label}</button>
          ))}
        </div>
        <button
          onClick={() => setLocation("/register")}
          className="rounded-xl px-4 py-2 text-sm font-bold transition-all hover:brightness-110"
          style={{ background: PRIMARY, color: "#080e17" }}
        >
          Create Your Gamefolio
        </button>
      </nav>

      {/* Hero */}
      <section className="relative flex flex-col items-center justify-center text-center px-6 pt-40 pb-28 overflow-hidden">
        <GlowDot top="30%" left="50%" size={600} opacity={0.07} />
        <GlowDot top="10%" left="20%" size={300} opacity={0.05} />
        <GlowDot top="60%" left="80%" size={250} opacity={0.05} />

        <div className="relative z-10 max-w-3xl mx-auto flex flex-col items-center gap-6">
          <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold" style={{ background: PRIMARY_DIM, color: PRIMARY, border: `1px solid rgba(181,242,61,0.3)` }}>
            <Zap className="h-3 w-3" /> Just launched — early users get first pick of usernames
          </div>

          <h1 className="text-5xl sm:text-6xl md:text-7xl font-extrabold leading-[1.05] tracking-tight">
            Build your gaming<br />
            <span style={{ color: PRIMARY }}>profile.</span> Get seen.
          </h1>

          <p className="text-gray-400 text-lg md:text-xl max-w-xl leading-relaxed">
            Gamefolio is a new web app for gamers and streamers to upload clips, connect their Twitch or Kick stream, and grow their audience.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto mt-2">
            <button
              onClick={() => smoothScroll("username-checker")}
              className="rounded-2xl px-8 py-4 font-bold text-base transition-all hover:brightness-110 active:scale-95"
              style={{ background: PRIMARY, color: "#080e17" }}
            >
              Secure your username
            </button>
            <button
              onClick={() => setLocation("/upload")}
              className="rounded-2xl px-8 py-4 font-bold text-base border transition-all hover:bg-white/5"
              style={{ borderColor: CARD_BORDER, color: "white" }}
            >
              Upload your first clip
            </button>
          </div>

          <p className="text-gray-500 text-sm max-w-sm">
            We just launched. Early users get first pick of usernames and more visibility while the platform grows.
          </p>
        </div>
      </section>

      {/* Benefits */}
      <section id="features" className="px-6 py-20 max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-3">What you can do on Gamefolio</h2>
          <p className="text-gray-400 text-base max-w-lg mx-auto">Everything you need to build your presence as a gamer or streamer — in one place.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <BenefitCard icon={<Upload className="h-5 w-5" />} title="Upload your clips" text="Keep your best gaming moments in one place and never lose them in group chats again." />
          <BenefitCard icon={<Tv2 className="h-5 w-5" />} title="Connect your stream" text="Connect Twitch or Kick so your live stream can appear on your Gamefolio profile." />
          <BenefitCard icon={<Eye className="h-5 w-5" />} title="Get exposure" text="Share your content with us and we may feature your clips on our social channels." />
          <BenefitCard icon={<User className="h-5 w-5" />} title="Own your profile" text="Create a profile that shows who you are as a gamer, streamer, or creator." />
        </div>
      </section>

      {/* Problem section */}
      <section className="px-6 py-20 relative overflow-hidden">
        <GlowDot top="50%" left="50%" size={500} opacity={0.06} />
        <div className="relative z-10 max-w-2xl mx-auto text-center flex flex-col items-center gap-6">
          <h2 className="text-4xl md:text-5xl font-extrabold leading-tight">
            Streaming to <span style={{ color: PRIMARY }}>1 or 2 viewers?</span>
          </h2>
          <p className="text-gray-400 text-lg leading-relaxed">
            You're not the problem. Discovery is. Gamefolio is being built to help smaller streamers and gamers get seen.
          </p>
          <div className="flex items-center gap-3 text-gray-400 text-sm flex-wrap justify-center">
            <span className="flex items-center gap-1.5"><SiTwitch className="h-4 w-4 text-purple-400" /> Twitch</span>
            <span className="text-gray-600">+</span>
            <span className="flex items-center gap-1.5"><SiKick className="h-4 w-4 text-green-400" /> Kick</span>
            <span className="text-gray-600">→ your Gamefolio profile</span>
          </div>
          <button
            onClick={() => setLocation("/register")}
            className="rounded-2xl px-8 py-4 font-bold text-base transition-all hover:brightness-110 active:scale-95 mt-2"
            style={{ background: PRIMARY, color: "#080e17" }}
          >
            Create your free account
          </button>
        </div>
      </section>

      {/* Early access */}
      <section id="early-access" className="px-6 py-20 max-w-5xl mx-auto">
        <div
          className="rounded-3xl p-8 md:p-12 flex flex-col md:flex-row gap-10 items-start"
          style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}` }}
        >
          <div className="flex flex-col gap-4 flex-1">
            <p className="text-xs font-bold tracking-widest uppercase" style={{ color: PRIMARY }}>Early Access</p>
            <h2 className="text-3xl md:text-4xl font-extrabold text-white leading-tight">We've just launched</h2>
            <p className="text-gray-400 text-base leading-relaxed">
              Secure your username, start building your profile, upload your clips, and be part of Gamefolio from the beginning.
            </p>
          </div>
          <div className="flex flex-col gap-4 flex-1">
            {[
              "First pick of usernames",
              "More visibility while the platform grows",
              "Help shape what we build next",
            ].map(point => (
              <div key={point} className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: PRIMARY_DIM }}>
                  <CheckCircle2 className="h-3 w-3" style={{ color: PRIMARY }} />
                </div>
                <span className="text-gray-300 text-sm">{point}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Username checker */}
      <section className="px-6 py-20 relative overflow-hidden">
        <GlowDot top="50%" left="30%" size={400} opacity={0.07} />
        <div className="relative z-10 max-w-5xl mx-auto flex flex-col md:flex-row items-center gap-12">
          <div className="flex-1">
            <UsernameChecker />
          </div>
          <div className="flex-1 hidden md:flex flex-col gap-4">
            <div className="rounded-2xl p-5 flex flex-col gap-2" style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}` }}>
              <p className="text-gray-400 text-xs">Profile URL</p>
              <p className="text-white font-mono text-sm">gamefolio.gg/<span style={{ color: PRIMARY }}>yourusername</span></p>
            </div>
            <div className="rounded-2xl p-5 flex flex-col gap-2" style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}` }}>
              <p className="text-gray-400 text-xs">What you get</p>
              <div className="flex flex-col gap-1.5">
                {["Your own public profile", "Clip gallery", "Stream integration", "Community exposure"].map(i => (
                  <div key={i} className="flex items-center gap-2 text-gray-300 text-xs">
                    <span style={{ color: PRIMARY }}>✓</span> {i}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pro section */}
      <section id="pro" className="px-6 py-20 max-w-5xl mx-auto">
        <div
          className="rounded-3xl p-8 md:p-12 relative overflow-hidden"
          style={{
            background: "linear-gradient(135deg, #0d1520 0%, #111e2c 100%)",
            border: `1px solid rgba(181,242,61,0.25)`,
            boxShadow: `0 0 60px rgba(181,242,61,0.08)`,
          }}
        >
          <GlowDot top="0%" left="100%" size={400} opacity={0.08} />
          <div className="relative z-10 flex flex-col gap-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div className="flex flex-col gap-2">
                <p className="text-xs font-bold tracking-widest uppercase" style={{ color: PRIMARY }}>Gamefolio Pro</p>
                <h2 className="text-3xl md:text-4xl font-extrabold text-white leading-tight">Want to grow faster?</h2>
                <p className="text-gray-400">Upgrade to Gamefolio Pro and take your content further.</p>
              </div>
              <div className="flex flex-col items-start md:items-end gap-1 flex-shrink-0">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-extrabold" style={{ color: PRIMARY }}>Free</span>
                  <span className="text-gray-400 text-sm">during early access</span>
                </div>
                <p className="text-gray-500 text-xs">Start free. Upgrade anytime.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <ProCard icon={<TrendingUp className="h-4 w-4" />} title="More exposure" text="Priority opportunities to have your clips featured on Gamefolio social channels." />
              <ProCard icon={<Wrench className="h-4 w-4" />} title="Advanced clip tools" text="More control over how you upload, organise, and showcase your gaming content." />
              <ProCard icon={<Palette className="h-4 w-4" />} title="Profile customisation" text="Unlock extra ways to customise your Gamefolio profile and stand out." />
              <ProCard icon={<Tv2 className="h-4 w-4" />} title="Built for serious streamers" text="Extra features designed for streamers who want to grow their audience." />
            </div>

            <button
              onClick={() => setLocation("/register")}
              className="self-start rounded-2xl px-8 py-4 font-bold text-base transition-all hover:brightness-110 active:scale-95"
              style={{ background: PRIMARY, color: "#080e17" }}
            >
              Start free
            </button>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-6 py-24 text-center relative overflow-hidden">
        <GlowDot top="50%" left="50%" size={700} opacity={0.07} />
        <div className="relative z-10 max-w-2xl mx-auto flex flex-col items-center gap-6">
          <h2 className="text-4xl md:text-5xl font-extrabold leading-tight">
            Start building your<br /><span style={{ color: PRIMARY }}>Gamefolio</span> today
          </h2>
          <p className="text-gray-400 text-lg">
            Upload your clips. Connect your stream. Secure your username before someone else does.
          </p>
          <button
            onClick={() => setLocation("/register")}
            className="rounded-2xl px-10 py-4 font-bold text-lg transition-all hover:brightness-110 active:scale-95"
            style={{ background: PRIMARY, color: "#080e17" }}
          >
            Create your free account
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-10 text-center" style={{ borderTop: `1px solid ${CARD_BORDER}` }}>
        <p className="text-gray-500 text-sm">Gamefolio helps gamers, streamers, and creators get seen.</p>
      </footer>
    </div>
  );
}
