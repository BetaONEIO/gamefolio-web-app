import { Link } from "wouter";
import { ArrowLeft, Wallet, Copy, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useWallet, skaleTestnet } from "@/hooks/use-wallet";
import { useAuth } from "@/hooks/use-auth";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { SKALE_EXPLORER_BASE_URL, GF_TOKEN_ADDRESS, STAKING_ADDRESS } from "../../../config/web3";

export default function DebugWalletPage() {
  const { user } = useAuth();
  const { walletAddress, isReady, chainId, isConnecting, isEmbeddedWallet, connect, disconnect } = useWallet();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const handleCopyAddress = async () => {
    if (walletAddress) {
      await navigator.clipboard.writeText(walletAddress);
      setCopied(true);
      toast({
        title: "Copied",
        description: "Wallet address copied to clipboard",
      });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const networkName = skaleTestnet.name;
  const nativeCurrency = skaleTestnet.nativeCurrency.symbol;

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-4 mb-6">
          <Link href="/">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">Debug: Wallet</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              Wallet Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3">
              <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                <span className="text-sm text-muted-foreground">Status</span>
                <span className="flex items-center gap-2">
                  {isReady ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                      <span className="text-primary font-medium">Ready</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-4 w-4 text-yellow-500" />
                      <span className="text-yellow-500 font-medium">Not Connected</span>
                    </>
                  )}
                </span>
              </div>

              <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                <span className="text-sm text-muted-foreground">Wallet Address</span>
                <div className="flex items-center gap-2">
                  {walletAddress ? (
                    <>
                      <code className="text-xs bg-background px-2 py-1 rounded">
                        {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                      </code>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={handleCopyAddress}
                      >
                        {copied ? (
                          <CheckCircle2 className="h-3 w-3 text-primary" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </Button>
                    </>
                  ) : (
                    <span className="text-muted-foreground text-sm">None</span>
                  )}
                </div>
              </div>

              <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                <span className="text-sm text-muted-foreground">Chain ID</span>
                <code className="text-sm bg-background px-2 py-1 rounded">{chainId}</code>
              </div>

              <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                <span className="text-sm text-muted-foreground">Network</span>
                <span className="text-sm font-medium">{networkName}</span>
              </div>

              <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                <span className="text-sm text-muted-foreground">Native Currency</span>
                <span className="text-sm font-medium">{nativeCurrency}</span>
              </div>

              <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                <span className="text-sm text-muted-foreground">Wallet Type</span>
                <span className="text-sm font-medium">
                  {isEmbeddedWallet ? 'Embedded (Sequence)' : walletAddress ? 'External' : 'None'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Contract Addresses</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-col gap-1 p-3 bg-muted rounded-lg">
              <span className="text-sm text-muted-foreground">GF Token</span>
              <code className="text-xs break-all">{GF_TOKEN_ADDRESS}</code>
            </div>
            <div className="flex flex-col gap-1 p-3 bg-muted rounded-lg">
              <span className="text-sm text-muted-foreground">Staking Contract</span>
              <code className="text-xs break-all">{STAKING_ADDRESS}</code>
            </div>
            <div className="flex flex-col gap-1 p-3 bg-muted rounded-lg">
              <span className="text-sm text-muted-foreground">Explorer URL</span>
              <a
                href={SKALE_EXPLORER_BASE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary underline break-all"
              >
                {SKALE_EXPLORER_BASE_URL}
              </a>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>User Context</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
              <span className="text-sm text-muted-foreground">User ID</span>
              <span className="text-sm font-medium">{user?.id ?? 'Not logged in'}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
              <span className="text-sm text-muted-foreground">Username</span>
              <span className="text-sm font-medium">{user?.username ?? 'N/A'}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
              <span className="text-sm text-muted-foreground">DB Wallet Address</span>
              <code className="text-xs">
                {user?.walletAddress
                  ? `${user.walletAddress.slice(0, 6)}...${user.walletAddress.slice(-4)}`
                  : 'None'}
              </code>
            </div>
          </CardContent>
        </Card>

        {!isReady ? (
          <Button
            onClick={connect}
            disabled={isConnecting || !user}
            className="w-full"
          >
            {isConnecting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <Wallet className="mr-2 h-4 w-4" />
                Connect Wallet
              </>
            )}
          </Button>
        ) : (
          <Button
            variant="outline"
            onClick={disconnect}
            className="w-full"
          >
            <Wallet className="mr-2 h-4 w-4" />
            Disconnect Wallet
          </Button>
        )}
      </div>
    </div>
  );
}
