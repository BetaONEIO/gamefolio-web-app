import { useEffect } from "react";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import RegisterForm from "@/components/auth/register-form";
import proHeroImage from "@assets/gamefoliopromo_1771795835901.png";

const PRIMARY = "#B7FF1A";
const BG = "#03080A";
const CARD_BG = "#0B1218";
const CARD_BORDER = "#1B2A33";

export default function RegisterPage() {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (user && !isLoading) {
      setLocation("/");
    }
  }, [user, isLoading, setLocation]);

  if (isLoading) return null;
  if (user) return null;

  return (
    <div
      className="min-h-screen w-full flex"
      style={{ background: BG, fontFamily: "'Space Grotesk', sans-serif" }}
    >
      {/* Left panel — promo image */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden flex-col">
        {/* Neon glow backdrop */}
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(135deg, ${BG} 0%, #0a1a0a 40%, #071a07 100%)`,
          }}
        />
        <div
          className="absolute bottom-0 right-0 w-3/4 h-3/4 rounded-full pointer-events-none"
          style={{
            background: `radial-gradient(circle, rgba(183,255,26,0.12) 0%, transparent 70%)`,
          }}
        />

        {/* Logo */}
        <div className="relative z-10 p-8">
          <Link href="/">
            <span
              className="text-xl font-extrabold tracking-tight cursor-pointer"
              style={{ color: PRIMARY }}
            >
              Gamefolio
            </span>
          </Link>
        </div>

        {/* Promo image */}
        <div className="relative z-10 flex-1 flex items-center justify-center px-10 pb-10">
          <div className="relative w-full max-w-md">
            {/* Offset green shape behind image */}
            <div
              className="absolute rounded-3xl"
              style={{
                background: PRIMARY,
                width: "85%",
                height: "90%",
                bottom: "-16px",
                right: "-16px",
                zIndex: 0,
                opacity: 0.9,
              }}
            />
            <div
              className="relative rounded-3xl overflow-hidden border shadow-2xl"
              style={{
                borderColor: "rgba(183,255,26,0.2)",
                background: CARD_BG,
                zIndex: 1,
              }}
            >
              <img
                src={proHeroImage}
                alt="Gamefolio Pro"
                className="w-full object-cover"
              />
            </div>
          </div>
        </div>

        {/* Bottom tagline */}
        <div className="relative z-10 px-10 pb-10">
          <p className="text-white/60 text-sm leading-relaxed max-w-xs">
            Upload clips, connect your stream, build your profile — all in one place.
          </p>
        </div>
      </div>

      {/* Right panel — registration form */}
      <div
        className="flex-1 lg:w-1/2 flex flex-col overflow-y-auto"
        style={{ background: CARD_BG }}
      >
        {/* Mobile logo */}
        <div className="lg:hidden p-6 pb-0">
          <Link href="/">
            <span
              className="text-lg font-extrabold tracking-tight cursor-pointer"
              style={{ color: PRIMARY }}
            >
              Gamefolio
            </span>
          </Link>
        </div>

        <div className="flex-1 flex flex-col justify-center px-6 sm:px-10 lg:px-14 py-10">
          <div className="w-full max-w-md mx-auto">
            {/* Header */}
            <div className="mb-8">
              <div
                className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold mb-4"
                style={{
                  background: "rgba(183,255,26,0.12)",
                  color: PRIMARY,
                  border: "1px solid rgba(183,255,26,0.25)",
                }}
              >
                <span className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ background: PRIMARY }} />
                Free during early access
              </div>
              <h1 className="text-3xl font-extrabold text-white mb-2 tracking-tight">
                Create your account
              </h1>
              <p className="text-gray-400 text-sm">
                Already have an account?{" "}
                <Link href="/auth">
                  <span
                    className="font-semibold cursor-pointer hover:underline"
                    style={{ color: PRIMARY }}
                  >
                    Sign in
                  </span>
                </Link>
              </p>
            </div>

            {/* Registration form — reuses the existing validated component */}
            <div
              className="rounded-2xl p-6 sm:p-8"
              style={{
                background: BG,
                border: `1px solid ${CARD_BORDER}`,
              }}
            >
              <RegisterForm onSuccess={() => {}} />
            </div>

            <p className="text-center text-gray-600 text-xs mt-6">
              By creating an account you agree to our{" "}
              <Link href="/terms">
                <span className="hover:underline cursor-pointer" style={{ color: PRIMARY }}>
                  Terms
                </span>
              </Link>{" "}
              &amp;{" "}
              <Link href="/privacy">
                <span className="hover:underline cursor-pointer" style={{ color: PRIMARY }}>
                  Privacy Policy
                </span>
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
