import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Gamepad2, Users, Trophy, Star, Loader2 } from "lucide-react";
import logoGreen from "@assets/gamefolio-logo-green.png";

interface InviterProfile {
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  referralCode: string;
}

export default function ReferralInvitePage() {
  const { code } = useParams<{ code: string }>();
  const [, setLocation] = useLocation();

  const { data: inviter, isLoading, isError } = useQuery<InviterProfile>({
    queryKey: ['/api/invite', code],
    queryFn: async () => {
      const res = await fetch(`/api/invite/${encodeURIComponent(code ?? '')}`);
      if (!res.ok) throw new Error("Not found");
      return res.json();
    },
    enabled: !!code,
    retry: false,
  });

  const handleJoin = () => {
    setLocation(`/auth?ref=${encodeURIComponent(inviter?.referralCode ?? code ?? '')}`);
  };

  const displayName = inviter?.displayName || inviter?.username || "A Gamefolio player";
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 py-12 relative overflow-hidden"
      style={{
        background: "linear-gradient(135deg, #0a1520 0%, #0d1f2d 50%, #0a1a10 100%)",
      }}
    >
      {/* Subtle background glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(183,255,26,0.07) 0%, transparent 70%)",
        }}
      />

      {/* Logo */}
      <div className="mb-10 flex items-center gap-2 z-10">
        <img src={logoGreen} alt="Gamefolio" className="h-8 w-auto" />
        <span className="text-white font-bold text-xl tracking-tight">Gamefolio</span>
      </div>

      {/* Card */}
      <div
        className="relative z-10 w-full max-w-sm rounded-2xl p-8 flex flex-col items-center text-center shadow-2xl"
        style={{
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(183,255,26,0.2)",
          backdropFilter: "blur(20px)",
        }}
      >
        {isLoading ? (
          <div className="py-12 flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground text-sm">Loading invite...</p>
          </div>
        ) : isError ? (
          <div className="py-8 flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
              <Gamepad2 className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-white font-semibold">Invite not found</p>
            <p className="text-muted-foreground text-sm">This invite link may be invalid or expired.</p>
            <Button
              onClick={() => setLocation("/auth")}
              className="mt-2 bg-primary hover:bg-primary/90 text-black font-semibold rounded-full px-8"
            >
              Join Gamefolio anyway
            </Button>
          </div>
        ) : (
          <>
            {/* Avatar */}
            <div
              className="relative mb-6"
              style={{ filter: "drop-shadow(0 0 20px rgba(183,255,26,0.35))" }}
            >
              <div className="w-24 h-24 rounded-full overflow-hidden border-2 flex items-center justify-center"
                style={{ borderColor: "#B7FF1A" }}>
                {inviter?.avatarUrl ? (
                  <img
                    src={inviter.avatarUrl}
                    alt={displayName}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                ) : (
                  <div
                    className="w-full h-full flex items-center justify-center text-3xl font-bold"
                    style={{ background: "rgba(183,255,26,0.15)", color: "#B7FF1A" }}
                  >
                    {initial}
                  </div>
                )}
              </div>
            </div>

            {/* Invite text */}
            <h1 className="text-white text-2xl font-bold mb-1 leading-tight">
              {displayName}
            </h1>
            <p className="text-sm mb-1" style={{ color: "#B7FF1A" }}>
              @{inviter?.username}
            </p>
            <p className="text-muted-foreground text-sm mb-6">
              invites you to join Gamefolio
            </p>

            {/* CTA */}
            <Button
              onClick={handleJoin}
              size="lg"
              className="w-full rounded-full font-bold text-base py-6 text-black"
              style={{ background: "#B7FF1A" }}
            >
              Accept Invite &amp; Join Free
            </Button>

            <p className="text-xs text-muted-foreground mt-3">
              You'll both earn XP when you sign up
            </p>
          </>
        )}
      </div>

      {/* Feature pills */}
      {!isLoading && !isError && (
        <div className="z-10 mt-8 flex flex-wrap justify-center gap-3 max-w-sm">
          {[
            { icon: Gamepad2, label: "Share gaming clips" },
            { icon: Trophy, label: "Earn XP & level up" },
            { icon: Users, label: "Follow gamers" },
            { icon: Star, label: "Build your portfolio" },
          ].map(({ icon: Icon, label }) => (
            <div
              key={label}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs text-white/70"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
            >
              <Icon className="h-3.5 w-3.5" style={{ color: "#B7FF1A" }} />
              {label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
