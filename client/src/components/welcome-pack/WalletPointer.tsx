import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Wallet, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

interface WalletPointerProps {
  show: boolean;
  onDismiss: () => void;
  onNavigate?: () => void;
}

export function WalletPointer({ show, onDismiss, onNavigate }: WalletPointerProps) {
  const [, setLocation] = useLocation();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (show) {
      setDismissed(false);
    }
  }, [show]);

  const handleNavigateToWallet = () => {
    setDismissed(true);
    onDismiss();
    if (onNavigate) {
      onNavigate();
    }
    setLocation("/wallet");
  };

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss();
  };

  if (!show || dismissed) return null;

  return (
    <AnimatePresence>
      {show && !dismissed && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 pointer-events-none"
          />
          
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 50 }}
            transition={{ type: "spring", stiffness: 300, damping: 30, delay: 0.2 }}
            className="fixed left-72 top-1/3 z-50 hidden lg:flex items-center gap-4"
          >
            <motion.div
              animate={{ x: [-5, 5, -5] }}
              transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
              className="flex items-center"
            >
              <ArrowLeft className="w-10 h-10 text-amber-400" />
            </motion.div>
            
            <div className="bg-gradient-to-br from-gray-900 to-gray-800 border border-amber-500/50 rounded-xl p-5 shadow-2xl shadow-amber-500/20 max-w-xs">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                    <Wallet className="w-5 h-5 text-amber-400" />
                  </div>
                  <h3 className="text-lg font-bold text-white">Check Your Wallet!</h3>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-gray-400 hover:text-white"
                  onClick={handleDismiss}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              
              <p className="text-sm text-gray-300 mb-4">
                Your welcome pack rewards have been added to your wallet. Go check them out!
              </p>
              
              <Button
                onClick={handleNavigateToWallet}
                className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-medium"
              >
                <Wallet className="w-4 h-4 mr-2" />
                Go to Wallet
              </Button>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            transition={{ type: "spring", stiffness: 300, damping: 30, delay: 0.2 }}
            className="fixed bottom-20 left-4 right-4 z-50 lg:hidden"
          >
            <div className="bg-gradient-to-br from-gray-900 to-gray-800 border border-amber-500/50 rounded-xl p-4 shadow-2xl shadow-amber-500/20">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center">
                    <Wallet className="w-4 h-4 text-amber-400" />
                  </div>
                  <h3 className="text-base font-bold text-white">Check Your Wallet!</h3>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-gray-400 hover:text-white"
                  onClick={handleDismiss}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              
              <p className="text-sm text-gray-300 mb-3">
                Your welcome pack rewards are waiting!
              </p>
              
              <Button
                onClick={handleNavigateToWallet}
                className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-medium"
              >
                <Wallet className="w-4 h-4 mr-2" />
                Go to Wallet
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
