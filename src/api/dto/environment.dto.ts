/**
 * Environment DTOs
 * Data Transfer Objects for environment endpoints
 */

import { AuthConfig } from '../../domain/models';

/**
 * Request DTO for creating an environment
 */
export interface CreateEnvironmentRequestDto {
  /** Spec ID to associate with */
  specId: string;
  /** Environment name (e.g., 'dev', 'qa', 'staging', 'prod') */
  name: string;
  /** Base URL for API calls */
  baseUrl: string;
  /** Default headers to include in all requests */
  defaultHeaders?: Record<string, string>;
  /** Authentication configuration */
  authConfig?: AuthConfig;
  /** Request timeout in milliseconds */
  timeout?: number;
  /** Whether to verify SSL certificates */
  verifySsl?: boolean;
  /** Custom variables for this environment */
  variables?: Record<string, string>;
  /** Whether this is the default environment */
  isDefault?: boolean;
  /** Environment description */
  description?: string;
}

/**
 * Response DTO for created environment
 */
export interface CreateEnvironmentResponseDto {
  /** Created environment ID */
  envId: string;
  /** Spec ID */
  specId: string;
  /** Environment name */
  name: string;
  /** Base URL */
  baseUrl: string;
  /** Whether this is the default environment */
  isDefault: boolean;
  /** Creation timestamp */
  createdAt: string;
}

/**
 * Request DTO for updating an environment
 */
export interface UpdateEnvironmentRequestDto {
  /** Base URL for API calls */
  baseUrl?: string;
  /** Default headers to include in all requests */
  defaultHeaders?: Record<string, string>;
  /** Authentication configuration */
  authConfig?: AuthConfig;
  /** Request timeout in milliseconds */
  timeout?: number;
  /** Whether to verify SSL certificates */
  verifySsl?: boolean;
  /** Custom variables for this environment */
  variables?: Record<string, string>;
  /** Whether this is the default environment */
  isDefault?: boolean;
  /** Environment description */
  description?: string;
}

/**
 * Response DTO for updated environment
 */
export interface UpdateEnvironmentResponseDto {
  /** Environment ID */
  envId: string;
  /** Spec ID */
  specId: string;
  /** Environment name */
  name: string;
  /** Base URL */
  baseUrl: string;
  /** Whether this is the default environment */
  isDefault: boolean;
  /** Update timestamp */
  updatedAt: string;
}

/**
 * Response DTO for environment details
 */
export interface EnvironmentDetailsResponseDto {
  /** Environment ID */
  id: string;
  /** Spec ID */
  specId: string;
  /** Environment name */
  name: string;
  /** Base URL */
  baseUrl: string;
  /** Default headers */
  defaultHeaders: Record<string, string>;
  /** Auth type (type only, not credentials) */
  authType: string;
  /** Has auth configured */
  hasAuth: boolean;
  /** Request timeout */
  timeout: number;
  /** SSL verification enabled */
  verifySsl: boolean;
  /** Whether this is the default environment */
  isDefault: boolean;
  /** Environment description */
  description?: string;
  /** Variable names (not values for security) */
  variableNames: string[];
  /** Creation timestamp */
  createdAt: string;
  /** Last update timestamp */
  updatedAt: string;
}

/**
 * Response DTO for environment list
 */
export interface ListEnvironmentsResponseDto {
  /** Spec ID */
  specId: string;
  /** Environments */
  environments: EnvironmentDetailsResponseDto[];
  /** Total count */
  total: number;
}

/**
 * Response DTO for delete environment
 */
export interface DeleteEnvironmentResponseDto {
  /** Deleted environment ID */
  envId: string;
  /** Success message */
  message: string;
}
