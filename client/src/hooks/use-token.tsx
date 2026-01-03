import { useQuery } from '@tanstack/react-query';

interface TokenInfo {
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: string;
  contractAddress: string;
}

interface TokenBalance {
  balance: string;
  walletAddress: string;
  contractAddress: string;
}

export function useTokenInfo() {
  return useQuery<TokenInfo>({
    queryKey: ['/api/token/info'],
    refetchInterval: 30000,
  });
}

export function useTokenBalance() {
  return useQuery<TokenBalance>({
    queryKey: ['/api/token/balance'],
    refetchInterval: 15000,
  });
}
