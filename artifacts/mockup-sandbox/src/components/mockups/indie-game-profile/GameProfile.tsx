import React from 'react';
import { 
  CheckCircle2, 
  Play, 
  Monitor, 
  Globe, 
  Users, 
  Video, 
  Eye, 
  Heart,
  Terminal,
  Activity,
  ChevronDown
} from 'lucide-react';
import { SiSteam, SiEpicgames, SiXbox, SiPlaystation } from 'react-icons/si';

export default function GameProfile() {
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
              <span key={tag} className="px-3 py-1 text-xs font-semibold uppercase tracking-wider rounded-full" 
                    style={{ background: 'rgba(183,255,24,0.1)', color: brand.accent, border: `1px solid rgba(183,255,24,0.3)` }}>
                {tag}
              </span>
            ))}
          </div>
          
          <h1 className="text-6xl md:text-8xl font-black tracking-tighter mb-4 text-transparent bg-clip-text bg-gradient-to-br from-white to-gray-400 drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">
            STELLAR ABYSS
          </h1>
          
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-md mb-10 bg-black/40 border border-white/10 backdrop-blur-md">
            <Activity size={16} color={brand.accent} />
            <span className="text-sm font-bold tracking-widest text-white/90">EARLY ACCESS</span>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
            <button className="flex items-center justify-center gap-2 px-8 py-4 rounded-lg font-bold text-black transition-all hover:scale-105"
                    style={{ background: brand.accent, ...glowStyle }}>
              <Heart size={20} className="fill-black" />
              Add to Wishlist
            </button>
            <button className="flex items-center justify-center gap-2 px-8 py-4 rounded-lg font-bold text-white transition-all hover:bg-white/5"
                    style={{ border: `1px solid ${brand.accent}`, color: brand.accent }}>
              Follow Game
            </button>
            <button className="flex items-center justify-center gap-2 px-8 py-4 rounded-lg font-bold text-white transition-all hover:bg-white/5 border border-white/20">
              <Globe size={20} />
              Official Website
            </button>
          </div>
        </div>
      </section>

      {/* STATS STRIP */}
      <section className="border-b border-white/5 py-6 px-6 relative z-30" style={{ background: 'rgba(0,0,0,0.4)' }}>
        <div className="max-w-6xl mx-auto flex flex-wrap justify-center gap-4 md:gap-8">
          {[
            { label: 'Followers', value: '4.2K', icon: Users },
            { label: 'Clips', value: '832', icon: Video },
            { label: 'Reels', value: '241', icon: Play },
            { label: 'Streamers Playing', value: '17', icon: Monitor },
            { label: 'Total Views', value: '2.1M', icon: Eye },
            { label: 'Community', value: '5.8K', icon: Heart },
          ].map((stat, i) => (
            <div key={i} className="flex items-center gap-3 px-5 py-3 rounded-lg" style={cardStyle}>
              <stat.icon size={20} color={brand.accent} className="opacity-80" />
              <div>
                <div className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: brand.textMuted }}>{stat.label}</div>
                <div className="text-xl font-bold">{stat.value}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* TABS NAV */}
      <nav className="sticky top-0 z-40 border-b border-white/10 backdrop-blur-xl bg-[#0B1319]/80 px-6">
        <div className="max-w-6xl mx-auto flex overflow-x-auto hide-scrollbar">
          {['ABOUT', 'CLIPS', 'REELS', 'STREAMERS', 'MEDIA', 'COMMUNITY'].map((tab) => (
            <button key={tab} 
              className={`px-6 py-5 text-sm font-bold tracking-widest whitespace-nowrap transition-colors relative
                ${tab === 'ABOUT' ? 'text-white' : 'text-white/50 hover:text-white/80'}`}
            >
              {tab}
              {tab === 'ABOUT' && (
                <div className="absolute bottom-0 left-0 w-full h-1" style={{ background: brand.accent, ...glowStyle }}></div>
              )}
            </button>
          ))}
        </div>
      </nav>

      {/* ABOUT CONTENT */}
      <section className="py-16 px-6 max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 space-y-10">
          <div>
            <h2 className="text-2xl font-bold mb-4">About the Game</h2>
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

          <div>
            <h2 className="text-2xl font-bold mb-4">Available Platforms</h2>
            <div className="flex gap-4">
              <div className="p-4 rounded-lg flex items-center justify-center" style={cardStyle}>
                <Monitor size={32} className="text-white/80" />
              </div>
              <div className="p-4 rounded-lg flex items-center justify-center" style={cardStyle}>
                <SiXbox size={32} className="text-white/80" />
              </div>
              <div className="p-4 rounded-lg flex items-center justify-center" style={cardStyle}>
                <SiPlaystation size={32} className="text-white/80" />
              </div>
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
            
            <button className="w-full flex items-center justify-between p-3 rounded-md bg-[#171a21] hover:bg-[#2a303c] transition-colors border border-white/5 group">
              <div className="flex items-center gap-3">
                <SiSteam size={24} className="text-[#66c0f4]" />
                <span className="font-semibold text-[#c7d5e0]">Steam</span>
              </div>
              <Globe size={16} className="text-white/30 group-hover:text-white/80" />
            </button>
            
            <button className="w-full flex items-center justify-between p-3 rounded-md bg-[#121212] hover:bg-[#2a2a2a] transition-colors border border-white/5 group">
              <div className="flex items-center gap-3">
                <SiEpicgames size={24} className="text-white" />
                <span className="font-semibold text-white">Epic Games</span>
              </div>
              <Globe size={16} className="text-white/30 group-hover:text-white/80" />
            </button>
          </div>
        </div>
      </section>

      {/* WHY GAMEFOLIO */}
      <section className="py-24 relative overflow-hidden" style={{ background: 'rgba(183,255,24,0.02)' }}>
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[rgba(183,255,24,0.3)] to-transparent"></div>
        <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[rgba(183,255,24,0.3)] to-transparent"></div>
        
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-black mb-6" style={{ color: brand.accent, textShadow: '0 0 15px rgba(183,255,24,0.3)' }}>
            WHY GAMEFOLIO?
          </h2>
          <p className="text-lg mb-16 max-w-2xl mx-auto" style={{ color: brand.textMuted }}>
            Gamefolio helps indie games get discovered by connecting developers, creators, streamers, and players in one living ecosystem.
          </p>

          <div className="flex flex-col md:flex-row items-center justify-between gap-4 md:gap-0 relative">
            {/* SVG Connecting Lines (Visible on md+) */}
            <svg className="absolute hidden md:block w-full h-24 top-1/2 -translate-y-1/2 z-0" style={{ pointerEvents: 'none' }}>
              <line x1="10%" y1="50%" x2="90%" y2="50%" className="flow-line" />
            </svg>

            {['Indie Developer', 'Gamefolio', 'Creators', 'Streamers', 'Players'].map((node, i) => (
              <React.Fragment key={node}>
                <div className="relative z-10 flex flex-col items-center">
                  <div className="w-32 h-32 rounded-xl flex items-center justify-center p-4 text-center font-bold text-sm"
                       style={{...cardStyle, ...(node === 'Gamefolio' ? { background: 'rgba(183,255,24,0.1)', ...glowStyle } : {})}}>
                    {node}
                  </div>
                </div>
                {i < 4 && (
                  <div className="md:hidden py-2">
                    <ChevronDown size={24} className="text-white/30" />
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER CTA */}
      <section className="py-24 px-6 text-center">
        <div className="max-w-3xl mx-auto p-12 rounded-2xl relative overflow-hidden" style={cardStyle}>
          <div className="absolute inset-0 bg-gradient-to-br from-[rgba(183,255,24,0.1)] to-transparent pointer-events-none"></div>
          
          <h2 className="text-4xl font-black mb-4 relative z-10 text-white">Get Your Game on Gamefolio</h2>
          <p className="text-xl mb-8 relative z-10" style={{ color: brand.textMuted }}>
            Join hundreds of indie developers building real communities and reaching new players every day.
          </p>
          
          <button className="relative z-10 px-10 py-5 rounded-lg font-black text-black text-lg transition-transform hover:scale-105"
                  style={{ background: brand.accent, ...glowStyle }}>
            Claim Your Developer Profile
          </button>
        </div>
      </section>
    </div>
  );
}
