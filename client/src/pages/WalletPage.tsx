import { Link } from "wouter";
import { ArrowLeft, Wallet, Copy, ExternalLink, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useCrossmint } from "@/hooks/use-crossmint";
import { useAuth } from "@/hooks/use-auth";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export default function WalletPage() {
  const { user } = useAuth();
  const { wallet, isLoading, createWallet } = useCrossmint();
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
          <Card data-testid="card-create-wallet">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="w-5 h-5 text-primary" />
                Create Your Wallet
              </CardTitle>
              <CardDescription>
                Get started with blockchain-based gaming assets
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Create a secure blockchain wallet to own your gaming clips as NFTs, 
                trade digital assets, and participate in the Web3 gaming economy.
              </p>
              <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                <p className="text-sm font-medium">✨ What you get:</p>
                <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                  <li>• Your own blockchain wallet address</li>
                  <li>• Secure storage for digital assets</li>
                  <li>• Ability to mint and trade NFTs</li>
                  <li>• Multi-chain support (Polygon, Ethereum, Base)</li>
                </ul>
              </div>
              <Button 
                onClick={createWallet} 
                disabled={isLoading}
                className="w-full"
                data-testid="button-create-wallet"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating Wallet...
                  </>
                ) : (
                  <>
                    <Wallet className="w-4 h-4 mr-2" />
                    Create Wallet
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
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

                <div className="pt-2">
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

            <Card data-testid="card-features">
              <CardHeader>
                <CardTitle>Coming Soon</CardTitle>
                <CardDescription>
                  Exciting features in development
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 text-sm">
                  <li className="flex items-start gap-2">
                    <div className="mt-0.5 text-primary">•</div>
                    <div>
                      <strong>NFT Minting:</strong> Turn your best gaming clips into unique NFTs
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="mt-0.5 text-primary">•</div>
                    <div>
                      <strong>Asset Trading:</strong> Buy and sell gaming content on the marketplace
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="mt-0.5 text-primary">•</div>
                    <div>
                      <strong>Rewards Program:</strong> Earn cryptocurrency for your gaming achievements
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="mt-0.5 text-primary">•</div>
                    <div>
                      <strong>Multi-chain Support:</strong> Access assets across different blockchains
                    </div>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
