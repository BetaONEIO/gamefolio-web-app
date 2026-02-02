import { motion } from "motion/react";

interface ChartData {
  day: string;
  value: number;
}

interface PortfolioChartProps {
  data?: ChartData[];
}

export default function PortfolioChart({ data }: PortfolioChartProps) {
  const defaultData = [
    { day: "Mon", value: 65 },
    { day: "Tue", value: 72 },
    { day: "Wed", value: 68 },
    { day: "Thu", value: 78 },
    { day: "Fri", value: 85 },
    { day: "Sat", value: 82 },
    { day: "Sun", value: 90 },
  ];

  const chartData = data || defaultData;
  const maxValue = Math.max(...chartData.map(d => d.value));
  const chartHeight = 120;

  return (
    <div className="relative">
      <div className="flex items-end justify-between gap-2 h-32 mb-2">
        {chartData.map((item, index) => {
          const height = (item.value / maxValue) * chartHeight;
          return (
            <div key={item.day} className="flex-1 flex flex-col items-center gap-2">
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: `${height}px` }}
                transition={{ delay: index * 0.1, duration: 0.6, ease: "easeOut" }}
                className="w-full bg-gradient-to-t from-indigo-600 to-purple-500 rounded-t-lg relative group cursor-pointer"
                whileHover={{ scale: 1.05 }}
              >
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-white text-slate-900 px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                  ${item.value}k
                </div>
              </motion.div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between">
        {chartData.map((item) => (
          <div key={item.day} className="flex-1 text-center">
            <span className="text-white/60 text-sm">{item.day}</span>
          </div>
        ))}
      </div>

      <div className="absolute inset-0 bg-gradient-to-t from-purple-600/10 to-transparent pointer-events-none rounded-lg" />
    </div>
  );
}
