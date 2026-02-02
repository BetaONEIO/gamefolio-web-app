import { motion } from "motion/react";
import { TrendingUp } from "lucide-react";

interface StakingCardProps {
  id: string;
  name: string;
  symbol: string;
  apy: number;
  staked: number;
  rewards: number;
  color: string;
  icon: string;
  index: number;
  daysLeft?: number;
  progress?: number;
}

export default function StakingCard({
  name,
  symbol,
  apy,
  staked,
  rewards,
  color,
  icon,
  index,
  daysLeft = 42,
  progress = 65,
}: StakingCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      whileHover={{ scale: 1.02 }}
      className="bg-white/5 dark:bg-white/5 backdrop-blur-sm rounded-2xl p-4 border border-white/10 dark:border-white/10"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center shadow-lg`}>
            <span className="text-2xl text-white">{icon}</span>
          </div>

          <div>
            <h4 className="text-white font-medium mb-1">{name}</h4>
            <div className="flex items-center gap-2">
              <div className="px-2 py-0.5 bg-green-500/20 rounded-full">
                <span className="text-green-400 text-sm">APY {apy}%</span>
              </div>
            </div>
          </div>
        </div>

        <motion.button
          whileTap={{ scale: 0.95 }}
          className="px-4 py-2 bg-white/10 rounded-lg text-white text-sm hover:bg-white/20 transition-colors"
        >
          Manage
        </motion.button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-white/60 text-sm mb-1">Staked Amount</p>
          <p className="text-white font-medium">
            {staked} {symbol}
          </p>
        </div>
        <div>
          <p className="text-white/60 text-sm mb-1">Rewards Earned</p>
          <div className="flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-green-400" />
            <p className="text-green-400 font-medium">
              {rewards} {symbol}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-white/60 text-sm">Staking Period</span>
          <span className="text-white text-sm">{daysLeft} days left</span>
        </div>
        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ delay: index * 0.1 + 0.3, duration: 1, ease: "easeOut" }}
            className={`h-full bg-gradient-to-r ${color}`}
          />
        </div>
      </div>
    </motion.div>
  );
}
