import { useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from './use-toast';
import { apiRequest } from '@/lib/queryClient';
import { openExternal, isNative } from '@/lib/platform';

// On native, the GBP-priced GFT checkout is unavailable: Apple/Google
// require all in-app purchases of digital tokens to flow through their IAP
// systems. We surface a "Buy on the web" deep-link instead so the user can
// complete the purchase in a browser session managed via Capacitor Browser.
const NATIVE_WEB_BUY_URL = 'https://app.gamefolio.com/wallet';

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
        void openExternal(data.checkoutUrl);
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
    if (isNative) {
      toast({
        title: 'Buy GFT on the web',
        description:
          'Token purchases are managed on the Gamefolio website. Opening it now…',
      });
      void openExternal(NATIVE_WEB_BUY_URL);
      return null;
    }
    try {
      const result = await createOrderMutation.mutateAsync({ gbpAmount });
      return result;
    } catch {
      return null;
    }
  }, [createOrderMutation, toast]);

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
