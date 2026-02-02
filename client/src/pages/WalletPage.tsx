import { Link } from "wouter";
import { ArrowLeft, Wallet, Copy, ExternalLink, CheckCircle2, Loader2, LogIn, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCrossmint } from "@/hooks/use-crossmint";
import { useAuth } from "@/hooks/use-auth";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useTokenBalance } from "@/hooks/use-token";
import BuyGFTokenDialog from "@/components/BuyGFTokenDialog";
import WalletHomepage from "@/components/wallet/WalletHomepage";
import crossmintBadge from "@assets/badge-color-background_1762859702329.png";
import walletPromo from "@assets/Wallet promo new_1762876656607.png";

export default function WalletPage() {
  const { user } = useAuth();
  const { wallet, isLoading, createWallet, loginToWallet } = useCrossmint();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [showWalletDetails, setShowWalletDetails] = useState(false);
  const [showBuyDialog, setShowBuyDialog] = useState(false);
  const { data: tokenBalance, isLoading: isLoadingBalance, refetch: refetchBalance } = useTokenBalance();

  useEffect(() => {
    if (wallet || user?.walletAddress) {
      setShowWalletDetails(true);
    }
  }, [wallet, user?.walletAddress]);

  const handleCopyAddress = async () => {
    if (wallet?.address) {
      await navigator.clipboard.writeText(wallet.address);
      setCopied(true);
      toast({
        title: "Address copied",
        description: "Wallet address copied to clipboard",
      });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getExplorerUrl = () => {
    if (!wallet) return '';
    const chain = wallet.chain || 'skale-nebula-testnet';
    
    const explorers: Record<string, string> = {
      'polygon': 'https://polygonscan.com',
      'ethereum': 'https://etherscan.io',
      'base': 'https://basescan.org',
      'polygon-amoy': 'https://amoy.polygonscan.com',
      'base-sepolia': 'https://sepolia.basescan.org',
      'ethereum-sepolia': 'https://sepolia.etherscan.io',
      'skale-nebula': 'https://lanky-ill-funny-testnet.explorer.mainnet.skalenodes.com',
      'skale-nebula-testnet': 'https://lanky-ill-funny-testnet.explorer.testnet.skalenodes.com',
      'skale-calypso': 'https://honorable-steel-rasalhague.explorer.mainnet.skalenodes.com',
      'skale-calypso-testnet': 'https://giant-half-dual-testnet.explorer.testnet.skalenodes.com',
      'skale-europa': 'https://elated-tan-skat.explorer.mainnet.skalenodes.com',
      'skale-europa-testnet': 'https://juicy-low-small-testnet.explorer.testnet.skalenodes.com',
      'skale-titan': 'https://parallel-stormy-spica.explorer.mainnet.skalenodes.com',
      'skale-titan-testnet': 'https://aware-fake-trim-testnet.explorer.testnet.skalenodes.com',
    };

    const baseUrl = explorers[chain] || explorers['skale-nebula-testnet'];
    return `${baseUrl}/address/${wallet.address}`;
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

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-12">
          <Link href="/">
            <Button variant="ghost" className="mb-4" data-testid="button-back">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </Link>
        </div>

        {!showWalletDetails ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center" data-testid="card-create-wallet">
            {/* Left column - Content without border */}
            <div className="space-y-6">
              {/* Header */}
              <div>
                <h2 className="text-4xl font-bold mb-4">
                  Welcome to your<br />Gamefolio Wallet
                </h2>
                <p className="text-lg pr-8 text-muted-foreground">
                  Store Gamefolio Tokens (GF) and NFT avatar profile pictures!
                </p>
              </div>

              {/* List */}
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

              {/* Button and Badge */}
              <div className="space-y-4">
                <Button 
                  onClick={(wallet || user?.walletAddress) ? () => setShowWalletDetails(true) : createWallet} 
                  disabled={isLoading}
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

            {/* Right column - Image */}
            <div className="flex items-center justify-center">
              <img 
                src={walletPromo} 
                alt="Wallet NFT Promo" 
                className="w-full h-auto object-contain"
                style={{ maxHeight: '750px' }}
              />
            </div>
          </div>
        ) : (
          <div>
            <Button 
              variant="ghost" 
              className="mb-6" 
              onClick={() => setShowWalletDetails(false)}
              data-testid="button-back-to-welcome"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Welcome
            </Button>
            
            <div className="bg-gradient-to-b from-slate-900 to-slate-800 rounded-lg p-6" data-testid="wallet-homepage">
              <Tabs defaultValue="tokens" className="space-y-6" data-testid="tabs-wallet">
                <TabsList className="grid w-full grid-cols-2 bg-white/5">
                  <TabsTrigger value="tokens" className="data-[state=active]:bg-white data-[state=active]:text-slate-900" data-testid="tab-tokens">
                    <Wallet className="w-4 h-4 mr-2" />
                    Wallet & Staking
                  </TabsTrigger>
                  <TabsTrigger value="nfts" className="data-[state=active]:bg-white data-[state=active]:text-slate-900" data-testid="tab-nfts">
                    <ImageIcon className="w-4 h-4 mr-2" />
                    NFTs & Collectibles
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="tokens" className="space-y-6">
                  <WalletHomepage
                    gfBalance={tokenBalance ? parseFloat(tokenBalance.balance) + (user?.gfTokenBalance || 0) : (user?.gfTokenBalance || 0)}
                    onChainBalance={tokenBalance?.balance || "0"}
                    offChainBalance={user?.gfTokenBalance || 0}
                    onBuyClick={() => setShowBuyDialog(true)}
                    onSellClick={() => {}}
                    onSendClick={() => {}}
                    onReceiveClick={() => handleCopyAddress()}
                    onRefreshBalance={() => refetchBalance()}
                    isLoadingBalance={isLoadingBalance}
                  />

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                    <Card className="bg-white/5 border-white/10" data-testid="card-wallet-address">
                      <CardHeader>
                        <div className="flex items-center gap-4">
                          <Wallet className="w-10 h-10 text-indigo-400" />
                          <div>
                            <CardTitle className="text-white">Wallet Address</CardTitle>
                            <CardDescription className="text-white/60">Your blockchain wallet address</CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex items-center gap-2">
                          <code className="flex-1 text-sm bg-white/10 text-white/80 px-3 py-2 rounded-md font-mono break-all" data-testid="text-wallet-address">
                            {wallet?.address}
                          </code>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleCopyAddress}
                            className="border-white/20 text-white hover:bg-white/10"
                            data-testid="button-copy-address"
                          >
                            {copied ? (
                              <CheckCircle2 className="w-4 h-4 text-green-400" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </Button>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-white/60">
                            Blockchain Network
                          </label>
                          <div className="mt-1">
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-indigo-500/20 text-indigo-400" data-testid="text-wallet-chain">
                              {wallet?.chain ? wallet.chain.charAt(0).toUpperCase() + wallet.chain.slice(1) : 'Unknown'}
                            </span>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          className="w-full border-white/20 text-white hover:bg-white/10"
                          asChild
                          data-testid="button-view-explorer"
                        >
                          <a href={getExplorerUrl()} target="_blank" rel="noopener noreferrer">
                            View on Block Explorer
                            <ExternalLink className="w-4 h-4 ml-2" />
                          </a>
                        </Button>
                      </CardContent>
                    </Card>

                    <Card className="bg-white/5 border-white/10" data-testid="card-transaction-history">
                      <CardHeader>
                        <CardTitle className="text-white">Transaction History</CardTitle>
                        <CardDescription className="text-white/60">Recent transactions on your wallet</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-col items-center justify-center py-8 text-center">
                          <p className="text-sm text-white/60 mb-4">
                            No transactions yet. Buy or sell GF tokens to get started.
                          </p>
                          <Button
                            variant="default"
                            onClick={loginToWallet}
                            className="bg-white text-slate-900 hover:bg-white/90"
                            data-testid="button-view-full-history"
                          >
                            <LogIn className="w-4 h-4 mr-2" />
                            View Full History in Crossmint
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

              <TabsContent value="nfts" className="space-y-6">
                <Card className="bg-white/5 border-white/10" data-testid="card-nfts-collectibles">
                  <CardHeader>
                    <div className="flex items-center gap-4">
                      <ImageIcon className="w-12 h-12 text-indigo-400" />
                      <div>
                        <CardTitle className="text-white">NFTs & Collectibles</CardTitle>
                        <CardDescription className="text-white/60">Your digital collectibles and rewards</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <ImageIcon className="w-16 h-16 text-white/40 mb-4" />
                      <h3 className="text-lg font-semibold mb-2 text-white" data-testid="heading-no-nfts">
                        No NFTs Yet
                      </h3>
                      <p className="text-sm text-white/60 mb-6 max-w-md" data-testid="text-no-nfts-description">
                        You haven't received any NFTs or collectibles yet. Browse the store to purchase NFT avatars or earn lootbox rewards through staking and platform activities.
                      </p>
                      <Link href="/store">
                        <Button className="bg-white text-slate-900 hover:bg-white/90" data-testid="button-browse-store">
                          <Wallet className="w-4 h-4 mr-2" />
                          Browse NFT Store
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
          </div>
        )}
      </div>

      {/* Buy GF Token Dialog */}
      <BuyGFTokenDialog 
        open={showBuyDialog} 
        onOpenChange={setShowBuyDialog}
      />
    </div>
  );
}
