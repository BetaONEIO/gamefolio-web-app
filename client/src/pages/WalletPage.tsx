import { Link } from "wouter";
import { ArrowLeft, Wallet, Copy, ExternalLink, CheckCircle2, Loader2, LogIn, LogOut, Image } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCrossmint } from "@/hooks/use-crossmint";
import { useAuth } from "@/hooks/use-auth";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import gfTokenLogo from "@assets/Gamefolio token_1762633908726.png";
import crossmintBadge from "@assets/badge-color-background_1762859702329.png";
import walletPromo from "@assets/Wallet promo new_1762876656607.png";

export default function WalletPage() {
  const { user } = useAuth();
  const { wallet, isLoading, createWallet, loginToWallet } = useCrossmint();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [showWalletDetails, setShowWalletDetails] = useState(false);

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
                  onClick={wallet ? () => setShowWalletDetails(true) : createWallet} 
                  disabled={isLoading}
                  className="w-auto px-6"
                  data-testid={wallet ? "button-continue-wallet" : "button-create-wallet"}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating Wallet...
                    </>
                  ) : (
                    <>
                      {wallet ? (
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
            
            <Tabs defaultValue="wallet" className="space-y-6" data-testid="tabs-wallet">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="wallet" data-testid="tab-wallet-info">
                  <Wallet className="w-4 h-4 mr-2" />
                  Wallet
                </TabsTrigger>
                <TabsTrigger value="stake" data-testid="tab-stake">
                  <Wallet className="w-4 h-4 mr-2" />
                  Stake GF Token
                </TabsTrigger>
                <TabsTrigger value="nfts" data-testid="tab-nfts">
                  <Image className="w-4 h-4 mr-2" />
                  NFTs & Collectibles
                </TabsTrigger>
              </TabsList>

              <TabsContent value="wallet" className="space-y-6">
                <Card data-testid="card-gf-balance">
                  <CardHeader>
                    <div className="flex items-center gap-4">
                      <img src={gfTokenLogo} alt="GF Token" className="w-12 h-12" />
                      <div>
                        <CardTitle>GF Balance</CardTitle>
                        <CardDescription>Your Gamefolio Token balance</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-3xl font-bold" data-testid="text-gf-balance">
                          {(user?.gfTokenBalance || 0).toLocaleString()} GF
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1" data-testid="text-gf-balance-usd">
                        ≈ ${((user?.gfTokenBalance || 0) * 0.05).toFixed(2)} USD
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Button variant="default" data-testid="button-buy-gf">
                        Buy GF Token
                      </Button>
                      <Button variant="outline" data-testid="button-sell-gf">
                        Sell GF Token
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card data-testid="card-wallet-address">
                  <CardHeader>
                    <div className="flex items-center gap-4">
                      <Wallet className="w-12 h-12 text-primary" />
                      <div>
                        <CardTitle>Wallet Address</CardTitle>
                        <CardDescription>Your blockchain wallet address</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-2">
                      <code className="flex-1 text-sm bg-muted px-3 py-2 rounded-md font-mono break-all" data-testid="text-wallet-address">
                        {wallet?.address}
                      </code>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCopyAddress}
                        data-testid="button-copy-address"
                      >
                        {copied ? (
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        Blockchain Network
                      </label>
                      <div className="mt-1">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-primary/10 text-primary" data-testid="text-wallet-chain">
                          {wallet?.chain.charAt(0).toUpperCase() + wallet?.chain.slice(1)}
                        </span>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      className="w-full"
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

                <Card data-testid="card-transaction-history">
                  <CardHeader>
                    <CardTitle>Transaction History</CardTitle>
                    <CardDescription>Recent transactions on your wallet</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <p className="text-sm text-muted-foreground mb-4">
                        No transactions yet. Buy or sell GF tokens to get started.
                      </p>
                      <Button
                        variant="default"
                        onClick={loginToWallet}
                        data-testid="button-view-full-history"
                      >
                        <LogIn className="w-4 h-4 mr-2" />
                        View Full History in Crossmint
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="stake" className="space-y-6">
                <Card data-testid="card-stake-gf">
                  <CardHeader>
                    <div className="flex items-center gap-4">
                      <img src={gfTokenLogo} alt="Stake GF Token" className="w-12 h-12" />
                      <div>
                        <CardTitle>Stake GF Token</CardTitle>
                        <CardDescription>Stake GF token for exclusive rewards on our app</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-muted-foreground">
                      Lock your GF tokens to earn exclusive rewards, including bonus tokens, NFT drops, and special access to premium features.
                    </p>
                    <div className="space-y-2">
                      <h4 className="font-semibold">Staking Benefits:</h4>
                      <ul className="space-y-2 text-sm">
                        <li className="flex items-start gap-2">
                          <div className="mt-0.5 text-primary">•</div>
                          <div>Earn up to 15% APY on staked tokens</div>
                        </li>
                        <li className="flex items-start gap-2">
                          <div className="mt-0.5 text-primary">•</div>
                          <div>Exclusive NFT lootbox rewards</div>
                        </li>
                        <li className="flex items-start gap-2">
                          <div className="mt-0.5 text-primary">•</div>
                          <div>Early access to new features and content</div>
                        </li>
                        <li className="flex items-start gap-2">
                          <div className="mt-0.5 text-primary">•</div>
                          <div>Voting rights on platform decisions</div>
                        </li>
                      </ul>
                    </div>
                    <Button className="w-full" data-testid="button-stake-tokens">
                      <Wallet className="w-4 h-4 mr-2" />
                      Start Staking
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="nfts" className="space-y-6">
                <Card data-testid="card-nfts-collectibles">
                  <CardHeader>
                    <div className="flex items-center gap-4">
                      <Image className="w-12 h-12 text-primary" />
                      <div>
                        <CardTitle>NFTs & Collectibles</CardTitle>
                        <CardDescription>Your digital collectibles and rewards</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <Image className="w-16 h-16 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-semibold mb-2" data-testid="heading-no-nfts">
                        No NFTs Yet
                      </h3>
                      <p className="text-sm text-muted-foreground mb-6 max-w-md" data-testid="text-no-nfts-description">
                        You haven't received any NFTs or collectibles yet. Browse the store to purchase NFT avatars or earn lootbox rewards through staking and platform activities.
                      </p>
                      <Link href="/store">
                        <Button data-testid="button-browse-store">
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
        )}
      </div>
    </div>
  );
}
