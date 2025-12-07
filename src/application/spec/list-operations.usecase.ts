/**
 * ListOperationsUseCase
 * Lists operations from a normalized spec with filtering options
 */

import { ISpecRepository } from '../../domain/repositories';
import { Operation } from '../../domain/models';
import { NotFoundError } from '../../core/errors';

/**
 * Operation summary for listing
 */
export interface OperationSummary {
  /** Operation ID */
  operationId: string;
  /** HTTP method */
  method: string;
  /** API path */
  path: string;
  /** Tags */
  tags: string[];
  /** Summary */
  summary?: string;
  /** Whether deprecated */
  deprecated: boolean;
  /** Whether requires auth */
  requiresAuth: boolean;
}

/**
 * Filter options for listing operations
 */
export interface ListOperationsFilter {
  /** Filter by tag */
  tag?: string;
  /** Filter by method */
  method?: string;
  /** Filter by path pattern (supports * wildcard) */
  pathPattern?: string;
  /** Include deprecated operations */
  includeDeprecated?: boolean;
  /** Filter by auth requirement */
  requiresAuth?: boolean;
}

/**
 * Input for listing operations
 */
export interface ListOperationsInput {
  /** Spec ID */
  specId: string;
  /** Optional filters */
  filter?: ListOperationsFilter;
}

/**
 * Output from listing operations
 */
export interface ListOperationsOutput {
  /** Spec ID */
  specId: string;
  /** Total operation count (before filtering) */
  totalCount: number;
  /** Filtered operation count */
  filteredCount: number;
  /** Operations */
  operations: OperationSummary[];
}

/**
 * ListOperationsUseCase class
 * Lists and filters operations from a spec
 */
export class ListOperationsUseCase {
  constructor(private readonly specRepository: ISpecRepository) {}

  /**
   * Execute the list operations use case
   * @param input - Input with spec ID and optional filters
   * @returns List of operation summaries
   */
  async execute(input: ListOperationsInput): Promise<ListOperationsOutput> {
    // Fetch spec
    const spec = await this.specRepository.findById(input.specId);
    if (!spec) {
      throw new NotFoundError('Spec', input.specId);
    }

    const totalCount = spec.operations.length;
    
    // Apply filters
    let operations = spec.operations;
    const filter = input.filter || {};

    // Filter by tag
    if (filter.tag) {
      operations = operations.filter(op => op.tags.includes(filter.tag!));
    }

    // Filter by method
    if (filter.method) {
      const method = filter.method.toUpperCase();
      operations = operations.filter(op => op.method === method);
    }

    // Filter by path pattern
    if (filter.pathPattern) {
      const pattern = this.createPathRegex(filter.pathPattern);
      operations = operations.filter(op => pattern.test(op.path));
    }

    // Filter deprecated (default: include)
    if (filter.includeDeprecated === false) {
      operations = operations.filter(op => !op.deprecated);
    }

    // Filter by auth requirement
    if (filter.requiresAuth !== undefined) {
      operations = operations.filter(op => {
        const hasAuth = op.security && op.security.length > 0;
        return filter.requiresAuth ? hasAuth : !hasAuth;
      });
    }

    // Map to summaries
    const summaries = operations.map(op => this.toSummary(op));

    return {
      specId: input.specId,
      totalCount,
      filteredCount: summaries.length,
      operations: summaries,
    };
  }

  /**
   * Convert operation to summary
   */
  private toSummary(operation: Operation): OperationSummary {
    return {
      operationId: operation.operationId,
      method: operation.method,
      path: operation.path,
      tags: operation.tags,
      summary: operation.summary,
      deprecated: operation.deprecated || false,
      requiresAuth: (operation.security && operation.security.length > 0) || false,
    };
  }

  /**
   * Create regex from path pattern with wildcards
   */
  private createPathRegex(pattern: string): RegExp {
    // Escape special regex chars except *
    const escaped = pattern
      .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
      .replace(/\*/g, '.*');
    return new RegExp(`^${escaped}$`, 'i');
  }
}
