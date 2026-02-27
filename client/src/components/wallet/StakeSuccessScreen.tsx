import { ArrowLeft, ExternalLink, Copy, Check } from "lucide-react";
import { useState } from "react";

interface StakeSuccessScreenProps {
  onBack: () => void;
  onDone: () => void;
  onStakeMore?: () => void;
  amount: number;
  transactionHash?: string;
  apy?: number;
}

const GFT_TO_USD = 0.498;
const SKALE_EXPLORER = "https://lanky-ill-funny-testnet.explorer.testnet.skalenodes.com/tx/";

export default function StakeSuccessScreen({
  onBack,
  onDone,
  onStakeMore,
  amount,
  transactionHash = "",
  apy = 12.5,
}: StakeSuccessScreenProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!transactionHash) return;
    await navigator.clipboard.writeText(transactionHash);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const truncatedHash = transactionHash
    ? `${transactionHash.slice(0, 6)}...${transactionHash.slice(-4)}`
    : "—";

  const usdValue = (amount * GFT_TO_USD).toFixed(2);

  return (
    <div
      className="flex flex-col w-full"
      style={{ background: "#020617", fontFamily: "Plus Jakarta Sans, sans-serif", height: "100dvh" }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-6 pt-12 pb-6 shrink-0"
        style={{ borderBottom: "1px solid rgba(30, 41, 59, 0.3)" }}
      >
        <button
          onClick={onBack}
          className="w-10 h-10 rounded-full flex items-center justify-center transition-colors hover:bg-slate-700"
          style={{ background: "#1e293b", border: "1px solid #1e293b" }}
        >
          <ArrowLeft className="w-6 h-6" style={{ color: "#f8fafc" }} />
        </button>

        <span className="text-xl font-bold" style={{ color: "#f8fafc" }}>
          Transaction Result
        </span>

        <button
          className="w-10 h-10 rounded-full flex items-center justify-center transition-colors hover:bg-slate-700"
          style={{ background: "#1e293b", border: "1px solid #1e293b" }}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path fillRule="evenodd" clipRule="evenodd" d="M11.5026 4.44413C11.5026 2.91079 12.7526 1.66663 14.2926 1.66663C15.0311 1.66463 15.7401 1.9562 16.2635 2.47713C16.7869 2.99806 17.0819 3.70565 17.0834 4.44413C17.0834 5.97829 15.8334 7.22246 14.2926 7.22246C13.5463 7.22301 12.8308 6.92469 12.3059 6.39413L8.44341 9.02413C8.55079 9.55997 8.49804 10.1156 8.29175 10.6216L12.5267 13.405C13.0257 12.9984 13.6498 12.7767 14.2934 12.7775C15.0319 12.7757 15.7408 13.0675 16.2641 13.5886C16.7873 14.1096 17.0821 14.8173 17.0834 15.5558C17.0834 17.0891 15.8334 18.3333 14.2926 18.3333C13.5543 18.3351 12.8455 18.0434 12.3222 17.5225C11.799 17.0016 11.5041 16.2941 11.5026 15.5558C11.5019 15.1663 11.584 14.7812 11.7434 14.4258L7.54175 11.6666C7.03277 12.1088 6.38096 12.3518 5.70675 12.3508C4.96827 12.3526 4.25937 12.0608 3.73609 11.5397C3.21282 11.0186 2.91807 10.3109 2.91675 9.57246C2.91829 8.83413 3.21313 8.12666 3.73639 7.60576C4.25964 7.08485 4.96842 6.79319 5.70675 6.79496C6.59341 6.79496 7.38175 7.20579 7.89258 7.84579L11.6367 5.29663C11.5474 5.02129 11.5022 4.73358 11.5026 4.44413Z" fill="#4ADE80" />
          </svg>
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto flex flex-col items-center gap-10 px-6 pt-10 pb-6 max-w-[430px] md:max-w-[600px] lg:max-w-[800px] mx-auto w-full">

        {/* Title + description */}
        <div className="flex flex-col items-center gap-3 text-center">
          <span
            className="text-[30px] font-black leading-[36px]"
            style={{ color: "#f8fafc", letterSpacing: "-0.75px" }}
          >
            Stake Confirmed
          </span>
          <span
            className="text-base max-w-[297px] leading-[26px]"
            style={{ color: "#94a3b8" }}
          >
            Your transaction has been validated on the blockchain. Your GFT is now earning rewards.
          </span>
        </div>

        {/* Transaction Details Card */}
        <div
          className="flex flex-col gap-5 p-6 rounded-2xl w-full max-w-[383px]"
          style={{ background: "#0f172a", border: "1px solid rgba(30, 41, 59, 0.5)" }}
        >
          {/* Transaction ID */}
          <div className="flex items-center justify-between">
            <span
              className="text-xs font-bold uppercase"
              style={{ color: "#94a3b8", letterSpacing: "0.6px" }}
            >
              Transaction ID
            </span>
            <div className="flex items-center gap-2">
              <span
                className="text-sm"
                style={{ color: "#f8fafc", fontFamily: "JetBrains Mono, monospace" }}
              >
                {truncatedHash}
              </span>
              <button onClick={handleCopy} className="rounded transition-colors hover:opacity-70">
                {copied ? (
                  <Check className="w-4 h-4" style={{ color: "#4ade80" }} />
                ) : (
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path fillRule="evenodd" clipRule="evenodd" d="M10.1535 1.33252H7.55915C6.38392 1.33252 5.45253 1.33252 4.72433 1.43112C3.97416 1.53239 3.36722 1.74558 2.88887 2.22594C2.40984 2.70629 2.19732 3.31589 2.09672 4.06873C1.99878 4.80026 1.99878 5.73498 1.99878 6.91488V10.8043C1.99878 11.809 2.61171 12.6698 3.48248 13.0309C3.43784 12.4246 3.43784 11.5752 3.43784 10.8676V7.52981C3.43784 6.67637 3.43784 5.94018 3.51646 5.35123C3.60107 4.71964 3.79161 4.1147 4.28062 3.62369C4.76964 3.13268 5.37258 2.94147 6.0015 2.85619C6.58779 2.77758 7.32064 2.77758 8.17142 2.77758H10.2168C11.0669 2.77758 11.7984 2.77758 12.3853 2.85619C12.0255 1.93763 11.14 1.33307 10.1535 1.33252Z" fill="#4ADE80" />
                    <path fillRule="evenodd" clipRule="evenodd" d="M4.39722 7.59306C4.39722 5.77691 4.39722 4.86883 4.95952 4.30453C5.52115 3.74023 6.42523 3.74023 8.23471 3.74023H10.1535C11.9623 3.74023 12.867 3.74023 13.4293 4.30453C13.9916 4.86883 13.991 5.77691 13.991 7.59306V10.8043C13.991 12.6204 13.991 13.5285 13.4293 14.0928C12.867 14.6571 11.9623 14.6571 10.1535 14.6571H8.23471C6.42589 14.6571 5.52115 14.6571 4.95952 14.0928C4.39722 13.5285 4.39722 12.6204 4.39722 10.8043L4.39722 7.59306Z" fill="#4ADE80" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Divider */}
          <div className="w-full h-px" style={{ background: "rgba(30, 41, 59, 0.3)" }} />

          {/* Amount Staked */}
          <div className="flex items-center justify-between">
            <span
              className="text-xs font-bold uppercase"
              style={{ color: "#94a3b8", letterSpacing: "0.6px" }}
            >
              Amount Staked
            </span>
            <div className="flex flex-col items-end gap-0.5">
              <span className="text-sm font-bold" style={{ color: "#f8fafc" }}>
                {amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} GFT
              </span>
              <span className="text-xs" style={{ color: "#94a3b8" }}>
                ≈ ${usdValue}
              </span>
            </div>
          </div>

          {/* Pool Reward APR */}
          <div className="flex items-center justify-between">
            <span
              className="text-xs font-bold uppercase"
              style={{ color: "#94a3b8", letterSpacing: "0.6px" }}
            >
              Pool Reward (APR)
            </span>
            <span className="text-sm font-bold" style={{ color: "#4ade80" }}>
              +{apy}%
            </span>
          </div>

          {/* Status */}
          <div className="flex items-center justify-between">
            <span
              className="text-xs font-bold uppercase"
              style={{ color: "#94a3b8", letterSpacing: "0.6px" }}
            >
              Status
            </span>
            <div
              className="flex items-center gap-1.5 px-3 py-1 rounded-full"
              style={{
                background: "rgba(74, 222, 128, 0.1)",
                border: "1px solid rgba(74, 222, 128, 0.2)",
              }}
            >
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#4ade80" }} />
              <span
                className="text-[10px] font-bold uppercase"
                style={{ color: "#4ade80", letterSpacing: "0.25px" }}
              >
                Confirmed
              </span>
            </div>
          </div>
        </div>

        {/* View on Explorer */}
        {transactionHash && (
          <a
            href={`${SKALE_EXPLORER}${transactionHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 py-2 transition-opacity hover:opacity-70"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path fillRule="evenodd" clipRule="evenodd" d="M0 6.32921C0 2.83368 2.83368 0 6.32921 0C9.82474 0 12.6584 2.83368 12.6584 6.32921C12.6584 9.82474 9.82474 12.6584 6.32921 12.6584C2.83368 12.6584 0 9.82474 0 6.32921Z" stroke="#94A3B8" strokeWidth="0.999349" />
              <path d="M10.9929 10.9929L13.3247 13.3247" stroke="#94A3B8" strokeWidth="0.999349" strokeLinecap="round" />
            </svg>
            <span className="text-sm font-medium" style={{ color: "#94a3b8" }}>
              View on Explorer
            </span>
            <ExternalLink className="w-3 h-3" style={{ color: "#94a3b8" }} />
          </a>
        )}

        {/* Big Checkmark Icon with Glow — bottom of scroll area */}
        <div className="relative flex items-center justify-center w-32" style={{ height: "160px" }}>
          <div
            className="absolute rounded-full"
            style={{
              background: "rgba(74, 222, 128, 0.2)",
              filter: "blur(32px)",
              width: "176px",
              height: "176px",
              top: "-24px",
              left: "-24px",
            }}
          />
          <div
            className="relative w-32 h-32 rounded-full flex items-center justify-center"
            style={{
              background: "#0f172a",
              border: "1px solid rgba(74, 222, 128, 0.3)",
              boxShadow: "0 25px 50px -12px rgba(74, 222, 128, 0.1)",
            }}
          >
            <div
              className="w-24 h-24 rounded-full flex items-center justify-center"
              style={{
                background: "rgba(74, 222, 128, 0.1)",
                border: "1px solid rgba(74, 222, 128, 0.2)",
              }}
            >
              <svg width="56" height="56" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path fillRule="evenodd" clipRule="evenodd" d="M51.3238 27.9948C51.3238 40.8794 40.8794 51.3238 27.9948 51.3238C15.1102 51.3238 4.66577 40.8794 4.66577 27.9948C4.66577 15.1102 15.1102 4.66577 27.9948 4.66577C40.8794 4.66577 51.3238 15.1102 51.3238 27.9948ZM37.3964 20.9261C38.0786 21.6092 38.0786 22.7158 37.3964 23.399L25.7319 35.0635C25.0487 35.7457 23.9421 35.7457 23.259 35.0635L18.5932 30.3977C18.1251 29.9615 17.9324 29.3046 18.0907 28.6846C18.249 28.0647 18.7331 27.5806 19.353 27.4223C19.973 27.264 20.6299 27.4567 21.0661 27.9248L24.4954 31.3541L29.7094 26.1401L34.9235 20.9261C35.6066 20.2438 36.7132 20.2438 37.3964 20.9261Z" fill="#4ADE80" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div
        className="flex flex-col gap-3 px-6 pt-6 pb-10 shrink-0"
        style={{
          background: "rgba(2, 6, 23, 0.8)",
          backdropFilter: "blur(6px)",
          borderTop: "1px solid rgba(30, 41, 59, 0.3)",
        }}
      >
        <button
          onClick={onDone}
          className="w-full h-[68px] rounded-2xl font-bold text-lg flex items-center justify-center gap-3 transition-all hover:opacity-90 active:scale-[0.98]"
          style={{
            background: "#4ade80",
            color: "#022c22",
            boxShadow: "0 10px 15px -3px rgba(74, 222, 128, 0.2), 0 4px 6px -4px rgba(74, 222, 128, 0.2)",
          }}
        >
          <svg width="21" height="18" viewBox="0 0 21 18" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path fillRule="evenodd" clipRule="evenodd" d="M19.0946 5.00229C19.0379 4.99896 18.9776 4.99762 18.9136 4.99829H16.3894C14.322 4.99829 12.5535 6.62582 12.5535 8.74721C12.5535 10.8686 14.323 12.4961 16.3894 12.4961H18.9136C18.9776 12.4968 19.0383 12.4955 19.0956 12.4921C19.9745 12.4391 20.678 11.7429 20.7401 10.8646C20.7441 10.8046 20.7441 10.7396 20.7441 10.6796V6.81477C20.7441 6.75478 20.7441 6.6898 20.7401 6.62982C20.678 5.75151 19.9735 5.05528 19.0946 5.00229ZM16.1684 9.74692C16.7003 9.74692 17.1311 9.29905 17.1311 8.74721C17.1311 8.19537 16.7003 7.7475 16.1684 7.7475C15.6356 7.7475 15.2047 8.19537 15.2047 8.74721C15.2047 9.29905 15.6356 9.74692 16.1684 9.74692Z" fill="#022C22" />
            <path fillRule="evenodd" clipRule="evenodd" d="M18.9125 13.9959C18.9826 13.9931 19.0498 14.0239 19.0935 14.0788C19.1372 14.1337 19.152 14.2062 19.1334 14.2739C18.9335 14.9856 18.6146 15.5935 18.1037 16.1033C17.355 16.8531 16.4062 17.184 15.2346 17.342C14.0949 17.4949 12.6403 17.4949 10.8029 17.4949H8.69147C6.85401 17.4949 5.39843 17.4949 4.25976 17.342C3.0881 17.184 2.13938 16.8521 1.3906 16.1043C0.642813 15.3555 0.31091 14.4068 0.152956 13.2352C0 12.0955 0 10.6409 0 8.80344V8.69147C0 6.85401 0 5.39843 0.152956 4.25876C0.31091 3.0871 0.642813 2.13838 1.3906 1.3896C2.13938 0.641813 3.0881 0.30991 4.25976 0.151956C5.39943 0 6.85401 0 8.69147 0H10.8029C12.6403 0 14.0959 0 15.2346 0.152956C16.4062 0.31091 17.355 0.642813 18.1037 1.3906C18.6146 1.90245 18.9335 2.50927 19.1334 3.22106C19.152 3.28872 19.1372 3.36117 19.0935 3.41609C19.0498 3.471 18.9826 3.5018 18.9125 3.49898H16.3892C13.5531 3.49898 11.0538 5.73833 11.0538 8.74746C11.0538 11.7566 13.5531 13.9959 16.3892 13.9959H18.9125ZM4.99855 12.4964C4.58445 12.4964 4.24876 12.1607 4.24876 11.7466V5.74833C4.24876 5.33424 4.58445 4.99855 4.99855 4.99855C5.41264 4.99855 5.74833 5.33424 5.74833 5.74833V11.7466C5.74833 12.1607 5.41264 12.4964 4.99855 12.4964Z" fill="#022C22" />
          </svg>
          Go to Wallet
        </button>

        <button
          onClick={onStakeMore}
          className="w-full h-[70px] rounded-2xl font-bold text-lg flex items-center justify-center transition-all hover:bg-slate-700"
          style={{
            background: "#1e293b",
            border: "1px solid #1e293b",
            color: "#f8fafc",
          }}
        >
          Stake More
        </button>
      </div>
    </div>
  );
}
