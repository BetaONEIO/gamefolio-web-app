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

export type WalletMode = 'auto' | 'gamefolio' | 'external';

const WALLET_MODE_STORAGE_KEY = 'gf:wallet-mode';

function readStoredWalletMode(): WalletMode {
  if (typeof window === 'undefined') return 'auto';
  try {
    const v = window.localStorage.getItem(WALLET_MODE_STORAGE_KEY);
    if (v === 'auto' || v === 'gamefolio' || v === 'external') return v;
  } catch {}
  return 'auto';
}

interface WalletContextType {
  walletAddress: Address | null;
  isReady: boolean;
  chainId: number;
  publicClient: PublicClient;
  isConnecting: boolean;
  isEmbeddedWallet: boolean;
  connect: () => void;
  disconnect: () => void;
  walletMode: WalletMode;
  setWalletMode: (mode: WalletMode) => void;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

const publicClient = createPublicClient({
  chain: skaleTestnet,
  transport: http(SKALE_RPC_URL),
});

async function updateWalletAddressOnServer(
  walletAddress: string,
): Promise<{ ok: boolean; data: any }> {
  try {
    const response = await fetch('/api/wallet/address', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ walletAddress }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      console.error('Failed to update wallet address on server', data);
    }
    return { ok: response.ok, data };
  } catch (error) {
    console.error('Error updating wallet address:', error);
    return { ok: false, data: { message: 'Network error' } };
  }
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();
  const lastSavedAddress = useRef<string | null>(null);
  const [userInitiatedConnect, setUserInitiatedConnect] = useState(false);
  const [walletMode, setWalletModeState] = useState<WalletMode>(() => readStoredWalletMode());

  const setWalletMode = useCallback((mode: WalletMode) => {
    setWalletModeState(mode);
    try {
      window.localStorage.setItem(WALLET_MODE_STORAGE_KEY, mode);
    } catch {}
  }, []);

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
        .then(({ ok, data }) => {
          if (ok) {
            if (data?.sweepAmount) {
              const txShort = data?.sweepTxHash
                ? ` (tx ${String(data.sweepTxHash).slice(0, 10)}…)`
                : '';
              toast({
                title: 'Wallet linked',
                description: `${data.sweepAmount} GFT was moved over from your previous wallet${txShort}.`,
                variant: 'gamefolioSuccess',
              });
            }
            return refreshUser();
          }
          if (data?.needsManualMove && data?.oldWalletBalance) {
            toast({
              title: 'Move existing balance first',
              description: `Your previous wallet still holds ${data.oldWalletBalance} GFT. Send those tokens to ${walletAddress} from that wallet, then reconnect.`,
              variant: 'destructive',
            });
            // Allow another attempt after the user moves funds.
            lastSavedAddress.current = null;
          } else if (data?.message) {
            toast({
              title: 'Could not link wallet',
              description: data.message,
              variant: 'destructive',
            });
            lastSavedAddress.current = null;
          }
        })
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
    walletMode,
    setWalletMode,
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
