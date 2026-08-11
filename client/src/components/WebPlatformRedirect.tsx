import { useState } from "react";
import { openExternal } from "@/lib/platform";
import {
  Globe, Copy, Check, Wallet, Layers, Trophy,
  ShoppingBag, Star, Shield, ExternalLink, Sparkles,
} from "lucide-react";

const DEFAULT_URL = "https://app.gamefolio.com";

const NEON = "#B7FF18";

const FEATURE_LIST = [
  { icon: Wallet,       label: "Wallet Management" },
  { icon: Layers,       label: "Digital Collectibles" },
  { icon: Trophy,       label: "Creator Campaign Rewards" },
  { icon: ShoppingBag,  label: "NFT Marketplace" },
  { icon: Star,         label: "Gamefolio Store" },
  { icon: Shield,       label: "Profile Customisation" },
];

function IllustrationIcon({ icon: Icon, style }: { icon: any; style?: React.CSSProperties }) {
  return (
    <div
      className="w-10 h-10 rounded-xl flex items-center justify-center"
      style={{ background: "rgba(183,255,24,0.1)", border: "1px solid rgba(183,255,24,0.25)", ...style }}
    >
      <Icon className="w-5 h-5" style={{ color: NEON }} />
    </div>
  );
}

function Illustration() {
  return (
    <div className="relative flex items-center justify-center h-40 mb-2 select-none">
      {/* Outer glow pulse */}
      <div
        className="absolute w-32 h-32 rounded-full animate-pulse"
        style={{ background: "radial-gradient(circle, rgba(183,255,24,0.12) 0%, transparent 70%)" }}
      />

      {/* Central browser window mockup */}
      <div
        className="relative rounded-2xl overflow-hidden z-10"
        style={{
          width: 120, height: 86,
          background: "rgba(11,19,25,0.9)",
          border: "1.5px solid rgba(183,255,24,0.35)",
          boxShadow: "0 0 32px rgba(183,255,24,0.15)",
        }}
      >
        {/* Browser chrome bar */}
        <div
          className="flex items-center gap-1 px-2 py-1.5"
          style={{ background: "rgba(183,255,24,0.08)", borderBottom: "1px solid rgba(183,255,24,0.15)" }}
        >
          <div className="w-1.5 h-1.5 rounded-full bg-red-400/60" />
          <div className="w-1.5 h-1.5 rounded-full bg-yellow-400/60" />
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: NEON, opacity: 0.8 }} />
          <div
            className="flex-1 rounded-sm h-2 ml-1 flex items-center justify-center overflow-hidden"
            style={{ background: "rgba(255,255,255,0.06)" }}
          >
            <span className="text-[5px] font-bold tracking-tight truncate px-1" style={{ color: "rgba(183,255,24,0.7)" }}>
              app.gamefolio.com
            </span>
          </div>
        </div>
        {/* Browser body */}
        <div className="p-2 flex flex-col gap-1">
          {/* Gamefolio "G" logo placeholder */}
          <div className="flex items-center gap-1.5 mb-1">
            <div
              className="w-5 h-5 rounded-md flex items-center justify-center font-black text-[9px]"
              style={{ background: NEON, color: "#0B1319" }}
            >
              G
            </div>
            <div className="flex flex-col gap-0.5">
              <div className="h-1.5 w-12 rounded-full" style={{ background: "rgba(255,255,255,0.15)" }} />
              <div className="h-1 w-8 rounded-full" style={{ background: "rgba(255,255,255,0.08)" }} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-1">
            {[1, 2, 3].map(i => (
              <div
                key={i}
                className="aspect-square rounded"
                style={{ background: i === 1 ? "rgba(183,255,24,0.2)" : "rgba(255,255,255,0.05)" }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Floating icons */}
      <div className="absolute" style={{ left: "calc(50% - 78px)", top: "18px" }}>
        <IllustrationIcon icon={Wallet} />
      </div>
      <div className="absolute" style={{ right: "calc(50% - 78px)", top: "18px" }}>
        <IllustrationIcon icon={Layers} />
      </div>
      <div className="absolute" style={{ bottom: "6px", left: "calc(50% - 72px)" }}>
        <IllustrationIcon icon={ShoppingBag} />
      </div>
      <div className="absolute" style={{ bottom: "6px", right: "calc(50% - 72px)" }}>
        <IllustrationIcon icon={Star} />
      </div>

      {/* Arrow lines */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        viewBox="0 0 320 160"
        fill="none"
      >
        <path d="M 85 42 Q 100 60 122 60" stroke={NEON} strokeWidth="0.8" strokeOpacity="0.3" strokeDasharray="2 3" />
        <path d="M 235 42 Q 220 60 198 60" stroke={NEON} strokeWidth="0.8" strokeOpacity="0.3" strokeDasharray="2 3" />
        <path d="M 90 122 Q 106 104 122 96" stroke={NEON} strokeWidth="0.8" strokeOpacity="0.3" strokeDasharray="2 3" />
        <path d="M 230 122 Q 214 104 198 96" stroke={NEON} strokeWidth="0.8" strokeOpacity="0.3" strokeDasharray="2 3" />
      </svg>
    </div>
  );
}

export interface WebPlatformRedirectProps {
  title?: string;
  description?: string;
  url?: string;
}

export function WebPlatformRedirect({
  title = "Web3 Features Available on Web",
  description,
  url = DEFAULT_URL,
}: WebPlatformRedirectProps) {
  const [copied, setCopied] = useState(false);

  const handleOpen = () => openExternal(url);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = url;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const defaultDescription =
    "For the best experience, Gamefolio's wallet, marketplace, NFT, and reward features are available through our web platform. Access everything securely at:";

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-5 py-10 relative overflow-hidden"
      style={{ background: "#0B1319" }}
    >
      {/* Background ambient glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full blur-[120px]"
          style={{ background: "rgba(183,255,24,0.06)" }}
        />
        <div
          className="absolute bottom-0 right-0 w-64 h-64 rounded-full blur-[80px]"
          style={{ background: "rgba(120,40,200,0.07)" }}
        />
      </div>

      <div className="relative w-full max-w-sm flex flex-col items-center">
        <Illustration />

        {/* Main glass card */}
        <div
          className="w-full rounded-3xl p-6 relative overflow-hidden"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(183,255,24,0.18)",
            backdropFilter: "blur(20px)",
          }}
        >
          {/* Corner accent */}
          <div
            className="absolute top-0 right-0 w-32 h-32 rounded-full pointer-events-none"
            style={{
              background: "radial-gradient(ellipse, rgba(183,255,24,0.08) 0%, transparent 70%)",
              transform: "translate(30%, -30%)",
            }}
          />

          {/* Tag */}
          <div className="flex items-center gap-1.5 mb-3">
            <Sparkles className="w-3 h-3" style={{ color: NEON }} />
            <span
              className="text-[9px] font-black uppercase tracking-[2px]"
              style={{ color: NEON }}
            >
              Web Platform
            </span>
          </div>

          {/* Title */}
          <h1 className="text-xl font-black text-white leading-snug mb-3">{title}</h1>

          {/* Description */}
          <p className="text-sm text-gray-400 leading-relaxed mb-4">
            {description ?? defaultDescription}
          </p>

          {/* URL pill */}
          <div
            className="flex items-center gap-2 rounded-xl px-3 py-2 mb-5"
            style={{ background: "rgba(183,255,24,0.08)", border: "1px solid rgba(183,255,24,0.2)" }}
          >
            <Globe className="w-3.5 h-3.5 flex-shrink-0" style={{ color: NEON }} />
            <span className="text-sm font-bold" style={{ color: NEON }}>
              {url.replace(/^https?:\/\//, "")}
            </span>
          </div>

          {/* Feature checklist */}
          <div className="grid grid-cols-1 gap-2">
            {FEATURE_LIST.map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-2.5">
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: "rgba(183,255,24,0.12)" }}
                >
                  <Check className="w-3 h-3" style={{ color: NEON }} />
                </div>
                <span className="text-sm text-gray-300">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="w-full mt-4 space-y-3">
          <button
            onClick={handleOpen}
            className="w-full py-4 rounded-2xl font-black text-base flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
            style={{
              background: NEON,
              color: "#0B1319",
              boxShadow: "0 12px 40px rgba(183,255,24,0.3)",
            }}
          >
            <ExternalLink className="w-5 h-5" />
            Open Web Platform
          </button>

          <button
            onClick={handleCopy}
            className="w-full py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.1)",
              color: copied ? NEON : "rgba(255,255,255,0.7)",
            }}
          >
            {copied ? (
              <>
                <Check className="w-4 h-4" style={{ color: NEON }} />
                Link Copied!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                Copy Link
              </>
            )}
          </button>
        </div>

        {/* Fine print */}
        <p className="text-xs text-gray-600 text-center mt-5 leading-relaxed px-4">
          Web3 features require our web platform for the best experience and full functionality.
        </p>
      </div>
    </div>
  );
}

export default WebPlatformRedirect;
