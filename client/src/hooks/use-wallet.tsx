import { createContext, useContext, useEffect, ReactNode, useCallback, useRef, useState } from 'react';
import { useAccount, useDisconnect, useWalletClient, useChainId } from 'wagmi';
import { useOpenConnectModal } from '@0xsequence/connect';
import { createPublicClient, http, type PublicClient, type Address } from 'viem';
import { useAuth } from './use-auth';
import { useToast } from './use-toast';
import { SKALE_CHAIN_ID, SKALE_RPC_URL, SKALE_EXPLORER_BASE_URL } from '../../../config/web3';
import { skaleNebulaTestnet, sequenceConfig } from '../lib/sequence-config';

const useConnectModal: () => { setOpenConnectModal: (open: boolean) => void } = sequenceConfig
  ? useOpenConnectModal
  : () => ({ setOpenConnectModal: () => {} });

export const skaleTestnet = skaleNebulaTestnet;

interface WalletContextType {
  walletAddress: Address | null;
  isReady: boolean;
  chainId: number;
  publicClient: PublicClient;
  isConnecting: boolean;
  isEmbeddedWallet: boolean;
  connect: () => void;
  disconnect: () => void;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

const publicClient = createPublicClient({
  chain: skaleTestnet,
  transport: http(SKALE_RPC_URL),
});

async function updateWalletAddressOnServer(walletAddress: string): Promise<void> {
  try {
    const response = await fetch('/api/wallet/address', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ walletAddress }),
    });
    if (!response.ok) {
      console.error('Failed to update wallet address on server');
    }
  } catch (error) {
    console.error('Error updating wallet address:', error);
  }
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();
  const lastSavedAddress = useRef<string | null>(null);
  const [userInitiatedConnect, setUserInitiatedConnect] = useState(false);

  const { address, isConnected, isConnecting: wagmiIsConnecting } = useAccount();
  const { disconnect: wagmiDisconnect } = useDisconnect();
  const { data: walletClient } = useWalletClient();
  const chainId = useChainId();
  const { setOpenConnectModal } = useConnectModal();

  const walletAddress = (address as Address) || null;
  const isReady = isConnected && !!address;
  const isEmbeddedWallet = isConnected && !!walletClient;
  
  const isConnecting = userInitiatedConnect && wagmiIsConnecting;

  useEffect(() => {
    if (isReady && userInitiatedConnect) {
      setUserInitiatedConnect(false);
    }
  }, [isReady, userInitiatedConnect]);

  const isUpdatingWallet = useRef(false);

  useEffect(() => {
    if (isReady && walletAddress && user && walletAddress !== lastSavedAddress.current && !isUpdatingWallet.current) {
      isUpdatingWallet.current = true;
      lastSavedAddress.current = walletAddress;
      updateWalletAddressOnServer(walletAddress)
        .then(() => refreshUser())
        .finally(() => { isUpdatingWallet.current = false; });
    }
  }, [isReady, walletAddress, user?.id, refreshUser]);

  const connect = useCallback(() => {
    if (!user) {
      toast({
        title: 'Please log in first',
        description: 'You need to be logged in to connect a wallet',
        variant: 'destructive',
      });
      return;
    }
    setUserInitiatedConnect(true);
    setOpenConnectModal(true);
  }, [user, setOpenConnectModal, toast]);

  const disconnect = useCallback(() => {
    wagmiDisconnect();
    setUserInitiatedConnect(false);
    toast({
      title: 'Wallet disconnected',
      description: 'Your wallet has been disconnected',
    });
  }, [wagmiDisconnect, toast]);

  const value: WalletContextType = {
    walletAddress,
    isReady,
    chainId: chainId || SKALE_CHAIN_ID,
    publicClient,
    isConnecting,
    isEmbeddedWallet,
    connect,
    disconnect,
  };

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet(): WalletContextType {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
}
