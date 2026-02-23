import { useEffect } from "react";
import { useCrossmint } from "@/hooks/use-crossmint";

interface ReviewOrderScreenProps {
  onBack: () => void;
  onProceed: () => void;
  amount: number;
  gftAmount: number;
  walletAddress?: string;
  onChangeWallet?: () => void;
}

const GFT_RATE = 0.01;

export default function ReviewOrderScreen({
  onBack,
  onProceed,
  amount,
  gftAmount,
  walletAddress,
  onChangeWallet,
}: ReviewOrderScreenProps) {
  const { wallet } = useCrossmint();
  const displayAddress = walletAddress || wallet?.address || "";

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);
  
  const truncateAddress = (address: string) => {
    if (!address) return "";
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <div 
      className="w-full min-h-screen flex flex-col font-['Plus_Jakarta_Sans']"
      style={{ background: '#101D27' }}
    >
      {/* Header */}
      <div 
        className="flex items-center justify-between px-6 pt-12 pb-6"
        style={{ borderBottom: '1px solid rgba(30, 41, 59, 0.3)' }}
      >
        <button
          onClick={onBack}
          className="w-10 h-10 rounded-full flex items-center justify-center transition-all hover:bg-slate-700"
          style={{ background: '#1e293b', border: '1px solid #1e293b' }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M20 12H4M4 12L10 6M4 12L10 18" stroke="#F8FAFC" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        
        <span className="text-xl font-bold" style={{ color: '#fff' }}>
          Review Order
        </span>
        
        <div className="w-10 h-10" />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col px-6 py-8 max-w-[600px] mx-auto w-full">
        {/* You Will Receive Section */}
        <div className="flex flex-col items-center gap-4 mb-10">
          {/* GFT Icon */}
          <div 
            className="w-20 h-20 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(74, 222, 128, 0.1)' }}
          >
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path fillRule="evenodd" clipRule="evenodd" d="M29.2968 7.38666L25.9635 5.63666C23.0368 4.10166 21.5735 3.33333 20.0002 3.33333C18.4268 3.33333 16.9635 4.1 14.0368 5.63666L10.7035 7.38666C7.7485 8.93666 6.01016 9.85 4.9335 11.07L20.0002 18.6033L35.0668 11.07C33.9902 9.85 32.2535 8.93666 29.2968 7.38666Z" fill="#4ADE80" />
              <path fillRule="evenodd" clipRule="evenodd" d="M36.2468 13.2733L21.2502 20.7733V36.5067C22.4468 36.2083 23.8085 35.495 25.9635 34.3633L29.2968 32.6133C32.8818 30.7317 34.6752 29.7917 35.6718 28.1C36.6668 26.41 36.6668 24.305 36.6668 20.1V19.905C36.6668 16.75 36.6668 14.7767 36.2468 13.2733Z" fill="#4ADE80" />
              <path fillRule="evenodd" clipRule="evenodd" d="M18.7502 36.5067V20.7733L3.7535 13.2733C3.3335 14.7767 3.3335 16.75 3.3335 19.9017V20.0967C3.3335 24.305 3.3335 26.41 4.3285 28.1C5.32516 29.7917 7.1185 30.7333 10.7035 32.615L14.0368 34.3633C16.1918 35.495 17.5535 36.2083 18.7502 36.5067Z" fill="#4ADE80" />
            </svg>
          </div>
          
          <span 
            className="text-sm font-medium uppercase tracking-wider"
            style={{ color: '#94a3b8', letterSpacing: '1.4px' }}
          >
            You will receive
          </span>
          
          <div className="flex items-end gap-2">
            <span 
              className="text-5xl font-bold"
              style={{ color: '#fff' }}
            >
              {gftAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span 
              className="text-2xl font-bold pb-1"
              style={{ color: '#4ade80' }}
            >
              GFT
            </span>
          </div>
        </div>

        {/* Order Details Card */}
        <div 
          className="rounded-2xl p-5 mb-4"
          style={{ 
            background: '#0f172a',
            border: '1px solid rgba(30, 41, 59, 0.5)'
          }}
        >
          {/* Purchase Amount Row */}
          <div 
            className="flex items-center justify-between pb-4 mb-4"
            style={{ borderBottom: '1px solid rgba(30, 41, 59, 0.3)' }}
          >
            <div className="flex items-center gap-3">
              <div 
                className="w-10 h-10 rounded-2xl flex items-center justify-center"
                style={{ background: '#1e293b' }}
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path fillRule="evenodd" clipRule="evenodd" d="M6.87484 4.16666C4.944 4.17166 3.91067 4.21916 3.14817 4.72832C2.78405 4.97158 2.47143 5.2842 2.22817 5.64832C1.6665 6.48916 1.6665 7.65832 1.6665 9.99999C1.6665 12.3417 1.6665 13.5108 2.22817 14.3517C2.47143 14.7158 2.78405 15.0284 3.14817 15.2717C3.91067 15.7808 4.944 15.8283 6.87484 15.8333V12.4217C5.771 12.1363 4.99988 11.1405 4.99988 10.0004C4.99988 8.86029 5.771 7.86449 6.87484 7.57916L6.87484 4.16666Z" fill="#94A3B8" />
                  <path fillRule="evenodd" clipRule="evenodd" d="M8.12484 15.8333H11.8748V4.16666H8.12484V15.8333Z" fill="#94A3B8" />
                  <path fillRule="evenodd" clipRule="evenodd" d="M13.1248 4.16666V7.57916C14.2279 7.86507 14.9982 8.86049 14.9982 9.99999C14.9982 11.1395 14.2279 12.1349 13.1248 12.4208V15.8333C15.0557 15.8283 16.0898 15.7808 16.8515 15.2717C17.2156 15.0284 17.5282 14.7158 17.7715 14.3517C18.3332 13.5108 18.3332 12.3417 18.3332 9.99999C18.3332 7.65832 18.3332 6.48916 17.7715 5.64832C17.5282 5.2842 17.2156 4.97158 16.8515 4.72832C16.089 4.21916 15.0557 4.17082 13.1248 4.16666Z" fill="#94A3B8" />
                </svg>
              </div>
              <div className="flex flex-col">
                <span 
                  className="text-[10px] font-bold uppercase"
                  style={{ color: '#94a3b8', letterSpacing: '0.5px' }}
                >
                  Purchase Amount
                </span>
                <span className="text-base font-bold" style={{ color: '#fff' }}>
                  British Pound
                </span>
              </div>
            </div>
            <span className="text-lg font-bold" style={{ color: '#fff' }}>
              £{amount.toFixed(2)}
            </span>
          </div>

          {/* Fee Details */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className="text-sm" style={{ color: '#94a3b8' }}>Exchange Rate</span>
              <span className="text-sm font-bold" style={{ color: '#fff' }}>1 GFT ≈ £{GFT_RATE}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm" style={{ color: '#94a3b8' }}>Network Fee</span>
              <span className="text-sm font-bold" style={{ color: '#4ade80' }}>Free</span>
            </div>
            <div className="flex items-center justify-between pt-2">
              <span className="text-sm" style={{ color: '#94a3b8' }}>Service Fee</span>
              <span className="text-sm font-bold" style={{ color: '#fff' }}>£0.00</span>
            </div>
          </div>
        </div>

        {/* Destination Wallet Card */}
        <div 
          className="flex items-center justify-between rounded-2xl p-5 mb-4"
          style={{ 
            background: 'rgba(30, 41, 59, 0.3)',
            border: '1px solid rgba(30, 41, 59, 0.3)'
          }}
        >
          <div className="flex items-center gap-4">
            <div 
              className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(74, 222, 128, 0.1)' }}
            >
              <svg width="20" height="18" viewBox="0 0 18 15" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path fillRule="evenodd" clipRule="evenodd" d="M15.9169 4.16984C15.8696 4.16706 15.8194 4.16595 15.766 4.1665H13.6619C11.9385 4.1665 10.4644 5.52317 10.4644 7.2915C10.4644 9.05984 11.9394 10.4165 13.6619 10.4165H15.766C15.8194 10.4171 15.8699 10.4159 15.9177 10.4132C16.6503 10.369 17.2367 9.78864 17.2885 9.0565C17.2919 9.0065 17.2919 8.95234 17.2919 8.90234V5.68067C17.2919 5.63067 17.2919 5.5765 17.2885 5.5265C17.2367 4.79437 16.6495 4.21401 15.9169 4.16984ZM13.4777 8.12484C13.921 8.12484 14.2802 7.7515 14.2802 7.2915C14.2802 6.8315 13.921 6.45817 13.4777 6.45817C13.0335 6.45817 12.6744 6.8315 12.6744 7.2915C12.6744 7.7515 13.0335 8.12484 13.4777 8.12484Z" fill="#4ADE80" />
                <path fillRule="evenodd" clipRule="evenodd" d="M15.765 11.6667C15.8234 11.6643 15.8795 11.69 15.9158 11.7357C15.9522 11.7815 15.9646 11.8419 15.9491 11.8983C15.7825 12.4916 15.5166 12.9983 15.0908 13.4233C14.4666 14.0483 13.6758 14.3241 12.6991 14.4558C11.7492 14.5833 10.5367 14.5833 9.00499 14.5833H7.24499C5.71333 14.5833 4.49999 14.5833 3.55083 14.4558C2.57416 14.3241 1.78333 14.0475 1.15917 13.4241C0.535833 12.8 0.259166 12.0092 0.1275 11.0325C0 10.0825 0 8.86999 0 7.33832V7.24499C0 5.71333 0 4.49999 0.1275 3.54999C0.259166 2.57333 0.535833 1.7825 1.15917 1.15833C1.78333 0.534999 2.57416 0.258333 3.55083 0.126666C4.50083 0 5.71333 0 7.24499 0H9.00499C10.5367 0 11.75 0 12.6991 0.1275C13.6758 0.259166 14.4666 0.535833 15.0908 1.15917C15.5166 1.58583 15.7825 2.09166 15.9491 2.685C15.9646 2.74139 15.9522 2.80179 15.9158 2.84756C15.8795 2.89334 15.8234 2.91901 15.765 2.91666H13.6616C11.2975 2.91666 9.21415 4.78333 9.21415 7.29166C9.21415 9.79999 11.2975 11.6667 13.6616 11.6667H15.765ZM4.16666 10.4167C3.82148 10.4167 3.54166 10.1368 3.54166 9.79165V4.79166C3.54166 4.44648 3.82148 4.16666 4.16666 4.16666C4.51184 4.16666 4.79166 4.44648 4.79166 4.79166V9.79165C4.79166 10.1368 4.51184 10.4167 4.16666 10.4167Z" fill="#4ADE80" />
              </svg>
            </div>
            <div className="flex flex-col">
              <span 
                className="text-[10px] font-bold uppercase"
                style={{ color: '#94a3b8', letterSpacing: '0.5px' }}
              >
                Destination Wallet
              </span>
              <span 
                className="text-sm font-bold font-['JetBrains_Mono']"
                style={{ color: '#fff' }}
              >
                {truncateAddress(displayAddress)}
              </span>
              <span className="text-xs" style={{ color: '#94a3b8' }}>
                GFT Mainnet Address
              </span>
            </div>
          </div>
          {onChangeWallet && (
            <button
              onClick={onChangeWallet}
              className="px-3 py-1 rounded-xl text-xs font-bold transition-all hover:opacity-80"
              style={{ 
                background: 'rgba(74, 222, 128, 0.1)',
                color: '#4ade80'
              }}
            >
              Change
            </button>
          )}
        </div>

        {/* Info Banner */}
        <div 
          className="flex items-center gap-3 rounded-2xl px-4 py-4"
          style={{ 
            background: 'rgba(20, 83, 45, 0.1)',
            border: '1px solid rgba(74, 222, 128, 0.2)'
          }}
        >
          <svg width="15" height="20" viewBox="0 0 15 20" fill="none" xmlns="http://www.w3.org/2000/svg" className="flex-shrink-0">
            <path fillRule="evenodd" clipRule="evenodd" d="M1.9749 5.95547C1.75391 6.27001 1.75391 7.20542 1.75391 9.0745V9.99472C1.75391 13.2909 4.23218 14.891 5.78731 15.5698C6.20883 15.754 6.41988 15.8463 7.01562 15.8463C7.61195 15.8463 7.82242 15.754 8.24394 15.5698C9.79907 14.8905 12.2773 13.2915 12.2773 9.99472V9.0745C12.2773 7.20484 12.2773 6.27001 12.0564 5.95547C11.8359 5.64152 10.9572 5.34044 9.19924 4.73885L8.86424 4.62426C7.94812 4.31031 7.49035 4.15363 7.01562 4.15363C6.5409 4.15363 6.08313 4.31031 5.16701 4.62426L4.83201 4.73826C3.07401 5.34044 2.19531 5.64152 1.9749 5.95547ZM8.80461 9.12303C8.90894 9.00606 8.94294 8.84232 8.89381 8.69348C8.84468 8.54464 8.71988 8.43332 8.56642 8.40146C8.41296 8.36959 8.25415 8.42201 8.14982 8.53898L6.38948 10.5115L5.88085 9.9421C5.71902 9.76328 5.44317 9.74872 5.26341 9.9095C5.08366 10.0703 5.06749 10.3461 5.22723 10.5267L6.06208 11.4622C6.14528 11.5553 6.26427 11.6086 6.38919 11.6086C6.51411 11.6086 6.6331 11.5553 6.71629 11.4622L8.80461 9.12303Z" fill="#4ADE80" />
          </svg>
          <span className="text-xs leading-relaxed" style={{ color: '#94a3b8' }}>
            The GFT tokens will be sent instantly to your wallet once the payment is confirmed.
          </span>
        </div>
      </div>

      {/* Footer */}
      <div 
        className="px-6 pb-24 pt-6"
        style={{ 
          background: '#101D27',
          borderTop: '1px solid rgba(30, 41, 59, 0.3)'
        }}
      >
        <div className="max-w-[600px] mx-auto w-full flex flex-col gap-6">
          {/* Total to Pay */}
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-1">
              <span className="text-sm font-medium" style={{ color: '#94a3b8' }}>Total to Pay</span>
              <span className="text-xs font-bold" style={{ color: '#4ade80' }}>Includes all taxes</span>
            </div>
            <span className="text-3xl font-bold" style={{ color: '#fff' }}>£{amount.toFixed(2)}</span>
          </div>

          {/* Proceed Button */}
          <button
            onClick={onProceed}
            className="w-full flex items-center justify-center gap-2 py-5 rounded-2xl font-bold text-lg transition-all hover:opacity-90"
            style={{ 
              background: '#4ade80',
              boxShadow: '0 0 30px -10px #4ade80'
            }}
          >
            <span style={{ color: '#022c22' }}>Proceed to Payment</span>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M3.3335 9.99999H16.6668M16.6668 9.99999L11.6668 5M16.6668 9.99999L11.6668 15" stroke="#022C22" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
