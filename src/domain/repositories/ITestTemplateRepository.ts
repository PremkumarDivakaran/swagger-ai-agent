/**
 * ITestTemplateRepository interface
 * Defines operations for managing PayloadTemplate entities
 */

import { PayloadTemplate } from '../models';
import { PaginatedResult, PaginationOptions } from './types';

/**
 * Options for finding test templates
 */
export interface FindTemplatesOptions extends PaginationOptions {
  /** Filter by operation ID */
  operationId?: string;
  /** Filter by name (partial match) */
  name?: string;
  /** Filter by content type */
  contentType?: string;
  /** Filter by tag */
  tag?: string;
}

/**
 * Repository interface for PayloadTemplate entities
 */
export interface ITestTemplateRepository {
  /**
   * Creates a new template
   * @param template - Template to create
   * @returns Created template with ID
   */
  create(template: PayloadTemplate): Promise<PayloadTemplate>;

  /**
   * Creates multiple templates
   * @param templates - Templates to create
   * @returns Array of created templates
   */
  createMany(templates: PayloadTemplate[]): Promise<PayloadTemplate[]>;

  /**
   * Updates an existing template
   * @param template - Template with updates
   * @returns Updated template
   */
  update(template: PayloadTemplate): Promise<PayloadTemplate>;

  /**
   * Deletes a template by ID
   * @param id - Template ID
   * @returns true if deleted, false if not found
   */
  delete(id: string): Promise<boolean>;

  /**
   * Finds a template by ID
   * @param id - Template ID
   * @returns Template if found, null otherwise
   */
  findById(id: string): Promise<PayloadTemplate | null>;

  /**
   * Finds templates matching criteria
   * @param options - Filter and pagination options
   * @returns Paginated result of templates
   */
  find(options?: FindTemplatesOptions): Promise<PaginatedResult<PayloadTemplate>>;

  /**
   * Finds templates by operation ID
   * @param operationId - Operation ID
   * @returns Array of templates for the operation
   */
  findByOperationId(operationId: string): Promise<PayloadTemplate[]>;

  /**
   * Finds templates by operation IDs
   * @param operationIds - Array of operation IDs
   * @returns Array of templates for the operations
   */
  findByOperationIds(operationIds: string[]): Promise<PayloadTemplate[]>;

  /**
   * Gets all templates (without pagination)
   * @returns Array of all templates
   */
  findAll(): Promise<PayloadTemplate[]>;

  /**
   * Counts templates matching criteria
   * @param options - Filter options
   * @returns Count of matching templates
   */
  count(options?: Omit<FindTemplatesOptions, keyof PaginationOptions>): Promise<number>;

  /**
   * Checks if a template exists
   * @param id - Template ID
   * @returns true if exists
   */
  exists(id: string): Promise<boolean>;

  /**
   * Deletes all templates for an operation
   * @param operationId - Operation ID
   * @returns Number of deleted templates
   */
  deleteByOperationId(operationId: string): Promise<number>;

  /**
   * Deletes all templates for multiple operations
   * @param operationIds - Array of operation IDs
   * @returns Number of deleted templates
   */
  deleteByOperationIds(operationIds: string[]): Promise<number>;
}
