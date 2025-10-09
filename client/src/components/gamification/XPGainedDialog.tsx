import { useEffect, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { CloudUpload } from "lucide-react";
import { Button } from "@/components/ui/button";

interface XPGainedDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  xpGained: number;
  onContinue?: () => void;
}

export function XPGainedDialog({ open, onOpenChange, xpGained, onContinue }: XPGainedDialogProps) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (open) {
      setProgress(0);
      const timer = setTimeout(() => {
        setProgress(100);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [open]);

  const handleContinue = () => {
    onOpenChange(false);
    if (onContinue) {
      onContinue();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="sm:max-w-md border-none bg-gradient-to-br from-green-950 to-green-900 p-12"
      >
        <div className="flex flex-col items-center justify-center space-y-6">
          {/* Circular progress ring */}
          <div className="relative w-64 h-64">
            <svg className="transform -rotate-90 w-64 h-64">
              {/* Background circle */}
              <circle
                cx="128"
                cy="128"
                r="110"
                stroke="rgb(75, 85, 99)"
                strokeWidth="12"
                fill="none"
                className="opacity-40"
              />
              
              {/* Progress circle with gradient */}
              <defs>
                <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#22c55e" />
                  <stop offset="100%" stopColor="#86efac" />
                </linearGradient>
              </defs>
              
              <circle
                cx="128"
                cy="128"
                r="110"
                stroke="url(#progressGradient)"
                strokeWidth="12"
                fill="none"
                strokeDasharray={`${2 * Math.PI * 110}`}
                strokeDashoffset={`${2 * Math.PI * 110 * (1 - progress / 100)}`}
                strokeLinecap="round"
                className="transition-all duration-1000 ease-out"
                style={{
                  filter: "drop-shadow(0 0 8px rgba(34, 197, 94, 0.6))"
                }}
              />
            </svg>

            {/* Center content */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <CloudUpload className="w-20 h-20 text-white mb-4" strokeWidth={2} />
              <div className="text-4xl font-bold text-green-400 animate-pulse">
                +{xpGained} xp
              </div>
            </div>
          </div>

          {/* Continue button */}
          <Button
            onClick={handleContinue}
            className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 text-lg font-semibold rounded-lg transition-all"
            data-testid="button-continue-xp"
          >
            Continue
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
