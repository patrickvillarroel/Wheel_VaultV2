import { useQuery } from '@tanstack/react-query';
import { getSummary, type CollectionSummary } from './api';

export const statsKeys = {
  summary: ['stats', 'summary'] as const,
};

export function useSummary() {
  return useQuery<CollectionSummary>({
    queryKey: statsKeys.summary,
    queryFn: getSummary,
  });
}
