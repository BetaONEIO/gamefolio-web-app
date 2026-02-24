import { useDailyStreak } from "@/hooks/use-daily-streak";
import { ChevronRight } from "lucide-react";

export default function DailyStreak() {
  const { overlayStep, streakData, dismiss } = useDailyStreak();

  if (overlayStep !== "streak" || !streakData) return null;

  const streak = streakData.currentStreak;
  const longestStreak = streakData.longestStreak;
  const nextMilestone = streakData.nextMilestone || 5;

  const totalSegments = 7;
  const filledSegments = Math.min(streak % totalSegments || totalSegments, totalSegments);

  const nextMilestoneLabel = nextMilestone > streak
    ? `Reach ${nextMilestone} days for a`
    : `You've hit your ${streak}-day milestone!`;

  return (
    <div className="fixed inset-0 z-[9999] bg-[#020617] flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 md:py-20">
        <div className="flex flex-col items-center max-w-md w-full">
          {/* Streak Count */}
          <div className="flex items-start justify-center mb-2">
            <span
              className="text-white font-black leading-none tracking-[-0.05em]"
              style={{
                fontSize: "clamp(120px, 25vw, 192px)",
                fontFamily: "'Plus Jakarta Sans', sans-serif",
              }}
            >
              {streak}
            </span>
            <span
              className="text-white font-black mt-2 md:mt-4"
              style={{
                fontSize: "clamp(32px, 6vw, 48px)",
                fontFamily: "'Plus Jakarta Sans', sans-serif",
              }}
            >
              DAYS
            </span>
          </div>

          {/* Consecutive Streak label */}
          <p
            className="text-[#ff6900] text-center font-black uppercase tracking-[0.4em] mb-10 md:mb-14"
            style={{
              fontSize: "clamp(11px, 2vw, 14px)",
              fontFamily: "'Plus Jakarta Sans', sans-serif",
            }}
          >
            Consecutive streak
          </p>

          {/* Fire Icon with orange glow */}
          <div className="relative w-32 h-32 md:w-40 md:h-40 mb-8 md:mb-10 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full bg-[#ff6900]/20 blur-[40px] scale-150" />
            <div className="absolute inset-0 blur-[20px] scale-[1.4]" style={{ background: "linear-gradient(to bottom, rgba(245,73,0,0.4), rgba(251,44,54,0.4), rgba(255,185,0,0.2))" }} />
            <svg
              className="relative z-10"
              width="128"
              height="128"
              viewBox="0 0 128 128"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M68.4297 115.601C85.0999 112.263 106.655 100.269 106.655 69.2592C106.655 41.0435 86.0011 22.2509 71.1494 13.6172C67.8484 11.6974 63.9928 14.2198 63.9928 18.0327V27.781C63.9928 35.4708 60.7612 49.5066 51.7808 55.346C47.1947 58.327 42.2352 53.8635 41.6806 48.4241L41.222 43.9552C40.6887 38.7611 35.3986 35.6095 31.2497 38.7771C23.7892 44.4565 15.998 54.4288 15.998 69.2538C15.998 107.175 44.203 116.662 58.3028 116.662C61.7663 116.662 65.2122 116.306 68.4297 115.601Z"
                fill="url(#fire_gradient)"
              />
              <defs>
                <linearGradient id="fire_gradient" x1="64" y1="12" x2="64" y2="117" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#FFBA00" />
                  <stop offset="0.5" stopColor="#FF6900" />
                  <stop offset="1" stopColor="#F54900" />
                </linearGradient>
              </defs>
            </svg>
          </div>

          {/* You're on fire section */}
          <h2
            className="text-white text-center font-bold uppercase tracking-[-0.025em] mb-3"
            style={{
              fontSize: "clamp(18px, 3vw, 24px)",
              fontFamily: "'Plus Jakarta Sans', sans-serif",
            }}
          >
            You're on fire!
          </h2>
          <p
            className="text-slate-400/80 text-center mb-2 max-w-sm"
            style={{
              fontSize: "clamp(12px, 2vw, 14px)",
              lineHeight: "1.6",
              fontFamily: "'Plus Jakarta Sans', sans-serif",
            }}
          >
            {nextMilestone > streak ? (
              <>
                You've logged in for {streak} days straight. {nextMilestoneLabel}{" "}
                <span className="text-white font-bold">Legendary Mystery Box</span>.
              </>
            ) : (
              <>You've hit your {streak}-day streak milestone! Keep going for even bigger rewards.</>
            )}
          </p>

          {/* Personal Best badge */}
          <div
            className="mt-4 mb-8 md:mb-10 px-6 py-3 rounded-full border border-[#ff6900]/20 bg-[#ff6900]/10 flex items-center gap-3"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <g clipPath="url(#clip_pb)">
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M3.64449 2.59135C6.61712 -0.377362 11.4501 -0.34603 14.4407 2.6454C17.433 5.63762 17.4643 10.4729 14.4909 13.4456C11.5175 16.4182 6.68292 16.3877 3.6907 13.3954C1.98425 11.6964 1.17297 9.2956 1.49902 6.9097C1.54293 6.58806 1.83927 6.36291 2.16091 6.40682C2.48256 6.45073 2.7077 6.74707 2.66379 7.06871C2.38698 9.09069 3.07452 11.1254 4.521 12.5651C7.06282 15.1062 11.154 15.1211 13.6606 12.6153C16.1664 10.1087 16.15 6.01851 13.6088 3.47601C11.0676 0.933508 6.97784 0.917942 4.47207 3.42466L4.95798 2.93989C5.21973 2.67851 5.21973 2.25455 4.95798 1.99353C4.69586 1.73215 4.2719 1.73215 4.01015 1.99353L2.63605 3.36763C2.3743 3.62901 2.3743 4.05297 2.63605 4.31435L4.01015 5.68845C4.2719 5.94983 4.69586 5.94983 4.95798 5.68845C5.21973 5.42707 5.21973 5.00311 4.95798 4.74173L4.34818 4.1316C4.11027 4.2827 3.87802 4.43684 3.64449 2.59135Z"
                  fill="#FF6900"
                />
              </g>
              <defs>
                <clipPath id="clip_pb">
                  <rect width="16" height="16" fill="white" />
                </clipPath>
              </defs>
            </svg>
            <span
              className="text-[#ff6900] font-bold uppercase tracking-[0.2em]"
              style={{ fontSize: "10px", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            >
              Personal Best: {longestStreak} Days
            </span>
          </div>

          {/* Segmented progress bar */}
          <div className="w-full max-w-[383px] px-4 flex gap-1.5">
            {Array.from({ length: totalSegments }).map((_, i) => (
              <div
                key={i}
                className={`flex-1 h-1.5 rounded-full ${
                  i < filledSegments
                    ? "bg-[#4ade80]"
                    : "bg-slate-700/30"
                }`}
                style={
                  i < filledSegments
                    ? { boxShadow: "0 0 15px rgba(74, 222, 128, 0.4)" }
                    : undefined
                }
              />
            ))}
          </div>
        </div>
      </div>

      {/* Bottom button */}
      <div className="backdrop-blur-xl bg-[#020617]/80 border-t border-slate-700/10 p-6 md:p-8 flex justify-center">
        <button
          onClick={dismiss}
          className="w-full max-w-[400px] h-14 md:h-16 bg-[#4ade80] hover:bg-[#22c55e] active:scale-[0.98] transition-all rounded-full flex items-center justify-center gap-3 cursor-pointer"
          style={{ boxShadow: "0 15px 30px rgba(74, 222, 128, 0.2)" }}
        >
          <span
            className="text-[#022c22] font-black uppercase tracking-[0.2em]"
            style={{ fontSize: "14px", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          >
            Continue Playing
          </span>
          <ChevronRight className="w-5 h-5 text-[#022c22]" strokeWidth={3} />
        </button>
      </div>
    </div>
  );
}
