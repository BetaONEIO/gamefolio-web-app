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
  Menu,
  Bell
} from "lucide-react";
import CoinCard from "./CoinCard";
import StakingCard from "./StakingCard";
import PortfolioChart from "./PortfolioChart";

export default function CryptoWallet() {
  const [activeTab, setActiveTab] = useState("portfolio");
  const [balanceVisible, setBalanceVisible] = useState(true);

  const coins = [
    {
      id: "bitcoin",
      name: "Bitcoin",
      symbol: "BTC",
      balance: 0.5432,
      value: 21680.50,
      change: 2.45,
      color: "from-orange-500 to-orange-600",
      icon: "₿",
    },
    {
      id: "ethereum",
      name: "Ethereum",
      symbol: "ETH",
      balance: 3.2145,
      value: 6428.90,
      change: -1.23,
      color: "from-purple-500 to-purple-600",
      icon: "Ξ",
    },
    {
      id: "solana",
      name: "Solana",
      symbol: "SOL",
      balance: 45.67,
      value: 5123.45,
      change: 5.67,
      color: "from-cyan-500 to-blue-600",
      icon: "◎",
    },
    {
      id: "cardano",
      name: "Cardano",
      symbol: "ADA",
      balance: 1250.0,
      value: 625.00,
      change: 3.21,
      color: "from-blue-500 to-blue-600",
      icon: "₳",
    },
  ];

  const stakingPools = [
    {
      id: "eth-stake",
      name: "Ethereum 2.0",
      symbol: "ETH",
      apy: 5.2,
      staked: 2.5,
      rewards: 0.0234,
      color: "from-purple-500 to-purple-600",
      icon: "Ξ",
    },
    {
      id: "sol-stake",
      name: "Solana Staking",
      symbol: "SOL",
      apy: 7.8,
      staked: 30.0,
      rewards: 0.892,
      color: "from-cyan-500 to-blue-600",
      icon: "◎",
    },
    {
      id: "ada-stake",
      name: "Cardano Pool",
      symbol: "ADA",
      apy: 4.5,
      staked: 1000.0,
      rewards: 12.45,
      color: "from-blue-500 to-blue-600",
      icon: "₳",
    },
  ];

  const totalBalance = coins.reduce((sum, coin) => sum + coin.value, 0);
  const totalStaked = stakingPools.reduce((sum, pool) => sum + (pool.staked * 100), 0); // Approximate value

  return (
    <div className="max-w-md mx-auto min-h-screen text-white pb-24">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-6">
        <motion.button
          whileTap={{ scale: 0.95 }}
          className="p-2 rounded-xl bg-white/5 backdrop-blur-sm"
        >
          <Menu className="w-6 h-6" />
        </motion.button>
        
        <h1>Wallet</h1>
        
        <motion.button
          whileTap={{ scale: 0.95 }}
          className="p-2 rounded-xl bg-white/5 backdrop-blur-sm relative"
        >
          <Bell className="w-6 h-6" />
          <div className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
        </motion.button>
      </div>

      {/* Balance Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-6 mb-6"
      >
        <div className="relative bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 rounded-3xl p-6 overflow-hidden">
          {/* Animated background circles */}
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
            className="absolute -top-12 -right-12 w-48 h-48 bg-white/20 rounded-full blur-3xl"
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
            className="absolute -bottom-12 -left-12 w-48 h-48 bg-white/20 rounded-full blur-3xl"
          />

          <div className="relative z-10">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-2">
                <Wallet className="w-5 h-5 text-white/80" />
                <span className="text-white/80">Total Balance</span>
              </div>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setBalanceVisible(!balanceVisible)}
                className="p-2 rounded-lg bg-white/10 backdrop-blur-sm"
              >
                {balanceVisible ? (
                  <Eye className="w-5 h-5" />
                ) : (
                  <EyeOff className="w-5 h-5" />
                )}
              </motion.button>
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
                  <div className="mb-2" style={{ fontSize: '48px', fontWeight: 700, lineHeight: 1 }}>
                    ${totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-green-300" />
                    <span className="text-green-300">+12.5% this month</span>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="hidden"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="mb-2"
                  style={{ fontSize: '48px', fontWeight: 700, lineHeight: 1 }}
                >
                  ••••••
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3 mt-4">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center justify-center gap-2 bg-white text-slate-900 py-4 rounded-2xl shadow-lg"
          >
            <ArrowUpRight className="w-5 h-5" />
            <span>Send</span>
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center justify-center gap-2 bg-white/10 backdrop-blur-sm text-white py-4 rounded-2xl border border-white/20"
          >
            <ArrowDownLeft className="w-5 h-5" />
            <span>Receive</span>
          </motion.button>
        </div>
      </motion.div>

      {/* Tabs */}
      <div className="flex items-center gap-2 px-6 mb-6">
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => setActiveTab("portfolio")}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl transition-colors ${
            activeTab === "portfolio"
              ? "bg-white text-slate-900"
              : "bg-white/5 text-white/60"
          }`}
        >
          <Wallet className="w-4 h-4" />
          <span>Portfolio</span>
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => setActiveTab("staking")}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl transition-colors ${
            activeTab === "staking"
              ? "bg-white text-slate-900"
              : "bg-white/5 text-white/60"
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
            className="px-6 space-y-4"
          >
            {/* Chart Section */}
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white">Portfolio Performance</h3>
                <span className="text-green-400">7D</span>
              </div>
              <PortfolioChart />
            </div>

            {/* Assets */}
            <div>
              <h3 className="text-white mb-4">Assets</h3>
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
            className="px-6 space-y-4"
          >
            {/* Staking Summary */}
            <div className="bg-gradient-to-br from-green-600/20 to-emerald-600/20 backdrop-blur-sm rounded-2xl p-6 border border-green-500/20">
              <div className="flex items-center gap-2 mb-4">
                <Coins className="w-5 h-5 text-green-400" />
                <span className="text-white/80">Total Staked Value</span>
              </div>
              <div style={{ fontSize: '36px', fontWeight: 700, lineHeight: 1 }} className="mb-2">
                ${totalStaked.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-green-400" />
                <span className="text-green-400">Earning rewards</span>
              </div>
            </div>

            {/* Staking Pools */}
            <div>
              <h3 className="text-white mb-4">Active Stakes</h3>
              <div className="space-y-3">
                {stakingPools.map((pool, index) => (
                  <StakingCard key={pool.id} {...pool} index={index} />
                ))}
              </div>
            </div>

            {/* Explore More Button */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full bg-white/10 backdrop-blur-sm text-white py-4 rounded-2xl border border-white/20"
            >
              Explore More Staking Pools
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
