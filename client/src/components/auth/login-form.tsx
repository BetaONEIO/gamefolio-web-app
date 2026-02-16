import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { GoogleAuthButton } from "./GoogleAuthButton";
import { DiscordAuthButton } from "./DiscordAuthButton";
import { FieldError } from "@/components/ui/field-error";
import { Eye, EyeOff } from "lucide-react";

interface LoginFormProps {
  onSuccess: () => void;
  onForgotPassword?: () => void;
}

export default function LoginForm({ onSuccess, onForgotPassword }: LoginFormProps) {
  const [usernameOrEmail, setUsernameOrEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{
    usernameOrEmail?: string;
    password?: string;
  }>({});
  const { toast } = useToast();
  const { loginMutation } = useAuth();
  const isLoading = loginMutation.isPending;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Clear previous errors
    setFieldErrors({});
    
    if (!usernameOrEmail || !password) {
      if (!usernameOrEmail) {
        setFieldErrors({ usernameOrEmail: "Username or email is required" });
      }
      if (!password) {
        setFieldErrors(prev => ({ ...prev, password: "Password is required" }));
      }
      return;
    }
    
    // Use the useAuth hook's loginMutation instead of direct fetch
    loginMutation.mutate(
      { username: usernameOrEmail, password },
      {
        onSuccess: () => {
          // onSuccess function from props
          onSuccess();
        },
        onError: (error: Error) => {
          // Handle login errors contextually
          const errorMessage = error.message.toLowerCase();
          
          if (errorMessage.includes('incorrect username') || errorMessage.includes('not found')) {
            setFieldErrors({ usernameOrEmail: "Username or email not found" });
          } else if (errorMessage.includes('incorrect password') || errorMessage.includes('password')) {
            setFieldErrors({ password: "Incorrect password" });
          } else {
            // Generic error - show on password field as fallback
            setFieldErrors({ password: error.message });
          }
        }
      }
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
      <div className="space-y-2">
        <Label htmlFor="usernameOrEmail" className="text-foreground">Username or Email</Label>
        <Input
          id="usernameOrEmail"
          placeholder="Enter your username or email"
          value={usernameOrEmail}
          onChange={(e) => {
            const el = e.target;
            el.classList.add("typing");
            setTimeout(() => el.classList.remove("typing"), 150);
            setUsernameOrEmail(e.target.value);
          }}
          disabled={isLoading}
          className="auth-input"
        />
        <FieldError error={fieldErrors.usernameOrEmail} />
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="login-password" className="text-foreground">Password</Label>
          <button 
            type="button" 
            onClick={onForgotPassword}
            className="text-sm text-primary hover:text-primary/80 transition-colors"
          >
            Forgot password?
          </button>
        </div>
        <div className="relative">
          <Input
            id="login-password"
            type={showPassword ? "text" : "password"}
            placeholder="Enter your password"
            value={password}
            onChange={(e) => {
              const el = e.target;
              el.classList.add("typing");
              setTimeout(() => el.classList.remove("typing"), 150);
              setPassword(e.target.value);
            }}
            disabled={isLoading}
            autoComplete="current-password"
            className="auth-input pr-10"
            data-testid="input-password"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300 transition-colors"
            data-testid="button-toggle-password"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
        <FieldError error={fieldErrors.password} />
      </div>
      
      <Button 
        type="submit" 
        className="w-full py-4 sm:py-6 text-base bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 transition-all border-0 shadow-md shadow-primary/20"
        disabled={isLoading}
      >
        {isLoading ? "Signing in..." : "Sign In"}
      </Button>

      <div className="relative">
        <div className="w-full border-t border-white/20" />
        <div className="flex justify-center mt-4">
          <span className="text-xs uppercase text-gray-400">or</span>
        </div>
      </div>

      <div className="space-y-3">
        <GoogleAuthButton disabled={isLoading} />
        <DiscordAuthButton disabled={isLoading} />
      </div>
    </form>
  );
}