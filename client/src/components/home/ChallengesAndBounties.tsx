import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Zap, Clock, CheckCircle2, Users, ChevronRight, Gift, Swords } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

interface Challenge {
  id: string;
  emoji: string;
  title: string;
  xp: number;
  progress: number;
  total: number;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  timeLeft: string;
  href: string;
}

const CHALLENGES: Challenge[] = [
  { id: 'login',   emoji: '🎮', title: 'Daily Login',      xp: 25,  progress: 1, total: 1,  difficulty: 'Easy',   timeLeft: 'Resets midnight', href: '/' },
  { id: 'upload',  emoji: '📹', title: 'Upload 1 Clip',    xp: 200, progress: 0, total: 1,  difficulty: 'Medium', timeLeft: 'Today only',      href: '/upload' },
  { id: 'watch',   emoji: '👁️', title: 'Watch 20 Clips',   xp: 50,  progress: 0, total: 20, difficulty: 'Easy',   timeLeft: 'Today only',      href: '/explore' },
  { id: 'comment', emoji: '💬', title: 'Comment 5 Times',  xp: 75,  progress: 0, total: 5,  difficulty: 'Easy',   timeLeft: 'Today only',      href: '/explore' },
  { id: 'follow',  emoji: '🤝', title: 'Follow a Creator', xp: 30,  progress: 0, total: 1,  difficulty: 'Easy',   timeLeft: 'Weekly',          href: '/explore' },
];

const DIFF_COLORS: Record<string, string> = {
  Easy: '#22C55E',
  Medium: '#F59E0B',
  Hard: '#EF4444',
};

interface Bounty {
  id: string;
  gameName: string;
  gameArtUrl: string;
  reward: string;
  rewardType: 'steam_key' | 'xp' | 'gft' | 'cash';
  requirement: string;
  timeLeft: string;
  participants: number;
  featured?: boolean;
}

const PLACEHOLDER_BOUNTIES: Bounty[] = [
  {
    id: 'b1',
    gameName: 'Hogs of War Reloaded',
    gameArtUrl: 'https://static-cdn.jtvnw.net/ttv-boxart/Hogs%20of%20War-144x192.jpg',
    reward: 'Steam Key + 500 XP',
    rewardType: 'steam_key',
    requirement: 'Upload 3 clips featuring this game',
    timeLeft: '2 days left',
    participants: 48,
    featured: true,
  },
  {
    id: 'b2',
    gameName: 'Indie Arena',
    gameArtUrl: '',
    reward: '250 GFT',
    rewardType: 'gft',
    requirement: 'Reach 100 views on a clip',
    timeLeft: '5 days left',
    participants: 21,
  },
  {
    id: 'b3',
    gameName: 'PixelQuest',
    gameArtUrl: '',
    reward: '1,000 XP',
    rewardType: 'xp',
    requirement: 'Post a screenshot with #PixelQuest',
    timeLeft: '1 day left',
    participants: 84,
  },
];

const REWARD_COLORS: Record<string, string> = {
  steam_key: '#1B9ADB',
  xp: '#B7FF1A',
  gft: '#9B59B6',
  cash: '#22C55E',
};

function ChallengeRow({ c }: { c: Challenge }) {
  const done = c.progress >= c.total;
  const pct = Math.min(100, Math.round((c.progress / c.total) * 100));
  return (
    <div
      className="flex items-center gap-3 p-3 rounded-xl transition-all hover:bg-white/5 cursor-pointer"
      style={{ border: '1px solid rgba(255,255,255,0.05)' }}
    >
      <div className="text-xl w-8 text-center flex-shrink-0">{c.emoji}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-white font-semibold text-sm truncate">{c.title}</span>
          <span className="text-xs font-black ml-2 flex-shrink-0" style={{ color: '#B7FF1A' }}>+{c.xp} XP</span>
        </div>
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ color: DIFF_COLORS[c.difficulty], background: `${DIFF_COLORS[c.difficulty]}18` }}>{c.difficulty}</span>
          <span className="text-white/30 text-[10px] flex items-center gap-1"><Clock className="w-2.5 h-2.5" />{c.timeLeft}</span>
        </div>
        <div className="relative h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)' }}>
          <div className="absolute inset-y-0 left-0 rounded-full transition-all" style={{ width: `${pct}%`, background: done ? '#B7FF1A' : 'rgba(183,255,26,0.5)' }} />
        </div>
        <div className="text-[10px] text-white/30 mt-0.5">{c.progress}/{c.total}</div>
      </div>
      {done && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center" style={{ background: '#B7FF1A20', border: '1px solid #B7FF1A' }}>
          <CheckCircle2 className="w-4 h-4" style={{ color: '#B7FF1A' }} />
        </div>
      )}
    </div>
  );
}

function BountyCard({ bounty, featured }: { bounty: Bounty; featured?: boolean }) {
  const rewardColor = REWARD_COLORS[bounty.rewardType] || '#B7FF1A';
  if (featured) {
    return (
      <div className="relative rounded-2xl overflow-hidden mb-3" style={{ background: 'linear-gradient(135deg, rgba(27,154,219,0.15) 0%, rgba(11,19,25,0.98) 60%)', border: '1px solid rgba(27,154,219,0.3)', boxShadow: '0 0 30px rgba(27,154,219,0.1)' }}>
        <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full text-[10px] font-black tracking-widest" style={{ background: '#1B9ADB', color: 'white' }}>FEATURED</div>
        <div className="flex gap-4 p-4">
          {bounty.gameArtUrl ? (
            <img src={bounty.gameArtUrl} alt={bounty.gameName} className="w-16 h-20 rounded-xl object-cover flex-shrink-0" />
          ) : (
            <div className="w-16 h-20 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(255,255,255,0.05)' }}>
              <Swords className="w-6 h-6 text-white/20" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="text-white font-black text-base mb-1">{bounty.gameName}</div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg mb-2" style={{ background: `${rewardColor}20`, border: `1px solid ${rewardColor}40` }}>
              <Gift className="w-3 h-3" style={{ color: rewardColor }} />
              <span className="text-xs font-black" style={{ color: rewardColor }}>{bounty.reward}</span>
            </div>
            <p className="text-white/50 text-xs mb-2">{bounty.requirement}</p>
            <div className="flex items-center gap-3 text-[10px] text-white/40">
              <span className="flex items-center gap-1"><Clock className="w-2.5 h-2.5" />{bounty.timeLeft}</span>
              <span className="flex items-center gap-1"><Users className="w-2.5 h-2.5" />{bounty.participants} joined</span>
            </div>
          </div>
        </div>
        <div className="px-4 pb-4">
          <button className="w-full py-2.5 rounded-xl font-black text-sm transition-all hover:opacity-90 active:scale-95" style={{ background: 'linear-gradient(90deg, #1B9ADB, #0ea5e9)', color: 'white' }}>
            Join Bounty →
          </button>
        </div>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl" style={{ border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
      {bounty.gameArtUrl ? (
        <img src={bounty.gameArtUrl} alt={bounty.gameName} className="w-10 h-12 rounded-lg object-cover flex-shrink-0" />
      ) : (
        <div className="w-10 h-12 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(255,255,255,0.04)' }}>
          <Swords className="w-4 h-4 text-white/20" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="text-white font-bold text-xs truncate">{bounty.gameName}</div>
        <div className="text-[10px] font-black mb-1" style={{ color: rewardColor }}>{bounty.reward}</div>
        <div className="text-[10px] text-white/30 flex items-center gap-2">
          <span className="flex items-center gap-0.5"><Clock className="w-2 h-2" />{bounty.timeLeft}</span>
          <span className="flex items-center gap-0.5"><Users className="w-2 h-2" />{bounty.participants}</span>
        </div>
      </div>
      <button className="flex-shrink-0 px-3 py-1.5 rounded-lg font-black text-[11px] transition-all hover:opacity-90 active:scale-95" style={{ background: 'rgba(183,255,26,0.15)', color: '#B7FF1A', border: '1px solid rgba(183,255,26,0.3)' }}>
        Join
      </button>
    </div>
  );
}

export function ChallengesAndBounties() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const featuredBounty = PLACEHOLDER_BOUNTIES.find(b => b.featured);
  const otherBounties = PLACEHOLDER_BOUNTIES.filter(b => !b.featured);

  return (
    <section className="px-4 sm:px-6 md:px-8 pt-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        
        {/* XP Challenges Card */}
        <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(11,19,25,0.98)', border: '1px solid rgba(183,255,26,0.12)' }}>
          <div className="flex items-center justify-between px-5 pt-5 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(183,255,26,0.15)', border: '1px solid rgba(183,255,26,0.3)' }}>
                <Zap className="w-4 h-4" style={{ color: '#B7FF1A' }} />
              </div>
              <div>
                <div className="text-white font-black text-sm">Daily XP Challenges</div>
                <div className="text-white/30 text-[10px]">Reset every midnight</div>
              </div>
            </div>
            <span className="text-[10px] font-black px-2 py-1 rounded-full" style={{ background: 'rgba(183,255,26,0.15)', color: '#B7FF1A' }}>
              {CHALLENGES.filter(c => c.progress >= c.total).length}/{CHALLENGES.length} done
            </span>
          </div>

          <div className="px-4 pb-4 space-y-1">
            {CHALLENGES.map(c => <ChallengeRow key={c.id} c={c} />)}
          </div>

          {user && (
            <div className="px-4 pb-4">
              <button
                onClick={() => setLocation('/explore')}
                className="w-full py-2.5 rounded-xl font-black text-sm transition-all hover:opacity-90 active:scale-95 flex items-center justify-center gap-2"
                style={{ background: 'rgba(183,255,26,0.1)', color: '#B7FF1A', border: '1px solid rgba(183,255,26,0.2)' }}
              >
                View All Challenges <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Bounties Card */}
        <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(11,19,25,0.98)', border: '1px solid rgba(27,154,219,0.15)' }}>
          <div className="flex items-center justify-between px-5 pt-5 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(27,154,219,0.15)', border: '1px solid rgba(27,154,219,0.3)' }}>
                <Swords className="w-4 h-4" style={{ color: '#1B9ADB' }} />
              </div>
              <div>
                <div className="text-white font-black text-sm">Active Bounties</div>
                <div className="text-white/30 text-[10px]">Sponsored by indie devs</div>
              </div>
            </div>
            <span className="text-[10px] font-black px-2 py-1 rounded-full" style={{ background: 'rgba(27,154,219,0.15)', color: '#1B9ADB' }}>
              {PLACEHOLDER_BOUNTIES.length} active
            </span>
          </div>

          <div className="px-4 pb-2">
            {featuredBounty && <BountyCard bounty={featuredBounty} featured />}
            <div className="space-y-2">
              {otherBounties.map(b => <BountyCard key={b.id} bounty={b} />)}
            </div>
          </div>

          <div className="px-4 pb-4 mt-3">
            <button
              className="w-full py-2.5 rounded-xl font-black text-sm transition-all hover:opacity-90 active:scale-95 flex items-center justify-center gap-2"
              style={{ background: 'rgba(27,154,219,0.1)', color: '#1B9ADB', border: '1px solid rgba(27,154,219,0.2)' }}
            >
              Browse All Bounties <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

      </div>
    </section>
  );
}
