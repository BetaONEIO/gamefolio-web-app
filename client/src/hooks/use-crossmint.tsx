import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { SmartWalletSDK } from '@crossmint/client-sdk-smart-wallet';
import { useAuth } from './use-auth';
import { useToast } from './use-toast';

interface CrossmintWallet {
  address: string;
  chain: string;
  balance?: string;
  sdk?: any;
}

interface CrossmintContextType {
  wallet: CrossmintWallet | null;
  isLoading: boolean;
  isConnected: boolean;
  createWallet: () => Promise<void>;
  refreshWallet: () => Promise<void>;
  loginToWallet: () => Promise<void>;
  logoutWallet: () => void;
}

const CrossmintContext = createContext<CrossmintContextType | undefined>(undefined);

export function CrossmintProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [wallet, setWallet] = useState<CrossmintWallet | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [sdk, setSdk] = useState<any>(null);

  // Initialize SDK once
  useEffect(() => {
    const apiKey = import.meta.env.VITE_CROSSMINT_API_KEY;
    if (apiKey && !sdk) {
      try {
        const walletSdk = SmartWalletSDK.init({
          clientApiKey: apiKey,
        });
        setSdk(walletSdk);
      } catch (error) {
        console.error('Failed to initialize Crossmint SDK:', error);
      }
    }
  }, []);

  // Load wallet info from user data
  useEffect(() => {
    if (user?.walletAddress) {
      setWallet({
        address: user.walletAddress,
        chain: user.walletChain || 'polygon',
      });
    } else {
      setWallet(null);
      setIsConnected(false);
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

    if (!sdk) {
      toast({
        title: "SDK not ready",
        description: "Please wait for SDK to initialize",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      // Get JWT from backend
      const jwtResponse = await fetch('/api/wallet/jwt', {
        credentials: 'include',
      });

      if (!jwtResponse.ok) {
        throw new Error('Failed to get authentication token');
      }

      const { jwt } = await jwtResponse.json();

      // Create passkey signer for the wallet
      const signer = await sdk.createPasskeySigner(`${user.username}'s Wallet`);

      // Get or create wallet using Crossmint SDK
      const crossmintWallet = await sdk.getOrCreateWallet(
        { jwt },
        user.walletChain || 'polygon',
        { signer }
      );

      const walletAddress = crossmintWallet.address;

      // Save wallet to backend
      const saveResponse = await fetch('/api/wallet/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          walletAddress,
          walletChain: user.walletChain || 'polygon',
        }),
      });

      if (!saveResponse.ok) {
        const errorData = await saveResponse.json();
        if (errorData.message !== "Wallet already exists") {
          throw new Error(errorData.message || 'Failed to save wallet');
        }
      }

      setWallet({
        address: walletAddress,
        chain: user.walletChain || 'polygon',
        sdk: crossmintWallet,
      });
      setIsConnected(true);

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

    if (!sdk) {
      toast({
        title: "SDK not ready",
        description: "Please wait for SDK to initialize",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      // Get JWT from backend
      const jwtResponse = await fetch('/api/wallet/jwt', {
        credentials: 'include',
      });

      if (!jwtResponse.ok) {
        throw new Error('Failed to get authentication token');
      }

      const { jwt } = await jwtResponse.json();

      // Create passkey signer
      const signer = await sdk.createPasskeySigner(`${user.username}'s Wallet`);

      // Connect to existing wallet using JWT
      const crossmintWallet = await sdk.getOrCreateWallet(
        { jwt },
        wallet.chain || 'polygon',
        { signer }
      );

      setWallet({
        ...wallet,
        sdk: crossmintWallet,
      });
      setIsConnected(true);

      toast({
        title: "Connected!",
        description: `Successfully connected to ${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)}`,
      });
    } catch (error: any) {
      console.error('Failed to connect to wallet:', error);
      toast({
        title: "Connection failed",
        description: error.message || "Please try again later",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const logoutWallet = () => {
    setWallet(prev => prev ? { ...prev, sdk: undefined } : null);
    setIsConnected(false);
    toast({
      title: "Disconnected",
      description: "Wallet has been disconnected",
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
        setWallet(prev => ({
          ...prev,
          address: data.address,
          chain: data.chain || 'polygon',
        }));
      }
    } catch (error) {
      console.error('Failed to refresh wallet:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <CrossmintContext.Provider value={{ wallet, isLoading, isConnected, createWallet, refreshWallet, loginToWallet, logoutWallet }}>
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
