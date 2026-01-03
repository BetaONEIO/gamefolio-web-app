import { motion } from "motion/react";
import { Heart } from "lucide-react";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { useState } from "react";

interface ClipCardProps {
  id: number;
  thumbnail: string;
  duration: string;
  user: string;
  game: string;
  title: string;
  timeAgo: string;
}

export default function ClipCard({
  thumbnail,
  duration,
  user,
  game,
  title,
  timeAgo,
}: ClipCardProps) {
  const [liked, setLiked] = useState(false);

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className="relative rounded-2xl overflow-hidden cursor-pointer group"
    >
      {/* Thumbnail */}
      <div className="relative aspect-video">
        <ImageWithFallback
          src={thumbnail}
          alt={`${game} clip`}
          className="w-full h-full object-cover"
        />
        
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
        
        {/* Duration badge */}
        <div className="absolute top-3 left-3 bg-black/70 backdrop-blur-sm px-2 py-1 rounded text-white">
          {duration}
        </div>
        
        {/* Like button */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={(e) => {
            e.stopPropagation();
            setLiked(!liked);
          }}
          className="absolute top-3 right-3 bg-black/70 backdrop-blur-sm p-2 rounded-full"
        >
          <Heart
            className={`w-5 h-5 ${
              liked ? "fill-red-500 text-red-500" : "text-white"
            }`}
          />
        </motion.button>

        {/* Info overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-white">{duration}</span>
            <span className="text-white">{user}</span>
            <span className="text-gray-400">•</span>
            <span className="text-white">{game}</span>
          </div>
          <p className="text-white">{title}</p>
        </div>
      </div>

      {/* Time ago */}
      <div className="absolute bottom-4 right-4 text-gray-400">
        {timeAgo}
      </div>
    </motion.div>
  );
}
