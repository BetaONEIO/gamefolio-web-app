import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { ReactNode } from "react";

interface PageTransitionProps {
  children: ReactNode;
  className?: string;
}

const pageVariants = {
  initial: {
    opacity: 0,
    y: 20,
    scale: 0.98,
  },
  in: {
    opacity: 1,
    y: 0,
    scale: 1,
  },
  out: {
    opacity: 0,
    y: -20,
    scale: 1.02,
  },
};

const pageTransition = {
  type: "tween",
  ease: "anticipate",
  duration: 0.4,
};

// Gaming-themed slide transitions
const slideVariants = {
  slideLeft: {
    initial: { x: "100%", opacity: 0 },
    in: { x: 0, opacity: 1 },
    out: { x: "-100%", opacity: 0 },
  },
  slideRight: {
    initial: { x: "-100%", opacity: 0 },
    in: { x: 0, opacity: 1 },
    out: { x: "100%", opacity: 0 },
  },
  slideUp: {
    initial: { y: "100%", opacity: 0 },
    in: { y: 0, opacity: 1 },
    out: { y: "-100%", opacity: 0 },
  },
  slideDown: {
    initial: { y: "-100%", opacity: 0 },
    in: { y: 0, opacity: 1 },
    out: { y: "100%", opacity: 0 },
  },
};

export const PageTransition = ({ children, className }: PageTransitionProps) => {
  const [location] = useLocation();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location}
        initial="initial"
        animate="in"
        exit="out"
        variants={pageVariants}
        transition={pageTransition}
        className={className}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
};

// Specialized transitions for different page types
export const GameTransition = ({ 
  children, 
  direction = "slideLeft",
  className 
}: { 
  children: ReactNode; 
  direction?: keyof typeof slideVariants;
  className?: string;
}) => {
  const [location] = useLocation();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location}
        initial="initial"
        animate="in"
        exit="out"
        variants={slideVariants[direction]}
        transition={{ duration: 0.5, ease: "easeInOut" }}
        className={className}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
};

// Hero section transition with scale effect
export const HeroTransition = ({ children }: { children: ReactNode }) => {
  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
};

// Card stagger animation for grids
export const StaggerContainer = ({ children, className }: { children: ReactNode; className?: string }) => {
  return (
    <motion.div
      initial="initial"
      animate="animate"
      variants={{
        initial: {},
        animate: {
          transition: {
            staggerChildren: 0.1,
          },
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

export const StaggerItem = ({ children, className }: { children: ReactNode; className?: string }) => {
  return (
    <motion.div
      variants={{
        initial: {
          opacity: 0,
          y: 20,
          scale: 0.9,
        },
        animate: {
          opacity: 1,
          y: 0,
          scale: 1,
          transition: {
            duration: 0.4,
            ease: "easeOut",
          },
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

// Modal/Dialog transition
export const ModalTransition = ({ children, isOpen }: { children: ReactNode; isOpen: boolean }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// Upload progress transition
export const UploadTransition = ({ children, isUploading }: { children: ReactNode; isUploading: boolean }) => {
  return (
    <motion.div
      animate={isUploading ? { scale: [1, 1.02, 1] } : { scale: 1 }}
      transition={{ duration: 2, repeat: isUploading ? Infinity : 0 }}
    >
      {children}
    </motion.div>
  );
};