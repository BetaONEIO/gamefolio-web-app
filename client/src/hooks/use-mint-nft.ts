import { useState, useEffect, useCallback } from 'react';
import { useWalletClient } from 'wagmi';
import { parseUnits, type Address } from 'viem';
import { useWallet } from './use-wallet';
import { useToast } from './use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import {
  GF_TOKEN_ADDRESS,
  GF_TOKEN_ABI,
  NFT_CONTRACT_ADDRESS,
  NFT_ABI,
  MINT_CONFIG,
} from '../../../shared/contracts';

export type AllowanceState = 'checking' | 'none' | 'approving' | 'approved';
export type MintTxState = 'idle' | 'sending' | 'confirming' | 'confirmed' | 'error';

interface MintResult {
  txHash: string;
  tokenIds: number[];
}

export function useMintNFT(fallbackAddress?: string | null) {
  const { walletAddress, publicClient, isReady } = useWallet();
  const { data: walletClient } = useWalletClient();
  const { toast } = useToast();

  const effectiveAddress = walletAddress || (fallbackAddress as `0x${string}` | null) || null;
  const useServerSigning = !!effectiveAddress && !walletClient;

  const [allowanceState, setAllowanceState] = useState<AllowanceState>('checking');
  const [mintTxState, setMintTxState] = useState<MintTxState>('idle');
  const [mintResult, setMintResult] = useState<MintResult | null>(null);
  const [onChainBalance, setOnChainBalance] = useState<bigint>(BigInt(0));
  const [balanceLoaded, setBalanceLoaded] = useState(false);
  const [totalMinted, setTotalMinted] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [needsWalletRegeneration, setNeedsWalletRegeneration] = useState(false);

  const [onChainPricePerMint, setOnChainPricePerMint] = useState<number>(MINT_CONFIG.pricePerMint);
  const [onChainMaxPerTx, setOnChainMaxPerTx] = useState<number>(MINT_CONFIG.maxPerTx);
  const [onChainMaxSupply, setOnChainMaxSupply] = useState<number>(MINT_CONFIG.maxSupply);
  const [onChainPriceRaw, setOnChainPriceRaw] = useState<bigint | null>(null);

  const fetchContractConfig = useCallback(async () => {
    setOnChainPricePerMint(MINT_CONFIG.pricePerMint);
    setOnChainMaxPerTx(MINT_CONFIG.maxPerTx);
    setOnChainPriceRaw(parseUnits(String(MINT_CONFIG.pricePerMint), 18));
    if (publicClient) {
      try {
        const maxSupply = await publicClient.readContract({
          address: NFT_CONTRACT_ADDRESS as Address,
          abi: NFT_ABI,
          functionName: 'MAX_SUPPLY',
        }) as bigint;
        setOnChainMaxSupply(Number(maxSupply));
      } catch {
        setOnChainMaxSupply(MINT_CONFIG.maxSupply);
      }
    } else {
      setOnChainMaxSupply(MINT_CONFIG.maxSupply);
    }
  }, [publicClient]);

  const checkAllowance = useCallback(async () => {
    setAllowanceState('approved');
  }, []);

  const fetchOnChainData = useCallback(async () => {
    if (!publicClient) return;
    try {
      const balance = effectiveAddress
        ? (await publicClient.readContract({
            address: GF_TOKEN_ADDRESS as Address,
            abi: GF_TOKEN_ABI,
            functionName: 'balanceOf',
            args: [effectiveAddress as Address],
          })) as bigint
        : BigInt(0);

      setOnChainBalance(balance);
      setBalanceLoaded(true);

      try {
        if (effectiveAddress) {
          const nftBalanceTotal = await publicClient.readContract({
            address: NFT_CONTRACT_ADDRESS as Address,
            abi: NFT_ABI,
            functionName: 'balanceOf',
            args: [effectiveAddress as Address],
          });
          void nftBalanceTotal;
        }
      } catch {}

      setTotalMinted(0);
    } catch (err) {
      console.error('Error fetching on-chain data:', err);
    }
  }, [effectiveAddress, publicClient]);

  useEffect(() => {
    if (publicClient) {
      fetchContractConfig();
    }
  }, [publicClient, fetchContractConfig]);

  useEffect(() => {
    if (useServerSigning && effectiveAddress) {
      setAllowanceState('approved');
      if (publicClient) fetchOnChainData();
    } else if (effectiveAddress && publicClient) {
      checkAllowance();
      fetchOnChainData();
    } else {
      setAllowanceState('none');
    }
  }, [effectiveAddress, publicClient, checkAllowance, fetchOnChainData, useServerSigning]);

  useEffect(() => {
    if (useServerSigning) {
      fetch('/api/mint/wallet-status', { credentials: 'include' })
        .then(res => res.json())
        .then(data => {
          if (data.hasWallet && !data.hasSigningKey) {
            setNeedsWalletRegeneration(true);
          }
        })
        .catch(() => {});
    }
  }, [useServerSigning]);

  const handleServerError = useCallback((data: any) => {
    if (data?.code === 'MISSING_PRIVATE_KEY') {
      setNeedsWalletRegeneration(true);
      return true;
    }
    return false;
  }, []);

  const serverApprove = useCallback(async (): Promise<boolean> => {
    try {
      setAllowanceState('approving');
      setError(null);

      const res = await apiRequest('POST', '/api/mint/approve');
      const data = await res.json();

      if (data.success) {
        setAllowanceState('approved');
        toast({
          title: 'Allowance Approved',
          description: 'GFT spending has been enabled for the mint contract',
        });
        return true;
      } else {
        throw new Error(data.error || 'Approval failed');
      }
    } catch (err: any) {
      console.error('Server approval error:', err);
      setAllowanceState('none');

      let errData: any = null;
      try {
        const errText = err.message || '';
        if (errText.includes('{')) {
          errData = JSON.parse(errText.substring(errText.indexOf('{')));
        }
      } catch {}

      if (errData && handleServerError(errData)) {
        toast({
          title: 'Wallet Key Missing',
          description: 'Your wallet needs to be regenerated to enable signing.',
          variant: 'destructive',
        });
        return false;
      }

      const message = err?.message || 'Approval transaction failed';
      setError(message);
      toast({
        title: 'Approval Failed',
        description: message,
        variant: 'destructive',
      });
      return false;
    }
  }, [toast, handleServerError]);

  const serverMint = useCallback(async (quantity: number): Promise<MintResult | null> => {
    try {
      setMintTxState('sending');
      setError(null);

      const res = await apiRequest('POST', '/api/mint/mint', { quantity });
      const data = await res.json();

      if (data.success) {
        const result: MintResult = { txHash: data.txHash, tokenIds: data.tokenIds || [] };
        setMintResult(result);
        setMintTxState('confirmed');
        await fetchOnChainData();
        await queryClient.invalidateQueries({ queryKey: ['/api/user'] });
        return result;
      } else {
        throw new Error(data.error || 'Mint failed');
      }
    } catch (err: any) {
      console.error('Server mint error:', err);
      setMintTxState('error');

      let errData: any = null;
      try {
        const errText = err.message || '';
        if (errText.includes('{')) {
          errData = JSON.parse(errText.substring(errText.indexOf('{')));
        }
      } catch {}

      if (errData && handleServerError(errData)) {
        toast({
          title: 'Wallet Key Missing',
          description: 'Your wallet needs to be regenerated to enable signing.',
          variant: 'destructive',
        });
        return null;
      }

      const rawMessage = err?.message || '';
      const lowerMsg = rawMessage.toLowerCase();
      let message: string;
      if (lowerMsg.includes('insufficient funds') || lowerMsg.includes('transfer amount exceeds balance') || lowerMsg.includes('insufficient balance') || lowerMsg.includes('exceeds balance')) {
        message = `You don't have enough GFT tokens to mint. Please top up your wallet and try again.`;
      } else if (lowerMsg.includes('user rejected') || lowerMsg.includes('user denied')) {
        message = 'Transaction was cancelled.';
      } else {
        message = 'Mint transaction failed. Please try again.';
      }
      setError(message);
      toast({
        title: 'Mint Failed',
        description: message,
        variant: 'destructive',
      });
      return null;
    }
  }, [toast, fetchOnChainData, handleServerError]);

  const approve = useCallback(async () => {
    return serverApprove();
  }, [serverApprove]);

  const mint = useCallback(async (quantity: number): Promise<MintResult | null> => {
    return serverMint(quantity);
  }, [serverMint]);

  const regenerateWallet = useCallback(async (): Promise<boolean> => {
    try {
      const res = await apiRequest('POST', '/api/mint/regenerate-wallet');
      const data = await res.json();

      if (data.success) {
        setNeedsWalletRegeneration(false);
        toast({
          title: 'Wallet Regenerated',
          description: `New wallet address: ${data.address.slice(0, 10)}...`,
        });
        await queryClient.invalidateQueries({ queryKey: ['/api/user'] });
        return true;
      }
      return false;
    } catch (err: any) {
      console.error('Wallet regeneration error:', err);
      toast({
        title: 'Regeneration Failed',
        description: err?.message || 'Failed to regenerate wallet',
        variant: 'destructive',
      });
      return false;
    }
  }, [toast]);

  const reset = useCallback(() => {
    setMintTxState('idle');
    setMintResult(null);
    setError(null);
  }, []);

  return {
    allowanceState,
    mintTxState,
    mintResult,
    onChainBalance,
    balanceLoaded,
    totalMinted,
    error,
    approve,
    mint,
    reset,
    checkAllowance,
    pricePerMint: onChainPricePerMint,
    maxPerTx: onChainMaxPerTx,
    maxSupply: onChainMaxSupply,
    useServerSigning,
    needsWalletRegeneration,
    regenerateWallet,
  };
}
