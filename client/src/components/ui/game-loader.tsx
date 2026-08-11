import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface GameLoaderProps {
  isLoading: boolean;
  loadingText?: string;
  variant?: "default" | "upload" | "processing" | "auth" | "clips";
  size?: "sm" | "md" | "lg" | "full";
  className?: string;
}

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

  useEffect(() => {
    if (!isLoading) return;

    const messageInterval = setInterval(() => {
      setCurrentMessage((prev) => (prev + 1) % loadingMessages[variant].length);
    }, 2000);

    return () => clearInterval(messageInterval);
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
          {/* Minimal Spinner */}
          <div className={cn("border-4 border-primary/30 border-t-primary rounded-full animate-spin", config.icon)} />

          {/* Progress Bar for Upload/Processing */}
          {(variant === "upload" || variant === "processing") && (
            <div className="w-48 h-1 bg-secondary rounded-full overflow-hidden mt-6">
              <motion.div
                className="h-full bg-primary rounded-full"
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{ duration: 4, ease: "easeInOut" }}
              />
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