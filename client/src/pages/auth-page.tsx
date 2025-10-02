import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import LoginForm from "@/components/auth/login-form";
import RegisterForm from "@/components/auth/register-form";
import ForgotPasswordForm from "@/components/auth/ForgotPasswordForm";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FaPlaystation, FaSteam, FaGamepad, FaXbox } from "react-icons/fa";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, AlertTriangle, X } from "lucide-react";

export default function AuthPage() {
  const [activeTab, setActiveTab] = useState("login");
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // Redirect to home if already logged in
  useEffect(() => {
    if (user && !isLoading) {
      setLocation("/");
    }
  }, [user, isLoading, setLocation]);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const verificationStatus = urlParams.get('verificationStatus');
    const message = urlParams.get('message');

    if (verificationStatus && message) {
      const decodedMessage = decodeURIComponent(message);

      if (verificationStatus === 'success') {
        toast({
          title: "Email Verified!",
          description: decodedMessage,
          variant: "gamefolioSuccess",
        });
      } else if (verificationStatus === 'expired') {
        toast({
          title: "Verification Link Expired",
          description: decodedMessage,
          variant: "gamefolioError",
        });
      } else if (verificationStatus === 'error') {
        toast({
          title: "Verification Error",
          description: decodedMessage,
          variant: "gamefolioError",
        });
      }

      // Clean up the URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [toast]);


  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (user) {
    return null;
  }

  const handleSuccess = () => {
    // Form success handler - redirect will be handled by the form
  };

  const handleForgotPassword = () => {
    setShowForgotPassword(true);
  };

  const handleBackToLogin = () => {
    setShowForgotPassword(false);
  };

  return (
    <div className="min-h-screen w-full relative flex items-center justify-center p-4 overflow-hidden">
      {/* Video Background */}
      <video
        className="fixed inset-0 w-full h-full object-cover z-0"
        autoPlay
        loop
        muted
        playsInline
        onError={(e) => console.log('Video error:', e)}
        onLoadStart={() => console.log('Video loading started')}
        onCanPlay={() => console.log('Video can play')}
      >
        <source src="/attached_assets/gamer.mp4" type="video/mp4" />
        <source src="./attached_assets/gamer.mp4" type="video/mp4" />
        Your browser does not support the video tag.
      </video>

      {/* Faded Black Overlay */}
      <div className="absolute inset-0 bg-black/60 z-10"></div>

      {/* Dark Navy Overlay */}
      <div className="absolute inset-0 bg-navy-900/40 z-15"></div>

      {/* Content */}
      <div className="relative z-20 w-full max-w-md min-h-[600px] flex flex-col justify-center">
        <div className="mb-10 text-center">
          <div className="flex flex-col items-center">
            <img
              src="/attached_assets/Gamefolio logo.png"
              alt="Gamefolio"
              className="h-36 w-auto drop-shadow-lg"
            />
            <div className="mt-3 px-3 py-1 bg-orange-500 text-white text-sm font-bold rounded-full shadow-lg">
              Alpha 1.2 • Oct 02, 2025
            </div>
          </div>
        </div>

        <Tabs
          defaultValue="login"
          value={activeTab}
          onValueChange={setActiveTab}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-2 mb-8">
            <TabsTrigger
              value="login"
              className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary data-[state=active]:shadow-none"
            >
              Login
            </TabsTrigger>
            <TabsTrigger
              value="register"
              className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary data-[state=active]:shadow-none"
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
    </div>
  );
}