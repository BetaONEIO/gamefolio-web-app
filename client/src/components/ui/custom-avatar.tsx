import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, AssetReward } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import { useState, useEffect } from "react";
import DOMPurify from "dompurify";

// Component to fetch SVG and render it inline with color replacement
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
        // Sanitize the SVG with animation elements allowed
        const sanitized = DOMPurify.sanitize(svg, { 
          USE_PROFILES: { svg: true, svgFilters: true },
          ADD_TAGS: ['animate', 'animateTransform', 'animateMotion', 'set'],
          ADD_ATTR: ['attributeName', 'attributeType', 'begin', 'dur', 'end', 'from', 'to', 'by', 'values', 'keyTimes', 'keySplines', 'calcMode', 'repeatCount', 'repeatDur', 'fill', 'additive', 'accumulate', 'type', 'restart']
        });
        
        // Replace black colors with the user's selected color
        let colorized = sanitized
          .replace(/fill\s*=\s*["'](?:#000000|#000|black|rgb\(0,\s*0,\s*0\))["']/gi, `fill="${color}"`)
          .replace(/stroke\s*=\s*["'](?:#000000|#000|black|rgb\(0,\s*0,\s*0\))["']/gi, `stroke="${color}"`)
          .replace(/fill\s*:\s*(?:#000000|#000|black|rgb\(0,\s*0,\s*0\))/gi, `fill: ${color}`)
          .replace(/stroke\s*:\s*(?:#000000|#000|black|rgb\(0,\s*0,\s*0\))/gi, `stroke: ${color}`);
        
        // Also replace currentColor with the selected color
        colorized = colorized
          .replace(/fill\s*=\s*["']currentColor["']/gi, `fill="${color}"`)
          .replace(/stroke\s*=\s*["']currentColor["']/gi, `stroke="${color}"`)
          .replace(/fill\s*:\s*currentColor/gi, `fill: ${color}`)
          .replace(/stroke\s*:\s*currentColor/gi, `stroke: ${color}`);
        
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
  const borderColor = user?.avatarBorderColor || 'hsl(var(--primary))';
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
        {/* Avatar without circular glow - SVG border handles all decoration */}
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
