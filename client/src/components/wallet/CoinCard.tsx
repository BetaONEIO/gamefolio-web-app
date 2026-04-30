import { motion } from "motion/react";
import { TrendingUp, TrendingDown } from "lucide-react";

interface CoinCardProps {
  id: string;
  name: string;
  symbol: string;
  balance: number;
  value: number;
  change: number;
  color: string;
  icon: string;
  index: number;
}

export default function CoinCard({
  name,
  symbol,
  balance,
  value,
  change,
  color,
  icon,
  index,
}: CoinCardProps) {
  const isPositive = change >= 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className="bg-white/5 dark:bg-white/5 backdrop-blur-sm rounded-2xl p-4 border border-white/10 dark:border-white/10 cursor-pointer hover:bg-white/10 dark:hover:bg-white/10 transition-colors"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center shadow-lg`}>
            <span className="text-2xl text-white">{icon}</span>
          </div>

          <div>
            <h4 className="text-white font-medium mb-1">{name}</h4>
            <p className="text-white/60 text-sm">{balance} {symbol}</p>
          </div>
        </div>

        <div className="text-right">
          <div className="text-white font-medium mb-1">
            ${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className={`flex items-center justify-end gap-1 text-sm ${isPositive ? 'text-primary' : 'text-red-400'}`}>
            {isPositive ? (
              <TrendingUp className="w-3 h-3" />
            ) : (
              <TrendingDown className="w-3 h-3" />
            )}
            <span>{isPositive ? '+' : ''}{change.toFixed(2)}%</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
