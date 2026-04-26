import { useQuery } from '@tanstack/react-query';
import { getQueryFn } from '@/lib/queryClient';

interface TokenInfo {
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: string;
  contractAddress: string;
}

interface WalletInfo {
  address: string;
  balance: string;
  isPrimary: boolean;
  isRetired: boolean;
  isCustodial?: boolean;
}

interface TokenBalance {
  balance: string;
  walletAddress: string;
  contractAddress: string;
  wallets?: WalletInfo[];
}

export function useTokenInfo() {
  return useQuery<TokenInfo>({
    queryKey: ['/api/token/info'],
    queryFn: getQueryFn({ on401: 'returnNull' }),
    refetchInterval: 30000,
  });
}

export function useTokenBalance() {
  return useQuery<TokenBalance>({
    queryKey: ['/api/token/balance'],
    queryFn: getQueryFn({ on401: 'returnNull' }),
    refetchInterval: 15000,
  });
}
