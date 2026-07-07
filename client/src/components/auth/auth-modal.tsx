import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import LoginForm from "@/components/auth/login-form";
import RegisterForm from "@/components/auth/register-form";
import ForgotPasswordForm from "@/components/auth/ForgotPasswordForm";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { X } from "lucide-react";

const isDeveloperSubdomain = typeof window !== "undefined" && window.location.hostname === 'developer.gamefolio.com';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: "login" | "register";
}

const CLOSE_MS = 550;
const DISMISS_THRESHOLD = 80;

export default function AuthModal({ isOpen, onClose, defaultTab = "login" }: AuthModalProps) {
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const { user, isLoading } = useAuth();

  // ── Animation state ──────────────────────────────────────────────────────
  const [mounted, setMounted] = useState(false);
  const [slideIn, setSlideIn] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout>>();

  // ── Drag-to-dismiss state ─────────────────────────────────────────────────
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const touchStartY = useRef(0);
  const touchStartScrollTop = useRef(0);
  const sheetRef = useRef<HTMLDivElement>(null);

  // ── Keyboard-aware compacting ─────────────────────────────────────────────
  // On iOS/Android the native keyboard shrinks the WebView (resize: 'native').
  // The full-size modal then no longer fits, so the OS scrolls the focused
  // field into view and the sheet visibly jumps. We compact the layout (shrink
  // the logo, tighten spacing) while the keyboard is open so everything fits
  // above the keyboard and no scroll-jump is needed. `mobile-init.ts` toggles
  // the `keyboard-visible` class on <body> from the Capacitor Keyboard events.
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  useEffect(() => {
    if (typeof document === "undefined") return;
    const sync = () => setKeyboardOpen(document.body.classList.contains("keyboard-visible"));
    sync();
    const obs = new MutationObserver(sync);
    obs.observe(document.body, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (isOpen) {
      setMounted(true);
      const t = setTimeout(() => setSlideIn(true), 16);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  const triggerClose = () => {
    setDragY(0);
    setIsDragging(false);
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
      setDragY(0);
    }
  }, [isOpen, defaultTab]);

  const handleSuccess = () => triggerClose();
  const handleForgotPassword = () => setShowForgotPassword(true);
  const handleBackToLogin = () => setShowForgotPassword(false);

  // ── Touch handlers ────────────────────────────────────────────────────────
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
    touchStartScrollTop.current = sheetRef.current?.scrollTop ?? 0;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const deltaY = e.touches[0].clientY - touchStartY.current;
    const scrollTop = sheetRef.current?.scrollTop ?? 0;

    // Only allow drag-to-dismiss when sheet content is at the top
    if (deltaY > 0 && scrollTop <= 0) {
      setIsDragging(true);
      setDragY(deltaY);
      // Prevent the page from scrolling while we're dismissing
      e.preventDefault();
    } else {
      setIsDragging(false);
      setDragY(0);
    }
  };

  const handleTouchEnd = () => {
    if (dragY >= DISMISS_THRESHOLD) {
      triggerClose();
    } else {
      setDragY(0);
      setIsDragging(false);
    }
  };

  if (isLoading || !mounted) return null;

  const sheetTransform = isDragging
    ? `translateY(${dragY}px)`
    : slideIn
      ? 'translateY(0)'
      : 'translateY(100%)';

  const sheetTransition = isDragging
    ? 'none'
    : slideIn
      ? 'transform 350ms cubic-bezier(0.32, 0.72, 0, 1)'
      : `transform ${CLOSE_MS}ms cubic-bezier(0.4, 0, 1, 1)`;

  const backdropOpacity = isDragging
    ? Math.max(0, 0.65 * (1 - dragY / 300))
    : slideIn ? 0.65 : 0;

  return (
    <div
      className="fixed inset-0 z-[200000] flex flex-col justify-end md:items-center"
      style={{ pointerEvents: slideIn ? 'auto' : 'none' }}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black"
        style={{
          opacity: backdropOpacity,
          transition: isDragging ? 'none' : (slideIn ? '300ms ease-out' : `${CLOSE_MS}ms ease-in`),
        }}
        onClick={triggerClose}
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        className="relative w-full rounded-t-[20px] md:max-w-md md:rounded-2xl md:mb-8"
        style={{
          background: '#101923',
          transform: sheetTransform,
          transition: sheetTransition,
          maxHeight: '92dvh',
          overflowY: 'auto',
          scrollbarWidth: 'none',
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <style>{`.__auth-sheet::-webkit-scrollbar { display: none; }`}</style>

        {/* Drag handle — always dismissible */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0 touch-none select-none">
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
          {/* Logo — shrinks while the keyboard is open so the form fits above it */}
          <div
            className="flex justify-center"
            style={{
              marginTop: keyboardOpen ? 0 : '0.5rem',
              marginBottom: keyboardOpen ? '0.75rem' : '1.5rem',
              transition: 'margin 200ms ease',
            }}
          >
            <img
              src="/attached_assets/gf-logo-tex_1780361907049.png"
              alt="Gamefolio"
              className="w-auto drop-shadow-lg"
              style={{
                height: keyboardOpen ? '4rem' : '9rem',
                transition: 'height 200ms ease',
              }}
            />
          </div>

          {/* Tabs */}
          <Tabs
            defaultValue="login"
            value={activeTab}
            onValueChange={value => setActiveTab(value as "login" | "register")}
            className="w-full"
          >
            <TabsList
              className={isDeveloperSubdomain ? "grid w-full grid-cols-1 p-1.5 rounded-xl" : "grid w-full grid-cols-2 gap-2 p-1.5 rounded-xl"}
              style={{ background: '#0B1218', marginBottom: keyboardOpen ? '1rem' : '1.5rem' }}
            >
              <TabsTrigger
                value="login"
                className="rounded-lg font-semibold transition-all duration-150 data-[state=active]:shadow-none"
                style={activeTab === "login"
                  ? { backgroundColor: '#B7FF1A', color: '#000' }
                  : { backgroundColor: '#0B1218', color: '#B8C0AE' }}
                data-testid="tab-login"
              >
                {isDeveloperSubdomain ? "Developer Sign In" : "Login"}
              </TabsTrigger>
              {!isDeveloperSubdomain && (
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
              )}
            </TabsList>

            <TabsContent value="login" forceMount className={activeTab === "login" ? "block" : "hidden"}>
              {showForgotPassword ? (
                <ForgotPasswordForm onBack={handleBackToLogin} />
              ) : (
                <LoginForm onSuccess={handleSuccess} onForgotPassword={handleForgotPassword} />
              )}
            </TabsContent>

            {!isDeveloperSubdomain && (
              <TabsContent value="register" forceMount className={activeTab === "register" ? "block" : "hidden"}>
                <RegisterForm onSuccess={() => setActiveTab("login")} />
              </TabsContent>
            )}
          </Tabs>

          {isDeveloperSubdomain && (
            <div className="mt-4 p-3 rounded-lg text-center text-sm" style={{ background: '#0B1218', color: '#B8C0AE' }}>
              New accounts must be created on{" "}
              <a
                href="https://app.gamefolio.com/auth"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold hover:underline"
                style={{ color: '#B7FF1A' }}
              >
                app.gamefolio.com
              </a>
              . Sign in here with your existing account.
            </div>
          )}

          {!keyboardOpen && (
            <div className="mt-6 text-center">
              <p className="text-sm font-medium" style={{ color: '#B8C0AE', opacity: 0.5 }}>www.gamefolio.com</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
