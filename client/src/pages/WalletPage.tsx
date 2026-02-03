import { Link } from "wouter";
import { ArrowLeft, Wallet, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useWallet } from "@/hooks/use-wallet";
import { useAuth } from "@/hooks/use-auth";
import { useState, useEffect } from "react";
import { useTokenBalance } from "@/hooks/use-token";
import { useStaking } from "@/hooks/use-staking";
import { usePurchaseGFT } from "@/hooks/use-purchase-gft";
import BuyGFTokenDialog from "@/components/BuyGFTokenDialog";
import WalletHomepage from "@/components/wallet/WalletHomepage";
import BuyGFTScreen from "@/components/wallet/BuyGFTScreen";
import ReviewOrderScreen from "@/components/wallet/ReviewOrderScreen";
import PaymentRedirectScreen from "@/components/wallet/PaymentRedirectScreen";
import BuyGFTResultScreen from "@/components/wallet/BuyGFTResultScreen";
import ActivityHistoryScreen from "@/components/wallet/ActivityHistoryScreen";
import StakingHubScreen from "@/components/wallet/StakingHubScreen";
import walletPromo from "@assets/Wallet promo new_1762876656607.png";

export default function WalletPage() {
  const { user } = useAuth();
  const { walletAddress, isReady, isConnecting, connect } = useWallet();
  const [showWalletDetails, setShowWalletDetails] = useState(() => !!user?.walletAddress);
  const [showBuyDialog, setShowBuyDialog] = useState(false);
  const [showBuyScreen, setShowBuyScreen] = useState(false);
  const [showReviewScreen, setShowReviewScreen] = useState(false);
  const [showPaymentRedirect, setShowPaymentRedirect] = useState(false);
  const [showResultScreen, setShowResultScreen] = useState(false);
  const [showActivityHistory, setShowActivityHistory] = useState(false);
  const [showStakingHub, setShowStakingHub] = useState(false);
  const [purchaseAmount, setPurchaseAmount] = useState(0);
  const [gftAmount, setGftAmount] = useState(0);
  const { data: tokenBalance, isLoading: isLoadingBalance } = useTokenBalance();
  const { stakedAmount, earnedRewards, estimatedApy, stake, unstake, claimRewards, isStaking } = useStaking();
  const { createOrder, completeOrder, orderId, isCreatingOrder, isCompletingOrder } = usePurchaseGFT();
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null);

  useEffect(() => {
    if ((isReady && walletAddress) || user?.walletAddress) {
      setShowWalletDetails(true);
    }
  }, [isReady, walletAddress, user?.walletAddress]);

  const handleConnectWallet = () => {
    connect();
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8 max-w-6xl">
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
              <p className="text-center text-muted-foreground">
                Please log in to access your wallet
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const handleBuyContinue = (amount: number, gft: number) => {
    setPurchaseAmount(amount);
    setGftAmount(gft);
    setShowBuyScreen(false);
    setShowReviewScreen(true);
  };

  const handleReviewProceed = async () => {
    const order = await createOrder(purchaseAmount);
    if (order) {
      setCurrentOrderId(order.orderId);
      setShowReviewScreen(false);
      setShowPaymentRedirect(true);
    }
  };

  const handlePaymentReady = async () => {
    if (currentOrderId) {
      await completeOrder(currentOrderId);
    }
    setShowPaymentRedirect(false);
    setShowResultScreen(true);
  };

  const handleResultDone = () => {
    setShowResultScreen(false);
    setPurchaseAmount(0);
    setGftAmount(0);
    setCurrentOrderId(null);
  };

  const handleStakeConfirm = async (amount: number) => {
    const success = await stake(amount);
    if (success) {
      setShowStakingHub(false);
    }
  };

  const totalBalance = tokenBalance ? parseFloat(tokenBalance.balance) + (user?.gfTokenBalance || 0) : (user?.gfTokenBalance || 0);
  const displayWalletAddress = walletAddress || user?.walletAddress || "";

  return (
    <div className="min-h-screen bg-background">
      {showStakingHub ? (
        <StakingHubScreen
          onBack={() => setShowStakingHub(false)}
          availableGft={totalBalance}
          totalStaked={stakedAmount}
          rewardsEarned={earnedRewards}
          estimatedApy={estimatedApy}
          onStake={stake}
          onUnstake={unstake}
          onClaimRewards={claimRewards}
        />
      ) : showActivityHistory ? (
        <ActivityHistoryScreen
          onBack={() => setShowActivityHistory(false)}
        />
      ) : showResultScreen ? (
        <BuyGFTResultScreen
          onDone={handleResultDone}
          gftAmount={gftAmount}
        />
      ) : showPaymentRedirect ? (
        <PaymentRedirectScreen
          onBack={() => {
            setShowPaymentRedirect(false);
            setShowReviewScreen(true);
          }}
          onReady={handlePaymentReady}
        />
      ) : showBuyScreen ? (
        <BuyGFTScreen
          onBack={() => setShowBuyScreen(false)}
          onContinue={handleBuyContinue}
          currentBalance={totalBalance}
        />
      ) : showReviewScreen ? (
        <ReviewOrderScreen
          onBack={() => {
            setShowReviewScreen(false);
            setShowBuyScreen(true);
          }}
          onProceed={handleReviewProceed}
          amount={purchaseAmount}
          gftAmount={gftAmount}
          walletAddress={displayWalletAddress}
        />
      ) : showWalletDetails ? (
        <WalletHomepage
          gfBalance={totalBalance}
          onChainBalance={tokenBalance?.balance || "0"}
          offChainBalance={user?.gfTokenBalance || 0}
          walletAddress={displayWalletAddress}
          stakedAmount={stakedAmount}
          nftsOwned={0}
          onBuyClick={() => setShowBuyScreen(true)}
          onStakeClick={() => setShowStakingHub(true)}
          onProfileClick={() => setShowWalletDetails(false)}
          onActivityClick={() => setShowActivityHistory(true)}
          isLoadingBalance={isLoadingBalance}
        />
      ) : (
        <div className="container mx-auto px-4 py-8 max-w-6xl">
          <div className="mb-12">
            <Link href="/">
              <Button variant="ghost" className="mb-4" data-testid="button-back">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Home
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center" data-testid="card-create-wallet">
            <div className="space-y-6">
              <div>
                <h2 className="text-4xl font-bold mb-4">
                  Welcome to your<br />Gamefolio Wallet
                </h2>
                <p className="text-lg pr-8 text-muted-foreground">
                  Store Gamefolio Tokens (GFT) and NFT avatar profile pictures!
                </p>
              </div>

              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <div className="mt-1 text-primary">✓</div>
                  <span>Secure storage for digital assets</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="mt-1 text-primary">✓</div>
                  <span>Your own blockchain wallet address</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="mt-1 text-primary">✓</div>
                  <span>Ability to mint and trade NFTs</span>
                </li>
              </ul>

              <div className="space-y-4">
                <Button 
                  onClick={(isReady && walletAddress) || user?.walletAddress ? () => setShowWalletDetails(true) : handleConnectWallet} 
                  disabled={isConnecting}
                  className="w-auto px-6"
                  data-testid={(isReady && walletAddress) || user?.walletAddress ? "button-continue-wallet" : "button-connect-wallet"}
                >
                  {isConnecting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      {(isReady && walletAddress) || user?.walletAddress ? (
                        <>
                          <ArrowLeft className="w-4 h-4 mr-2 rotate-180" />
                          Continue to Wallet
                        </>
                      ) : (
                        <>
                          <Wallet className="w-4 h-4 mr-2" />
                          Connect Wallet
                        </>
                      )}
                    </>
                  )}
                </Button>
                <div className="flex items-center justify-start">
                  <span className="text-sm text-muted-foreground">Powered by Sequence</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-center">
              <img 
                src={walletPromo} 
                alt="Wallet NFT Promo" 
                className="w-full h-auto object-contain"
                style={{ maxHeight: '750px' }}
              />
            </div>
          </div>
        </div>
      )}

      <BuyGFTokenDialog 
        open={showBuyDialog} 
        onOpenChange={setShowBuyDialog}
      />
    </div>
  );
}
