export const SKALE_CHAIN_ID = 37084624 as const;

export const SKALE_RPC_URL = "https://testnet.skalenodes.com/v1/lanky-ill-funny-testnet" as const;

export const SKALE_EXPLORER_BASE_URL = "https://lanky-ill-funny-testnet.explorer.testnet.skalenodes.com" as const;

export const GF_TOKEN_ADDRESS = "0x9c4aC24c7bb36AA3772ccd5aCBCB48a20a1704B7" as const;

export const GF_TOKEN_DECIMALS = 18 as const;

export const NFT_CONTRACT_ADDRESS = "0x246624993603fbd8C3Cc60920878D0DF5c764Fb4" as const;

export const MINT_SALE_ADDRESS = "0xC9Cd5a4c22096183b14c0877fC1C16468f94EA28" as const;

export const STAKING_ADDRESS = "0x589C36a839434ae674Ba795dBb5B06B387110172" as const;

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
