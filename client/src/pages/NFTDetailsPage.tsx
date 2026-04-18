import { useMemo } from "react";
import { useParams, useLocation, useSearch, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Share2, ExternalLink, CheckCircle, ShoppingCart, Loader2, Sparkles } from "lucide-react";
import gfTokenLogo from "@assets/Gamefolio token_1762633908726.png";
import { SKALE_EXPLORER_BASE_URL } from "../../../config/web3";
import { NFT_CONTRACT_ADDRESS } from "@shared/contracts";
import {
  useMarketplacePurchase,
  MarketplacePurchaseDialog,
} from "@/hooks/use-marketplace-purchase";

interface MarketplaceListing {
  token_id: number;
  listed_price: number;
  sold_at: string;
  user_id: number;
  username: string;
  display_name: string | null;
}

interface NFTMetadata {
  tokenId: number;
  name?: string;
  image?: string;
  description?: string;
  attributes?: Array<{ trait_type: string; value: string | number; rarity?: string }>;
}

const RARITY_TEXT_COLORS: Record<string, string> = {
  common: "text-[#94a3b8]",
  uncommon: "text-[#4ade80]",
  rare: "text-[#38bdf8]",
  epic: "text-[#a78bfa]",
  legendary: "text-[#fbbf24]",
};

interface OwnedNftRow {
  tokenId: number;
  name?: string;
  image?: string | null;
  sold?: boolean;
  listedPrice?: number | null;
  listingActive?: boolean;
}

export default function NFTDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const search = useSearch();
  const [, setLocation] = useLocation();
  const { user } = useAuth();

  const tokenId = id ? parseInt(id, 10) : NaN;
  const isValidTokenId = Number.isFinite(tokenId) && tokenId >= 0;

  const fromParam = useMemo(() => {
    const params = new URLSearchParams(search);
    return params.get("from");
  }, [search]);

  const backHref = fromParam === "store" ? "/store" : "/wallet";
  const backLabel = fromParam === "store" ? "Back to Store" : "Back to Wallet";

  const { data: marketplaceData, isLoading: isLoadingMarketplace } = useQuery<{
    listings: MarketplaceListing[];
  }>({
    queryKey: ["/api/marketplace/listings"],
    queryFn: async () => {
      const res = await fetch("/api/marketplace/listings", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load listings");
      return res.json();
    },
    enabled: isValidTokenId,
  });

  const { data: metadata, isLoading: isLoadingMetadata, isError: metadataError } = useQuery<NFTMetadata | null>({
    queryKey: ["/api/nft/metadata", tokenId],
    queryFn: async () => {
      const res = await fetch(`/api/nft/metadata/${tokenId}`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: isValidTokenId,
    staleTime: 300_000,
  });

  const { data: ownedData } = useQuery<{ nfts: OwnedNftRow[] }>({
    queryKey: ["/api/nfts/owned"],
    queryFn: async () => {
      const res = await fetch("/api/nfts/owned", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load owned NFTs");
      return res.json();
    },
    enabled: !!user && isValidTokenId,
  });
  const { data: tokenBalanceData } = useQuery<{ balance: string }>({
    queryKey: ["/api/token/balance"],
    queryFn: async () => {
      const res = await fetch("/api/token/balance", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load token balance");
      return res.json();
    },
    enabled: !!user,
  });

  const listing = useMemo(
    () => marketplaceData?.listings.find((l) => Number(l.token_id) === tokenId) || null,
    [marketplaceData, tokenId],
  );
  const ownedNft = useMemo(
    () => ownedData?.nfts.find((n) => Number(n.tokenId) === tokenId) || null,
    [ownedData, tokenId],
  );

  const isOwned = !!ownedNft;
  const isOfficial = listing?.username === "GamefolioStore";
  const isSeller = !!listing && !!user && listing.user_id === user.id;

  const {
    pendingNftPurchase,
    purchaseConfirmOpen,
    buyingTokenId,
    requestBuy,
    confirmPurchase,
    closePurchaseConfirm,
    setPurchaseConfirmOpen,
  } = useMarketplacePurchase({
    onSuccess: () => {
      setLocation(backHref);
    },
  });

  const handleBack = () => setLocation(backHref);

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: metadata?.name || `Genesis #${tokenId}`,
        text: `Check out ${metadata?.name || `Genesis #${tokenId}`} on Gamefolio!`,
        url: window.location.href,
      });
    }
  };

  const isLoading = isLoadingMarketplace || isLoadingMetadata;
  // For store-originated views, a missing listing means the NFT is no longer
  // available — show not-found even if metadata still resolves on-chain.
  // For wallet/other contexts, we only show the page when the user actually
  // owns the NFT or there's still a live listing; otherwise fall back to
  // not-found (also covers invalid ids and metadata failures).
  const notFound =
    isValidTokenId &&
    !isLoading &&
    (fromParam === "store"
      ? !listing
      : !listing && !ownedNft);

  if (!isValidTokenId || notFound) {
    return (
      <div className="min-h-screen bg-[#101D27] text-white font-['Plus_Jakarta_Sans'] flex flex-col items-center justify-center px-6 text-center">
        <div className="w-16 h-16 rounded-full bg-[#1e293b] flex items-center justify-center mb-4">
          <Sparkles className="w-8 h-8 text-[#94a3b8]" />
        </div>
        <h1 className="text-2xl font-bold mb-2" data-testid="text-nft-not-found">NFT not found</h1>
        <p className="text-sm text-[#94a3b8] mb-6 max-w-sm">
          This listing may have been sold, removed, or never existed. Browse the
          store to find another NFT.
        </p>
        <Link href="/store">
          <Button className="bg-[#4ade80] hover:bg-[#22c55e] text-black font-bold" data-testid="button-back-to-store">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Store
          </Button>
        </Link>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#101D27] text-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#4ade80]" />
      </div>
    );
  }

  const displayName = metadata?.name || `Genesis #${tokenId}`;
  const displayImage = metadata?.image || ownedNft?.image || gfTokenLogo;
  const description =
    metadata?.description ||
    `Gamefolio Genesis NFT #${tokenId} — a unique collectible avatar on the Gamefolio platform.`;
  const sellerName = listing
    ? isOfficial
      ? "Gamefolio Official"
      : listing.display_name || listing.username
    : null;
  const showBuy = !!listing && !isSeller && !isOwned;
  const isBuyingThis = buyingTokenId === tokenId;
  const userBalance = tokenBalanceData?.balance || "0";

  return (
    <div className="min-h-screen bg-[#101D27] text-white font-['Plus_Jakarta_Sans']">
      <div
        className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md"
        style={{ background: "rgba(2, 6, 23, 0.8)" }}
      >
        <div className="flex items-center justify-between px-4 pt-28 pb-4">
          <div className="flex items-center gap-4">
            <button
              onClick={handleBack}
              className="w-10 h-10 rounded-full bg-[#1e293b]/50 flex items-center justify-center hover:bg-[#1e293b] transition-colors"
              data-testid="button-back"
              aria-label={backLabel}
            >
              <ArrowLeft className="w-6 h-6 text-[#f8fafc]" />
            </button>
            <span className="text-xl font-bold text-[#f8fafc] uppercase tracking-tight">
              NFT Details
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleShare}
              className="w-10 h-10 rounded-full bg-[#1e293b]/50 flex items-center justify-center hover:bg-[#1e293b] transition-colors"
              data-testid="button-share"
            >
              <Share2 className="w-5 h-5 text-[#94a3b8]" />
            </button>
          </div>
        </div>
      </div>

      <div className="pt-28 pb-8">
        <div className="flex justify-center px-4 py-2">
          <div
            className="relative rounded-2xl overflow-hidden p-3"
            style={{
              background:
                "linear-gradient(145deg, #0c1a2a 0%, #0a1420 50%, #0d1f2d 100%)",
              border: "1px solid rgba(30, 41, 59, 0.6)",
              boxShadow:
                "0 25px 50px -12px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255,255,255,0.03)",
            }}
          >
            <div className="absolute top-6 left-6 z-10 flex items-center gap-2 px-3 py-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-[#4ade80] shadow-[0_0_6px_rgba(74,222,128,0.6)]" />
              <span className="text-[11px] font-bold text-white uppercase tracking-[1.5px]">
                Verified Asset
              </span>
            </div>
            {listing && (
              <div
                className={`absolute top-6 right-6 z-10 text-white text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                  isOfficial ? "bg-green-500/90" : "bg-orange-500/90"
                }`}
                data-testid="badge-listing-type"
              >
                {isOfficial ? "Official" : "Resale"}
              </div>
            )}
            <img
              src={displayImage}
              alt={displayName}
              className="w-[374px] h-[374px] object-cover rounded-xl"
              data-testid="img-nft"
            />
          </div>
        </div>

        <div className="px-6 pt-6 space-y-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-sm text-[#4ade80]">Gamefolio Genesis</span>
              <CheckCircle className="w-4 h-4 text-[#4ade80]" />
            </div>
            <h1 className="text-3xl font-bold text-[#f8fafc]" data-testid="text-nft-name">
              {displayName}
            </h1>
            {sellerName && (
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-pink-500" />
                <span className="text-sm text-[#94a3b8]">Listed by</span>
                <span className="text-sm text-[#f8fafc]" data-testid="text-seller-name">
                  {sellerName}
                </span>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-bold text-[#94a3b8] uppercase tracking-wider">
              Description
            </h3>
            <p className="text-sm text-[#94a3b8] leading-relaxed" data-testid="text-description">
              {description}
            </p>
          </div>

          {listing && (
            <div
              className="rounded-2xl p-5 space-y-5"
              style={{
                background: "#0f172a",
                border: "1px solid rgba(30, 41, 59, 0.5)",
                boxShadow:
                  "0 4px 6px -4px rgba(0, 0, 0, 0.1), 0 10px 15px -3px rgba(0, 0, 0, 0.1)",
              }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-[#94a3b8] uppercase tracking-wider">
                    Price
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <img src={gfTokenLogo} alt="GF" className="w-5 h-5" />
                    <span
                      className={`text-2xl font-bold ${
                        isOfficial ? "text-green-400" : "text-orange-400"
                      }`}
                      data-testid="text-price"
                    >
                      {listing.listed_price} GFT
                    </span>
                  </div>
                </div>
                {isOwned && (
                  <span className="px-3 py-1 rounded-full bg-[#14532d] text-[#4ade80] text-xs font-bold uppercase tracking-wider">
                    Owned
                  </span>
                )}
                {isSeller && !isOwned && (
                  <span className="px-3 py-1 rounded-full bg-[#1e293b] text-[#94a3b8] text-xs font-bold uppercase tracking-wider">
                    Your listing
                  </span>
                )}
              </div>

              {showBuy && (
                <div className="space-y-3">
                  <Button
                    className="w-full h-[60px] rounded-2xl bg-[#4ade80] hover:bg-[#22c55e] text-[#022c22] text-lg font-bold disabled:opacity-50"
                    disabled={isBuyingThis}
                    onClick={() =>
                      requestBuy({
                        tokenId,
                        sellerId: listing.user_id,
                        nftName: displayName,
                        nftDescription: description,
                        nftImage: displayImage,
                        currentBalance: userBalance,
                        price: listing.listed_price,
                      })
                    }
                    data-testid="button-buy-nft"
                  >
                    {isBuyingThis ? (
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    ) : (
                      <ShoppingCart className="w-5 h-5 mr-2" />
                    )}
                    {isBuyingThis ? "Processing..." : `Buy for ${listing.listed_price} GFT`}
                  </Button>
                  <p className="text-[11px] text-[#94a3b8] text-center leading-relaxed">
                    Purchasing transfers GFT from your wallet and mints
                    ownership of this NFT to your account.
                  </p>
                </div>
              )}
            </div>
          )}

          {!listing && isOwned && (
            <div
              className="rounded-2xl p-5"
              style={{
                background: "#0f172a",
                border: "1px solid rgba(30, 41, 59, 0.5)",
              }}
            >
              <p className="text-xs font-bold text-[#94a3b8] uppercase tracking-wider mb-1">
                Status
              </p>
              <p className="text-sm font-bold text-[#f8fafc]">In Your Wallet</p>
            </div>
          )}

          <div className="space-y-4">
            <h3 className="text-sm font-bold text-[#94a3b8] uppercase tracking-wider">
              Properties
            </h3>
            {metadata?.attributes && metadata.attributes.length > 0 ? (
              <div className="grid grid-cols-2 gap-3" data-testid="grid-properties">
                {metadata.attributes.map((prop, index) => {
                  const rarityKey = (prop.rarity || "").toLowerCase();
                  const rarityColor =
                    RARITY_TEXT_COLORS[rarityKey] || "text-[#94a3b8]";
                  return (
                    <div
                      key={index}
                      className="rounded-2xl p-3 space-y-1"
                      style={{
                        background: "#0f172a",
                        border: "1px solid rgba(30, 41, 59, 0.5)",
                      }}
                      data-testid={`property-${prop.trait_type}`}
                    >
                      <p className="text-[10px] font-bold text-[#94a3b8] uppercase">
                        {prop.trait_type}
                      </p>
                      <p className="text-sm text-[#f8fafc]">
                        {String(prop.value)}
                      </p>
                      {prop.rarity && (
                        <p
                          className={`text-[10px] font-semibold uppercase tracking-wider ${rarityColor}`}
                          data-testid={`property-rarity-${prop.trait_type}`}
                        >
                          {prop.rarity}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div
                className="rounded-2xl p-4 text-sm text-[#94a3b8]"
                style={{
                  background: "#0f172a",
                  border: "1px solid rgba(30, 41, 59, 0.5)",
                }}
                data-testid="text-no-properties"
              >
                No traits available for this NFT.
              </div>
            )}
          </div>

          <div className="space-y-4 pt-2">
            <h3 className="text-sm font-bold text-[#94a3b8] uppercase tracking-wider">
              Details
            </h3>
            <div
              className="rounded-2xl overflow-hidden"
              style={{
                background: "#0f172a",
                border: "1px solid rgba(30, 41, 59, 0.5)",
              }}
            >
              <div className="flex justify-between items-center px-4 py-4 border-b border-[#1e293b]/30">
                <span className="text-sm text-[#94a3b8]">Token ID</span>
                <span className="text-sm text-[#f8fafc] font-mono" data-testid="text-token-id">
                  #{tokenId}
                </span>
              </div>
              <div className="flex justify-between items-center px-4 py-4 border-b border-[#1e293b]/30">
                <span className="text-sm text-[#94a3b8]">Token Standard</span>
                <span className="text-sm text-[#f8fafc] font-mono">ERC-721</span>
              </div>
              <div className="flex justify-between items-center px-4 py-4 border-b border-[#1e293b]/30">
                <span className="text-sm text-[#94a3b8]">Network</span>
                <span className="text-sm text-[#f8fafc]">SKALE Nebula</span>
              </div>
              <div className="flex justify-between items-center px-4 py-4 gap-3">
                <span className="text-sm text-[#94a3b8]">Contract</span>
                <span
                  className="text-sm text-[#f8fafc] font-mono truncate"
                  title={NFT_CONTRACT_ADDRESS}
                  data-testid="text-contract-address"
                >
                  {`${NFT_CONTRACT_ADDRESS.slice(0, 6)}…${NFT_CONTRACT_ADDRESS.slice(-4)}`}
                </span>
              </div>
            </div>

            <a
              href={`${SKALE_EXPLORER_BASE_URL}/token/${NFT_CONTRACT_ADDRESS}/instance/${tokenId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 h-[52px] rounded-2xl bg-[#1e293b]/50 hover:bg-[#1e293b] transition-colors"
              data-testid="button-view-explorer"
            >
              <ExternalLink className="w-4 h-4 text-[#f8fafc]" />
              <span className="text-sm font-bold text-[#f8fafc]">
                View on SKALE Explorer
              </span>
            </a>

            <Link href={backHref}>
              <button
                className="w-full flex items-center justify-center gap-2 h-[52px] rounded-2xl bg-[#1e293b]/30 hover:bg-[#1e293b]/50 transition-colors"
                data-testid="button-back-bottom"
              >
                <ArrowLeft className="w-4 h-4 text-[#94a3b8]" />
                <span className="text-sm text-[#94a3b8]">{backLabel}</span>
              </button>
            </Link>
          </div>
        </div>
      </div>

      <MarketplacePurchaseDialog
        open={purchaseConfirmOpen}
        onOpenChange={setPurchaseConfirmOpen}
        pendingNftPurchase={pendingNftPurchase}
        onConfirm={confirmPurchase}
        onCancel={closePurchaseConfirm}
      />
    </div>
  );
}
