import { useState } from "react";
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
  onProfileClick?: () => void;
  onActivityClick?: () => void;
  isLoadingBalance?: boolean;
}

export default function WalletHomepage({
  onChainBalance = "0",
  offChainBalance = 0,
  walletAddress = "",
  fiatValue,
  onBuyClick,
  onStakeClick,
  onSettingsClick,
  onProfileClick,
  onActivityClick,
}: WalletHomepageProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<"portfolio" | "staking">("portfolio");

  const totalBalance = parseFloat(onChainBalance) + offChainBalance;
  const estimatedFiat = fiatValue ?? totalBalance * 0.056;

  const transactions: Transaction[] = [
    {
      id: "1",
      type: "received",
      title: "Received GFT",
      subtitle: "From: 0x82...124",
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

  return (
    <div className="w-full min-h-screen font-['Plus_Jakarta_Sans']" style={{ background: '#020617' }}>
      {/* Header Section with Gradient */}
      <div 
        className="w-full"
        style={{ 
          background: 'linear-gradient(180deg, rgba(20, 83, 45, 0.2) 0%, #020617 100%)',
          borderBottom: '1px solid rgba(30, 41, 59, 0.3)'
        }}
      >
        <div className="flex flex-col items-center gap-6 px-4 md:px-6 pt-8 md:pt-12 pb-6 md:pb-8 max-w-[1200px] mx-auto">
          {/* Top Row: Profile - Title - Settings */}
          <div className="flex items-center justify-between w-full max-w-[430px] md:max-w-full">
            <button
              onClick={onProfileClick}
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ background: '#1e293b', border: '1px solid #1e293b' }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path fillRule="evenodd" clipRule="evenodd" d="M8 6C8 3.79086 9.79086 2 12 2C14.2091 2 16 3.79086 16 6C16 8.20914 14.2091 10 12 10C9.79086 10 8 8.20914 8 6Z" fill="#4ADE80" />
                <path fillRule="evenodd" clipRule="evenodd" d="M20 17.5C20 19.985 20 22 12 22C4 22 4 19.985 4 17.5C4 15.015 7.582 13 12 13C16.418 13 20 15.015 20 17.5Z" fill="#4ADE80" />
              </svg>
            </button>
            
            <span 
              className="text-xl font-bold"
              style={{ color: '#f8fafc' }}
            >
              Wallet Hub
            </span>
            
            <button
              onClick={onSettingsClick}
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ background: '#1e293b', border: '1px solid #1e293b' }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path fillRule="evenodd" clipRule="evenodd" d="M14.2618 2.152C13.8918 2 13.4218 2 12.4828 2C11.5438 2 11.0748 2 10.7038 2.152C10.2107 2.35346 9.81839 2.74326 9.61376 3.235C9.51976 3.458 9.48376 3.719 9.46876 4.098C9.45425 4.65602 9.15347 5.16726 8.67276 5.451C8.18243 5.72355 7.58682 5.72657 7.09376 5.459C6.75576 5.281 6.51076 5.183 6.26876 5.151C5.73934 5.08192 5.20402 5.2242 4.77876 5.547C4.46076 5.789 4.22576 6.193 3.75676 7C3.28676 7.807 3.05276 8.21 2.99976 8.605C2.92976 9.131 3.07376 9.663 3.39976 10.084C3.54776 10.276 3.75676 10.437 4.07976 10.639C4.55676 10.936 4.86276 11.442 4.86276 12C4.86276 12.558 4.55676 13.064 4.08076 13.36C3.75676 13.563 3.54776 13.724 3.39876 13.916C3.07474 14.3365 2.9312 14.8686 2.99976 15.395C3.05276 15.789 3.28676 16.193 3.75676 17C4.22676 17.807 4.46076 18.21 4.77876 18.453C5.20276 18.776 5.73876 18.918 6.26876 18.849C6.51076 18.817 6.75576 18.719 7.09376 18.541C7.58708 18.2731 8.18317 18.2761 8.67376 18.549C9.15976 18.829 9.44776 19.344 9.46876 19.902C9.48376 20.282 9.51976 20.542 9.61376 20.765C9.81776 21.255 10.2098 21.645 10.7038 21.848C11.0738 22 11.5438 22 12.4828 22C13.4218 22 13.8918 22 14.2618 21.848C14.7548 21.6465 15.1471 21.2567 15.3518 20.765C15.4458 20.542 15.4818 20.282 15.4968 19.902C15.5168 19.344 15.8058 18.828 16.2928 18.549C16.7831 18.2765 17.3787 18.2734 17.8718 18.541C18.2098 18.719 18.4548 18.817 18.6968 18.849C19.2268 18.919 19.7628 18.776 20.1868 18.453C20.5048 18.211 20.7398 17.807 21.2088 17C21.6788 16.193 21.9128 15.79 21.9658 15.395C22.034 14.8684 21.8901 14.3364 21.5658 13.916C21.4178 13.724 21.2088 13.563 20.8858 13.361C20.4088 13.064 20.1028 12.558 20.1028 12C20.1028 11.442 20.4088 10.936 20.8848 10.64C21.2088 10.437 21.4178 10.276 21.5668 10.084C21.8908 9.66349 22.0343 9.13142 21.9658 8.605C21.9128 8.211 21.6788 7.807 21.2088 7C20.7388 6.193 20.5048 5.79 20.1868 5.547C19.7615 5.2242 19.2262 5.08192 18.6968 5.151C18.4548 5.183 18.2098 5.281 17.8718 5.459C17.3784 5.72693 16.7823 5.72391 16.2918 5.451C15.8058 5.168 15.5168 4.656 15.4968 4.098C15.4818 3.718 15.4458 3.458 15.3518 3.235C15.1471 2.74326 14.7548 2.35346 14.2618 2.152ZM12.4828 15C14.14 15 15.4828 13.6569 15.4828 12C15.4828 10.3431 14.14 9 12.4828 9C10.8256 9 9.48276 10.3431 9.48276 12C9.48276 13.6569 10.8256 15 12.4828 15Z" fill="#4ADE80" />
              </svg>
            </button>
          </div>

          {/* Balance Section - Responsive */}
          <div className="flex flex-col items-center gap-1 w-full">
            <span 
              className="text-sm font-medium uppercase tracking-wider"
              style={{ color: '#94a3b8', letterSpacing: '0.7px' }}
            >
              Total Balance
            </span>
            <div className="flex items-baseline justify-center gap-2">
              <span 
                className="text-3xl md:text-4xl font-bold"
                style={{ color: '#fff' }}
              >
                {totalBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span 
                className="text-lg md:text-xl font-bold"
                style={{ color: '#4ade80' }}
              >
                GFT
              </span>
            </div>
            <span 
              className="text-base md:text-lg"
              style={{ color: '#94a3b8' }}
            >
              ≈ £{estimatedFiat.toFixed(2)} GBP
            </span>
          </div>
        </div>
      </div>

      {/* Main Content - Desktop 3-column, Mobile single column */}
      <div className="max-w-[1200px] mx-auto px-4 md:px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column - Balance Card & Actions */}
          <div className="lg:col-span-1 flex flex-col gap-6">
            {/* Wallet Status Card */}
            <div 
              className="rounded-2xl p-5 flex flex-col gap-4"
              style={{ 
                background: '#0f172a',
                border: '1px solid rgba(30, 41, 59, 0.5)'
              }}
            >
              {/* Status Row */}
              <div className="flex items-start justify-between">
                <div className="flex flex-col gap-1">
                  <span 
                    className="text-xs uppercase tracking-wide"
                    style={{ color: '#94a3b8', letterSpacing: '0.3px' }}
                  >
                    Wallet Status
                  </span>
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-2 h-2 rounded-full"
                      style={{ background: '#4ade80' }}
                    />
                    <span style={{ color: '#fff', fontSize: '16px' }}>Active Wallet</span>
                  </div>
                </div>
                
                {/* SKALE Network Badge */}
                <div 
                  className="flex items-center gap-1.5 px-3 py-1 rounded-full"
                  style={{ 
                    background: 'rgba(20, 83, 45, 0.2)',
                    border: '1px solid rgba(74, 222, 128, 0.3)'
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path fillRule="evenodd" clipRule="evenodd" d="M1.9705 2.96449C1.75 3.27832 1.75 4.21166 1.75 6.07657V6.99474C1.75 10.2836 4.22275 11.8802 5.77442 12.5574C6.195 12.7412 6.40558 12.8333 7 12.8333C7.595 12.8333 7.805 12.7412 8.22558 12.5574C9.77725 11.8796 12.25 10.2842 12.25 6.99474V6.07657C12.25 4.21107 12.25 3.27832 12.0295 2.96449C11.8096 2.65124 10.9328 2.35082 9.17875 1.75057L8.8445 1.63624C7.93042 1.32299 7.47367 1.16666 7 1.16666C6.52633 1.16666 6.06958 1.32299 5.1555 1.63624L4.82125 1.74999C3.06717 2.35082 2.19042 2.65124 1.9705 2.96449ZM8.785 6.12499C8.8891 6.00828 8.92303 5.84491 8.874 5.6964C8.82498 5.5479 8.70046 5.43682 8.54734 5.40503C8.39422 5.37323 8.23576 5.42553 8.13167 5.54224L6.37525 7.51041L5.86775 6.94224C5.70629 6.76382 5.43104 6.74929 5.25169 6.90971C5.07234 7.07014 5.0562 7.34529 5.21558 7.52557L6.04858 8.45891C6.13159 8.55189 6.25032 8.60506 6.37496 8.60506C6.4996 8.60506 6.61833 8.55189 6.70133 8.45891L8.785 6.12499Z" fill="#4ADE80" />
                  </svg>
                  <span 
                    className="text-xs font-bold uppercase"
                    style={{ color: '#4ade80', fontSize: '10px' }}
                  >
                    SKALE Network
                  </span>
                </div>
              </div>

              {/* Wallet Address Card */}
              <div 
                className="flex items-center justify-between rounded-2xl px-4 py-3"
                style={{ 
                  background: 'rgba(2, 6, 23, 0.5)',
                  border: '1px solid #1e293b'
                }}
              >
                <div className="flex flex-col gap-0.5">
                  <span 
                    className="text-xs uppercase"
                    style={{ color: '#94a3b8', fontSize: '10px' }}
                  >
                    Wallet Address
                  </span>
                  <span 
                    className="font-mono text-sm font-medium"
                    style={{ color: '#f8fafc', fontFamily: 'JetBrains Mono, monospace', fontSize: '14px' }}
                  >
                    {shortenAddress(walletAddress)}
                  </span>
                </div>
                <button
                  onClick={handleCopyAddress}
                  className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-white/5 transition-colors"
                >
                  {copied ? (
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M4 10L8 14L16 6" stroke="#4ADE80" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path fillRule="evenodd" clipRule="evenodd" d="M12.7 1.66666H9.455C7.985 1.66666 6.82 1.66666 5.90917 1.78999C4.97083 1.91666 4.21167 2.18332 3.61333 2.78416C3.01417 3.38499 2.74833 4.14749 2.6225 5.08916C2.5 6.00416 2.5 7.17332 2.5 8.64916V13.5142C2.5 14.7708 3.26667 15.8475 4.35583 16.2992C4.3 15.5408 4.3 14.4783 4.3 13.5933V9.41832C4.3 8.35082 4.3 7.42999 4.39833 6.69332C4.50417 5.90332 4.7425 5.14666 5.35417 4.53249C5.96583 3.91832 6.72 3.67916 7.50667 3.57249C8.24 3.47416 9.15667 3.47416 10.2208 3.47416H12.7792C13.8425 3.47416 14.7575 3.47416 15.4917 3.57249C15.0416 2.42354 13.934 1.66735 12.7 1.66666Z" fill="#4ADE80" />
                      <path fillRule="evenodd" clipRule="evenodd" d="M5.5 9.49751C5.5 7.22584 5.5 6.09001 6.20333 5.38418C6.90583 4.67834 8.03667 4.67834 10.3 4.67834H12.7C14.9625 4.67834 16.0942 4.67834 16.7975 5.38418C17.5008 6.09001 17.5 7.22584 17.5 9.49751V13.5142C17.5 15.7858 17.5 16.9217 16.7975 17.6275C16.0942 18.3333 14.9625 18.3333 12.7 18.3333H10.3C8.0375 18.3333 6.90583 18.3333 6.20333 17.6275C5.5 16.9217 5.5 15.7858 5.5 13.5142L5.5 9.49751Z" fill="#4ADE80" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4">
              <button
                onClick={onBuyClick}
                className="flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl font-bold transition-all hover:shadow-lg"
                style={{ 
                  background: '#4ade80',
                  boxShadow: '0 0 20px -5px #4ade80',
                  height: '58px'
                }}
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path fillRule="evenodd" clipRule="evenodd" d="M1.85259 1.87198C1.63936 1.7978 1.40271 1.8441 1.23316 1.99318C1.06361 2.14226 0.987407 2.37104 1.03369 2.59201C1.07998 2.81298 1.24159 2.99195 1.45671 3.06045L1.67804 3.13478C2.24262 3.3227 2.61679 3.44881 2.89156 3.5766C3.15214 3.6977 3.26489 3.79541 3.33672 3.89564C3.40854 3.99586 3.46617 4.13283 3.49874 4.41846C3.53299 4.71997 3.53382 5.11418 3.53382 5.70966V7.94128C3.53382 9.08298 3.53382 10.0042 3.63154 10.7283C3.73176 11.48 3.94891 12.113 4.45169 12.6158C4.95364 13.1186 5.58755 13.3341 6.33922 13.4351C7.06249 13.5329 7.9837 13.5329 9.1254 13.5329H15.0176C15.3636 13.5329 15.644 13.2524 15.644 12.9065C15.644 12.5605 15.3636 12.2801 15.0176 12.2801H9.17134C7.97284 12.2801 7.13682 12.2784 6.50542 12.1941C5.89323 12.1114 5.56834 11.9602 5.33699 11.7297C5.14072 11.5334 5.00292 11.2695 4.91439 10.8185H13.3665C14.1674 10.8185 14.5675 10.8185 14.8815 10.6114C15.1955 10.4043 15.3534 10.0368 15.6691 9.30013L16.0266 8.46495C16.7031 6.88644 17.0413 6.09803 16.6696 5.53511C16.298 4.97219 15.4402 4.97219 13.7231 4.97219H4.78243C4.7801 4.73981 4.76701 4.50765 4.74317 4.27648C4.69724 3.87142 4.59618 3.49976 4.35314 3.16318C4.1101 2.82576 3.78939 2.61195 3.42024 2.44074C3.07196 2.27871 2.63015 2.13172 2.10732 1.95633L1.85259 1.87198Z" fill="#022C22" />
                  <path fillRule="evenodd" clipRule="evenodd" d="M6.24818 14.9944C6.94007 14.9944 7.50096 15.5553 7.50096 16.2472C7.50096 16.9391 6.94007 17.5 6.24818 17.5C5.55629 17.5 4.9954 16.9391 4.9954 16.2472C4.9954 15.5553 5.55629 14.9944 6.24818 14.9944Z" fill="#022C22" />
                  <path fillRule="evenodd" clipRule="evenodd" d="M13.7649 14.9944C14.4568 14.9944 15.0176 15.5553 15.0176 16.2472C15.0176 16.9391 14.4568 17.5 13.7649 17.5C13.073 17.5 12.5121 16.9391 12.5121 16.2472C12.5121 15.5553 13.073 14.9944 13.7649 14.9944Z" fill="#022C22" />
                </svg>
                <span style={{ color: '#022c22', fontSize: '16px' }}>Buy GFT</span>
              </button>
              
              <button
                onClick={onStakeClick}
                className="flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl font-bold transition-all hover:bg-slate-700"
                style={{ 
                  background: '#1e293b',
                  border: '1px solid #1e293b',
                  height: '58px'
                }}
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path fillRule="evenodd" clipRule="evenodd" d="M10.0001 18.3333C8.84731 18.3333 7.76398 18.1145 6.75009 17.6767C5.7362 17.2389 4.85425 16.6453 4.10425 15.8958C3.35425 15.1464 2.76064 14.2644 2.32342 13.25C1.88619 12.2356 1.6673 11.1522 1.66675 10C1.66619 8.84778 1.88508 7.76444 2.32342 6.75C2.76175 5.73555 3.35536 4.8536 4.10425 4.10416C4.85314 3.35471 5.73509 2.7611 6.75009 2.32332C7.76509 1.88555 8.84842 1.66666 10.0001 1.66666C11.1518 1.66666 12.2351 1.88555 13.2501 2.32332C14.2651 2.7611 15.147 3.35471 15.8959 4.10416C16.6448 4.8536 17.2387 5.73555 17.6776 6.75C18.1165 7.76444 18.3351 8.84778 18.3334 10C18.3318 11.1522 18.1129 12.2356 17.6768 13.25C17.2407 14.2644 16.647 15.1464 15.8959 15.8958C15.1448 16.6453 14.2629 17.2392 13.2501 17.6775C12.2373 18.1158 11.154 18.3345 10.0001 18.3333Z" fill="#4ADE80" />
                </svg>
                <span style={{ color: '#f8fafc', fontSize: '16px' }}>Stake GFT</span>
              </button>
            </div>

            {/* Quick Stats - Desktop only sidebar item */}
            <div 
              className="hidden lg:flex rounded-2xl p-5 flex-col gap-4"
              style={{ 
                background: '#0f172a',
                border: '1px solid rgba(30, 41, 59, 0.5)'
              }}
            >
              <span className="text-lg font-bold" style={{ color: '#f8fafc' }}>Quick Stats</span>
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span style={{ color: '#94a3b8', fontSize: '14px' }}>Portfolio Value</span>
                  <span style={{ color: '#fff', fontSize: '14px', fontWeight: 600 }}>£{estimatedFiat.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span style={{ color: '#94a3b8', fontSize: '14px' }}>Staked Amount</span>
                  <span style={{ color: '#fff', fontSize: '14px', fontWeight: 600 }}>0 GFT</span>
                </div>
                <div className="flex items-center justify-between">
                  <span style={{ color: '#94a3b8', fontSize: '14px' }}>NFTs Owned</span>
                  <span style={{ color: '#fff', fontSize: '14px', fontWeight: 600 }}>0</span>
                </div>
              </div>
            </div>
          </div>

          {/* Center Column - Portfolio/Staking Tabs */}
          <div className="lg:col-span-1 flex flex-col gap-6">
            {/* Tab Switcher */}
            <div 
              className="flex rounded-2xl p-1"
              style={{ background: '#0f172a' }}
            >
              <button
                onClick={() => setActiveTab("portfolio")}
                className="flex-1 py-3 rounded-xl font-semibold transition-all"
                style={{ 
                  background: activeTab === "portfolio" ? '#1e293b' : 'transparent',
                  color: activeTab === "portfolio" ? '#fff' : '#94a3b8'
                }}
              >
                Portfolio
              </button>
              <button
                onClick={() => setActiveTab("staking")}
                className="flex-1 py-3 rounded-xl font-semibold transition-all"
                style={{ 
                  background: activeTab === "staking" ? '#1e293b' : 'transparent',
                  color: activeTab === "staking" ? '#fff' : '#94a3b8'
                }}
              >
                Staking
              </button>
            </div>

            {/* Tab Content */}
            {activeTab === "portfolio" && (
              <div 
                className="rounded-2xl p-5 flex flex-col gap-4"
                style={{ 
                  background: '#0f172a',
                  border: '1px solid rgba(30, 41, 59, 0.5)'
                }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold" style={{ color: '#f8fafc' }}>NFTs</span>
                  <button style={{ color: '#4ade80', fontSize: '14px' }}>View All</button>
                </div>
                <div 
                  className="flex flex-col items-center justify-center py-12 rounded-xl"
                  style={{ background: 'rgba(2, 6, 23, 0.5)', border: '1px solid #1e293b' }}
                >
                  <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path fillRule="evenodd" clipRule="evenodd" d="M24 44C35.0457 44 44 35.0457 44 24C44 12.9543 35.0457 4 24 4C12.9543 4 4 12.9543 4 24C4 35.0457 12.9543 44 24 44ZM24 18C24.5523 18 25 18.4477 25 19V23H29C29.5523 23 30 23.4477 30 24C30 24.5523 29.5523 25 29 25H25V29C25 29.5523 24.5523 30 24 30C23.4477 30 23 29.5523 23 29V25H19C18.4477 25 18 24.5523 18 24C18 23.4477 18.4477 23 19 23H23V19C23 18.4477 23.4477 18 24 18Z" fill="#1e293b" />
                  </svg>
                  <span className="mt-3" style={{ color: '#94a3b8', fontSize: '14px' }}>No NFTs yet</span>
                  <span style={{ color: '#64748b', fontSize: '12px' }}>Purchase NFT avatars from the store</span>
                </div>
              </div>
            )}

            {activeTab === "staking" && (
              <div 
                className="rounded-2xl p-5 flex flex-col gap-4"
                style={{ 
                  background: '#0f172a',
                  border: '1px solid rgba(30, 41, 59, 0.5)'
                }}
              >
                <span className="text-lg font-bold" style={{ color: '#f8fafc' }}>Staking</span>
                <div 
                  className="flex flex-col items-center justify-center py-12 rounded-xl"
                  style={{ background: 'rgba(2, 6, 23, 0.5)', border: '1px solid #1e293b' }}
                >
                  <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path fillRule="evenodd" clipRule="evenodd" d="M24 44C35.0457 44 44 35.0457 44 24C44 12.9543 35.0457 4 24 4C12.9543 4 4 12.9543 4 24C4 35.0457 12.9543 44 24 44Z" fill="#1e293b" />
                  </svg>
                  <span className="mt-3" style={{ color: '#94a3b8', fontSize: '14px' }}>No staking positions</span>
                  <span style={{ color: '#64748b', fontSize: '12px' }}>Stake your GFT to earn rewards</span>
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Transaction History */}
          <div className="lg:col-span-1 flex flex-col gap-6">
            <div 
              className="rounded-2xl p-5 flex flex-col gap-4"
              style={{ 
                background: '#0f172a',
                border: '1px solid rgba(30, 41, 59, 0.5)'
              }}
            >
              <div className="flex items-center justify-between">
                <span className="text-lg font-bold" style={{ color: '#f8fafc' }}>Recent Activity</span>
                <button 
                  onClick={onActivityClick}
                  className="hover:opacity-80 transition-opacity"
                  style={{ color: '#4ade80', fontSize: '14px', fontWeight: 600 }}
                >
                  View All
                </button>
              </div>

              <div className="flex flex-col gap-4">
                {transactions.map((tx) => (
                  <div 
                    key={tx.id}
                    className="flex items-center gap-4"
                  >
                    {/* Transaction Icon */}
                    <div 
                      className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                      style={{ background: '#1e293b', border: '1px solid #1e293b' }}
                    >
                      {tx.type === "received" && (
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path fillRule="evenodd" clipRule="evenodd" d="M18.7313 6.34474C19.0108 6.04476 19.0026 5.57727 18.7126 5.28733C18.4227 4.99739 17.9552 4.98914 17.6552 5.26868L10.5796 12.3443L6.5494 8.31415C6.33166 8.09668 6.00442 8.03168 5.7201 8.1494C5.43577 8.26713 5.25027 8.54445 5.25 8.85219V17.9886C5.25 18.4089 5.59109 18.75 6.01137 18.75H15.1478C15.4555 18.7497 15.7328 18.5642 15.8506 18.2799C15.9683 17.9956 15.9033 17.6683 15.6858 17.4506L11.6556 13.4204L18.7313 6.34474Z" fill="#4ADE80" />
                        </svg>
                      )}
                      {tx.type === "staked" && (
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path fillRule="evenodd" clipRule="evenodd" d="M12 22C10.6167 22 9.31667 21.7373 8.1 21.212C6.88333 20.6867 5.825 19.9743 4.925 19.075C4.025 18.1757 3.31267 17.1173 2.788 15.9C2.26333 14.6827 2.00067 13.3827 2 12C1.99933 10.6173 2.262 9.31733 2.788 8.1C3.314 6.88267 4.02633 5.82433 4.925 4.925C5.82367 4.02567 6.882 3.31333 8.1 2.788C9.318 2.26267 10.618 2 12 2C13.382 2 14.682 2.26267 15.9 2.788C17.118 3.31333 18.1763 4.02567 19.075 4.925C19.9737 5.82433 20.6863 6.88267 21.213 8.1C21.7397 9.31733 22.002 10.6173 22 12C21.998 13.3827 21.7353 14.6827 21.212 15.9C20.6887 17.1173 19.9763 18.1757 19.075 19.075C18.1737 19.9743 17.1153 20.687 15.9 21.213C14.6847 21.739 13.3847 22.0013 12 22Z" fill="#4ADE80" />
                        </svg>
                      )}
                      {tx.type === "purchased" && (
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path fillRule="evenodd" clipRule="evenodd" d="M7.68765 6.015V5C7.68765 2.92893 9.36658 1.25 11.4377 1.25C13.5087 1.25 15.1877 2.92893 15.1877 5V6.015C16.4747 6.054 17.2627 6.192 17.8637 6.691C18.6967 7.383 18.9167 8.553 19.3557 10.894L20.1057 14.894C20.7227 18.186 21.0307 19.832 20.1317 20.916C19.2317 22 17.5567 22 14.2077 22H8.66765C5.31765 22 3.64365 22 2.74365 20.916C1.84365 19.832 2.15365 18.186 2.76965 14.894L3.51965 10.894C3.95965 8.554 4.17865 7.383 5.01165 6.691C5.61265 6.192 6.40065 6.054 7.68765 6.015ZM9.18765 5C9.18765 3.75736 10.195 2.75 11.4377 2.75C12.6803 2.75 13.6877 3.75736 13.6877 5V6H9.18765V5ZM14.9067 10.914C15.0622 11.0383 15.1619 11.2193 15.1839 11.4172C15.2058 11.6151 15.1482 11.8136 15.0237 11.969L11.0237 16.969C10.8903 17.1355 10.6923 17.2373 10.4793 17.2489C10.2663 17.2606 10.0584 17.1809 9.90765 17.03L7.90765 15.03C7.63229 14.7345 7.64042 14.274 7.92603 13.9884C8.21164 13.7028 8.67214 13.6946 8.96765 13.97L10.3757 15.377L13.8517 11.031C13.9759 10.8755 14.157 10.7757 14.3549 10.7538C14.5528 10.7318 14.7513 10.7895 14.9067 10.914Z" fill="#4ADE80" />
                        </svg>
                      )}
                    </div>

                    {/* Transaction Details */}
                    <div className="flex-1 min-w-0">
                      <p style={{ color: '#f8fafc', fontSize: '16px' }}>{tx.title}</p>
                      <p style={{ color: '#94a3b8', fontSize: '12px' }}>{tx.subtitle}</p>
                    </div>

                    {/* Amount & Time */}
                    <div className="text-right flex-shrink-0">
                      <p 
                        className="font-bold"
                        style={{ 
                          color: tx.amount >= 0 ? '#4ade80' : '#fff',
                          fontSize: '16px'
                        }}
                      >
                        {tx.amount >= 0 ? '+' : ''}{tx.amount.toFixed(2)}
                      </p>
                      <p style={{ color: '#94a3b8', fontSize: '10px' }}>{tx.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
