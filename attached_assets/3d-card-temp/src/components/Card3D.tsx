import { useState, useRef } from "react";
import { motion } from "motion/react";
import { LucideIcon } from "lucide-react";

interface Card3DProps {
  title: string;
  description: string;
  icon: LucideIcon;
  gradient: string;
}

export default function Card3D({ title, description, icon: Icon, gradient }: Card3DProps) {
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;

    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotateXValue = ((y - centerY) / centerY) * -15;
    const rotateYValue = ((x - centerX) / centerX) * 15;

    setRotateX(rotateXValue);
    setRotateY(rotateYValue);
  };

  const handleMouseLeave = () => {
    setRotateX(0);
    setRotateY(0);
    setIsHovered(false);
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  return (
    <div className="perspective-1000">
      <motion.div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        animate={{
          rotateX,
          rotateY,
          scale: isHovered ? 1.05 : 1,
        }}
        transition={{
          type: "spring",
          stiffness: 300,
          damping: 20,
        }}
        className="relative bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-8 cursor-pointer preserve-3d"
        style={{
          transformStyle: "preserve-3d",
        }}
      >
        {/* Glowing border effect */}
        <div
          className={`absolute inset-0 rounded-2xl bg-gradient-to-r ${gradient} opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-300`}
          style={{
            transform: "translateZ(-10px)",
          }}
        />

        {/* Card content */}
        <div className="relative z-10">
          {/* Icon with 3D effect */}
          <motion.div
            animate={{
              translateZ: isHovered ? 50 : 0,
            }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 20,
            }}
            className={`inline-flex p-4 rounded-xl bg-gradient-to-r ${gradient} mb-6`}
            style={{
              transformStyle: "preserve-3d",
            }}
          >
            <Icon className="w-8 h-8 text-white" />
          </motion.div>

          {/* Title */}
          <motion.h3
            animate={{
              translateZ: isHovered ? 30 : 0,
            }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 20,
            }}
            className="text-white mb-3"
            style={{
              transformStyle: "preserve-3d",
            }}
          >
            {title}
          </motion.h3>

          {/* Description */}
          <motion.p
            animate={{
              translateZ: isHovered ? 20 : 0,
            }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 20,
            }}
            className="text-gray-400"
            style={{
              transformStyle: "preserve-3d",
            }}
          >
            {description}
          </motion.p>

          {/* Decorative elements */}
          <motion.div
            animate={{
              translateZ: isHovered ? 40 : 0,
            }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 20,
            }}
            className={`absolute top-4 right-4 w-20 h-20 rounded-full bg-gradient-to-r ${gradient} opacity-20 blur-2xl`}
            style={{
              transformStyle: "preserve-3d",
            }}
          />
        </div>

        {/* Shine effect */}
        <motion.div
          animate={{
            opacity: isHovered ? 0.1 : 0,
          }}
          transition={{
            duration: 0.3,
          }}
          className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-transparent via-white to-transparent"
          style={{
            transform: `translateX(${rotateY * 2}px) translateY(${rotateX * 2}px)`,
          }}
        />

        {/* Border */}
        <div className={`absolute inset-0 rounded-2xl border border-white/10`} />
      </motion.div>
    </div>
  );
}
