/**
 * ISpecRepository interface
 * Defines operations for managing NormalizedSpec entities
 */

import { NormalizedSpec, SpecMetadata } from '../models';
import { PaginatedResult, PaginationOptions } from './types';

/**
 * Options for finding specs
 */
export interface FindSpecsOptions extends PaginationOptions {
  /** Filter by title (partial match) */
  title?: string;
  /** Filter by version */
  version?: string;
  /** Filter by source type */
  sourceType?: SpecMetadata['sourceType'];
  /** Filter by tag (spec must have operations with this tag) */
  tag?: string;
}

/**
 * Repository interface for NormalizedSpec entities
 */
export interface ISpecRepository {
  /**
   * Creates a new spec
   * @param spec - Spec to create
   * @returns Created spec with ID
   */
  create(spec: NormalizedSpec): Promise<NormalizedSpec>;

  /**
   * Updates an existing spec
   * @param spec - Spec with updates
   * @returns Updated spec
   */
  update(spec: NormalizedSpec): Promise<NormalizedSpec>;

  /**
   * Deletes a spec by ID
   * @param id - Spec ID
   * @returns true if deleted, false if not found
   */
  delete(id: string): Promise<boolean>;

  /**
   * Finds a spec by ID
   * @param id - Spec ID
   * @returns Spec if found, null otherwise
   */
  findById(id: string): Promise<NormalizedSpec | null>;

  /**
   * Finds specs matching criteria
   * @param options - Filter and pagination options
   * @returns Paginated result of specs
   */
  find(options?: FindSpecsOptions): Promise<PaginatedResult<NormalizedSpec>>;

  /**
   * Finds a spec by source location
   * @param sourceLocation - Original source URL or file path
   * @returns Spec if found, null otherwise
   */
  findBySourceLocation(sourceLocation: string): Promise<NormalizedSpec | null>;

  /**
   * Gets all specs (without pagination)
   * @returns Array of all specs
   */
  findAll(): Promise<NormalizedSpec[]>;

  /**
   * Counts specs matching criteria
   * @param options - Filter options
   * @returns Count of matching specs
   */
  count(options?: Omit<FindSpecsOptions, keyof PaginationOptions>): Promise<number>;

  /**
   * Checks if a spec exists
   * @param id - Spec ID
   * @returns true if exists
   */
  exists(id: string): Promise<boolean>;

  /**
   * Checks if a spec with the same source already exists
   * @param sourceLocation - Source location
   * @returns true if exists
   */
  existsBySource(sourceLocation: string): Promise<boolean>;

  /**
   * Finds a spec by title and version combination
   * @param title - Spec title
   * @param version - Spec version
   * @returns Spec if found, null otherwise
   */
  findByTitleAndVersion(title: string, version: string): Promise<NormalizedSpec | null>;
}
