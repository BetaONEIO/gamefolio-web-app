import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import LoginForm from "@/components/auth/login-form";
import RegisterForm from "@/components/auth/register-form";
import ForgotPasswordForm from "@/components/auth/ForgotPasswordForm";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { X } from "lucide-react";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: "login" | "register";
}

const CLOSE_MS = 550;

export default function AuthModal({ isOpen, onClose, defaultTab = "login" }: AuthModalProps) {
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const { user, isLoading } = useAuth();

  // ── Animation state ──────────────────────────────────────────────────────
  const [mounted, setMounted] = useState(false);
  const [slideIn, setSlideIn] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (isOpen) {
      setMounted(true);
      const t = setTimeout(() => setSlideIn(true), 16);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  const triggerClose = () => {
    setSlideIn(false);
    closeTimer.current = setTimeout(() => {
      setMounted(false);
      onClose();
    }, CLOSE_MS);
  };

  useEffect(() => () => { if (closeTimer.current) clearTimeout(closeTimer.current); }, []);

  // Close sheet if user becomes authenticated
  useEffect(() => {
    if (user && !isLoading && mounted) {
      triggerClose();
    }
  }, [user, isLoading]);

  // Reset tab when sheet opens
  useEffect(() => {
    if (isOpen) {
      setActiveTab(defaultTab);
      setShowForgotPassword(false);
    }
  }, [isOpen, defaultTab]);

  const handleSuccess = () => triggerClose();
  const handleForgotPassword = () => setShowForgotPassword(true);
  const handleBackToLogin = () => setShowForgotPassword(false);

  if (isLoading || !mounted) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex flex-col justify-end md:items-center"
      style={{ pointerEvents: slideIn ? 'auto' : 'none' }}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black transition-opacity"
        style={{
          opacity: slideIn ? 0.65 : 0,
          transitionDuration: slideIn ? '300ms' : `${CLOSE_MS}ms`,
          transitionTimingFunction: slideIn ? 'ease-out' : 'ease-in',
        }}
        onClick={triggerClose}
      />

      {/* Sheet */}
      <div
        className="relative w-full rounded-t-[20px] md:max-w-md md:rounded-2xl md:mb-8"
        style={{
          background: '#101923',
          transform: slideIn ? 'translateY(0)' : 'translateY(100%)',
          transition: slideIn
            ? 'transform 350ms cubic-bezier(0.32, 0.72, 0, 1)'
            : `transform ${CLOSE_MS}ms cubic-bezier(0.4, 0, 1, 1)`,
          maxHeight: '92dvh',
          overflowY: 'auto',
          scrollbarWidth: 'none',
        }}
      >
        <style>{`.__auth-sheet::-webkit-scrollbar { display: none; }`}</style>

        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 rounded-full" style={{ background: '#1B2A33' }} />
        </div>

        {/* Close button */}
        <button
          onClick={triggerClose}
          data-testid="button-close-auth"
          className="absolute top-4 right-4 z-10 flex items-center justify-center w-8 h-8 rounded-full transition-colors"
          style={{ background: '#1B2A33', color: '#B8C0AE' }}
          title="Close"
        >
          <X className="h-4 w-4" />
        </button>

        <div
          className="px-6 pb-8 text-white"
          style={{ paddingBottom: 'calc(2rem + env(safe-area-inset-bottom, 0px))' }}
        >
          {/* Logo */}
          <div className="mb-6 mt-2 flex justify-center">
            <img
              src="/attached_assets/Gamefolio logo.png"
              alt="Gamefolio"
              className="h-16 w-auto drop-shadow-lg"
            />
          </div>

          {/* Tabs */}
          <Tabs
            defaultValue="login"
            value={activeTab}
            onValueChange={value => setActiveTab(value as "login" | "register")}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-2 mb-6 gap-2 p-1.5 rounded-xl" style={{ background: '#0B1218' }}>
              <TabsTrigger
                value="login"
                className="rounded-lg font-semibold transition-all duration-150 data-[state=active]:shadow-none"
                style={activeTab === "login"
                  ? { backgroundColor: '#B7FF1A', color: '#000' }
                  : { backgroundColor: '#0B1218', color: '#B8C0AE' }}
                data-testid="tab-login"
              >
                Login
              </TabsTrigger>
              <TabsTrigger
                value="register"
                className="rounded-lg font-semibold transition-all duration-150 data-[state=active]:shadow-none"
                style={activeTab === "register"
                  ? { backgroundColor: '#B7FF1A', color: '#000' }
                  : { backgroundColor: '#0B1218', color: '#B8C0AE' }}
                data-testid="tab-register"
              >
                Register
              </TabsTrigger>
            </TabsList>

            <TabsContent value="login" forceMount className={activeTab === "login" ? "block" : "hidden"}>
              {showForgotPassword ? (
                <ForgotPasswordForm onBack={handleBackToLogin} />
              ) : (
                <LoginForm onSuccess={handleSuccess} onForgotPassword={handleForgotPassword} />
              )}
            </TabsContent>

            <TabsContent value="register" forceMount className={activeTab === "register" ? "block" : "hidden"}>
              <RegisterForm onSuccess={() => setActiveTab("login")} />
            </TabsContent>
          </Tabs>

          <div className="mt-6 text-center">
            <p className="text-sm font-medium" style={{ color: '#B8C0AE', opacity: 0.5 }}>www.gamefolio.com</p>
          </div>
        </div>
      </div>
    </div>
  );
}
