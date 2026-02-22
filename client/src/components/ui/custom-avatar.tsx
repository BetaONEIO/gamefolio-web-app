import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, AssetReward } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import { useState, useEffect, useMemo } from "react";
import DOMPurify from "dompurify";
import { useSignedUrl } from "@/hooks/use-signed-url";
import NftProfilePopup from "@/components/nft/NftProfilePopup";

// Helper to extract clip path from SVG and generate border content
const useSvgBorderData = (svgUrl: string, color: string) => {
  const [data, setData] = useState<{ borderSvg: string; clipPath: string } | null>(null);
  const clipId = useMemo(() => `clip-${Math.random().toString(36).substr(2, 9)}`, []);
  
  // Get signed URL for the SVG
  const { signedUrl } = useSignedUrl(svgUrl);
  
  useEffect(() => {
    // Wait for signed URL if the original URL is a Supabase URL
    const urlToFetch = signedUrl || svgUrl;
    if (!urlToFetch) return;
    
    // Don't fetch if we need a signed URL but don't have one yet
    if (svgUrl && svgUrl.includes('supabase.co') && !signedUrl) return;
    
    fetch(urlToFetch)
      .then(res => {
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        return res.text();
      })
      .then(svg => {
        if (!svg.includes('<svg') && !svg.includes('<?xml')) {
          console.error('Invalid SVG content received');
          return;
        }
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
  }, [svgUrl, signedUrl, color, clipId]);
  
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
  
  // Get signed URL for the SVG
  const { signedUrl } = useSignedUrl(svgUrl);
  
  useEffect(() => {
    // Wait for signed URL if the original URL is a Supabase URL
    const urlToFetch = signedUrl || svgUrl;
    if (!urlToFetch) return;
    
    // Don't fetch if we need a signed URL but don't have one yet
    if (svgUrl && svgUrl.includes('supabase.co') && !signedUrl) return;
    
    fetch(urlToFetch)
      .then(res => {
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        return res.text();
      })
      .then(svg => {
        if (!svg.includes('<svg') && !svg.includes('<?xml')) {
          console.error('Invalid SVG content received');
          return;
        }
        
        const sanitized = DOMPurify.sanitize(svg, { 
          USE_PROFILES: { svg: true, svgFilters: true },
          ADD_TAGS: ['style', 'animate', 'animateTransform', 'animateMotion', 'set'],
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
  }, [svgUrl, signedUrl, color]);
  
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
  
  // Get signed URL for the SVG
  const { signedUrl } = useSignedUrl(svgUrl);
  
  useEffect(() => {
    // Wait for signed URL if the original URL is a Supabase URL
    const urlToFetch = signedUrl || svgUrl;
    if (!urlToFetch) return;
    
    // Don't fetch if we need a signed URL but don't have one yet
    if (svgUrl && svgUrl.includes('supabase.co') && !signedUrl) return;
    
    fetch(urlToFetch)
      .then(res => {
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        return res.text();
      })
      .then(svg => {
        if (!svg.includes('<svg') && !svg.includes('<?xml')) {
          console.error('Invalid SVG content received');
          return;
        }
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
  }, [svgUrl, signedUrl]);
  
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
  size?: "sm" | "md" | "lg" | "xl" | "2xl" | "mobile-profile" | "profile";
  className?: string;
  showBorder?: boolean;
  borderIntensity?: "subtle" | "normal" | "strong";
  showAvatarBorderOverlay?: boolean;
  onNftClick?: (userId: number, tokenId: number, imageUrl: string, event: React.MouseEvent) => void;
}

const sizeClasses = {
  sm: "h-8 w-8",
  md: "h-12 w-12", 
  lg: "h-16 w-16",
  xl: "h-20 w-20",
  "2xl": "h-32 w-32",
  "mobile-profile": "h-28 w-28",
  "profile": "h-40 w-40 sm:h-48 sm:w-48 md:h-56 md:w-56"
};

const containerSizes = {
  sm: "h-11 w-11",
  md: "h-16 w-16",
  lg: "h-22 w-22",
  xl: "h-28 w-28",
  "2xl": "h-44 w-44",
  "mobile-profile": "h-36 w-36",
  "profile": "h-52 w-52 sm:h-60 sm:w-60 md:h-72 md:w-72"
};

const borderStyles = {
  subtle: (color: string) => `0 0 0 1px ${color}66, 0 0 8px ${color}22`,
  normal: (color: string) => `0 0 0 1px ${color}66, 0 0 15px ${color}33`,
  strong: (color: string) => `0 0 0 3px ${color}88, 0 0 20px ${color}44`
};

const nftSizeClasses = {
  sm: "h-8 w-8",
  md: "h-12 w-12",
  lg: "h-16 w-16",
  xl: "h-20 w-20",
  "2xl": "h-32 w-32",
  "mobile-profile": "h-28 w-28",
  "profile": "h-40 w-40 sm:h-48 sm:w-48 md:h-56 md:w-56"
};

export const CustomAvatar = ({ 
  user, 
  size = "md", 
  className = "", 
  showBorder = true,
  borderIntensity = "normal",
  showAvatarBorderOverlay = true,
  onNftClick
}: CustomAvatarProps) => {
  const borderColor = 'hsl(var(--primary))';
  const safeDisplayName = user?.displayName || user?.username || "?";
  const clipId = useMemo(() => `avatar-clip-${user?.id || 'default'}-${Math.random().toString(36).substr(2, 6)}`, [user?.id]);
  
  const hasNftProfile = !!(user?.nftProfileTokenId && user?.nftProfileImageUrl && (user?.activeProfilePicType === 'nft' || !user?.activeProfilePicType));
  const [showNftPopup, setShowNftPopup] = useState(false);
  const [nftAnchorRect, setNftAnchorRect] = useState<DOMRect | null>(null);
  const [nftImageError, setNftImageError] = useState(false);

  const nftThumbUrl = useMemo(() => {
    if (!hasNftProfile || !user?.nftProfileImageUrl) return null;
    const thumbSize = size === 'sm' ? 64 : size === 'md' ? 96 : size === 'lg' ? 128 : 256;
    return user.nftProfileImageUrl.replace('/api/nft/image/', '/api/nft/thumb/') + `?s=${thumbSize}`;
  }, [hasNftProfile, user?.nftProfileImageUrl, size]);
  
  // Get signed URL for avatar (private bucket)
  const { signedUrl: avatarSignedUrl } = useSignedUrl(user?.avatarUrl);
  
  // Get signed URL for NFT profile image (may also be in private bucket)
  const { signedUrl: nftSignedUrl } = useSignedUrl(user?.nftProfileImageUrl);
  
  const { data: borderData } = useQuery<{ avatarBorder: AssetReward | null }>({
    queryKey: [`/api/user/${user?.id}/avatar-border`],
    queryFn: getQueryFn({ on401: 'returnNull' }),
    enabled: showAvatarBorderOverlay && !!user?.selectedAvatarBorderId,
    staleTime: 5 * 60 * 1000,
  });

  const avatarBorder = borderData?.avatarBorder;
  const hasAvatarBorderOverlay = showAvatarBorderOverlay && avatarBorder?.imageUrl;
  const hasSolidBorder = showAvatarBorderOverlay && avatarBorder?.id === -1;

  if (hasNftProfile) {
    const handleNftAvatarClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (onNftClick && user?.id && user?.nftProfileTokenId) {
        onNftClick(user.id, user.nftProfileTokenId, user.nftProfileImageUrl || '', e);
      } else if (user?.id && user?.nftProfileTokenId) {
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        setNftAnchorRect(rect);
        setShowNftPopup(true);
      }
    };

    return (
      <>
      <div
        className={`${nftSizeClasses[size]} relative inline-flex items-center justify-center ${className} cursor-pointer`}
        onClick={handleNftAvatarClick}
      >
        <div
          className="w-full h-full rounded-lg overflow-hidden border-2 bg-black"
          style={{ borderColor: borderColor }}
        >
          {nftThumbUrl && !nftImageError ? (
            <img
              src={nftThumbUrl}
              alt={safeDisplayName}
              className="w-full h-full object-cover"
              onError={() => setNftImageError(true)}
              crossOrigin="anonymous"
            />
          ) : nftImageError ? (
            <div
              className="w-full h-full flex items-center justify-center text-xs font-bold text-primary-foreground"
              style={{ backgroundColor: user.accentColor || borderColor }}
            >
              {safeDisplayName.substring(0, 2).toUpperCase()}
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>
        <div className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full flex items-center justify-center shadow-sm" style={{ backgroundColor: borderColor }}>
          <svg width="8" height="8" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path fillRule="evenodd" clipRule="evenodd" d="M6.3515 1.97329C6.24341 2.0703 6.13026 2.1615 6.01252 2.24653C5.80845 2.38349 5.57904 2.47799 5.338 2.52593C5.23322 2.54647 5.12365 2.55537 4.9052 2.57249C4.35668 2.61632 4.08208 2.63823 3.85335 2.71904C3.3235 2.9058 2.90677 3.32253 2.72001 3.85238C2.63921 4.0811 2.61729 4.3557 2.57347 4.90423C2.5656 5.04921 2.55006 5.19368 2.5269 5.33702C2.47897 5.57807 2.38446 5.80748 2.2475 6.01154C2.18793 6.10057 2.11671 6.18411 1.97427 6.35052C1.61749 6.76962 1.43876 6.97916 1.33398 7.1983C1.09225 7.70505 1.09225 8.29397 1.33398 8.80072C1.43876 9.01986 1.61749 9.22941 1.97427 9.6485C2.11671 9.81491 2.18793 9.89846 2.2475 9.98748C2.38446 10.1915 2.47897 10.421 2.5269 10.662C2.54745 10.7668 2.55635 10.8763 2.57347 11.0948C2.61729 11.6433 2.63921 11.9179 2.72001 12.1466C2.90677 12.6765 3.3235 13.0932 3.85335 13.28C4.08208 13.3608 4.35668 13.3827 4.9052 13.4265C5.12365 13.4437 5.23322 13.4526 5.338 13.4731C5.57904 13.521 5.80845 13.6162 6.01252 13.7525C6.10154 13.8121 6.18509 13.8833 6.3515 14.0257C6.77059 14.3825 6.98014 14.5612 7.19928 14.666C7.70603 14.9077 8.29495 14.9077 8.8017 14.666C9.02084 14.5612 9.23038 14.3825 9.64948 14.0257C9.81589 13.8833 9.89943 13.8121 9.98846 13.7525C10.1925 13.6155 10.4219 13.521 10.663 13.4731C10.7678 13.4526 10.8773 13.4437 11.0958 13.4265C11.6443 13.3827 11.9189 13.3608 12.1476 13.28C12.6775 13.0932 13.0942 12.6765 13.281 12.1466C13.3618 11.9179 13.3837 11.6433 13.4275 11.0948C13.4446 10.8763 13.4535 10.7668 13.4741 10.662C13.522 10.421 13.6172 10.1915 13.7535 9.98748C13.813 9.89846 13.8843 9.81491 14.0267 9.6485C14.3835 9.22941 14.5622 9.01986 14.667 8.80072C14.9087 8.29397 14.9087 7.70505 14.667 7.1983C14.5622 6.97916 14.3835 6.76962 14.0267 6.35052C13.9297 6.24244 13.8385 6.12929 13.7535 6.01154C13.6164 5.80751 13.5214 5.5782 13.4741 5.33702C13.4509 5.19368 13.4354 5.04921 13.4275 4.90423C13.3837 4.3557 13.3618 4.0811 13.281 3.85238C13.0942 3.32253 12.6775 2.9058 12.1476 2.71904C11.9189 2.63823 11.6443 2.61632 11.0958 2.57249C10.8773 2.55537 10.7678 2.54647 10.663 2.52593C10.4219 2.47799 10.1925 2.38349 9.98846 2.24653C9.89943 2.1869 9.81589 2.11568 9.64948 1.97329C9.23038 1.61651 9.02084 1.43778 8.8017 1.333C8.29495 1.09127 7.70603 1.09127 7.19928 1.333C6.98014 1.43778 6.77059 1.61651 6.3515 1.97329Z" fill="#022C22" />
          </svg>
        </div>
      </div>
      {!onNftClick && showNftPopup && user?.id && user?.nftProfileTokenId && (
        <NftProfilePopup
          userId={user.id}
          tokenId={user.nftProfileTokenId}
          imageUrl={user.nftProfileImageUrl || ''}
          onClose={() => { setShowNftPopup(false); setNftAnchorRect(null); }}
          anchorRect={null}
          username={user?.username || user?.displayName}
        />
      )}
      </>
    );
  }

  if (hasSolidBorder) {
    const solidColor = user?.avatarBorderColor || borderColor;
    const solidBorderWidth = (size === 'sm' || size === 'md') ? 3 : 4;
    return (
      <div className={`relative inline-flex items-center justify-center ${className}`}>
        <Avatar 
          className={`${sizeClasses[size]} transition-all duration-300 rounded-full`}
          style={{
            border: `${solidBorderWidth}px solid ${solidColor}`,
            boxShadow: `0 0 12px ${solidColor}50`
          }}
        >
          <AvatarImage 
            src={avatarSignedUrl || user?.avatarUrl || ""} 
            alt={safeDisplayName} 
            className="rounded-full object-cover"
          />
          <AvatarFallback className="bg-primary/20 text-foreground font-semibold rounded-full">
            {safeDisplayName.substring(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      </div>
    );
  }

  if (hasAvatarBorderOverlay) {
    return (
      <div className={`relative inline-flex items-center justify-center ${sizeClasses[size]} ${className}`} style={{ overflow: 'visible' }}>
        {/* Glow effect behind the profile picture - subtle glow matching border color */}
        <div 
          className="absolute inset-0 rounded-full"
          style={{
            boxShadow: `0 0 20px ${borderColor}50, 0 0 40px ${borderColor}30`,
            zIndex: 0
          }}
        />
        
        {/* Avatar - the actual profile picture (no border, just the image) */}
        <Avatar 
          className={`${sizeClasses[size]} transition-all duration-300 rounded-full relative border-0`}
          style={{ zIndex: 10 }}
        >
          <AvatarImage 
            src={avatarSignedUrl || user?.avatarUrl || ""} 
            alt={safeDisplayName} 
            className="rounded-full object-cover w-full h-full"
          />
          <AvatarFallback className="bg-primary/20 text-foreground font-semibold rounded-full">
            {safeDisplayName.substring(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        
        {/* SVG Border with inline color replacement - larger than avatar to wrap around it properly */}
        <InlineSvgBorder
          svgUrl={avatarBorder.imageUrl}
          color={borderColor}
          className="absolute pointer-events-none [&>svg]:w-full [&>svg]:h-full"
          style={{ 
            width: '160%', 
            height: '160%', 
            top: '-30%', 
            left: '-30%',
            zIndex: 20 
          }}
        />
      </div>
    );
  }

  const displayName = user?.displayName || user?.username || "?";
  const hasUploadedAvatar = !!(avatarSignedUrl || user?.avatarUrl);
  const showDefaultCircleBorder = showBorder && hasUploadedAvatar && !hasNftProfile;
  
  return (
    <Avatar 
      className={`${sizeClasses[size]} transition-all duration-300 rounded-full ${className}`}
      style={showBorder ? {
        boxShadow: borderStyles[borderIntensity](borderColor),
        ...(showDefaultCircleBorder ? { border: '2px solid hsl(var(--primary))', padding: '1px' } : {})
      } : {}}
    >
      <AvatarImage src={avatarSignedUrl || user?.avatarUrl || ""} alt={displayName} className="rounded-full object-cover" />
      <AvatarFallback className="bg-primary/20 text-foreground font-semibold rounded-full">
        {displayName.substring(0, 2).toUpperCase()}
      </AvatarFallback>
    </Avatar>
  );
};

export default CustomAvatar;
