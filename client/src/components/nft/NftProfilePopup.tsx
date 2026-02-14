import { createPortal } from "react-dom";
import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import { X } from "lucide-react";
import { useEffect, useRef, useState, useCallback } from "react";

interface NftAttribute {
  trait_type: string;
  value: string;
}

interface NftProfilePopupProps {
  userId: number;
  tokenId: number;
  imageUrl?: string;
  onClose: () => void;
  anchorRect?: DOMRect | null;
  username?: string;
}

function getTokenIdPadded(id: number): string {
  return `#${String(id).padStart(3, "0")}`;
}

const RARITY_MAP: Record<string, { label: string; color: string; bg: string; percent: string }> = {
  common: { label: "Common", color: "text-[#94a3b8]", bg: "bg-[#94a3b8]/10 border-[#94a3b8]/20", percent: "62%" },
  uncommon: { label: "Uncommon", color: "text-[#4ade80]", bg: "bg-[#4ade80]/10 border-[#4ade80]/20", percent: "25%" },
  rare: { label: "Rare", color: "text-[#38bdf8]", bg: "bg-[#38bdf8]/10 border-[#38bdf8]/20", percent: "10%" },
  epic: { label: "Epic", color: "text-[#a78bfa]", bg: "bg-[#a78bfa]/10 border-[#a78bfa]/20", percent: "3%" },
};

function getTraitRarity(traitType: string, value: string): keyof typeof RARITY_MAP {
  let hash = 0;
  const str = `${traitType}:${value}`;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  const n = Math.abs(hash) % 100;
  if (n < 3) return "epic";
  if (n < 13) return "rare";
  if (n < 38) return "uncommon";
  return "common";
}

export default function NftProfilePopup({ userId, tokenId, imageUrl, onClose, anchorRect, username }: NftProfilePopupProps) {
  const popupRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);

  const calculatePosition = useCallback(() => {
    if (!anchorRect || !popupRef.current) return;
    const popup = popupRef.current;
    const popupWidth = popup.offsetWidth || 340;
    const popupHeight = popup.offsetHeight || 500;
    const gap = 8;
    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;
    const padding = 12;

    const anchorCenterX = anchorRect.left + anchorRect.width / 2;
    let left = anchorCenterX - popupWidth / 2;
    let top = anchorRect.bottom + gap;

    if (top + popupHeight > viewportH - padding) {
      top = anchorRect.top - popupHeight - gap;
    }

    if (top < padding) {
      top = padding;
    }

    if (left + popupWidth > viewportW - padding) {
      left = viewportW - popupWidth - padding;
    }
    if (left < padding) {
      left = padding;
    }

    setPosition({ top, left });
  }, [anchorRect]);

  useEffect(() => {
    if (anchorRect) {
      requestAnimationFrame(calculatePosition);
    }
  }, [anchorRect, calculatePosition]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  const { data, isLoading } = useQuery<{
    hasNftProfile: boolean;
    tokenId: number;
    imageUrl: string;
    metadata: {
      name?: string;
      image?: string;
      attributes?: NftAttribute[];
    } | null;
  }>({
    queryKey: [`/api/nft/profile-picture/${userId}`],
    queryFn: getQueryFn({ on401: 'returnNull' }),
    staleTime: 60 * 1000,
  });

  const metadata = data?.metadata;
  const nftImage = metadata?.image || data?.imageUrl || imageUrl || "";
  const displayName = metadata?.name || `Gamefolio Genesis ${getTokenIdPadded(tokenId)}`;
  const ownerDisplay = username || "Owner";

  const allAttributes = metadata?.attributes || [];

  const hasAnchor = !!anchorRect;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999]"
      onClick={(e) => {
        e.stopPropagation();
        onClose();
      }}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      <div
        ref={popupRef}
        className={`${hasAnchor ? 'absolute' : 'fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2'} z-10 w-[340px] max-w-[95vw] max-h-[85vh] bg-[#0f172a] rounded-2xl overflow-hidden shadow-[0_25px_50px_-12px_rgba(0,0,0,0.6)] border border-[#1e293b] flex flex-col animate-in fade-in zoom-in-95 duration-150`}
        style={hasAnchor && position ? { top: position.top, left: position.left } : hasAnchor ? { visibility: 'hidden' } : undefined}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative w-full flex-shrink-0">
          {isLoading ? (
            <div className="w-full aspect-square bg-[#1e293b] flex items-center justify-center">
              <div className="w-10 h-10 rounded-full border-2 border-[#4ade80]/30 border-t-[#4ade80] animate-spin" />
            </div>
          ) : nftImage ? (
            <img
              src={nftImage}
              alt={displayName}
              className="w-full aspect-square object-contain bg-[#1e293b]"
            />
          ) : (
            <div className="w-full aspect-square bg-[#1e293b] flex items-center justify-center">
              <span className="text-[#64748b] text-sm">No image</span>
            </div>
          )}

          <button
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="absolute top-3 right-3 z-20 w-7 h-7 rounded-full bg-black/50 backdrop-blur-lg flex items-center justify-center hover:bg-black/70 transition-colors"
          >
            <X className="w-3.5 h-3.5 text-white" />
          </button>

          <div className="absolute top-3 left-3 backdrop-blur-lg bg-black/50 rounded-xl flex items-center gap-1.5 px-2 py-1">
            <div className="w-2 h-2 rounded-full bg-[#4ade80]" />
            <span className="text-[8px] font-bold text-white uppercase tracking-[0.5px]">
              NFT Profile
            </span>
          </div>
        </div>

        <div className="flex-1 flex flex-col p-4 overflow-y-auto scrollbar-hide font-['Plus_Jakarta_Sans',sans-serif]" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          <div className="flex flex-col gap-1 mb-3">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium text-[#4ade80] leading-4">Genesis Collection</span>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path fillRule="evenodd" clipRule="evenodd" d="M6.3515 1.97329C6.24341 2.0703 6.13026 2.1615 6.01252 2.24653C5.80845 2.38349 5.57904 2.47799 5.338 2.52593C5.23322 2.54647 5.12365 2.55537 4.9052 2.57249C4.35668 2.61632 4.08208 2.63823 3.85335 2.71904C3.3235 2.9058 2.90677 3.32253 2.72001 3.85238C2.63921 4.0811 2.61729 4.3557 2.57347 4.90423C2.5656 5.04921 2.55006 5.19368 2.5269 5.33702C2.47897 5.57807 2.38446 5.80748 2.2475 6.01154C2.18793 6.10057 2.11671 6.18411 1.97427 6.35052C1.61749 6.76962 1.43876 6.97916 1.33398 7.1983C1.09225 7.70505 1.09225 8.29397 1.33398 8.80072C1.43876 9.01986 1.61749 9.22941 1.97427 9.6485C2.11671 9.81491 2.18793 9.89846 2.2475 9.98748C2.38446 10.1915 2.47897 10.421 2.5269 10.662C2.54745 10.7668 2.55635 10.8763 2.57347 11.0948C2.61729 11.6433 2.63921 11.9179 2.72001 12.1466C2.90677 12.6765 3.3235 13.0932 3.85335 13.28C4.08208 13.3608 4.35668 13.3827 4.9052 13.4265C5.12365 13.4437 5.23322 13.4526 5.338 13.4731C5.57904 13.521 5.80845 13.6162 6.01252 13.7525C6.10154 13.8121 6.18509 13.8833 6.3515 14.0257C6.77059 14.3825 6.98014 14.5612 7.19928 14.666C7.70603 14.9077 8.29495 14.9077 8.8017 14.666C9.02084 14.5612 9.23038 14.3825 9.64948 14.0257C9.81589 13.8833 9.89943 13.8121 9.98846 13.7525C10.1925 13.6155 10.4219 13.521 10.663 13.4731C10.7678 13.4526 10.8773 13.4437 11.0958 13.4265C11.6443 13.3827 11.9189 13.3608 12.1476 13.28C12.6775 13.0932 13.0942 12.6765 13.281 12.1466C13.3618 11.9179 13.3837 11.6433 13.4275 11.0948C13.4446 10.8763 13.4535 10.7668 13.4741 10.662C13.522 10.421 13.6172 10.1915 13.7535 9.98748C13.813 9.89846 13.8843 9.81491 14.0267 9.6485C14.3835 9.22941 14.5622 9.01986 14.667 8.80072C14.9087 8.29397 14.9087 7.70505 14.667 7.1983C14.5622 6.97916 14.3835 6.76962 14.0267 6.35052C13.9297 6.24244 13.8385 6.12929 13.7535 6.01154C13.6164 5.80751 13.5214 5.5782 13.4741 5.33702C13.4509 5.19368 13.4354 5.04921 13.4275 4.90423C13.3837 4.3557 13.3618 4.0811 13.281 3.85238C13.0942 3.32253 12.6775 2.9058 12.1476 2.71904C11.9189 2.63823 11.6443 2.61632 11.0958 2.57249C10.8773 2.55537 10.7678 2.54647 10.663 2.52593C10.4219 2.47799 10.1925 2.38349 9.98846 2.24653C9.89943 2.1869 9.81589 2.11568 9.64948 1.97329C9.23038 1.61651 9.02084 1.43778 8.8017 1.333C8.29495 1.09127 7.70603 1.09127 7.19928 1.333C6.98014 1.43778 6.77059 1.61651 6.3515 1.97329Z" fill="#4ADE80" />
                <path d="M10.1654 6.50024L7.08203 9.58358L5.83203 8.33358" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>

            <h2 className="text-lg font-bold text-[#f8fafc] leading-6">
              {displayName}
            </h2>

            <div className="flex items-center gap-1.5 mt-0.5">
              <div className="w-4 h-4 rounded-full bg-[#4ade80]/20 flex items-center justify-center overflow-hidden">
                <div className="w-full h-full opacity-60 bg-gradient-to-br from-[#4ade80] to-[#22c55e]" />
              </div>
              <span className="text-[11px] text-[#94a3b8]">Owned by</span>
              <span className="text-[11px] text-[#f8fafc] font-medium">{ownerDisplay}</span>
            </div>
          </div>

          <div className="w-full rounded-xl bg-[#1e293b]/50 border border-[#1e293b] p-3 mb-3">
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-0.5">
                <span className="text-[9px] font-bold text-[#94a3b8] uppercase tracking-[1px]">
                  Mint Status
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-bold text-[#4ade80]">Confirmed</span>
                  <svg width="16" height="16" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path fillRule="evenodd" clipRule="evenodd" d="M18.3336 9.99982C18.3336 14.6023 14.6028 18.3331 10.0003 18.3331C5.39782 18.3331 1.66699 14.6023 1.66699 9.99982C1.66699 5.39733 5.39782 1.6665 10.0003 1.6665C14.6028 1.6665 18.3336 5.39733 18.3336 9.99982ZM13.3586 7.47482C13.6023 7.71884 13.6023 8.11414 13.3586 8.35815L9.19197 12.5248C8.94796 12.7685 8.55266 12.7685 8.30864 12.5248L6.64198 10.8581C6.47477 10.7023 6.40594 10.4677 6.46249 10.2462C6.51905 10.0248 6.69196 9.85188 6.91341 9.79533C7.13485 9.73878 7.3695 9.80761 7.52531 9.97482L8.75031 11.1998L10.6128 9.33732L12.4753 7.47482C12.7193 7.23111 13.1146 7.23111 13.3586 7.47482Z" fill="#4ADE80" />
                  </svg>
                </div>
              </div>
              <div className="flex flex-col gap-0.5 text-right">
                <span className="text-[9px] font-bold text-[#94a3b8] uppercase tracking-[1px]">
                  Token ID
                </span>
                <span className="text-sm font-bold text-[#f8fafc]">{getTokenIdPadded(tokenId)}</span>
              </div>
            </div>
          </div>

          {allAttributes.length > 0 && (
            <div className="flex flex-col gap-2">
              <span className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-[0.6px]">
                Traits & Rarity
              </span>
              <div className="grid grid-cols-2 gap-1.5">
                {allAttributes.map((attr: NftAttribute, index: number) => {
                  const rarityKey = getTraitRarity(attr.trait_type, attr.value);
                  const rarity = RARITY_MAP[rarityKey];
                  return (
                    <div
                      key={index}
                      className={`${rarity.bg} border rounded-lg px-2.5 py-1.5 flex flex-col gap-0.5`}
                    >
                      <span className="text-[8px] font-bold text-[#94a3b8] uppercase tracking-wider">
                        {attr.trait_type}
                      </span>
                      <span className="text-[11px] font-medium text-[#f8fafc] truncate">
                        {String(attr.value).replace(/_/g, " ")}
                      </span>
                      <div className="flex items-center justify-between">
                        <span className={`text-[9px] font-semibold ${rarity.color}`}>
                          {rarity.label}
                        </span>
                        <span className="text-[9px] text-[#64748b]">
                          {rarity.percent}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}