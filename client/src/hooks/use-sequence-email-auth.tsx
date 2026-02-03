import { useState, useCallback, useRef } from 'react';
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
  isInitiating: boolean;
  isVerifying: boolean;
  awaitingOTP: boolean;
  error: string | null;
  walletAddress: string | null;
}

export function useSequenceEmailAuth(): UseSequenceEmailAuthResult {
  const { toast } = useToast();
  const [isInitiating, setIsInitiating] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [awaitingOTP, setAwaitingOTP] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const respondWithCodeRef = useRef<((code: string) => Promise<void>) | null>(null);
  const signInPromiseRef = useRef<Promise<any> | null>(null);

  const initiateEmailAuth = useCallback(async (email: string) => {
    if (!projectAccessKey || !waasConfigKey) {
      setError('Sequence configuration is missing');
      toast({
        title: 'Configuration Error',
        description: 'Wallet service is not properly configured',
        variant: 'destructive',
      });
      return;
    }

    setIsInitiating(true);
    setError(null);
    setAwaitingOTP(false);

    try {
      const sequence = getSequenceInstance();

      sequence.onEmailAuthCodeRequired(async (respondWithCode) => {
        respondWithCodeRef.current = respondWithCode;
        setAwaitingOTP(true);
        setIsInitiating(false);
      });

      signInPromiseRef.current = sequence.signIn({ email }, 'Gamefolio Wallet');
      
      const response = await signInPromiseRef.current;
      
      if (response?.wallet) {
        setWalletAddress(response.wallet);
        setAwaitingOTP(false);
        
        await syncWalletToServer(response.wallet);
        
        toast({
          title: 'Wallet Created!',
          description: 'Your Sequence wallet has been created and linked to your account',
          variant: 'gamefolioSuccess',
        });
      }
    } catch (err: any) {
      console.error('Email auth initiation error:', err);
      setError(err.message || 'Failed to initiate wallet creation');
      setIsInitiating(false);
      setAwaitingOTP(false);
    }
  }, [toast]);

  const verifyOTP = useCallback(async (code: string): Promise<{ wallet: string; sessionId: string } | null> => {
    if (!respondWithCodeRef.current) {
      setError('No pending verification');
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
      setError(err.message || 'Invalid verification code');
      setIsVerifying(false);
      return null;
    }
  }, [toast]);

  return {
    initiateEmailAuth,
    verifyOTP,
    isInitiating,
    isVerifying,
    awaitingOTP,
    error,
    walletAddress,
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
