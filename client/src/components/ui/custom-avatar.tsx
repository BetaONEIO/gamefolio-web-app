import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, AssetReward } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import { useState, useEffect, useMemo } from "react";
import DOMPurify from "dompurify";

// Helper to extract clip path from SVG and generate border content
const useSvgBorderData = (svgUrl: string, color: string) => {
  const [data, setData] = useState<{ borderSvg: string; clipPath: string } | null>(null);
  const clipId = useMemo(() => `clip-${Math.random().toString(36).substr(2, 9)}`, []);
  
  useEffect(() => {
    if (!svgUrl) return;
    
    fetch(svgUrl)
      .then(res => res.text())
      .then(svg => {
        const sanitized = DOMPurify.sanitize(svg, { 
          USE_PROFILES: { svg: true, svgFilters: true },
          ADD_TAGS: ['animate', 'animateTransform', 'animateMotion', 'set', 'clipPath', 'defs'],
          ADD_ATTR: ['attributeName', 'attributeType', 'begin', 'dur', 'end', 'from', 'to', 'by', 'values', 'keyTimes', 'keySplines', 'calcMode', 'repeatCount', 'repeatDur', 'fill', 'additive', 'accumulate', 'type', 'restart', 'clip-path', 'clipPathUnits']
        });
        
        // Parse SVG to extract the main shape for clipping
        const parser = new DOMParser();
        const doc = parser.parseFromString(sanitized, 'image/svg+xml');
        const svgEl = doc.querySelector('svg');
        
        let clipPathContent = '';
        if (svgEl) {
          // Find the first circle, path, or rect as the clip shape
          const circle = svgEl.querySelector('circle');
          const path = svgEl.querySelector('path');
          const rect = svgEl.querySelector('rect');
          
          if (circle) {
            const cx = circle.getAttribute('cx') || '64';
            const cy = circle.getAttribute('cy') || '64';
            const r = circle.getAttribute('r') || '50';
            clipPathContent = `<circle cx="${cx}" cy="${cy}" r="${r}"/>`;
          } else if (path) {
            const d = path.getAttribute('d') || '';
            clipPathContent = `<path d="${d}"/>`;
          } else if (rect) {
            const x = rect.getAttribute('x') || '0';
            const y = rect.getAttribute('y') || '0';
            const w = rect.getAttribute('width') || '100';
            const h = rect.getAttribute('height') || '100';
            const rx = rect.getAttribute('rx') || '0';
            clipPathContent = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}"/>`;
          }
        }
        
        // Colorize the border SVG
        let colorized = sanitized
          .replace(/fill\s*=\s*["'](?:#000000|#000|black|rgb\(0,\s*0,\s*0\))["']/gi, `fill="${color}"`)
          .replace(/stroke\s*=\s*["'](?:#000000|#000|black|rgb\(0,\s*0,\s*0\))["']/gi, `stroke="${color}"`)
          .replace(/fill\s*:\s*(?:#000000|#000|black|rgb\(0,\s*0,\s*0\))/gi, `fill: ${color}`)
          .replace(/stroke\s*:\s*(?:#000000|#000|black|rgb\(0,\s*0,\s*0\))/gi, `stroke: ${color}`)
          .replace(/fill\s*=\s*["']currentColor["']/gi, `fill="${color}"`)
          .replace(/stroke\s*=\s*["']currentColor["']/gi, `stroke="${color}"`)
          .replace(/fill\s*:\s*currentColor/gi, `fill: ${color}`)
          .replace(/stroke\s*:\s*currentColor/gi, `stroke: ${color}`)
          .replace(/stroke-width\s*=\s*["']\d+["']/gi, `stroke-width="2"`)
          .replace(/stroke-width\s*:\s*\d+/gi, `stroke-width: 2`);
        
        // Create the clip path SVG definition
        const clipSvg = clipPathContent 
          ? `<svg width="0" height="0" style="position:absolute"><defs><clipPath id="${clipId}" clipPathUnits="objectBoundingBox" transform="scale(0.0078125)">${clipPathContent}</clipPath></defs></svg>`
          : '';
        
        setData({ borderSvg: colorized, clipPath: clipPathContent ? clipId : '' });
      })
      .catch(err => console.error('Failed to load SVG:', err));
  }, [svgUrl, color, clipId]);
  
  return { ...data, clipId };
};

// Component to render SVG border
const InlineSvgBorder: React.FC<{
  svgUrl: string;
  color: string;
  className?: string;
  style?: React.CSSProperties;
}> = ({ svgUrl, color, className, style }) => {
  const [svgContent, setSvgContent] = useState<string>('');
  
  useEffect(() => {
    if (!svgUrl) return;
    
    fetch(svgUrl)
      .then(res => res.text())
      .then(svg => {
        const sanitized = DOMPurify.sanitize(svg, { 
          USE_PROFILES: { svg: true, svgFilters: true },
          ADD_TAGS: ['animate', 'animateTransform', 'animateMotion', 'set'],
          ADD_ATTR: ['attributeName', 'attributeType', 'begin', 'dur', 'end', 'from', 'to', 'by', 'values', 'keyTimes', 'keySplines', 'calcMode', 'repeatCount', 'repeatDur', 'fill', 'additive', 'accumulate', 'type', 'restart']
        });
        
        let colorized = sanitized
          .replace(/fill\s*=\s*["'](?:#000000|#000|black|rgb\(0,\s*0,\s*0\))["']/gi, `fill="${color}"`)
          .replace(/stroke\s*=\s*["'](?:#000000|#000|black|rgb\(0,\s*0,\s*0\))["']/gi, `stroke="${color}"`)
          .replace(/fill\s*:\s*(?:#000000|#000|black|rgb\(0,\s*0,\s*0\))/gi, `fill: ${color}`)
          .replace(/stroke\s*:\s*(?:#000000|#000|black|rgb\(0,\s*0,\s*0\))/gi, `stroke: ${color}`)
          .replace(/fill\s*=\s*["']currentColor["']/gi, `fill="${color}"`)
          .replace(/stroke\s*=\s*["']currentColor["']/gi, `stroke="${color}"`)
          .replace(/fill\s*:\s*currentColor/gi, `fill: ${color}`)
          .replace(/stroke\s*:\s*currentColor/gi, `stroke: ${color}`)
          .replace(/stroke-width\s*=\s*["']\d+["']/gi, `stroke-width="2"`)
          .replace(/stroke-width\s*:\s*\d+/gi, `stroke-width: 2`);
        
        setSvgContent(colorized);
      })
      .catch(err => console.error('Failed to load SVG:', err));
  }, [svgUrl, color]);
  
  if (!svgContent) return null;
  
  return (
    <div 
      className={className}
      style={style}
      dangerouslySetInnerHTML={{ __html: svgContent }}
    />
  );
};

// Component to create an SVG clip path from border shape
const SvgClipPath: React.FC<{ svgUrl: string; clipId: string }> = ({ svgUrl, clipId }) => {
  const [clipContent, setClipContent] = useState<string>('');
  const [viewBox, setViewBox] = useState<string>('0 0 128 128');
  
  useEffect(() => {
    if (!svgUrl) return;
    
    fetch(svgUrl)
      .then(res => res.text())
      .then(svg => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(svg, 'image/svg+xml');
        const svgEl = doc.querySelector('svg');
        
        if (svgEl) {
          const vb = svgEl.getAttribute('viewBox') || '0 0 128 128';
          setViewBox(vb);
          
          const circle = svgEl.querySelector('circle');
          const path = svgEl.querySelector('path');
          const rect = svgEl.querySelector('rect');
          
          let shapeContent = '';
          if (circle) {
            const cx = circle.getAttribute('cx') || '64';
            const cy = circle.getAttribute('cy') || '64';
            const r = circle.getAttribute('r') || '50';
            shapeContent = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="black"/>`;
          } else if (path) {
            const d = path.getAttribute('d') || '';
            shapeContent = `<path d="${d}" fill="black"/>`;
          } else if (rect) {
            const x = rect.getAttribute('x') || '0';
            const y = rect.getAttribute('y') || '0';
            const w = rect.getAttribute('width') || '100';
            const h = rect.getAttribute('height') || '100';
            const rx = rect.getAttribute('rx') || '0';
            shapeContent = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="black"/>`;
          }
          
          if (shapeContent) {
            setClipContent(shapeContent);
          }
        }
      })
      .catch(err => console.error('Failed to parse SVG for clip path:', err));
  }, [svgUrl]);
  
  if (!clipContent) return null;
  
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }}>
      <defs>
        <clipPath id={clipId} clipPathUnits="userSpaceOnUse" viewBox={viewBox}>
          <g dangerouslySetInnerHTML={{ __html: clipContent }} />
        </clipPath>
      </defs>
    </svg>
  );
};

interface CustomAvatarProps {
  user: User;
  size?: "sm" | "md" | "lg" | "xl" | "2xl" | "profile";
  className?: string;
  showBorder?: boolean;
  borderIntensity?: "subtle" | "normal" | "strong";
  showAvatarBorderOverlay?: boolean;
}

const sizeClasses = {
  sm: "h-8 w-8",
  md: "h-12 w-12", 
  lg: "h-16 w-16",
  xl: "h-20 w-20",
  "2xl": "h-32 w-32",
  "profile": "h-40 w-40 sm:h-48 sm:w-48 md:h-56 md:w-56"
};

const containerSizes = {
  sm: "h-11 w-11",
  md: "h-16 w-16",
  lg: "h-22 w-22",
  xl: "h-28 w-28",
  "2xl": "h-44 w-44",
  "profile": "h-52 w-52 sm:h-60 sm:w-60 md:h-72 md:w-72"
};

const borderStyles = {
  subtle: (color: string) => `0 0 0 1px ${color}66, 0 0 8px ${color}22`,
  normal: (color: string) => `0 0 0 2px ${color}66, 0 0 15px ${color}33`,
  strong: (color: string) => `0 0 0 3px ${color}88, 0 0 20px ${color}44`
};

export const CustomAvatar = ({ 
  user, 
  size = "md", 
  className = "", 
  showBorder = true,
  borderIntensity = "normal",
  showAvatarBorderOverlay = true
}: CustomAvatarProps) => {
  const borderColor = user?.avatarBorderColor || '#ffffff';
  const safeDisplayName = user?.displayName || user?.username || "?";
  const clipId = useMemo(() => `avatar-clip-${user?.id || 'default'}-${Math.random().toString(36).substr(2, 6)}`, [user?.id]);
  
  const { data: borderData } = useQuery<{ avatarBorder: AssetReward | null }>({
    queryKey: [`/api/user/${user?.id}/avatar-border`],
    queryFn: getQueryFn({ on401: 'returnNull' }),
    enabled: showAvatarBorderOverlay && !!user?.selectedAvatarBorderId,
    staleTime: 5 * 60 * 1000,
  });

  const avatarBorder = borderData?.avatarBorder;
  const hasAvatarBorderOverlay = showAvatarBorderOverlay && avatarBorder?.imageUrl;

  if (hasAvatarBorderOverlay) {
    return (
      <div className={`relative inline-flex items-center justify-center ${containerSizes[size]} ${className}`}>
        {/* Glow effect behind the avatar - matches border color */}
        <div 
          className={`absolute ${sizeClasses[size]} rounded-full z-0`}
          style={{
            boxShadow: `0 0 25px ${borderColor}80, 0 0 50px ${borderColor}50, 0 0 75px ${borderColor}30`
          }}
        />
        
        {/* Avatar - the actual profile picture */}
        <Avatar 
          className={`${sizeClasses[size]} transition-all duration-300 rounded-full z-10 relative`}
        >
          <AvatarImage 
            src={user?.avatarUrl || ""} 
            alt={safeDisplayName} 
            className="rounded-full object-cover w-full h-full"
          />
          <AvatarFallback className="bg-primary/20 text-foreground font-semibold rounded-full">
            {safeDisplayName.substring(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        
        {/* SVG Border with inline color replacement - scaled to fit around avatar */}
        <InlineSvgBorder
          svgUrl={avatarBorder.imageUrl}
          color={borderColor}
          className="absolute inset-0 w-full h-full pointer-events-none z-20 [&>svg]:w-full [&>svg]:h-full"
          style={{ transform: 'scale(1.38)' }}
        />
      </div>
    );
  }

  const displayName = user?.displayName || user?.username || "?";
  
  return (
    <Avatar 
      className={`${sizeClasses[size]} transition-all duration-300 rounded-full ${className}`}
      style={showBorder ? {
        boxShadow: borderStyles[borderIntensity](borderColor)
      } : {}}
    >
      <AvatarImage src={user?.avatarUrl || ""} alt={displayName} className="rounded-full object-cover" />
      <AvatarFallback className="bg-primary/20 text-foreground font-semibold rounded-full">
        {displayName.substring(0, 2).toUpperCase()}
      </AvatarFallback>
    </Avatar>
  );
};

export default CustomAvatar;
