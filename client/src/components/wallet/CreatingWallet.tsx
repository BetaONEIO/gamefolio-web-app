import { useState, useEffect, useRef } from "react";

interface CreatingWalletProps {
  onBack?: () => void;
  onRetry?: () => void;
  onComplete?: () => void;
  isError?: boolean;
}

const steps = [
  { label: "Generating Seed Phrase", key: "seed" },
  { label: "Securing with Biometrics", key: "biometrics" },
  { label: "Finalizing Hub Access", key: "hub" },
];

export default function CreatingWallet({
  onBack,
  onRetry,
  onComplete,
  isError = false,
}: CreatingWalletProps) {
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const animationRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);

  const totalDuration = 10000;
  const stepDuration = totalDuration / steps.length;

  useEffect(() => {
    if (isError) return;

    startTimeRef.current = Date.now();
    let lastStepIndex = -1;

    const animate = () => {
      const elapsed = Date.now() - startTimeRef.current;
      const progressPercent = Math.min((elapsed / totalDuration) * 100, 100);
      
      setProgress(progressPercent);
      
      const stepIndex = Math.min(
        Math.floor(elapsed / stepDuration),
        steps.length - 1
      );
      
      if (stepIndex !== lastStepIndex) {
        lastStepIndex = stepIndex;
        setCurrentStep(stepIndex);
        if (stepIndex > 0) {
          const completed: number[] = [];
          for (let i = 0; i < stepIndex; i++) {
            completed.push(i);
          }
          setCompletedSteps(completed);
        }
      }

      if (elapsed < totalDuration) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setCompletedSteps([0, 1, 2]);
        setTimeout(() => {
          onComplete?.();
        }, 800);
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isError]);

  const circumference = 2 * Math.PI * 88;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div 
      className="w-full min-h-screen flex flex-col font-['Plus_Jakarta_Sans']"
      style={{ background: '#101D27' }}
    >
      {/* Header with back button */}
      <div className="flex items-center justify-between px-6 pt-12 pb-4">
        <button
          onClick={onBack}
          className="w-10 h-10 rounded-full flex items-center justify-center transition-all hover:bg-slate-700"
          style={{ background: '#1e293b', border: '1px solid #1e293b' }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M20 12H4M4 12L10 6M4 12L10 18" stroke="#F8FAFC" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <div className="w-10 h-10" />
      </div>

      {/* Main content - centered */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-8 max-w-[600px] mx-auto w-full">
        {/* Animated Icon with circular progress ring */}
        <div className="relative w-48 h-48 md:w-56 md:h-56 mb-8 flex items-center justify-center">
          {/* Glow effect - pulses based on progress */}
          <div 
            className="absolute inset-0 rounded-full transition-opacity duration-1000"
            style={{ 
              background: 'rgba(74, 222, 128, 0.2)',
              filter: 'blur(40px)',
              transform: 'scale(1.3)',
              opacity: 0.5 + (progress / 200)
            }}
          />
          
          {/* Background ring */}
          <svg 
            className="absolute inset-0 w-full h-full"
            viewBox="0 0 192 192"
          >
            <circle
              cx="96"
              cy="96"
              r="88"
              fill="none"
              stroke="rgba(74, 222, 128, 0.1)"
              strokeWidth="4"
            />
          </svg>

          {/* Animated progress ring */}
          <svg 
            className="absolute inset-0 w-full h-full"
            viewBox="0 0 192 192"
            style={{ transform: 'rotate(-90deg)' }}
          >
            <circle
              cx="96"
              cy="96"
              r="88"
              fill="none"
              stroke="#4ade80"
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              style={{ 
                transition: 'stroke-dashoffset 0.1s linear',
                filter: 'drop-shadow(0 0 10px #4ade80)'
              }}
            />
          </svg>

          {/* Inner decorative ring */}
          <div 
            className="absolute rounded-full"
            style={{ 
              width: '75%',
              height: '75%',
              border: '2px solid rgba(74, 222, 128, 0.15)'
            }}
          />

          {/* Center icon container */}
          <div 
            className="w-24 h-24 md:w-28 md:h-28 rounded-3xl flex items-center justify-center backdrop-blur-sm z-10"
            style={{ 
              background: 'rgba(20, 83, 45, 0.3)',
              border: '1px solid rgba(74, 222, 128, 0.3)',
              boxShadow: progress > 30 ? `0 0 ${20 + progress / 5}px rgba(74, 222, 128, ${0.2 + progress / 500})` : 'none',
              transition: 'box-shadow 0.5s ease'
            }}
          >
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path fillRule="evenodd" clipRule="evenodd" d="M6.756 10.164C6 11.24 6 14.44 6 20.834V23.982C6 35.258 14.478 40.732 19.798 43.054C21.24 43.684 21.962 44 24 44C26.04 44 26.76 43.684 28.202 43.054C33.522 40.73 42 35.26 42 23.982V20.834C42 14.438 42 11.24 41.244 10.164C40.49 9.09 37.484 8.06 31.47 6.002L30.324 5.61C27.19 4.536 25.624 4 24 4C22.376 4 20.81 4.536 17.676 5.61L16.53 6C10.516 8.06 7.51 9.09 6.756 10.164ZM27 30C27 31.1046 26.1046 32 25 32H23C21.8954 32 21 31.1046 21 30V26C21 24.8954 21.8954 24 23 24H25C26.1046 24 27 24.8954 27 26V30ZM24 14C20.6863 14 18 16.6863 18 20V24H30V20C30 16.6863 27.3137 14 24 14Z" fill="#4ADE80" />
            </svg>
          </div>
        </div>

        {/* Title */}
        <h1 
          className="text-2xl md:text-3xl font-bold text-center mb-3"
          style={{ color: '#fff' }}
        >
          Creating your secure wallet...
        </h1>

        {/* Description */}
        <p 
          className="text-center mb-8 max-w-[280px] md:max-w-[340px]"
          style={{ color: '#94a3b8', fontSize: '16px', lineHeight: '26px' }}
        >
          Encrypting your private keys and establishing a secure connection to the blockchain.
        </p>

        {/* Progress bar */}
        <div className="w-full max-w-[240px] md:max-w-[300px] mb-6">
          <div 
            className="h-1.5 rounded-full overflow-hidden"
            style={{ background: '#1e293b' }}
          >
            <div 
              className="h-full rounded-full"
              style={{ 
                width: `${progress}%`,
                background: 'linear-gradient(90deg, #4ade80 0%, #22c55e 100%)',
                boxShadow: '0 0 12px #4ade80',
                transition: 'width 0.1s linear'
              }}
            />
          </div>
        </div>

        {/* Steps */}
        <div className="flex flex-col gap-3 w-full max-w-[240px] md:max-w-[280px]">
          {steps.map((step, index) => {
            const isCompleted = completedSteps.includes(index);
            const isActive = index === currentStep && !isCompleted;
            const isPending = index > currentStep && !isCompleted;

            return (
              <div 
                key={step.key} 
                className="flex items-center gap-3 justify-center"
                style={{
                  opacity: isPending ? 0.4 : 1,
                  transition: 'opacity 0.3s ease, transform 0.3s ease',
                  transform: isActive ? 'scale(1.02)' : 'scale(1)'
                }}
              >
                {/* Step indicator */}
                <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
                  {isCompleted ? (
                    <svg 
                      width="20" 
                      height="20" 
                      viewBox="0 0 20 20" 
                      fill="none" 
                      xmlns="http://www.w3.org/2000/svg"
                      style={{
                        animation: 'popIn 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55)'
                      }}
                    >
                      <path fillRule="evenodd" clipRule="evenodd" d="M18.3334 10C18.3334 14.6025 14.6026 18.3333 10.0001 18.3333C5.39757 18.3333 1.66675 14.6025 1.66675 10C1.66675 5.39751 5.39757 1.66669 10.0001 1.66669C14.6026 1.66669 18.3334 5.39751 18.3334 10ZM13.3584 7.47501C13.6021 7.71902 13.6021 8.11432 13.3584 8.35834L9.19173 12.525C8.94772 12.7687 8.55241 12.7687 8.3084 12.525L6.64174 10.8583C6.47453 10.7025 6.4057 10.4679 6.46225 10.2464C6.5188 10.025 6.69172 9.85207 6.91316 9.79552C7.1346 9.73897 7.36918 9.8078 7.52507 9.97501L8.75007 11.2L12.475 7.47501C12.7191 7.23099 13.1144 7.23099 13.3584 7.47501Z" fill="#4ADE80" />
                    </svg>
                  ) : isActive ? (
                    <div 
                      className="w-2 h-2 rounded-full"
                      style={{ 
                        background: '#4ade80',
                        boxShadow: '0 0 8px #4ade80',
                        animation: 'pulse 1.5s ease-in-out infinite'
                      }}
                    />
                  ) : (
                    <div 
                      className="w-2 h-2 rounded-full"
                      style={{ background: '#64748b' }}
                    />
                  )}
                </div>
                
                {/* Step label */}
                <span 
                  className="text-sm font-medium"
                  style={{ 
                    color: isCompleted ? '#4ade80' : isActive ? '#f8fafc' : '#64748b',
                    transition: 'color 0.3s ease'
                  }}
                >
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 pb-12 pt-4 max-w-[600px] mx-auto w-full">
        {/* Retry button - only show on error */}
        {isError && (
          <button
            onClick={onRetry}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-bold mb-4 transition-all hover:bg-slate-700"
            style={{ 
              background: '#1e293b',
              border: '1px solid #1e293b',
              height: '58px'
            }}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M17.5 10C17.5 14.1421 14.1421 17.5 10 17.5C5.85786 17.5 2.5 14.1421 2.5 10C2.5 5.85786 5.85786 2.5 10 2.5C12.5 2.5 14.7 3.7 16.1 5.5M17.5 3V7H13.5" stroke="#F8FAFC" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span style={{ color: '#f8fafc', fontSize: '16px' }}>Retry Creation</span>
          </button>
        )}
        
        {/* Helper text */}
        <p 
          className="text-center text-xs"
          style={{ color: '#94a3b8' }}
        >
          This usually takes less than 30 seconds
        </p>
      </div>

      {/* CSS animations */}
      <style>{`
        @keyframes popIn {
          0% { transform: scale(0); opacity: 0; }
          60% { transform: scale(1.3); }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.3); opacity: 0.7; }
        }
      `}</style>
    </div>
  );
}
