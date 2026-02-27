import { useState, useEffect } from "react";
import { ArrowLeft, Info, Check, Loader2 } from "lucide-react";

interface StakeProcessingScreenProps {
  onBack: () => void;
  onComplete: () => void;
  stakeAmount?: number;
}

type StepStatus = "pending" | "active" | "completed";

interface ProcessingStep {
  id: string;
  title: string;
  subtitle: string;
  status: StepStatus;
}

export default function StakeProcessingScreen({
  onBack,
  onComplete,
  stakeAmount = 500,
}: StakeProcessingScreenProps) {
  const [steps, setSteps] = useState<ProcessingStep[]>([
    { id: "1", title: "Transaction Prepared", subtitle: "Successfully initialized", status: "completed" },
    { id: "2", title: "Signing Transaction", subtitle: "Authenticated by user", status: "completed" },
    { id: "3", title: "Broadcasting to Network", subtitle: "Waiting for node acceptance", status: "active" },
    { id: "4", title: "Final Confirmation", subtitle: "", status: "pending" },
  ]);

  useEffect(() => {
    const timers: NodeJS.Timeout[] = [];

    timers.push(setTimeout(() => {
      setSteps(prev => prev.map(step => 
        step.id === "3" ? { ...step, status: "completed" as StepStatus, subtitle: "Node accepted" } : step
      ));
    }, 2000));

    timers.push(setTimeout(() => {
      setSteps(prev => prev.map(step => 
        step.id === "4" ? { ...step, status: "active" as StepStatus, subtitle: "Confirming on blockchain" } : step
      ));
    }, 2500));

    timers.push(setTimeout(() => {
      setSteps(prev => prev.map(step => 
        step.id === "4" ? { ...step, status: "completed" as StepStatus, subtitle: "Transaction confirmed" } : step
      ));
    }, 4500));

    timers.push(setTimeout(() => {
      onComplete();
    }, 5500));

    return () => timers.forEach(timer => clearTimeout(timer));
  }, [onComplete]);

  const getStepIcon = (status: StepStatus) => {
    if (status === "completed") {
      return (
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center"
          style={{ background: "#4ade80" }}
        >
          <Check className="w-5 h-5" style={{ color: "#022c22" }} />
        </div>
      );
    }
    if (status === "active") {
      return (
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center"
          style={{ background: "rgba(74, 222, 128, 0.2)", border: "2px solid #4ade80" }}
        >
          <Loader2 className="w-5 h-5 animate-spin" style={{ color: "#4ade80" }} />
        </div>
      );
    }
    return (
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center"
        style={{ background: "#1e293b", border: "2px solid #1e293b" }}
      >
        <div className="w-2 h-2 rounded-full" style={{ background: "#64748b" }} />
      </div>
    );
  };

  const getConnectorColor = (currentStatus: StepStatus, nextStatus: StepStatus) => {
    if (currentStatus === "completed" && nextStatus === "completed") return "#4ade80";
    if (currentStatus === "completed") return "rgba(74, 222, 128, 0.3)";
    return "rgba(30, 41, 59, 0.5)";
  };

  return (
    <div
      className="flex flex-col w-full"
      style={{ background: "#101D27", fontFamily: "Plus Jakarta Sans, sans-serif", height: "100dvh" }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-center px-6 pt-12 pb-6"
        style={{ borderBottom: "1px solid rgba(30, 41, 59, 0.3)" }}
      >
        <div className="flex items-center justify-between w-full max-w-[430px] md:max-w-[600px] lg:max-w-[800px]">
          <button
            onClick={onBack}
            className="w-10 h-10 rounded-full flex items-center justify-center opacity-50 cursor-not-allowed"
            style={{ background: "#1e293b", border: "1px solid #1e293b" }}
            disabled
          >
            <ArrowLeft className="w-6 h-6" style={{ color: "#f8fafc" }} />
          </button>

          <span className="text-xl font-bold" style={{ color: "#f8fafc" }}>
            Processing
          </span>

          <button
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{ background: "#1e293b", border: "1px solid #1e293b" }}
          >
            <Info className="w-6 h-6" style={{ color: "#4ade80" }} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto flex flex-col items-center justify-center gap-12 px-6 py-8 max-w-[430px] md:max-w-[600px] lg:max-w-[800px] mx-auto w-full">
        {/* Title Section */}
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="text-2xl font-bold" style={{ color: "#f8fafc" }}>
            Submitting Transaction...
          </span>
          <span className="text-base max-w-[280px]" style={{ color: "#94a3b8" }}>
            Please don't close the app or lock your screen while we process your request.
          </span>
        </div>

        {/* GFT Logo with Glow */}
        <div className="relative">
          <div
            className="absolute inset-0 rounded-full blur-xl"
            style={{
              background: "rgba(74, 222, 128, 0.2)",
              width: "160px",
              height: "160px",
              top: "-16px",
              left: "-16px",
            }}
          />
          <div
            className="relative w-32 h-32 rounded-full flex items-center justify-center"
            style={{
              background: "#0f172a",
              border: "4px solid #4ade80",
              boxShadow: "0 8px 25px -5px rgba(0, 0, 0, 0.1)",
            }}
          >
            <span
              className="text-4xl font-black tracking-tight"
              style={{ color: "#4ade80", letterSpacing: "-1.8px" }}
            >
              GFT
            </span>
          </div>
        </div>

        {/* Processing Steps Timeline */}
        <div className="flex flex-col w-full max-w-[382px]">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-start gap-4">
              {/* Step Icon and Connector */}
              <div className="flex flex-col items-center">
                {getStepIcon(step.status)}
                {index < steps.length - 1 && (
                  <div
                    className="w-0.5 h-10 transition-colors duration-500"
                    style={{
                      background: getConnectorColor(step.status, steps[index + 1].status),
                    }}
                  />
                )}
              </div>

              {/* Step Content */}
              <div className="flex flex-col gap-0.5 pb-6">
                <span
                  className="text-sm font-bold transition-colors duration-300"
                  style={{
                    color: step.status === "active" ? "#4ade80" : step.status === "completed" ? "#f8fafc" : "#94a3b8",
                  }}
                >
                  {step.title}
                </span>
                {step.subtitle && (
                  <span className="text-xs" style={{ color: "#94a3b8" }}>
                    {step.subtitle}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Transaction Info Card */}
        <div
          className="flex flex-col gap-3 p-5 rounded-2xl w-full max-w-[382px]"
          style={{ background: "#0f172a", border: "1px solid rgba(30, 41, 59, 0.5)" }}
        >
          <div className="flex items-center justify-between">
            <span
              className="text-xs font-bold uppercase tracking-wider"
              style={{ color: "#94a3b8", letterSpacing: "0.6px" }}
            >
              Transaction Type
            </span>
            <span className="text-sm font-bold" style={{ color: "#4ade80" }}>
              Staking GFT
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span
              className="text-xs font-bold uppercase tracking-wider"
              style={{ color: "#94a3b8", letterSpacing: "0.6px" }}
            >
              Network Fee
            </span>
            <span className="text-sm font-bold" style={{ color: "#f8fafc" }}>
              Free (SKALE)
            </span>
          </div>
        </div>
      </div>

      {/* Bottom Button */}
      <div
        className="px-6 py-6 pb-10"
        style={{
          background: "rgba(2, 6, 23, 0.8)",
          backdropFilter: "blur(6px)",
          borderTop: "1px solid rgba(30, 41, 59, 0.3)",
        }}
      >
        <button
          disabled
          className="w-full h-[68px] rounded-2xl font-bold text-lg flex items-center justify-center gap-3 cursor-not-allowed"
          style={{ background: "#1e293b", color: "#94a3b8" }}
        >
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Processing...</span>
        </button>
      </div>
    </div>
  );
}
