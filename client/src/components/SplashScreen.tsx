import { useEffect, useRef } from "react";
import logoGreen from "@assets/gamefolio-logo-green.png";

interface SplashScreenProps {
  onDone: () => void;
}

export function SplashScreen({ onDone }: SplashScreenProps) {
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    const t = setTimeout(() => onDoneRef.current(), 1800);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="splash-screen" aria-hidden="true">
      <img
        src={logoGreen}
        alt="Gamefolio"
        className="splash-logo"
        draggable={false}
      />
    </div>
  );
}
