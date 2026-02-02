import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  ArrowUpRight, 
  ArrowDownLeft, 
  Eye, 
  EyeOff, 
  TrendingUp,
  Wallet,
  Coins,
  RefreshCw,
  ShoppingCart,
  CircleDollarSign
} from "lucide-react";
import CoinCard from "./CoinCard";
import StakingCard from "./StakingCard";
import PortfolioChart from "./PortfolioChart";
import gfTokenLogo from "@assets/Gamefolio token_1762633908726.png";

interface WalletHomepageProps {
  gfBalance?: number;
  onChainBalance?: string;
  offChainBalance?: number;
  onBuyClick?: () => void;
  onSellClick?: () => void;
  onSendClick?: () => void;
  onReceiveClick?: () => void;
  onRefreshBalance?: () => void;
  isLoadingBalance?: boolean;
}

export default function WalletHomepage({
  gfBalance = 0,
  onChainBalance = "0",
  offChainBalance = 0,
  onBuyClick,
  onSellClick,
  onSendClick,
  onReceiveClick,
  onRefreshBalance,
  isLoadingBalance = false,
}: WalletHomepageProps) {
  const [activeTab, setActiveTab] = useState("portfolio");
  const [balanceVisible, setBalanceVisible] = useState(true);

  const coins = [
    {
      id: "gf-token",
      name: "Gamefolio Token",
      symbol: "GF",
      balance: parseFloat(onChainBalance) + offChainBalance,
      value: (parseFloat(onChainBalance) + offChainBalance) * 0.05,
      change: 12.5,
      color: "from-indigo-500 to-purple-600",
      icon: "🎮",
    },
  ];

  const stakingPools = [
    {
      id: "gf-stake-30",
      name: "GF Staking Pool",
      symbol: "GF",
      apy: 15.0,
      staked: 0,
      rewards: 0,
      color: "from-indigo-500 to-purple-600",
      icon: "🎮",
      daysLeft: 30,
      progress: 0,
    },
    {
      id: "gf-stake-90",
      name: "GF Premium Pool",
      symbol: "GF",
      apy: 25.0,
      staked: 0,
      rewards: 0,
      color: "from-purple-500 to-pink-600",
      icon: "💎",
      daysLeft: 90,
      progress: 0,
    },
  ];

  const totalBalance = coins.reduce((sum, coin) => sum + coin.value, 0);

  return (
    <div className="w-full text-white">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="relative bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 rounded-3xl p-8 overflow-hidden">
              <motion.div
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [0.3, 0.5, 0.3],
                }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="absolute -top-12 -right-12 w-64 h-64 bg-white/20 rounded-full blur-3xl"
              />
              <motion.div
                animate={{
                  scale: [1, 1.3, 1],
                  opacity: [0.2, 0.4, 0.2],
                }}
                transition={{
                  duration: 5,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: 1,
                }}
                className="absolute -bottom-12 -left-12 w-64 h-64 bg-white/20 rounded-full blur-3xl"
              />

              <div className="relative z-10">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <img src={gfTokenLogo} alt="GF Token" className="w-10 h-10" />
                    <span className="text-white/80 text-lg">Total Balance</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setBalanceVisible(!balanceVisible)}
                      className="p-2 rounded-lg bg-white/10 backdrop-blur-sm hover:bg-white/20 transition-colors"
                    >
                      {balanceVisible ? (
                        <Eye className="w-5 h-5" />
                      ) : (
                        <EyeOff className="w-5 h-5" />
                      )}
                    </motion.button>
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={onRefreshBalance}
                      disabled={isLoadingBalance}
                      className="p-2 rounded-lg bg-white/10 backdrop-blur-sm hover:bg-white/20 transition-colors"
                    >
                      <RefreshCw className={`w-5 h-5 ${isLoadingBalance ? 'animate-spin' : ''}`} />
                    </motion.button>
                  </div>
                </div>

                <AnimatePresence mode="wait">
                  {balanceVisible ? (
                    <motion.div
                      key="visible"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className="text-5xl md:text-6xl font-bold mb-3">
                        {(parseFloat(onChainBalance) + offChainBalance).toLocaleString(undefined, { 
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 2 
                        })} GF
                      </div>
                      <div className="flex flex-wrap items-center gap-4 text-white/80 mb-4">
                        <span className="text-sm">On-Chain: {parseFloat(onChainBalance).toLocaleString()} GF</span>
                        <span className="text-sm">•</span>
                        <span className="text-sm">Off-Chain: {offChainBalance.toLocaleString()} GF</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-green-300" />
                        <span className="text-green-300 text-lg">
                          ≈ ${totalBalance.toFixed(2)} USD
                        </span>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="hidden"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className="text-5xl md:text-6xl font-bold mb-3">
                        ••••••
                      </div>
                      <div className="text-white/80 text-sm">Balance hidden</div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onBuyClick}
                className="flex items-center justify-center gap-2 bg-white text-slate-900 py-4 rounded-2xl shadow-lg font-medium"
              >
                <ShoppingCart className="w-5 h-5" />
                <span>Buy</span>
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onSellClick}
                className="flex items-center justify-center gap-2 bg-white/10 backdrop-blur-sm text-white py-4 rounded-2xl border border-white/20 font-medium"
              >
                <CircleDollarSign className="w-5 h-5" />
                <span>Sell</span>
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onSendClick}
                className="flex items-center justify-center gap-2 bg-white/10 backdrop-blur-sm text-white py-4 rounded-2xl border border-white/20 font-medium"
              >
                <ArrowUpRight className="w-5 h-5" />
                <span>Send</span>
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onReceiveClick}
                className="flex items-center justify-center gap-2 bg-white/10 backdrop-blur-sm text-white py-4 rounded-2xl border border-white/20 font-medium"
              >
                <ArrowDownLeft className="w-5 h-5" />
                <span>Receive</span>
              </motion.button>
            </div>
          </motion.div>

          <div className="flex items-center gap-3">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setActiveTab("portfolio")}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl transition-colors font-medium ${
                activeTab === "portfolio"
                  ? "bg-white text-slate-900"
                  : "bg-white/5 text-white/60 hover:bg-white/10"
              }`}
            >
              <Wallet className="w-4 h-4" />
              <span>Portfolio</span>
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setActiveTab("staking")}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl transition-colors font-medium ${
                activeTab === "staking"
                  ? "bg-white text-slate-900"
                  : "bg-white/5 text-white/60 hover:bg-white/10"
              }`}
            >
              <Coins className="w-4 h-4" />
              <span>Staking</span>
            </motion.button>
          </div>

          <AnimatePresence mode="wait">
            {activeTab === "portfolio" ? (
              <motion.div
                key="portfolio"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-white font-medium text-lg">Portfolio Performance</h3>
                    <span className="text-green-400 text-sm font-medium">7D</span>
                  </div>
                  <PortfolioChart />
                </div>

                <div>
                  <h3 className="text-white font-medium text-lg mb-4">Assets</h3>
                  <div className="space-y-3">
                    {coins.map((coin, index) => (
                      <CoinCard key={coin.id} {...coin} index={index} />
                    ))}
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="staking"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                <div className="bg-gradient-to-br from-green-600/20 to-emerald-600/20 backdrop-blur-sm rounded-2xl p-6 border border-green-500/20">
                  <div className="flex items-center gap-2 mb-4">
                    <Coins className="w-5 h-5 text-green-400" />
                    <span className="text-white/80">Total Staked Value</span>
                  </div>
                  <div className="text-4xl font-bold text-white mb-2">
                    0 GF
                  </div>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-green-400" />
                    <span className="text-green-400">Start staking to earn rewards</span>
                  </div>
                </div>

                <div>
                  <h3 className="text-white font-medium text-lg mb-4">Available Staking Pools</h3>
                  <div className="space-y-3">
                    {stakingPools.map((pool, index) => (
                      <StakingCard key={pool.id} {...pool} index={index} />
                    ))}
                  </div>
                </div>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-4 rounded-2xl font-medium"
                >
                  Explore More Staking Pools
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="space-y-6">
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
            <h3 className="text-white font-medium text-lg mb-4">Quick Stats</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-white/60">Total Value</span>
                <span className="text-white font-medium">${totalBalance.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-white/60">24h Change</span>
                <span className="text-green-400 font-medium">+$0.00</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-white/60">Total Staked</span>
                <span className="text-white font-medium">0 GF</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-white/60">Rewards Earned</span>
                <span className="text-green-400 font-medium">0 GF</span>
              </div>
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
            <h3 className="text-white font-medium text-lg mb-4">Recent Activity</h3>
            <div className="text-center py-8">
              <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-3">
                <Wallet className="w-6 h-6 text-white/40" />
              </div>
              <p className="text-white/60 text-sm">No recent transactions</p>
              <p className="text-white/40 text-xs mt-1">Your activity will appear here</p>
            </div>
          </div>

          <div className="bg-gradient-to-br from-indigo-600/20 to-purple-600/20 backdrop-blur-sm rounded-2xl p-6 border border-indigo-500/20">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-indigo-500/30 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-indigo-400" />
              </div>
              <div>
                <h3 className="text-white font-medium">Earn More GF</h3>
                <p className="text-white/60 text-sm">Stake your tokens for rewards</p>
              </div>
            </div>
            <p className="text-white/80 text-sm mb-4">
              Stake your GF tokens to earn up to 25% APY and unlock exclusive benefits.
            </p>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setActiveTab("staking")}
              className="w-full bg-white/10 text-white py-3 rounded-xl font-medium hover:bg-white/20 transition-colors"
            >
              Start Staking
            </motion.button>
          </div>
        </div>
      </div>
    </div>
  );
}
