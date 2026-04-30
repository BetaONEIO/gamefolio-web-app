import { useState, useEffect } from "react";

interface CustomAmountScreenProps {
  onBack: () => void;
  onApply: (amount: number) => void;
}

const GFT_RATE = 0.01;
const MIN_AMOUNT = 5;
const MAX_AMOUNT = 10000;

export default function CustomAmountScreen({
  onBack,
  onApply,
}: CustomAmountScreenProps) {
  const [amountString, setAmountString] = useState("");
  const [showCursor, setShowCursor] = useState(true);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setShowCursor((prev) => !prev);
    }, 530);
    return () => clearInterval(interval);
  }, []);

  const amount = parseFloat(amountString) || 0;
  const gftReceived = amount / GFT_RATE;
  const isValidAmount = amount >= MIN_AMOUNT && amount <= MAX_AMOUNT;
  const isOverMax = amount > MAX_AMOUNT;

  const handleKeyPress = (key: string) => {
    if (key === "backspace") {
      setAmountString((prev) => prev.slice(0, -1));
    } else if (key === ".") {
      if (!amountString.includes(".")) {
        setAmountString((prev) => (prev === "" ? "0." : prev + "."));
      }
    } else {
      if (amountString.includes(".")) {
        const decimalPart = amountString.split(".")[1];
        if (decimalPart && decimalPart.length >= 2) return;
      }
      if (amountString.length < 6) {
        setAmountString((prev) => prev + key);
      }
    }
  };

  const handleApply = () => {
    if (isValidAmount) {
      onApply(amount);
    }
  };

  useEffect(() => {
    const handlePhysicalKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }

      if (e.metaKey || e.ctrlKey || e.altKey) return;

      if (e.key >= "0" && e.key <= "9") {
        e.preventDefault();
        handleKeyPress(e.key);
      } else if (e.key === "." || e.key === ",") {
        e.preventDefault();
        handleKeyPress(".");
      } else if (e.key === "Backspace" || e.key === "Delete") {
        e.preventDefault();
        handleKeyPress("backspace");
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (amount >= MIN_AMOUNT && amount <= MAX_AMOUNT) {
          onApply(amount);
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        onBack();
      }
    };

    window.addEventListener("keydown", handlePhysicalKey);
    return () => window.removeEventListener("keydown", handlePhysicalKey);
  }, [amountString, amount, onApply, onBack]);

  const keypadLayout = [
    ["1", "2", "3"],
    ["4", "5", "6"],
    ["7", "8", "9"],
    [".", "0", "backspace"],
  ];

  return (
    <div
      className="w-full min-h-screen flex flex-col font-['Plus_Jakarta_Sans']"
      style={{ background: "#101D27f2", backdropFilter: "blur(4px)" }}
    >
      {/* Header */}
      <div className="flex items-center justify-center px-6 pt-12 pb-6">
        <div className="flex items-center justify-between w-full max-w-[430px]">
          <div className="w-10 h-10" />

          <span className="text-xl font-bold text-white">Custom Amount</span>

          <button
            onClick={onBack}
            className="w-10 h-10 rounded-full flex items-center justify-center transition-all hover:bg-slate-700"
            style={{ background: "#1e293b", border: "1px solid #1e293b" }}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M0 10C0 4.47715 4.47715 0 10 0C15.5228 0 20 4.47715 20 10C20 15.5228 15.5228 20 10 20C4.47715 20 0 15.5228 0 10Z"
                stroke="#F8FAFC"
                strokeWidth="1.5"
              />
              <path
                d="M12.5 7.5L7.5 12.5M7.5 7.5L12.5 12.5"
                stroke="#F8FAFC"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center px-6 pt-4 gap-12">
        {/* Amount Display Section */}
        <div className="flex flex-col items-center gap-6 w-full max-w-[382px]">
          <span
            className="text-sm font-medium uppercase tracking-wider text-center"
            style={{ color: "#94a3b8", letterSpacing: "0.7px" }}
          >
            How much would you like to buy?
          </span>

          {/* Amount Display */}
          <div className="flex items-center justify-center gap-1 h-[72px]">
            <span
              className="text-4xl font-bold"
              style={{ color: "#B7FF1A" }}
            >
              £
            </span>
            <span className="text-7xl font-bold text-white">
              {amountString || "0"}
            </span>
            {/* Blinking Cursor */}
            <div
              className="w-[6px] h-12 rounded-full transition-opacity"
              style={{
                background: "#B7FF1A",
                opacity: showCursor ? 1 : 0,
              }}
            />
          </div>

          {/* GFT Receive Badge */}
          <div
            className="flex items-center gap-2 px-4 py-2 rounded-full"
            style={{
              background: "rgba(20, 83, 45, 0.2)",
              border: "1px solid rgba(183, 255, 26, 0.3)",
            }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M1.48227 1.49756C1.31168 1.43821 1.12236 1.47526 0.986724 1.59452C0.851086 1.71378 0.790121 1.89681 0.827148 2.07358C0.864176 2.25036 0.993468 2.39353 1.16557 2.44834L1.34263 2.5078C1.7943 2.65814 2.09363 2.75903 2.31345 2.86125C2.52191 2.95814 2.61211 3.03631 2.66957 3.11649C2.72703 3.19667 2.77314 3.30624 2.79919 3.53475C2.82659 3.77595 2.82726 4.09132 2.82726 4.56771V6.35301C2.82726 7.26637 2.82726 8.00334 2.90543 8.58263C2.98561 9.18397 3.15933 9.69043 3.56155 10.0927C3.96311 10.4949 4.47024 10.6673 5.07158 10.7481C5.6502 10.8263 6.38717 10.8263 7.30053 10.8263H12.0143C12.2911 10.8263 12.5154 10.6019 12.5154 10.3252C12.5154 10.0484 12.2911 9.82406 12.0143 9.82406H7.33728C6.37848 9.82406 5.70966 9.82272 5.20454 9.75524C4.71478 9.68909 4.45487 9.56815 4.26979 9.38374C4.11278 9.22673 4.00253 9.01559 3.93171 8.65479H10.6934C11.3342 8.65479 11.6542 8.65479 11.9054 8.48909C12.1566 8.32339 12.2829 8.0294 12.5355 7.44009L12.8215 6.77194C13.3627 5.50914 13.6333 4.8784 13.3359 4.42807C13.0386 3.97774 12.3524 3.97774 10.9787 3.97774H3.82614C3.82428 3.79183 3.81381 3.6061 3.79474 3.42117C3.75799 3.09711 3.67715 2.79978 3.48271 2.53052C3.28828 2.26059 3.03171 2.08954 2.73639 1.95257C2.45777 1.82295 2.10432 1.70535 1.68605 1.56504L1.48227 1.49756Z"
                fill="#B7FF1A"
              />
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M4.99875 11.9955C5.55226 11.9955 6.00097 12.4443 6.00097 12.9978C6.00097 13.5513 5.55226 14 4.99875 14C4.44523 14 3.99652 13.5513 3.99652 12.9978C3.99652 12.4443 4.44523 11.9955 4.99875 11.9955Z"
                fill="#B7FF1A"
              />
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M11.0121 11.9955C11.5656 11.9955 12.0143 12.4443 12.0143 12.9978C12.0143 13.5513 11.5656 14 11.0121 14C10.4586 14 10.0099 13.5513 10.0099 12.9978C10.0099 12.4443 10.4586 11.9955 11.0121 11.9955Z"
                fill="#B7FF1A"
              />
            </svg>
            <span className="text-sm font-bold" style={{ color: "#B7FF1A" }}>
              Receive ≈{" "}
              {gftReceived.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}{" "}
              GFT
            </span>
          </div>
        </div>

        {/* Keypad */}
        <div className="flex flex-col items-center w-full max-w-[320px]">
          {keypadLayout.map((row, rowIndex) => (
            <div key={rowIndex} className="flex w-full">
              {row.map((key) => (
                <button
                  key={key}
                  onClick={() => handleKeyPress(key)}
                  className="flex-1 h-16 flex items-center justify-center rounded-2xl transition-all active:bg-slate-700"
                >
                  {key === "backspace" ? (
                    <svg
                      width="32"
                      height="32"
                      viewBox="0 0 32 32"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        fillRule="evenodd"
                        clipRule="evenodd"
                        d="M9.16166 25.9986C10.4017 26.6666 11.887 26.6666 14.8563 26.6666H18.3723C23.539 26.6666 26.123 26.6666 27.7283 25.1039C29.3337 23.5413 29.3337 21.0279 29.3337 15.9999C29.3337 10.9719 29.3337 8.45725 27.7283 6.89592C26.123 5.33459 23.539 5.33325 18.3737 5.33325H14.8577C11.8883 5.33325 10.403 5.33325 9.16433 6.00125C7.92433 6.67059 7.13766 7.89459 5.56299 10.3466L4.65366 11.7599C3.32966 13.8213 2.66699 14.8533 2.66699 15.9999C2.66699 17.1466 3.32966 18.1786 4.65366 20.2399L5.56033 21.6533C7.135 24.1039 7.92166 25.3293 9.16166 25.9986ZM14.7083 11.9586C14.3177 11.5679 13.6843 11.5679 13.2937 11.9586C12.903 12.3492 12.903 12.9826 13.2937 13.3733L15.9203 15.9999L13.2937 18.6266C13.0261 18.8759 12.916 19.2513 13.0065 19.6056C13.097 19.96 13.3736 20.2366 13.7279 20.3271C14.0823 20.4176 14.4577 20.3075 14.707 20.0399L17.3337 17.4133L19.9603 20.0399C20.3544 20.4071 20.9684 20.3962 21.3492 20.0154C21.73 19.6346 21.7408 19.0206 21.3737 18.6266L18.747 15.9999L21.3737 13.3733C21.7408 12.9792 21.73 12.3652 21.3492 11.9844C20.9684 11.6036 20.3544 11.5928 19.9603 11.9599L17.3337 14.5866L14.7083 11.9586Z"
                        fill="white"
                      />
                    </svg>
                  ) : (
                    <span className="text-3xl font-bold text-white">{key}</span>
                  )}
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div
        className="px-6 pb-24 pt-6"
        style={{
          background: "#0f172a",
          borderTop: "1px solid rgba(30, 41, 59, 0.3)",
          borderRadius: "40px 40px 0 0",
        }}
      >
        <div className="max-w-[430px] mx-auto w-full flex flex-col gap-6">
          {/* Info Card */}
          <div
            className="flex items-center gap-4 rounded-2xl px-4 py-4"
            style={{
              background: "rgba(30, 41, 59, 0.3)",
              border: "1px solid rgba(30, 41, 59, 0.5)",
            }}
          >
            <div
              className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center"
              style={{ background: "rgba(183, 255, 26, 0.1)" }}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M18.3336 10.0001C18.3336 14.6026 14.6028 18.3334 10.0003 18.3334C5.39782 18.3334 1.66699 14.6026 1.66699 10.0001C1.66699 5.39757 5.39782 1.66675 10.0003 1.66675C14.6028 1.66675 18.3336 5.39757 18.3336 10.0001ZM10.0003 14.7917C10.3455 14.7917 10.6253 14.5119 10.6253 14.1667V9.16673C10.6253 8.82155 10.3455 8.54173 10.0003 8.54173C9.65513 8.54173 9.37531 8.82155 9.37531 9.16673V14.1667C9.37531 14.5117 9.65531 14.7917 10.0003 14.7917ZM10.0003 5.8334C10.4605 5.8334 10.8336 6.2065 10.8336 6.66674C10.8336 7.12697 10.4605 7.50007 10.0003 7.50007C9.54007 7.50007 9.16697 7.12697 9.16697 6.66674C9.16697 6.2065 9.54007 5.8334 10.0003 5.8334Z"
                  fill="#B7FF1A"
                />
              </svg>
            </div>
            <p className="text-xs leading-5" style={{ color: "#94a3b8" }}>
              {isOverMax ? (
                <>
                  The maximum purchase amount is{" "}
                  <span className="font-bold text-white">
                    £{MAX_AMOUNT.toLocaleString()}.00
                  </span>
                  . Please lower the amount to continue.
                </>
              ) : (
                <>
                  The minimum purchase amount is{" "}
                  <span className="font-bold text-white">£5.00</span>. Transaction fees are calculated at the next step.
                </>
              )}
            </p>
          </div>

          {/* Apply Button */}
          <button
            onClick={handleApply}
            disabled={!isValidAmount}
            className="w-full flex items-center justify-center gap-2 py-5 rounded-2xl font-bold text-lg transition-all"
            style={{
              background: isValidAmount ? "#B7FF1A" : "#1e293b",
              boxShadow: isValidAmount ? "0 0 30px -10px #B7FF1A" : "none",
              opacity: isValidAmount ? 1 : 0.5,
              cursor: isValidAmount ? "pointer" : "not-allowed",
            }}
          >
            <span style={{ color: isValidAmount ? "#071013" : "#64748b" }}>
              Apply Amount
            </span>
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M4 12H20M20 12L14 6M20 12L14 18"
                stroke={isValidAmount ? "#071013" : "#64748b"}
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
