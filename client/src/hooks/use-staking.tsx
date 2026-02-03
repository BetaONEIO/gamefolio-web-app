import { useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useWallet } from './use-wallet';
import { useToast } from './use-toast';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseUnits, type Address } from 'viem';
import { GF_STAKING_ADDRESS, GF_STAKING_ABI, GF_TOKEN_ADDRESS, GF_TOKEN_ABI } from '../../../shared/contracts';

interface StakingInfo {
  staked: string;
  earned: string;
}

interface StakingStats {
  totalStaked: string;
  rewardRate: string;
}

export function useStaking() {
  const { isReady, publicClient } = useWallet();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { address } = useAccount();
  const [pendingTxHash, setPendingTxHash] = useState<`0x${string}` | undefined>();

  const { writeContractAsync, isPending: isWritePending } = useWriteContract();

  const { isLoading: isWaitingForTx } = useWaitForTransactionReceipt({
    hash: pendingTxHash,
    confirmations: 1,
  });

  const { data: stakingPosition, isLoading: isLoadingPosition, refetch: refetchPosition } = useQuery<StakingInfo>({
    queryKey: ['/api/staking/position', address],
    enabled: isReady && !!address,
    refetchInterval: 30000,
    queryFn: async () => {
      if (!address) {
        return { staked: '0', earned: '0' };
      }

      try {
        const response = await fetch(`/api/staking/position/${address}`, {
          credentials: 'include',
        });
        
        if (!response.ok) {
          return { staked: '0', earned: '0' };
        }
        
        return await response.json();
      } catch (error) {
        console.error('Error fetching staking position:', error);
        return { staked: '0', earned: '0' };
      }
    },
  });

  const { data: stakingStats } = useQuery<StakingStats>({
    queryKey: ['/api/staking/stats'],
    refetchInterval: 60000,
    queryFn: async () => {
      try {
        const response = await fetch('/api/staking/stats', {
          credentials: 'include',
        });
        
        if (!response.ok) {
          return { totalStaked: '0', rewardRate: '0' };
        }
        
        return await response.json();
      } catch (error) {
        console.error('Error fetching staking stats:', error);
        return { totalStaked: '0', rewardRate: '0' };
      }
    },
  });

  const checkAndApprove = useCallback(async (amount: bigint): Promise<boolean> => {
    if (!address || !publicClient) return false;

    try {
      const allowance = await publicClient.readContract({
        address: GF_TOKEN_ADDRESS as Address,
        abi: GF_TOKEN_ABI,
        functionName: 'allowance',
        args: [address, GF_STAKING_ADDRESS as Address],
      }) as bigint;

      if (allowance < amount) {
        toast({
          title: 'Approving GFT...',
          description: 'Please confirm the approval transaction',
        });

        const approveHash = await writeContractAsync({
          address: GF_TOKEN_ADDRESS as Address,
          abi: GF_TOKEN_ABI,
          functionName: 'approve',
          args: [GF_STAKING_ADDRESS as Address, amount],
        });

        setPendingTxHash(approveHash);
        
        await publicClient.waitForTransactionReceipt({ hash: approveHash, confirmations: 1 });
        
        toast({
          title: 'Approval confirmed',
          description: 'GFT spending approved',
        });
      }

      return true;
    } catch (error: any) {
      console.error('Approval error:', error);
      if (error.message?.includes('User rejected')) {
        toast({
          title: 'Approval rejected',
          description: 'You rejected the approval transaction',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Approval failed',
          description: error.message || 'Failed to approve GFT spending',
          variant: 'destructive',
        });
      }
      return false;
    }
  }, [address, publicClient, writeContractAsync, toast]);

  const stake = useCallback(async (amount: number): Promise<boolean> => {
    if (!address || !isReady) {
      toast({
        title: 'Wallet not connected',
        description: 'Please connect your wallet first',
        variant: 'destructive',
      });
      return false;
    }

    try {
      const amountRaw = parseUnits(amount.toString(), 18);

      const approved = await checkAndApprove(amountRaw);
      if (!approved) return false;

      toast({
        title: 'Staking GFT...',
        description: 'Please confirm the staking transaction',
      });

      const txHash = await writeContractAsync({
        address: GF_STAKING_ADDRESS as Address,
        abi: GF_STAKING_ABI,
        functionName: 'stake',
        args: [amountRaw],
      });

      setPendingTxHash(txHash);

      if (publicClient) {
        await publicClient.waitForTransactionReceipt({ hash: txHash, confirmations: 1 });
      }

      toast({
        title: 'Stake successful!',
        description: `Successfully staked ${amount} GFT`,
      });

      await refetchPosition();
      queryClient.invalidateQueries({ queryKey: ['/api/token/balance'] });

      return true;
    } catch (error: any) {
      console.error('Staking error:', error);
      if (error.message?.includes('User rejected')) {
        toast({
          title: 'Transaction rejected',
          description: 'You rejected the staking transaction',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Staking failed',
          description: error.message || 'Failed to stake GFT. Please try again.',
          variant: 'destructive',
        });
      }
      return false;
    } finally {
      setPendingTxHash(undefined);
    }
  }, [address, isReady, publicClient, writeContractAsync, checkAndApprove, toast, refetchPosition, queryClient]);

  const unstake = useCallback(async (amount: number): Promise<boolean> => {
    if (!address || !isReady) {
      toast({
        title: 'Wallet not connected',
        description: 'Please connect your wallet first',
        variant: 'destructive',
      });
      return false;
    }

    try {
      const amountRaw = parseUnits(amount.toString(), 18);

      toast({
        title: 'Unstaking GFT...',
        description: 'Please confirm the unstaking transaction',
      });

      const txHash = await writeContractAsync({
        address: GF_STAKING_ADDRESS as Address,
        abi: GF_STAKING_ABI,
        functionName: 'unstake',
        args: [amountRaw],
      });

      setPendingTxHash(txHash);

      if (publicClient) {
        await publicClient.waitForTransactionReceipt({ hash: txHash, confirmations: 1 });
      }

      toast({
        title: 'Unstake successful!',
        description: `Successfully unstaked ${amount} GFT`,
      });

      await refetchPosition();
      queryClient.invalidateQueries({ queryKey: ['/api/token/balance'] });

      return true;
    } catch (error: any) {
      console.error('Unstaking error:', error);
      if (error.message?.includes('User rejected')) {
        toast({
          title: 'Transaction rejected',
          description: 'You rejected the unstaking transaction',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Unstaking failed',
          description: error.message || 'Failed to unstake GFT. Please try again.',
          variant: 'destructive',
        });
      }
      return false;
    } finally {
      setPendingTxHash(undefined);
    }
  }, [address, isReady, publicClient, writeContractAsync, toast, refetchPosition, queryClient]);

  const claimRewards = useCallback(async (): Promise<boolean> => {
    if (!address || !isReady) {
      toast({
        title: 'Wallet not connected',
        description: 'Please connect your wallet first',
        variant: 'destructive',
      });
      return false;
    }

    try {
      toast({
        title: 'Claiming rewards...',
        description: 'Please confirm the claim transaction',
      });

      const txHash = await writeContractAsync({
        address: GF_STAKING_ADDRESS as Address,
        abi: GF_STAKING_ABI,
        functionName: 'claim',
        args: [],
      });

      setPendingTxHash(txHash);

      if (publicClient) {
        await publicClient.waitForTransactionReceipt({ hash: txHash, confirmations: 1 });
      }

      toast({
        title: 'Rewards claimed!',
        description: 'Successfully claimed your GFT rewards',
      });

      await refetchPosition();
      queryClient.invalidateQueries({ queryKey: ['/api/token/balance'] });

      return true;
    } catch (error: any) {
      console.error('Claim rewards error:', error);
      if (error.message?.includes('User rejected')) {
        toast({
          title: 'Transaction rejected',
          description: 'You rejected the claim transaction',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Claim failed',
          description: error.message || 'Failed to claim rewards. Please try again.',
          variant: 'destructive',
        });
      }
      return false;
    } finally {
      setPendingTxHash(undefined);
    }
  }, [address, isReady, publicClient, writeContractAsync, toast, refetchPosition, queryClient]);

  const stakedAmount = parseFloat(stakingPosition?.staked || '0');
  const earnedRewards = parseFloat(stakingPosition?.earned || '0');
  const totalStakedInContract = parseFloat(stakingStats?.totalStaked || '0');
  const estimatedApy = 12.5;

  const isTransacting = isWritePending || isWaitingForTx;

  return {
    stakedAmount,
    earnedRewards,
    totalStakedInContract,
    estimatedApy,
    isLoadingPosition,
    isStaking: isTransacting,
    isUnstaking: isTransacting,
    isClaiming: isTransacting,
    stake,
    unstake,
    claimRewards,
    refetchPosition,
  };
}
