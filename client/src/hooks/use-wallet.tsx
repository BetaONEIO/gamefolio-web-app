import { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react';
import { createWalletClient, createPublicClient, custom, http, type WalletClient, type PublicClient, type Address } from 'viem';
import { useAuth } from './use-auth';
import { useCrossmint } from './use-crossmint';
import { SKALE_CHAIN_ID, SKALE_RPC_URL, SKALE_EXPLORER_BASE_URL } from '../../../config/web3';

export const skaleTestnet = {
  id: SKALE_CHAIN_ID,
  name: 'SKALE Testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'sFUEL',
    symbol: 'sFUEL',
  },
  rpcUrls: {
    default: { http: [SKALE_RPC_URL] },
    public: { http: [SKALE_RPC_URL] },
  },
  blockExplorers: {
    default: { name: 'SKALE Explorer', url: SKALE_EXPLORER_BASE_URL },
  },
} as const;

interface WalletContextType {
  walletAddress: Address | null;
  isReady: boolean;
  signer: WalletClient | null;
  chainId: number;
  publicClient: PublicClient | null;
  isConnecting: boolean;
  isEmbeddedWallet: boolean;
  connect: () => Promise<void>;
  connectInjected: () => Promise<void>;
  disconnect: () => void;
  updateWalletAddress: (address: string) => Promise<void>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: ReactNode }) {
  const { user, refreshUser } = useAuth();
  const { wallet: crossmintWallet, isLoading: crossmintLoading, createWallet: createCrossmintWallet } = useCrossmint();
  const [injectedAddress, setInjectedAddress] = useState<Address | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [injectedSigner, setInjectedSigner] = useState<WalletClient | null>(null);

  const walletAddress = useMemo<Address | null>(() => {
    if (crossmintWallet?.address) {
      return crossmintWallet.address as Address;
    }
    if (user?.walletAddress) {
      return user.walletAddress as Address;
    }
    return injectedAddress;
  }, [crossmintWallet?.address, user?.walletAddress, injectedAddress]);

  const isEmbeddedWallet = !!crossmintWallet?.address || (!!user?.walletAddress && !injectedAddress);

  const isReady = !!walletAddress && !crossmintLoading;

  const signer = useMemo<WalletClient | null>(() => {
    if (injectedSigner) {
      return injectedSigner;
    }
    return null;
  }, [injectedSigner]);

  const publicClient = useMemo(() => {
    return createPublicClient({
      chain: skaleTestnet,
      transport: http(SKALE_RPC_URL),
    });
  }, []);

  const connect = async () => {
    if (!user) {
      console.error('User must be logged in to create wallet');
      return;
    }

    setIsConnecting(true);
    try {
      await createCrossmintWallet();
    } catch (error) {
      console.error('Failed to create embedded wallet:', error);
    } finally {
      setIsConnecting(false);
    }
  };

  const connectInjected = async () => {
    if (typeof window === 'undefined' || !(window as any).ethereum) {
      console.error('No ethereum provider found');
      return;
    }

    setIsConnecting(true);
    try {
      const accounts = await (window as any).ethereum.request({
        method: 'eth_requestAccounts',
      });

      if (accounts && accounts.length > 0) {
        const address = accounts[0] as Address;
        
        const walletClient = createWalletClient({
          account: address,
          chain: skaleTestnet,
          transport: custom((window as any).ethereum),
        });

        setInjectedSigner(walletClient);
        setInjectedAddress(address);

        await updateWalletAddress(address);
      }
    } catch (error) {
      console.error('Failed to connect injected wallet:', error);
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnect = () => {
    setInjectedSigner(null);
    setInjectedAddress(null);
  };

  const updateWalletAddress = async (address: string) => {
    try {
      const response = await fetch('/api/wallet/address', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ walletAddress: address }),
      });

      if (response.ok) {
        await refreshUser();
      }
    } catch (error) {
      console.error('Failed to update wallet address:', error);
    }
  };

  return (
    <WalletContext.Provider
      value={{
        walletAddress,
        isReady,
        signer,
        chainId: SKALE_CHAIN_ID,
        publicClient,
        isConnecting: isConnecting || crossmintLoading,
        isEmbeddedWallet,
        connect,
        connectInjected,
        disconnect,
        updateWalletAddress,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
}
