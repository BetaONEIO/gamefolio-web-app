import { createContext, useContext, useState, ReactNode } from "react";

interface AuthModalContextType {
  isOpen: boolean;
  openModal: (defaultTab?: "login" | "register", initialUsername?: string) => void;
  closeModal: () => void;
  defaultTab: "login" | "register";
  initialUsername: string;
}

const AuthModalContext = createContext<AuthModalContextType | undefined>(undefined);

export function AuthModalProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [defaultTab, setDefaultTab] = useState<"login" | "register">("login");
  const [initialUsername, setInitialUsername] = useState("");

  const openModal = (tab: "login" | "register" = "login", username = "") => {
    setDefaultTab(tab);
    setInitialUsername(username.trim());
    setIsOpen(true);
  };

  const closeModal = () => {
    setIsOpen(false);
  };

  return (
    <AuthModalContext.Provider value={{ isOpen, openModal, closeModal, defaultTab, initialUsername }}>
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