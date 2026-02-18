import { Loader2, CheckCircle2, ShieldAlert } from "lucide-react";
import { useEffect, useState } from "react";

interface AssetPurchaseProcessingProps {
  onComplete?: () => void;
}

export default function AssetPurchaseProcessing({ onComplete }: AssetPurchaseProcessingProps) {
  const [step, setStep] = useState(1);

  useEffect(() => {
    const timer1 = setTimeout(() => setStep(2), 2000);
    const timer2 = setTimeout(() => {
      if (onComplete) onComplete();
    }, 4500);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [onComplete]);

  return (
    <div className="flex flex-col items-center justify-center flex-1 w-full bg-[#020617] text-white p-6 animate-in fade-in duration-500">
      <div className="flex flex-col items-center gap-12 max-w-[382px] w-full">
        {/* Text Header */}
        <div className="flex flex-col items-center gap-3 text-center">
          <h2 className="text-[30px] font-black uppercase tracking-[-1.5px] leading-[36px] text-[#f8fafc]">
            {step === 1 ? "Finalizing..." : "Minting..."}
          </h2>
          <p className="text-sm font-medium uppercase tracking-[-0.35px] leading-[22.75px] text-[#94a3b8]">
            Securing your new asset on the blockchain. This will only take a moment.
          </p>
        </div>

        {/* Status Cards */}
        <div className="w-full flex flex-col p-1 bg-[#0f172a80] backdrop-blur-[4px] border border-[#1e293b4d] rounded-[24px]">
          {/* Payment Confirmed */}
          <div className="flex items-center gap-4 p-4">
            <div className={`flex items-center justify-center w-8 h-8 rounded-[16px] flex-shrink-0 transition-colors duration-500 ${step >= 1 ? 'bg-[#00c9501a] border border-[#00c95033]' : 'bg-white/5 border border-white/10'}`}>
              <CheckCircle2 className={`w-5 h-5 transition-colors duration-500 ${step >= 1 ? 'text-[#00c950]' : 'text-white/20'}`} />
            </div>
            <div className="flex flex-col">
              <span className={`text-xs font-black uppercase tracking-[1.2px] transition-colors duration-500 ${step >= 1 ? 'text-[#f8fafc]' : 'text-white/20'}`}>
                Payment Confirmed
              </span>
              <span className={`text-[10px] font-bold transition-colors duration-500 ${step >= 1 ? 'text-[#94a3b8]' : 'text-white/10'}`}>
                Transaction broadcasted
              </span>
            </div>
          </div>

          <div className="mx-4 border-t border-[#1e293b80]" />

          {/* Minting Asset */}
          <div className="flex items-center gap-4 p-4">
            <div className={`flex items-center justify-center w-8 h-8 rounded-[16px] flex-shrink-0 transition-colors duration-500 ${step >= 2 ? 'bg-[#4ade801a] border border-[#4ade8033]' : 'bg-white/5 border border-white/10'}`}>
              {step >= 2 ? (
                <div className="w-4 h-4 rounded-full bg-[#4ade80] animate-pulse" />
              ) : (
                <Loader2 className="w-4 h-4 text-white/20 animate-spin" />
              )}
            </div>
            <div className="flex flex-col">
              <span className={`text-xs font-black uppercase tracking-[1.2px] transition-colors duration-500 ${step >= 2 ? 'text-[#4ade80]' : 'text-white/20'}`}>
                Minting Asset
              </span>
              <span className={`text-[10px] font-bold transition-colors duration-500 ${step >= 2 ? 'text-[#4ade80cc]' : 'text-white/10'}`}>
                Awaiting network confirmation
              </span>
            </div>
          </div>
        </div>

        {/* Central Animation */}
        <div className="relative flex items-center justify-center w-56 h-56">
          <div className="absolute inset-0 bg-[#4ade8033] blur-[40px] rounded-full" />
          <div className="relative w-40 h-40 bg-[#0f172a] border border-[#1e293b80] rounded-full shadow-[0_25px_50px_-12px_rgba(74,222,128,0.2)] flex items-center justify-center">
            <Loader2 className="w-20 h-20 text-[#4ade80] animate-spin" />
          </div>
          {/* Outer Ring */}
          <div className="absolute w-[224px] h-[224px] border-4 border-[#4ade800d] rounded-full" />
          <div className="absolute w-[261px] h-[261px] border-4 border-[#4ade80] rounded-full opacity-20" />
        </div>

        {/* Footer Warning */}
        <div className="w-full flex items-center justify-center gap-2 p-3 bg-[#1e293b4d] border border-[#1e293b80] rounded-2xl">
          <ShieldAlert className="w-4 h-4 text-[#94a3b8]" />
          <span className="text-[11px] font-black uppercase tracking-[1.1px] text-[#94a3b8]">
            Do not close this window
          </span>
        </div>
      </div>
    </div>
  );
}
