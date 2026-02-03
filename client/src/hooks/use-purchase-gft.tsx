import { useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from './use-toast';
import { apiRequest } from '@/lib/queryClient';

interface CreateCheckoutResponse {
  orderId: string;
  checkoutUrl: string;
}

interface OrderStatusResponse {
  id: string;
  gbpAmount: number;
  gfAmount: number;
  status: string;
  txHash?: string;
}

export function usePurchaseGFT() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [orderId, setOrderId] = useState<string | null>(null);

  const createOrderMutation = useMutation({
    mutationFn: async ({ gbpAmount }: { gbpAmount: number }) => {
      const response = await apiRequest('POST', '/api/gf/checkout', { gbpAmount });
      return await response.json() as CreateCheckoutResponse;
    },
    onSuccess: (data: CreateCheckoutResponse) => {
      setOrderId(data.orderId);
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      }
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to create checkout',
        description: error.message || 'Please try again',
        variant: 'destructive',
      });
    },
  });

  const checkOrderStatus = useCallback(async (orderId: string): Promise<OrderStatusResponse | null> => {
    try {
      const response = await fetch(`/api/gf/orders/${orderId}`, { credentials: 'include' });
      if (!response.ok) return null;
      return await response.json() as OrderStatusResponse;
    } catch {
      return null;
    }
  }, []);

  const createOrder = useCallback(async (gbpAmount: number): Promise<CreateCheckoutResponse | null> => {
    try {
      const result = await createOrderMutation.mutateAsync({ gbpAmount });
      return result;
    } catch {
      return null;
    }
  }, [createOrderMutation]);

  const refreshBalances = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['/api/token/balance'] });
    queryClient.invalidateQueries({ queryKey: ['/api/user'] });
    queryClient.invalidateQueries({ queryKey: ['/api/gf/orders'] });
  }, [queryClient]);

  return {
    orderId,
    createOrder,
    checkOrderStatus,
    refreshBalances,
    isCreatingOrder: createOrderMutation.isPending,
    orderError: createOrderMutation.error,
  };
}
