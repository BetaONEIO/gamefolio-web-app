import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { GoogleAuthButton } from "./GoogleAuthButton";
import { DiscordAuthButton } from "./DiscordAuthButton";
import { PasswordRequirementsDisplay } from "@/components/ui/password-requirements";
import { FieldError, FieldStatus } from "@/components/ui/field-error";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, X } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface RegisterFormProps {
  onSuccess: () => void;
}

export default function RegisterForm({ onSuccess }: RegisterFormProps) {
  const initialReferralCode = (() => {
    try {
      return new URLSearchParams(window.location.search).get('ref') || '';
    } catch {
      return '';
    }
  })();

  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    dateOfBirth: "",
    referralCode: initialReferralCode,
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
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{
    username?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
    dateOfBirth?: string;
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
    const el = e.target;
    el.classList.add("typing");
    setTimeout(() => el.classList.remove("typing"), 150);
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
    if (!formData.username || !formData.email || !formData.password || !formData.confirmPassword || !formData.dateOfBirth) {
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

    // Date of birth age validation (must be 13 or older)
    const dob = new Date(formData.dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    if (age < 13) {
      setFieldErrors({ dateOfBirth: "You must be at least 13 years old to create an account" });
      toast({
        title: "Error",
        description: "You must be at least 13 years old to create an account",
        variant: "gamefolioError",
      });
      return;
    }

    if (!agreedToTerms) {
      toast({
        title: "Error",
        description: "You must agree to the Terms & Conditions and Privacy Policy to register",
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
    const { confirmPassword, referralCode, ...userData } = formData;
    const trimmedCode = referralCode.trim().toUpperCase();
    const registrationData: {
      username: string;
      email: string;
      password: string;
      dateOfBirth: string;
      displayName: string;
      referralCode?: string;
    } = {
      ...userData,
      displayName: userData.username,
      ...(trimmedCode && { referralCode: trimmedCode }),
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
    <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
      <div className="space-y-2">
        <Label htmlFor="username" className="text-foreground">Username</Label>
        <Input
          id="username"
          name="username"
          placeholder="Choose a username"
          value={formData.username}
          onChange={handleChange}
          disabled={isLoading}
          className="auth-input"
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
          className="auth-input"
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
          className="auth-input"
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
          className="auth-input"
        />
        <FieldError 
          error={passwordsMatch === false ? "Passwords do not match" : undefined}
          success={passwordsMatch === true ? "Passwords match" : undefined}
        />
        <FieldError error={fieldErrors.confirmPassword} />
      </div>

      <div className="space-y-2">
        <Label className="text-foreground">Date of Birth</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              disabled={isLoading}
              className={cn(
                "w-full justify-start text-left font-normal bg-background border-input hover:bg-accent/50",
                !formData.dateOfBirth && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {formData.dateOfBirth
                ? format(new Date(formData.dateOfBirth + "T00:00:00"), "dd MMMM yyyy")
                : "Select your date of birth"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 bg-gray-900 border-gray-700" align="center" sideOffset={4}>
            <Calendar
              mode="single"
              selected={formData.dateOfBirth ? new Date(formData.dateOfBirth + "T00:00:00") : undefined}
              onSelect={(date) => {
                if (date) {
                  const yyyy = date.getFullYear();
                  const mm = String(date.getMonth() + 1).padStart(2, "0");
                  const dd = String(date.getDate()).padStart(2, "0");
                  setFormData((prev) => ({ ...prev, dateOfBirth: `${yyyy}-${mm}-${dd}` }));
                  setFieldErrors((prev) => ({ ...prev, dateOfBirth: undefined }));
                }
              }}
              onMonthChange={(newMonth) => {
                if (formData.dateOfBirth) {
                  const currentDate = new Date(formData.dateOfBirth + "T00:00:00");
                  const day = currentDate.getDate();
                  const daysInNewMonth = new Date(newMonth.getFullYear(), newMonth.getMonth() + 1, 0).getDate();
                  const clampedDay = Math.min(day, daysInNewMonth);
                  const yyyy = newMonth.getFullYear();
                  const mm = String(newMonth.getMonth() + 1).padStart(2, "0");
                  const dd = String(clampedDay).padStart(2, "0");
                  setFormData((prev) => ({ ...prev, dateOfBirth: `${yyyy}-${mm}-${dd}` }));
                }
              }}
              disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
              month={formData.dateOfBirth ? new Date(formData.dateOfBirth + "T00:00:00") : undefined}
              defaultMonth={formData.dateOfBirth ? new Date(formData.dateOfBirth + "T00:00:00") : new Date(new Date().getFullYear() - 18, 0, 1)}
              captionLayout="dropdown-buttons"
              fromYear={1900}
              toYear={new Date().getFullYear()}
              className="rounded-md"
              classNames={{
                caption_label: "hidden",
                caption_dropdowns: "flex gap-2 justify-center",
                dropdown: "bg-gray-800 text-white border border-gray-600 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-primary",
                dropdown_month: "",
                dropdown_year: "",
                vhidden: "sr-only",
              }}
            />
          </PopoverContent>
        </Popover>
        <p className="text-xs text-muted-foreground">You must be at least 13 years old to sign up</p>
        <FieldError error={fieldErrors.dateOfBirth} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="referralCode" className="text-foreground text-sm">
          Referral Code <span className="text-muted-foreground font-normal">(optional)</span>
        </Label>
        <Input
          id="referralCode"
          name="referralCode"
          placeholder="g4m3f0li0"
          value={formData.referralCode}
          onChange={handleChange}
          disabled={isLoading}
          className="auth-input uppercase"
          maxLength={8}
        />
        <p className="text-xs text-muted-foreground">Have a friend's referral code? Enter it here to earn bonus XP!</p>
      </div>

      <div className="flex items-start gap-2">
        <input
          type="checkbox"
          id="agree-terms"
          checked={agreedToTerms}
          onChange={(e) => setAgreedToTerms(e.target.checked)}
          disabled={isLoading}
          className="mt-1 h-4 w-4 rounded border-gray-600 bg-gray-800 text-primary focus:ring-primary accent-primary cursor-pointer"
        />
        <label htmlFor="agree-terms" className="text-xs text-muted-foreground cursor-pointer select-none">
          By registering you are agreeing to our{" "}
          <button type="button" onClick={(e) => { e.preventDefault(); setShowTerms(true); }} className="text-primary hover:underline">
            Terms & Conditions
          </button>{" "}
          and{" "}
          <button type="button" onClick={(e) => { e.preventDefault(); setShowPrivacy(true); }} className="text-primary hover:underline">
            Privacy Policy
          </button>
        </label>
      </div>

      <Dialog open={showTerms} onOpenChange={setShowTerms}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto bg-gray-900 border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-primary">Terms and Conditions</DialogTitle>
            <p className="text-sm text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</p>
          </DialogHeader>
          <div className="prose prose-invert prose-sm max-w-none text-gray-300 space-y-4">
            <h2 className="text-lg font-semibold text-white">1. Acceptance of Terms</h2>
            <p>By accessing and using Gamefolio ("the Service"), you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.</p>

            <h2 className="text-lg font-semibold text-white">2. Description of Service</h2>
            <p>Gamefolio is a social gaming platform that allows users to:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Upload and share gaming clips, screenshots, and reels</li>
              <li>Create and customize gaming profiles</li>
              <li>Follow other gamers and discover content</li>
              <li>Connect gaming accounts and showcase achievements</li>
              <li>Participate in the gaming community</li>
            </ul>

            <h2 className="text-lg font-semibold text-white">3. User Accounts</h2>
            <p>To access certain features of the Service, you must register for an account. When you register, you agree to:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Provide accurate, current, and complete information</li>
              <li>Maintain the security of your password and identification</li>
              <li>Accept responsibility for all activities under your account</li>
              <li>Notify us immediately of unauthorized use of your account</li>
            </ul>

            <h2 className="text-lg font-semibold text-white">4. Content Guidelines</h2>
            <p>Users are responsible for the content they upload. You agree not to upload content that:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Is illegal, harmful, or offensive</li>
              <li>Violates intellectual property rights</li>
              <li>Contains malware or harmful code</li>
              <li>Promotes harassment or discrimination</li>
              <li>Is sexually explicit or inappropriate</li>
              <li>Violates any applicable laws or regulations</li>
            </ul>

            <h2 className="text-lg font-semibold text-white">5. Intellectual Property</h2>
            <p>You retain ownership of content you upload, but grant Gamefolio a non-exclusive, worldwide, royalty-free license to use, display, and distribute your content on the platform. The Gamefolio platform, including its design, features, and code, is protected by copyright and other intellectual property laws.</p>

            <h2 className="text-lg font-semibold text-white">6. Privacy and Data Protection</h2>
            <p>Your privacy is important to us. Please review our Privacy Policy, which also governs your use of the Service, to understand our practices.</p>

            <h2 className="text-lg font-semibold text-white">7. Community Standards</h2>
            <p>Gamefolio is committed to maintaining a positive gaming community. Users must:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Treat other users with respect</li>
              <li>Follow community guidelines</li>
              <li>Report inappropriate behavior</li>
              <li>Engage in constructive interactions</li>
            </ul>

            <h2 className="text-lg font-semibold text-white">8. Termination</h2>
            <p>We may terminate or suspend your account and bar access to the Service immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms.</p>

            <h2 className="text-lg font-semibold text-white">9. Disclaimer of Warranties</h2>
            <p>The Service is provided on an "AS IS" and "AS AVAILABLE" basis. Gamefolio makes no representations or warranties of any kind, express or implied, as to the operation of the Service or the information included on the Service.</p>

            <h2 className="text-lg font-semibold text-white">10. Limitation of Liability</h2>
            <p>Gamefolio will not be liable for any damages of any kind arising from the use of the Service, including but not limited to direct, indirect, incidental, punitive, and consequential damages.</p>

            <h2 className="text-lg font-semibold text-white">11. Changes to Terms</h2>
            <p>We reserve the right to modify these terms at any time. Changes will be effective immediately upon posting. Your continued use of the Service after changes constitutes acceptance of the new terms.</p>

            <h2 className="text-lg font-semibold text-white">12. Contact Information</h2>
            <p>If you have any questions about these Terms and Conditions, please contact us at:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Email: legal@gamefolio.com</li>
              <li>Website: www.gamefolio.com</li>
            </ul>

            <h2 className="text-lg font-semibold text-white">13. Governing Law</h2>
            <p>These Terms shall be interpreted and governed by the laws of the jurisdiction in which Gamefolio operates, without regard to its conflict of law provisions.</p>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showPrivacy} onOpenChange={setShowPrivacy}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto bg-gray-900 border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-primary">Privacy Policy</DialogTitle>
            <p className="text-sm text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</p>
          </DialogHeader>
          <div className="prose prose-invert prose-sm max-w-none text-gray-300 space-y-4">
            <h2 className="text-lg font-semibold text-white">1. Introduction</h2>
            <p>Welcome to Gamefolio. We respect your privacy and are committed to protecting your personal data. This privacy policy explains how we collect, use, and safeguard your information when you use our gaming social platform.</p>

            <h2 className="text-lg font-semibold text-white">2. Information We Collect</h2>
            <h3 className="text-base font-medium text-white">2.1 Personal Information</h3>
            <p>When you create an account, we collect:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Username and display name</li>
              <li>Email address</li>
              <li>Password (encrypted)</li>
              <li>Profile information (bio, gaming preferences)</li>
              <li>Profile pictures and banners</li>
            </ul>

            <h3 className="text-base font-medium text-white">2.2 Content Information</h3>
            <p>When you use our platform, we collect:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Gaming clips, screenshots, and reels you upload</li>
              <li>Comments, likes, and reactions</li>
              <li>Gaming achievements and statistics</li>
              <li>Social interactions (follows, messages)</li>
            </ul>

            <h3 className="text-base font-medium text-white">2.3 Technical Information</h3>
            <p>We automatically collect:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>IP address and device information</li>
              <li>Browser type and version</li>
              <li>Usage patterns and preferences</li>
              <li>Performance and error logs</li>
            </ul>

            <h2 className="text-lg font-semibold text-white">3. How We Use Your Information</h2>
            <p>We use your information to:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Provide and maintain our gaming platform</li>
              <li>Personalize your gaming experience</li>
              <li>Enable social features and community interactions</li>
              <li>Send important account and service notifications</li>
              <li>Improve our platform and develop new features</li>
              <li>Ensure platform security and prevent abuse</li>
              <li>Comply with legal obligations</li>
            </ul>

            <h2 className="text-lg font-semibold text-white">4. Information Sharing</h2>
            <h3 className="text-base font-medium text-white">4.1 Public Content</h3>
            <p>Content you choose to make public (gaming clips, profile information, comments) will be visible to other users and may be shared across the platform.</p>

            <h3 className="text-base font-medium text-white">4.2 Service Providers</h3>
            <p>We work with trusted service providers who help us operate our platform, including cloud hosting, email services, and analytics providers.</p>

            <h3 className="text-base font-medium text-white">4.3 Legal Requirements</h3>
            <p>We may disclose information if required by law, legal process, or to protect the rights, property, or safety of Gamefolio, our users, or others.</p>

            <h2 className="text-lg font-semibold text-white">5. Data Security</h2>
            <p>We implement appropriate technical and organizational measures to protect your personal data, including:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Encryption of sensitive data in transit and at rest</li>
              <li>Regular security audits and monitoring</li>
              <li>Access controls and authentication measures</li>
              <li>Secure data storage and backup procedures</li>
            </ul>

            <h2 className="text-lg font-semibold text-white">6. Your Rights and Choices</h2>
            <p>You have the right to:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Access and review your personal data</li>
              <li>Update or correct your information</li>
              <li>Delete your account and associated data</li>
              <li>Control your privacy settings</li>
              <li>Opt out of non-essential communications</li>
              <li>Request data portability</li>
            </ul>

            <h2 className="text-lg font-semibold text-white">7. Cookies and Tracking</h2>
            <p>We use cookies and similar technologies to enhance your experience, including:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Essential cookies for platform functionality</li>
              <li>Analytics cookies to understand usage patterns</li>
              <li>Preference cookies to remember your settings</li>
            </ul>
            <p>You can control cookie settings through your browser preferences.</p>

            <h2 className="text-lg font-semibold text-white">8. Third-Party Services</h2>
            <p>Our platform integrates with third-party gaming services (Steam, PlayStation, Xbox, etc.). When you connect these accounts, we may receive information according to their privacy policies and the permissions you grant.</p>

            <h2 className="text-lg font-semibold text-white">9. International Data Transfers</h2>
            <p>Your information may be transferred to and processed in countries other than your own. We ensure appropriate safeguards are in place to protect your data during such transfers.</p>

            <h2 className="text-lg font-semibold text-white">10. Children's Privacy</h2>
            <p>Gamefolio is not intended for children under 13. We do not knowingly collect personal information from children under 13. If we become aware of such collection, we will delete the information immediately.</p>

            <h2 className="text-lg font-semibold text-white">11. Data Retention</h2>
            <p>We retain your personal data only as long as necessary to provide our services and fulfill legal obligations. When you delete your account, we will delete or anonymize your personal data, except where retention is required by law.</p>

            <h2 className="text-lg font-semibold text-white">12. Changes to This Policy</h2>
            <p>We may update this privacy policy from time to time. We will notify you of any material changes by email or through our platform. Your continued use of Gamefolio after changes constitutes acceptance.</p>

            <h2 className="text-lg font-semibold text-white">13. Contact Us</h2>
            <p>If you have questions about this privacy policy or our data practices, please contact us at:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Email: privacy@gamefolio.com</li>
              <li>Website: www.gamefolio.com</li>
            </ul>

            <h2 className="text-lg font-semibold text-white">14. Regional Compliance</h2>
            <h3 className="text-base font-medium text-white">14.1 GDPR (European Union)</h3>
            <p>If you are in the EU, you have additional rights under the General Data Protection Regulation, including the right to lodge a complaint with a supervisory authority.</p>

            <h3 className="text-base font-medium text-white">14.2 CCPA (California)</h3>
            <p>California residents have rights under the California Consumer Privacy Act, including the right to know what personal information is collected and the right to delete personal information.</p>
          </div>
        </DialogContent>
      </Dialog>

      {/* General server error display */}
      {serverError && (
        <FieldError error={serverError} />
      )}

      <Button 
        type="submit" 
        className="w-full py-4 sm:py-6 text-base bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 transition-all border-0 shadow-md shadow-primary/20"
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

      <div className="space-y-3">
        <GoogleAuthButton disabled={isLoading} />
        <DiscordAuthButton disabled={isLoading} />
      </div>
    </form>
  );
}