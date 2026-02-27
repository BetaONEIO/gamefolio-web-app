import { useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useWallet } from './use-wallet';
import { useAuth } from './use-auth';
import { useToast } from './use-toast';
import { useWalletClient } from 'wagmi';
import { parseUnits, type Address } from 'viem';
import { GF_STAKING_ADDRESS, GF_STAKING_ABI, GF_TOKEN_ADDRESS, GF_TOKEN_ABI } from '../../../shared/contracts';
import { apiRequest } from '@/lib/queryClient';
import type { UserStakingHistory } from '@shared/schema';

interface StakingInfo {
  staked: string;
  earned: string;
  stakedAt?: string;
  totalEarned?: string;
}

interface StakingStats {
  totalStaked: string;
  rewardRate: string;
}

export function useStaking() {
  const { walletAddress, isReady, publicClient } = useWallet();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: walletClient } = useWalletClient();
  const [pendingTxHash, setPendingTxHash] = useState<`0x${string}` | undefined>();
  const [isTransacting, setIsTransacting] = useState(false);

  const effectiveAddress = walletAddress || (user?.walletAddress as Address | undefined) || null;
  const useServerSigning = !!effectiveAddress && !walletClient;

  const { data: stakingPosition, isLoading: isLoadingPosition, refetch: refetchPosition } = useQuery<StakingInfo>({
    queryKey: ['/api/staking/position', effectiveAddress],
    enabled: !!effectiveAddress,
    refetchInterval: 30000,
    queryFn: async () => {
      if (!effectiveAddress) return { staked: '0', earned: '0' };
      try {
        const response = await fetch(`/api/staking/position/${effectiveAddress}`, { credentials: 'include' });
        if (!response.ok) return { staked: '0', earned: '0' };
        return await response.json();
      } catch {
        return { staked: '0', earned: '0' };
      }
    },
  });

  const { data: stakingStats } = useQuery<StakingStats>({
    queryKey: ['/api/staking/stats'],
    refetchInterval: 60000,
    queryFn: async () => {
      try {
        const response = await fetch('/api/staking/stats', { credentials: 'include' });
        if (!response.ok) return { totalStaked: '0', rewardRate: '0' };
        return await response.json();
      } catch {
        return { totalStaked: '0', rewardRate: '0' };
      }
    },
  });

  const { data: stakeHistory = [], refetch: refetchHistory } = useQuery<UserStakingHistory[]>({
    queryKey: ['/api/staking/history'],
    enabled: !!user,
    queryFn: async () => {
      try {
        const response = await fetch('/api/staking/history', { credentials: 'include' });
        if (!response.ok) return [];
        return await response.json();
      } catch {
        return [];
      }
    },
  });

  const checkAndApprove = useCallback(async (amount: bigint): Promise<boolean> => {
    if (!effectiveAddress || !publicClient || !walletClient) return false;

    try {
      const allowance = await publicClient.readContract({
        address: GF_TOKEN_ADDRESS as Address,
        abi: GF_TOKEN_ABI,
        functionName: 'allowance',
        args: [effectiveAddress, GF_STAKING_ADDRESS as Address],
      }) as bigint;

      if (allowance < amount) {
        toast({ title: 'Approving GFT...', description: 'Please confirm in your Sequence wallet' });
        const approveHash = await walletClient.writeContract({
          address: GF_TOKEN_ADDRESS as Address,
          abi: GF_TOKEN_ABI,
          functionName: 'approve',
          args: [GF_STAKING_ADDRESS as Address, amount],
        });
        setPendingTxHash(approveHash);
        await publicClient.waitForTransactionReceipt({ hash: approveHash, confirmations: 1 });
        toast({ title: 'Approval confirmed', description: 'GFT spending approved' });
      }
      return true;
    } catch (error: any) {
      if (error.message?.includes('User rejected')) {
        toast({ title: 'Approval rejected', description: 'You rejected the approval transaction', variant: 'destructive' });
      } else {
        toast({ title: 'Approval failed', description: error.message || 'Failed to approve GFT', variant: 'destructive' });
      }
      return false;
    }
  }, [effectiveAddress, publicClient, walletClient, toast]);

  const invalidateAll = useCallback(async () => {
    await refetchPosition();
    await refetchHistory();
    queryClient.invalidateQueries({ queryKey: ['/api/token/balance'] });
    queryClient.invalidateQueries({ queryKey: ['/api/user/me'] });
  }, [refetchPosition, refetchHistory, queryClient]);

  const stake = useCallback(async (amount: number): Promise<boolean> => {
    if (!effectiveAddress) {
      toast({ title: 'Wallet not connected', description: 'Please connect your wallet first', variant: 'destructive' });
      return false;
    }

    setIsTransacting(true);
    try {
      if (useServerSigning) {
        toast({ title: 'Staking GFT...', description: 'Processing your stake' });
        const res = await apiRequest('POST', '/api/staking/stake', { amount: amount.toString() });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Stake failed');
        toast({ title: 'Stake successful!', description: `Successfully staked ${amount} GFT` });
      } else {
        if (!walletClient || !publicClient) {
          toast({ title: 'Wallet not connected', description: 'Please connect your wallet first', variant: 'destructive' });
          return false;
        }
        const amountRaw = parseUnits(amount.toString(), 18);
        const approved = await checkAndApprove(amountRaw);
        if (!approved) return false;

        toast({ title: 'Staking GFT...', description: 'Please confirm in your Sequence wallet' });
        const txHash = await walletClient.writeContract({
          address: GF_STAKING_ADDRESS as Address,
          abi: GF_STAKING_ABI,
          functionName: 'stake',
          args: [amountRaw],
        });
        setPendingTxHash(txHash);
        await publicClient.waitForTransactionReceipt({ hash: txHash, confirmations: 1 });
        toast({ title: 'Stake successful!', description: `Successfully staked ${amount} GFT` });
      }

      await invalidateAll();
      return true;
    } catch (error: any) {
      if (error.message?.includes('User rejected')) {
        toast({ title: 'Transaction rejected', description: 'You rejected the staking transaction', variant: 'destructive' });
      } else {
        toast({ title: 'Staking failed', description: error.message || 'Failed to stake GFT', variant: 'destructive' });
      }
      return false;
    } finally {
      setIsTransacting(false);
      setPendingTxHash(undefined);
    }
  }, [effectiveAddress, useServerSigning, walletClient, publicClient, checkAndApprove, toast, invalidateAll]);

  const unstake = useCallback(async (amount: number): Promise<boolean> => {
    if (!effectiveAddress) {
      toast({ title: 'Wallet not connected', description: 'Please connect your wallet first', variant: 'destructive' });
      return false;
    }

    setIsTransacting(true);
    try {
      if (useServerSigning) {
        toast({ title: 'Unstaking GFT...', description: 'Processing your unstake' });
        const res = await apiRequest('POST', '/api/staking/unstake', { amount: amount.toString() });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Unstake failed');
        toast({ title: 'Unstake successful!', description: `Successfully unstaked ${amount} GFT` });
      } else {
        if (!walletClient || !publicClient) {
          toast({ title: 'Wallet not connected', description: 'Please connect your wallet first', variant: 'destructive' });
          return false;
        }
        const amountRaw = parseUnits(amount.toString(), 18);
        toast({ title: 'Unstaking GFT...', description: 'Please confirm in your Sequence wallet' });
        const txHash = await walletClient.writeContract({
          address: GF_STAKING_ADDRESS as Address,
          abi: GF_STAKING_ABI,
          functionName: 'unstake',
          args: [amountRaw],
        });
        setPendingTxHash(txHash);
        await publicClient.waitForTransactionReceipt({ hash: txHash, confirmations: 1 });
        toast({ title: 'Unstake successful!', description: `Successfully unstaked ${amount} GFT` });
      }

      await invalidateAll();
      return true;
    } catch (error: any) {
      if (error.message?.includes('User rejected')) {
        toast({ title: 'Transaction rejected', description: 'You rejected the unstaking transaction', variant: 'destructive' });
      } else {
        toast({ title: 'Unstaking failed', description: error.message || 'Failed to unstake GFT', variant: 'destructive' });
      }
      return false;
    } finally {
      setIsTransacting(false);
      setPendingTxHash(undefined);
    }
  }, [effectiveAddress, useServerSigning, walletClient, publicClient, toast, invalidateAll]);

  const claimRewards = useCallback(async (): Promise<boolean> => {
    if (!effectiveAddress) {
      toast({ title: 'Wallet not connected', description: 'Please connect your wallet first', variant: 'destructive' });
      return false;
    }

    setIsTransacting(true);
    try {
      if (useServerSigning) {
        toast({ title: 'Claiming rewards...', description: 'Processing your claim' });
        const res = await apiRequest('POST', '/api/staking/claim', {});
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Claim failed');
        toast({ title: 'Rewards claimed!', description: `${parseFloat(data.rewards || '0').toFixed(4)} GFT added to your balance` });
      } else {
        if (!walletClient || !publicClient) {
          toast({ title: 'Wallet not connected', description: 'Please connect your wallet first', variant: 'destructive' });
          return false;
        }
        toast({ title: 'Claiming rewards...', description: 'Please confirm in your Sequence wallet' });
        const txHash = await walletClient.writeContract({
          address: GF_STAKING_ADDRESS as Address,
          abi: GF_STAKING_ABI,
          functionName: 'claim',
          args: [],
        });
        setPendingTxHash(txHash);
        await publicClient.waitForTransactionReceipt({ hash: txHash, confirmations: 1 });
        toast({ title: 'Rewards claimed!', description: 'Successfully claimed your GFT rewards' });
      }

      await invalidateAll();
      return true;
    } catch (error: any) {
      if (error.message?.includes('User rejected')) {
        toast({ title: 'Transaction rejected', description: 'You rejected the claim transaction', variant: 'destructive' });
      } else {
        toast({ title: 'Claim failed', description: error.message || 'Failed to claim rewards', variant: 'destructive' });
      }
      return false;
    } finally {
      setIsTransacting(false);
      setPendingTxHash(undefined);
    }
  }, [effectiveAddress, useServerSigning, walletClient, publicClient, toast, invalidateAll]);

  const stakedAmount = parseFloat(stakingPosition?.staked || '0');
  const earnedRewards = parseFloat(stakingPosition?.earned || '0');
  const totalStakedInContract = parseFloat(stakingStats?.totalStaked || '0');
  const estimatedApy = 12.5;

  return {
    stakedAmount,
    earnedRewards,
    totalStakedInContract,
    estimatedApy,
    isLoadingPosition,
    isStaking: isTransacting,
    isUnstaking: isTransacting,
    isClaiming: isTransacting,
    effectiveAddress,
    useServerSigning,
    stakeHistory,
    stake,
    unstake,
    claimRewards,
    refetchPosition,
  };
}
