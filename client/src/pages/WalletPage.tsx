import { Link } from "wouter";
import { ArrowLeft, Wallet, Loader2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useWallet } from "@/hooks/use-wallet";
import { useAuth } from "@/hooks/use-auth";
import { useState, useEffect, useRef } from "react";
import { useTokenBalance } from "@/hooks/use-token";
import { useStaking } from "@/hooks/use-staking";
import { usePurchaseGFT } from "@/hooks/use-purchase-gft";
import { useSequenceEmailAuth } from "@/hooks/use-sequence-email-auth";
import BuyGFTokenDialog from "@/components/BuyGFTokenDialog";
import WalletHomepage from "@/components/wallet/WalletHomepage";
import BuyGFTScreen from "@/components/wallet/BuyGFTScreen";
import ReviewOrderScreen from "@/components/wallet/ReviewOrderScreen";
import PaymentRedirectScreen from "@/components/wallet/PaymentRedirectScreen";
import BuyGFTResultScreen from "@/components/wallet/BuyGFTResultScreen";
import ActivityHistoryScreen from "@/components/wallet/ActivityHistoryScreen";
import StakingHubScreen from "@/components/wallet/StakingHubScreen";
import WalletOTPModal from "@/components/wallet/WalletOTPModal";
import walletPromo from "@assets/Wallet promo new_1762876656607.png";

export default function WalletPage() {
  const { user } = useAuth();
  const { walletAddress, isReady, isConnecting, connect } = useWallet();
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

  // Sequence email auth for auto-wallet creation
  const { 
    initiateEmailAuth, 
    verifyOTP, 
    isInitiating: isInitiatingWallet, 
    isVerifying: isVerifyingWallet, 
    awaitingOTP, 
    error: walletError,
    walletAddress: emailWalletAddress 
  } = useSequenceEmailAuth();
  const [showOTPModal, setShowOTPModal] = useState(false);
  const walletInitiatedRef = useRef(false);

  const hasExistingWallet = !!(user?.walletAddress || (isReady && walletAddress) || emailWalletAddress);
  const [showWalletDetails, setShowWalletDetails] = useState(false);

  useEffect(() => {
    if (hasExistingWallet) {
      setShowWalletDetails(true);
    }
  }, [hasExistingWallet]);

  // Show OTP modal when awaiting OTP
  useEffect(() => {
    if (awaitingOTP) {
      setShowOTPModal(true);
    }
  }, [awaitingOTP]);

  // Handle OTP verification
  const handleOTPVerify = async (code: string): Promise<boolean> => {
    const result = await verifyOTP(code);
    if (result?.wallet) {
      setShowOTPModal(false);
      setShowWalletDetails(true);
      return true;
    }
    return false;
  };

  // Auto-initiate wallet creation for verified users without wallets
  const handleAutoCreateWallet = async () => {
    if (user?.email && user?.emailVerified && !walletInitiatedRef.current) {
      walletInitiatedRef.current = true;
      await initiateEmailAuth(user.email);
    }
  };

  const handleConnectWallet = () => {
    // For verified users, use email auth for seamless wallet creation
    if (user?.email && user?.emailVerified) {
      handleAutoCreateWallet();
    } else {
      // Fallback to Sequence connect modal
      connect();
    }
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
  const displayWalletAddress = walletAddress || emailWalletAddress || user?.walletAddress || "";
  const isCreatingAnyWallet = isInitiatingWallet || isConnecting;

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
                {awaitingOTP ? (
                  <div className="space-y-3">
                    <Card className="bg-primary/10 border-primary/50">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <Mail className="w-8 h-8 text-primary" />
                          <div>
                            <p className="font-medium">Check your email</p>
                            <p className="text-sm text-muted-foreground">
                              We sent a verification code to {user?.email}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <Button 
                      onClick={() => setShowOTPModal(true)}
                      className="w-auto px-6"
                    >
                      <Mail className="w-4 h-4 mr-2" />
                      Enter Verification Code
                    </Button>
                  </div>
                ) : (
                  <Button 
                    onClick={hasExistingWallet ? () => setShowWalletDetails(true) : handleConnectWallet} 
                    disabled={isCreatingAnyWallet && !hasExistingWallet}
                    className="w-auto px-6"
                    data-testid={hasExistingWallet ? "button-access-wallet" : "button-connect-wallet"}
                  >
                    {isCreatingAnyWallet && !hasExistingWallet ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Creating Wallet...
                      </>
                    ) : hasExistingWallet ? (
                      <>
                        <Wallet className="w-4 h-4 mr-2" />
                        Access Wallet
                      </>
                    ) : (
                      <>
                        <Wallet className="w-4 h-4 mr-2" />
                        Create Wallet
                      </>
                    )}
                  </Button>
                )}
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

      {/* OTP Modal for wallet creation */}
      <WalletOTPModal
        open={showOTPModal}
        onOpenChange={setShowOTPModal}
        email={user?.email || ""}
        onVerify={handleOTPVerify}
        isVerifying={isVerifyingWallet}
        error={walletError}
      />
    </div>
  );
}
