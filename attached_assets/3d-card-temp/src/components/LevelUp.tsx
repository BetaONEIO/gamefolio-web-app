import { motion } from "motion/react";
import { useEffect, useState } from "react";

interface LevelUpProps {
  level: number;
  onContinue: () => void;
}

export default function LevelUp({ level, onContinue }: LevelUpProps) {
  const [showExplosion, setShowExplosion] = useState(true);
  const [confetti, setConfetti] = useState<Array<{ x: number; y: number; rotation: number; color: string; delay: number }>>([]);
  const [rays, setRays] = useState<number[]>([]);

  useEffect(() => {
    // Generate confetti particles
    const newConfetti = Array.from({ length: 30 }, () => ({
      x: (Math.random() - 0.5) * 800,
      y: (Math.random() - 0.5) * 800,
      rotation: Math.random() * 360,
      color: ['#34d399', '#10b981', '#6ee7b7', '#a7f3d0', '#fbbf24', '#f59e0b'][Math.floor(Math.random() * 6)],
      delay: Math.random() * 0.3,
    }));
    setConfetti(newConfetti);

    // Generate light rays
    setRays(Array.from({ length: 12 }, (_, i) => i));

    // Hide explosion effect after animation
    setTimeout(() => setShowExplosion(false), 1000);
  }, [level]);

  return (
    <div className="relative w-full h-screen overflow-hidden bg-gradient-to-b from-[#1e3a4a] via-[#2d4a54] to-[#1a2e3a]">
      {/* Light rays burst */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
        {rays.map((i) => (
          <motion.div
            key={`ray-${i}`}
            className="absolute w-2 h-64 bg-gradient-to-b from-emerald-400/60 via-emerald-400/30 to-transparent origin-bottom"
            style={{
              left: '50%',
              top: '50%',
              transform: `rotate(${(i * 360) / rays.length}deg) translateX(-50%)`,
            }}
            initial={{ scaleY: 0, opacity: 0 }}
            animate={{ scaleY: [0, 1, 0.7], opacity: [0, 0.8, 0.4] }}
            transition={{
              duration: 1.2,
              delay: 0.2,
              ease: "easeOut",
            }}
          />
        ))}
      </div>

      {/* Explosion ring */}
      {showExplosion && (
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
          initial={{ scale: 0, opacity: 1 }}
          animate={{ scale: 3, opacity: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <div className="w-80 h-80 rounded-full border-8 border-emerald-400" />
        </motion.div>
      )}

      {/* Confetti particles */}
      {confetti.map((particle, i) => (
        <motion.div
          key={`confetti-${i}`}
          className="absolute top-1/2 left-1/2 w-3 h-3 rounded-sm"
          style={{
            backgroundColor: particle.color,
          }}
          initial={{
            x: 0,
            y: 0,
            opacity: 1,
            scale: 0,
            rotate: 0,
          }}
          animate={{
            x: particle.x,
            y: particle.y,
            opacity: [1, 1, 0],
            scale: [0, 1, 0.5],
            rotate: [0, particle.rotation * 2, particle.rotation * 4],
          }}
          transition={{
            duration: 2,
            delay: 0.3 + particle.delay,
            ease: "easeOut",
          }}
        />
      ))}

      {/* Spiraling particles */}
      {[...Array(8)].map((_, i) => (
        <motion.div
          key={`spiral-${i}`}
          className="absolute top-1/2 left-1/2 w-4 h-4 bg-emerald-400 rounded-full"
          initial={{ x: 0, y: 0, opacity: 0 }}
          animate={{
            x: Math.cos((i * Math.PI * 2) / 8) * 300,
            y: Math.sin((i * Math.PI * 2) / 8) * 300,
            opacity: [0, 1, 0],
            scale: [0, 1.5, 0],
          }}
          transition={{
            duration: 1.5,
            delay: 0.5 + i * 0.1,
            ease: "easeOut",
          }}
        />
      ))}

      {/* Top left blob with "LEVEL" text */}
      <div className="absolute top-12 left-16 flex items-center gap-4">
        <motion.h2
          className="text-white"
          initial={{ opacity: 0, x: -30, scale: 0.8 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          transition={{ delay: 0.8, duration: 0.6, type: "spring", bounce: 0.5 }}
        >
          LEVEL
        </motion.h2>

        <motion.div
          initial={{ scale: 0, opacity: 0, rotate: -180 }}
          animate={{
            scale: 1,
            opacity: 1,
            rotate: 0,
            y: [0, -8, 0],
          }}
          transition={{
            scale: { delay: 0.9, duration: 0.7, type: "spring", bounce: 0.6 },
            opacity: { delay: 0.9, duration: 0.5 },
            rotate: { delay: 0.9, duration: 0.7, type: "spring", bounce: 0.6 },
            y: { delay: 1.8, duration: 3, repeat: Infinity, ease: "easeInOut" },
          }}
          className="relative w-32 h-28 bg-gradient-to-br from-emerald-400 to-emerald-500 rounded-full"
          style={{
            borderRadius: '65% 35% 70% 30% / 55% 65% 35% 45%',
          }}
        >
          {/* White highlight on blob */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{
              opacity: 1,
              scale: [1, 1.05, 1],
              x: [0, 2, 0],
              y: [0, -2, 0],
            }}
            transition={{
              opacity: { delay: 1.2 },
              scale: { delay: 1.8, duration: 3, repeat: Infinity, ease: "easeInOut" },
              x: { delay: 1.8, duration: 3, repeat: Infinity, ease: "easeInOut" },
              y: { delay: 1.8, duration: 3, repeat: Infinity, ease: "easeInOut" },
            }}
            className="absolute top-4 right-6 w-12 h-12 bg-white rounded-full"
          />
        </motion.div>
      </div>

      {/* Center main circle */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
        {/* Pulsing glow rings */}
        {[...Array(3)].map((_, i) => (
          <motion.div
            key={`ring-${i}`}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-emerald-400/40"
            initial={{ scale: 0, opacity: 0 }}
            animate={{
              scale: [0, 2.5, 3],
              opacity: [0.6, 0.3, 0],
            }}
            transition={{
              duration: 2,
              delay: 0.6 + i * 0.3,
              repeat: Infinity,
              repeatDelay: 0.5,
            }}
            style={{ width: 320, height: 320 }}
          />
        ))}

        {/* Orbiting particles around main circle */}
        <motion.div
          className="absolute inset-0"
          initial={{ rotate: 0, opacity: 0 }}
          animate={{ rotate: 360, opacity: 1 }}
          transition={{
            rotate: { duration: 10, repeat: Infinity, ease: "linear" },
            opacity: { delay: 1, duration: 0.5 },
          }}
        >
          {[...Array(12)].map((_, i) => {
            const angle = (i * 360) / 12;
            const radius = 180;
            const x = Math.cos((angle * Math.PI) / 180) * radius;
            const y = Math.sin((angle * Math.PI) / 180) * radius;
            
            return (
              <motion.div
                key={`orbit-${i}`}
                className="absolute w-3 h-3 bg-emerald-400/60 rounded-full"
                style={{
                  left: '50%',
                  top: '50%',
                  x: x,
                  y: y,
                }}
                initial={{ opacity: 0, scale: 0 }}
                animate={{
                  opacity: [0, 0.6, 0],
                  scale: [0, 1, 0],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  delay: 1.2 + i * 0.15,
                }}
              />
            );
          })}
        </motion.div>

        {/* Main circle with glow */}
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{
            delay: 0.5,
            duration: 1,
            type: "spring",
            bounce: 0.5,
          }}
          className="relative"
        >
          {/* Outer glow pulse */}
          <motion.div
            className="absolute -inset-16 bg-emerald-400/30 rounded-full blur-3xl"
            animate={{
              scale: [1, 1.1, 1],
              opacity: [0.3, 0.5, 0.3],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
          
          {/* Main circle */}
          <motion.div
            className="relative w-80 h-80 bg-gradient-to-br from-emerald-400 to-emerald-500 rounded-full flex items-center justify-center shadow-2xl shadow-emerald-500/50"
            animate={{
              boxShadow: [
                "0 25px 50px -12px rgba(16, 185, 129, 0.5)",
                "0 25px 50px -12px rgba(16, 185, 129, 0.8)",
                "0 25px 50px -12px rgba(16, 185, 129, 0.5)",
              ],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            {/* Inner glow */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-emerald-300/50 to-transparent" />
            
            {/* Shine effect */}
            <motion.div
              className="absolute inset-0 rounded-full bg-gradient-to-br from-white/40 via-transparent to-transparent"
              initial={{ opacity: 0, rotate: -45 }}
              animate={{ opacity: [0, 1, 0], rotate: 315 }}
              transition={{ delay: 0.7, duration: 1.5 }}
            />
            
            {/* Level number */}
            <motion.div
              initial={{ opacity: 0, scale: 0.3, y: 20 }}
              animate={{ 
                opacity: 1, 
                scale: [0.3, 1.2, 1],
                y: 0,
              }}
              transition={{
                delay: 0.7,
                duration: 0.8,
                type: "spring",
                bounce: 0.6,
              }}
              className="relative z-10 text-white"
              style={{ fontSize: '180px', fontWeight: 700, lineHeight: 1 }}
            >
              {level}
            </motion.div>

            {/* Number glow */}
            <motion.div
              className="absolute inset-0 flex items-center justify-center text-white blur-xl"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.8, 0.4] }}
              transition={{ delay: 0.8, duration: 1 }}
              style={{ fontSize: '180px', fontWeight: 700, lineHeight: 1 }}
            >
              {level}
            </motion.div>
          </motion.div>
        </motion.div>

        {/* Star sparkles around circle */}
        {[...Array(8)].map((_, i) => {
          const angle = (i * 360) / 8;
          const radius = 200;
          const x = Math.cos((angle * Math.PI) / 180) * radius;
          const y = Math.sin((angle * Math.PI) / 180) * radius;
          
          return (
            <motion.div
              key={`star-${i}`}
              className="absolute w-2 h-2 bg-white rounded-full"
              style={{
                left: '50%',
                top: '50%',
                x: x,
                y: y,
              }}
              initial={{ opacity: 0, scale: 0 }}
              animate={{
                opacity: [0, 1, 0],
                scale: [0, 2, 0],
                rotate: [0, 180, 360],
              }}
              transition={{
                duration: 1.5,
                delay: 1 + i * 0.1,
                repeat: Infinity,
                repeatDelay: 2,
              }}
            />
          );
        })}
      </div>

      {/* Continue button at bottom */}
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.5, duration: 0.6 }}
        className="absolute bottom-12 left-1/2 -translate-x-1/2 w-full max-w-2xl px-8"
      >
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onContinue}
          className="w-full bg-gradient-to-r from-emerald-400 to-emerald-500 text-white py-6 rounded-full shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50 transition-shadow"
          animate={{
            boxShadow: [
              "0 10px 15px -3px rgba(16, 185, 129, 0.3)",
              "0 10px 15px -3px rgba(16, 185, 129, 0.5)",
              "0 10px 15px -3px rgba(16, 185, 129, 0.3)",
            ],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          Continue
        </motion.button>
      </motion.div>
    </div>
  );
}
