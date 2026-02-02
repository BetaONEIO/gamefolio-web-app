import { useState } from "react";
import { motion } from "motion/react";
import { 
  User,
  Settings,
  Copy,
  CheckCircle2,
  ArrowDownLeft,
  ArrowUpRight,
  Coins,
  CreditCard,
  ExternalLink
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Transaction {
  id: string;
  type: "received" | "staked" | "purchased" | "sent";
  title: string;
  subtitle: string;
  amount: number;
  time: string;
}

interface WalletHomepageProps {
  gfBalance?: number;
  onChainBalance?: string;
  offChainBalance?: number;
  walletAddress?: string;
  fiatValue?: number;
  onBuyClick?: () => void;
  onStakeClick?: () => void;
  onSettingsClick?: () => void;
  isLoadingBalance?: boolean;
}

export default function WalletHomepage({
  gfBalance = 0,
  onChainBalance = "0",
  offChainBalance = 0,
  walletAddress = "",
  fiatValue,
  onBuyClick,
  onStakeClick,
  onSettingsClick,
}: WalletHomepageProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const totalBalance = parseFloat(onChainBalance) + offChainBalance;
  const estimatedFiat = fiatValue ?? totalBalance * 0.05;

  const transactions: Transaction[] = [
    {
      id: "1",
      type: "received",
      title: "Received GFT",
      subtitle: walletAddress ? `From: ${walletAddress.slice(0, 6)}...${walletAddress.slice(-3)}` : "From: 0x82...124",
      amount: 150.00,
      time: "2 hours ago"
    },
    {
      id: "2", 
      type: "staked",
      title: "Staked GFT",
      subtitle: "Validator: #042",
      amount: -500.00,
      time: "Yesterday"
    },
    {
      id: "3",
      type: "purchased",
      title: "GFT Purchase",
      subtitle: "Via Bank Card",
      amount: 25.00,
      time: "3 days ago"
    }
  ];

  const handleCopyAddress = async () => {
    if (walletAddress) {
      await navigator.clipboard.writeText(walletAddress);
      setCopied(true);
      toast({
        title: "Address copied",
        description: "Wallet address copied to clipboard",
      });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const shortenAddress = (address: string) => {
    if (!address) return "0x12a8...3b89";
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case "received":
        return <ArrowDownLeft className="w-5 h-5 text-green-400" />;
      case "sent":
        return <ArrowUpRight className="w-5 h-5 text-red-400" />;
      case "staked":
        return <Coins className="w-5 h-5 text-green-400" />;
      case "purchased":
        return <CreditCard className="w-5 h-5 text-green-400" />;
      default:
        return <ArrowDownLeft className="w-5 h-5 text-green-400" />;
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <motion.button
          whileTap={{ scale: 0.95 }}
          className="w-10 h-10 rounded-full bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center"
        >
          <User className="w-5 h-5 text-white" />
        </motion.button>
        
        <h1 className="text-xl font-semibold text-white">Wallet Hub</h1>
        
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={onSettingsClick}
          className="w-10 h-10 rounded-full bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center"
        >
          <Settings className="w-5 h-5 text-white" />
        </motion.button>
      </div>

      <div className="text-center mb-8">
        <p className="text-gray-400 text-sm mb-2">Total Balance</p>
        <div className="flex items-baseline justify-center gap-2">
          <span className="text-5xl font-bold text-white">
            {totalBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <span className="text-2xl font-medium text-green-400">GFT</span>
        </div>
        <p className="text-gray-500 text-sm mt-2">
          ≈ ${estimatedFiat.toFixed(2)} USD
        </p>
      </div>

      <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-2xl p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-gray-400 text-sm">Wallet Status</span>
          </div>
          <div className="px-3 py-1 bg-green-500/20 border border-green-500/30 rounded-full">
            <span className="text-green-400 text-xs font-medium">SKALE Network</span>
          </div>
        </div>

        <div className="flex items-center gap-2 mb-4">
          <div className="w-2 h-2 rounded-full bg-green-400"></div>
          <span className="text-white font-medium">Active Wallet</span>
        </div>

        <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl p-4">
          <p className="text-gray-500 text-xs mb-2">Wallet Address</p>
          <div className="flex items-center justify-between">
            <code className="text-white font-mono text-sm">
              {shortenAddress(walletAddress)}
            </code>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleCopyAddress}
              className="p-2 hover:bg-white/5 rounded-lg transition-colors"
            >
              {copied ? (
                <CheckCircle2 className="w-4 h-4 text-green-400" />
              ) : (
                <Copy className="w-4 h-4 text-gray-400" />
              )}
            </motion.button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-8">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onBuyClick}
          className="flex items-center justify-center gap-2 py-4 rounded-xl border-2 border-green-500 text-green-400 font-medium hover:bg-green-500/10 transition-colors"
        >
          <ArrowDownLeft className="w-5 h-5" />
          <span>Buy GFT</span>
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onStakeClick}
          className="flex items-center justify-center gap-2 py-4 rounded-xl bg-[#1a1a1a] border border-[#2a2a2a] text-white font-medium hover:bg-[#252525] transition-colors"
        >
          <Coins className="w-5 h-5" />
          <span>Stake GFT</span>
        </motion.button>
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white font-semibold text-lg">Recent Activity</h2>
          <button className="text-green-400 text-sm hover:underline">
            View All
          </button>
        </div>

        <div className="space-y-3">
          {transactions.map((tx, index) => (
            <motion.div
              key={tx.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex items-center justify-between p-4 bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl hover:border-[#2a2a2a] transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#1a1a1a] flex items-center justify-center">
                  {getTransactionIcon(tx.type)}
                </div>
                <div>
                  <p className="text-white font-medium">{tx.title}</p>
                  <p className="text-gray-500 text-sm">{tx.subtitle}</p>
                </div>
              </div>
              <div className="text-right">
                <p className={`font-medium ${tx.amount >= 0 ? 'text-green-400' : 'text-white'}`}>
                  {tx.amount >= 0 ? '+' : ''}{tx.amount.toFixed(2)}
                </p>
                <p className="text-gray-500 text-sm">{tx.time}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
