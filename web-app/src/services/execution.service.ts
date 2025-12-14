/**
 * Execution Service
 * API calls for test execution
 */

import { post, get } from './api.client';
import { endpoints } from '@/config';
import type {
  CreateRunPlanRequest,
  CreateRunPlanResponse,
  ExecuteRunRequest,
  ExecuteRunResponse,
  GetRunStatusResponse,
  RetryFailedRequest,
  RetryFailedResponse,
} from '@/types';

/**
 * Create a run plan
 */
export async function createRunPlan(request: CreateRunPlanRequest): Promise<CreateRunPlanResponse> {
  return post<CreateRunPlanResponse>(endpoints.execution.plan, request);
}

/**
 * Execute a run
 */
export async function executeRun(request: ExecuteRunRequest): Promise<ExecuteRunResponse> {
  return post<ExecuteRunResponse>(endpoints.execution.run, request);
}

/**
 * Get run status with optional details and aggregations
 */
export async function getRunStatus(
  runId: string,
  options?: {
    includeDetails?: boolean;
    includeAggregations?: boolean;
  }
): Promise<GetRunStatusResponse> {
  const params: Record<string, string> = {};
  if (options?.includeDetails) {
    params.includeDetails = 'true';
  }
  if (options?.includeAggregations) {
    params.includeAggregations = 'true';
  }
  return get<GetRunStatusResponse>(endpoints.execution.status(runId), params);
}

/**
 * Retry failed tests from a previous run
 */
export async function retryFailed(request: RetryFailedRequest): Promise<RetryFailedResponse> {
  return post<RetryFailedResponse>(endpoints.execution.retryFailed, request);
}

export const executionService = {
  createRunPlan,
  executeRun,
  getRunStatus,
  retryFailed,
};
