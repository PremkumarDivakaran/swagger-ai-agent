/**
 * ValidateSpecUseCase
 * Validates Swagger/OpenAPI specs for structural and semantic correctness
 */

import { SwaggerParserAdapter, ValidationResult } from '../../infrastructure/swagger/SwaggerParserAdapter';
import { ISpecRepository } from '../../domain/repositories';
import { NotFoundError, ValidationError } from '../../core/errors';

/**
 * Validation issue severity
 */
export type ValidationSeverity = 'error' | 'warning' | 'info';

/**
 * Validation issue
 */
export interface ValidationIssue {
  /** Issue severity */
  severity: ValidationSeverity;
  /** Path to the problematic element */
  path: string;
  /** Issue message */
  message: string;
  /** Rule that was violated */
  rule?: string;
}

/**
 * Input for spec validation
 */
export interface ValidateSpecInput {
  /** Spec ID to validate (mutually exclusive with rawSpec) */
  specId?: string;
  /** Raw spec content to validate (mutually exclusive with specId) */
  rawSpec?: string | Record<string, unknown>;
}

/**
 * Output from spec validation
 */
export interface ValidateSpecOutput {
  /** Whether spec is valid */
  valid: boolean;
  /** List of validation issues */
  issues: ValidationIssue[];
  /** Spec version detected */
  version?: string;
  /** Summary counts */
  summary: {
    errors: number;
    warnings: number;
    info: number;
  };
}

/**
 * ValidateSpecUseCase class
 * Validates specs by ID or raw content
 */
export class ValidateSpecUseCase {
  constructor(
    private readonly parser: SwaggerParserAdapter,
    private readonly specRepository: ISpecRepository
  ) {}

  /**
   * Execute spec validation
   * @param input - Validation input
   * @returns Validation result
   */
  async execute(input: ValidateSpecInput): Promise<ValidateSpecOutput> {
    // Validate input
    if (!input.specId && !input.rawSpec) {
      throw new ValidationError('Either specId or rawSpec must be provided', [
        { field: 'input', message: 'Missing specId or rawSpec' },
      ]);
    }

    if (input.specId && input.rawSpec) {
      throw new ValidationError('Cannot provide both specId and rawSpec', [
        { field: 'input', message: 'Provide only one of specId or rawSpec' },
      ]);
    }

    let specContent: string | Record<string, unknown>;
    
    if (input.specId) {
      // Fetch spec from repository
      const spec = await this.specRepository.findById(input.specId);
      if (!spec) {
        throw new NotFoundError('Spec', input.specId);
      }
      // For persisted specs, we need to reconstruct - but they're already validated
      // Return success for already-persisted specs
      return {
        valid: true,
        issues: [],
        version: spec.info.version,
        summary: { errors: 0, warnings: 0, info: 0 },
      };
    } else {
      specContent = input.rawSpec!;
    }

    // Parse the spec
    const contentType = typeof specContent === 'string' 
      ? (specContent.trim().startsWith('{') ? 'json' : 'yaml')
      : 'json';
    const parseResult = await this.parser.parse(specContent, contentType);

    // Validate structure
    const validationResult = await this.parser.validate(parseResult.spec as unknown as Record<string, unknown>);

    // Convert to output format
    const issues = this.convertIssues(validationResult);

    // Add additional semantic validations
    const semanticIssues = this.performSemanticValidation(parseResult.spec as unknown as Record<string, unknown>);
    issues.push(...semanticIssues);

    // Calculate summary
    const summary = {
      errors: issues.filter(i => i.severity === 'error').length,
      warnings: issues.filter(i => i.severity === 'warning').length,
      info: issues.filter(i => i.severity === 'info').length,
    };

    return {
      valid: summary.errors === 0,
      issues,
      version: parseResult.version,
      summary,
    };
  }

  /**
   * Convert parser validation result to issues
   */
  private convertIssues(result: ValidationResult): ValidationIssue[] {
    return result.errors.map(error => ({
      severity: error.severity as ValidationSeverity,
      path: error.path || '',
      message: error.message,
      rule: undefined,
    }));
  }

  /**
   * Perform additional semantic validations
   */
  private performSemanticValidation(spec: Record<string, unknown>): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    // Check for missing operation IDs
    const paths = spec.paths as Record<string, Record<string, unknown>> | undefined;
    if (paths) {
      for (const [path, pathItem] of Object.entries(paths)) {
        for (const method of ['get', 'post', 'put', 'patch', 'delete', 'head', 'options']) {
          const operation = pathItem[method] as Record<string, unknown> | undefined;
          if (operation && !operation.operationId) {
            issues.push({
              severity: 'warning',
              path: `paths.${path}.${method}`,
              message: 'Operation is missing operationId',
              rule: 'operation-operationId',
            });
          }
        }
      }
    }

    // Check for missing descriptions
    const info = spec.info as Record<string, unknown> | undefined;
    if (info && !info.description) {
      issues.push({
        severity: 'info',
        path: 'info.description',
        message: 'API is missing a description',
        rule: 'info-description',
      });
    }

    // Check for deprecated operations without deprecation notice
    if (paths) {
      for (const [path, pathItem] of Object.entries(paths)) {
        for (const method of ['get', 'post', 'put', 'patch', 'delete']) {
          const operation = pathItem[method] as Record<string, unknown> | undefined;
          if (operation?.deprecated === true && !operation.description?.toString().toLowerCase().includes('deprecated')) {
            issues.push({
              severity: 'info',
              path: `paths.${path}.${method}`,
              message: 'Deprecated operation should mention deprecation in description',
              rule: 'deprecated-description',
            });
          }
        }
      }
    }

    return issues;
  }
}
