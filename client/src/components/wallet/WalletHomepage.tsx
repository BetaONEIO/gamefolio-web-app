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
  portfolioValue?: number;
  stakedAmount?: number;
  nftsOwned?: number;
  onBuyClick?: () => void;
  onStakeClick?: () => void;
  onSettingsClick?: () => void;
  onProfileClick?: () => void;
  onActivityClick?: () => void;
  onNFTsClick?: () => void;
  isLoadingBalance?: boolean;
}

export default function WalletHomepage({
  onChainBalance = "0",
  offChainBalance = 0,
  walletAddress = "",
  fiatValue,
  portfolioValue,
  stakedAmount = 0,
  nftsOwned = 0,
  onBuyClick,
  onStakeClick,
  onSettingsClick,
  onProfileClick,
  onActivityClick,
  onNFTsClick,
}: WalletHomepageProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const totalBalance = parseFloat(onChainBalance) + offChainBalance;
  const estimatedFiat = fiatValue ?? totalBalance * 0.056;
  const displayPortfolioValue = portfolioValue ?? estimatedFiat;

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
    if (!address) return "0x86d2...a4cf";
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
                <path fillRule="evenodd" clipRule="evenodd" d="M12 8.5C10.067 8.5 8.5 10.067 8.5 12C8.5 13.933 10.067 15.5 12 15.5C13.933 15.5 15.5 13.933 15.5 12C15.5 10.067 13.933 8.5 12 8.5Z" fill="#4ADE80" />
                <path fillRule="evenodd" clipRule="evenodd" d="M12 2C11.0426 2 10.2626 2.69665 10.1368 3.6052C10.035 4.33795 9.49963 4.94098 8.79189 5.12908C8.55932 5.19097 8.33085 5.26426 8.10747 5.34852C7.42386 5.60618 6.6472 5.46836 6.11127 4.95152C5.40894 4.27455 4.28014 4.2946 3.60258 4.99626L2.89258 5.73488C2.23728 6.41302 2.24694 7.49227 2.91462 8.15878C3.42754 8.67044 3.55893 9.43618 3.30023 10.1091C3.21649 10.3314 3.14367 10.5586 3.08217 10.7899C2.8964 11.4952 2.29603 12.0286 1.56601 12.1292C0.66052 12.254 0 13.0306 0 13.9487V14.9796C0 15.8977 0.66052 16.6743 1.566 16.7991C2.29585 16.8997 2.89612 17.4329 3.08194 18.1379C3.14351 18.3698 3.21646 18.5977 3.30035 18.8206C3.55913 19.494 3.42769 20.2603 2.91462 20.7724C2.24694 21.439 2.23728 22.5182 2.89258 23.1964L3.60258 23.935C4.28014 24.6367 5.40894 24.6567 6.11127 23.9797C6.64762 23.4625 7.42497 23.3248 8.10903 23.5829C8.33174 23.667 8.55949 23.7401 8.79133 23.8019C9.49937 23.99 10.035 24.5933 10.1368 25.3264C10.2626 26.2349 11.0426 26.9316 12 26.9316C12.9574 26.9316 13.7374 26.2349 13.8632 25.3264C13.965 24.5933 14.5006 23.99 15.2087 23.8019C15.4405 23.7401 15.6683 23.667 15.891 23.5829C16.575 23.3248 17.3524 23.4625 17.8887 23.9797C18.5911 24.6567 19.7199 24.6367 20.3974 23.935L21.1074 23.1964C21.7627 22.5182 21.7531 21.439 21.0854 20.7724C20.5723 20.2603 20.4409 19.494 20.6997 18.8206C20.7836 18.5977 20.8565 18.3698 20.9181 18.1379C21.1039 17.4329 21.7042 16.8997 22.434 16.7991C23.3395 16.6743 24 15.8977 24 14.9796V13.9487C24 13.0306 23.3395 12.254 22.434 12.1292C21.704 12.0286 21.1036 11.4952 20.9178 10.7899C20.8563 10.5586 20.7835 10.3314 20.6998 10.1091C20.4411 9.43618 20.5725 8.67044 21.0854 8.15878C21.7531 7.49227 21.7627 6.41302 21.1074 5.73488L20.3974 4.99626C19.7199 4.2946 18.5911 4.27455 17.8887 4.95152C17.3528 5.46836 16.5761 5.60618 15.8925 5.34852C15.6692 5.26426 15.4407 5.19097 15.2081 5.12908C14.5004 4.94098 13.965 4.33795 13.8632 3.6052C13.7374 2.69665 12.9574 2 12 2Z" fill="#4ADE80" />
              </svg>
            </button>
          </div>

          {/* Balance Section */}
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
          
          {/* Left Column - NFTs Card */}
          <div className="lg:col-span-1 flex flex-col gap-6">
            <div 
              className="rounded-2xl p-5 flex flex-col gap-4 h-full"
              style={{ 
                background: '#0f172a',
                border: '1px solid rgba(30, 41, 59, 0.5)'
              }}
            >
              <div className="flex items-center justify-between">
                <span className="text-lg font-bold" style={{ color: '#f8fafc' }}>NFTs</span>
                <button 
                  onClick={onNFTsClick}
                  className="hover:opacity-80 transition-opacity"
                  style={{ color: '#4ade80', fontSize: '14px', fontWeight: 600 }}
                >
                  View All
                </button>
              </div>
              
              {/* NFT Empty/Content Area */}
              <div 
                className="flex-1 flex flex-col items-center justify-center py-8 rounded-xl min-h-[200px]"
                style={{ background: 'rgba(2, 6, 23, 0.5)', border: '1px solid #1e293b' }}
              >
                {nftsOwned > 0 ? (
                  <span style={{ color: '#f8fafc', fontSize: '16px' }}>{nftsOwned} NFTs</span>
                ) : (
                  <>
                    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path fillRule="evenodd" clipRule="evenodd" d="M24 44C35.0457 44 44 35.0457 44 24C44 12.9543 35.0457 4 24 4C12.9543 4 4 12.9543 4 24C4 35.0457 12.9543 44 24 44ZM24 18C24.5523 18 25 18.4477 25 19V23H29C29.5523 23 30 23.4477 30 24C30 24.5523 29.5523 25 29 25H25V29C25 29.5523 24.5523 30 24 30C23.4477 30 23 29.5523 23 29V25H19C18.4477 25 18 24.5523 18 24C18 23.4477 18.4477 23 19 23H23V19C23 18.4477 23.4477 18 24 18Z" fill="#1e293b" />
                    </svg>
                    <span className="mt-3" style={{ color: '#94a3b8', fontSize: '14px' }}>No NFTs yet</span>
                    <span style={{ color: '#64748b', fontSize: '12px' }}>Purchase NFT avatars from the store</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Center Column - Action Buttons & Quick Stats */}
          <div className="lg:col-span-1 flex flex-col gap-6">
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

            {/* Quick Stats Card */}
            <div 
              className="rounded-2xl p-5 flex flex-col gap-4"
              style={{ 
                background: '#0f172a',
                border: '1px solid rgba(30, 41, 59, 0.5)'
              }}
            >
              <span className="text-lg font-bold" style={{ color: '#f8fafc' }}>Quick Stats</span>
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span style={{ color: '#94a3b8', fontSize: '14px' }}>Portfolio Value</span>
                  <span style={{ color: '#fff', fontSize: '14px', fontWeight: 600 }}>£{displayPortfolioValue.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span style={{ color: '#94a3b8', fontSize: '14px' }}>Staked Amount</span>
                  <span style={{ color: '#fff', fontSize: '14px', fontWeight: 600 }}>{stakedAmount} GFT</span>
                </div>
                <div className="flex items-center justify-between">
                  <span style={{ color: '#94a3b8', fontSize: '14px' }}>NFTs Owned</span>
                  <span style={{ color: '#fff', fontSize: '14px', fontWeight: 600 }}>{nftsOwned}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Recent Activity & Wallet Status */}
          <div className="lg:col-span-1 flex flex-col gap-6">
            {/* Recent Activity Card */}
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
                      className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: '#1e293b', border: '1px solid #1e293b' }}
                    >
                      {tx.type === "received" && (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path fillRule="evenodd" clipRule="evenodd" d="M18.7313 6.34474C19.0108 6.04476 19.0026 5.57727 18.7126 5.28733C18.4227 4.99739 17.9552 4.98914 17.6552 5.26868L10.5796 12.3443L6.5494 8.31415C6.33166 8.09668 6.00442 8.03168 5.7201 8.1494C5.43577 8.26713 5.25027 8.54445 5.25 8.85219V17.9886C5.25 18.4089 5.59109 18.75 6.01137 18.75H15.1478C15.4555 18.7497 15.7328 18.5642 15.8506 18.2799C15.9683 17.9956 15.9033 17.6683 15.6858 17.4506L11.6556 13.4204L18.7313 6.34474Z" fill="#4ADE80" />
                        </svg>
                      )}
                      {tx.type === "staked" && (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path fillRule="evenodd" clipRule="evenodd" d="M12 22C10.6167 22 9.31667 21.7373 8.1 21.212C6.88333 20.6867 5.825 19.9743 4.925 19.075C4.025 18.1757 3.31267 17.1173 2.788 15.9C2.26333 14.6827 2.00067 13.3827 2 12C1.99933 10.6173 2.262 9.31733 2.788 8.1C3.314 6.88267 4.02633 5.82433 4.925 4.925C5.82367 4.02567 6.882 3.31333 8.1 2.788C9.318 2.26267 10.618 2 12 2C13.382 2 14.682 2.26267 15.9 2.788C17.118 3.31333 18.1763 4.02567 19.075 4.925C19.9737 5.82433 20.6863 6.88267 21.213 8.1C21.7397 9.31733 22.002 10.6173 22 12C21.998 13.3827 21.7353 14.6827 21.212 15.9C20.6887 17.1173 19.9763 18.1757 19.075 19.075C18.1737 19.9743 17.1153 20.687 15.9 21.213C14.6847 21.739 13.3847 22.0013 12 22Z" fill="#4ADE80" />
                        </svg>
                      )}
                      {tx.type === "purchased" && (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path fillRule="evenodd" clipRule="evenodd" d="M7.68765 6.015V5C7.68765 2.92893 9.36658 1.25 11.4377 1.25C13.5087 1.25 15.1877 2.92893 15.1877 5V6.015C16.4747 6.054 17.2627 6.192 17.8637 6.691C18.6967 7.383 18.9167 8.553 19.3557 10.894L20.1057 14.894C20.7227 18.186 21.0307 19.832 20.1317 20.916C19.2317 22 17.5567 22 14.2077 22H8.66765C5.31765 22 3.64365 22 2.74365 20.916C1.84365 19.832 2.15365 18.186 2.76965 14.894L3.51965 10.894C3.95965 8.554 4.17865 7.383 5.01165 6.691C5.61265 6.192 6.40065 6.054 7.68765 6.015ZM9.18765 5C9.18765 3.75736 10.195 2.75 11.4377 2.75C12.6803 2.75 13.6877 3.75736 13.6877 5V6H9.18765V5Z" fill="#4ADE80" />
                        </svg>
                      )}
                    </div>

                    {/* Transaction Details */}
                    <div className="flex-1 min-w-0">
                      <p style={{ color: '#f8fafc', fontSize: '14px', fontWeight: 500 }}>{tx.title}</p>
                      <p style={{ color: '#94a3b8', fontSize: '12px' }}>{tx.subtitle}</p>
                    </div>

                    {/* Amount & Time */}
                    <div className="text-right flex-shrink-0">
                      <p 
                        className="font-bold"
                        style={{ 
                          color: tx.amount >= 0 ? '#4ade80' : '#fff',
                          fontSize: '14px'
                        }}
                      >
                        {tx.amount >= 0 ? '+' : ''}{tx.amount.toFixed(2)}
                      </p>
                      <p style={{ color: '#64748b', fontSize: '10px' }}>{tx.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

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
                    <span style={{ color: '#fff', fontSize: '16px', fontWeight: 500 }}>Active Wallet</span>
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
            </div>

            {/* Wallet Address Card */}
            <div 
              className="rounded-2xl p-4"
              style={{ 
                background: '#0f172a',
                border: '1px solid rgba(30, 41, 59, 0.5)'
              }}
            >
              <div className="flex items-center justify-between">
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
          </div>
        </div>
      </div>
    </div>
  );
}
