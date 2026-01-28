import { createConfig } from "@0xsequence/connect";
import { defineChain } from "viem";
import { SKALE_CHAIN_ID, SKALE_RPC_URL, SKALE_EXPLORER_BASE_URL } from "../../../config/web3";

export const skaleNebulaTestnet = defineChain({
  id: SKALE_CHAIN_ID,
  name: "SKALE Nebula Hub Testnet",
  nativeCurrency: {
    decimals: 18,
    name: "sFUEL",
    symbol: "sFUEL",
  },
  rpcUrls: {
    default: { http: [SKALE_RPC_URL] },
  },
  blockExplorers: {
    default: { name: "SKALE Explorer", url: SKALE_EXPLORER_BASE_URL },
  },
  testnet: true,
});

const projectAccessKey = import.meta.env.VITE_SEQUENCE_PROJECT_ACCESS_KEY || "";
const waasConfigKey = import.meta.env.VITE_SEQUENCE_WAAS_CONFIG_KEY || "";

if (!projectAccessKey) {
  console.warn("VITE_SEQUENCE_PROJECT_ACCESS_KEY is not set - wallet connection will not work");
}

if (!waasConfigKey) {
  console.warn("VITE_SEQUENCE_WAAS_CONFIG_KEY is not set - embedded wallet will not work");
}

export const sequenceConfig = createConfig("waas", {
  projectAccessKey,
  defaultTheme: "dark",
  signIn: {
    projectName: "Gamefolio",
    logoUrl: "/logo.png",
  },
  appName: "Gamefolio",
  chainIds: [SKALE_CHAIN_ID],
  defaultChainId: SKALE_CHAIN_ID,
  waasConfigKey,
  guest: true,
  email: true,
});
