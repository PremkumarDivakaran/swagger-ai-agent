/**
 * SwaggerParserAdapter
 * Wraps swagger-parser library to parse and validate OpenAPI specs
 */

import SwaggerParser from '@apidevtools/swagger-parser';
import { OpenAPI, OpenAPIV2, OpenAPIV3, OpenAPIV3_1 } from 'openapi-types';
import { ExternalServiceError, ValidationError } from '../../core/errors';

/**
 * Supported OpenAPI versions
 */
export type OpenApiVersionType = '2.0' | '3.0' | '3.1';

/**
 * Parse result with typed spec
 */
export interface ParseResult {
  /** Parsed and dereferenced spec */
  spec: OpenAPI.Document;
  /** Detected OpenAPI version */
  version: OpenApiVersionType;
  /** Whether the spec is valid */
  valid: boolean;
  /** Validation warnings (non-fatal issues) */
  warnings: string[];
}

/**
 * Validation result
 */
export interface ValidationResult {
  /** Whether the spec is valid */
  valid: boolean;
  /** Validation errors */
  errors: Array<{
    path: string;
    message: string;
    severity: 'error' | 'warning';
  }>;
}

/**
 * SwaggerParserAdapter class
 * Provides parsing and validation for OpenAPI 2.0/3.x specs
 */
export class SwaggerParserAdapter {
  /**
   * Parse a spec from content (string or object)
   * @param content - Raw spec content
   * @param contentType - Content type ('json' or 'yaml')
   * @returns ParseResult with typed spec
   */
  async parse(content: string | Record<string, unknown>, contentType: 'json' | 'yaml'): Promise<ParseResult> {
    try {
      let spec: OpenAPI.Document;

      if (typeof content === 'string') {
        // Parse string content
        if (contentType === 'json') {
          spec = JSON.parse(content) as OpenAPI.Document;
        } else {
          // swagger-parser handles YAML automatically
          spec = await SwaggerParser.parse(content) as OpenAPI.Document;
        }
      } else {
        spec = content as OpenAPI.Document;
      }

      // Dereference to resolve all $refs
      const dereferencedSpec = await SwaggerParser.dereference(spec) as OpenAPI.Document;
      
      // Detect version
      const version = this.detectVersion(dereferencedSpec);

      return {
        spec: dereferencedSpec,
        version,
        valid: true,
        warnings: [],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown parse error';
      throw new ExternalServiceError(
        `Failed to parse OpenAPI spec: ${message}`,
        'SwaggerParser'
      );
    }
  }

  /**
   * Parse and validate a spec from a file path or URL
   * @param source - File path or URL
   * @returns ParseResult with typed spec
   */
  async parseFromSource(source: string): Promise<ParseResult> {
    try {
      // swagger-parser can handle file paths and URLs directly
      const spec = await SwaggerParser.dereference(source) as OpenAPI.Document;
      const version = this.detectVersion(spec);

      return {
        spec,
        version,
        valid: true,
        warnings: [],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown parse error';
      throw new ExternalServiceError(
        `Failed to parse OpenAPI spec from source: ${source}. ${message}`,
        'SwaggerParser'
      );
    }
  }

  /**
   * Validate a spec without full parsing
   * @param content - Spec content (string or object)
   * @returns ValidationResult
   */
  async validate(content: string | Record<string, unknown>): Promise<ValidationResult> {
    try {
      let spec: OpenAPI.Document;

      if (typeof content === 'string') {
        spec = JSON.parse(content) as OpenAPI.Document;
      } else {
        spec = content as OpenAPI.Document;
      }

      // Use swagger-parser's validate method
      await SwaggerParser.validate(spec);

      return {
        valid: true,
        errors: [],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown validation error';
      
      return {
        valid: false,
        errors: [
          {
            path: '',
            message,
            severity: 'error',
          },
        ],
      };
    }
  }

  /**
   * Bundle a spec (resolve external refs into single document)
   * @param source - File path or URL
   * @returns Bundled spec
   */
  async bundle(source: string): Promise<OpenAPI.Document> {
    try {
      return await SwaggerParser.bundle(source) as OpenAPI.Document;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown bundle error';
      throw new ExternalServiceError(
        `Failed to bundle OpenAPI spec: ${message}`,
        'SwaggerParser'
      );
    }
  }

  /**
   * Detect OpenAPI version from spec
   * @param spec - Parsed spec
   * @returns Detected version
   */
  private detectVersion(spec: OpenAPI.Document): OpenApiVersionType {
    if ('swagger' in spec && (spec as OpenAPIV2.Document).swagger === '2.0') {
      return '2.0';
    }
    
    if ('openapi' in spec) {
      const openApiSpec = spec as OpenAPIV3.Document | OpenAPIV3_1.Document;
      if (openApiSpec.openapi.startsWith('3.1')) {
        return '3.1';
      }
      if (openApiSpec.openapi.startsWith('3.0')) {
        return '3.0';
      }
    }

    // Default to 3.0 if we can't detect
    return '3.0';
  }

  /**
   * Check if spec is OpenAPI 2.0 (Swagger)
   * @param spec - Parsed spec
   * @returns true if OpenAPI 2.0
   */
  isSwagger2(spec: OpenAPI.Document): spec is OpenAPIV2.Document {
    return 'swagger' in spec && (spec as OpenAPIV2.Document).swagger === '2.0';
  }

  /**
   * Check if spec is OpenAPI 3.0.x
   * @param spec - Parsed spec
   * @returns true if OpenAPI 3.0.x
   */
  isOpenApi3(spec: OpenAPI.Document): spec is OpenAPIV3.Document {
    return 'openapi' in spec && (spec as OpenAPIV3.Document).openapi.startsWith('3.0');
  }

  /**
   * Check if spec is OpenAPI 3.1.x
   * @param spec - Parsed spec
   * @returns true if OpenAPI 3.1.x
   */
  isOpenApi31(spec: OpenAPI.Document): spec is OpenAPIV3_1.Document {
    return 'openapi' in spec && (spec as OpenAPIV3_1.Document).openapi.startsWith('3.1');
  }
}

/**
 * Creates a SwaggerParserAdapter instance
 * @returns SwaggerParserAdapter instance
 */
export function createSwaggerParserAdapter(): SwaggerParserAdapter {
  return new SwaggerParserAdapter();
}
