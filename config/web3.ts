export const SKALE_CHAIN_ID = 2046399126 as const;

export const SKALE_RPC_URL = "https://mainnet.skalenodes.com/v1/elated-tan-skat" as const;

export const SKALE_EXPLORER_BASE_URL = "https://elated-tan-skat.explorer.mainnet.skalenodes.com" as const;

export const GF_TOKEN_ADDRESS = "0x0000000000000000000000000000000000000000" as const;

export const GF_TOKEN_DECIMALS = 18 as const;

export const STAKING_ADDRESS = "0x0000000000000000000000000000000000000000" as const;

export const GF_PRICING_CONFIG = {
  gbpPerGf: 0.01,
  gfPerGbp: 100,
} as const;

export type GfPricingConfig = typeof GF_PRICING_CONFIG;

export type OrderStatus = 
  | "pending"
  | "confirmed"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "refunded";

export const ORDER_STATUS_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["processing", "cancelled"],
  processing: ["shipped", "cancelled"],
  shipped: ["delivered"],
  delivered: ["refunded"],
  cancelled: [],
  refunded: [],
} as const;

export function isValidStatusTransition(
  currentStatus: OrderStatus,
  newStatus: OrderStatus
): boolean {
  return ORDER_STATUS_TRANSITIONS[currentStatus].includes(newStatus);
}

export const WEB3_CONFIG = {
  chainId: SKALE_CHAIN_ID,
  rpcUrl: SKALE_RPC_URL,
  explorerBaseUrl: SKALE_EXPLORER_BASE_URL,
  gfTokenAddress: GF_TOKEN_ADDRESS,
  gfTokenDecimals: GF_TOKEN_DECIMALS,
  stakingAddress: STAKING_ADDRESS,
  pricing: GF_PRICING_CONFIG,
} as const;

export type Web3Config = typeof WEB3_CONFIG;
