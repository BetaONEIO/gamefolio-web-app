import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";

interface BuyGFTScreenProps {
  onBack: () => void;
  onContinue: (amount: number, gftAmount: number) => void;
  currentBalance?: number;
}

const presetAmounts = [5, 10, 25, 50, 100];
const GFT_RATE = 0.056;

export default function BuyGFTScreen({
  onBack,
  onContinue,
  currentBalance = 0,
}: BuyGFTScreenProps) {
  const { user } = useAuth();
  const [selectedAmount, setSelectedAmount] = useState(25);
  const [customAmount, setCustomAmount] = useState<number | null>(null);
  const [isCustom, setIsCustom] = useState(false);

  const displayAmount = isCustom && customAmount !== null ? customAmount : selectedAmount;
  const gftReceived = displayAmount / GFT_RATE;
  const balance = user?.gfTokenBalance || currentBalance;

  const handlePresetClick = (amount: number) => {
    setSelectedAmount(amount);
    setIsCustom(false);
    setCustomAmount(null);
  };

  const handleCustomClick = () => {
    setIsCustom(true);
    const input = prompt("Enter custom amount (£):");
    if (input) {
      const amount = parseFloat(input);
      if (!isNaN(amount) && amount > 0) {
        setCustomAmount(amount);
      } else {
        setIsCustom(false);
      }
    } else {
      setIsCustom(false);
    }
  };

  return (
    <div 
      className="w-full min-h-screen flex flex-col font-['Plus_Jakarta_Sans']"
      style={{ background: '#020617' }}
    >
      {/* Header */}
      <div 
        className="flex items-center justify-center px-6 pt-12 pb-6"
        style={{ borderBottom: '1px solid rgba(30, 41, 59, 0.3)' }}
      >
        <div className="flex items-center justify-between w-full max-w-[430px] md:max-w-[600px] lg:max-w-[800px]">
          <button
            onClick={onBack}
            className="w-10 h-10 rounded-full flex items-center justify-center transition-all hover:bg-slate-700"
            style={{ background: '#1e293b', border: '1px solid #1e293b' }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M20 12H4M4 12L10 6M4 12L10 18" stroke="#F8FAFC" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          
          <span className="text-xl font-bold" style={{ color: '#f8fafc' }}>
            Buy GFT
          </span>
          
          <div className="w-10 h-10" />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col px-6 py-6 max-w-[430px] md:max-w-[600px] lg:max-w-[800px] mx-auto w-full">
        {/* Purchase Amount Display */}
        <div className="flex flex-col items-center gap-4 mb-8">
          <span 
            className="text-sm font-medium uppercase tracking-wider"
            style={{ color: '#94a3b8', letterSpacing: '0.7px' }}
          >
            Purchase Amount
          </span>
          
          <div className="flex items-center justify-center gap-1">
            <span 
              className="text-3xl font-bold"
              style={{ color: '#94a3b8' }}
            >
              £
            </span>
            <span 
              className="text-6xl font-bold"
              style={{ color: '#fff' }}
            >
              {displayAmount.toFixed(2)}
            </span>
          </div>

          {/* GFT Receive Badge */}
          <div 
            className="flex items-center gap-2 px-4 py-2 rounded-full"
            style={{ 
              background: 'rgba(20, 83, 45, 0.2)',
              border: '1px solid rgba(74, 222, 128, 0.3)'
            }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path fillRule="evenodd" clipRule="evenodd" d="M1.48227 1.49756C1.31168 1.43821 1.12236 1.47526 0.986724 1.59452C0.851086 1.71378 0.790121 1.89681 0.827148 2.07358C0.864176 2.25036 0.993468 2.39353 1.16557 2.44834L1.34263 2.5078C1.7943 2.65814 2.09363 2.75903 2.31345 2.86125C2.52191 2.95814 2.61211 3.03631 2.66957 3.11649C2.72703 3.19667 2.77314 3.30624 2.79919 3.53475C2.82659 3.77595 2.82726 4.09132 2.82726 4.56771V6.35301C2.82726 7.26637 2.82726 8.00334 2.90543 8.58263C2.98561 9.18397 3.15933 9.69043 3.56155 10.0927C3.96311 10.4949 4.47024 10.6673 5.07158 10.7481C5.6502 10.8263 6.38717 10.8263 7.30053 10.8263H12.0143C12.2911 10.8263 12.5154 10.6019 12.5154 10.3252C12.5154 10.0484 12.2911 9.82406 12.0143 9.82406H7.33728C6.37848 9.82406 5.70966 9.82272 5.20454 9.75524C4.71478 9.68909 4.45487 9.56815 4.26979 9.38374C4.11278 9.22673 4.00253 9.01559 3.93171 8.65479H10.6934C11.3342 8.65479 11.6542 8.65479 11.9054 8.48909C12.1566 8.32339 12.2829 8.0294 12.5355 7.44009L12.8215 6.77194C13.3627 5.50914 13.6333 4.8784 13.3359 4.42807C13.0386 3.97774 12.3524 3.97774 10.9787 3.97774H3.82614C3.82428 3.79183 3.81381 3.6061 3.79474 3.42117C3.75799 3.09711 3.67715 2.79978 3.48271 2.53052C3.28828 2.26059 3.03171 2.08954 2.73639 1.95257C2.45777 1.82295 2.10432 1.70535 1.68605 1.56504L1.48227 1.49756Z" fill="#4ADE80" />
              <path fillRule="evenodd" clipRule="evenodd" d="M4.99875 11.9955C5.55226 11.9955 6.00097 12.4443 6.00097 12.9978C6.00097 13.5513 5.55226 14 4.99875 14C4.44523 14 3.99652 13.5513 3.99652 12.9978C3.99652 12.4443 4.44523 11.9955 4.99875 11.9955Z" fill="#4ADE80" />
              <path fillRule="evenodd" clipRule="evenodd" d="M11.0121 11.9955C11.5656 11.9955 12.0143 12.4443 12.0143 12.9978C12.0143 13.5513 11.5656 14 11.0121 14C10.4586 14 10.0099 13.5513 10.0099 12.9978C10.0099 12.4443 10.4586 11.9955 11.0121 11.9955Z" fill="#4ADE80" />
            </svg>
            <span className="text-sm font-bold" style={{ color: '#4ade80' }}>
              Receive ≈ {gftReceived.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} GFT
            </span>
          </div>
        </div>

        {/* Preset Amount Buttons */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {presetAmounts.map((amount) => {
            const isSelected = !isCustom && selectedAmount === amount;
            return (
              <button
                key={amount}
                onClick={() => handlePresetClick(amount)}
                className="h-14 rounded-2xl font-bold text-lg transition-all"
                style={{ 
                  background: isSelected ? '#4ade80' : '#1e293b',
                  border: `1px solid ${isSelected ? '#4ade80' : '#1e293b'}`,
                  color: isSelected ? '#022c22' : '#f8fafc',
                  boxShadow: isSelected ? '0 0 20px -5px #4ade80' : 'none'
                }}
              >
                £{amount}
              </button>
            );
          })}
          
          {/* Custom Amount Button */}
          <button
            onClick={handleCustomClick}
            className="h-14 rounded-2xl font-bold transition-all flex items-center justify-center"
            style={{ 
              background: isCustom ? '#4ade80' : '#1e293b',
              border: `1px solid ${isCustom ? '#4ade80' : '#1e293b'}`,
              color: isCustom ? '#022c22' : '#f8fafc',
              boxShadow: isCustom ? '0 0 20px -5px #4ade80' : 'none'
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path fillRule="evenodd" clipRule="evenodd" d="M21.9999 1.99982C23.1438 3.14391 23.1438 4.99865 21.9999 6.14275L21.472 6.67059C21.2801 6.62755 21.0908 6.5739 20.9048 6.50989C20.1159 6.2335 19.3999 5.78198 18.8105 5.18922C18.2177 4.59982 17.7662 3.88378 17.4898 3.09488C17.4262 2.9089 17.3729 2.71954 17.3302 2.52766L17.8569 1.99982C19.001 0.855916 20.8558 0.855916 21.9999 1.99982Z" fill={isCustom ? '#022c22' : '#F8FAFC'} />
              <path fillRule="evenodd" clipRule="evenodd" d="M14.9613 13.1814C14.5313 13.6113 14.3164 13.8263 14.079 14.0114C13.7993 14.2295 13.4967 14.4164 13.1766 14.5691C12.9052 14.6978 12.6168 14.7936 12.04 14.9862L8.99855 16.0004C8.71441 16.0956 8.40087 16.0217 8.18909 15.8097C7.97731 15.5977 7.90379 15.2841 7.99927 15.0001L9.01345 11.9597C9.20501 11.3829 9.30078 11.0945 9.43062 10.8231C9.58457 10.5017 9.77045 10.2009 9.98826 9.92065C10.1734 9.68334 10.3884 9.46837 10.8183 9.03737L16.0499 3.80683C16.4098 4.75005 16.9659 5.6061 17.6814 6.31834C18.3936 7.03381 19.2496 7.58988 20.1929 7.94976L14.9613 13.1814Z" fill={isCustom ? '#022c22' : '#F8FAFC'} />
              <path fillRule="evenodd" clipRule="evenodd" d="M20.536 20.536C22 19.07 22 16.714 22 12C22 10.452 22 9.158 21.948 8.066L15.586 14.428C15.235 14.78 14.971 15.044 14.674 15.275C14.3258 15.5478 13.9485 15.7812 13.549 15.971C13.209 16.133 12.855 16.251 12.383 16.408L9.451 17.385C8.64535 17.6536 7.75709 17.4439 7.15658 16.8434C6.55607 16.2429 6.34641 15.3547 6.615 14.549L7.592 11.617C7.749 11.145 7.867 10.791 8.029 10.451C8.22033 10.051 8.45233 9.676 8.725 9.326C8.956 9.029 9.22 8.766 9.572 8.414L15.934 2.052C14.842 2 13.548 2 12 2C7.286 2 4.929 2 3.464 3.464C2 4.93 2 7.286 2 12C2 16.714 2 19.071 3.464 20.535C4.93 22 7.286 22 12 22C16.714 22 19.071 22 20.535 20.535" fill={isCustom ? '#022c22' : '#F8FAFC'} />
            </svg>
          </button>
        </div>

        {/* Info Cards */}
        <div className="flex flex-col gap-4 mb-6">
          {/* Current Rate Card */}
          <div 
            className="flex items-center justify-between rounded-2xl px-4 py-4"
            style={{ 
              background: '#0f172a',
              border: '1px solid rgba(30, 41, 59, 0.5)'
            }}
          >
            <div className="flex items-center gap-3">
              <div 
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ background: '#1e293b' }}
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path fillRule="evenodd" clipRule="evenodd" d="M18.3334 9.99998C18.3334 14.6025 14.6026 18.3333 10.0001 18.3333C5.39758 18.3333 1.66675 14.6025 1.66675 9.99998C1.66675 5.39749 5.39758 1.66666 10.0001 1.66666C14.6026 1.66666 18.3334 5.39749 18.3334 9.99998ZM10.0001 14.7916C10.3453 14.7916 10.6251 14.5118 10.6251 14.1666V9.16665C10.6251 8.82147 10.3453 8.54165 10.0001 8.54165C9.6549 8.54165 9.37508 8.82147 9.37508 9.16665V14.1666C9.37508 14.5116 9.65508 14.7916 10.0001 14.7916ZM10.0001 5.83332C10.4603 5.83332 10.8334 6.20642 10.8334 6.66665C10.8334 7.12689 10.4603 7.49999 10.0001 7.49999C9.53984 7.49999 9.16674 7.12689 9.16674 6.66665C9.16674 6.20642 9.53984 5.83332 10.0001 5.83332Z" fill="#4ADE80" />
                </svg>
              </div>
              <div className="flex flex-col">
                <span className="text-xs uppercase" style={{ color: '#94a3b8' }}>Current Rate</span>
                <span className="text-base font-bold" style={{ color: '#fff' }}>1 GFT ≈ £{GFT_RATE} GBP</span>
              </div>
            </div>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="10" cy="10" r="9" stroke="#94A3B8" strokeWidth="1.25"/>
              <path d="M7 8L10 5L13 8M13 12L10 15L7 12" stroke="#94A3B8" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>

          {/* Available Balance Card */}
          <div 
            className="flex items-center gap-3 rounded-2xl px-4 py-4"
            style={{ 
              background: 'rgba(30, 41, 59, 0.3)',
              border: '1px solid rgba(30, 41, 59, 0.3)'
            }}
          >
            <div 
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(74, 222, 128, 0.1)' }}
            >
              <svg width="20" height="18" viewBox="0 0 18 15" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path fillRule="evenodd" clipRule="evenodd" d="M15.9166 4.16984C15.8694 4.16706 15.8191 4.16595 15.7658 4.1665H13.6616C11.9383 4.1665 10.4641 5.52317 10.4641 7.2915C10.4641 9.05984 11.9391 10.4165 13.6616 10.4165H15.7658C15.8191 10.4171 15.8697 10.4159 15.9174 10.4132C16.6501 10.369 17.2365 9.78864 17.2883 9.0565C17.2916 9.0065 17.2916 8.95234 17.2916 8.90234V5.68067C17.2916 5.63067 17.2916 5.5765 17.2883 5.5265C17.2365 4.79437 16.6492 4.21401 15.9166 4.16984ZM13.4774 8.12484C13.9208 8.12484 14.2799 7.7515 14.2799 7.2915C14.2799 6.8315 13.9208 6.45817 13.4774 6.45817C13.0333 6.45817 12.6741 6.8315 12.6741 7.2915C12.6741 7.7515 13.0333 8.12484 13.4774 8.12484Z" fill="#4ADE80" />
                <path fillRule="evenodd" clipRule="evenodd" d="M15.765 11.6667C15.8234 11.6643 15.8795 11.69 15.9158 11.7357C15.9522 11.7815 15.9646 11.8419 15.9491 11.8983C15.7825 12.4916 15.5166 12.9983 15.0908 13.4233C14.4666 14.0483 13.6758 14.3241 12.6991 14.4558C11.7492 14.5833 10.5367 14.5833 9.00499 14.5833H7.24499C5.71333 14.5833 4.49999 14.5833 3.55083 14.4558C2.57416 14.3241 1.78333 14.0475 1.15917 13.4241C0.535833 12.8 0.259166 12.0092 0.1275 11.0325C0 10.0825 0 8.86999 0 7.33832V7.24499C0 5.71333 0 4.49999 0.1275 3.54999C0.259166 2.57333 0.535833 1.7825 1.15917 1.15833C1.78333 0.534999 2.57416 0.258333 3.55083 0.126666C4.50083 0 5.71333 0 7.24499 0H9.00499C10.5367 0 11.75 0 12.6991 0.1275C13.6758 0.259166 14.4666 0.535833 15.0908 1.15917C15.5166 1.58583 15.7825 2.09166 15.9491 2.685C15.9646 2.74139 15.9522 2.80179 15.9158 2.84756C15.8795 2.89334 15.8234 2.91901 15.765 2.91666H13.6616C11.2975 2.91666 9.21415 4.78333 9.21415 7.29166C9.21415 9.79999 11.2975 11.6667 13.6616 11.6667H15.765ZM3.125 3.33333C2.77982 3.33333 2.5 3.61315 2.5 3.95833C2.5 4.30351 2.77982 4.58333 3.125 4.58333H6.45832C6.8035 4.58333 7.08332 4.30351 7.08332 3.95833C7.08332 3.61315 6.8035 3.33333 6.45832 3.33333H3.125Z" fill="#4ADE80" />
              </svg>
            </div>
            <div className="flex flex-col">
              <span className="text-xs uppercase" style={{ color: '#94a3b8' }}>Available Balance</span>
              <span className="text-base font-bold" style={{ color: '#fff' }}>
                {balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} GFT
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div 
        className="px-6 pb-10 pt-6"
        style={{ 
          background: '#020617',
          borderTop: '1px solid rgba(30, 41, 59, 0.3)'
        }}
      >
        <div className="max-w-[600px] mx-auto w-full flex flex-col gap-6">
          {/* Total to Pay */}
          <div className="flex items-center justify-between">
            <span className="text-base font-medium" style={{ color: '#94a3b8' }}>Total to Pay</span>
            <span className="text-2xl font-bold" style={{ color: '#fff' }}>£{displayAmount.toFixed(2)}</span>
          </div>

          {/* Continue Button */}
          <button
            onClick={() => onContinue(displayAmount, gftReceived)}
            className="w-full flex items-center justify-center gap-2 py-5 rounded-2xl font-bold text-lg transition-all hover:opacity-90"
            style={{ 
              background: '#4ade80',
              boxShadow: '0 0 30px -10px #4ade80'
            }}
          >
            <span style={{ color: '#022c22' }}>Continue to Payment</span>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M3.33325 9.99999H16.6666M16.6666 9.99999L11.6666 5M16.6666 9.99999L11.6666 15" stroke="#022C22" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
