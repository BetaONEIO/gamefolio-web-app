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

export default function WalletPage() {
  const { user } = useAuth();
  const { wallet, isLoading, createWallet, loginToWallet } = useCrossmint();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

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
    const chain = wallet.chain || 'polygon';
    
    const explorers: Record<string, string> = {
      'polygon': 'https://polygonscan.com',
      'ethereum': 'https://etherscan.io',
      'base': 'https://basescan.org',
      'polygon-amoy': 'https://amoy.polygonscan.com',
      'base-sepolia': 'https://sepolia.basescan.org',
      'ethereum-sepolia': 'https://sepolia.etherscan.io',
    };

    const baseUrl = explorers[chain] || explorers['polygon'];
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
        <div className="mb-8">
          <Link href="/">
            <Button variant="ghost" className="mb-4" data-testid="button-back">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </Link>
          <h1 className="text-4xl font-bold text-primary mb-2" data-testid="text-page-title">
            Your Blockchain Wallet
          </h1>
          <p className="text-muted-foreground" data-testid="text-page-description">
            Manage your gaming assets on the blockchain
          </p>
        </div>

        {!wallet ? (
          <div 
            className="relative rounded-2xl overflow-hidden min-h-[600px] flex items-center justify-center p-8"
            style={{
              background: 'linear-gradient(135deg, #0a4d3c 0%, #0d2d2d 50%, #0a1a1a 100%)'
            }}
            data-testid="card-create-wallet"
          >
            {/* Circular ring patterns */}
            <div className="absolute inset-0 overflow-hidden">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200px] h-[200px] rounded-full border border-primary/20"></div>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full border border-primary/15"></div>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full border border-primary/10"></div>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full border border-primary/5"></div>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] rounded-full border border-primary/5"></div>
            </div>

            {/* Content */}
            <div className="relative z-10 max-w-2xl mx-auto text-center space-y-8">
              {/* Heading */}
              <div className="space-y-4">
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight">
                  Welcome to your<br />
                  Gamefolio Wallet
                </h1>
                <p className="text-white/90 text-base md:text-lg">
                  Store Gamefolio Tokens (GF) and NFT avatar profile pictures!
                </p>
              </div>

              {/* Bullet Points */}
              <div className="space-y-3 text-white/90 text-sm md:text-base max-w-md mx-auto">
                <div className="flex items-center justify-center gap-2">
                  <span>•</span>
                  <span>Secure storage for digital assets</span>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <span>•</span>
                  <span>Your own blockchain wallet address</span>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <span>•</span>
                  <span>Ability to mint and trade NFTs</span>
                </div>
              </div>

              {/* Button */}
              <div className="pt-4">
                <Button 
                  onClick={createWallet} 
                  disabled={isLoading}
                  className="px-16 py-6 text-base md:text-lg font-semibold bg-primary hover:bg-primary/90 text-black rounded-xl shadow-lg hover:shadow-xl transition-all"
                  data-testid="button-create-wallet"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Creating Wallet...
                    </>
                  ) : (
                    "Get Started"
                  )}
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <Tabs defaultValue="wallet" className="space-y-6" data-testid="tabs-wallet">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="wallet" data-testid="tab-wallet-info">
                <Wallet className="w-4 h-4 mr-2" />
                Wallet Info
              </TabsTrigger>
              <TabsTrigger value="nfts" data-testid="tab-owned-nfts">
                <Image className="w-4 h-4 mr-2" />
                Owned NFTs
              </TabsTrigger>
            </TabsList>

            <TabsContent value="wallet" className="space-y-6">
              <Card data-testid="card-wallet-info">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Wallet className="w-5 h-5 text-primary" />
                    Wallet Information
                  </CardTitle>
                  <CardDescription>
                    Your blockchain wallet details
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Wallet Address
                    </label>
                    <div className="flex items-center gap-2 mt-1">
                      <code className="flex-1 text-sm bg-muted px-3 py-2 rounded-md font-mono break-all" data-testid="text-wallet-address">
                        {wallet.address}
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
                  </div>

                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Blockchain Network
                    </label>
                    <div className="mt-1">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-primary/10 text-primary" data-testid="text-wallet-chain">
                        {wallet.chain.charAt(0).toUpperCase() + wallet.chain.slice(1)}
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      GF Token Balance
                    </label>
                    <div className="flex items-center gap-2 mt-1">
                      <img src={gfTokenLogo} alt="GF Token" className="w-6 h-6" />
                      <span className="text-2xl font-bold" data-testid="text-gf-balance">
                        {(user?.gfTokenBalance || 0).toLocaleString()} GF
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1" data-testid="text-gf-balance-usd">
                      ≈ ${((user?.gfTokenBalance || 0) * 0.05).toFixed(2)} USD
                    </p>
                  </div>

                  <div className="pt-2 space-y-2">
                    <Button
                      variant="default"
                      className="w-full"
                      onClick={loginToWallet}
                      data-testid="button-login-wallet"
                    >
                      <LogIn className="w-4 h-4 mr-2" />
                      Login to Crossmint Dashboard
                    </Button>
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
                  </div>
                </CardContent>
              </Card>

              <Card data-testid="card-wallet-management">
                <CardHeader>
                  <CardTitle>Wallet Management</CardTitle>
                  <CardDescription>
                    Access full wallet features in Crossmint
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Click "Login to Crossmint Dashboard" to access your wallet's full capabilities, including:
                  </p>
                  <ul className="space-y-3 text-sm">
                    <li className="flex items-start gap-2">
                      <div className="mt-0.5 text-primary">•</div>
                      <div>
                        <strong>Transaction Management:</strong> Send and receive cryptocurrency
                      </div>
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="mt-0.5 text-primary">•</div>
                      <div>
                        <strong>NFT Viewing:</strong> View and manage your NFT collection
                      </div>
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="mt-0.5 text-primary">•</div>
                      <div>
                        <strong>Transaction History:</strong> Track all your wallet activity
                      </div>
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="mt-0.5 text-primary">•</div>
                      <div>
                        <strong>Multi-chain Assets:</strong> Manage assets across different blockchains
                      </div>
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="nfts" className="space-y-6">
              <Card data-testid="card-owned-nfts">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Image className="w-5 h-5 text-primary" />
                    Your NFT Collection
                  </CardTitle>
                  <CardDescription>
                    NFTs you own on the blockchain
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Image className="w-16 h-16 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2" data-testid="heading-no-nfts">
                      No NFTs Yet
                    </h3>
                    <p className="text-sm text-muted-foreground mb-6 max-w-md" data-testid="text-no-nfts-description">
                      You haven't purchased any NFTs yet. Visit the store to browse and purchase NFT avatars with your GF tokens.
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
        )}
      </div>
    </div>
  );
}
