import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { CrossmintProvider as CrossmintSDKProvider, useWallet as useCrossmintWallet } from '@crossmint/client-sdk-react-ui';
import { useAuth } from './use-auth';
import { useToast } from './use-toast';
import { apiRequest } from '@/lib/queryClient';

interface CrossmintWallet {
  address: string;
  chain: string;
  balance?: string;
}

interface CrossmintContextType {
  wallet: CrossmintWallet | null;
  isLoading: boolean;
  createWallet: () => Promise<void>;
  refreshWallet: () => Promise<void>;
}

const CrossmintContext = createContext<CrossmintContextType | undefined>(undefined);

function CrossmintWalletManager({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [wallet, setWallet] = useState<CrossmintWallet | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { getOrCreateWallet, wallet: crossmintWallet, status } = useCrossmintWallet();

  // Load wallet info from user data
  useEffect(() => {
    if (user?.walletAddress) {
      setWallet({
        address: user.walletAddress,
        chain: user.walletChain || 'polygon',
      });
    } else {
      setWallet(null);
    }
  }, [user]);

  // Sync Crossmint wallet with backend
  useEffect(() => {
    if (crossmintWallet?.address && user && !user.walletAddress) {
      // Save wallet address to backend
      fetch('/api/wallet/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          walletAddress: crossmintWallet.address,
          walletChain: 'polygon',
        }),
      }).then(() => {
        setWallet({
          address: crossmintWallet.address,
          chain: 'polygon',
        });
      }).catch((error) => {
        console.error('Failed to save wallet:', error);
      });
    }
  }, [crossmintWallet, user]);

  const createWallet = async () => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please log in to create a wallet",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const result = await getOrCreateWallet({ type: 'evm-smart-wallet' });
      
      if (result?.address) {
        toast({
          title: "Wallet created!",
          description: "Your blockchain wallet has been created successfully",
        });
      }
    } catch (error) {
      console.error('Failed to create wallet:', error);
      toast({
        title: "Failed to create wallet",
        description: "Please try again later",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const refreshWallet = async () => {
    if (!wallet?.address) return;

    setIsLoading(true);
    try {
      const response = await fetch('/api/wallet/info', {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setWallet({
          address: data.address,
          chain: data.chain || 'polygon',
        });
      }
    } catch (error) {
      console.error('Failed to refresh wallet:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <CrossmintContext.Provider value={{ wallet, isLoading: isLoading || status === 'in-progress', createWallet, refreshWallet }}>
      {children}
    </CrossmintContext.Provider>
  );
}

export function CrossmintProvider({ children }: { children: ReactNode }) {
  const apiKey = import.meta.env.VITE_CROSSMINT_API_KEY;

  if (!apiKey) {
    console.warn('VITE_CROSSMINT_API_KEY not found');
    return <>{children}</>;
  }

  return (
    <CrossmintSDKProvider apiKey={apiKey}>
      <CrossmintWalletManager>
        {children}
      </CrossmintWalletManager>
    </CrossmintSDKProvider>
  );
}

export function useCrossmint() {
  const context = useContext(CrossmintContext);
  if (context === undefined) {
    throw new Error('useCrossmint must be used within a CrossmintProvider');
  }
  return context;
}
