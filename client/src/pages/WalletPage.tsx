import { Link, useLocation } from "wouter";
import { ArrowLeft, Wallet, Loader2, Gift, Layers3, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { isNative, openExternal } from "@/lib/platform";
import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useStaking } from "@/hooks/use-staking";
import { useTokenBalance } from "@/hooks/use-token";
import { usePurchaseGFT } from "@/hooks/use-purchase-gft";
import { useAutoWallet } from "@/hooks/use-auto-wallet";
import BuyGFTokenDialog from "@/components/BuyGFTokenDialog";
import WalletHomepage from "@/components/wallet/WalletHomepage";
import BuyGFTScreen from "@/components/wallet/BuyGFTScreen";
import ReviewOrderScreen from "@/components/wallet/ReviewOrderScreen";
import CardEntryScreen from "@/components/wallet/CardEntryScreen";
import BuyGFTResultScreen from "@/components/wallet/BuyGFTResultScreen";
import ActivityHistoryScreen from "@/components/wallet/ActivityHistoryScreen";
import StakingHubScreen from "@/components/wallet/StakingHubScreen";
import walletPromo from "@assets/Wallet promo new_1762876656607.png";

interface OwnedNFT {
  id: number;
  name: string;
  image: string | null;
  rarity: string | null;
}

import { useAuthModal } from "@/hooks/use-auth-modal";

export default function WalletPage() {
  const { user } = useAuth();
  const { openModal } = useAuthModal();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [showBuyDialog, setShowBuyDialog] = useState(false);
  const [showBuyScreen, setShowBuyScreen] = useState(false);
  const [showReviewScreen, setShowReviewScreen] = useState(false);
  const [showCardEntry, setShowCardEntry] = useState(false);
  const [showResultScreen, setShowResultScreen] = useState(false);
  const [showActivityHistory, setShowActivityHistory] = useState(false);
  const [showStakingHub, setShowStakingHub] = useState(false);
  const [purchaseAmount, setPurchaseAmount] = useState(0);
  const [gftAmount, setGftAmount] = useState(0);
  const { data: tokenBalanceData } = useTokenBalance();
  const userGftBalance = parseFloat(tokenBalanceData?.balance || '0');
  // Staking signs from the user's primary on-chain wallet only, so we must
  // surface the balance of THAT wallet (not the aggregate across retired
  // wallets) to the staking UI. Otherwise the user sees a higher "Available"
  // number than they can actually stake and the contract reverts with
  // "ERC20: transfer amount exceeds balance".
  const stakingWalletBalance = (() => {
    const wallets = tokenBalanceData?.wallets;
    if (!wallets || wallets.length === 0) return userGftBalance;
    const primary = wallets.find((w) => w.isPrimary && !w.isRetired);
    if (primary) return parseFloat(primary.balance || '0');
    return userGftBalance;
  })();
  const { stakedAmount, earnedRewards, estimatedApy, stake, unstake, claimRewards, isStaking, isClaiming, stakeHistory } = useStaking();
  const { createOrder, isCreatingOrder, checkOrderStatus, refreshBalances } = usePurchaseGFT();

  const NATIVE_WEB_BUY_URL = "https://app.gamefolio.com/wallet";
  const handleBuyClick = () => {
    if (isNative) {
      // Apple/Google forbid third-party payment flows for digital goods, so
      // redirect the user to the web wallet via Capacitor Browser instead of
      // mounting the Stripe-powered card entry screen.
      toast({
        title: "Buy GFT on the web",
        description: "Token purchases are managed on the Gamefolio website. Opening it now…",
      });
      void openExternal(NATIVE_WEB_BUY_URL);
      return;
    }
    setShowBuyScreen(true);
  };
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null);
  const [purchaseSuccess, setPurchaseSuccess] = useState(false);
  const recoveryAttemptedRef = useRef(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paymentIntentId = params.get("payment_intent");
    const redirectStatus = params.get("redirect_status");

    if (paymentIntentId && redirectStatus === "succeeded") {
      fetch("/api/gf/confirm-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ paymentIntentId }),
      })
        .then(() => refreshBalances())
        .catch(() => {});

      setPurchaseSuccess(true);
      setShowResultScreen(true);
      window.history.replaceState({}, "", "/wallet");
    }
  }, [refreshBalances]);

  useEffect(() => {
    if (user && !recoveryAttemptedRef.current) {
      recoveryAttemptedRef.current = true;
      fetch("/api/gf/recover-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.recovered > 0) {
            refreshBalances();
          }
        })
        .catch(() => {});
    }
  }, [user, refreshBalances]);

  const { data: ownedNFTs = [] } = useQuery<OwnedNFT[]>({
    queryKey: ['/api/nfts/owned', 'wallet-view'],
    queryFn: async () => {
      const res = await fetch('/api/nfts/owned', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch owned NFTs');
      const data = await res.json();
      const nfts = data.nfts || [];
      return nfts.filter((n: any) => !n.sold).map((n: any) => ({
        id: n.tokenId,
        name: n.name || `Gamefolio Genesis #${n.tokenId}`,
        image: n.image || null,
        rarity: n.rarity || null,
      }));
    },
    enabled: !!user,
  });

  const {
    createWallet,
    isCreating: isCreatingWallet,
    error: walletError,
    walletAddress: newWalletAddress
  } = useAutoWallet();
  const walletInitiatedRef = useRef(false);

  const { data: onChainData } = useQuery<{
    balance: string;
    walletAddress: string | null;
    wallets?: Array<{
      address: string;
      balance: string;
      isPrimary: boolean;
      isRetired: boolean;
      isCustodial: boolean;
    }>;
  }>({
    queryKey: ['/api/token/on-chain-balance'],
    queryFn: async () => {
      const res = await fetch('/api/token/on-chain-balance', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch on-chain balance');
      return res.json();
    },
    enabled: !!(user?.walletAddress || newWalletAddress),
    refetchInterval: 30000,
  });

  const onChainBalance = onChainData?.balance || '0';
  const walletBreakdown = onChainData?.wallets || [];

  const hasExistingWallet = !!(user?.walletAddress || newWalletAddress);

  const handleRetryWalletCreation = () => {
    walletInitiatedRef.current = false;
    void createWallet();
  };

  const handleCreateWallet = () => {
    if (!walletInitiatedRef.current && !isCreatingWallet) {
      walletInitiatedRef.current = true;
      void createWallet();
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-4 md:px-6 md:py-6 max-w-6xl">
          <div className="mb-8">
            <Link href="/">
              <Button variant="ghost" className="mb-4" data-testid="button-back">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Home
              </Button>
            </Link>
            <h1 className="text-4xl font-bold text-primary mb-2" data-testid="text-page-title">Wallet</h1>
          </div>
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center justify-center space-y-4">
                <p className="text-center text-muted-foreground">
                  Please log in to access your wallet
                </p>
                <Button 
                  onClick={() => openModal()}
                  className="bg-primary hover:bg-primary text-slate-900 font-bold"
                >
                  Log In
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (showActivityHistory) {
    return (
      <ActivityHistoryScreen 
        onBack={() => setShowActivityHistory(false)}
      />
    );
  }

  if (showStakingHub) {
    return (
      <StakingHubScreen
        onBack={() => setShowStakingHub(false)}
        totalStaked={stakedAmount}
        rewardsEarned={earnedRewards}
        estimatedApy={estimatedApy}
        availableGft={stakingWalletBalance}
        stakeHistory={stakeHistory}
        onStake={stake}
        onUnstake={unstake}
        onClaimRewards={claimRewards}
        isClaiming={isClaiming}
      />
    );
  }

  if (showResultScreen) {
    return (
      <BuyGFTResultScreen
        onDone={() => {
          setShowResultScreen(false);
          setCurrentOrderId(null);
          refreshBalances();
        }}
        gftAmount={gftAmount}
        availableBalance={userGftBalance}
      />
    );
  }

  if (showCardEntry) {
    return (
      <CardEntryScreen
        onBack={() => setShowCardEntry(false)}
        onSuccess={() => {
          setShowCardEntry(false);
          setShowResultScreen(true);
          refreshBalances();
        }}
        amount={purchaseAmount}
        gftAmount={gftAmount}
      />
    );
  }

  if (showReviewScreen) {
    return (
      <ReviewOrderScreen
        onBack={() => setShowReviewScreen(false)}
        amount={purchaseAmount}
        gftAmount={gftAmount}
        walletAddress={user.walletAddress || newWalletAddress || ''}
        onProceed={() => {
          setShowReviewScreen(false);
          setShowCardEntry(true);
        }}
      />
    );
  }

  if (showBuyScreen) {
    return (
      <BuyGFTScreen
        onBack={() => setShowBuyScreen(false)}
        onContinue={(gbpAmount, gft) => {
          setPurchaseAmount(gbpAmount);
          setGftAmount(gft);
          setShowBuyScreen(false);
          setShowReviewScreen(true);
        }}
      />
    );
  }

  if (hasExistingWallet) {
    const displayWalletAddress = user.walletAddress || newWalletAddress || '';
    
    return (
      <WalletHomepage
        walletAddress={displayWalletAddress}
        onChainBalance={onChainBalance}
        wallets={walletBreakdown}
        offChainBalance={userGftBalance}
        fiatValue={userGftBalance * 0.01}
        stakedAmount={stakedAmount}
        nftsOwned={ownedNFTs.length}
        ownedNFTs={ownedNFTs}
        onBuyClick={handleBuyClick}
        onActivityClick={() => setShowActivityHistory(true)}
        onStakeClick={() => setShowStakingHub(true)}
        onNFTsClick={() => setLocation('/collection')}
        onNFTClick={(nftId) => setLocation(`/nft/${nftId}`)}
        isLoadingBalance={false}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background pb-[calc(var(--mobile-nav-height,3.5rem)+1.5rem+env(safe-area-inset-bottom,0px))] md:pb-6">
      <div className="container mx-auto px-4 py-4 md:px-6 md:py-6 max-w-6xl">
        <div className="mb-8">
          <Link href="/">
            <Button variant="ghost" className="mb-4" data-testid="button-back">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </Link>
          <h1 className="text-4xl font-bold text-primary mb-2" data-testid="text-page-title">Wallet</h1>
          <p className="text-muted-foreground">
            Manage your GF Tokens and NFTs
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 md:gap-8 items-start md:items-center">
          <div>
            <img 
              src={walletPromo} 
              alt="Wallet Features" 
              className="w-full max-w-md max-h-[220px] md:max-h-none object-contain mx-auto rounded-2xl shadow-2xl"
            />
          </div>

          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Your Gaming Wallet</h2>
            <p className="text-muted-foreground">
              Create your secure Gamefolio wallet to hold GFT, receive rewards, and use wallet-powered Gamefolio features.
            </p>

            <ul className="space-y-3 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <Wallet className="w-4 h-4 shrink-0 text-primary" />
                <span>Hold and manage GFT</span>
              </li>
              <li className="flex items-center gap-2">
                <Gift className="w-4 h-4 shrink-0 text-primary" />
                <span>Receive Gamefolio rewards</span>
              </li>
              <li className="flex items-center gap-2">
                <Layers3 className="w-4 h-4 shrink-0 text-primary" />
                <span>Manage supported digital collectibles</span>
              </li>
              <li className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 shrink-0 text-primary" />
                <span>Keep your Gamefolio assets in one secure wallet</span>
              </li>
            </ul>

            <div className="space-y-4">
              {walletError ? (
                <div className="space-y-3">
                  <Card className="bg-destructive/10 border-destructive/50">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="text-destructive">
                          <span className="text-xl font-bold">!</span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-destructive">Wallet Creation Failed</p>
                          <p className="text-xs text-muted-foreground">{walletError}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Button 
                    onClick={handleRetryWalletCreation}
                    className="w-auto px-6"
                  >
                    <Wallet className="w-4 h-4 mr-2" />
                    Try Again
                  </Button>
                </div>
              ) : isCreatingWallet ? (
                <div className="space-y-3">
                  <Card className="bg-primary/10 border-primary/50">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <Loader2 className="w-5 h-5 animate-spin text-primary" />
                        <div>
                          <p className="text-sm font-medium">Creating Your Wallet</p>
                          <p className="text-xs text-muted-foreground">
                            Creating your secure Gamefolio wallet…
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <Button 
                  onClick={handleCreateWallet}
                  disabled={isCreatingWallet}
                  className="w-full md:w-auto px-6 bg-primary text-[#0A0A10] font-bold hover:bg-primary/90"
                  data-testid="button-create-wallet"
                >
                  <Wallet className="w-4 h-4 mr-2" />
                  Create Your Wallet
                </Button>
              )}
            </div>
          </div>
        </div>

        <BuyGFTokenDialog 
          open={showBuyDialog} 
          onOpenChange={setShowBuyDialog}
        />
      </div>
    </div>
  );
}
