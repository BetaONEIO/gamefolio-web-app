import { useState } from 'react';
import {
  CheckCircle2,
  Users,
  Eye,
  Terminal,
  Award,
  MessageCircle,
  UserPlus,
  Video,
  Play,
  Camera,
  Radio,
} from 'lucide-react';
import { SiSteam, SiEpicgames } from 'react-icons/si';
import { FaWindows, FaPlaystation, FaXbox } from 'react-icons/fa';

const TABS = ['OVERVIEW', 'CLIPS', 'REELS', 'SCREENSHOTS', 'STREAMERS'];

export default function GameProfile() {
  const [activeTab, setActiveTab] = useState('OVERVIEW');
  const brand = {
    bg: '#0B1319',
    accent: '#B7FF18',
    cardBg: 'rgba(255, 255, 255, 0.04)',
    cardBorder: 'rgba(183, 255, 24, 0.15)',
    textMuted: 'rgba(255, 255, 255, 0.7)',
  };

  const cardStyle = {
    background: brand.cardBg,
    border: `1px solid ${brand.cardBorder}`,
    borderRadius: '12px',
    boxShadow: '0 4px 30px rgba(0, 0, 0, 0.1)',
    backdropFilter: 'blur(10px)',
  };

  const glowStyle = {
    boxShadow: `0 0 20px rgba(183, 255, 24, 0.2)`,
  };

  return (
    <div style={{ background: brand.bg, minHeight: '100vh', fontFamily: 'Inter, sans-serif', color: 'white', overflowX: 'hidden' }}>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes scanline {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100vh); }
        }
        @keyframes flowDash {
          to { stroke-dashoffset: -20; }
        }
        @keyframes pulseGlow {
          0%, 100% { box-shadow: 0 0 20px rgba(183, 255, 24, 0.2); }
          50% { box-shadow: 0 0 40px rgba(183, 255, 24, 0.4); }
        }
        .scan-container {
          position: relative;
          overflow: hidden;
        }
        .scanline {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 10px;
          background: linear-gradient(to bottom, transparent, rgba(183,255,24,0.3), transparent);
          animation: scanline 8s linear infinite;
          pointer-events: none;
          z-index: 10;
        }
        .flow-line {
          stroke: rgba(183,255,24,0.5);
          stroke-width: 2;
          stroke-dasharray: 6 4;
          animation: flowDash 1s linear infinite;
        }
        ::-webkit-scrollbar {
          width: 8px;
        }
        ::-webkit-scrollbar-track {
          background: ${brand.bg};
        }
        ::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.1);
          border-radius: 4px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: rgba(183,255,24,0.3);
        }
      `}} />

      {/* HERO SECTION */}
      <section className="scan-container relative w-full pt-32 pb-24 px-6 md:px-12 flex flex-col items-center justify-center border-b border-white/5" 
               style={{ background: 'linear-gradient(135deg, #0B1319 0%, #1a0b30 50%, #0d1f2d 100%)' }}>
        <div className="scanline"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(34,211,238,0.15)_0%,transparent_50%)] pointer-events-none"></div>
        
        <div className="relative z-20 max-w-5xl w-full mx-auto flex flex-col items-center text-center">
          <div className="flex gap-3 mb-6 flex-wrap justify-center">
            {['Action RPG', 'Sci-Fi', 'Roguelike', 'Multiplayer'].map(tag => (
              <span key={tag} className="px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-full"
                    style={{ background: brand.accent, color: '#0B1319' }}>
                {tag}
              </span>
            ))}
          </div>
          
          <h1 className="text-6xl md:text-8xl font-black tracking-tighter mb-8 text-transparent bg-clip-text bg-gradient-to-br from-white to-gray-400 drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">
            STELLAR ABYSS
          </h1>

          <div className="flex flex-wrap items-center justify-center gap-4 mb-8 w-full sm:w-auto">
            <button className="flex items-center justify-center gap-2 px-8 py-3.5 rounded-lg font-bold text-black transition-all hover:scale-105"
                    style={{ background: brand.accent, ...glowStyle }}>
              <UserPlus size={18} />
              Follow
            </button>
            <button className="flex items-center justify-center gap-2 px-8 py-3.5 rounded-lg font-bold text-white transition-all hover:bg-white/5 border border-white/20">
              <MessageCircle size={18} />
              Message
            </button>
          </div>
          
          <div className="flex flex-wrap items-center justify-center gap-4 w-full sm:w-auto">
            {[
              { label: 'Followers', value: '4.2K', icon: Users },
              { label: 'Total Views', value: '2.1M', icon: Eye },
              { label: 'Bounties', value: '12', icon: Award },
            ].map((stat, i) => (
              <div key={i} className="flex items-center gap-3 px-6 py-4 rounded-lg" style={cardStyle}>
                <stat.icon size={22} color={brand.accent} className="opacity-90" />
                <div className="text-left">
                  <div className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: brand.textMuted }}>{stat.label}</div>
                  <div className="text-xl font-bold">{stat.value}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-center gap-4 flex-wrap mt-6 pt-6 border-t border-white/10 w-full">
            {[
              { name: 'Windows', icon: FaWindows, color: 'text-white/80' },
              { name: 'PlayStation', icon: FaPlaystation, color: 'text-[#5a9fd4]' },
              { name: 'Xbox', icon: FaXbox, color: 'text-[#4CA338]' },
            ].map((platform, i) => (
              <div key={i} className="flex items-center gap-1.5" style={{ color: brand.textMuted }}>
                <platform.icon size={14} className={platform.color} />
                <span className="text-xs font-medium">{platform.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TABS NAV */}
      <nav className="sticky top-0 z-40 border-b border-white/10 backdrop-blur-xl bg-[#0B1319]/80 px-6">
        <div className="max-w-6xl mx-auto flex overflow-x-auto hide-scrollbar">
          {TABS.map((tab) => (
            <button key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-5 text-sm font-bold tracking-widest whitespace-nowrap transition-colors relative
                ${tab === activeTab ? 'text-white' : 'text-white/50 hover:text-white/80'}`}
            >
              {tab}
              {tab === activeTab && (
                <div className="absolute bottom-0 left-0 w-full h-1" style={{ background: brand.accent, ...glowStyle }}></div>
              )}
            </button>
          ))}
        </div>
      </nav>

      {activeTab === 'OVERVIEW' && (
        <section className="py-16 px-6 max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-10">
          <div className="lg:col-span-2 space-y-10">
            <div>
              <h2 className="text-2xl font-bold mb-4">Overview</h2>
              <p className="text-lg leading-relaxed" style={{ color: brand.textMuted }}>
                Dive into the Stellar Abyss, a next-generation roguelike action RPG where every run shapes the universe. 
                Battle through procedurally generated cosmic dungeons, uncover ancient alien artifacts, and build a 
                customized arsenal of energy weapons. Will you survive the cosmic horrors that lurk in the dark sectors?
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold mb-4">Key Features</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                {[
                  'Procedurally generated cosmic dungeons',
                  'Deep weapon crafting & modding system',
                  'Intense physics-based combat',
                  'Co-op multiplayer up to 4 players',
                  'Dynamic faction reputation mechanics',
                  'Original synthwave soundtrack'
                ].map((feature, i) => (
                  <div key={i} className="flex items-start gap-3 p-4 rounded-lg" style={cardStyle}>
                    <CheckCircle2 color={brand.accent} size={20} className="shrink-0 mt-0.5" />
                    <span className="text-sm font-medium">{feature}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>

          <div className="space-y-6">
            <div className="p-6 space-y-6" style={{...cardStyle, animation: 'pulseGlow 4s infinite'}}>
              <div>
                <div className="text-xs uppercase tracking-wider mb-1" style={{ color: brand.textMuted }}>Developer</div>
                <div className="text-xl font-bold text-white flex items-center gap-2">
                  <Terminal size={18} color={brand.accent} />
                  Void Epoch Studios
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs uppercase tracking-wider mb-1" style={{ color: brand.textMuted }}>Founded</div>
                  <div className="font-medium">2021</div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wider mb-1" style={{ color: brand.textMuted }}>Team Size</div>
                  <div className="font-medium">12 Members</div>
                </div>
              </div>

              <div className="pt-4 border-t border-white/10">
                <div className="text-xs uppercase tracking-wider mb-1" style={{ color: brand.textMuted }}>Release Date</div>
                <div className="text-lg font-bold text-white">Q3 2024</div>
              </div>
            </div>

            <div className="p-6 space-y-4" style={cardStyle}>
              <h3 className="text-sm font-bold uppercase tracking-wider text-white/50 mb-2">Store Links</h3>
              
              <button className="w-full flex items-center gap-3 p-3 rounded-md bg-[#171a21] hover:bg-[#2a303c] transition-colors border border-white/5 group">
                <SiSteam size={24} className="text-[#66c0f4]" />
                <span className="font-semibold text-[#c7d5e0]">Steam</span>
              </button>
              
              <button className="w-full flex items-center gap-3 p-3 rounded-md bg-[#121212] hover:bg-[#2a2a2a] transition-colors border border-white/5 group">
                <SiEpicgames size={24} className="text-white" />
                <span className="font-semibold text-white">Epic Games</span>
              </button>
            </div>
          </div>
        </section>
      )}

      {activeTab === 'CLIPS' && (
        <section className="py-16 px-6 max-w-6xl mx-auto">
          <h2 className="text-2xl font-bold mb-6">Clips</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="aspect-video rounded-lg flex items-center justify-center relative overflow-hidden" style={cardStyle}>
                <Video size={28} className="text-white/30" />
                <span className="absolute bottom-2 right-2 text-xs font-semibold bg-black/60 px-2 py-0.5 rounded">0:{20 + i}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {activeTab === 'REELS' && (
        <section className="py-16 px-6 max-w-6xl mx-auto">
          <h2 className="text-2xl font-bold mb-6">Reels</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="aspect-[9/16] rounded-lg flex items-center justify-center" style={cardStyle}>
                <Play size={28} className="text-white/30" />
              </div>
            ))}
          </div>
        </section>
      )}

      {activeTab === 'SCREENSHOTS' && (
        <section className="py-16 px-6 max-w-6xl mx-auto">
          <h2 className="text-2xl font-bold mb-6">Screenshots</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="aspect-video rounded-lg flex items-center justify-center" style={cardStyle}>
                <Camera size={28} className="text-white/30" />
              </div>
            ))}
          </div>
        </section>
      )}

      {activeTab === 'STREAMERS' && (
        <section className="py-16 px-6 max-w-6xl mx-auto">
          <h2 className="text-2xl font-bold mb-6">Streamers Playing</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="p-4 rounded-lg flex flex-col items-center gap-3 text-center" style={cardStyle}>
                <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center">
                  <Radio size={24} className="text-white/40" />
                </div>
                <span className="text-sm font-semibold">Streamer {i + 1}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
