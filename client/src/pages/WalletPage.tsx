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
      <div className="min-h-screen" style={{ backgroundColor: '#1a2332' }}>
        <div className="container mx-auto px-4 py-8 max-w-6xl">
          <div className="mb-8">
            <Link href="/">
              <Button variant="ghost" className="mb-4 text-white hover:bg-white/10" data-testid="button-back">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Home
              </Button>
            </Link>
            <h1 className="text-4xl font-bold text-white mb-2" data-testid="text-page-title">Wallet</h1>
          </div>
          <Card style={{ backgroundColor: '#2d3748', borderColor: '#4a5568' }}>
            <CardContent className="pt-6">
              <p className="text-center" style={{ color: '#9ca3af' }}>
                Please log in to access your wallet
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#1a2332' }}>
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-8">
          <Link href="/">
            <Button variant="ghost" className="mb-4 text-white hover:bg-white/10" data-testid="button-back">
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
                <h2 className="text-3xl font-bold mb-3 text-white">
                  Welcome to your<br />Gamefolio Wallet
                </h2>
                <p className="text-lg" style={{ color: '#9ca3af' }}>
                  Store Gamefolio Tokens (GF) and NFT avatar profile pictures!
                </p>
              </div>

              {/* List */}
              <ul className="space-y-3 text-white">
                <li className="flex items-start gap-3">
                  <div className="mt-1" style={{ color: '#10b981' }}>✓</div>
                  <span>Secure storage for digital assets</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="mt-1" style={{ color: '#10b981' }}>✓</div>
                  <span>Your own blockchain wallet address</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="mt-1" style={{ color: '#10b981' }}>✓</div>
                  <span>Ability to mint and trade NFTs</span>
                </li>
              </ul>

              {/* Button and Badge */}
              <div className="space-y-4">
                <Button 
                  onClick={wallet ? () => setShowWalletDetails(true) : createWallet} 
                  disabled={isLoading}
                  className="w-auto px-6 text-black font-semibold"
                  style={{ backgroundColor: '#fbbf24', color: '#000' }}
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
              className="mb-6 text-white hover:bg-white/10" 
              onClick={() => setShowWalletDetails(false)}
              data-testid="button-back-to-welcome"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Welcome
            </Button>
            
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
          </div>
        )}
      </div>
    </div>
  );
}
