import { useState, useRef } from "react";
import { useLocation } from "wouter";
import {
  Upload,
  Tv2,
  Eye,
  User,
  CheckCircle2,
  ArrowRight,
  Zap,
  AtSign,
  Loader2,
  Check,
  X,
} from "lucide-react";
import { SiTwitch, SiKick } from "react-icons/si";
import proHeroImage from "@assets/gamefoliopromo_1771795835901.png";

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
    <div className="flex flex-col items-center gap-3 w-full text-center">
      <p className="text-xs font-bold tracking-widest uppercase" style={{ color: PRIMARY }}>Identity</p>
      <h2 className="text-3xl md:text-4xl font-extrabold text-white leading-tight">Choose your alias</h2>

      <div className="mt-2 flex flex-col sm:flex-row gap-3 w-full max-w-lg">
        <div
          className="flex items-center flex-1 rounded-xl px-4 py-3 gap-2"
          style={{ background: "#111c29", border: `1.5px solid ${CARD_BORDER}` }}
        >
          <AtSign className="h-4 w-4 flex-shrink-0" style={{ color: PRIMARY }} />
          <input
            type="text"
            placeholder="username"
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

      <p className="text-gray-500 text-xs font-mono mt-1">
        gamefolio.gg/<span style={{ color: PRIMARY }}>{value || "yourusername"}</span>
      </p>
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
      <section className="relative px-6 pt-40 pb-28 overflow-hidden">
        <GlowDot top="30%" left="50%" size={600} opacity={0.07} />
        <GlowDot top="10%" left="20%" size={300} opacity={0.05} />
        <GlowDot top="60%" left="80%" size={250} opacity={0.05} />

        <div className="relative z-10 max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="flex flex-col items-start gap-6 text-left max-w-2xl">
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

          <div className="relative w-full">
            {/* Abstract green background shape — off-centre for depth */}
            <div
              className="absolute rounded-3xl"
              style={{
                background: "linear-gradient(135deg, #B7FF1A 0%, #7ec800 60%, #4a8a00 100%)",
                width: "88%",
                height: "92%",
                bottom: "-18px",
                right: "-22px",
                transform: "rotate(3.5deg) skewX(-1deg)",
                zIndex: 0,
                opacity: 0.92,
                filter: "blur(0px)",
                boxShadow: "0 0 60px 8px rgba(183,255,26,0.25), 0 20px 60px rgba(0,0,0,0.5)",
              }}
            />
            {/* Secondary smaller accent shard */}
            <div
              className="absolute rounded-2xl"
              style={{
                background: "#B7FF1A",
                width: "40%",
                height: "30%",
                top: "-12px",
                right: "-14px",
                transform: "rotate(-5deg)",
                zIndex: 0,
                opacity: 0.18,
                filter: "blur(2px)",
              }}
            />
            <div className="relative rounded-3xl overflow-hidden border shadow-2xl" style={{ borderColor: "rgba(183,255,26,0.25)", background: CARD_BG, zIndex: 1 }}>
              <video
                src="/promo-hero.mp4"
                autoPlay
                loop
                muted
                playsInline
                className="w-full h-[380px] md:h-[500px] object-cover"
              />
            </div>
          </div>
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
      <section id="username-checker" className="px-6 py-20 relative overflow-hidden">
        <GlowDot top="50%" left="50%" size={500} opacity={0.07} />
        <div className="relative z-10 max-w-2xl mx-auto flex flex-col items-center gap-10">
          <UsernameChecker />

          {/* What you get — centred below the checker */}
          <div className="rounded-2xl p-5 flex flex-col gap-2 w-full max-w-sm" style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}` }}>
            <p className="text-gray-400 text-xs text-center">What you get</p>
            <div className="flex flex-col gap-1.5 items-center">
              {["Your own public profile", "Clip gallery", "Stream integration", "Community exposure"].map(i => (
                <div key={i} className="flex items-center gap-2 text-gray-300 text-xs">
                  <span style={{ color: PRIMARY }}>✓</span> {i}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Pro section */}
      <section id="pro" className="px-6 py-20 max-w-6xl mx-auto">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-bold mb-4" style={{ background: PRIMARY_DIM, color: PRIMARY, border: `1px solid rgba(181,242,61,0.3)` }}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path fillRule="evenodd" clipRule="evenodd" d="M13.3953 9.55057L13.524 8.28791C13.5926 7.61391 13.6373 7.16924 13.602 6.88858H13.6153C14.196 6.88858 14.6673 6.39124 14.6673 5.77791C14.6673 5.16458 14.196 4.66658 13.6146 4.66658C13.0333 4.66658 12.562 5.16391 12.562 5.77791C12.562 6.05524 12.6586 6.30924 12.818 6.50391C12.5893 6.65258 12.29 6.96724 11.8393 7.44058C11.4926 7.80524 11.3193 7.98724 11.126 8.01591C11.0186 8.03123 10.909 8.01502 10.8106 7.96924C10.632 7.88658 10.5126 7.66124 10.2746 7.20991L9.01864 4.83325C8.87197 4.55525 8.74864 4.32258 8.63731 4.13525C9.09264 3.88991 9.40397 3.39058 9.40397 2.81525C9.40397 1.99592 8.77597 1.33325 8.00064 1.33325C7.22531 1.33325 6.59731 1.99658 6.59731 2.81458C6.59731 3.39058 6.90864 3.88991 7.36398 4.13458C7.25264 4.32258 7.12998 4.55525 6.98264 4.83325L5.72731 7.21058C5.48864 7.66124 5.36931 7.88658 5.19065 7.96991C5.09227 8.01568 4.98272 8.0319 4.87531 8.01657C4.68198 7.98791 4.50865 7.80524 4.16198 7.44058C3.71131 6.96724 3.41198 6.65258 3.18331 6.50391C3.34331 6.30924 3.43931 6.05524 3.43931 5.77725C3.43931 5.16458 2.96732 4.66658 2.38598 4.66658C1.80598 4.66658 1.33398 5.16391 1.33398 5.77791C1.33398 6.39124 1.80532 6.88858 2.38665 6.88858H2.39932C2.36332 7.16858 2.40865 7.61391 2.47732 8.28791L2.60598 9.55057C2.67732 10.2512 2.73665 10.9179 2.80998 11.5186H13.1913C13.2646 10.9186 13.324 10.2512 13.3953 9.55057Z" fill={PRIMARY}/><path fillRule="evenodd" clipRule="evenodd" d="M7.23731 14.6666H8.76397C10.754 14.6666 11.7493 14.6666 12.4133 14.0399C12.7026 13.7652 12.8866 13.2719 13.0186 12.6292H2.98265C3.11465 13.2719 3.29798 13.7652 3.58798 14.0392C4.25198 14.6666 5.24731 14.6666 7.23731 14.6666Z" fill={PRIMARY}/></svg>
            Gamefolio Pro
          </div>
          <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-3">
            Unlock <span style={{ color: PRIMARY }}>Gamefolio Pro</span>
          </h2>
          <p className="text-gray-400 text-base max-w-lg mx-auto">Premium features designed for elite creators who want to stand out and grow.</p>
        </div>

        <div
          className="rounded-3xl overflow-hidden relative"
          style={{
            background: "linear-gradient(135deg, #0d1520 0%, #0a1118 100%)",
            border: `1px solid rgba(181,242,61,0.2)`,
            boxShadow: `0 0 80px rgba(181,242,61,0.07), 0 40px 80px rgba(0,0,0,0.5)`,
          }}
        >
          <div className="flex flex-col md:flex-row">
            {/* Left — hero image panel */}
            <div className="relative md:w-[42%] min-h-[280px] md:min-h-[520px] flex-shrink-0 overflow-hidden">
              <img
                src={proHeroImage}
                alt="Gamefolio Pro"
                className="absolute inset-0 w-full h-full object-cover"
                style={{ objectPosition: "center 70%" }}
              />
              <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(8,14,23,0.95) 0%, rgba(8,14,23,0.4) 50%, transparent 100%)" }} />
              <div className="absolute inset-0 hidden md:block" style={{ background: "linear-gradient(to right, transparent 60%, rgba(13,21,32,0.9) 100%)" }} />

              <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
                <div className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 mb-3 text-xs font-bold uppercase tracking-wider" style={{ background: "rgba(181,242,61,0.15)", border: "1px solid rgba(181,242,61,0.3)", color: PRIMARY }}>
                  Exclusive Offer
                </div>
                <h3 className="text-2xl font-extrabold text-white leading-tight mb-1">
                  Elite gaming<br />identity
                </h3>
                <p className="text-gray-400 text-sm max-w-[240px]">Everything you need to stand out and grow your audience.</p>
              </div>
            </div>

            {/* Right — benefits + CTA */}
            <div className="flex-1 flex flex-col gap-6 p-6 md:p-10">
              <div className="grid grid-cols-1 gap-3">
                {[
                  {
                    title: "Unlimited upload space",
                    description: "Share clips without limits or storage restrictions",
                    icon: (
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M12 16V8M12 8L9 11M12 8L15 11" stroke={PRIMARY} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M22 12C22 17.523 17.523 22 12 22C6.477 22 2 17.523 2 12C2 6.477 6.477 2 12 2C17.523 2 22 6.477 22 12Z" stroke={PRIMARY} strokeWidth="1.5"/></svg>
                    ),
                  },
                  {
                    title: "Animated profile customisation",
                    description: "Custom banners, borders & neon effects",
                    icon: (
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M9 3.5V2M15 3.5V2M9 21.5V20M15 21.5V20M20.5 9H22M20.5 15H22M3.5 9H2M3.5 15H2M12 8L13.5 11H16L14 13.5L15 17L12 15L9 17L10 13.5L8 11H10.5L12 8Z" stroke={PRIMARY} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    ),
                  },
                  {
                    title: "100s of exclusive assets",
                    description: "Premium stickers, badges & unique themes",
                    icon: (
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M12 21C12 21 3 13.5 3 8.5C3 5.42 5.42 3 8.5 3C10.24 3 11.91 3.81 12 5C12.09 3.81 13.76 3 15.5 3C18.58 3 21 5.42 21 8.5C21 13.5 12 21 12 21Z" stroke={PRIMARY} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    ),
                  },
                  {
                    title: "Store discounts",
                    description: "Save up to 20% on games and merchandise",
                    icon: (
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M9 15L15 9M21.41 11.41L12.58 2.58C12.21 2.21 11.7 2 11.17 2H4C2.9 2 2 2.9 2 4V11.17C2 11.7 2.21 12.21 2.59 12.58L11.41 21.41C12.19 22.2 13.45 22.2 14.24 21.41L21.41 14.24C22.2 13.45 22.2 12.19 21.41 11.41Z" stroke={PRIMARY} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><circle cx="7" cy="7" r="1.5" fill={PRIMARY}/></svg>
                    ),
                  },
                  {
                    title: "Ad-free experience",
                    description: "Pro subscribers are exempt from all video ads",
                    icon: (
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M12 22C17.523 22 22 17.523 22 12C22 6.477 17.523 2 12 2C6.477 2 2 6.477 2 12C2 17.523 6.477 22 12 22Z" stroke={PRIMARY} strokeWidth="1.5"/><path d="M4 4L20 20" stroke={PRIMARY} strokeWidth="1.5" strokeLinecap="round"/><path d="M10 9V15L15 12L10 9Z" stroke={PRIMARY} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    ),
                  },
                ].map((benefit) => (
                  <div
                    key={benefit.title}
                    className="flex items-start gap-3 rounded-xl p-4"
                    style={{ background: "rgba(181,242,61,0.04)", border: "1px solid rgba(181,242,61,0.1)" }}
                  >
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "rgba(181,242,61,0.1)" }}>
                      {benefit.icon}
                    </div>
                    <div>
                      <p className="text-white font-semibold text-sm">{benefit.title}</p>
                      <p className="text-gray-400 text-xs leading-relaxed mt-0.5">{benefit.description}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex flex-col gap-3 pt-2">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold" style={{ color: PRIMARY }}>Free</span>
                  <span className="text-gray-400 text-sm">during early access</span>
                </div>
                <button
                  onClick={() => setLocation("/register")}
                  className="w-full rounded-2xl h-14 font-bold text-base transition-all hover:brightness-110 active:scale-95 flex items-center justify-center gap-2"
                  style={{ background: PRIMARY, color: "#080e17", boxShadow: "0 10px 30px -8px rgba(181,242,61,0.5)" }}
                >
                  Unlock Pro — Start free <ArrowRight className="h-5 w-5" />
                </button>
                <p className="text-gray-500 text-xs text-center">No credit card required. Upgrade anytime.</p>
              </div>
            </div>
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
