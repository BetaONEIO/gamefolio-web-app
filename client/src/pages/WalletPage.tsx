import { Link } from "wouter";
import { ArrowLeft, Wallet, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useCrossmint } from "@/hooks/use-crossmint";
import { useAuth } from "@/hooks/use-auth";
import { useState, useEffect } from "react";
import { useTokenBalance } from "@/hooks/use-token";
import BuyGFTokenDialog from "@/components/BuyGFTokenDialog";
import WalletHomepage from "@/components/wallet/WalletHomepage";
import CreatingWallet from "@/components/wallet/CreatingWallet";
import BuyGFTScreen from "@/components/wallet/BuyGFTScreen";
import ReviewOrderScreen from "@/components/wallet/ReviewOrderScreen";
import PaymentRedirectScreen from "@/components/wallet/PaymentRedirectScreen";
import crossmintBadge from "@assets/badge-color-background_1762859702329.png";
import walletPromo from "@assets/Wallet promo new_1762876656607.png";

export default function WalletPage() {
  const { user } = useAuth();
  const { wallet, isLoading, createWallet } = useCrossmint();
  const [showWalletDetails, setShowWalletDetails] = useState(false);
  const [showBuyDialog, setShowBuyDialog] = useState(false);
  const [showBuyScreen, setShowBuyScreen] = useState(false);
  const [showReviewScreen, setShowReviewScreen] = useState(false);
  const [showPaymentRedirect, setShowPaymentRedirect] = useState(false);
  const [purchaseAmount, setPurchaseAmount] = useState(0);
  const [gftAmount, setGftAmount] = useState(0);
  const [isCreating, setIsCreating] = useState(false);
  const { data: tokenBalance, isLoading: isLoadingBalance } = useTokenBalance();

  useEffect(() => {
    if ((wallet || user?.walletAddress) && !isCreating) {
      setShowWalletDetails(true);
    }
  }, [wallet, user?.walletAddress, isCreating]);

  const handleCreationComplete = () => {
    setIsCreating(false);
    setShowWalletDetails(true);
  };

  const handleCreateWallet = () => {
    setIsCreating(true);
    setShowWalletDetails(false);
    createWallet();
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

  const handleReviewProceed = () => {
    setShowReviewScreen(false);
    setShowPaymentRedirect(true);
  };

  const handlePaymentReady = () => {
    setShowPaymentRedirect(false);
    setShowBuyDialog(true);
  };

  return (
    <div className="min-h-screen bg-background">
      {isCreating ? (
        <CreatingWallet
          onBack={() => {
            setIsCreating(false);
          }}
          onRetry={handleCreateWallet}
          onComplete={handleCreationComplete}
          isError={false}
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
          currentBalance={tokenBalance ? parseFloat(tokenBalance.balance) + (user?.gfTokenBalance || 0) : (user?.gfTokenBalance || 0)}
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
          walletAddress={wallet?.address || user?.walletAddress || ""}
        />
      ) : showWalletDetails ? (
        <WalletHomepage
          gfBalance={tokenBalance ? parseFloat(tokenBalance.balance) + (user?.gfTokenBalance || 0) : (user?.gfTokenBalance || 0)}
          onChainBalance={tokenBalance?.balance || "0"}
          offChainBalance={user?.gfTokenBalance || 0}
          walletAddress={wallet?.address || ""}
          onBuyClick={() => setShowBuyScreen(true)}
          onStakeClick={() => {}}
          onProfileClick={() => setShowWalletDetails(false)}
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
                  Store Gamefolio Tokens (GF) and NFT avatar profile pictures!
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
                  onClick={(wallet || user?.walletAddress) ? () => setShowWalletDetails(true) : handleCreateWallet} 
                  disabled={isLoading || isCreating}
                  className="w-auto px-6"
                  data-testid={(wallet || user?.walletAddress) ? "button-continue-wallet" : "button-create-wallet"}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {(wallet || user?.walletAddress) ? "Loading..." : "Creating Wallet..."}
                    </>
                  ) : (
                    <>
                      {(wallet || user?.walletAddress) ? (
                        <>
                          <ArrowLeft className="w-4 h-4 mr-2 rotate-180" />
                          Continue to Wallet
                        </>
                      ) : (
                        <>
                          <Wallet className="w-4 h-4 mr-2" />
                          Create Wallet
                        </>
                      )}
                    </>
                  )}
                </Button>
                <div className="flex items-center justify-start">
                  <img 
                    src={crossmintBadge} 
                    alt="Powered by Crossmint" 
                    className="h-8"
                  />
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
