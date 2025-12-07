/**
 * IEnvironmentRepository interface
 * Defines operations for managing EnvironmentConfig entities
 */

import { EnvironmentConfig } from '../models';
import { PaginatedResult, PaginationOptions } from './types';

/**
 * Options for finding environments
 */
export interface FindEnvironmentsOptions extends PaginationOptions {
  /** Filter by spec ID */
  specId?: string;
  /** Filter by name (partial match) */
  name?: string;
  /** Filter by auth type */
  authType?: string;
  /** Only default environments */
  isDefault?: boolean;
}

/**
 * Repository interface for EnvironmentConfig entities
 */
export interface IEnvironmentRepository {
  /**
   * Creates a new environment
   * @param env - Environment to create
   * @returns Created environment with ID
   */
  create(env: EnvironmentConfig): Promise<EnvironmentConfig>;

  /**
   * Updates an existing environment
   * @param env - Environment with updates
   * @returns Updated environment
   */
  update(env: EnvironmentConfig): Promise<EnvironmentConfig>;

  /**
   * Deletes an environment by ID
   * @param id - Environment ID
   * @returns true if deleted, false if not found
   */
  delete(id: string): Promise<boolean>;

  /**
   * Finds an environment by ID
   * @param id - Environment ID
   * @returns Environment if found, null otherwise
   */
  findById(id: string): Promise<EnvironmentConfig | null>;

  /**
   * Finds environments matching criteria
   * @param options - Filter and pagination options
   * @returns Paginated result of environments
   */
  find(options?: FindEnvironmentsOptions): Promise<PaginatedResult<EnvironmentConfig>>;

  /**
   * Finds environments by spec ID
   * @param specId - Spec ID
   * @returns Array of environments for the spec
   */
  findBySpecId(specId: string): Promise<EnvironmentConfig[]>;

  /**
   * Finds an environment by spec ID and name
   * @param specId - Spec ID
   * @param name - Environment name
   * @returns Environment if found, null otherwise
   */
  findBySpecIdAndName(specId: string, name: string): Promise<EnvironmentConfig | null>;

  /**
   * Gets the default environment for a spec
   * @param specId - Spec ID
   * @returns Default environment or null
   */
  findDefaultBySpecId(specId: string): Promise<EnvironmentConfig | null>;

  /**
   * Sets an environment as the default for its spec
   * @param id - Environment ID to set as default
   * @returns Updated environment
   */
  setAsDefault(id: string): Promise<EnvironmentConfig>;

  /**
   * Counts environments matching criteria
   * @param options - Filter options
   * @returns Count of matching environments
   */
  count(options?: Omit<FindEnvironmentsOptions, keyof PaginationOptions>): Promise<number>;

  /**
   * Checks if an environment exists
   * @param id - Environment ID
   * @returns true if exists
   */
  exists(id: string): Promise<boolean>;

  /**
   * Deletes all environments for a spec
   * @param specId - Spec ID
   * @returns Number of deleted environments
   */
  deleteBySpecId(specId: string): Promise<number>;
}
