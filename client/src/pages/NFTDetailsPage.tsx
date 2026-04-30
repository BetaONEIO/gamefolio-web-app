import { useMemo } from "react";
import { useParams, useLocation, useSearch, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, Sparkles } from "lucide-react";
import MintedNftDetailScreen from "@/components/mint/MintedNftDetailScreen";
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

interface OwnedNftRow {
  tokenId: number;
  name?: string;
  image?: string | null;
  sold?: boolean;
  listedPrice?: number | null;
  listingActive?: boolean;
  txHash?: string;
  mintedAt?: string;
  soldAt?: string | null;
  attributes?: Array<{ trait_type: string; value: string | number }>;
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

  const { data: metadata, isLoading: isLoadingMetadata } = useQuery<NFTMetadata | null>({
    queryKey: ["/api/nft/metadata", tokenId],
    queryFn: async () => {
      const res = await fetch(`/api/nft/metadata/${tokenId}`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: isValidTokenId,
    staleTime: 300_000,
  });

  const { data: ownedData, isLoading: isLoadingOwned } = useQuery<{ nfts: OwnedNftRow[] }>({
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
  const isAlreadyOwned = !!user && isOwned && !isSeller;

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

  const fromStore = fromParam === "store";
  const isLoading =
    isLoadingMarketplace ||
    isLoadingMetadata ||
    (!fromStore && !!user && isLoadingOwned);

  // For store-originated views, a missing listing means the NFT is no longer
  // available — show not-found even if metadata still resolves on-chain.
  // For wallet/other contexts, we only show the page when the user actually
  // owns the NFT or there's still a live listing.
  const notFound =
    isValidTokenId &&
    !isLoading &&
    (fromStore ? !listing : !listing && !ownedNft);

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
          <Button className="bg-[#B7FF1A] hover:bg-[#A2F000] text-black font-bold" data-testid="button-back-to-store">
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
        <Loader2 className="w-8 h-8 animate-spin text-[#B7FF1A]" />
      </div>
    );
  }

  const displayName = metadata?.name || ownedNft?.name || `Genesis #${tokenId}`;
  const displayImage = metadata?.image || ownedNft?.image || "";
  const description =
    metadata?.description ||
    `Gamefolio Genesis NFT #${tokenId} — a unique collectible avatar on the Gamefolio platform.`;
  const sellerLabel = listing
    ? isOfficial
      ? "Gamefolio Official"
      : `@${listing.display_name || listing.username}`
    : "";
  const userBalance = tokenBalanceData?.balance || "0";

  // Store-originated taps always show buyer view (so sellers see "This is your
  // listing"). Other entry points (e.g. wallet) show owner view when owned.
  const showOwnerView = !fromStore && isOwned && !!user;
  const isBuyingThis = buyingTokenId === tokenId;

  const attributes = (metadata?.attributes || ownedNft?.attributes || []).map((a) => ({
    trait_type: a.trait_type,
    value: String(a.value),
  }));

  return (
    <>
      <MintedNftDetailScreen
        nft={{
          id: tokenId,
          name: displayName,
          imageUrl: displayImage,
          rarity: 0,
          attributes,
        }}
        txHash={ownedNft?.txHash || ""}
        walletAddress={showOwnerView ? user?.walletAddress || undefined : undefined}
        ownerUsername={
          !showOwnerView && listing && !isOfficial
            ? listing.display_name || listing.username
            : undefined
        }
        onClose={() => setLocation(backHref)}
        initialSold={ownedNft?.sold || false}
        mintedAt={ownedNft?.mintedAt}
        soldAt={ownedNft?.soldAt}
        listedPrice={ownedNft?.listedPrice ?? listing?.listed_price ?? null}
        listingActive={ownedNft?.listingActive ?? (listing ? true : undefined)}
        viewerRole={showOwnerView ? "owner" : "buyer"}
        description={description}
        buyAction={
          !showOwnerView && listing
            ? {
                price: listing.listed_price,
                sellerLabel,
                isOfficial,
                isSeller,
                isAlreadyOwned,
                isBuying: isBuyingThis,
                onBuy: () =>
                  requestBuy({
                    tokenId,
                    sellerId: listing.user_id,
                    nftName: displayName,
                    nftDescription: description,
                    nftImage: displayImage,
                    currentBalance: userBalance,
                    price: listing.listed_price,
                  }),
              }
            : undefined
        }
      />
      <MarketplacePurchaseDialog
        open={purchaseConfirmOpen}
        onOpenChange={setPurchaseConfirmOpen}
        pendingNftPurchase={pendingNftPurchase}
        onConfirm={confirmPurchase}
        onCancel={closePurchaseConfirm}
      />
    </>
  );
}
