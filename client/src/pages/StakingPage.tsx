import { useState, useEffect } from "react";
import { Link } from "wouter";
import { ArrowLeft, Coins, TrendingUp, Wallet, Loader2, AlertCircle, Server } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useWalletClient } from "wagmi";
import { useWallet } from "@/hooks/use-wallet";
import { parseUnits, formatUnits, type Address } from "viem";
import { GF_STAKING_ADDRESS, GF_STAKING_ABI, GF_TOKEN_ADDRESS, GF_TOKEN_ABI, SKALE_NEBULA_TESTNET } from "@shared/contracts";
import { apiRequest } from "@/lib/queryClient";
import gfTokenLogo from "@assets/Gamefolio token_1762633908726.png";

const GF_DECIMALS = 18;
const SKALE_CHAIN_ID = SKALE_NEBULA_TESTNET.id;

export default function StakingPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { walletAddress, publicClient, isReady, chainId, connect: connectWallet } = useWallet();
  const { data: walletClient } = useWalletClient();

  const effectiveAddress = walletAddress || (user?.walletAddress as Address | undefined) || null;
  const useServerSigning = !!effectiveAddress && !walletClient;
  const isConnected = isReady || !!effectiveAddress;
  const wrongNetwork = isReady && !useServerSigning && chainId !== SKALE_CHAIN_ID;
  const canTransact = isConnected && !wrongNetwork;

  const [stakeAmount, setStakeAmount] = useState("");
  const [unstakeAmount, setUnstakeAmount] = useState("");
  const [isStaking, setIsStaking] = useState(false);
  const [isUnstaking, setIsUnstaking] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [tokenBalance, setTokenBalance] = useState<string>("0");
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);

  const { data: stakePosition, isLoading: isLoadingPosition, refetch: refetchPosition } = useQuery({
    queryKey: ["/api/staking/position", effectiveAddress],
    queryFn: async () => {
      if (!effectiveAddress) return { staked: "0", earned: "0" };
      const response = await fetch(`/api/staking/position/${effectiveAddress}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to fetch stake position");
      }
      return response.json();
    },
    enabled: !!effectiveAddress,
    refetchInterval: 30000,
  });

  const { data: stakingStats } = useQuery({
    queryKey: ["/api/staking/stats"],
    queryFn: async () => {
      const response = await fetch("/api/staking/stats");
      if (!response.ok) return { totalStaked: "0", rewardRate: "0" };
      return response.json();
    },
    refetchInterval: 60000,
  });

  useEffect(() => {
    async function fetchBalance() {
      if (!effectiveAddress) return;
      setIsLoadingBalance(true);
      try {
        if (useServerSigning) {
          // Use in-app GFT balance for server-side wallet (treasury-backed staking)
          setTokenBalance(String(user?.gfTokenBalance || 0));
        } else if (publicClient) {
          const balance = await publicClient.readContract({
            address: GF_TOKEN_ADDRESS,
            abi: GF_TOKEN_ABI,
            functionName: "balanceOf",
            args: [effectiveAddress],
          }) as bigint;
          setTokenBalance(formatUnits(balance, GF_DECIMALS));
        }
      } catch (error) {
        console.error("Failed to fetch token balance:", error);
      } finally {
        setIsLoadingBalance(false);
      }
    }
    fetchBalance();
  }, [effectiveAddress, publicClient, useServerSigning, user?.gfTokenBalance]);

  const handleMaxClick = () => setStakeAmount(tokenBalance);
  const handleMaxUnstake = () => setUnstakeAmount(parseFloat(stakePosition?.staked || "0").toString());

  const handleError = (error: any, action: string) => {
    let title = `${action} failed`;
    let description = error.message || "An unexpected error occurred";

    if (error.message?.includes("user rejected") || error.message?.includes("User rejected")) {
      title = "Transaction cancelled";
      description = "You rejected the transaction in your wallet";
    } else if (error.message?.includes("insufficient funds") || error.message?.includes("Insufficient")) {
      title = "Insufficient balance";
      description = error.message?.includes("sFUEL")
        ? "You need sFUEL for gas fees"
        : "You don't have enough GF tokens on-chain";
    } else if (error.message?.includes("chain") || error.message?.includes("network")) {
      title = "Wrong network";
      description = "Please switch to SKALE Nebula Testnet";
    }

    toast({ title, description, variant: "destructive" });
  };

  const handleStake = async () => {
    if (!effectiveAddress) {
      connectWallet();
      return;
    }

    const amount = parseFloat(stakeAmount);
    if (!amount || amount <= 0) {
      toast({ title: "Invalid amount", description: "Please enter a valid amount to stake", variant: "destructive" });
      return;
    }

    if (amount > parseFloat(tokenBalance)) {
      toast({ title: "Insufficient balance", description: `You only have ${parseFloat(tokenBalance).toLocaleString()} GF tokens available`, variant: "destructive" });
      return;
    }

    setIsStaking(true);
    try {
      if (useServerSigning) {
        toast({ title: "Staking tokens...", description: "Processing via Sequence wallet" });
        const result = await apiRequest("POST", "/api/staking/stake", { amount: stakeAmount });
        const data = await result.json();
        if (!result.ok) throw new Error(data.error || "Stake failed");
        toast({ title: "Staked successfully!", description: `You staked ${amount.toLocaleString()} GF tokens` });
      } else {
        if (!walletClient || !publicClient) {
          connectWallet();
          return;
        }

        const amountRaw = parseUnits(stakeAmount, GF_DECIMALS);

        const allowance = await publicClient.readContract({
          address: GF_TOKEN_ADDRESS,
          abi: GF_TOKEN_ABI,
          functionName: "allowance",
          args: [effectiveAddress, GF_STAKING_ADDRESS],
        }) as bigint;

        if (allowance < amountRaw) {
          toast({ title: "Approving tokens...", description: "Please confirm in your Sequence wallet" });
          const approveHash = await walletClient.writeContract({
            address: GF_TOKEN_ADDRESS,
            abi: GF_TOKEN_ABI,
            functionName: "approve",
            args: [GF_STAKING_ADDRESS, amountRaw],
          });
          await publicClient.waitForTransactionReceipt({ hash: approveHash, confirmations: 1 });
        }

        toast({ title: "Staking tokens...", description: "Please confirm in your Sequence wallet" });
        const stakeHash = await walletClient.writeContract({
          address: GF_STAKING_ADDRESS,
          abi: GF_STAKING_ABI,
          functionName: "stake",
          args: [amountRaw],
        });
        await publicClient.waitForTransactionReceipt({ hash: stakeHash, confirmations: 1 });
        toast({ title: "Staked successfully!", description: `You staked ${amount.toLocaleString()} GF tokens` });

        const newBalance = await publicClient.readContract({
          address: GF_TOKEN_ADDRESS,
          abi: GF_TOKEN_ABI,
          functionName: "balanceOf",
          args: [effectiveAddress],
        }) as bigint;
        setTokenBalance(formatUnits(newBalance, GF_DECIMALS));
      }

      setStakeAmount("");
      refetchPosition();
    } catch (error: any) {
      handleError(error, "Stake");
    } finally {
      setIsStaking(false);
    }
  };

  const handleUnstake = async () => {
    if (!effectiveAddress) {
      connectWallet();
      return;
    }

    const amount = parseFloat(unstakeAmount);
    if (!amount || amount <= 0) {
      toast({ title: "Invalid amount", description: "Please enter a valid amount to unstake", variant: "destructive" });
      return;
    }

    const staked = parseFloat(stakePosition?.staked || "0");
    if (amount > staked) {
      toast({ title: "Insufficient staked amount", description: `You only have ${staked.toLocaleString()} GF staked`, variant: "destructive" });
      return;
    }

    setIsUnstaking(true);
    try {
      if (useServerSigning) {
        toast({ title: "Unstaking tokens...", description: "Processing via Sequence wallet" });
        const result = await apiRequest("POST", "/api/staking/unstake", { amount: unstakeAmount });
        const data = await result.json();
        if (!result.ok) throw new Error(data.error || "Unstake failed");
        toast({ title: "Unstaked successfully!", description: `You unstaked ${amount.toLocaleString()} GF tokens` });
      } else {
        if (!walletClient || !publicClient) {
          connectWallet();
          return;
        }

        toast({ title: "Unstaking tokens...", description: "Please confirm in your Sequence wallet" });
        const txHash = await walletClient.writeContract({
          address: GF_STAKING_ADDRESS,
          abi: GF_STAKING_ABI,
          functionName: "unstake",
          args: [parseUnits(unstakeAmount, GF_DECIMALS)],
        });
        await publicClient.waitForTransactionReceipt({ hash: txHash, confirmations: 1 });
        toast({ title: "Unstaked successfully!", description: `You unstaked ${amount.toLocaleString()} GF tokens` });

        const newBalance = await publicClient.readContract({
          address: GF_TOKEN_ADDRESS,
          abi: GF_TOKEN_ABI,
          functionName: "balanceOf",
          args: [effectiveAddress],
        }) as bigint;
        setTokenBalance(formatUnits(newBalance, GF_DECIMALS));
      }

      setUnstakeAmount("");
      refetchPosition();
    } catch (error: any) {
      handleError(error, "Unstake");
    } finally {
      setIsUnstaking(false);
    }
  };

  const handleClaim = async () => {
    if (!effectiveAddress) {
      connectWallet();
      return;
    }

    const earned = parseFloat(stakePosition?.earned || "0");
    if (earned <= 0) {
      toast({ title: "No rewards", description: "You don't have any rewards to claim", variant: "destructive" });
      return;
    }

    setIsClaiming(true);
    try {
      if (useServerSigning) {
        toast({ title: "Claiming rewards...", description: "Processing via Sequence wallet" });
        const result = await apiRequest("POST", "/api/staking/claim", {});
        const data = await result.json();
        if (!result.ok) throw new Error(data.error || "Claim failed");
        toast({ title: "Rewards claimed!", description: `You claimed ${earned.toLocaleString()} GF tokens` });
      } else {
        if (!walletClient || !publicClient) {
          connectWallet();
          return;
        }

        toast({ title: "Claiming rewards...", description: "Please confirm in your Sequence wallet" });
        const claimHash = await walletClient.writeContract({
          address: GF_STAKING_ADDRESS,
          abi: GF_STAKING_ABI,
          functionName: "claim",
          args: [],
        });
        await publicClient.waitForTransactionReceipt({ hash: claimHash, confirmations: 1 });
        toast({ title: "Rewards claimed!", description: `You claimed ${earned.toLocaleString()} GF tokens` });

        const newBalance = await publicClient.readContract({
          address: GF_TOKEN_ADDRESS,
          abi: GF_TOKEN_ABI,
          functionName: "balanceOf",
          args: [effectiveAddress],
        }) as bigint;
        setTokenBalance(formatUnits(newBalance, GF_DECIMALS));
      }

      refetchPosition();
    } catch (error: any) {
      handleError(error, "Claim");
    } finally {
      setIsClaiming(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-4 md:px-6 md:py-6 max-w-4xl">
          <Link href="/">
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </Link>
          <Card className="text-center py-12">
            <CardContent>
              <Coins className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-2xl font-bold mb-2">Sign in to Stake</h2>
              <p className="text-muted-foreground mb-6">Connect your account to start staking GF tokens and earn rewards</p>
              <Link href="/auth">
                <Button>Sign In</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-4 md:px-6 md:py-6 max-w-4xl">
        <Link href="/wallet">
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Wallet
          </Button>
        </Link>

        <div className="flex items-center gap-4 mb-8">
          <img src={gfTokenLogo} alt="GF Token" className="w-12 h-12" />
          <div>
            <h1 className="text-3xl font-bold">GF Token Staking</h1>
            <p className="text-muted-foreground">Stake your GF tokens and earn rewards</p>
          </div>
        </div>

        {useServerSigning && (
          <Card className="mb-6 border-primary/30 bg-primary/5">
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <Server className="w-5 h-5 text-primary" />
                <div>
                  <p className="font-medium text-sm">Using Sequence Wallet</p>
                  <p className="text-xs text-muted-foreground">Transactions are signed via your Sequence embedded wallet</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {!isConnected && (
          <Card className="mb-6">
            <CardContent className="py-8 text-center">
              <Wallet className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">Connect Your Wallet</h3>
              <p className="text-muted-foreground mb-4">Connect your Sequence wallet to view and manage your stakes</p>
              <Button onClick={connectWallet}>
                Connect Wallet
              </Button>
            </CardContent>
          </Card>
        )}

        {wrongNetwork && (
          <Card className="mb-6 border-orange-500">
            <CardContent className="py-6">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-6 h-6 text-orange-500" />
                <div>
                  <h3 className="font-semibold text-orange-500">Wrong Network</h3>
                  <p className="text-sm text-muted-foreground">Please switch to SKALE Nebula Testnet to stake</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Your Staked Amount</CardDescription>
              <CardTitle className="text-3xl flex items-center gap-2">
                {isLoadingPosition ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  <>
                    {parseFloat(stakePosition?.staked || "0").toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    <span className="text-lg text-muted-foreground">GF</span>
                  </>
                )}
              </CardTitle>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Earned Rewards</CardDescription>
              <CardTitle className="text-3xl flex items-center gap-2 text-primary">
                {isLoadingPosition ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  <>
                    <TrendingUp className="w-6 h-6" />
                    {parseFloat(stakePosition?.earned || "0").toLocaleString(undefined, { maximumFractionDigits: 4 })}
                    <span className="text-lg text-muted-foreground">GF</span>
                  </>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Button
                onClick={handleClaim}
                disabled={isClaiming || !canTransact || parseFloat(stakePosition?.earned || "0") <= 0}
                className="w-full"
                variant="secondary"
              >
                {isClaiming ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Claiming...
                  </>
                ) : (
                  "Claim Rewards"
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Stake GF Tokens</CardTitle>
            <CardDescription>
              Available on-chain balance: {isLoadingBalance ? "..." : parseFloat(tokenBalance).toLocaleString(undefined, { maximumFractionDigits: 2 })} GF
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Input
                type="number"
                placeholder="Enter amount to stake"
                value={stakeAmount}
                onChange={(e) => setStakeAmount(e.target.value)}
                className="pr-16"
              />
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 px-2 text-xs"
                onClick={handleMaxClick}
              >
                MAX
              </Button>
            </div>

            <Button
              onClick={handleStake}
              disabled={isStaking || !canTransact || !stakeAmount || parseFloat(stakeAmount) <= 0}
              className="w-full"
              size="lg"
            >
              {isStaking ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Staking...
                </>
              ) : !isConnected ? (
                <>
                  <Wallet className="w-4 h-4 mr-2" />
                  Connect Wallet to Stake
                </>
              ) : (
                <>
                  <Coins className="w-4 h-4 mr-2" />
                  Stake GF Tokens
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {parseFloat(stakePosition?.staked || "0") > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Unstake GF Tokens</CardTitle>
              <CardDescription>
                Currently staked: {parseFloat(stakePosition?.staked || "0").toLocaleString(undefined, { maximumFractionDigits: 2 })} GF
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Input
                  type="number"
                  placeholder="Enter amount to unstake"
                  value={unstakeAmount}
                  onChange={(e) => setUnstakeAmount(e.target.value)}
                  className="pr-16"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 px-2 text-xs"
                  onClick={handleMaxUnstake}
                >
                  MAX
                </Button>
              </div>

              <Button
                onClick={handleUnstake}
                disabled={isUnstaking || !canTransact || !unstakeAmount || parseFloat(unstakeAmount) <= 0}
                className="w-full"
                variant="outline"
                size="lg"
              >
                {isUnstaking ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Unstaking...
                  </>
                ) : (
                  "Unstake GF Tokens"
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {stakingStats && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Staking Stats</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Total Staked</p>
                  <p className="font-semibold">{parseFloat(stakingStats.totalStaked || "0").toLocaleString()} GF</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Reward Rate</p>
                  <p className="font-semibold">{(parseFloat(stakingStats.rewardRate || "0") * 86400).toLocaleString(undefined, { maximumFractionDigits: 2 })} GF/day</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Estimated APY</p>
                  <p className="font-semibold text-green-500">12.5%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
