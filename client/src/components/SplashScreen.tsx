import { useEffect } from "react";
import logoGreen from "@assets/gamefolio-logo-green.png";

interface SplashScreenProps {
  onDone: () => void;
}

export function SplashScreen({ onDone }: SplashScreenProps) {
  useEffect(() => {
    const t = setTimeout(() => onDone(), 1800);
    return () => clearTimeout(t);
  }, [onDone]);

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
