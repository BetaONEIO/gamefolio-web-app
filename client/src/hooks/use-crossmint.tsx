import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useAuth } from './use-auth';
import { useToast } from './use-toast';

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
  loginToWallet: () => Promise<void>;
}

const CrossmintContext = createContext<CrossmintContextType | undefined>(undefined);

export function CrossmintProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [wallet, setWallet] = useState<CrossmintWallet | null>(null);
  const [isLoading, setIsLoading] = useState(false);

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
      const apiKey = import.meta.env.VITE_CROSSMINT_API_KEY;
      
      if (!apiKey) {
        throw new Error('Crossmint API key not configured');
      }

      // Call Crossmint API directly to create wallet
      const userEmail = user.email || `${user.username}@gamefolio.app`;
      
      const crossmintResponse = await fetch('https://www.crossmint.com/api/v1-alpha2/wallets', {
        method: 'POST',
        headers: {
          'X-API-KEY': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'evm-smart-wallet',
          linkedUser: userEmail,
          chain: 'polygon',
        }),
      });

      if (!crossmintResponse.ok) {
        const errorText = await crossmintResponse.text();
        throw new Error(`Crossmint API error: ${errorText}`);
      }

      const walletData = await crossmintResponse.json();
      
      // Save wallet to backend
      const saveResponse = await fetch('/api/wallet/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          walletAddress: walletData.address,
          walletChain: 'polygon',
        }),
      });

      if (!saveResponse.ok) {
        const errorData = await saveResponse.json();
        if (errorData.message !== "Wallet already exists") {
          throw new Error(errorData.message || 'Failed to save wallet');
        }
      }

      setWallet({
        address: walletData.address,
        chain: 'polygon',
      });

      toast({
        title: "Wallet created!",
        description: "Your blockchain wallet has been created successfully",
      });
    } catch (error: any) {
      console.error('Failed to create wallet:', error);
      toast({
        title: "Failed to create wallet",
        description: error.message || "Please try again later",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loginToWallet = async () => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please log in first",
        variant: "destructive",
      });
      return;
    }

    if (!wallet?.address) {
      toast({
        title: "No wallet found",
        description: "Please create a wallet first",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Wallet ready",
      description: `Connected to ${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)}`,
    });
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
    <CrossmintContext.Provider value={{ wallet, isLoading, createWallet, refreshWallet, loginToWallet }}>
      {children}
    </CrossmintContext.Provider>
  );
}

export function useCrossmint() {
  const context = useContext(CrossmintContext);
  if (context === undefined) {
    throw new Error('useCrossmint must be used within a CrossmintProvider');
  }
  return context;
}
