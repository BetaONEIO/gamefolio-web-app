import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ArrowRight } from "lucide-react";
import proHeroImage from "@assets/gamefolio_pro_banner_1770379359049.png";

interface ProOnboardingScreenProps {
  onComplete: () => void;
}

const slides = [
  {
    title: "Exclusive Assets",
    description: "Unlock premium aesthetics to elevate your Gamefolio and stand out from the crowd.",
    icon: (
      <svg width="96" height="96" viewBox="0 0 96 96" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path fillRule="evenodd" clipRule="evenodd" d="M42.64 25.33C45.18 20.77 46.46 18.5 48 18.5C49.54 18.5 50.82 20.77 53.36 25.33L53.72 26.01C54.11 26.76 54.31 27.13 54.6 27.38C54.9 27.63 55.26 27.72 55.96 27.89L56.66 28.06C61.36 28.96 63.71 29.4 64.28 30.93C64.84 32.45 63.21 34.06 59.95 37.27L59.42 37.82C58.85 38.42 58.56 38.72 58.44 39.1C58.32 39.47 58.36 39.88 58.44 40.69L58.51 41.43C58.99 44.48 59.23 46.01 58.3 46.72C57.37 47.43 56.01 46.81 53.3 45.58L52.64 45.28C51.97 44.97 51.63 44.82 51.27 44.82C50.9 44.82 50.56 44.97 49.88 45.28L49.22 45.58C46.51 46.81 45.15 47.43 44.22 46.72C43.29 46.01 43.53 44.48 44.01 41.43L44.08 40.69C44.16 39.88 44.2 39.47 44.08 39.1C43.96 38.72 43.67 38.42 43.1 37.82L42.57 37.27C39.31 34.06 37.68 32.45 38.24 30.93C38.81 29.4 41.16 28.96 45.86 28.06L46.56 27.89C47.26 27.72 47.62 27.63 47.92 27.38C48.21 27.13 48.41 26.76 48.8 26.01L42.64 25.33Z" fill="#4ADE80"/>
      </svg>
    ),
  },
  {
    title: "Unlimited Space",
    description: "Upload and share your gaming highlights without any storage limits.",
    icon: (
      <svg width="96" height="96" viewBox="0 0 96 96" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path fillRule="evenodd" clipRule="evenodd" d="M26 72V71.64C26 68.18 26 65.004 26.348 62.424C26.728 59.58 27.628 56.572 30.1 54.104C32.572 51.628 35.58 50.728 38.42 50.344C41.004 50 44.18 50 47.644 50H48.356C51.82 50 54.996 50 57.576 50.348C60.42 50.728 63.428 51.628 65.896 54.1C68.372 56.572 69.272 59.58 69.656 62.42C69.996 64.968 70 68.084 70 71.488C80.292 69.288 88 60.24 88 49.408C88 39.528 81.572 31.12 72.62 28.06C71.348 16.776 61.66 8 49.904 8C37.28 8 27.048 17.948 26.024 30.408C15.584 31.252 8 39.924 8 49.9C8 59.408 14.8 67.584 23.936 69.376C24.376 69.46 24.86 69.54 25.412 69.612C25.584 70.312 25.748 70.996 26 72Z" fill="#4ADE80" fillOpacity="0.3"/>
        <path fillRule="evenodd" clipRule="evenodd" d="M48 56C40.456 56 36.688 56 34.344 58.344C32 60.688 32 64.456 32 72C32 79.544 32 83.312 34.344 85.656C36.688 88 40.456 88 48 88C55.544 88 59.312 88 61.656 85.656C64 83.312 64 79.544 64 72C64 64.456 64 60.688 61.656 58.344C59.312 56 55.544 56 48 56ZM55.22 68.336L49.884 63.004C48.843 61.966 47.157 61.966 46.116 63.004L40.78 68.336C40.079 69.004 39.794 70 40.037 70.938C40.281 71.875 41.013 72.608 41.95 72.851C42.888 73.094 43.884 72.809 44.552 72.108L45.332 71.328V78.668C45.332 80.14 46.528 81.332 48 81.332C49.472 81.332 50.668 80.14 50.668 78.668V71.328L51.448 72.108C52.116 72.809 53.112 73.094 54.05 72.851C54.987 72.608 55.719 71.875 55.963 70.938C56.206 70 55.921 69.004 55.22 68.336Z" fill="#4ADE80"/>
      </svg>
    ),
  },
  {
    title: "Ad-Free Gaming",
    description: "Enjoy uninterrupted gaming content with zero ads across your entire experience.",
    icon: (
      <svg width="96" height="96" viewBox="0 0 96 96" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="48" cy="48" r="36" stroke="#4ADE80" strokeWidth="4" strokeOpacity="0.3"/>
        <path d="M16 16L80 80" stroke="#4ADE80" strokeWidth="4" strokeLinecap="round"/>
        <path d="M40 36V60L60 48L40 36Z" stroke="#4ADE80" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.6"/>
      </svg>
    ),
  },
  {
    title: "Store Discounts",
    description: "Get up to 20% off on all name tags, borders, and exclusive items in the store.",
    icon: (
      <svg width="96" height="96" viewBox="0 0 96 96" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M36 60L60 36" stroke="#4ADE80" strokeWidth="4" strokeLinecap="round"/>
        <path d="M84.82 45.64L51.32 12.14C50.42 11.24 49.22 10.74 47.92 10.74H20C16.7 10.74 14 13.44 14 16.74V44.46C14 45.76 14.5 47.04 15.4 47.92L48.88 81.42C50.76 83.3 53.78 83.3 55.68 81.42L84.82 52.28C86.72 50.38 86.72 47.52 84.82 45.64Z" stroke="#4ADE80" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.3"/>
        <circle cx="28" cy="28" r="6" fill="#4ADE80"/>
      </svg>
    ),
  },
];

export default function ProOnboardingScreen({ onComplete }: ProOnboardingScreenProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      setShowSuccess(true);
    }
  };

  const handleSkip = () => {
    setShowSuccess(true);
  };

  if (showSuccess) {
    return (
      <div className="flex flex-col w-full h-full min-h-[500px] md:min-h-[600px] bg-[#101D27] relative overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[344px] h-[746px] rounded-full bg-[#4ade8033] blur-[60px]" />
        <div className="absolute top-1/4 left-1/3 -translate-x-1/2 w-[344px] h-[746px] rounded-full bg-[#2b7fff1a] blur-[60px]" />

        <div className="flex-1 flex flex-col items-center justify-center gap-12 px-6 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center gap-4"
          >
            <div className="bg-[#4ade801a] border border-[#4ade804d] rounded-full px-4 py-1.5">
              <span className="text-[10px] font-black text-[#4ade80] uppercase tracking-[2px]">
                Subscription Active
              </span>
            </div>
            <h1 className="text-4xl font-black text-[#f8fafc] uppercase text-center" style={{ letterSpacing: '-0.9px' }}>
              Pro Unlocked
            </h1>
            <p className="text-base font-medium text-[#94a3b8] text-center max-w-[293px] leading-[26px]">
              The ultimate gaming experience starts now. All premium features, assets, and perks are now at your fingertips.
            </p>
          </motion.div>

          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, type: "spring" }}
            className="relative w-64 h-64 flex items-center justify-center"
          >
            <div className="absolute inset-0 rounded-full bg-[#4ade804d] blur-[30px]" />
            <div className="relative w-56 h-56 flex items-center justify-center">
              <img
                src={proHeroImage}
                alt="Pro"
                className="w-56 h-56 object-cover rounded-2xl"
              />
            </div>
          </motion.div>
        </div>

        <div className="px-8 pb-8 md:pb-10 relative z-10">
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            onClick={onComplete}
            className="w-full max-w-[367px] mx-auto block h-[60px] bg-[#4ade80] hover:bg-[#3bce71] text-black text-lg font-normal rounded-[28px] transition-colors"
            style={{ boxShadow: "0 10px 20px -5px #4ade804d" }}
          >
            Continue
          </motion.button>
        </div>
      </div>
    );
  }

  const slide = slides[currentSlide];

  return (
    <div className="flex flex-col w-full h-full min-h-[500px] md:min-h-[600px] bg-[#101D27] overflow-hidden">
      <div className="flex justify-end items-center h-[92px] px-6 pt-12 pb-2">
        <button
          onClick={handleSkip}
          className="text-sm font-medium text-[#94a3b8] hover:text-white transition-colors px-4 py-2"
        >
          Skip
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center gap-12 md:gap-16 px-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col items-center gap-4"
          >
            <h2 className="text-[30px] font-bold text-white text-center" style={{ letterSpacing: '-0.75px', lineHeight: '36px' }}>
              {slide.title}
            </h2>
            <p className="text-lg text-[#94a3b8] text-center max-w-[260px] leading-[29.25px]">
              {slide.description}
            </p>
          </motion.div>
        </AnimatePresence>

        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.3 }}
            className="relative w-48 h-48 flex items-center justify-center"
          >
            <div className="absolute w-72 h-72 rounded-full bg-[#4ade8033] blur-[40px] -top-10 -left-10" />
            <div className="absolute w-48 h-48 rounded-full bg-[#14532d4d] blur-[20px]" />
            <div className="relative backdrop-blur-sm bg-[#1e293b80] border border-[#1e293b80] rounded-[40px] w-48 h-48 flex items-center justify-center" style={{ boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
              {slide.icon}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="flex flex-col gap-8 px-8 pb-8 md:pb-10">
        <div className="flex justify-center items-center gap-2 w-full max-w-[366px] mx-auto">
          {slides.map((_, i) => (
            <div
              key={i}
              className={`flex-1 h-2 rounded-full transition-colors duration-300 ${
                i <= currentSlide ? 'bg-[#4ade80]' : 'bg-[#1e293b]'
              }`}
            />
          ))}
        </div>

        <button
          onClick={handleNext}
          className="w-full max-w-[366px] mx-auto flex items-center justify-center gap-2 h-[60px] bg-[#4ade80] hover:bg-[#3bce71] text-[#022c22] text-lg font-bold rounded-2xl transition-colors"
          style={{ boxShadow: "0 0 25px -5px #4ade8066" }}
        >
          <span>Next</span>
          <ArrowRight className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
}
