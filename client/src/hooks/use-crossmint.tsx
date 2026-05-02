import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useAuth } from './use-auth';
import { useToast } from './use-toast';
import { openExternal } from '@/lib/platform';

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
  loginToWallet: () => void;
  getCrossmintDashboardUrl: () => string;
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
        chain: user.walletChain || 'skale-nebula-testnet',
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
      // Call backend to get or create wallet (API key stays server-side)
      const createResponse = await fetch('/api/wallet/create', {
        method: 'POST',
        credentials: 'include',
      });

      if (!createResponse.ok) {
        const errorData = await createResponse.json();
        throw new Error(errorData.message || 'Failed to connect wallet');
      }

      const walletData = await createResponse.json();

      setWallet({
        address: walletData.address,
        chain: walletData.chain || 'skale-nebula-testnet',
      });

      // Show appropriate message based on whether wallet was created or retrieved
      const isExisting = walletData.isExisting || false;
      toast({
        title: isExisting ? "Wallet loaded!" : "Wallet created!",
        description: isExisting 
          ? "Your Crossmint wallet has been loaded successfully"
          : "Your new Crossmint wallet has been created on SKALE network",
      });
    } catch (error: any) {
      console.error('Failed to create wallet:', error);
      toast({
        title: "Failed to connect wallet",
        description: error.message || "Please try again later",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getCrossmintDashboardUrl = (): string => {
    if (!user || !wallet) return '';
    
    // Construct Crossmint console URL with wallet address
    const consoleUrl = 'https://www.crossmint.com/console/wallets';
    return `${consoleUrl}?address=${wallet.address}`;
  };

  const loginToWallet = () => {
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

    // Open Crossmint console in the system browser (Capacitor Browser on native).
    const dashboardUrl = getCrossmintDashboardUrl();
    void openExternal(dashboardUrl);

    toast({
      title: "Opening Crossmint",
      description: "Manage your wallet in the Crossmint dashboard",
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
          chain: data.chain || 'skale-nebula-testnet',
        });
      }
    } catch (error) {
      console.error('Failed to refresh wallet:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <CrossmintContext.Provider value={{ wallet, isLoading, createWallet, refreshWallet, loginToWallet, getCrossmintDashboardUrl }}>
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
