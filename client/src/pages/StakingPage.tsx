import { useState, useEffect } from "react";
import { Link } from "wouter";
import { ArrowLeft, Coins, TrendingUp, Wallet, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAccount, useWalletClient, usePublicClient } from "wagmi";
import { useOpenConnectModal } from "@0xsequence/connect";
import { parseUnits, formatUnits, type Address } from "viem";
import { GF_STAKING_ADDRESS, GF_STAKING_ABI, GF_TOKEN_ADDRESS, GF_TOKEN_ABI, SKALE_NEBULA_TESTNET } from "@shared/contracts";
import gfTokenLogo from "@assets/Gamefolio token_1762633908726.png";

const GF_DECIMALS = 18;
const SKALE_CHAIN_ID = SKALE_NEBULA_TESTNET.id;

export default function StakingPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { address, isConnected, chainId } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const { setOpenConnectModal } = useOpenConnectModal();

  const [stakeAmount, setStakeAmount] = useState("");
  const [isStaking, setIsStaking] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [tokenBalance, setTokenBalance] = useState<string>("0");
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);

  const { data: stakePosition, isLoading: isLoadingPosition, refetch: refetchPosition } = useQuery({
    queryKey: ["/api/staking/position", address],
    queryFn: async () => {
      if (!address) return { staked: "0", earned: "0" };
      const response = await fetch(`/api/staking/position/${address}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to fetch stake position");
      }
      return response.json();
    },
    enabled: !!address,
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
      if (!address || !publicClient) return;
      setIsLoadingBalance(true);
      try {
        const balance = await publicClient.readContract({
          address: GF_TOKEN_ADDRESS,
          abi: GF_TOKEN_ABI,
          functionName: "balanceOf",
          args: [address],
        }) as bigint;
        setTokenBalance(formatUnits(balance, GF_DECIMALS));
      } catch (error) {
        console.error("Failed to fetch token balance:", error);
      } finally {
        setIsLoadingBalance(false);
      }
    }
    fetchBalance();
  }, [address, publicClient]);

  const handleMaxClick = () => {
    setStakeAmount(tokenBalance);
  };

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
        : "You don't have enough GF tokens";
    } else if (error.message?.includes("chain") || error.message?.includes("network")) {
      title = "Wrong network";
      description = "Please switch to SKALE Nebula Testnet";
    } else if (error.message?.includes("CONTRACT_ERROR")) {
      title = "Contract not available";
      description = "The staking contract is not deployed yet";
    }

    toast({ title, description, variant: "destructive" });
  };

  const handleStake = async () => {
    if (!walletClient || !address || !publicClient) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your wallet first",
        variant: "destructive",
      });
      return;
    }

    if (chainId !== SKALE_CHAIN_ID) {
      toast({
        title: "Wrong network",
        description: "Please switch to SKALE Nebula Testnet",
        variant: "destructive",
      });
      return;
    }

    const amount = parseFloat(stakeAmount);
    if (!amount || amount <= 0) {
      toast({
        title: "Invalid amount",
        description: "Please enter a valid amount to stake",
        variant: "destructive",
      });
      return;
    }

    if (amount > parseFloat(tokenBalance)) {
      toast({
        title: "Insufficient balance",
        description: `You only have ${parseFloat(tokenBalance).toLocaleString()} GF tokens`,
        variant: "destructive",
      });
      return;
    }

    setIsStaking(true);
    try {
      const amountRaw = parseUnits(stakeAmount, GF_DECIMALS);

      const allowance = await publicClient.readContract({
        address: GF_TOKEN_ADDRESS,
        abi: GF_TOKEN_ABI,
        functionName: "allowance",
        args: [address, GF_STAKING_ADDRESS],
      }) as bigint;

      if (allowance < amountRaw) {
        toast({ title: "Approving tokens...", description: "Please confirm the approval in your wallet" });
        
        const approveHash = await walletClient.writeContract({
          address: GF_TOKEN_ADDRESS,
          abi: GF_TOKEN_ABI,
          functionName: "approve",
          args: [GF_STAKING_ADDRESS, amountRaw],
        });
        
        await publicClient.waitForTransactionReceipt({ hash: approveHash, confirmations: 1 });
      }

      toast({ title: "Staking tokens...", description: "Please confirm the stake transaction" });

      const stakeHash = await walletClient.writeContract({
        address: GF_STAKING_ADDRESS,
        abi: GF_STAKING_ABI,
        functionName: "stake",
        args: [amountRaw],
      });

      await publicClient.waitForTransactionReceipt({ hash: stakeHash, confirmations: 1 });

      toast({
        title: "Staked successfully!",
        description: `You staked ${parseFloat(stakeAmount).toLocaleString()} GF tokens`,
      });

      setStakeAmount("");
      refetchPosition();
      
      const newBalance = await publicClient.readContract({
        address: GF_TOKEN_ADDRESS,
        abi: GF_TOKEN_ABI,
        functionName: "balanceOf",
        args: [address],
      }) as bigint;
      setTokenBalance(formatUnits(newBalance, GF_DECIMALS));

    } catch (error: any) {
      handleError(error, "Stake");
    } finally {
      setIsStaking(false);
    }
  };

  const handleClaim = async () => {
    if (!walletClient || !address || !publicClient) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your wallet first",
        variant: "destructive",
      });
      return;
    }

    if (chainId !== SKALE_CHAIN_ID) {
      toast({
        title: "Wrong network",
        description: "Please switch to SKALE Nebula Testnet",
        variant: "destructive",
      });
      return;
    }

    const earned = parseFloat(stakePosition?.earned || "0");
    if (earned <= 0) {
      toast({
        title: "No rewards",
        description: "You don't have any rewards to claim",
        variant: "destructive",
      });
      return;
    }

    setIsClaiming(true);
    try {
      toast({ title: "Claiming rewards...", description: "Please confirm the transaction" });

      const claimHash = await walletClient.writeContract({
        address: GF_STAKING_ADDRESS,
        abi: GF_STAKING_ABI,
        functionName: "claim",
        args: [],
      });

      await publicClient.waitForTransactionReceipt({ hash: claimHash, confirmations: 1 });

      toast({
        title: "Rewards claimed!",
        description: `You claimed ${earned.toLocaleString()} GF tokens`,
      });

      refetchPosition();
      
      const newBalance = await publicClient.readContract({
        address: GF_TOKEN_ADDRESS,
        abi: GF_TOKEN_ABI,
        functionName: "balanceOf",
        args: [address],
      }) as bigint;
      setTokenBalance(formatUnits(newBalance, GF_DECIMALS));

    } catch (error: any) {
      handleError(error, "Claim");
    } finally {
      setIsClaiming(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-0 py-0 max-w-4xl">
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
              <p className="text-muted-foreground mb-6">
                Connect your account to start staking GF tokens and earn rewards
              </p>
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
      <div className="container mx-auto px-0 py-0 max-w-4xl">
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

        {!isConnected ? (
          <Card className="mb-6">
            <CardContent className="py-8 text-center">
              <Wallet className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">Connect Your Wallet</h3>
              <p className="text-muted-foreground mb-4">
                Connect your wallet to view and manage your stakes
              </p>
              <Button onClick={() => setOpenConnectModal(true)}>
                Connect Wallet
              </Button>
            </CardContent>
          </Card>
        ) : chainId !== SKALE_CHAIN_ID ? (
          <Card className="mb-6 border-orange-500">
            <CardContent className="py-6">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-6 h-6 text-orange-500" />
                <div>
                  <h3 className="font-semibold text-orange-500">Wrong Network</h3>
                  <p className="text-sm text-muted-foreground">
                    Please switch to SKALE Nebula Testnet to stake
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : null}

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
                disabled={isClaiming || !isConnected || chainId !== SKALE_CHAIN_ID || parseFloat(stakePosition?.earned || "0") <= 0}
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

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Stake GF Tokens</CardTitle>
            <CardDescription>
              Available balance: {isLoadingBalance ? "..." : parseFloat(tokenBalance).toLocaleString(undefined, { maximumFractionDigits: 2 })} GF
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
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
            </div>

            <Button
              onClick={handleStake}
              disabled={isStaking || !isConnected || chainId !== SKALE_CHAIN_ID || !stakeAmount || parseFloat(stakeAmount) <= 0}
              className="w-full"
              size="lg"
            >
              {isStaking ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Staking...
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

        {stakingStats && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Staking Stats</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Total Staked</p>
                  <p className="font-semibold">
                    {parseFloat(stakingStats.totalStaked || "0").toLocaleString()} GF
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Reward Rate</p>
                  <p className="font-semibold">
                    {parseFloat(stakingStats.rewardRate || "0").toLocaleString()} GF/day
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
