export interface BackgroundTheme {
  id: string;
  name: string;
  type: 'solid' | 'gradient' | 'animated';
  animation?: 'none' | 'particles' | 'waves' | 'gradient-shift' | 'starfield' | 'fireflies' | 'digital-rain' | 'neon-pulse' | 'cosmic-dust' | 'snake' | 'color-panels';
  preview: string;
  gradient?: {
    from: string;
    via?: string;
    to: string;
    direction?: string;
  };
  solid?: string;
}

export const backgroundThemes: BackgroundTheme[] = [
  {
    id: 'default',
    name: 'Default Navy',
    type: 'solid',
    preview: '#0B2232',
    solid: '#0B2232'
  },
  {
    id: 'midnight',
    name: 'Midnight Black',
    type: 'solid',
    preview: '#0a0a0a',
    solid: '#0a0a0a'
  },
  {
    id: 'deep-ocean',
    name: 'Deep Ocean',
    type: 'gradient',
    preview: 'linear-gradient(135deg, #1e3a8a 0%, #0c4a6e 100%)',
    gradient: {
      from: '#1e3a8a',
      to: '#0c4a6e',
      direction: '135deg'
    }
  },
  {
    id: 'forest-night',
    name: 'Forest Night',
    type: 'gradient',
    preview: 'linear-gradient(135deg, #064e3b 0%, #1e40af 100%)',
    gradient: {
      from: '#064e3b',
      to: '#1e40af',
      direction: '135deg'
    }
  },
  {
    id: 'purple-dream',
    name: 'Purple Dream',
    type: 'gradient',
    preview: 'linear-gradient(135deg, #581c87 0%, #1e3a8a 100%)',
    gradient: {
      from: '#581c87',
      to: '#1e3a8a',
      direction: '135deg'
    }
  },
  {
    id: 'sunset-glow',
    name: 'Sunset Glow',
    type: 'gradient',
    preview: 'linear-gradient(135deg, #7c2d12 0%, #831843 100%)',
    gradient: {
      from: '#7c2d12',
      to: '#831843',
      direction: '135deg'
    }
  },
  {
    id: 'cyber-green',
    name: 'Cyber Green',
    type: 'gradient',
    preview: 'linear-gradient(135deg, #14532d 0%, #065f46 50%, #0f766e 100%)',
    gradient: {
      from: '#14532d',
      via: '#065f46',
      to: '#0f766e',
      direction: '135deg'
    }
  },
  {
    id: 'neon-city',
    name: 'Neon City',
    type: 'gradient',
    preview: 'linear-gradient(135deg, #1e1b4b 0%, #831843 50%, #7c2d12 100%)',
    gradient: {
      from: '#1e1b4b',
      via: '#831843',
      to: '#7c2d12',
      direction: '135deg'
    }
  },
  {
    id: 'matrix',
    name: 'Matrix',
    type: 'animated',
    animation: 'particles',
    preview: '#0a0f0a',
    solid: '#0a0f0a'
  },
  {
    id: 'ocean-waves',
    name: 'Ocean Waves',
    type: 'animated',
    animation: 'waves',
    preview: '#0c1e2e',
    solid: '#0c1e2e'
  },
  {
    id: 'aurora',
    name: 'Aurora',
    type: 'animated',
    animation: 'gradient-shift',
    preview: '#0B2232',
    solid: '#0B2232'
  },
  {
    id: 'starfield',
    name: 'Starfield',
    type: 'animated',
    animation: 'starfield',
    preview: '#000814',
    solid: '#000814'
  },
  {
    id: 'fireflies',
    name: 'Fireflies',
    type: 'animated',
    animation: 'fireflies',
    preview: '#0a1f1f',
    solid: '#0a1f1f'
  },
  {
    id: 'digital-rain',
    name: 'Digital Rain',
    type: 'animated',
    animation: 'digital-rain',
    preview: '#001a00',
    solid: '#001a00'
  },
  {
    id: 'neon-pulse',
    name: 'Neon Pulse',
    type: 'animated',
    animation: 'neon-pulse',
    preview: '#1a0033',
    solid: '#1a0033'
  },
  {
    id: 'cosmic-dust',
    name: 'Cosmic Dust',
    type: 'animated',
    animation: 'cosmic-dust',
    preview: '#0d1117',
    solid: '#0d1117'
  },
  {
    id: 'snake',
    name: 'Snake',
    type: 'animated',
    animation: 'snake',
    preview: '#0a0a14',
    solid: '#0a0a14'
  },
  {
    id: 'color-panels',
    name: 'Color Panels',
    type: 'animated',
    animation: 'color-panels',
    preview: '#1a1a1a',
    solid: '#1a1a1a'
  }
];

export const getBackgroundStyle = (theme: BackgroundTheme | null, backgroundColor?: string) => {
  if (!theme) {
    return { background: backgroundColor || '#0B2232' };
  }

  if (theme.type === 'solid' || theme.type === 'animated') {
    return { background: theme.solid || backgroundColor || '#0B2232' };
  }

  if (theme.type === 'gradient' && theme.gradient) {
    const { from, via, to, direction } = theme.gradient;
    if (via) {
      return { background: `linear-gradient(${direction || '135deg'}, ${from} 0%, ${via} 50%, ${to} 100%)` };
    }
    return { background: `linear-gradient(${direction || '135deg'}, ${from} 0%, ${to} 100%)` };
  }

  return { background: backgroundColor || '#0B2232' };
};
