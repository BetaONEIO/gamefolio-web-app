import { useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from './use-toast';
import { apiRequest } from '@/lib/queryClient';

interface CreateOrderResponse {
  orderId: string;
  redirectUrl?: string;
  status: string;
}

interface CompleteOrderResponse {
  success: boolean;
  tokensReceived: number;
  txHash?: string;
}

export function usePurchaseGFT() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [orderId, setOrderId] = useState<string | null>(null);

  const createOrderMutation = useMutation({
    mutationFn: async ({ packageId, amount }: { packageId?: string; amount?: number }) => {
      const response = await apiRequest('POST', '/api/token/create-order', { 
        packageId: packageId || getPackageIdFromAmount(amount || 25)
      });
      return await response.json() as CreateOrderResponse;
    },
    onSuccess: (data) => {
      setOrderId(data.orderId);
      toast({
        title: 'Order created',
        description: 'Redirecting to payment...',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to create order',
        description: error.message || 'Please try again',
        variant: 'destructive',
      });
    },
  });

  const completeOrderMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const response = await apiRequest('POST', '/api/token/complete-order', { orderId });
      return await response.json() as CompleteOrderResponse;
    },
    onSuccess: (data) => {
      toast({
        title: 'Purchase complete!',
        description: `Received ${data.tokensReceived} GFT`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/token/balance'] });
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      setOrderId(null);
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to complete order',
        description: error.message || 'Please contact support',
        variant: 'destructive',
      });
    },
  });

  const createOrder = useCallback(async (amount: number): Promise<CreateOrderResponse | null> => {
    try {
      const result = await createOrderMutation.mutateAsync({ amount });
      return result;
    } catch {
      return null;
    }
  }, [createOrderMutation]);

  const completeOrder = useCallback(async (orderId: string): Promise<boolean> => {
    try {
      await completeOrderMutation.mutateAsync(orderId);
      return true;
    } catch {
      return false;
    }
  }, [completeOrderMutation]);

  return {
    orderId,
    createOrder,
    completeOrder,
    isCreatingOrder: createOrderMutation.isPending,
    isCompletingOrder: completeOrderMutation.isPending,
    orderError: createOrderMutation.error || completeOrderMutation.error,
  };
}

function getPackageIdFromAmount(amount: number): string {
  if (amount <= 5) return 'starter';
  if (amount <= 10) return 'basic';
  if (amount <= 25) return 'standard';
  if (amount <= 50) return 'premium';
  return 'ultimate';
}
