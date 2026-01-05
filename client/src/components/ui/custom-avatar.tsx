import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, AssetReward } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import { useState, useEffect, useMemo } from "react";
import DOMPurify from "dompurify";

// Component that renders avatar clipped to SVG border shape
const ClippedAvatarWithBorder: React.FC<{
  svgUrl: string;
  avatarUrl: string;
  color: string;
  className?: string;
  fallbackText: string;
}> = ({ svgUrl, avatarUrl, color, className, fallbackText }) => {
  const [svgData, setSvgData] = useState<{
    viewBox: string;
    clipShape: string;
    borderContent: string;
  } | null>(null);
  
  const clipId = useMemo(() => `clip-${Math.random().toString(36).substr(2, 9)}`, []);
  
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
        
        const parser = new DOMParser();
        const doc = parser.parseFromString(sanitized, 'image/svg+xml');
        const svgEl = doc.querySelector('svg');
        
        if (!svgEl) return;
        
        const viewBox = svgEl.getAttribute('viewBox') || '0 0 128 128';
        
        // Extract the first shape element for clipping
        const circle = svgEl.querySelector('circle');
        const path = svgEl.querySelector('path');
        const rect = svgEl.querySelector('rect');
        
        let clipShape = '';
        if (circle) {
          const cx = circle.getAttribute('cx') || '64';
          const cy = circle.getAttribute('cy') || '64';
          const r = circle.getAttribute('r') || '50';
          clipShape = `<circle cx="${cx}" cy="${cy}" r="${r}"/>`;
        } else if (path) {
          const d = path.getAttribute('d') || '';
          clipShape = `<path d="${d}"/>`;
        } else if (rect) {
          const x = rect.getAttribute('x') || '0';
          const y = rect.getAttribute('y') || '0';
          const w = rect.getAttribute('width') || '100';
          const h = rect.getAttribute('height') || '100';
          const rx = rect.getAttribute('rx') || '0';
          clipShape = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}"/>`;
        }
        
        // Colorize and prepare border content (everything inside the SVG)
        let borderContent = sanitized
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
        
        // Extract inner content of SVG (remove outer svg tags)
        const innerMatch = borderContent.match(/<svg[^>]*>([\s\S]*)<\/svg>/i);
        const innerContent = innerMatch ? innerMatch[1] : '';
        
        setSvgData({ viewBox, clipShape, borderContent: innerContent });
      })
      .catch(err => console.error('Failed to load SVG border:', err));
  }, [svgUrl, color]);
  
  if (!svgData) {
    // Loading state - show circular avatar
    return (
      <div className={`relative ${className}`}>
        <Avatar className="w-full h-full rounded-full">
          <AvatarImage src={avatarUrl} className="rounded-full object-cover" />
          <AvatarFallback className="bg-primary/20 text-foreground font-semibold rounded-full">
            {fallbackText}
          </AvatarFallback>
        </Avatar>
      </div>
    );
  }
  
  return (
    <svg 
      viewBox={svgData.viewBox} 
      className={className}
      style={{ overflow: 'visible' }}
    >
      {/* Define clip path from the border shape */}
      <defs>
        <clipPath id={clipId}>
          <g dangerouslySetInnerHTML={{ __html: svgData.clipShape }} />
        </clipPath>
      </defs>
      
      {/* Avatar image clipped to the border shape */}
      <image
        href={avatarUrl}
        x="0"
        y="0"
        width="100%"
        height="100%"
        preserveAspectRatio="xMidYMid slice"
        clipPath={`url(#${clipId})`}
      />
      
      {/* Border strokes on top */}
      <g dangerouslySetInnerHTML={{ __html: svgData.borderContent }} />
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
        {/* Glow effect behind the profile picture - subtle glow matching border color */}
        <div 
          className={`absolute ${sizeClasses[size]} rounded-full`}
          style={{
            boxShadow: `0 0 20px ${borderColor}50, 0 0 40px ${borderColor}30`,
            zIndex: 0
          }}
        />
        
        {/* Avatar clipped to border shape with border strokes on top */}
        <ClippedAvatarWithBorder
          svgUrl={avatarBorder.imageUrl}
          avatarUrl={user?.avatarUrl || ""}
          color={borderColor}
          className={`${sizeClasses[size]} relative`}
          fallbackText={safeDisplayName.substring(0, 2).toUpperCase()}
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
