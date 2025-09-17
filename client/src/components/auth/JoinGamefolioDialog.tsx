import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { X, Mail } from 'lucide-react';
import gamefolioLogo from '@assets/gamefolio social logo 3d circle web.png';
import { GoogleAuthButton } from './GoogleAuthButton';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { validatePassword, isPasswordValid } from '@/lib/password-validation';
import { PasswordRequirementsDisplay } from '@/components/ui/password-requirements';
import { FieldError } from '@/components/ui/field-error';

interface JoinGamefolioDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  actionType?: 'like' | 'comment' | 'share' | 'general';
}

export function JoinGamefolioDialog({ 
  open, 
  onOpenChange, 
  actionType = 'general' 
}: JoinGamefolioDialogProps) {
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [showLoginForm, setShowLoginForm] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [loginData, setLoginData] = useState({
    usernameOrEmail: '',
    password: ''
  });
  const [passwordRequirements, setPasswordRequirements] = useState({
    length: false,
    uppercase: false,
    number: false,
    special: false,
  });
  const [passwordsMatch, setPasswordsMatch] = useState<boolean | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  
  const { toast } = useToast();
  const { registerMutation, loginMutation } = useAuth();
  const isLoading = registerMutation.isPending || loginMutation.isPending;

  const handlePasswordChange = (password: string) => {
    setFormData(prev => ({ ...prev, password }));
    const requirements = validatePassword(password);
    setPasswordRequirements(requirements);
    
    // Check password match when password changes
    if (formData.confirmPassword) {
      setPasswordsMatch(password === formData.confirmPassword);
    }
  };

  const handleConfirmPasswordChange = (confirmPassword: string) => {
    setFormData(prev => ({ ...prev, confirmPassword }));
    setPasswordsMatch(formData.password === confirmPassword);
  };

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateUsername = (username: string) => {
    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
    return usernameRegex.test(username);
  };

  const handleEmailSignup = async () => {
    setFieldErrors({});
    
    // Validate form
    const errors: Record<string, string> = {};
    
    if (!formData.username) {
      errors.username = 'Username is required';
    } else if (!validateUsername(formData.username)) {
      errors.username = 'Username must be 3-20 characters, letters, numbers, and underscores only';
    }
    
    if (!formData.email) {
      errors.email = 'Email is required';
    } else if (!validateEmail(formData.email)) {
      errors.email = 'Please enter a valid email address';
    }
    
    if (!formData.password) {
      errors.password = 'Password is required';
    } else if (!isPasswordValid(passwordRequirements)) {
      errors.password = 'Password does not meet requirements';
    }
    
    if (!formData.confirmPassword) {
      errors.confirmPassword = 'Please confirm your password';
    } else if (!passwordsMatch) {
      errors.confirmPassword = 'Passwords do not match';
    }
    
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    // Register user
    registerMutation.mutate(
      {
        username: formData.username,
        displayName: formData.username, // Use username as display name initially
        password: formData.password,
      },
      {
        onSuccess: () => {
          toast({
            title: "Welcome to Gamefolio!",
            description: "Account created successfully. Please check your email to verify your account.",
            variant: "gamefolioSuccess",
          });
          onOpenChange(false);
        },
        onError: (error: Error) => {
          toast({
            title: "Registration Failed",
            description: error.message,
            variant: "destructive",
          });
        }
      }
    );
  };

  const handleLogin = async () => {
    setFieldErrors({});
    
    if (!loginData.usernameOrEmail || !loginData.password) {
      setFieldErrors({
        usernameOrEmail: !loginData.usernameOrEmail ? 'Username or email is required' : '',
        password: !loginData.password ? 'Password is required' : ''
      });
      return;
    }

    loginMutation.mutate(
      {
        username: loginData.usernameOrEmail,
        password: loginData.password,
      },
      {
        onSuccess: () => {
          toast({
            title: "Welcome back!",
            description: "You've been logged in successfully.",
            variant: "gamefolioSuccess",
          });
          onOpenChange(false);
        },
        onError: (error: Error) => {
          const errorMessage = error.message.toLowerCase();
          if (errorMessage.includes('incorrect username') || errorMessage.includes('not found')) {
            setFieldErrors({ usernameOrEmail: "Username or email not found" });
          } else if (errorMessage.includes('incorrect password') || errorMessage.includes('password')) {
            setFieldErrors({ password: "Incorrect password" });
          } else {
            setFieldErrors({ password: error.message });
          }
        }
      }
    );
  };

  const resetForms = () => {
    setShowEmailForm(false);
    setShowLoginForm(false);
    setFormData({ username: '', email: '', password: '', confirmPassword: '' });
    setLoginData({ usernameOrEmail: '', password: '' });
    setFieldErrors({});
    setPasswordRequirements({ length: false, uppercase: false, number: false, special: false });
    setPasswordsMatch(null);
  };

  const handleClose = () => {
    resetForms();
    onOpenChange(false);
  };

  if (showEmailForm) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-md mx-auto p-0 bg-gray-900 border-gray-700 text-white overflow-hidden">
          {/* Close button */}
          <button
            onClick={handleClose}
            data-testid="button-close-signup"
            className="absolute top-3 right-3 z-50 bg-gray-700 hover:bg-red-600 text-white rounded-full p-2 transition-all duration-200 hover:scale-110"
            title="Close"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="p-8 text-center">
            {/* Logo */}
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 rounded-2xl overflow-hidden">
                <img 
                  src={gamefolioLogo} 
                  alt="Gamefolio Logo" 
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            <h2 className="text-2xl font-bold mb-6">Create Your Account</h2>

            <div className="space-y-4 text-left">
              <div>
                <Label htmlFor="username" className="text-sm text-gray-300">Username</Label>
                <Input
                  id="username"
                  placeholder="Enter username"
                  value={formData.username}
                  onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                  className="bg-gray-800 border-gray-600 text-white placeholder:text-gray-400 focus:border-primary"
                  disabled={isLoading}
                />
                <FieldError error={fieldErrors.username} />
              </div>

              <div>
                <Label htmlFor="email" className="text-sm text-gray-300">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  className="bg-gray-800 border-gray-600 text-white placeholder:text-gray-400 focus:border-primary"
                  disabled={isLoading}
                />
                <FieldError error={fieldErrors.email} />
              </div>

              <div>
                <Label htmlFor="password" className="text-sm text-gray-300">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter password"
                  value={formData.password}
                  onChange={(e) => handlePasswordChange(e.target.value)}
                  className="bg-gray-800 border-gray-600 text-white placeholder:text-gray-400 focus:border-primary"
                  disabled={isLoading}
                />
                <PasswordRequirementsDisplay requirements={passwordRequirements} />
                <FieldError error={fieldErrors.password} />
              </div>

              <div>
                <Label htmlFor="confirmPassword" className="text-sm text-gray-300">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Confirm password"
                  value={formData.confirmPassword}
                  onChange={(e) => handleConfirmPasswordChange(e.target.value)}
                  className="bg-gray-800 border-gray-600 text-white placeholder:text-gray-400 focus:border-primary"
                  disabled={isLoading}
                />
                {passwordsMatch === false && (
                  <FieldError error="Passwords do not match" />
                )}
                <FieldError error={fieldErrors.confirmPassword} />
              </div>
            </div>

            <Button 
              onClick={handleEmailSignup}
              disabled={isLoading}
              data-testid="button-create-account"
              className="w-full mt-6 bg-primary hover:bg-primary/90 text-white py-3 text-base font-medium"
            >
              {isLoading ? 'Creating Account...' : 'Create Account'}
            </Button>

            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setShowEmailForm(false)}
                data-testid="button-back-signup"
                className="flex-1 text-sm text-gray-400 hover:text-white transition-colors py-2"
              >
                ← Back
              </button>
              <button
                onClick={handleClose}
                data-testid="button-cancel-signup"
                className="flex-1 text-sm text-gray-400 hover:text-white transition-colors py-2"
              >
                Cancel
              </button>
            </div>

            <p className="text-xs text-gray-500 mt-6">
              By registering, you agree to Gamefolio's Terms of Service and Privacy Policy
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (showLoginForm) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-md mx-auto p-0 bg-gray-900 border-gray-700 text-white overflow-hidden">
          {/* Close button */}
          <button
            onClick={handleClose}
            data-testid="button-close-signup"
            className="absolute top-3 right-3 z-50 bg-gray-700 hover:bg-red-600 text-white rounded-full p-2 transition-all duration-200 hover:scale-110"
            title="Close"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="p-8 text-center">
            {/* Logo */}
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 rounded-2xl overflow-hidden">
                <img 
                  src={gamefolioLogo} 
                  alt="Gamefolio Logo" 
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            <h2 className="text-2xl font-bold mb-6">Welcome Back</h2>

            <div className="space-y-4 text-left">
              <div>
                <Label htmlFor="usernameOrEmail" className="text-sm text-gray-300">Username or Email</Label>
                <Input
                  id="usernameOrEmail"
                  placeholder="Enter username or email"
                  value={loginData.usernameOrEmail}
                  onChange={(e) => setLoginData(prev => ({ ...prev, usernameOrEmail: e.target.value }))}
                  className="bg-gray-800 border-gray-600 text-white placeholder:text-gray-400 focus:border-primary"
                  disabled={isLoading}
                />
                <FieldError error={fieldErrors.usernameOrEmail} />
              </div>

              <div>
                <Label htmlFor="loginPassword" className="text-sm text-gray-300">Password</Label>
                <Input
                  id="loginPassword"
                  type="password"
                  placeholder="Enter password"
                  value={loginData.password}
                  onChange={(e) => setLoginData(prev => ({ ...prev, password: e.target.value }))}
                  className="bg-gray-800 border-gray-600 text-white placeholder:text-gray-400 focus:border-primary"
                  disabled={isLoading}
                />
                <FieldError error={fieldErrors.password} />
              </div>
            </div>

            <Button 
              onClick={handleLogin}
              disabled={isLoading}
              data-testid="button-sign-in"
              className="w-full mt-6 bg-primary hover:bg-primary/90 text-white py-3 text-base font-medium"
            >
              {isLoading ? 'Signing In...' : 'Sign In'}
            </Button>

            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setShowLoginForm(false)}
                data-testid="button-back-login"
                className="flex-1 text-sm text-gray-400 hover:text-white transition-colors py-2"
              >
                ← Back
              </button>
              <button
                onClick={handleClose}
                data-testid="button-cancel-login"
                className="flex-1 text-sm text-gray-400 hover:text-white transition-colors py-2"
              >
                Cancel
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md mx-auto p-0 bg-gray-900 border-gray-700 text-white overflow-hidden">
        {/* Close button */}
        <button
          onClick={handleClose}
          data-testid="button-close-main"
          className="absolute top-3 right-3 z-50 bg-gray-700 hover:bg-red-600 text-white rounded-full p-2 transition-all duration-200 hover:scale-110"
          title="Close"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="p-8 text-center">
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 rounded-2xl overflow-hidden">
              <img 
                src={gamefolioLogo} 
                alt="Gamefolio Logo" 
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          <h2 className="text-2xl font-bold mb-8">Welcome to Gamefolio</h2>

          {/* Auth buttons */}
          <div className="space-y-3">
            {/* Google Auth Button */}
            <div className="w-full">
              <GoogleAuthButton disabled={isLoading} />
            </div>

            {/* Email signup button */}
            <Button
              onClick={() => setShowEmailForm(true)}
              disabled={isLoading}
              className="w-full bg-white hover:bg-gray-100 text-black py-3 text-base font-medium flex items-center justify-center gap-3"
            >
              <Mail className="h-5 w-5" />
              Continue with Email
            </Button>
          </div>

          {/* Other Options */}
          <div className="mt-6 mb-6">
            <p className="text-sm text-green-400 font-medium">Other Options</p>
          </div>

          {/* Login link */}
          <div className="mt-8">
            <p className="text-sm text-gray-400">
              Already have an account?{' '}
              <button
                onClick={() => setShowLoginForm(true)}
                data-testid="button-show-login"
                className="text-green-400 hover:text-green-300 font-medium transition-colors"
              >
                Log In here
              </button>
            </p>
          </div>

          {/* Cancel button */}
          <div className="mt-6">
            <button
              onClick={handleClose}
              data-testid="button-cancel-main"
              className="text-sm text-gray-400 hover:text-white transition-colors"
            >
              Maybe later
            </button>
          </div>

          {/* Terms */}
          <p className="text-xs text-gray-500 mt-6">
            By registering, you agree to Gamefolio's{' '}
            <span className="text-green-400 cursor-pointer hover:underline">Terms of Service</span>{' '}
            and{' '}
            <span className="text-green-400 cursor-pointer hover:underline">Privacy Policy</span>
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}