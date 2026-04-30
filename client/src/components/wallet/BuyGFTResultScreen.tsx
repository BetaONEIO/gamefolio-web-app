import { useEffect, useState } from "react";
import { Check, Copy, ShoppingBag } from "lucide-react";
import SpendGFTScreen from "./SpendGFTScreen";

interface BuyGFTResultScreenProps {
  onDone: () => void;
  gftAmount: number;
  transactionHash?: string;
  paymentMethod?: string;
  availableBalance?: number;
}

export default function BuyGFTResultScreen({
  onDone,
  gftAmount,
  transactionHash = "0x7a2...3f4e",
  paymentMethod = "VISA •••• 4242",
  availableBalance = 540.0,
}: BuyGFTResultScreenProps) {
  const [copied, setCopied] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showSpendScreen, setShowSpendScreen] = useState(false);

  useEffect(() => {
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        return prev + 2;
      });
    }, 30);

    const successTimeout = setTimeout(() => {
      setShowSuccess(true);
    }, 1500);

    return () => {
      clearInterval(progressInterval);
      clearTimeout(successTimeout);
    };
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText(transactionHash);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (showSpendScreen) {
    return (
      <SpendGFTScreen
        onBack={() => setShowSpendScreen(false)}
        availableBalance={availableBalance + gftAmount}
      />
    );
  }

  return (
    <div 
      className="w-full min-h-screen flex flex-col font-['Plus_Jakarta_Sans']"
      style={{ background: '#101D27' }}
    >
      {/* Header */}
      <div 
        className="flex items-center justify-center px-6 pt-12 pb-6"
        style={{ borderBottom: '1px solid rgba(30, 41, 59, 0.3)' }}
      >
        <div className="flex items-center justify-between w-full max-w-[430px] md:max-w-[600px] lg:max-w-[800px]">
          <div className="w-10 h-10" />
          
          <span className="text-xl font-bold" style={{ color: '#f8fafc' }}>
            Transaction Status
          </span>
          
          <div className="w-10 h-10" />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col px-6 py-8 max-w-[430px] md:max-w-[600px] lg:max-w-[800px] mx-auto w-full">
        {/* Success Animation Area */}
        <div className="flex flex-col items-center justify-center flex-1 gap-6">
          {/* Animated Success Icon */}
          <div className="relative w-44 h-44 flex items-center justify-center">
            {/* Outer glow ring */}
            <div 
              className="absolute inset-0 rounded-full animate-pulse"
              style={{ 
                background: 'rgba(183, 255, 26, 0.1)',
              }}
            />
            
            {/* Inner circle with icon */}
            <div 
              className="relative w-24 h-24 rounded-full flex items-center justify-center"
              style={{ 
                background: 'rgba(183, 255, 26, 0.2)',
                boxShadow: '0 0 60px rgba(183, 255, 26, 0.3)'
              }}
            >
              <div 
                className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-500 ${showSuccess ? 'scale-100 opacity-100' : 'scale-50 opacity-0'}`}
                style={{ background: '#B7FF1A' }}
              >
                <Check className="w-8 h-8" style={{ color: '#071013' }} strokeWidth={3} />
              </div>
            </div>
          </div>

          {/* Success Text */}
          <div className="flex flex-col items-center gap-2 text-center">
            <h1 
              className="text-2xl font-bold"
              style={{ color: '#fff' }}
            >
              GFT Added to Your Wallet!
            </h1>
            <p 
              className="text-base font-medium max-w-[370px]"
              style={{ color: '#94a3b8', lineHeight: '24px' }}
            >
              Your purchase of {gftAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} GFT was successful and is now available in your balance.
            </p>
          </div>

          {/* Transaction Details Card */}
          <div 
            className="w-full rounded-2xl p-5 flex flex-col gap-4"
            style={{ 
              background: '#0f172a',
              border: '1px solid rgba(30, 41, 59, 0.5)'
            }}
          >
            {/* Transaction Hash */}
            <div className="flex items-center justify-between py-1">
              <span 
                className="text-sm font-medium"
                style={{ color: '#94a3b8' }}
              >
                Transaction Hash
              </span>
              <button 
                onClick={handleCopy}
                className="flex items-center gap-1.5 hover:opacity-80 transition-opacity"
              >
                <span 
                  className="text-sm font-bold"
                  style={{ color: '#B7FF1A' }}
                >
                  {transactionHash}
                </span>
                {copied ? (
                  <Check className="w-4 h-4" style={{ color: '#B7FF1A' }} />
                ) : (
                  <Copy className="w-4 h-4" style={{ color: '#B7FF1A' }} />
                )}
              </button>
            </div>

            {/* Divider */}
            <div className="w-full h-px" style={{ background: 'rgba(30, 41, 59, 0.3)' }} />

            {/* Payment Method */}
            <div className="flex items-center justify-between py-1">
              <span 
                className="text-sm font-medium"
                style={{ color: '#94a3b8' }}
              >
                Payment Method
              </span>
              <span 
                className="text-sm font-bold uppercase"
                style={{ color: '#fff' }}
              >
                {paymentMethod}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-3 w-full">
            <button
              onClick={() => setShowSpendScreen(true)}
              className="w-full py-5 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 transition-all hover:opacity-90 active:scale-[0.98]"
              style={{ 
                background: '#B7FF1A',
                color: '#071013',
                boxShadow: '0 0 30px -10px #B7FF1A'
              }}
            >
              <ShoppingBag className="w-5 h-5" />
              Spend Your GFT
            </button>
            
            <button
              onClick={onDone}
              className="w-full py-5 rounded-2xl font-bold text-lg transition-all hover:bg-slate-700"
              style={{ 
                background: '#1e293b',
                color: '#f8fafc',
                border: '1px solid #1e293b'
              }}
            >
              Back to Wallet
            </button>
          </div>
        </div>

        {/* Divider with text */}
        <div className="flex items-center gap-4 my-6">
          <div className="flex-1 h-px" style={{ background: 'rgba(30, 41, 59, 0.5)' }} />
          <span 
            className="text-xs font-bold uppercase"
            style={{ color: '#94a3b8', letterSpacing: '1.2px' }}
          >
            Other Variants
          </span>
          <div className="flex-1 h-px" style={{ background: 'rgba(30, 41, 59, 0.5)' }} />
        </div>

        {/* Progress Card (showing in-progress state variant) */}
        <div 
          className="w-full rounded-3xl p-6 flex flex-col gap-6"
          style={{ 
            background: 'rgba(15, 23, 42, 0.4)',
            border: '1px solid #1e293b'
          }}
        >
          {/* Progress Header */}
          <div className="flex items-start gap-4">
            {/* Icon */}
            <div 
              className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(183, 255, 26, 0.2)' }}
            >
              <Check className="w-6 h-6" style={{ color: '#A2F000' }} />
            </div>
            
            {/* Text */}
            <div className="flex flex-col gap-0.5">
              <span 
                className="text-lg font-bold"
                style={{ color: '#fff' }}
              >
                Payment Received
              </span>
              <span 
                className="text-sm font-medium"
                style={{ color: '#94a3b8' }}
              >
                Delivering GFT to your wallet...
              </span>
            </div>
          </div>

          {/* Progress Bar */}
          <div 
            className="w-full h-2 rounded-full overflow-hidden"
            style={{ background: 'rgba(30, 41, 59, 0.5)' }}
          >
            <div 
              className="h-full rounded-full transition-all duration-300"
              style={{ 
                background: '#A2F000',
                width: `${progress}%`
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
