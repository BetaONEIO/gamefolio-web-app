import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { GoogleAuthButton } from "./GoogleAuthButton";
import { PasswordRequirementsDisplay } from "@/components/ui/password-requirements";
import { FieldError, FieldStatus } from "@/components/ui/field-error";

interface RegisterFormProps {
  onSuccess: () => void;
}

export default function RegisterForm({ onSuccess }: RegisterFormProps) {
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [usernameStatus, setUsernameStatus] = useState<"idle" | "checking" | "available" | "taken" | "invalid">("idle");
  const [usernameTimer, setUsernameTimer] = useState<NodeJS.Timeout | null>(null);
  const [emailValid, setEmailValid] = useState<boolean | null>(null);
  const [passwordRequirements, setPasswordRequirements] = useState({
    length: false,
    uppercase: false,
    number: false,
    special: false,
  });
  const [passwordsMatch, setPasswordsMatch] = useState<boolean | null>(null);
  const [serverError, setServerError] = useState<string>("");
  const [fieldErrors, setFieldErrors] = useState<{
    username?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
  }>({});
  const { toast } = useToast();
  const { registerMutation } = useAuth();
  const isLoading = registerMutation.isPending;

  // Helper function to check for profanity
  const containsProfanity = (username: string) => {
    const profaneWords = [
      "fuck", "shit", "damn", "hell", "bitch", "ass", "bastard", "crap", 
      "piss", "cock", "dick", "pussy", "tits", "whore", "slut", "fag",
      "nigger", "nigga", "retard", "gay", "lesbian", "nazi", "hitler",
      "kill", "die", "death", "murder", "rape", "sex", "porn", "nude"
    ];

    const lowerUsername = username.toLowerCase();
    return profaneWords.some(word => lowerUsername.includes(word));
  };

  // Helper function to validate email format
  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Helper function to validate password requirements (local version for form state)
  const validatePasswordRequirements = (password: string) => {
    return {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      number: /\d/.test(password),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    };
  };

  const checkUsernameAvailability = async (username: string) => {
    try {
      // Check length (3-20 characters)
      if (username.length < 3 || username.length > 20) {
        setUsernameStatus("invalid");
        return;
      }

      // Check valid characters (letters, numbers, underscores only)
      if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        setUsernameStatus("invalid");
        return;
      }

      // Check for profanity locally first for immediate feedback
      const profaneWords = [
        "fuck", "shit", "damn", "hell", "bitch", "ass", "bastard", "crap", 
        "piss", "cock", "dick", "pussy", "tits", "whore", "slut", "fag",
        "nigger", "nigga", "retard", "gay", "lesbian", "nazi", "hitler",
        "kill", "die", "death", "murder", "rape", "sex", "porn", "nude"
      ];

      const lowerUsername = username.toLowerCase();
      const containsProfanity = profaneWords.some(word => lowerUsername.includes(word));

      if (containsProfanity) {
        setUsernameStatus("invalid");
        return;
      }

      // Make API call to check availability against actual database
      const response = await fetch(`/api/auth/check-username?username=${encodeURIComponent(username)}`);

      if (response.ok) {
        const data = await response.json();
        if (data.available) {
          setUsernameStatus("available");
        } else {
          setUsernameStatus("taken");
        }
      } else {
        const errorData = await response.json();
        const errorMessage = errorData.message || '';

        // Check if it's a format/validation error or username taken
        if (errorMessage.includes('already taken') || errorMessage.includes('taken')) {
          setUsernameStatus("taken");
        } else if (errorMessage.includes('characters') || errorMessage.includes('format') || errorMessage.includes('contain')) {
          setUsernameStatus("invalid");
        } else {
          // Default to taken for any other 400 error
          setUsernameStatus("taken");
        }
      }
    } catch (error) {
      console.error("Error checking username availability:", error);
      // On error, allow the form to be submitted and let the server handle validation
      setUsernameStatus("idle");
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Email validation
    if (name === "email") {
      if (value.length === 0) {
        setEmailValid(null);
      } else {
        setEmailValid(validateEmail(value));
      }
    }

    // Password validation
    if (name === "password") {
      setPasswordRequirements(validatePasswordRequirements(value));
      // Check if passwords match when password changes
      if (formData.confirmPassword.length > 0) {
        setPasswordsMatch(value === formData.confirmPassword);
      }
    }

    // Confirm password validation
    if (name === "confirmPassword") {
      if (value.length === 0) {
        setPasswordsMatch(null);
      } else {
        setPasswordsMatch(value === formData.password);
      }
    }

    // Username availability checking with debounce
    if (name === "username") {
      setUsernameStatus("idle");

      if (usernameTimer) {
        clearTimeout(usernameTimer);
      }

      if (value.length >= 3) {
        setUsernameStatus("checking");
        const timer = setTimeout(() => {
          checkUsernameAvailability(value);
        }, 300); // Faster response time for better UX
        setUsernameTimer(timer);
      } else if (value.length > 0) {
        // Show invalid immediately if too short
        setUsernameStatus("invalid");
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate form
    if (!formData.username || !formData.email || !formData.password || !formData.confirmPassword) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "gamefolioError",
      });
      return;
    }

    if (usernameStatus === "taken") {
      toast({
        title: "Error",
        description: "Username is already taken. Please choose a different one.",
        variant: "gamefolioError",
      });
      return;
    }

    if (usernameStatus !== "available") {
      toast({
        title: "Error",
        description: "Please wait for username availability check to complete",
        variant: "gamefolioError",
      });
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast({
        title: "Error",
        description: "Please enter a valid email address",
        variant: "gamefolioError",
      });
      return;
    }

    // Password confirmation validation
    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match",
        variant: "gamefolioError",
      });
      return;
    }

    // Password requirements validation
    const passwordReqs = validatePasswordRequirements(formData.password);
    if (!passwordReqs.length || !passwordReqs.uppercase || !passwordReqs.number || !passwordReqs.special) {
      toast({
        title: "Error",
        description: "Password must meet all requirements",
        variant: "gamefolioError",
      });
      return;
    }

    // Remove confirmPassword and add displayName before sending
    const { confirmPassword, ...userData } = formData;
    const registrationData = {
      ...userData,
      displayName: userData.username, // Use username as display name
    };

    // Clear previous errors
    setServerError("");
    setFieldErrors({});

    // Use register mutation from useAuth hook
    // The useAuth hook handles the redirect to /verify-code or /onboarding automatically
    registerMutation.mutate(registrationData, {
      onError: (error: Error) => {
        // Handle specific server errors contextually
        const errorMessage = error.message.toLowerCase();

        if (errorMessage.includes('username already taken') || errorMessage.includes('username')) {
          setFieldErrors({ username: error.message });
        } else if (errorMessage.includes('email already registered') || errorMessage.includes('email')) {
          setFieldErrors({ email: error.message });
        } else if (errorMessage.includes('password')) {
          setFieldErrors({ password: error.message });
        } else {
          // Generic error - show as server error
          setServerError(error.message);
        }
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 backdrop-blur-md p-6 rounded-lg border border-white/10">
      <div className="space-y-2">
        <Label htmlFor="username" className="text-foreground">Username</Label>
        <Input
          id="username"
          name="username"
          placeholder="Choose a username"
          value={formData.username}
          onChange={handleChange}
          disabled={isLoading}
        />
        <FieldStatus status={usernameStatus} />
        <FieldError error={fieldErrors.username} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="email" className="text-foreground">Email Address</Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="your.email@example.com"
          value={formData.email}
          onChange={handleChange}
          disabled={isLoading}
        />
        <FieldError 
          error={emailValid === false ? "Please enter a valid email address" : undefined}
          success={emailValid === true ? "Valid email format" : undefined}
        />
        <FieldError error={fieldErrors.email} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="register-password" className="text-foreground">Password</Label>
        <Input
          id="register-password"
          name="password"
          type="password"
          placeholder="Create a password"
          value={formData.password}
          onChange={handleChange}
          disabled={isLoading}
          autoComplete="new-password"
        />
        <PasswordRequirementsDisplay 
          requirements={passwordRequirements} 
          accentColor="hsl(var(--primary))"
        />
        <FieldError error={fieldErrors.password} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="register-confirm-password" className="text-foreground">Confirm Password</Label>
        <Input
          id="register-confirm-password"
          name="confirmPassword"
          type="password"
          placeholder="Confirm your password"
          value={formData.confirmPassword}
          onChange={handleChange}
          disabled={isLoading}
          autoComplete="new-password"
        />
        <FieldError 
          error={passwordsMatch === false ? "Passwords do not match" : undefined}
          success={passwordsMatch === true ? "Passwords match" : undefined}
        />
        <FieldError error={fieldErrors.confirmPassword} />
      </div>

      <div className="text-xs text-muted-foreground text-center space-y-2">
        <p>
          By creating an account, you agree to our{" "}
          <a href="/terms" className="text-primary hover:underline">
            Terms and Conditions
          </a>{" "}
          and{" "}
          <a href="/privacy" className="text-primary hover:underline">
            Privacy Policy
          </a>
        </p>
      </div>

      {/* General server error display */}
      {serverError && (
        <FieldError error={serverError} />
      )}

      <Button 
        type="submit" 
        className="w-full py-6 text-base bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 transition-all border-0 shadow-md shadow-primary/20"
        disabled={isLoading}
      >
        {isLoading ? "Creating Account..." : "Create Account"}
      </Button>

      <div className="relative">
        <div className="w-full border-t border-white/20" />
        <div className="flex justify-center mt-4">
          <span className="text-xs uppercase text-gray-400">or</span>
        </div>
      </div>

      <GoogleAuthButton disabled={isLoading} />
    </form>
  );
}