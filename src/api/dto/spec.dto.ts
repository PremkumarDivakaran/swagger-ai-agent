/**
 * Spec DTOs
 * Data Transfer Objects for spec API
 */

import { SpecSource } from '../../infrastructure/swagger/SwaggerLoader';

/**
 * Request DTO for importing a spec
 */
export interface ImportSpecRequestDto {
  /** Spec source configuration */
  source: SpecSource;
  /** Optional: generate missing operation IDs */
  generateMissingOperationIds?: boolean;
  /** Optional: include deprecated operations */
  includeDeprecated?: boolean;
}

/**
 * Response DTO for imported spec
 */
export interface ImportSpecResponseDto {
  /** Unique spec ID */
  specId: string;
  /** API title */
  title: string;
  /** API version */
  version: string;
  /** Number of operations */
  operationCount: number;
  /** Source location */
  sourceLocation: string;
}

/**
 * Request DTO for validating a spec
 */
export interface ValidateSpecRequestDto {
  /** Spec ID to validate */
  specId?: string;
  /** Raw spec content (JSON or YAML string) */
  rawSpec?: string | Record<string, unknown>;
}

/**
 * Response DTO for spec validation
 */
export interface ValidateSpecResponseDto {
  /** Whether spec is valid */
  valid: boolean;
  /** Validation issues */
  issues: Array<{
    severity: 'error' | 'warning' | 'info';
    path: string;
    message: string;
    rule?: string;
  }>;
  /** Detected spec version */
  version?: string;
  /** Summary counts */
  summary: {
    errors: number;
    warnings: number;
    info: number;
  };
}

/**
 * Response DTO for spec metadata
 */
export interface SpecMetadataResponseDto {
  /** Spec ID */
  id: string;
  /** API title */
  title: string;
  /** API version */
  version: string;
  /** API description */
  description?: string;
  /** Server URLs */
  servers: Array<{
    url: string;
    description?: string;
  }>;
  /** Tags with operation counts */
  tags: Array<{
    name: string;
    description?: string;
    operationCount: number;
  }>;
  /** Total operation count */
  operationCount: number;
  /** Source information */
  source: {
    type: 'url' | 'file' | 'git' | 'inline';
    location: string;
    importedAt: string;
  };
  /** Security schemes */
  securitySchemes: Array<{
    name: string;
    type: string;
    description?: string;
  }>;
}

/**
 * Query params for listing operations
 */
export interface ListOperationsQueryDto {
  /** Filter by tag */
  tag?: string;
  /** Filter by HTTP method */
  method?: string;
  /** Filter by path pattern */
  pathPattern?: string;
  /** Include deprecated operations */
  includeDeprecated?: string;
  /** Filter by auth requirement */
  requiresAuth?: string;
}

/**
 * Response DTO for operation list
 */
export interface ListOperationsResponseDto {
  /** Spec ID */
  specId: string;
  /** Total operation count */
  totalCount: number;
  /** Filtered count */
  filteredCount: number;
  /** Operations */
  operations: Array<{
    operationId: string;
    method: string;
    path: string;
    tags: string[];
    summary?: string;
    deprecated: boolean;
    requiresAuth: boolean;
  }>;
}

/**
 * Response DTO for tag statistics
 */
export interface TagStatsResponseDto {
  /** Spec ID */
  specId: string;
  /** Tags with counts */
  tags: Array<{
    name: string;
    description?: string;
    operationCount: number;
  }>;
  /** Total unique tags */
  totalTags: number;
}

/**
 * Response DTO for spec list
 */
export interface SpecListResponseDto {
  /** Specs */
  specs: Array<{
    id: string;
    title: string;
    version: string;
    operationCount: number;
    importedAt: string;
  }>;
  /** Total count */
  total: number;
}

/**
 * Request DTO for deleting a spec
 */
export interface DeleteSpecRequestDto {
  /** Force delete even if environments exist */
  force?: boolean;
}

/**
 * Response DTO for spec deletion
 */
export interface DeleteSpecResponseDto {
  /** Whether deletion was successful */
  success: boolean;
  /** Deleted spec ID */
  specId: string;
  /** Number of environments deleted */
  environmentsDeleted: number;
}
