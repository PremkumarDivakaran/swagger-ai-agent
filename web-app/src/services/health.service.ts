/**
 * Health Service
 * API calls for health check
 */

import { apiClient } from './api.client';
import { endpoints } from '@/config';

export interface HealthStatus {
  status: string;
  timestamp: string;
  uptime: number;
}

/**
 * Check API health
 */
export async function checkHealth(): Promise<HealthStatus> {
  const response = await apiClient.get(endpoints.health);
  return response.data.data;
}

export const healthService = {
  checkHealth,
};
