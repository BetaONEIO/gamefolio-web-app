import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Gamepad2, Zap, Target, Trophy, Star, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import gamefolioLogo from '@assets/gamefolio social logo 3d circle web.png';

interface GameLoaderProps {
  isLoading: boolean;
  loadingText?: string;
  variant?: "default" | "upload" | "processing" | "auth" | "clips";
  size?: "sm" | "md" | "lg" | "full";
  className?: string;
}

const gameIcons = [Gamepad2, Zap, Target, Trophy, Star, Play];

const loadingMessages = {
  default: [
    "Loading your gaming experience...",
    "Preparing your clips...",
    "Getting everything ready...",
    "Almost there, gamer!",
  ],
  upload: [
    "Uploading your epic moment...",
    "Processing your gameplay...",
    "Saving your highlight...",
    "Almost ready to share!",
  ],
  processing: [
    "Processing video...",
    "Applying filters...",
    "Optimizing quality...",
    "Finalizing your clip...",
  ],
  auth: [
    "Setting up your profile...",
    "Loading your games...",
    "Preparing your dashboard...",
    "Welcome to Gamefolio!",
  ],
  clips: [
    "Loading epic moments...",
    "Fetching highlights...",
    "Preparing the feed...",
    "Getting the best clips...",
  ],
};

export const GameLoader = ({
  isLoading,
  loadingText,
  variant = "default",
  size = "md",
  className,
}: GameLoaderProps) => {
  const [currentMessage, setCurrentMessage] = useState(0);
  const [currentIcon, setCurrentIcon] = useState(0);

  useEffect(() => {
    if (!isLoading) return;

    const messageInterval = setInterval(() => {
      setCurrentMessage((prev) => (prev + 1) % loadingMessages[variant].length);
    }, 2000);

    const iconInterval = setInterval(() => {
      setCurrentIcon((prev) => (prev + 1) % gameIcons.length);
    }, 800);

    return () => {
      clearInterval(messageInterval);
      clearInterval(iconInterval);
    };
  }, [isLoading, variant]);

  const sizeConfig = {
    sm: {
      container: "h-32",
      icon: "w-8 h-8",
      text: "text-sm",
      dots: "w-1 h-1",
    },
    md: {
      container: "h-48",
      icon: "w-12 h-12",
      text: "text-base",
      dots: "w-1.5 h-1.5",
    },
    lg: {
      container: "h-64",
      icon: "w-16 h-16",
      text: "text-lg",
      dots: "w-2 h-2",
    },
    full: {
      container: "min-h-screen",
      icon: "w-20 h-20",
      text: "text-xl",
      dots: "w-2 h-2",
    },
  };

  const config = sizeConfig[size];
  const CurrentIcon = gameIcons[currentIcon];

  return (
    <AnimatePresence>
      {isLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className={cn(
            "flex flex-col items-center justify-center",
            config.container,
            size === "full" && "fixed inset-0 bg-background/95 backdrop-blur-sm z-50",
            className
          )}
        >
          {/* Animated Background Circles */}
          <div className="absolute inset-0 overflow-hidden">
            {[...Array(6)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute rounded-full bg-primary/10"
                style={{
                  width: `${20 + i * 10}px`,
                  height: `${20 + i * 10}px`,
                  left: `${20 + i * 15}%`,
                  top: `${30 + i * 10}%`,
                }}
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [0.3, 0.6, 0.3],
                }}
                transition={{
                  duration: 2 + i * 0.5,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
            ))}
          </div>

          {/* Main Loading Content */}
          <div className="relative z-10 flex flex-col items-center space-y-6">
            {/* Gamefolio Logo with Rotating Ring */}
            <motion.div
              className={cn(
                "relative flex items-center justify-center",
                config.icon
              )}
            >
              {/* Gamefolio Logo */}
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5 }}
                className="relative z-10"
              >
                <img 
                  src={gamefolioLogo} 
                  alt="Gamefolio Logo" 
                  className={cn(
                    "object-contain",
                    size === "sm" ? "w-10 h-10" : 
                    size === "md" ? "w-14 h-14" :
                    size === "lg" ? "w-18 h-18" : "w-20 h-20"
                  )}
                />
              </motion.div>
              
              {/* Outer Ring */}
              <motion.div
                className={cn(
                  "absolute border-2 border-primary/30 rounded-full",
                  size === "sm" ? "w-16 h-16" : 
                  size === "md" ? "w-20 h-20" :
                  size === "lg" ? "w-24 h-24" : "w-28 h-28"
                )}
                animate={{ rotate: 360 }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
              />
            </motion.div>

            {/* Loading Text */}
            <div className="text-center space-y-2">
              <AnimatePresence mode="wait">
                <motion.p
                  key={loadingText || loadingMessages[variant][currentMessage]}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className={cn(
                    "font-medium text-foreground",
                    config.text
                  )}
                >
                  {loadingText || loadingMessages[variant][currentMessage]}
                </motion.p>
              </AnimatePresence>

              {/* Animated Dots */}
              <div className="flex space-x-1 justify-center">
                {[...Array(3)].map((_, i) => (
                  <motion.div
                    key={i}
                    className={cn(
                      "bg-primary rounded-full",
                      config.dots
                    )}
                    animate={{
                      scale: [1, 1.5, 1],
                      opacity: [0.7, 1, 0.7],
                    }}
                    transition={{
                      duration: 1,
                      repeat: Infinity,
                      delay: i * 0.2,
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Progress Bar for Upload/Processing */}
            {(variant === "upload" || variant === "processing") && (
              <div className="w-48 h-1 bg-secondary rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-primary rounded-full"
                  initial={{ width: "0%" }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 4, ease: "easeInOut" }}
                />
              </div>
            )}
          </div>

          {/* Floating Particles */}
          {size === "full" && (
            <div className="absolute inset-0 pointer-events-none">
              {[...Array(20)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-1 h-1 bg-primary/40 rounded-full"
                  style={{
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                  }}
                  animate={{
                    y: [-20, -40, -20],
                    opacity: [0, 1, 0],
                  }}
                  transition={{
                    duration: 3 + Math.random() * 2,
                    repeat: Infinity,
                    delay: Math.random() * 2,
                  }}
                />
              ))}
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// Specialized Loading Components
export const ClipLoader = ({ isLoading, className }: { isLoading: boolean; className?: string }) => (
  <GameLoader
    isLoading={isLoading}
    variant="clips"
    size="md"
    className={className}
  />
);

export const UploadLoader = ({ isLoading, className }: { isLoading: boolean; className?: string }) => (
  <GameLoader
    isLoading={isLoading}
    variant="upload"
    size="lg"
    className={className}
  />
);

export const FullScreenLoader = ({ isLoading, variant = "default" }: { isLoading: boolean; variant?: "default" | "auth" }) => (
  <GameLoader
    isLoading={isLoading}
    variant={variant}
    size="full"
  />
);

export const InlineLoader = ({ isLoading, text, className }: { isLoading: boolean; text?: string; className?: string }) => (
  <GameLoader
    isLoading={isLoading}
    loadingText={text}
    size="sm"
    className={className}
  />
);