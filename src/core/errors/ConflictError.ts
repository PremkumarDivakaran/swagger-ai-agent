/**
 * Conflict error class
 * Used when a resource conflict occurs (e.g., duplicate name)
 */

import { AppError } from './AppError';

export class ConflictError extends AppError {
  public readonly conflictType: string;

  /**
   * Creates a ConflictError instance
   * @param message - Error message
   * @param conflictType - Type of conflict (optional)
   */
  constructor(message: string, conflictType: string = 'RESOURCE_CONFLICT') {
    super(message, 409, 'CONFLICT', true, { conflictType });
    this.conflictType = conflictType;

    Object.setPrototypeOf(this, ConflictError.prototype);
  }

  /**
   * Creates a ConflictError for duplicate resource
   * @param resourceType - Type of resource
   * @param identifier - Identifier that caused conflict
   */
  static duplicate(resourceType: string, identifier: string): ConflictError {
    return new ConflictError(
      `${resourceType} with identifier '${identifier}' already exists`,
      'DUPLICATE'
    );
  }

  /**
   * Creates a ConflictError for version conflict
   * @param resourceType - Type of resource
   */
  static versionConflict(resourceType: string): ConflictError {
    return new ConflictError(
      `${resourceType} has been modified by another process`,
      'VERSION_CONFLICT'
    );
  }
}
