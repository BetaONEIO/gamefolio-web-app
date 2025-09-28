import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import LoginForm from "@/components/auth/login-form";
import RegisterForm from "@/components/auth/register-form";
import ForgotPasswordForm from "@/components/auth/ForgotPasswordForm";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: "login" | "register";
}

export default function AuthModal({ isOpen, onClose, defaultTab = "login" }: AuthModalProps) {
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const { user, isLoading } = useAuth();
  const { toast } = useToast();

  // Close modal if user becomes authenticated
  useEffect(() => {
    if (user && !isLoading) {
      onClose();
    }
  }, [user, isLoading, onClose]);

  // Reset tab when modal opens
  useEffect(() => {
    if (isOpen) {
      setActiveTab(defaultTab);
      setShowForgotPassword(false);
    }
  }, [isOpen, defaultTab]);

  const handleSuccess = () => {
    onClose();
  };

  const handleForgotPassword = () => {
    setShowForgotPassword(true);
  };

  const handleBackToLogin = () => {
    setShowForgotPassword(false);
  };

  if (isLoading) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md p-0 gap-0 bg-black/95 border-white/10">
        {/* Content */}
        <div className="relative p-6">
          {/* Logo and Header */}
          <div className="mb-8 text-center">
            <div className="flex flex-col items-center">
              <img
                src="/attached_assets/Gamefolio logo.png"
                alt="Gamefolio"
                className="h-24 w-auto drop-shadow-lg"
              />
              <div className="mt-3 px-3 py-1 bg-orange-500 text-white text-sm font-bold rounded-full shadow-lg">
                Alpha 1.1 • Sep 28, 2025
              </div>
            </div>
          </div>

          {/* Auth Forms */}
          <Tabs
            defaultValue="login"
            value={activeTab}
            onValueChange={(value) => setActiveTab(value as "login" | "register")}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger
                value="login"
                className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary data-[state=active]:shadow-none"
                data-testid="tab-login"
              >
                Login
              </TabsTrigger>
              <TabsTrigger
                value="register"
                className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary data-[state=active]:shadow-none"
                data-testid="tab-register"
              >
                Register
              </TabsTrigger>
            </TabsList>

            <TabsContent value="login" forceMount className={activeTab === "login" ? "block" : "hidden"}>
              {showForgotPassword ? (
                <ForgotPasswordForm onBack={handleBackToLogin} />
              ) : (
                <LoginForm
                  onSuccess={handleSuccess}
                  onForgotPassword={handleForgotPassword}
                />
              )}
            </TabsContent>

            <TabsContent value="register" forceMount className={activeTab === "register" ? "block" : "hidden"}>
              <RegisterForm onSuccess={() => setActiveTab("login")} />
            </TabsContent>
          </Tabs>

          {/* Website URL underneath the form */}
          <div className="mt-6 text-center">
            <p className="text-white/60 text-sm font-medium">www.gamefolio.com</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}