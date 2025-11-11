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
                onClick={wallet ? loginToWallet : createWallet} 
                disabled={isLoading}
                className="w-auto px-6 text-black font-semibold"
                style={{ backgroundColor: '#fbbf24', color: '#000' }}
                data-testid={wallet ? "button-access-wallet" : "button-create-wallet"}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {wallet ? "Loading..." : "Creating Wallet..."}
                  </>
                ) : (
                  <>
                    {wallet ? (
                      <>
                        <LogIn className="w-4 h-4 mr-2" />
                        Access Wallet
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
      </div>
    </div>
  );
}
