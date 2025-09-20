import { createContext, useContext, useEffect, useState } from "react";

type ThemeProviderProps = {
  children: React.ReactNode;
};

type ThemeProviderState = {
  theme: "dark";
  accentColor: string;
  setTheme: () => void;
  setAccentColor: (color: string) => void;
  actualTheme: "dark";
};

const initialState: ThemeProviderState = {
  theme: "dark",
  accentColor: "#4ADE80", // Default green
  setTheme: () => null,
  setAccentColor: () => null,
  actualTheme: "dark",
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

// Helper function to convert hex to HSL
function hexToHsl(hex: string): string {
  // Remove the hash if present
  hex = hex.replace('#', '');
  
  // Parse the hex values
  const r = parseInt(hex.slice(0, 2), 16) / 255;
  const g = parseInt(hex.slice(2, 4), 16) / 255;
  const b = parseInt(hex.slice(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }

  // Convert to degrees and percentages
  h = Math.round(h * 360);
  s = Math.round(s * 100);
  const lightness = Math.round(l * 100);

  return `${h} ${s}% ${lightness}%`;
}

export function ThemeProvider({
  children,
  ...props
}: ThemeProviderProps) {
  const [accentColor, setAccentColorState] = useState<string>(() => {
    // Load from localStorage or use default
    if (typeof window !== "undefined") {
      return localStorage.getItem("gf.theme.accent") || "#4ADE80";
    }
    return "#4ADE80";
  });

  const setAccentColor = (color: string) => {
    setAccentColorState(color);
    
    // Persist to localStorage
    if (typeof window !== "undefined") {
      localStorage.setItem("gf.theme.accent", color);
    }
    
    // Convert hex to HSL and update CSS variables
    const hslColor = hexToHsl(color);
    const root = document.documentElement;
    
    // Update primary and accent colors
    root.style.setProperty('--primary', hslColor);
    root.style.setProperty('--accent', hslColor);
    
    // Update ring color for focus states
    root.style.setProperty('--ring', hslColor);
    
    // Update chart colors for consistency
    root.style.setProperty('--chart-1', hslColor);
    root.style.setProperty('--chart-2', hslColor);
    
    console.log(`Theme accent color changed to: ${color} (HSL: ${hslColor})`);
  };

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove("light", "dark");
    
    // Apply the initial accent color
    setAccentColor(accentColor);
    
    // No need to add dark class since we only use dark mode
  }, []);

  const value = {
    theme: "dark" as const,
    accentColor,
    setTheme: () => {}, // No-op since we only use dark mode
    setAccentColor,
    actualTheme: "dark" as const,
  };

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);

  if (context === undefined)
    throw new Error("useTheme must be used within a ThemeProvider");

  return context;
};