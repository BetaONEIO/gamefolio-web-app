import { useDailyStreak } from "@/hooks/use-daily-streak";
import { ChevronRight } from "lucide-react";

export default function DailyXpBonus() {
  const { overlayStep, streakData, advanceToStreak } = useDailyStreak();

  if (overlayStep !== "xp" || !streakData) return null;

  const totalXP = streakData.dailyXP + streakData.bonusAwarded;
  const streak = streakData.currentStreak;
  const nextMilestone = streakData.nextMilestone || 5;
  const progress = Math.min((streak / nextMilestone) * 100, 100);

  return (
    <div className="fixed inset-0 z-[9999] bg-[#020617] flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 md:py-20">
        <div className="flex flex-col items-center max-w-md w-full">
          {/* XP Amount */}
          <div className="flex items-start justify-center mb-2">
            <span
              className="text-white font-black leading-none tracking-[-0.05em]"
              style={{
                fontSize: "clamp(120px, 25vw, 192px)",
                fontFamily: "'Plus Jakarta Sans', sans-serif",
              }}
            >
              {totalXP}
            </span>
            <span
              className="text-white font-black mt-2 md:mt-4"
              style={{
                fontSize: "clamp(32px, 6vw, 48px)",
                fontFamily: "'Plus Jakarta Sans', sans-serif",
              }}
            >
              XP
            </span>
          </div>

          {/* Daily Login Bonus label */}
          <p
            className="text-[#4ade80] text-center font-black uppercase tracking-[0.4em] mb-10 md:mb-14"
            style={{
              fontSize: "clamp(11px, 2vw, 14px)",
              fontFamily: "'Plus Jakarta Sans', sans-serif",
            }}
          >
            Daily login bonus
          </p>

          {/* Sun Icon with green glow */}
          <div className="relative w-32 h-32 md:w-40 md:h-40 mb-10 md:mb-14 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full bg-[#4ade80]/20 blur-[40px] scale-150" />
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
                d="M56.3608 46.469C59.756 40.3757 61.4563 37.3291 63.9934 37.3291C66.5305 37.3291 68.2308 40.3757 71.6261 46.469L72.5057 48.0459C73.4712 49.7784 73.9539 50.642 74.7049 51.2106C75.4558 51.7845 76.3998 51.999 78.2718 52.4228L79.9775 52.809C86.5749 54.3001 89.8736 55.0457 90.6567 57.572C91.4452 60.093 89.1924 62.7212 84.6976 67.9831L83.5336 69.3455C82.2571 70.8366 81.6188 71.5875 81.3345 72.5101C81.0395 73.4327 81.136 74.4356 81.3238 76.4307L81.4969 78.2595C82.1726 85.2948 82.5104 88.8071 80.4402 90.4553C78.3646 92.1035 75.2335 90.6821 68.966 87.8393L67.3619 87.1103C65.6076 86.3162 64.7304 85.9245 63.7949 85.9245C62.8593 85.9245 61.9822 86.3162 60.2278 87.1103L58.6238 87.8393C52.3563 90.6821 49.2225 92.1035 47.1523 90.4553C45.0767 88.8071 45.4145 85.2948 46.0929 78.2595L46.266 76.4307C46.4538 74.4356 46.5503 73.4327 46.2553 72.5101C45.971 71.5875 45.3327 70.8366 44.0562 69.3455L42.8922 67.9831C38.3974 62.7212 36.1446 60.093 36.9331 57.572C37.7162 55.0457 41.0149 54.3001 47.6123 52.809L49.318 52.4228C51.19 51.999 52.134 51.7845 52.8849 51.2106C53.6359 50.642 54.1186 49.7784 55.0841 48.0459L56.3608 46.469Z"
                fill="#4ADE80"
              />
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M63.9931 6.66602C66.202 6.66602 67.9927 8.45668 67.9927 10.6656V21.3311C67.9927 23.54 66.202 25.3307 63.9931 25.3307C61.7842 25.3307 59.9936 23.54 59.9936 21.3311V10.6656C59.9936 8.45668 61.7842 6.66602 63.9931 6.66602ZM6.66602 63.9931C6.66602 61.7842 8.45668 59.9936 10.6656 59.9936H21.3311C23.54 59.9936 25.3307 61.7842 25.3307 63.9931C25.3307 66.202 23.54 67.9927 21.3311 67.9927H10.6656C8.45668 67.9927 6.66602 66.202 6.66602 63.9931ZM63.9931 102.659C66.202 102.659 67.9927 104.45 67.9927 106.659V117.324C67.9927 119.533 66.202 121.324 63.9931 121.324C61.7842 121.324 59.9936 119.533 59.9936 117.324V106.659C59.9936 104.45 61.7842 102.659 63.9931 102.659ZM102.659 63.9931C102.659 61.7842 104.45 59.9936 106.659 59.9936H117.324C119.533 59.9936 121.324 61.7842 121.324 63.9931C121.324 66.202 119.533 67.9927 117.324 67.9927H106.659C104.45 67.9927 102.659 66.202 102.659 63.9931Z"
                fill="#4ADE80"
              />
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M99.8898 28.0005C101.5 29.6123 101.5 32.2234 99.8898 33.8353L98.0018 35.7288C96.3812 37.2926 93.8063 37.269 92.2146 35.6758C90.6228 34.0826 90.6017 31.5077 92.167 29.8885L94.0551 28.0005C95.6669 26.3907 98.278 26.3907 99.8898 28.0005Z"
                fill="#4ADE80"
              />
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M28.001 28.0005C29.6128 26.3907 32.2239 26.3907 33.8358 28.0005L35.7293 29.8885C37.2931 31.5092 37.2695 34.0841 35.6763 35.6758C34.0831 37.2675 31.5082 37.2886 29.889 35.7233L28.001 33.8353C26.3912 32.2234 26.3912 29.6123 28.001 28.0005Z"
                fill="#4ADE80"
              />
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M35.7238 92.1665C37.3336 93.7783 37.3336 96.3895 35.7238 98.0013L33.8358 99.8894C32.2091 101.405 29.6743 101.36 28.1021 99.7882C26.53 98.216 26.4853 95.6812 28.001 94.0546L29.889 92.1665C31.5008 90.5567 34.112 90.5567 35.7238 92.1665Z"
                fill="#4ADE80"
              />
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M92.167 92.1665C93.7788 90.5567 96.39 90.5567 98.0018 92.1665L99.8898 94.0546C101.406 95.6812 101.361 98.216 99.7887 99.7882C98.2165 101.36 95.6817 101.405 94.0551 99.8894L92.167 98.0013C90.5572 96.3895 90.5572 93.7783 92.167 92.1665Z"
                fill="#4ADE80"
              />
            </svg>
          </div>

          {/* Leveling Up section */}
          <h2
            className="text-white text-center font-bold uppercase tracking-[-0.025em] mb-3"
            style={{
              fontSize: "clamp(18px, 3vw, 24px)",
              fontFamily: "'Plus Jakarta Sans', sans-serif",
            }}
          >
            Leveling up!
          </h2>
          <p
            className="text-slate-400/80 text-center mb-8 md:mb-12 max-w-sm"
            style={{
              fontSize: "clamp(12px, 2vw, 14px)",
              lineHeight: "1.6",
              fontFamily: "'Plus Jakarta Sans', sans-serif",
            }}
          >
            Your daily streak is active. Keep logging in every day to earn even bigger rewards.
          </p>

          {/* Progress bar */}
          <div className="w-full max-w-[383px] px-4 mb-2">
            <div className="w-full h-1.5 bg-slate-700/30 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#4ade80] rounded-full transition-all duration-700 ease-out"
                style={{
                  width: `${progress}%`,
                  boxShadow: "0 0 20px rgba(74, 222, 128, 0.6)",
                }}
              />
            </div>
          </div>

          {/* Progress labels */}
          <div className="w-full max-w-[383px] px-4 flex justify-between">
            <span
              className="text-slate-400/30 font-black uppercase tracking-[0.1em]"
              style={{ fontSize: "10px", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            >
              Day 1
            </span>
            <span
              className="text-[#4ade80]/60 font-black uppercase tracking-[0.1em]"
              style={{ fontSize: "10px", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            >
              Day {Math.ceil(nextMilestone / 2)} Streak
            </span>
            <span
              className="text-slate-400/30 font-black uppercase tracking-[0.1em]"
              style={{ fontSize: "10px", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            >
              Day {nextMilestone}
            </span>
          </div>
        </div>
      </div>

      {/* Bottom button */}
      <div className="backdrop-blur-xl bg-[#020617]/80 border-t border-slate-700/10 p-6 md:p-8 flex justify-center">
        <button
          onClick={advanceToStreak}
          className="w-full max-w-[400px] h-14 md:h-16 bg-[#4ade80] hover:bg-[#22c55e] active:scale-[0.98] transition-all rounded-full flex items-center justify-center gap-3 cursor-pointer"
          style={{ boxShadow: "0 15px 30px rgba(74, 222, 128, 0.2)" }}
        >
          <span
            className="text-[#022c22] font-black uppercase tracking-[0.2em]"
            style={{ fontSize: "14px", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          >
            Claim Reward
          </span>
          <ChevronRight className="w-5 h-5 text-[#022c22]" strokeWidth={3} />
        </button>
      </div>
    </div>
  );
}
