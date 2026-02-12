/**
 * Spec Service
 * API calls for spec management
 */

import { post, get, delWithBody } from './api.client';
import { endpoints } from '@/config';
import type {
  ImportSpecRequest,
  ImportSpecResponse,
  SpecListResponse,
  SpecMetadata,
  OperationsResponse,
  TagStatsResponse,
  ValidateSpecRequest,
  ValidateSpecResponse,
} from '@/types';

/**
 * Import a spec from URL, file content, or git
 */
export async function importSpec(request: ImportSpecRequest): Promise<ImportSpecResponse> {
  return post<ImportSpecResponse>(endpoints.spec.import, request);
}

/**
 * List all imported specs
 */
export async function listSpecs(): Promise<SpecListResponse> {
  return get<SpecListResponse>(endpoints.spec.list);
}

/**
 * Get spec metadata by ID
 */
export async function getSpec(specId: string): Promise<SpecMetadata> {
  return get<SpecMetadata>(endpoints.spec.get(specId));
}

/**
 * List operations for a spec with optional filters
 */
export async function listOperations(
  specId: string,
  filters?: {
    tags?: string[];
    methods?: string[];
    search?: string;
  }
): Promise<OperationsResponse> {
  return get<OperationsResponse>(endpoints.spec.operations(specId), filters);
}

/**
 * Get tag statistics for a spec
 */
export async function getTagStats(specId: string): Promise<TagStatsResponse> {
  return get<TagStatsResponse>(endpoints.spec.tags(specId));
}

/**
 * Delete a spec
 * @param specId - Spec ID to delete
 * @param force - Whether to force delete even if environments exist (default: true)
 */
export async function deleteSpec(specId: string, force: boolean = true): Promise<void> {
  return delWithBody<void>(endpoints.spec.delete(specId), { force });
}

/**
 * Validate a spec
 */
export async function validateSpec(request: ValidateSpecRequest): Promise<ValidateSpecResponse> {
  return post<ValidateSpecResponse>(endpoints.spec.validate, request);
}

export const specService = {
  importSpec,
  listSpecs,
  getSpec,
  listOperations,
  getTagStats,
  deleteSpec,
  validateSpec,
};
