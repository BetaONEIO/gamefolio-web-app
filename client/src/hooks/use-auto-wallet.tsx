import { useState, useCallback, useRef } from 'react';
import { useToast } from './use-toast';
import { queryClient } from '@/lib/queryClient';

interface UseAutoWalletResult {
  createWallet: () => Promise<string | null>;
  isCreating: boolean;
  error: string | null;
  walletAddress: string | null;
}

export function useAutoWallet(): UseAutoWalletResult {
  const { toast } = useToast();
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const isActiveRef = useRef(false);

  const createWallet = useCallback(async (): Promise<string | null> => {
    if (isActiveRef.current) {
      return null;
    }

    isActiveRef.current = true;
    setIsCreating(true);
    setError(null);

    try {
      const response = await fetch('/api/wallet/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Failed to create wallet');
      }

      setWalletAddress(data.address);
      setIsCreating(false);
      isActiveRef.current = false;

      queryClient.invalidateQueries({ queryKey: ['/api/user'] });

      if (!data.isExisting) {
        toast({
          title: 'Wallet Created!',
          description: 'Your wallet has been created and linked to your account',
          variant: 'gamefolioSuccess',
        });
      }

      return data.address;
    } catch (err: any) {
      console.error('Wallet creation error:', err);
      setError(err.message || 'Failed to create wallet');
      setIsCreating(false);
      isActiveRef.current = false;
      return null;
    }
  }, [toast]);

  return {
    createWallet,
    isCreating,
    error,
    walletAddress,
  };
}
