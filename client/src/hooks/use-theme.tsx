import { createContext, useContext, useEffect, useState } from "react";

type ThemeProviderProps = {
  children: React.ReactNode;
};

type ThemeProviderState = {
  theme: "dark";
  setTheme: () => void;
  actualTheme: "dark";
  accentColor: string;
  setAccentColor: (color: string) => void;
};

const hexToHsl = (hex: string): string => {
  const cleanHex = hex.replace("#", "");

  if (cleanHex.length !== 6) {
    return "142 71% 45%";
  }

  const r = parseInt(cleanHex.slice(0, 2), 16) / 255;
  const g = parseInt(cleanHex.slice(2, 4), 16) / 255;
  const b = parseInt(cleanHex.slice(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;

  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (delta !== 0) {
    s = delta / (1 - Math.abs(2 * l - 1));

    switch (max) {
      case r:
        h = ((g - b) / delta) % 6;
        break;
      case g:
        h = (b - r) / delta + 2;
        break;
      case b:
        h = (r - g) / delta + 4;
        break;
    }

    h = Math.round(h * 60);
    if (h < 0) h += 360;
  }

  const sPercent = Math.round(s * 100);
  const lPercent = Math.round(l * 100);

  return `${h} ${sPercent}% ${lPercent}%`;
};

const initialState: ThemeProviderState = {
  theme: "dark",
  setTheme: () => null,
  actualTheme: "dark",
  accentColor: "#4ADE80",
  setAccentColor: () => null,
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

export function ThemeProvider({
  children,
  ...props
}: ThemeProviderProps) {
  const [accentColor, setAccentColorState] = useState<string>(() => {
    try {
      if (typeof window !== "undefined") {
        return localStorage.getItem("gf.theme.accent") || "#4ADE80";
      }
    } catch {
      // ignore storage errors
    }

    return "#4ADE80";
  });

  const setAccentColor = (color: string) => {
    setAccentColorState(color);

    try {
      if (typeof window !== "undefined") {
        localStorage.setItem("gf.theme.accent", color);
      }
    } catch {
      // ignore storage errors
    }

    if (typeof document !== "undefined") {
      const hslColor = hexToHsl(color);
      const root = document.documentElement;

      root.style.setProperty("--primary", hslColor);
      root.style.setProperty("--accent", hslColor);
      root.style.setProperty("--ring", hslColor);
      root.style.setProperty("--chart-1", hslColor);
      root.style.setProperty("--chart-2", hslColor);
    }
  };

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add("dark");
  }, []);

  useEffect(() => {
    const hslColor = hexToHsl(accentColor);
    const root = window.document.documentElement;

    root.style.setProperty("--primary", hslColor);
    root.style.setProperty("--accent", hslColor);
    root.style.setProperty("--ring", hslColor);
    root.style.setProperty("--chart-1", hslColor);
    root.style.setProperty("--chart-2", hslColor);
  }, [accentColor]);

  const value: ThemeProviderState = {
    theme: "dark",
    setTheme: () => {},
    actualTheme: "dark",
    accentColor,
    setAccentColor,
  };

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);

  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }

  return context;
};