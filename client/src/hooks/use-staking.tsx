import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useWallet } from './use-wallet';
import { useToast } from './use-toast';
import { createPublicClient, http, parseUnits, formatUnits, type Address } from 'viem';
import { GF_STAKING_ADDRESS, GF_STAKING_ABI, GF_TOKEN_ADDRESS, GF_TOKEN_ABI } from '../../../shared/contracts';
import { SKALE_RPC_URL } from '../../../config/web3';
import { skaleNebulaTestnet } from '../lib/sequence-config';

interface StakingInfo {
  stakedAmount: string;
  earnedRewards: string;
  totalStaked: string;
  rewardRate: string;
}

interface StakePosition {
  id: string;
  amount: number;
  apy: number;
  startDate: string;
  endDate: string;
  earned: number;
  status: 'active' | 'completed' | 'pending';
}

const publicClient = createPublicClient({
  chain: skaleNebulaTestnet,
  transport: http(SKALE_RPC_URL),
});

export function useStaking() {
  const { walletAddress, isReady } = useWallet();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isStaking, setIsStaking] = useState(false);
  const [isUnstaking, setIsUnstaking] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);

  const { data: stakingInfo, isLoading: isLoadingStakingInfo, refetch: refetchStakingInfo } = useQuery<StakingInfo>({
    queryKey: ['/api/staking/info', walletAddress],
    enabled: isReady && !!walletAddress,
    refetchInterval: 30000,
    queryFn: async () => {
      if (!walletAddress) {
        return { stakedAmount: '0', earnedRewards: '0', totalStaked: '0', rewardRate: '0' };
      }

      try {
        const [stakedAmount, earnedRewards, totalStaked, rewardRate] = await Promise.all([
          publicClient.readContract({
            address: GF_STAKING_ADDRESS as Address,
            abi: GF_STAKING_ABI,
            functionName: 'stakeOf',
            args: [walletAddress as Address],
          }),
          publicClient.readContract({
            address: GF_STAKING_ADDRESS as Address,
            abi: GF_STAKING_ABI,
            functionName: 'earned',
            args: [walletAddress as Address],
          }),
          publicClient.readContract({
            address: GF_STAKING_ADDRESS as Address,
            abi: GF_STAKING_ABI,
            functionName: 'totalStaked',
          }),
          publicClient.readContract({
            address: GF_STAKING_ADDRESS as Address,
            abi: GF_STAKING_ABI,
            functionName: 'rewardRate',
          }),
        ]);

        return {
          stakedAmount: formatUnits(stakedAmount as bigint, 18),
          earnedRewards: formatUnits(earnedRewards as bigint, 18),
          totalStaked: formatUnits(totalStaked as bigint, 18),
          rewardRate: formatUnits(rewardRate as bigint, 18),
        };
      } catch (error) {
        console.error('Error fetching staking info:', error);
        return { stakedAmount: '0', earnedRewards: '0', totalStaked: '0', rewardRate: '0' };
      }
    },
  });

  const stake = useCallback(async (amount: number): Promise<boolean> => {
    if (!walletAddress || !isReady) {
      toast({
        title: 'Wallet not connected',
        description: 'Please connect your wallet first',
        variant: 'destructive',
      });
      return false;
    }

    setIsStaking(true);
    try {
      const response = await fetch('/api/staking/stake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ amount, walletAddress }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to stake GFT');
      }

      const result = await response.json();
      
      toast({
        title: 'Stake successful!',
        description: `Successfully staked ${amount} GFT`,
      });

      await refetchStakingInfo();
      queryClient.invalidateQueries({ queryKey: ['/api/token/balance'] });
      
      return true;
    } catch (error: any) {
      console.error('Staking error:', error);
      toast({
        title: 'Staking failed',
        description: error.message || 'Failed to stake GFT. Please try again.',
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsStaking(false);
    }
  }, [walletAddress, isReady, toast, refetchStakingInfo, queryClient]);

  const unstake = useCallback(async (amount: number): Promise<boolean> => {
    if (!walletAddress || !isReady) {
      toast({
        title: 'Wallet not connected',
        description: 'Please connect your wallet first',
        variant: 'destructive',
      });
      return false;
    }

    setIsUnstaking(true);
    try {
      const response = await fetch('/api/staking/unstake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ amount, walletAddress }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to unstake GFT');
      }

      toast({
        title: 'Unstake successful!',
        description: `Successfully unstaked ${amount} GFT`,
      });

      await refetchStakingInfo();
      queryClient.invalidateQueries({ queryKey: ['/api/token/balance'] });
      
      return true;
    } catch (error: any) {
      console.error('Unstaking error:', error);
      toast({
        title: 'Unstaking failed',
        description: error.message || 'Failed to unstake GFT. Please try again.',
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsUnstaking(false);
    }
  }, [walletAddress, isReady, toast, refetchStakingInfo, queryClient]);

  const claimRewards = useCallback(async (): Promise<boolean> => {
    if (!walletAddress || !isReady) {
      toast({
        title: 'Wallet not connected',
        description: 'Please connect your wallet first',
        variant: 'destructive',
      });
      return false;
    }

    setIsClaiming(true);
    try {
      const response = await fetch('/api/staking/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ walletAddress }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to claim rewards');
      }

      const result = await response.json();
      
      toast({
        title: 'Rewards claimed!',
        description: `Successfully claimed ${result.amount || 'your'} GFT rewards`,
      });

      await refetchStakingInfo();
      queryClient.invalidateQueries({ queryKey: ['/api/token/balance'] });
      
      return true;
    } catch (error: any) {
      console.error('Claim rewards error:', error);
      toast({
        title: 'Claim failed',
        description: error.message || 'Failed to claim rewards. Please try again.',
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsClaiming(false);
    }
  }, [walletAddress, isReady, toast, refetchStakingInfo, queryClient]);

  const stakedAmount = parseFloat(stakingInfo?.stakedAmount || '0');
  const earnedRewards = parseFloat(stakingInfo?.earnedRewards || '0');
  const totalStakedInContract = parseFloat(stakingInfo?.totalStaked || '0');
  const estimatedApy = 12.5;

  return {
    stakedAmount,
    earnedRewards,
    totalStakedInContract,
    estimatedApy,
    isLoadingStakingInfo,
    isStaking,
    isUnstaking,
    isClaiming,
    stake,
    unstake,
    claimRewards,
    refetchStakingInfo,
  };
}
