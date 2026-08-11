import { createContext, useContext, useEffect, ReactNode, useCallback, useRef, useState } from 'react';
import { useConfig } from 'wagmi';
import { watchAccount, watchChainId, getAccount, getChainId, disconnect as wagmiDisconnectCore } from '@wagmi/core';
import { useOpenConnectModal } from '@0xsequence/connect';
import { createPublicClient, http, type PublicClient, type Address } from 'viem';
import { useToast } from './use-toast';
import { queryClient } from '../lib/queryClient';
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

// ─── WalletProvider (outer shell) ────────────────────────────────────────────
//
// Wagmi's Hydrate component (inside SequenceConnect) calls onMount() DURING its
// own render phase, which synchronously updates the wagmi Zustand store and
// notifies any useSyncExternalStore subscribers.  In React 18 this manifests as
// "Cannot update a component while rendering a different component" → "Rendered
// fewer hooks than expected" crash.
//
// Fix: keep WalletProvider's initial render completely free of hooks that use
// useSyncExternalStore (useAccount, useChainId, useDisconnect/useConnections,
// useQuery via useAuth, etc.).  Those are all delegated to WalletProviderInner,
// which only mounts AFTER the first useEffect fires — i.e. after Hydrate's
// render has committed and onMount() has already run.
export function WalletProvider({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const [walletMode, setWalletModeState] = useState<WalletMode>(() => readStoredWalletMode());

  useEffect(() => {
    setMounted(true);
  }, []);

  const setWalletMode = useCallback((mode: WalletMode) => {
    setWalletModeState(mode);
    try { window.localStorage.setItem(WALLET_MODE_STORAGE_KEY, mode); } catch {}
  }, []);

  if (mounted) {
    return (
      <WalletProviderInner walletMode={walletMode} setWalletMode={setWalletMode}>
        {children}
      </WalletProviderInner>
    );
  }

  // Before mount: serve safe defaults so children can render without crashing.
  const shellValue: WalletContextType = {
    ...defaultContextValue,
    walletMode,
    setWalletMode,
  };

  return (
    <WalletContext.Provider value={shellValue}>
      {children}
    </WalletContext.Provider>
  );
}

// ─── WalletProviderInner ──────────────────────────────────────────────────────
//
// This component renders ONLY after WalletProvider's useEffect fires, meaning
// Hydrate's onMount() has already committed.  It is safe to use any wagmi hooks,
// useAuth (useQuery), useToast etc. here without collision.
function WalletProviderInner({
  walletMode,
  setWalletMode,
  children,
}: {
  walletMode: WalletMode;
  setWalletMode: (m: WalletMode) => void;
  children: ReactNode;
}) {
  const { toast } = useToast();
  const wagmiConfig = useConfig();
  const { setOpenConnectModal } = useOpenConnectModal();

  const lastSavedAddress = useRef<string | null>(null);
  const isUpdatingWallet = useRef(false);
  const [userInitiatedConnect, setUserInitiatedConnect] = useState(false);

  // Read initial wagmi state imperatively (safe — no subscription during render).
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

  // Subscribe to wagmi store changes via imperative watchers.
  //
  // IMPORTANT: the onChange callbacks MUST defer all setState calls via
  // setTimeout.  wagmi's Hydrate component calls onMount() synchronously on
  // EVERY render (not just the first), so whenever any ancestor re-renders
  // (e.g. AuthProvider loading the user), Hydrate re-renders → onMount() →
  // wagmi store update → watchAccount fires → if we call setState here
  // synchronously React throws "Cannot update while rendering".
  // setTimeout(fn, 0) pushes the update to the next macro-task, safely outside
  // any React render phase.
  useEffect(() => {
    const unwatchAccount = watchAccount(wagmiConfig, {
      onChange(account) {
        setTimeout(() => {
          setWagmiAddress(account.address as Address | undefined);
          setWagmiIsConnected(account.isConnected);
          setWagmiIsConnecting(account.isConnecting);
        }, 0);
      },
    });
    const unwatchChain = watchChainId(wagmiConfig, {
      onChange(newChainId) {
        setTimeout(() => setChainId(newChainId), 0);
      },
    });
    return () => { unwatchAccount(); unwatchChain(); };
  }, [wagmiConfig]);

  const walletAddress = wagmiAddress ?? null;
  const isReady = wagmiIsConnected && !!wagmiAddress;
  const isConnecting = userInitiatedConnect && wagmiIsConnecting;

  useEffect(() => {
    if (isReady && userInitiatedConnect) setUserInitiatedConnect(false);
  }, [isReady, userInitiatedConnect]);

  useEffect(() => {
    if (
      isReady && walletAddress &&
      walletAddress !== lastSavedAddress.current &&
      !isUpdatingWallet.current
    ) {
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
            queryClient.invalidateQueries({ queryKey: ['/api/user'] });
            return;
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
  }, [isReady, walletAddress]);

  const connect = useCallback(() => {
    // Check auth imperatively so we never read from useQuery / useSyncExternalStore
    // during the wallet-provider render phase.
    fetch('/api/user', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((u) => {
        if (!u?.id) {
          toast({
            title: 'Please log in first',
            description: 'You need to be logged in to connect a wallet',
            variant: 'destructive',
          });
          return;
        }
        setUserInitiatedConnect(true);
        setOpenConnectModal(true);
      })
      .catch(() => {
        toast({
          title: 'Please log in first',
          description: 'You need to be logged in to connect a wallet',
          variant: 'destructive',
        });
      });
  }, [setOpenConnectModal, toast]);

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

// ─── NoWalletProvider ─────────────────────────────────────────────────────────
//
// Used when Sequence keys are absent (no SequenceConnect / WagmiProvider in the
// tree).  No wagmi hooks of any kind.
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
