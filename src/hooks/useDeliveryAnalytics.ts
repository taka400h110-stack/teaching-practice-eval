import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../api/client';
import { AnalyticsRange, DeliveryAnalyticsResponse } from '../types/adminAnalytics';

export function useDeliveryAnalytics(range: AnalyticsRange = '7d') {
  return useQuery<DeliveryAnalyticsResponse>({
    queryKey: ['admin', 'deliveryAnalytics', range],
    queryFn: async (): Promise<DeliveryAnalyticsResponse> => {
      const res = await apiFetch(`/api/admin/analytics/delivery?range=${range}`);
      const data = await res.json() as DeliveryAnalyticsResponse;
      return data;
    }
  });
}
