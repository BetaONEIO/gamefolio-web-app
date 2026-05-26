import { createContext, useContext, useEffect, ReactNode, useCallback, useRef, useState } from 'react';
import { useConfig } from 'wagmi';
import { watchAccount, watchChainId, getAccount, getChainId, disconnect as wagmiDisconnectCore } from '@wagmi/core';
import { useOpenConnectModal } from '@0xsequence/connect';
import { createPublicClient, http, type PublicClient, type Address } from 'viem';
import { useAuth } from './use-auth';
import { useToast } from './use-toast';
import { SKALE_CHAIN_ID, SKALE_RPC_URL } from '../../../config/web3';
import { skaleNebulaTestnet } from '../lib/sequence-config';

export const skaleTestnet = skaleNebulaTestnet;

export type WalletMode = 'auto' | 'gamefolio' | 'external';

const WALLET_MODE_STORAGE_KEY = 'gf:wallet-mode';

function readStoredWalletMode(): WalletMode {
  if (typeof window === 'undefined') return 'gamefolio';
  try {
    const v = window.localStorage.getItem(WALLET_MODE_STORAGE_KEY);
    if (v === 'gamefolio' || v === 'external') return v;
    if (v === 'auto') {
      window.localStorage.setItem(WALLET_MODE_STORAGE_KEY, 'gamefolio');
      return 'gamefolio';
    }
  } catch {}
  return 'gamefolio';
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

const defaultContextValue: WalletContextType = {
  walletAddress: null,
  isReady: false,
  chainId: SKALE_CHAIN_ID,
  publicClient,
  isConnecting: false,
  isEmbeddedWallet: false,
  connect: () => {},
  disconnect: () => {},
  walletMode: 'gamefolio',
  setWalletMode: () => {},
};

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

// Full WalletProvider — used inside SequenceConnect (when Sequence keys are set).
//
// wagmi v2 hooks like useAccount/useChainId use useSyncExternalStore which fires
// synchronous subscriber callbacks. When wagmi's internal Hydrate component runs
// during the same render cycle, these callbacks collide and cause React's
// "Cannot update while rendering" warning, which cascades into the
// "Rendered fewer hooks than expected" crash.
//
// The fix: replace all useSyncExternalStore-based hooks (useAccount, useChainId,
// useWalletClient) with imperative @wagmi/core watchers called from useEffect.
// Only useConfig (context), useDisconnect (mutation), and useOpenConnectModal
// (context) remain as hooks — none of those use useSyncExternalStore.
export function WalletProvider({ children }: { children: ReactNode }) {
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();
  const wagmiConfig = useConfig();
  const { setOpenConnectModal } = useOpenConnectModal();

  const lastSavedAddress = useRef<string | null>(null);
  const isUpdatingWallet = useRef(false);
  const [userInitiatedConnect, setUserInitiatedConnect] = useState(false);
  const [walletMode, setWalletModeState] = useState<WalletMode>(() => readStoredWalletMode());

  // Imperative reads — safe during render (no store subscription).
  const [wagmiAddress, setWagmiAddress] = useState<Address | undefined>(() => {
    try { return getAccount(wagmiConfig).address as Address; } catch { return undefined; }
  });
  const [wagmiIsConnected, setWagmiIsConnected] = useState<boolean>(() => {
    try { return getAccount(wagmiConfig).isConnected; } catch { return false; }
  });
  const [wagmiIsConnecting, setWagmiIsConnecting] = useState<boolean>(() => {
    try { return getAccount(wagmiConfig).isConnecting; } catch { return false; }
  });
  const [chainId, setChainId] = useState<number>(() => {
    try { return getChainId(wagmiConfig); } catch { return SKALE_CHAIN_ID; }
  });

  // Subscribe to wagmi state imperatively — safe in useEffect, not during render.
  useEffect(() => {
    const unwatchAccount = watchAccount(wagmiConfig, {
      onChange(account) {
        setWagmiAddress(account.address as Address | undefined);
        setWagmiIsConnected(account.isConnected);
        setWagmiIsConnecting(account.isConnecting);
      },
    });
    const unwatchChain = watchChainId(wagmiConfig, {
      onChange(newChainId) {
        setChainId(newChainId);
      },
    });
    return () => { unwatchAccount(); unwatchChain(); };
  }, [wagmiConfig]);

  const setWalletMode = useCallback((mode: WalletMode) => {
    setWalletModeState(mode);
    try { window.localStorage.setItem(WALLET_MODE_STORAGE_KEY, mode); } catch {}
  }, []);

  const walletAddress = wagmiAddress ?? null;
  const isReady = wagmiIsConnected && !!wagmiAddress;
  const isConnecting = userInitiatedConnect && wagmiIsConnecting;

  useEffect(() => {
    if (isReady && userInitiatedConnect) {
      setUserInitiatedConnect(false);
    }
  }, [isReady, userInitiatedConnect]);

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
    wagmiDisconnectCore(wagmiConfig).catch(() => {});
    setUserInitiatedConnect(false);
    toast({
      title: 'Wallet disconnected',
      description: 'Your wallet has been disconnected',
    });
  }, [wagmiConfig, toast]);

  const value: WalletContextType = {
    walletAddress,
    isReady,
    chainId: chainId || SKALE_CHAIN_ID,
    publicClient,
    isConnecting,
    isEmbeddedWallet: false,
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

// Lightweight fallback used when Sequence keys are absent (no WagmiProvider /
// SequenceConnect in the tree). Provides the same context shape with sensible
// defaults — no wagmi hooks of any kind.
export function NoWalletProvider({ children }: { children: ReactNode }) {
  const [walletMode, setWalletModeState] = useState<WalletMode>(() => readStoredWalletMode());

  const setWalletMode = useCallback((mode: WalletMode) => {
    setWalletModeState(mode);
    try { window.localStorage.setItem(WALLET_MODE_STORAGE_KEY, mode); } catch {}
  }, []);

  const value: WalletContextType = {
    ...defaultContextValue,
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
