import { createContext, useContext, useState, ReactNode } from "react";

interface AuthModalContextType {
  isOpen: boolean;
  openModal: (defaultTab?: "login" | "register") => void;
  closeModal: () => void;
  defaultTab: "login" | "register";
}

const AuthModalContext = createContext<AuthModalContextType | undefined>(undefined);

export function AuthModalProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [defaultTab, setDefaultTab] = useState<"login" | "register">("login");

  const openModal = (tab: "login" | "register" = "login") => {
    setDefaultTab(tab);
    setIsOpen(true);
  };

  const closeModal = () => {
    setIsOpen(false);
  };

  return (
    <AuthModalContext.Provider value={{ isOpen, openModal, closeModal, defaultTab }}>
      {children}
    </AuthModalContext.Provider>
  );
}

export function useAuthModal() {
  const context = useContext(AuthModalContext);
  if (context === undefined) {
    throw new Error("useAuthModal must be used within an AuthModalProvider");
  }
  return context;
}