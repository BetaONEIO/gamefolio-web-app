export const SKALE_CHAIN_ID = 1187947933 as const;

export const SKALE_RPC_URL = "https://skale-base.skalenodes.com/v1/base" as const;

export const SKALE_EXPLORER_BASE_URL = "https://base.explorer.mainnet.skalenodes.com" as const;

export const GF_TOKEN_ADDRESS = "0xe45BeC5A80e6E32852393e77206eAf83160A90AE" as const;

export const GF_TOKEN_DECIMALS = 18 as const;

export const NFT_CONTRACT_ADDRESS = "0x6Ca4376A68907A404981e7701055813F9cE13FB3" as const;

export const MINT_SALE_ADDRESS = "" as const;

export const STAKING_ADDRESS = "0x40D7D0bA396eB920BD7f88ac58B4fA768eb52f2D" as const;

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
  nftContractAddress: NFT_CONTRACT_ADDRESS,
  mintSaleAddress: MINT_SALE_ADDRESS,
  stakingAddress: STAKING_ADDRESS,
  pricing: GF_PRICING_CONFIG,
} as const;

export type Web3Config = typeof WEB3_CONFIG;
