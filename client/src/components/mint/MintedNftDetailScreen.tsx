import { ArrowLeft, ExternalLink, Share2, Image } from "lucide-react";
import { useState } from "react";
import QuickSellScreen from "./QuickSellScreen";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";

interface NftAttribute {
  trait_type: string;
  value: string;
}

interface NftDetailData {
  id: number;
  name?: string;
  imageUrl: string;
  rarity: number;
  attributes?: NftAttribute[];
}

interface MintedNftDetailScreenProps {
  nft: NftDetailData;
  txHash: string;
  walletAddress?: string;
  ownerUsername?: string;
  onClose: () => void;
  onViewExplorer?: () => void;
  initialSold?: boolean;
  onSold?: () => void;
  mintedAt?: string;
  soldAt?: string | null;
  listedPrice?: number | null;
  listingActive?: boolean;
}

const NFT_CONTRACT_ADDRESS = "0x246624993603fbd8C3Cc60920878D0DF5c764Fb4";
const SKALE_EXPLORER_BASE_URL = "https://lanky-ill-funny-testnet.explorer.testnet.skalenodes.com";

function getTokenIdPadded(id: number): string {
  return `#${String(id).padStart(3, "0")}`;
}

function formatTraitRarity(): string {
  const rarities = [2, 4, 8, 12, 15, 18, 22, 28, 35];
  return `${rarities[Math.floor(Math.random() * rarities.length)]}% rarity`;
}

function formatAddress(address: string): string {
  if (!address) return "0x0000...0000";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function formatDate(dateStr?: string): string {
  const d = dateStr ? new Date(dateStr) : new Date();
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function MintedNftDetailScreen({
  nft,
  txHash,
  walletAddress,
  ownerUsername,
  onClose,
  onViewExplorer,
  initialSold = false,
  onSold,
  mintedAt,
  soldAt,
  listedPrice,
  listingActive,
}: MintedNftDetailScreenProps) {
  const [showQuickSell, setShowQuickSell] = useState(false);
  const [sold, setSold] = useState(initialSold);
  const { toast } = useToast();
  const { user } = useAuth();
  const displayName = nft.name || `Gamefolio Genesis ${getTokenIdPadded(nft.id)}`;
  const isOwner = walletAddress && user?.walletAddress && walletAddress.toLowerCase() === user.walletAddress.toLowerCase();
  const ownerDisplay = isOwner ? `You (${formatAddress(walletAddress)})` : ownerUsername ? `@${ownerUsername}` : formatAddress(walletAddress || "");
  const mintDate = formatDate(mintedAt);
  const soldDate = soldAt ? formatDate(soldAt) : null;
  const isListedOnMarketplace = sold && (listingActive === true);
  const isNftProfilePic = user?.activeProfilePicType === 'nft' && user?.nftProfileTokenId === nft.id;

  const setProfilePictureMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/nft/set-profile-picture', {
        tokenId: nft.id,
        imageUrl: nft.imageUrl,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      toast({
        title: "Profile Picture Updated",
        description: `${displayName} is now your profile picture.`,
      });
    },
    onError: (err: any) => {
      toast({
        title: "Failed to set profile picture",
        description: err.message || "Something went wrong",
        variant: "destructive",
      });
    },
  });

  const clearProfilePictureMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/nft/set-profile-picture', {
        tokenId: null,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      toast({
        title: "Profile Picture Cleared",
        description: "Your NFT profile picture has been removed.",
      });
    },
  });

  if (showQuickSell && !sold) {
    return (
      <QuickSellScreen
        nft={nft}
        txHash={txHash}
        canSell={!!user?.canSellNfts}
        onClose={() => setShowQuickSell(false)}
        onSold={(result) => {
          setSold(true);
          setShowQuickSell(false);
          onSold?.();
          toast({
            title: "NFT Sold!",
            description: `${result.receivedAmount} GFT has been added to your balance.`,
          });
        }}
      />
    );
  }

  const displayAttributes = nft.attributes && nft.attributes.length > 0
    ? nft.attributes.slice(0, 4)
    : [
        { trait_type: "Background", value: "Unknown" },
        { trait_type: "Skin", value: "Unknown" },
        { trait_type: "Costume", value: "Unknown" },
        { trait_type: "Eyes", value: "Unknown" },
      ];

  return (
    <div className="fixed inset-0 z-[110] bg-[#101D27] flex flex-col overflow-hidden font-['Plus_Jakarta_Sans',sans-serif]">
      <div className="w-full max-w-[430px] md:max-w-5xl mx-auto px-6 pt-16 md:pt-20 pb-1">
        <span className="text-sm font-medium text-[#64748b] tracking-wide">Minted NFT Detail</span>
      </div>

      <header className="z-40 flex-shrink-0">
        <div className="w-full max-w-[430px] md:max-w-5xl mx-auto px-4 pb-4">
          <div className="flex items-center justify-between w-full rounded-2xl bg-[#0f172a] border border-[#1e293b80] px-4 py-3">
            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[#1e293b] transition-colors"
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path fillRule="evenodd" clipRule="evenodd" d="M0 10C0 4.47715 4.47715 0 10 0C15.5228 0 20 4.47715 20 10C20 15.5228 15.5228 20 10 20C4.47715 20 0 15.5228 0 10Z" stroke="#F8FAFC" strokeWidth="1.5" />
                  <path d="M12.5 7.5L7.5 12.5M7.5 7.5L12.5 12.5" stroke="#F8FAFC" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
              <span className="text-base font-bold text-[#f8fafc] leading-6">NFT Details</span>
            </div>
            <button
              onClick={() => {
                if (navigator.share) {
                  navigator.share({ title: displayName, url: `${SKALE_EXPLORER_BASE_URL}/tx/${txHash}` });
                }
              }}
              className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[#1e293b] transition-colors"
            >
              <svg width="15" height="18" viewBox="0 0 15 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path fillRule="evenodd" clipRule="evenodd" d="M5 9C5 10.3807 3.88071 11.5 2.5 11.5C1.11929 11.5 0 10.3807 0 9C0 7.61929 1.11929 6.5 2.5 6.5C3.88071 6.5 5 7.61929 5 9Z" stroke="#94A3B8" strokeWidth="1.5" />
                <path d="M10 3.5L5 7M10 14.5L5 11" stroke="#94A3B8" strokeWidth="1.5" strokeLinecap="round" />
                <path fillRule="evenodd" clipRule="evenodd" d="M15 15.5C15 16.8807 13.8807 18 12.5 18C11.1193 18 10 16.8807 10 15.5C10 14.1193 11.1193 13 12.5 13C13.8807 13 15 14.1193 15 15.5Z" stroke="#94A3B8" strokeWidth="1.5" />
                <path fillRule="evenodd" clipRule="evenodd" d="M15 2.5C15 3.88071 13.8807 5 12.5 5C11.1193 5 10 3.88071 10 2.5C10 1.11929 11.1193 0 12.5 0C13.8807 0 15 1.11929 15 2.5Z" stroke="#94A3B8" strokeWidth="1.5" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="w-full max-w-[430px] md:max-w-5xl mx-auto flex flex-col md:flex-row md:gap-10 md:px-4">

          <div className="md:flex-1 md:sticky md:top-0 md:self-start">
            <div className="flex justify-center items-center px-4 py-2">
              <div className="relative w-full max-w-[398px] md:max-w-full aspect-square rounded-3xl overflow-hidden bg-white/[0.01] shadow-[0_25px_50px_-12px_rgba(74,222,128,0.05)]">
                {nft.imageUrl ? (
                  <img
                    src={nft.imageUrl}
                    alt={displayName}
                    className={`w-full h-full object-cover transition-all duration-300 ${sold ? "grayscale brightness-50" : ""}`}
                  />
                ) : (
                  <div className="w-full h-full bg-[#1e293b] flex items-center justify-center">
                    <div className="w-12 h-12 rounded-full border-2 border-[#4ade80]/30 border-t-[#4ade80] animate-spin" />
                  </div>
                )}
                {sold && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-5xl font-black text-white/80 uppercase tracking-[8px] rotate-[-15deg] drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)]">
                      SOLD
                    </span>
                  </div>
                )}
                {!sold && (
                  <div className="absolute top-4 left-4 backdrop-blur-lg bg-black/40 rounded-2xl flex items-center gap-2 px-3 py-1.5">
                    <div className="w-2 h-2 rounded-full bg-[#4ade80]" />
                    <span className="text-[10px] font-bold text-white uppercase tracking-[0.5px] leading-[15px]">
                      Newly Minted
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="md:flex-1 flex flex-col gap-6 px-6 py-6">

            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-[7px]">
                <span className="text-sm font-normal text-[#4ade80] leading-5">Genesis Collection</span>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path fillRule="evenodd" clipRule="evenodd" d="M6.3515 1.97329C6.24341 2.0703 6.13026 2.1615 6.01252 2.24653C5.80845 2.38349 5.57904 2.47799 5.338 2.52593C5.23322 2.54647 5.12365 2.55537 4.9052 2.57249C4.35668 2.61632 4.08208 2.63823 3.85335 2.71904C3.3235 2.9058 2.90677 3.32253 2.72001 3.85238C2.63921 4.0811 2.61729 4.3557 2.57347 4.90423C2.5656 5.04921 2.55006 5.19368 2.5269 5.33702C2.47897 5.57807 2.38446 5.80748 2.2475 6.01154C2.18793 6.10057 2.11671 6.18411 1.97427 6.35052C1.61749 6.76962 1.43876 6.97916 1.33398 7.1983C1.09225 7.70505 1.09225 8.29397 1.33398 8.80072C1.43876 9.01986 1.61749 9.22941 1.97427 9.6485C2.11671 9.81491 2.18793 9.89846 2.2475 9.98748C2.38446 10.1915 2.47897 10.421 2.5269 10.662C2.54745 10.7668 2.55635 10.8763 2.57347 11.0948C2.61729 11.6433 2.63921 11.9179 2.72001 12.1466C2.90677 12.6765 3.3235 13.0932 3.85335 13.28C4.08208 13.3608 4.35668 13.3827 4.9052 13.4265C5.12365 13.4437 5.23322 13.4526 5.338 13.4731C5.57904 13.521 5.80845 13.6162 6.01252 13.7525C6.10154 13.8121 6.18509 13.8833 6.3515 14.0257C6.77059 14.3825 6.98014 14.5612 7.19928 14.666C7.70603 14.9077 8.29495 14.9077 8.8017 14.666C9.02084 14.5612 9.23038 14.3825 9.64948 14.0257C9.81589 13.8833 9.89943 13.8121 9.98846 13.7525C10.1925 13.6155 10.4219 13.521 10.663 13.4731C10.7678 13.4526 10.8773 13.4437 11.0958 13.4265C11.6443 13.3827 11.9189 13.3608 12.1476 13.28C12.6775 13.0932 13.0942 12.6765 13.281 12.1466C13.3618 11.9179 13.3837 11.6433 13.4275 11.0948C13.4446 10.8763 13.4535 10.7668 13.4741 10.662C13.522 10.421 13.6172 10.1915 13.7535 9.98748C13.813 9.89846 13.8843 9.81491 14.0267 9.6485C14.3835 9.22941 14.5622 9.01986 14.667 8.80072C14.9087 8.29397 14.9087 7.70505 14.667 7.1983C14.5622 6.97916 14.3835 6.76962 14.0267 6.35052C13.9297 6.24244 13.8385 6.12929 13.7535 6.01154C13.6164 5.80751 13.5214 5.5782 13.4741 5.33702C13.4509 5.19368 13.4354 5.04921 13.4275 4.90423C13.3837 4.3557 13.3618 4.0811 13.281 3.85238C13.0942 3.32253 12.6775 2.9058 12.1476 2.71904C11.9189 2.63823 11.6443 2.61632 11.0958 2.57249C10.8773 2.55537 10.7678 2.54647 10.663 2.52593C10.4219 2.47799 10.1925 2.38349 9.98846 2.24653C9.89943 2.18696 9.81589 2.11574 9.64948 1.97329C9.23038 1.61652 9.02084 1.43779 8.8017 1.33301C8.29495 1.09128 7.70603 1.09128 7.19928 1.33301C6.98014 1.43779 6.77059 1.61652 6.3515 1.97329ZM10.7607 6.57329L7.42741 9.90662C7.29905 10.035 7.09424 10.035 6.96588 9.90662L5.29921 8.23995C5.21036 8.15863 5.17342 8.0342 5.20353 7.91706C5.23363 7.79992 5.32571 7.70784 5.44285 7.67774C5.55999 7.64763 5.68442 7.68458 5.76574 7.77343L7.19664 9.20432L10.2942 6.10679C10.3755 6.01794 10.5 5.981 10.6171 6.0111C10.7342 6.04121 10.8263 6.13329 10.8564 6.25043C10.8866 6.36757 10.8496 6.49199 10.7607 6.57329Z" fill="#4ADE80" />
                </svg>
              </div>

              <h1 className="text-[30px] md:text-4xl font-bold text-[#f8fafc] leading-9 md:leading-[44px]">
                {displayName}
              </h1>

              <div className="flex items-center gap-2 mt-1">
                <div className={`w-6 h-6 rounded-full border-2 border-[#101D27] flex items-center justify-center overflow-hidden ${sold ? 'bg-amber-500/20' : 'bg-[#4ade80]/20'}`}>
                  <div className={`w-full h-full opacity-60 ${sold ? 'bg-gradient-to-br from-amber-500 to-orange-500' : 'bg-gradient-to-br from-[#4ade80] to-[#22c55e]'}`} />
                </div>
                {sold ? (
                  <>
                    <span className="text-sm font-normal text-[#94a3b8] leading-5">
                      {isListedOnMarketplace ? 'Listed on Marketplace' : 'Sold'}
                    </span>
                    {listedPrice && (
                      <span className="text-sm font-bold text-amber-400 leading-5">{listedPrice} GFT</span>
                    )}
                  </>
                ) : (
                  <>
                    <span className="text-sm font-normal text-[#94a3b8] leading-5">Owned by</span>
                    <span className="text-sm font-normal text-[#f8fafc] leading-5">{ownerDisplay}</span>
                  </>
                )}
              </div>
            </div>

            <div className="w-full rounded-2xl bg-[#0f172a] border border-[#1e293b80] p-5">
              {sold ? (
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-bold text-[#94a3b8] uppercase tracking-[1.2px] leading-4">
                        Status
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-amber-400 leading-7">
                          {isListedOnMarketplace ? 'Listed for Sale' : 'Sold'}
                        </span>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path fillRule="evenodd" clipRule="evenodd" d="M16.1002 4.62203L17.9414 6.46328C20.647 9.16982 21.9992 10.5221 21.9992 12.2024C21.9992 13.8836 20.647 15.2359 17.9414 17.9414C15.2349 20.648 13.8826 22.0002 12.2014 22.0002C10.5211 22.0002 9.16781 20.648 6.46227 17.9424L4.62102 16.1012C3.06652 14.5457 2.28876 13.7689 2 12.7598C1.71023 11.7506 1.95774 10.679 2.45277 8.53695L2.73751 7.3014C3.15305 5.49838 3.36132 4.59687 3.97809 3.9791C4.59486 3.36132 5.49738 3.15405 7.3004 2.73851L8.53595 2.45277C10.679 1.95875 11.7496 1.71124 12.7588 2C13.7679 2.28977 14.5447 3.06752 16.0992 4.62203Z" fill="#F59E0B" />
                        </svg>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1 text-right">
                      <span className="text-xs font-bold text-[#94a3b8] uppercase tracking-[1.2px] leading-4">
                        {isListedOnMarketplace ? 'Listed Date' : 'Sold Date'}
                      </span>
                      <span className="text-sm font-bold text-[#f8fafc] leading-5">{soldDate || mintDate}</span>
                    </div>
                  </div>
                  {listedPrice && (
                    <div className="flex items-center justify-between border-t border-[#1e293b4d] pt-3">
                      <span className="text-xs font-bold text-[#94a3b8] uppercase tracking-[1.2px] leading-4">
                        {isListedOnMarketplace ? 'Listing Price' : 'Sale Price'}
                      </span>
                      <span className="text-lg font-bold text-amber-400 leading-7">{listedPrice} GFT</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-bold text-[#94a3b8] uppercase tracking-[1.2px] leading-4">
                      Mint Status
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-[#4ade80] leading-7">Confirmed</span>
                      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path fillRule="evenodd" clipRule="evenodd" d="M18.3336 9.99982C18.3336 14.6023 14.6028 18.3331 10.0003 18.3331C5.39782 18.3331 1.66699 14.6023 1.66699 9.99982C1.66699 5.39733 5.39782 1.6665 10.0003 1.6665C14.6028 1.6665 18.3336 5.39733 18.3336 9.99982ZM13.3586 7.47482C13.6023 7.71884 13.6023 8.11414 13.3586 8.35815L9.19197 12.5248C8.94796 12.7685 8.55266 12.7685 8.30864 12.5248L6.64198 10.8581C6.47477 10.7023 6.40594 10.4677 6.46249 10.2462C6.51905 10.0248 6.69196 9.85188 6.91341 9.79533C7.13485 9.73878 7.3695 9.80761 7.52531 9.97482L8.75031 11.1998L10.6128 9.33732L12.4753 7.47482C12.7193 7.23111 13.1146 7.23111 13.3586 7.47482Z" fill="#4ADE80" />
                      </svg>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-bold text-[#94a3b8] uppercase tracking-[1.2px] leading-4">
                      Minted Date
                    </span>
                    <span className="text-sm font-bold text-[#f8fafc] leading-5">{mintDate}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-3">
              <span className="text-sm font-bold text-[#94a3b8] uppercase tracking-[0.7px] leading-5">
                Traits & Rarity
              </span>

              <div className="grid grid-cols-2 gap-2.5">
                {displayAttributes.map((attr, index) => (
                  <div
                    key={index}
                    className="bg-[#0f172a] border border-[#1e293b80] rounded-xl px-3.5 py-3 flex flex-col gap-0.5"
                  >
                    <span className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-wider leading-[15px]">
                      {attr.trait_type}
                    </span>
                    <span className="text-sm font-semibold text-[#f8fafc] leading-5 truncate">
                      {String(attr.value).replace(/_/g, ' ')}
                    </span>
                    <span className="text-[10px] font-normal text-[#16a34a] leading-[15px]">
                      {formatTraitRarity()}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {!sold && isOwner && (
              <button
                onClick={() => setProfilePictureMutation.mutate()}
                disabled={setProfilePictureMutation.isPending}
                className="h-[44px] w-full rounded-xl bg-[#0f172a] border border-[#4ade80]/30 flex items-center justify-center gap-2 hover:bg-[#4ade80]/10 hover:border-[#4ade80]/50 transition-colors disabled:opacity-50"
              >
                <Image className="w-4 h-4 text-[#4ade80]" />
                <span className="text-sm font-bold text-[#4ade80] leading-5">
                  {setProfilePictureMutation.isPending ? 'Setting...' : 'Set as Profile Picture'}
                </span>
              </button>
            )}

            <div className={`grid ${sold || !isOwner ? 'grid-cols-1' : 'grid-cols-2'} gap-3 pt-1`}>
              {!sold && isOwner && (
                <button
                  disabled
                  className="h-[52px] rounded-xl bg-[#4ade80]/20 border border-[#4ade80]/30 flex items-center justify-center gap-2 cursor-default"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path fillRule="evenodd" clipRule="evenodd" d="M12 22C17.523 22 22 17.523 22 12C22 6.477 17.523 2 12 2C6.477 2 2 6.477 2 12C2 17.523 6.477 22 12 22ZM16.707 9.707C17.098 9.316 17.098 8.684 16.707 8.293C16.316 7.902 15.684 7.902 15.293 8.293L10 13.586L8.707 12.293C8.316 11.902 7.684 11.902 7.293 12.293C6.902 12.684 6.902 13.316 7.293 13.707L9.293 15.707C9.684 16.098 10.316 16.098 10.707 15.707L16.707 9.707Z" fill="#4ade80" />
                  </svg>
                  <span className="text-sm font-bold text-[#4ade80] leading-5">In Collection</span>
                </button>
              )}
              {sold ? (
                <button
                  disabled
                  className="h-[52px] rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center gap-2 cursor-not-allowed"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path fillRule="evenodd" clipRule="evenodd" d="M16.1002 4.62203L17.9414 6.46328C20.647 9.16982 21.9992 10.5221 21.9992 12.2024C21.9992 13.8836 20.647 15.2359 17.9414 17.9414C15.2349 20.648 13.8826 22.0002 12.2014 22.0002C10.5211 22.0002 9.16781 20.648 6.46227 17.9424L4.62102 16.1012C3.06652 14.5457 2.28876 13.7689 2 12.7598C1.71023 11.7506 1.95774 10.679 2.45277 8.53695L2.73751 7.3014C3.15305 5.49838 3.36132 4.59687 3.97809 3.9791C4.59486 3.36132 5.49738 3.15405 7.3004 2.73851L8.53595 2.45277C10.679 1.95875 11.7496 1.71124 12.7588 2C13.7679 2.28977 14.5447 3.06752 16.0992 4.62203Z" fill="#F59E0B" />
                  </svg>
                  <span className="text-sm font-bold text-amber-400 leading-5">
                    {isListedOnMarketplace ? 'Listed on Marketplace' : 'Sold'}
                  </span>
                </button>
              ) : isOwner ? (
                <>
                  <button
                    onClick={user?.canSellNfts ? () => setShowQuickSell(true) : undefined}
                    disabled={!user?.canSellNfts || isNftProfilePic}
                    className={`h-[52px] rounded-xl flex items-center justify-center gap-2 ${
                      user?.canSellNfts && !isNftProfilePic
                        ? "bg-[#1e293b] hover:bg-[#334155] cursor-pointer"
                        : "bg-[#1e293b] opacity-50 cursor-not-allowed"
                    }`}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path fillRule="evenodd" clipRule="evenodd" d="M16.1002 4.62203L17.9414 6.46328C20.647 9.16982 21.9992 10.5221 21.9992 12.2024C21.9992 13.8836 20.647 15.2359 17.9414 17.9414C15.2349 20.648 13.8826 22.0002 12.2014 22.0002C10.5211 22.0002 9.16781 20.648 6.46227 17.9424L4.62102 16.1012C3.06652 14.5457 2.28876 13.7689 2 12.7598C1.71023 11.7506 1.95774 10.679 2.45277 8.53695L2.73751 7.3014C3.15305 5.49838 3.36132 4.59687 3.97809 3.9791C4.59486 3.36132 5.49738 3.15405 7.3004 2.73851L8.53595 2.45277C10.679 1.95875 11.7496 1.71124 12.7588 2C13.7679 2.28977 14.5447 3.06752 16.0992 4.62203M11.0785 14.2811C10.4014 13.6049 10.4064 12.633 10.8119 11.8633C10.6047 11.5641 10.6406 11.1597 10.8972 10.9017C11.1537 10.6436 11.5579 10.6054 11.8583 10.8109C12.2003 10.6297 12.5756 10.5332 12.9499 10.5372C13.3667 10.5411 13.7014 10.8821 13.6975 11.2988C13.6936 11.7156 13.3526 12.0503 12.9358 12.0464C12.7029 12.055 12.4827 12.1552 12.3231 12.3251C11.9337 12.7145 12.0353 13.1049 12.145 13.2145C12.2557 13.3242 12.6451 13.4258 13.0344 13.0365C13.8233 12.2476 15.1856 11.986 16.0579 12.8584C16.7351 13.5355 16.73 14.5074 16.3246 15.2772C16.5303 15.5764 16.4938 15.9797 16.2377 16.2371C15.9815 16.4945 15.5783 16.5329 15.2782 16.3286C14.8267 16.5763 14.3029 16.6589 13.7971 16.562C13.5329 16.5077 13.3177 16.3166 13.2326 16.0607C13.1475 15.8047 13.2054 15.5228 13.3846 15.3212C13.5637 15.1195 13.8368 15.0287 14.101 15.083C14.2791 15.1202 14.5668 15.0618 14.8133 14.8153C15.2027 14.4249 15.1011 14.0356 14.9914 13.9259C14.8807 13.8162 14.4913 13.7146 14.102 14.104C13.3131 14.8928 11.9508 15.1544 11.0785 14.2811ZM9.94556 10.2212C10.4538 9.71279 10.6523 8.97179 10.4661 8.27738C10.2799 7.58296 9.73734 7.04063 9.04286 6.85468C8.34838 6.66873 7.60745 6.8674 7.09917 7.37586C6.31343 8.16187 6.31366 9.43602 7.09967 10.2218C7.88568 11.0075 9.15983 11.0073 9.94556 10.2212Z" fill="#F8FAFC" />
                    </svg>
                    <span className="text-sm font-bold text-[#f8fafc] leading-5">Quick Sell</span>
                  </button>
                  {!user?.canSellNfts && (
                    <p className="text-sm md:text-base text-amber-400 text-center max-w-md mt-3">Currently disabled on Beta! We will be on Mainnet soon!</p>
                  )}
                </>
              ) : null}
            </div>

            <div className="flex flex-col gap-4 pt-2">
              <span className="text-sm font-bold text-[#94a3b8] uppercase tracking-[0.7px] leading-5">
                Chain Info
              </span>

              <div className="rounded-2xl bg-[#0f172a] border border-[#1e293b80] overflow-hidden">
                <div className="flex items-center justify-between px-4 py-4 border-b border-[#1e293b4d]">
                  <span className="text-sm font-normal text-[#94a3b8] leading-5">Contract Address</span>
                  <span className="text-sm font-normal text-[#4ade80] font-['JetBrains_Mono',monospace] leading-5">
                    {formatAddress(NFT_CONTRACT_ADDRESS)}
                  </span>
                </div>

                <div className="flex items-center justify-between px-4 py-4 border-b border-[#1e293b4d]">
                  <span className="text-sm font-normal text-[#94a3b8] leading-5">Token ID</span>
                  <span className="text-sm font-normal text-[#f8fafc] font-['JetBrains_Mono',monospace] leading-5">
                    {nft.id}
                  </span>
                </div>

                <div className="flex items-center justify-between px-4 py-4 border-b border-[#1e293b4d]">
                  <span className="text-sm font-normal text-[#94a3b8] leading-5">Token Standard</span>
                  <span className="text-sm font-normal text-[#f8fafc] font-['JetBrains_Mono',monospace] leading-5">
                    ERC-721
                  </span>
                </div>

                <div className={`flex items-center justify-between px-4 py-4 ${sold ? 'border-b border-[#1e293b4d]' : ''}`}>
                  <span className="text-sm font-normal text-[#94a3b8] leading-5">Network</span>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-[#4ade80]" />
                    <span className="text-sm font-normal text-[#f8fafc] leading-5">SKALE Nebula</span>
                  </div>
                </div>

                {sold && (
                  <>
                    <div className="flex items-center justify-between px-4 py-4 border-b border-[#1e293b4d]">
                      <span className="text-sm font-normal text-[#94a3b8] leading-5">Sale Status</span>
                      <div className="flex items-center gap-1.5">
                        <div className={`w-2 h-2 rounded-full ${isListedOnMarketplace ? 'bg-amber-400' : 'bg-red-400'}`} />
                        <span className="text-sm font-normal text-amber-400 leading-5">
                          {isListedOnMarketplace ? 'Active Listing' : 'Sold'}
                        </span>
                      </div>
                    </div>
                    {listedPrice && (
                      <div className="flex items-center justify-between px-4 py-4 border-b border-[#1e293b4d]">
                        <span className="text-sm font-normal text-[#94a3b8] leading-5">
                          {isListedOnMarketplace ? 'Listing Price' : 'Sale Price'}
                        </span>
                        <span className="text-sm font-bold text-amber-400 font-['JetBrains_Mono',monospace] leading-5">
                          {listedPrice} GFT
                        </span>
                      </div>
                    )}
                    {soldDate && (
                      <div className="flex items-center justify-between px-4 py-4">
                        <span className="text-sm font-normal text-[#94a3b8] leading-5">
                          {isListedOnMarketplace ? 'Listed Date' : 'Sold Date'}
                        </span>
                        <span className="text-sm font-normal text-[#f8fafc] font-['JetBrains_Mono',monospace] leading-5">
                          {soldDate}
                        </span>
                      </div>
                    )}
                  </>
                )}
              </div>

            </div>

          </div>
        </div>
      </div>
    </div>
  );
}