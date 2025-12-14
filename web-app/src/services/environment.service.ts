/**
 * Environment Service
 * API calls for environment management
 */

import { post, get, put, del } from './api.client';
import { endpoints } from '@/config';
import type {
  Environment,
  CreateEnvironmentRequest,
  UpdateEnvironmentRequest,
  EnvironmentListResponse,
} from '@/types';

/**
 * Create a new environment
 */
export async function createEnvironment(request: CreateEnvironmentRequest): Promise<Environment> {
  return post<Environment>(endpoints.environment.create, request);
}

/**
 * Get environment by ID
 */
export async function getEnvironment(envId: string): Promise<Environment> {
  return get<Environment>(endpoints.environment.get(envId));
}

/**
 * Update an environment
 */
export async function updateEnvironment(
  envId: string,
  request: UpdateEnvironmentRequest
): Promise<Environment> {
  return put<Environment>(endpoints.environment.update(envId), request);
}

/**
 * Delete an environment
 */
export async function deleteEnvironment(envId: string): Promise<void> {
  return del<void>(endpoints.environment.delete(envId));
}

/**
 * List environments for a spec
 */
export async function listEnvironments(specId: string): Promise<EnvironmentListResponse> {
  return get<EnvironmentListResponse>(endpoints.environment.list(specId));
}

export const environmentService = {
  createEnvironment,
  getEnvironment,
  updateEnvironment,
  deleteEnvironment,
  listEnvironments,
};
