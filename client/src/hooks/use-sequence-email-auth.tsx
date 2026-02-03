import { useState, useCallback, useRef, useEffect } from 'react';
import { SequenceWaaS } from '@0xsequence/waas';
import { SKALE_CHAIN_ID } from '../../../config/web3';
import { useToast } from './use-toast';

const projectAccessKey = import.meta.env.VITE_SEQUENCE_PROJECT_ACCESS_KEY || "";
const waasConfigKey = import.meta.env.VITE_SEQUENCE_WAAS_CONFIG_KEY || "";

let sequenceInstance: SequenceWaaS | null = null;

function getSequenceInstance(): SequenceWaaS {
  if (!sequenceInstance) {
    sequenceInstance = new SequenceWaaS({
      projectAccessKey,
      waasConfigKey,
      network: SKALE_CHAIN_ID,
    });
  }
  return sequenceInstance;
}

interface UseSequenceEmailAuthResult {
  initiateEmailAuth: (email: string) => Promise<void>;
  verifyOTP: (code: string) => Promise<{ wallet: string; sessionId: string } | null>;
  reset: () => void;
  retry: () => void;
  isInitiating: boolean;
  isVerifying: boolean;
  awaitingOTP: boolean;
  error: string | null;
  walletAddress: string | null;
  canRetry: boolean;
}

export function useSequenceEmailAuth(): UseSequenceEmailAuthResult {
  const { toast } = useToast();
  const [isInitiating, setIsInitiating] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [awaitingOTP, setAwaitingOTP] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [canRetry, setCanRetry] = useState(false);
  const respondWithCodeRef = useRef<((code: string) => Promise<void>) | null>(null);
  const signInPromiseRef = useRef<Promise<any> | null>(null);
  const lastEmailRef = useRef<string | null>(null);
  const isActiveRef = useRef(false);
  const listenerSetupRef = useRef(false);

  const reset = useCallback(() => {
    setIsInitiating(false);
    setIsVerifying(false);
    setAwaitingOTP(false);
    setError(null);
    setCanRetry(true);
    respondWithCodeRef.current = null;
    signInPromiseRef.current = null;
    isActiveRef.current = false;
  }, []);

  const initiateEmailAuth = useCallback(async (email: string) => {
    if (!projectAccessKey || !waasConfigKey) {
      setError('Sequence configuration is missing');
      setCanRetry(false);
      toast({
        title: 'Configuration Error',
        description: 'Wallet service is not properly configured',
        variant: 'destructive',
      });
      return;
    }

    if (isActiveRef.current) {
      console.log('Email auth already in progress, skipping duplicate initiation');
      return;
    }

    isActiveRef.current = true;
    lastEmailRef.current = email;
    respondWithCodeRef.current = null;
    signInPromiseRef.current = null;
    setIsInitiating(true);
    setError(null);
    setAwaitingOTP(false);
    setCanRetry(false);

    try {
      const sequence = getSequenceInstance();

      if (!listenerSetupRef.current) {
        sequence.onEmailAuthCodeRequired(async (respondWithCode) => {
          respondWithCodeRef.current = respondWithCode;
          setAwaitingOTP(true);
          setIsInitiating(false);
        });
        listenerSetupRef.current = true;
      }

      signInPromiseRef.current = sequence.signIn({ email }, 'Gamefolio Wallet');
      
      const response = await signInPromiseRef.current;
      
      if (response?.wallet) {
        setWalletAddress(response.wallet);
        setAwaitingOTP(false);
        setIsInitiating(false);
        isActiveRef.current = false;
        
        await syncWalletToServer(response.wallet);
        
        toast({
          title: 'Wallet Created!',
          description: 'Your Sequence wallet has been created and linked to your account',
          variant: 'gamefolioSuccess',
        });
      }
    } catch (err: any) {
      console.error('Email auth initiation error:', err);
      const errorMessage = err.message || 'Failed to initiate wallet creation';
      setError(errorMessage);
      setIsInitiating(false);
      setAwaitingOTP(false);
      setCanRetry(true);
      isActiveRef.current = false;
      respondWithCodeRef.current = null;
      signInPromiseRef.current = null;
    }
  }, [toast]);

  const verifyOTP = useCallback(async (code: string): Promise<{ wallet: string; sessionId: string } | null> => {
    if (!respondWithCodeRef.current || !signInPromiseRef.current) {
      setError('No pending verification. Please start again.');
      setCanRetry(true);
      return null;
    }

    setIsVerifying(true);
    setError(null);

    try {
      await respondWithCodeRef.current(code);
      
      const response = await signInPromiseRef.current;
      
      if (response?.wallet) {
        setWalletAddress(response.wallet);
        setAwaitingOTP(false);
        setIsVerifying(false);
        isActiveRef.current = false;
        respondWithCodeRef.current = null;
        signInPromiseRef.current = null;
        
        await syncWalletToServer(response.wallet);
        
        toast({
          title: 'Wallet Created!',
          description: 'Your Sequence wallet has been created and linked to your account',
          variant: 'gamefolioSuccess',
        });
        
        return { wallet: response.wallet, sessionId: response.sessionId };
      }
      
      setIsVerifying(false);
      return null;
    } catch (err: any) {
      console.error('OTP verification error:', err);
      setError(err.message || 'Invalid verification code. Please try again.');
      setIsVerifying(false);
      return null;
    }
  }, [toast]);

  const retry = useCallback(() => {
    if (lastEmailRef.current) {
      reset();
      setTimeout(() => {
        if (lastEmailRef.current) {
          initiateEmailAuth(lastEmailRef.current);
        }
      }, 100);
    }
  }, [reset, initiateEmailAuth]);

  useEffect(() => {
    return () => {
      isActiveRef.current = false;
      respondWithCodeRef.current = null;
      signInPromiseRef.current = null;
    };
  }, []);

  return {
    initiateEmailAuth,
    verifyOTP,
    reset,
    retry,
    isInitiating,
    isVerifying,
    awaitingOTP,
    error,
    walletAddress,
    canRetry,
  };
}

async function syncWalletToServer(walletAddress: string): Promise<void> {
  try {
    const response = await fetch('/api/wallet/address', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ walletAddress }),
    });
    if (!response.ok) {
      console.error('Failed to sync wallet address to server');
    }
  } catch (error) {
    console.error('Error syncing wallet address:', error);
  }
}
