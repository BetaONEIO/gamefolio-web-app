import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Share2, Heart, ExternalLink, CheckCircle } from "lucide-react";
import gfTokenLogo from "@assets/Gamefolio token_1762633908726.png";

interface NFTProperty {
  trait: string;
  value: string;
  rarity: string;
}

interface NFTDetails {
  id: number;
  name: string;
  collection: string;
  image: string;
  description: string;
  creator: string;
  creatorAvatar?: string;
  price: number;
  priceUSD: number;
  rarity: string;
  isOwned: boolean;
  isGameReady: boolean;
  properties: NFTProperty[];
  contractAddress: string;
  tokenId: string;
  tokenStandard: string;
  network: string;
  explorerUrl?: string;
}

const sampleNFTs: Record<string, NFTDetails> = {
  "1": {
    id: 1,
    name: "Sentinel #882",
    collection: "Etheria Sentinels",
    image: "/attached_assets/1_1762777399632.png",
    description: "The Sentinel #882 is a high-tier protective unit designed for the Etheria metaverse. Equipped with Phase-Shift armor and a Neural-Link core, it provides unmatched defensive capabilities for any fleet. Part of the limited Genesis collection.",
    creator: "Aura_Studio",
    price: 250,
    priceUSD: 14.00,
    rarity: "Legendary",
    isOwned: true,
    isGameReady: true,
    properties: [
      { trait: "Class", value: "Defender", rarity: "15% rarity" },
      { trait: "Element", value: "Plasma", rarity: "7% rarity" },
      { trait: "Aura", value: "Cyber Green", rarity: "22% rarity" },
      { trait: "Level", value: "Elite II", rarity: "3% rarity" },
    ],
    contractAddress: "0x5c1e...a2b9",
    tokenId: "882",
    tokenStandard: "ERC-721",
    network: "Polygon",
    explorerUrl: "https://polygonscan.com/token/0x5c1ea2b9"
  }
};

export default function NFTDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { user } = useAuth();

  const nft = sampleNFTs[id || "1"] || sampleNFTs["1"];

  const handleBack = () => {
    setLocation("/wallet");
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: nft.name,
        text: `Check out ${nft.name} on Gamefolio!`,
        url: window.location.href,
      });
    }
  };

  const handleViewOnExplorer = () => {
    if (nft.explorerUrl) {
      window.open(nft.explorerUrl, "_blank");
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-white font-['Plus_Jakarta_Sans']">
      <div 
        className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md"
        style={{ background: 'rgba(2, 6, 23, 0.8)' }}
      >
        <div className="flex items-center justify-between px-4 pt-12 pb-4">
          <div className="flex items-center gap-4">
            <button
              onClick={handleBack}
              className="w-10 h-10 rounded-full bg-[#1e293b]/50 flex items-center justify-center hover:bg-[#1e293b] transition-colors"
            >
              <ArrowLeft className="w-6 h-6 text-[#f8fafc]" />
            </button>
            <span className="text-xl font-bold text-[#f8fafc] uppercase tracking-tight">
              NFT Details
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleShare}
              className="w-10 h-10 rounded-full bg-[#1e293b]/50 flex items-center justify-center hover:bg-[#1e293b] transition-colors"
            >
              <Share2 className="w-5 h-5 text-[#94a3b8]" />
            </button>
            <button className="w-10 h-10 rounded-full bg-[#1e293b]/50 flex items-center justify-center hover:bg-[#1e293b] transition-colors">
              <Heart className="w-5 h-5 text-red-500 fill-red-500" />
            </button>
          </div>
        </div>
      </div>

      <div className="pt-28 pb-8">
        <div className="flex justify-center px-4 py-2">
          <div 
            className="relative w-[398px] h-[398px] rounded-3xl overflow-hidden"
            style={{ 
              background: 'rgba(255, 255, 255, 0.01)',
              boxShadow: '0 25px 50px -12px rgba(74, 222, 128, 0.05)'
            }}
          >
            <img
              src={nft.image}
              alt={nft.name}
              className="w-full h-full object-cover"
            />
            {nft.isGameReady && (
              <div 
                className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 rounded-2xl"
                style={{ 
                  background: 'rgba(0, 0, 0, 0.4)',
                  backdropFilter: 'blur(8px)'
                }}
              >
                <div className="w-2 h-2 rounded-full bg-[#4ade80]" />
                <span className="text-[10px] font-bold text-white uppercase tracking-wider">
                  Game-Ready
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="px-6 pt-6 space-y-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-sm text-[#4ade80]">{nft.collection}</span>
              <CheckCircle className="w-4 h-4 text-[#4ade80]" />
            </div>
            <h1 className="text-3xl font-bold text-[#f8fafc]">{nft.name}</h1>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-pink-500" />
              <span className="text-sm text-[#94a3b8]">Created by</span>
              <span className="text-sm text-[#f8fafc]">{nft.creator}</span>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-bold text-[#94a3b8] uppercase tracking-wider">
              Description
            </h3>
            <p className="text-sm text-[#94a3b8] leading-relaxed">
              {nft.description}
            </p>
          </div>

          <div 
            className="rounded-2xl p-5 space-y-5"
            style={{ 
              background: '#0f172a',
              border: '1px solid rgba(30, 41, 59, 0.5)',
              boxShadow: '0 4px 6px -4px rgba(0, 0, 0, 0.1), 0 10px 15px -3px rgba(0, 0, 0, 0.1)'
            }}
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-[#14532d] flex items-center justify-center">
                <svg width="24" height="18" viewBox="0 0 21 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path fillRule="evenodd" clipRule="evenodd" d="M19.0996 5.00376C19.043 5.00042 18.9826 4.99909 18.9186 4.99976H16.3936C14.3256 4.99976 12.5566 6.62776 12.5566 8.74976C12.5566 10.8718 14.3266 12.4998 16.3936 12.4998H18.9186C18.9826 12.5004 19.0433 12.4991 19.1006 12.4958C19.9798 12.4427 20.6835 11.7463 20.7456 10.8678C20.7496 10.8078 20.7496 10.7428 20.7496 10.6828V6.81676C20.7496 6.75676 20.7496 6.69176 20.7456 6.63176C20.6835 5.75319 19.9788 5.05677 19.0996 5.00376ZM16.1726 9.74976C16.7046 9.74976 17.1356 9.30176 17.1356 8.74976C17.1356 8.19776 16.7046 7.74976 16.1726 7.74976C15.6396 7.74976 15.2086 8.19776 15.2086 8.74976C15.2086 9.30176 15.6396 9.74976 16.1726 9.74976Z" fill="#4ADE80" />
                  <path fillRule="evenodd" clipRule="evenodd" d="M18.918 14C18.9881 13.9972 19.0554 14.028 19.099 14.0829C19.1427 14.1379 19.1576 14.2103 19.139 14.278C18.939 14.99 18.62 15.598 18.109 16.108C17.36 16.858 16.411 17.189 15.239 17.347C14.099 17.5 12.644 17.5 10.806 17.5H8.694C6.856 17.5 5.4 17.5 4.261 17.347C3.089 17.189 2.14 16.857 1.391 16.109C0.643 15.36 0.311 14.411 0.153 13.239C0 12.099 0 10.644 0 8.806V8.694C0 6.856 0 5.4 0.153 4.26C0.311 3.088 0.643 2.139 1.391 1.39C2.14 0.642 3.089 0.31 4.261 0.152C5.401 0 6.856 0 8.694 0H10.806C12.644 0 14.1 0 15.239 0.153C16.411 0.311 17.36 0.643 18.109 1.391C18.62 1.903 18.939 2.51 19.139 3.222C19.1576 3.28968 19.1427 3.36215 19.099 3.41708C19.0554 3.47201 18.9881 3.50282 18.918 3.5H16.394C13.557 3.5 11.057 5.74 11.057 8.75C11.057 11.76 13.557 14 16.394 14H18.918ZM3.75 4C3.33579 4 3 4.33579 3 4.75C3 5.16421 3.33579 5.5 3.75 5.5H7.75C8.16421 5.5 8.5 5.16421 8.5 4.75C8.5 4.33579 8.16421 4 7.75 4H3.75Z" fill="#4ADE80" />
                </svg>
              </div>
              <div>
                <p className="text-xs font-bold text-[#94a3b8] uppercase tracking-wider">Status</p>
                <p className="text-sm font-bold text-[#f8fafc]">In Your Wallet</p>
              </div>
            </div>
            <div className="space-y-3">
              <Button
                className="w-full h-[60px] rounded-2xl bg-[#4ade80] hover:bg-[#22c55e] text-[#022c22] text-lg font-bold"
                style={{
                  boxShadow: '0 4px 6px -4px rgba(74, 222, 128, 0.2), 0 10px 15px -3px rgba(74, 222, 128, 0.2)'
                }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="mr-2">
                  <path fillRule="evenodd" clipRule="evenodd" d="M12 22C17.523 22 22 17.523 22 12C22 6.477 17.523 2 12 2C6.477 2 2 6.477 2 12C2 17.523 6.477 22 12 22ZM12.75 9C12.75 8.58579 12.4142 8.25 12 8.25C11.5858 8.25 11.25 8.58579 11.25 9V11.25H9C8.58579 11.25 8.25 11.5858 8.25 12C8.25 12.4142 8.58579 12.75 9 12.75H11.25V15C11.25 15.4142 11.5858 15.75 12 15.75C12.4142 15.75 12.75 15.4142 12.75 15V12.75H15C15.4142 12.75 15.75 12.4142 15.75 12C15.75 11.5858 15.4142 11.25 15 11.25H12.75V9Z" fill="#022C22" />
                </svg>
                Assign to Gamefolio
              </Button>
              <p className="text-[11px] text-[#94a3b8] text-center leading-relaxed">
                Assigning this NFT allows it to be showcased in your public profile and used in supported Gamefolio integrations.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-bold text-[#94a3b8] uppercase tracking-wider">
              Properties
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {nft.properties.map((prop, index) => (
                <div
                  key={index}
                  className="rounded-2xl p-3 space-y-1"
                  style={{ 
                    background: '#0f172a',
                    border: '1px solid rgba(30, 41, 59, 0.5)'
                  }}
                >
                  <p className="text-[10px] font-bold text-[#94a3b8] uppercase">
                    {prop.trait}
                  </p>
                  <p className="text-sm text-[#f8fafc]">{prop.value}</p>
                  <p className="text-[10px] text-[#4ade80]">{prop.rarity}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4 pt-2">
            <h3 className="text-sm font-bold text-[#94a3b8] uppercase tracking-wider">
              Details
            </h3>
            <div 
              className="rounded-2xl overflow-hidden"
              style={{ 
                background: '#0f172a',
                border: '1px solid rgba(30, 41, 59, 0.5)'
              }}
            >
              <div className="flex justify-between items-center px-4 py-4 border-b border-[#1e293b]/30">
                <span className="text-sm text-[#94a3b8]">Contract Address</span>
                <span className="text-sm text-[#4ade80] font-mono">{nft.contractAddress}</span>
              </div>
              <div className="flex justify-between items-center px-4 py-4 border-b border-[#1e293b]/30">
                <span className="text-sm text-[#94a3b8]">Token ID</span>
                <span className="text-sm text-[#f8fafc] font-mono">{nft.tokenId}</span>
              </div>
              <div className="flex justify-between items-center px-4 py-4 border-b border-[#1e293b]/30">
                <span className="text-sm text-[#94a3b8]">Token Standard</span>
                <span className="text-sm text-[#f8fafc] font-mono">{nft.tokenStandard}</span>
              </div>
              <div className="flex justify-between items-center px-4 py-4">
                <span className="text-sm text-[#94a3b8]">Network</span>
                <span className="text-sm text-[#f8fafc]">{nft.network}</span>
              </div>
            </div>

            <button
              onClick={handleViewOnExplorer}
              className="w-full flex items-center justify-center gap-2 h-[52px] rounded-2xl bg-[#1e293b]/30 hover:bg-[#1e293b]/50 transition-colors"
            >
              <svg width="17" height="17" viewBox="0 0 17 17" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path fillRule="evenodd" clipRule="evenodd" d="M16.6675 8.33374C16.6675 12.9363 12.9363 16.6675 8.33374 16.6675C3.73114 16.6675 0 12.9363 0 8.33374C0 3.73114 3.73114 0 8.33374 0C12.9363 0 16.6675 3.73114 16.6675 8.33374Z" stroke="#94A3B8" strokeWidth="1.25" />
                <path fillRule="evenodd" clipRule="evenodd" d="M11.6677 8.33362C11.6677 9.42779 11.581 10.512 11.4135 11.5228C11.2468 12.5336 11.001 13.452 10.691 14.2261C10.3818 15.0003 10.0143 15.6137 9.61017 16.0328C9.20516 16.4512 8.77183 16.667 8.33433 16.667C7.89682 16.667 7.46349 16.4512 7.05932 16.0328C6.65432 15.6137 6.28682 14.9995 5.97765 14.2261C5.66765 13.452 5.42181 12.5345 5.25431 11.5228C5.0834 10.4684 4.99867 9.40179 5.00098 8.33362C5.00098 7.23945 5.08681 6.15527 5.25431 5.14444C5.42181 4.1336 5.66765 3.21526 5.97765 2.44109C6.28682 1.66692 6.65432 1.05358 7.05849 0.634414C7.46349 0.216912 7.89682 0.000244141 8.33433 0.000244141C8.77183 0.000244141 9.20516 0.216079 9.60933 0.634414C10.0143 1.05358 10.3818 1.66775 10.691 2.44109C11.001 3.21526 11.2468 4.13276 11.4135 5.14444C11.5818 6.15527 11.6677 7.23945 11.6677 8.33362Z" stroke="#94A3B8" strokeWidth="1.25001" />
                <path d="M0.000976562 8.33374H16.6676" stroke="#94A3B8" strokeWidth="1.25" strokeLinecap="round" />
              </svg>
              <span className="text-sm text-[#94a3b8]">View on Explorer</span>
              <ExternalLink className="w-4 h-4 text-[#94a3b8]" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
