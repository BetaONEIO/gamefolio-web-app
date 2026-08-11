import { useAuth } from "@/hooks/use-auth";
import { useRef } from "react";
import { Link } from "wouter";
import { CheckCircle2, Lock, Zap } from "lucide-react";

interface Challenge {
  id: string;
  emoji: string;
  title: string;
  description: string;
  xp: number;
  progress: number;
  total: number;
  href: string;
}

const CHALLENGES: Challenge[] = [
  {
    id: 'login',
    emoji: '🎮',
    title: 'Daily Login',
    description: 'Log in every day to maintain your streak',
    xp: 25,
    progress: 1,
    total: 1,
    href: '/',
  },
  {
    id: 'upload',
    emoji: '📹',
    title: 'Upload Content',
    description: 'Share a clip, reel, or screenshot today',
    xp: 200,
    progress: 0,
    total: 1,
    href: '/upload',
  },
  {
    id: 'watch',
    emoji: '👁️',
    title: 'Watch 5 Clips',
    description: 'Explore what the community is sharing',
    xp: 10,
    progress: 0,
    total: 5,
    href: '/explore',
  },
  {
    id: 'like',
    emoji: '❤️',
    title: 'Like 10 Posts',
    description: 'Show love to your fellow gamers',
    xp: 50,
    progress: 0,
    total: 10,
    href: '/explore',
  },
  {
    id: 'comment',
    emoji: '💬',
    title: 'Leave a Comment',
    description: 'Join the conversation on any clip',
    xp: 15,
    progress: 0,
    total: 1,
    href: '/explore',
  },
  {
    id: 'share',
    emoji: '🔗',
    title: 'Share Content',
    description: 'Spread the word about a great clip',
    xp: 20,
    progress: 0,
    total: 1,
    href: '/explore',
  },
];

const GUEST_CHALLENGES = CHALLENGES.map(c => ({ ...c, progress: 0 }));

function ChallengeCard({ challenge, isAuth }: { challenge: Challenge; isAuth: boolean }) {
  const pct = challenge.total > 0 ? (challenge.progress / challenge.total) * 100 : 0;
  const done = challenge.progress >= challenge.total;
  const locked = !isAuth;

  return (
    <Link href={isAuth ? challenge.href : '/auth'}>
      <div
        className="flex-shrink-0 relative rounded-2xl p-4 cursor-pointer transition-all duration-200 hover:scale-[1.02] overflow-hidden"
        style={{
          width: 200,
          background: done
            ? 'linear-gradient(135deg, rgba(183,255,26,0.12) 0%, rgba(183,255,26,0.04) 100%)'
            : 'rgba(255,255,255,0.04)',
          border: done
            ? '1px solid rgba(183,255,26,0.3)'
            : locked
            ? '1px solid rgba(255,255,255,0.05)'
            : '1px solid rgba(255,255,255,0.08)',
        }}
      >
        {done && (
          <div className="absolute top-3 right-3">
            <CheckCircle2 className="w-4 h-4" style={{ color: '#B7FF1A' }} />
          </div>
        )}
        {locked && !done && (
          <div className="absolute top-3 right-3">
            <Lock className="w-3.5 h-3.5 text-white/20" />
          </div>
        )}

        <div className="text-2xl mb-2">{challenge.emoji}</div>

        <h4 className="text-sm font-semibold text-white mb-1 pr-5">{challenge.title}</h4>
        <p className="text-xs text-white/40 mb-3 line-clamp-2 leading-relaxed">{challenge.description}</p>

        {/* Progress bar */}
        <div className="mb-3">
          <div className="flex justify-between text-xs text-white/30 mb-1">
            <span>{challenge.progress}/{challenge.total}</span>
            <span>{Math.round(pct)}%</span>
          </div>
          <div className="h-1 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${pct}%`,
                background: done ? '#B7FF1A' : 'rgba(183,255,26,0.5)',
              }}
            />
          </div>
        </div>

        {/* XP badge */}
        <div className="flex items-center gap-1">
          <Zap className="w-3 h-3" style={{ color: done ? '#B7FF1A' : 'rgba(183,255,26,0.5)' }} />
          <span
            className="text-xs font-bold"
            style={{ color: done ? '#B7FF1A' : 'rgba(183,255,26,0.5)' }}
          >
            +{challenge.xp} XP
          </span>
        </div>
      </div>
    </Link>
  );
}

export function DailyXPChallenges() {
  const { user } = useAuth();
  const scrollRef = useRef<HTMLDivElement>(null);
  const challenges = user ? CHALLENGES.map(c => c.id === 'login' ? { ...c, progress: 1 } : c) : GUEST_CHALLENGES;

  return (
    <section className="mt-12 px-0">
      <div className="flex justify-between items-center mb-5">
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5" style={{ color: '#B7FF1A' }} />
          <h2 className="text-xl font-semibold text-foreground">Daily XP Challenges</h2>
          <span className="text-xs text-white/40 font-normal ml-1">Resets midnight UTC</span>
        </div>
        {!user && (
          <Link href="/auth" className="text-primary text-sm font-medium hover:underline">
            Sign in to track →
          </Link>
        )}
      </div>

      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto pb-3"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {challenges.map(c => (
          <ChallengeCard key={c.id} challenge={c} isAuth={!!user} />
        ))}
      </div>
    </section>
  );
}
