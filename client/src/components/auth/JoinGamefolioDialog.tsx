import React, { useState, useEffect, useRef } from 'react';
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

const CLOSE_MS = 550;

export function JoinGamefolioDialog({
  open,
  onOpenChange,
  actionType = 'general',
}: JoinGamefolioDialogProps) {
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [showLoginForm, setShowLoginForm] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [loginData, setLoginData] = useState({
    usernameOrEmail: '',
    password: '',
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

  // ── Animation state ──────────────────────────────────────────────────────
  const [mounted, setMounted] = useState(false);
  const [slideIn, setSlideIn] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (open) {
      setMounted(true);
      const t = setTimeout(() => setSlideIn(true), 16);
      return () => clearTimeout(t);
    }
  }, [open]);

  const triggerClose = () => {
    setSlideIn(false);
    closeTimer.current = setTimeout(() => {
      setMounted(false);
      resetForms();
      onOpenChange(false);
    }, CLOSE_MS);
  };

  useEffect(() => () => { if (closeTimer.current) clearTimeout(closeTimer.current); }, []);

  // ── Form helpers ─────────────────────────────────────────────────────────
  const handlePasswordChange = (password: string) => {
    setFormData(prev => ({ ...prev, password }));
    const requirements = validatePassword(password);
    setPasswordRequirements(requirements);
    if (formData.confirmPassword) {
      setPasswordsMatch(password === formData.confirmPassword);
    }
  };

  const handleConfirmPasswordChange = (confirmPassword: string) => {
    setFormData(prev => ({ ...prev, confirmPassword }));
    setPasswordsMatch(formData.password === confirmPassword);
  };

  const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const validateUsername = (username: string) => /^[a-zA-Z0-9_]{3,20}$/.test(username);

  const handleEmailSignup = async () => {
    setFieldErrors({});
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

    if (Object.keys(errors).length > 0) { setFieldErrors(errors); return; }

    registerMutation.mutate(
      { username: formData.username, displayName: formData.username, password: formData.password },
      {
        onSuccess: () => {
          toast({ title: 'Welcome to Gamefolio!', description: 'Account created successfully.', variant: 'gamefolioSuccess' });
          triggerClose();
        },
        onError: (error: Error) => {
          toast({ title: 'Registration Failed', description: error.message, variant: 'gamefolioError' });
        },
      }
    );
  };

  const handleLogin = async () => {
    setFieldErrors({});
    if (!loginData.usernameOrEmail || !loginData.password) {
      setFieldErrors({
        usernameOrEmail: !loginData.usernameOrEmail ? 'Username or email is required' : '',
        password: !loginData.password ? 'Password is required' : '',
      });
      return;
    }

    loginMutation.mutate(
      { username: loginData.usernameOrEmail, password: loginData.password },
      {
        onSuccess: () => {
          toast({ title: 'Welcome back!', description: "You've been logged in successfully.", variant: 'gamefolioSuccess' });
          triggerClose();
        },
        onError: (error: Error) => {
          const msg = error.message.toLowerCase();
          if (msg.includes('incorrect username') || msg.includes('not found')) {
            setFieldErrors({ usernameOrEmail: 'Username or email not found' });
          } else if (msg.includes('incorrect password') || msg.includes('password')) {
            setFieldErrors({ password: 'Incorrect password' });
          } else {
            setFieldErrors({ password: error.message });
          }
        },
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

  if (!mounted) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex flex-col justify-end md:items-center"
      style={{ pointerEvents: slideIn ? 'auto' : 'none' }}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black transition-opacity"
        style={{
          opacity: slideIn ? 0.6 : 0,
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
        // hide webkit scrollbar
        onScroll={() => {}}
      >
        <style>{`.join-sheet::-webkit-scrollbar { display: none; }`}</style>

        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full" style={{ background: '#1B2A33' }} />
        </div>

        {/* Close button */}
        <button
          onClick={triggerClose}
          data-testid="button-close-main"
          className="absolute top-4 right-4 z-10 flex items-center justify-center w-8 h-8 rounded-full transition-colors"
          style={{ background: '#1B2A33', color: '#B8C0AE' }}
          title="Close"
        >
          <X className="h-4 w-4" />
        </button>

        <div
          className="px-6 pb-8 text-center text-white"
          style={{ paddingBottom: 'calc(2rem + env(safe-area-inset-bottom, 0px))' }}
        >
          {/* Logo */}
          <div className="flex justify-center mb-4 mt-2">
            <div className="w-14 h-14 rounded-2xl overflow-hidden">
              <img src={gamefolioLogo} alt="Gamefolio Logo" className="w-full h-full object-cover" />
            </div>
          </div>

          {/* ── Landing view ───────────────────────────────────────────── */}
          {!showEmailForm && !showLoginForm && (
            <>
              <h2 className="text-xl font-bold mb-6">Welcome to Gamefolio</h2>

              <div className="space-y-3">
                <div className="w-full">
                  <GoogleAuthButton disabled={isLoading} />
                </div>
                <Button
                  onClick={() => setShowEmailForm(true)}
                  disabled={isLoading}
                  className="w-full bg-white hover:bg-gray-100 text-black py-3 text-base font-medium flex items-center justify-center gap-3"
                >
                  <Mail className="h-5 w-5" />
                  Continue with Email
                </Button>
              </div>

              <div className="mt-5 mb-5">
                <p className="text-sm font-medium" style={{ color: '#B7FF1A' }}>Other Options</p>
              </div>

              <p className="text-sm" style={{ color: '#B8C0AE' }}>
                Already have an account?{' '}
                <button
                  onClick={() => setShowLoginForm(true)}
                  data-testid="button-show-login"
                  className="font-semibold transition-colors"
                  style={{ color: '#B7FF1A' }}
                >
                  Log In here
                </button>
              </p>

              <button
                onClick={triggerClose}
                data-testid="button-cancel-main"
                className="mt-4 text-sm transition-colors block mx-auto"
                style={{ color: '#B8C0AE' }}
              >
                Maybe later
              </button>

              <p className="text-xs mt-5" style={{ color: '#B8C0AE', opacity: 0.6 }}>
                By registering, you agree to Gamefolio's{' '}
                <span className="cursor-pointer hover:underline" style={{ color: '#B7FF1A' }}>Terms of Service</span>
                {' '}and{' '}
                <span className="cursor-pointer hover:underline" style={{ color: '#B7FF1A' }}>Privacy Policy</span>
              </p>
            </>
          )}

          {/* ── Sign-up form ────────────────────────────────────────────── */}
          {showEmailForm && (
            <>
              <h2 className="text-xl font-bold mb-5">Create Your Account</h2>

              <div className="space-y-3 text-left">
                <div>
                  <Label htmlFor="username" className="text-sm" style={{ color: '#B8C0AE' }}>Username</Label>
                  <Input
                    id="username"
                    placeholder="Enter username"
                    value={formData.username}
                    onChange={e => setFormData(prev => ({ ...prev, username: e.target.value }))}
                    className="mt-1 text-white placeholder:text-gray-500 focus:border-primary"
                    style={{ background: '#0B1218', borderColor: '#1B2A33' }}
                    disabled={isLoading}
                  />
                  <FieldError error={fieldErrors.username} />
                </div>

                <div>
                  <Label htmlFor="email" className="text-sm" style={{ color: '#B8C0AE' }}>Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter email"
                    value={formData.email}
                    onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    className="mt-1 text-white placeholder:text-gray-500 focus:border-primary"
                    style={{ background: '#0B1218', borderColor: '#1B2A33' }}
                    disabled={isLoading}
                  />
                  <FieldError error={fieldErrors.email} />
                </div>

                <div>
                  <Label htmlFor="password" className="text-sm" style={{ color: '#B8C0AE' }}>Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter password"
                    value={formData.password}
                    onChange={e => handlePasswordChange(e.target.value)}
                    className="mt-1 text-white placeholder:text-gray-500 focus:border-primary"
                    style={{ background: '#0B1218', borderColor: '#1B2A33' }}
                    disabled={isLoading}
                  />
                  <PasswordRequirementsDisplay requirements={passwordRequirements} />
                  <FieldError error={fieldErrors.password} />
                </div>

                <div>
                  <Label htmlFor="confirmPassword" className="text-sm" style={{ color: '#B8C0AE' }}>Confirm Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Confirm password"
                    value={formData.confirmPassword}
                    onChange={e => handleConfirmPasswordChange(e.target.value)}
                    className="mt-1 text-white placeholder:text-gray-500 focus:border-primary"
                    style={{ background: '#0B1218', borderColor: '#1B2A33' }}
                    disabled={isLoading}
                  />
                  {passwordsMatch === false && <FieldError error="Passwords do not match" />}
                  <FieldError error={fieldErrors.confirmPassword} />
                </div>
              </div>

              <Button
                onClick={handleEmailSignup}
                disabled={isLoading}
                data-testid="button-create-account"
                className="w-full mt-5 py-3 text-base font-medium"
                style={{ background: '#B7FF1A', color: '#000' }}
              >
                {isLoading ? 'Creating Account...' : 'Create Account'}
              </Button>

              <div className="flex gap-3 mt-3">
                <button
                  onClick={() => setShowEmailForm(false)}
                  data-testid="button-back-signup"
                  className="flex-1 text-sm transition-colors py-2"
                  style={{ color: '#B8C0AE' }}
                >
                  ← Back
                </button>
                <button
                  onClick={triggerClose}
                  data-testid="button-cancel-signup"
                  className="flex-1 text-sm transition-colors py-2"
                  style={{ color: '#B8C0AE' }}
                >
                  Cancel
                </button>
              </div>

              <p className="text-xs mt-4" style={{ color: '#B8C0AE', opacity: 0.6 }}>
                By registering, you agree to Gamefolio's Terms of Service and Privacy Policy
              </p>
            </>
          )}

          {/* ── Login form ──────────────────────────────────────────────── */}
          {showLoginForm && (
            <>
              <h2 className="text-xl font-bold mb-5">Welcome Back</h2>

              <div className="space-y-3 text-left">
                <div>
                  <Label htmlFor="usernameOrEmail" className="text-sm" style={{ color: '#B8C0AE' }}>Username or Email</Label>
                  <Input
                    id="usernameOrEmail"
                    placeholder="Enter username or email"
                    value={loginData.usernameOrEmail}
                    onChange={e => setLoginData(prev => ({ ...prev, usernameOrEmail: e.target.value }))}
                    className="mt-1 text-white placeholder:text-gray-500 focus:border-primary"
                    style={{ background: '#0B1218', borderColor: '#1B2A33' }}
                    disabled={isLoading}
                  />
                  <FieldError error={fieldErrors.usernameOrEmail} />
                </div>

                <div>
                  <Label htmlFor="loginPassword" className="text-sm" style={{ color: '#B8C0AE' }}>Password</Label>
                  <Input
                    id="loginPassword"
                    type="password"
                    placeholder="Enter password"
                    value={loginData.password}
                    onChange={e => setLoginData(prev => ({ ...prev, password: e.target.value }))}
                    className="mt-1 text-white placeholder:text-gray-500 focus:border-primary"
                    style={{ background: '#0B1218', borderColor: '#1B2A33' }}
                    disabled={isLoading}
                  />
                  <FieldError error={fieldErrors.password} />
                </div>
              </div>

              <Button
                onClick={handleLogin}
                disabled={isLoading}
                data-testid="button-sign-in"
                className="w-full mt-5 py-3 text-base font-medium"
                style={{ background: '#B7FF1A', color: '#000' }}
              >
                {isLoading ? 'Signing In...' : 'Sign In'}
              </Button>

              <div className="flex gap-3 mt-3">
                <button
                  onClick={() => setShowLoginForm(false)}
                  data-testid="button-back-login"
                  className="flex-1 text-sm transition-colors py-2"
                  style={{ color: '#B8C0AE' }}
                >
                  ← Back
                </button>
                <button
                  onClick={triggerClose}
                  data-testid="button-cancel-login"
                  className="flex-1 text-sm transition-colors py-2"
                  style={{ color: '#B8C0AE' }}
                >
                  Cancel
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
