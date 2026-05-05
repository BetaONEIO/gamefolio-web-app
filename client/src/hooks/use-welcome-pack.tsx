import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "./use-auth";

interface WelcomePackContextType {
  showWelcomePack: boolean;
  showWalletPointer: boolean;
  canClaimWelcomePack: boolean;
  openWelcomePack: () => void;
  closeWelcomePack: () => void;
  onClaimComplete: () => void;
  dismissWalletPointer: () => void;
}

const WelcomePackContext = createContext<WelcomePackContextType | undefined>(undefined);

interface WelcomePackStatus {
  claimed: boolean;
  canClaim: boolean;
}

export function WelcomePackProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [showWelcomePack, setShowWelcomePack] = useState(false);
  const [showWalletPointer, setShowWalletPointer] = useState(false);

  const { data: status } = useQuery<WelcomePackStatus>({
    queryKey: ["/api/welcome-pack/status"],
    enabled: !!user,
  });

  const openWelcomePack = useCallback(() => {
    setShowWelcomePack(true);
  }, []);

  const closeWelcomePack = useCallback(() => {
    setShowWelcomePack(false);
  }, []);

  const onClaimComplete = useCallback(() => {
    setShowWelcomePack(false);
    setShowWalletPointer(true);
  }, []);

  const dismissWalletPointer = useCallback(() => {
    setShowWalletPointer(false);
  }, []);

  const canClaimWelcomePack = status?.canClaim ?? false;

  // Auto-open the welcome pack dialog when the server says it can be claimed
  useEffect(() => {
    if (status?.canClaim && !status?.claimed) {
      setShowWelcomePack(true);
    }
  }, [status?.canClaim, status?.claimed]);

  return (
    <WelcomePackContext.Provider
      value={{
        showWelcomePack,
        showWalletPointer,
        canClaimWelcomePack,
        openWelcomePack,
        closeWelcomePack,
        onClaimComplete,
        dismissWalletPointer,
      }}
    >
      {children}
    </WelcomePackContext.Provider>
  );
}

export function useWelcomePack() {
  const context = useContext(WelcomePackContext);
  if (context === undefined) {
    throw new Error("useWelcomePack must be used within a WelcomePackProvider");
  }
  return context;
}
