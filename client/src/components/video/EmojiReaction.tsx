import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface EmojiReactionProps {
  emoji: string;
  x: number; // Position as percentage (0-100)
  y: number; // Position as percentage (0-100)
  onAnimationComplete?: () => void;
}

export const EmojiReaction = ({ emoji, x, y, onAnimationComplete }: EmojiReactionProps) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      if (onAnimationComplete) {
        onAnimationComplete();
      }
    }, 3000); // Show for 3 seconds

    return () => clearTimeout(timer);
  }, [onAnimationComplete]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ 
            opacity: 0, 
            scale: 0.5,
            y: 0
          }}
          animate={{ 
            opacity: 1, 
            scale: [0.5, 1.2, 1],
            y: -50
          }}
          exit={{ 
            opacity: 0, 
            scale: 0.8,
            y: -80
          }}
          transition={{ 
            duration: 0.6,
            ease: "easeOut",
            scale: {
              times: [0, 0.3, 1],
              duration: 0.6
            }
          }}
          className="absolute pointer-events-none select-none z-50"
          style={{
            left: `${x}%`,
            top: `${y}%`,
            transform: 'translate(-50%, -50%)'
          }}
        >
          <div className="text-4xl filter drop-shadow-lg">
            {emoji}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

interface EmojiReactionSystemProps {
  clipId: number;
  onReactionAdd?: (emoji: string, x: number, y: number) => void;
  className?: string;
}

export const EmojiReactionSystem = ({ 
  clipId, 
  onReactionAdd, 
  className 
}: EmojiReactionSystemProps) => {
  const [reactions, setReactions] = useState<Array<{
    id: string;
    emoji: string;
    x: number;
    y: number;
  }>>([]);

  const availableEmojis = ['❤️', '🔥', '😂', '😍', '👏', '🎉', '💯', '🚀', '⚡', '🤩'];

  const handleEmojiClick = (emoji: string, event: React.MouseEvent) => {
    event.stopPropagation();
    
    const rect = event.currentTarget.getBoundingClientRect();
    const container = event.currentTarget.closest('.video-container');
    if (!container) return;
    
    const containerRect = container.getBoundingClientRect();
    const x = ((event.clientX - containerRect.left) / containerRect.width) * 100;
    const y = ((event.clientY - containerRect.top) / containerRect.height) * 100;
    
    // Add reaction to local state for immediate animation
    const newReaction = {
      id: Date.now().toString(),
      emoji,
      x,
      y
    };
    
    setReactions(prev => [...prev, newReaction]);
    
    // Call parent callback
    if (onReactionAdd) {
      onReactionAdd(emoji, x, y);
    }
  };

  const handleAnimationComplete = (reactionId: string) => {
    setReactions(prev => prev.filter(r => r.id !== reactionId));
  };

  return (
    <div className={cn("relative", className)}>
      {/* Emoji picker */}
      <div className="absolute top-4 right-4 flex flex-wrap gap-2 bg-black bg-opacity-50 p-2 rounded-lg backdrop-blur-sm pointer-events-auto">
        {availableEmojis.map((emoji) => (
          <button
            key={emoji}
            onClick={(e) => handleEmojiClick(emoji, e)}
            className="text-2xl hover:scale-110 transition-transform duration-200 p-1 rounded hover:bg-white hover:bg-opacity-20 pointer-events-auto"
          >
            {emoji}
          </button>
        ))}
      </div>

      {/* Animated reactions */}
      {reactions.map((reaction) => (
        <EmojiReaction
          key={reaction.id}
          emoji={reaction.emoji}
          x={reaction.x}
          y={reaction.y}
          onAnimationComplete={() => handleAnimationComplete(reaction.id)}
        />
      ))}
    </div>
  );
};