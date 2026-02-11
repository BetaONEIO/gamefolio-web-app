import { useState, useEffect, useCallback } from 'react';
import { useWalletClient } from 'wagmi';
import { parseUnits, formatUnits, maxUint256, type Address, decodeEventLog } from 'viem';
import { useWallet } from './use-wallet';
import { useToast } from './use-toast';
import { apiRequest } from '@/lib/queryClient';
import {
  GF_TOKEN_ADDRESS,
  GF_TOKEN_ABI,
  NFT_CONTRACT_ADDRESS,
  NFT_ABI,
  MINT_SALE_ADDRESS,
  MINT_SALE_ABI,
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
  const [totalMinted, setTotalMinted] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [needsWalletRegeneration, setNeedsWalletRegeneration] = useState(false);

  const [onChainPricePerMint, setOnChainPricePerMint] = useState<number>(MINT_CONFIG.pricePerMint);
  const [onChainMaxPerTx, setOnChainMaxPerTx] = useState<number>(MINT_CONFIG.maxPerTx);
  const [onChainMaxSupply, setOnChainMaxSupply] = useState<number>(MINT_CONFIG.maxSupply);
  const [onChainPriceRaw, setOnChainPriceRaw] = useState<bigint | null>(null);

  const fetchContractConfig = useCallback(async () => {
    if (!publicClient) return;
    try {
      const [priceRaw, maxTx] = await Promise.all([
        publicClient.readContract({
          address: MINT_SALE_ADDRESS as Address,
          abi: MINT_SALE_ABI,
          functionName: 'pricePerMint',
        }) as Promise<bigint>,
        publicClient.readContract({
          address: MINT_SALE_ADDRESS as Address,
          abi: MINT_SALE_ABI,
          functionName: 'maxPerTx',
        }) as Promise<bigint>,
      ]);

      setOnChainPriceRaw(priceRaw);
      setOnChainPricePerMint(Number(formatUnits(priceRaw, 18)));
      setOnChainMaxPerTx(Number(maxTx));

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
    } catch (err) {
      console.error('Error fetching on-chain config:', err);
    }
  }, [publicClient]);

  const checkAllowance = useCallback(async () => {
    if (!effectiveAddress || !publicClient) {
      setAllowanceState('none');
      return;
    }
    try {
      setAllowanceState('checking');
      const allowance = await publicClient.readContract({
        address: GF_TOKEN_ADDRESS as Address,
        abi: GF_TOKEN_ABI,
        functionName: 'allowance',
        args: [effectiveAddress as Address, MINT_SALE_ADDRESS as Address],
      }) as bigint;

      const requiredAmount = onChainPriceRaw
        ? onChainPriceRaw * BigInt(onChainMaxPerTx)
        : parseUnits(String(onChainPricePerMint * onChainMaxPerTx), 18);
      setAllowanceState(allowance >= requiredAmount ? 'approved' : 'none');
    } catch (err) {
      console.error('Error checking allowance:', err);
      setAllowanceState('none');
    }
  }, [effectiveAddress, publicClient, onChainPriceRaw, onChainPricePerMint, onChainMaxPerTx]);

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

      try {
        const nftBalanceTotal = await publicClient.readContract({
          address: NFT_CONTRACT_ADDRESS as Address,
          abi: NFT_ABI,
          functionName: 'balanceOf',
          args: [MINT_SALE_ADDRESS as Address],
        });
        void nftBalanceTotal;
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
    if (effectiveAddress && publicClient) {
      checkAllowance();
      fetchOnChainData();
    } else {
      setAllowanceState('none');
    }
  }, [effectiveAddress, publicClient, checkAllowance, fetchOnChainData]);

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
        await checkAllowance();
        await fetchOnChainData();
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
  }, [toast, checkAllowance, fetchOnChainData, handleServerError]);

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

      const message = err?.message || 'Mint transaction failed';
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
    if (useServerSigning) {
      return serverApprove();
    }

    if (!walletClient || !walletAddress) {
      toast({
        title: 'Wallet not connected',
        description: 'Please connect your wallet first',
        variant: 'destructive',
      });
      return false;
    }

    try {
      setAllowanceState('approving');
      setError(null);

      const hash = await walletClient.writeContract({
        address: GF_TOKEN_ADDRESS as Address,
        abi: GF_TOKEN_ABI,
        functionName: 'approve',
        args: [MINT_SALE_ADDRESS as Address, maxUint256],
      });

      await publicClient.waitForTransactionReceipt({ hash });
      setAllowanceState('approved');
      toast({
        title: 'Allowance Approved',
        description: 'GFT spending has been enabled for the mint contract',
      });
      return true;
    } catch (err: any) {
      console.error('Approval error:', err);
      setAllowanceState('none');
      const message = err?.shortMessage || err?.message || 'Approval transaction failed';
      setError(message);
      toast({
        title: 'Approval Failed',
        description: message,
        variant: 'destructive',
      });
      return false;
    }
  }, [walletClient, walletAddress, publicClient, toast, useServerSigning, serverApprove]);

  const mint = useCallback(async (quantity: number): Promise<MintResult | null> => {
    if (useServerSigning) {
      return serverMint(quantity);
    }

    if (!walletClient || !walletAddress) {
      toast({
        title: 'Wallet not connected',
        description: 'Please connect your wallet first',
        variant: 'destructive',
      });
      return null;
    }

    if (quantity < 1 || quantity > onChainMaxPerTx) {
      toast({
        title: 'Invalid quantity',
        description: `You can mint between 1 and ${onChainMaxPerTx} NFTs per transaction`,
        variant: 'destructive',
      });
      return null;
    }

    try {
      setMintTxState('sending');
      setError(null);

      const hash = await walletClient.writeContract({
        address: MINT_SALE_ADDRESS as Address,
        abi: MINT_SALE_ABI,
        functionName: 'buy',
        args: [BigInt(quantity)],
      });

      setMintTxState('confirming');

      const receipt = await publicClient.waitForTransactionReceipt({ hash });

      const tokenIds: number[] = [];
      for (const log of receipt.logs) {
        try {
          const decoded = decodeEventLog({
            abi: [
              {
                anonymous: false,
                inputs: [
                  { indexed: true, name: 'from', type: 'address' },
                  { indexed: true, name: 'to', type: 'address' },
                  { indexed: true, name: 'tokenId', type: 'uint256' },
                ],
                name: 'Transfer',
                type: 'event',
              },
            ],
            data: log.data,
            topics: log.topics,
          });
          if (decoded.eventName === 'Transfer') {
            tokenIds.push(Number((decoded.args as any).tokenId));
          }
        } catch {
        }
      }

      const result: MintResult = { txHash: hash, tokenIds };
      setMintResult(result);
      setMintTxState('confirmed');

      await fetchOnChainData();

      return result;
    } catch (err: any) {
      console.error('Mint error:', err);
      setMintTxState('error');
      const message = err?.shortMessage || err?.message || 'Mint transaction failed';
      setError(message);
      toast({
        title: 'Mint Failed',
        description: message,
        variant: 'destructive',
      });
      return null;
    }
  }, [walletClient, walletAddress, publicClient, toast, fetchOnChainData, onChainMaxPerTx, useServerSigning, serverMint]);

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
        await fetchOnChainData();
        await checkAllowance();
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
  }, [toast, fetchOnChainData, checkAllowance]);

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
