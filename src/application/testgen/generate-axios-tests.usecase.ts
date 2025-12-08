/**
 * Generate Axios Tests Use Case
 * 
 * Generates Jest + Axios test code from OpenAPI specs and test case definitions.
 * Uses template functions to generate describe blocks, it blocks, and axios calls.
 */

import { NotFoundError } from '../../core/errors/NotFoundError';
import { ValidationError } from '../../core/errors/ValidationError';
import { NormalizedSpec } from '../../domain/models/NormalizedSpec';
import { Operation, HttpMethod } from '../../domain/models/Operation';
import { 
  TestCaseDefinition, 
  TestCaseType,
  createHappyPathTestCase,
  createValidationErrorTestCase,
  createAuthErrorTestCase,
} from '../../domain/models/TestCaseDefinition';
import { ISpecRepository, IEnvironmentRepository } from '../../domain/repositories';
import { OperationSelection, SelectionMode } from '../../domain/models/RunPlan';
import { generateId } from '../../utils';

/**
 * Test generation options
 */
export interface TestGenerationOptions {
  /** Include negative test cases */
  includeNegativeTests?: boolean;
  /** Include auth error tests */
  includeAuthTests?: boolean;
  /** Include boundary value tests */
  includeBoundaryTests?: boolean;
  /** Group tests by tag instead of path */
  groupByTag?: boolean;
  /** Include setup/teardown blocks */
  includeSetup?: boolean;
  /** Base URL variable name */
  baseUrlVariable?: string;
  /** Environment name for the tests */
  envName?: string;
}

/**
 * Generated test case metadata
 */
export interface GeneratedTestCase {
  /** Test case ID */
  id: string;
  /** Test case name */
  name: string;
  /** Test case type */
  type: TestCaseType;
  /** Operation ID */
  operationId: string;
  /** HTTP method */
  method: HttpMethod;
  /** API path */
  path: string;
  /** Expected status code */
  expectedStatus: number;
  /** Test case description */
  description?: string;
}

/**
 * Test generation result
 */
export interface TestGenerationResult {
  /** Generated test code */
  code: string;
  /** Generated test file name */
  fileName: string;
  /** Spec ID */
  specId: string;
  /** Spec title */
  specTitle: string;
  /** Number of test cases generated */
  testCount: number;
  /** Number of operations covered */
  operationCount: number;
  /** Test cases metadata */
  testCases: GeneratedTestCase[];
  /** Generation timestamp */
  generatedAt: Date;
  /** Options used */
  options: TestGenerationOptions;
}

/**
 * Generate Axios Tests input
 */
export interface GenerateAxiosTestsInput {
  /** Spec ID to generate tests for */
  specId: string;
  /** Operation selection */
  selection?: OperationSelection;
  /** Test generation options */
  options?: TestGenerationOptions;
}

/**
 * GenerateAxiosTestsUseCase
 * 
 * Generates Jest + Axios test code from OpenAPI specs
 */
export class GenerateAxiosTestsUseCase {
  constructor(
    private specRepository: ISpecRepository,
    private environmentRepository: IEnvironmentRepository
  ) {}

  /**
   * Execute the use case
   */
  async execute(input: GenerateAxiosTestsInput): Promise<TestGenerationResult> {
    const { specId, selection, options = {} } = input;

    // Fetch the spec
    const spec = await this.specRepository.findById(specId);
    if (!spec) {
      throw new NotFoundError('Spec', specId);
    }

    // Get selected operations
    const operations = this.selectOperations(spec, selection);
    if (operations.length === 0) {
      throw new ValidationError('No operations match the selection criteria');
    }

    // Generate test cases for each operation
    const testCases: TestCaseDefinition[] = [];
    for (const operation of operations) {
      const operationTests = this.generateTestCasesForOperation(operation, options);
      testCases.push(...operationTests);
    }

    // Generate the test code
    const code = this.generateTestCode(spec, operations, testCases, options);

    // Build result
    const testCaseMetadata: GeneratedTestCase[] = testCases.map(tc => ({
      id: tc.id,
      name: tc.name,
      type: tc.type,
      operationId: tc.operationId,
      method: tc.method,
      path: tc.path,
      expectedStatus: tc.expectedStatus,
      description: tc.description,
    }));

    return {
      code,
      fileName: this.generateFileName(spec),
      specId: spec.id,
      specTitle: spec.info.title,
      testCount: testCases.length,
      operationCount: operations.length,
      testCases: testCaseMetadata,
      generatedAt: new Date(),
      options,
    };
  }

  /**
   * Select operations based on criteria
   */
  private selectOperations(spec: NormalizedSpec, selection?: OperationSelection): Operation[] {
    if (!selection) {
      return spec.operations;
    }

    let operations = [...spec.operations];

    if (selection.mode === 'single' && selection.operationId) {
      operations = operations.filter(op => op.operationId === selection.operationId);
    } else if (selection.mode === 'tag' && selection.tags && selection.tags.length > 0) {
      operations = operations.filter(op => 
        op.tags.some(tag => selection.tags!.includes(tag))
      );
    }
    // mode === 'full' keeps all operations

    // Apply exclusions
    if (selection.exclude && selection.exclude.length > 0) {
      operations = operations.filter(op => !selection.exclude!.includes(op.operationId));
    }

    return operations;
  }

  /**
   * Generate test cases for a single operation
   */
  private generateTestCasesForOperation(
    operation: Operation, 
    options: TestGenerationOptions
  ): TestCaseDefinition[] {
    const testCases: TestCaseDefinition[] = [];

    // Always include happy path
    testCases.push(createHappyPathTestCase(
      operation.operationId,
      operation.method,
      operation.path
    ));

    // Include validation error tests if requested
    if (options.includeNegativeTests) {
      testCases.push(createValidationErrorTestCase(
        operation.operationId,
        operation.method,
        operation.path
      ));
    }

    // Include auth error tests if requested and operation has security
    if (options.includeAuthTests && operation.security && operation.security.length > 0) {
      testCases.push(createAuthErrorTestCase(
        operation.operationId,
        operation.method,
        operation.path
      ));
    }

    // Include boundary tests if requested
    if (options.includeBoundaryTests) {
      const boundaryTests = this.generateBoundaryTests(operation);
      testCases.push(...boundaryTests);
    }

    return testCases;
  }

  /**
   * Generate boundary value test cases
   */
  private generateBoundaryTests(operation: Operation): TestCaseDefinition[] {
    const tests: TestCaseDefinition[] = [];
    
    // Check for parameters with min/max constraints
    for (const param of operation.parameters) {
      if (param.schema) {
        const schema = param.schema as Record<string, unknown>;
        
        // Add boundary tests for numeric parameters
        if (schema.type === 'integer' || schema.type === 'number') {
          if (schema.minimum !== undefined) {
            tests.push({
              id: `${operation.operationId}_boundary_${param.name}_min`,
              name: `${operation.method} ${operation.path} - Boundary: ${param.name} at minimum`,
              description: `Test ${param.name} at minimum value ${schema.minimum}`,
              type: 'boundary',
              operationId: operation.operationId,
              method: operation.method,
              path: operation.path,
              payloadStrategy: 'custom',
              expectedStatus: 200,
              assertions: [{ type: 'status', operator: 'lessThan', expected: 300 }],
              priority: 3,
              tags: ['boundary'],
              overrides: {
                [param.in === 'query' ? 'queryParams' : 'pathParams']: {
                  [param.name]: String(schema.minimum),
                },
              },
            });
          }
          
          if (schema.maximum !== undefined) {
            tests.push({
              id: `${operation.operationId}_boundary_${param.name}_max`,
              name: `${operation.method} ${operation.path} - Boundary: ${param.name} at maximum`,
              description: `Test ${param.name} at maximum value ${schema.maximum}`,
              type: 'boundary',
              operationId: operation.operationId,
              method: operation.method,
              path: operation.path,
              payloadStrategy: 'custom',
              expectedStatus: 200,
              assertions: [{ type: 'status', operator: 'lessThan', expected: 300 }],
              priority: 3,
              tags: ['boundary'],
              overrides: {
                [param.in === 'query' ? 'queryParams' : 'pathParams']: {
                  [param.name]: String(schema.maximum),
                },
              },
            });
          }
        }
        
        // Add boundary tests for string parameters with length constraints
        if (schema.type === 'string') {
          if (schema.minLength !== undefined && (schema.minLength as number) > 0) {
            tests.push({
              id: `${operation.operationId}_boundary_${param.name}_minlen`,
              name: `${operation.method} ${operation.path} - Boundary: ${param.name} at min length`,
              description: `Test ${param.name} at minimum length ${schema.minLength}`,
              type: 'boundary',
              operationId: operation.operationId,
              method: operation.method,
              path: operation.path,
              payloadStrategy: 'custom',
              expectedStatus: 200,
              assertions: [{ type: 'status', operator: 'lessThan', expected: 300 }],
              priority: 3,
              tags: ['boundary'],
              overrides: {
                [param.in === 'query' ? 'queryParams' : 'pathParams']: {
                  [param.name]: 'x'.repeat(schema.minLength as number),
                },
              },
            });
          }
        }
      }
    }

    return tests;
  }

  /**
   * Generate the complete test code
   */
  private generateTestCode(
    spec: NormalizedSpec,
    operations: Operation[],
    testCases: TestCaseDefinition[],
    options: TestGenerationOptions
  ): string {
    const lines: string[] = [];
    const baseUrlVar = options.baseUrlVariable || 'BASE_URL';

    // File header
    lines.push(this.generateFileHeader(spec, options));
    lines.push('');

    // Imports
    lines.push(this.generateImports());
    lines.push('');

    // Constants
    lines.push(this.generateConstants(spec, baseUrlVar, options));
    lines.push('');

    // Helper functions
    lines.push(this.generateHelpers());
    lines.push('');

    // Group tests
    if (options.groupByTag) {
      lines.push(this.generateTestsByTag(spec, operations, testCases, baseUrlVar));
    } else {
      lines.push(this.generateTestsByPath(spec, operations, testCases, baseUrlVar));
    }

    return lines.join('\n');
  }

  /**
   * Generate file header comment
   */
  private generateFileHeader(spec: NormalizedSpec, options: TestGenerationOptions): string {
    return `/**
 * Auto-generated API tests for ${spec.info.title}
 * Version: ${spec.info.version}
 * 
 * Generated by Swagger AI Agent
 * Generated at: ${new Date().toISOString()}
 * 
 * Options:
 *   - Negative tests: ${options.includeNegativeTests ?? false}
 *   - Auth tests: ${options.includeAuthTests ?? false}
 *   - Boundary tests: ${options.includeBoundaryTests ?? false}
 */`;
  }

  /**
   * Generate import statements
   */
  private generateImports(): string {
    return `import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios';`;
  }

  /**
   * Generate constants section
   */
  private generateConstants(
    spec: NormalizedSpec, 
    baseUrlVar: string, 
    options: TestGenerationOptions
  ): string {
    const serverUrl = spec.servers[0]?.url || 'http://localhost:3000';
    
    return `// Configuration
const ${baseUrlVar} = process.env.API_BASE_URL || '${serverUrl}';
const API_TIMEOUT = 30000;

// Create axios instance
const api: AxiosInstance = axios.create({
  baseURL: ${baseUrlVar},
  timeout: API_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});`;
  }

  /**
   * Generate helper functions
   */
  private generateHelpers(): string {
    return `// Helper functions
function buildUrl(path: string, pathParams: Record<string, string> = {}): string {
  let url = path;
  for (const [key, value] of Object.entries(pathParams)) {
    url = url.replace(\`{\${key}}\`, encodeURIComponent(value));
  }
  return url;
}

function isSuccessStatus(status: number): boolean {
  return status >= 200 && status < 300;
}

function isClientErrorStatus(status: number): boolean {
  return status >= 400 && status < 500;
}`;
  }

  /**
   * Generate tests grouped by path
   */
  private generateTestsByPath(
    spec: NormalizedSpec,
    operations: Operation[],
    testCases: TestCaseDefinition[],
    baseUrlVar: string
  ): string {
    const lines: string[] = [];

    // Root describe block
    lines.push(`describe('${this.escapeString(spec.info.title)} API Tests', () => {`);

    // Group operations by path
    const pathGroups = new Map<string, Operation[]>();
    for (const op of operations) {
      const existing = pathGroups.get(op.path) || [];
      pathGroups.set(op.path, [...existing, op]);
    }

    // Generate describe block for each path
    for (const [path, pathOps] of pathGroups) {
      lines.push('');
      lines.push(`  describe('${this.escapeString(path)}', () => {`);

      for (const op of pathOps) {
        const opTestCases = testCases.filter(tc => tc.operationId === op.operationId);
        
        if (opTestCases.length > 0) {
          lines.push('');
          lines.push(`    describe('${op.method}', () => {`);
          
          for (const tc of opTestCases) {
            lines.push(this.generateTestCase(tc, op, baseUrlVar, 6));
          }
          
          lines.push('    });');
        }
      }

      lines.push('  });');
    }

    lines.push('});');
    return lines.join('\n');
  }

  /**
   * Generate tests grouped by tag
   */
  private generateTestsByTag(
    spec: NormalizedSpec,
    operations: Operation[],
    testCases: TestCaseDefinition[],
    baseUrlVar: string
  ): string {
    const lines: string[] = [];

    // Root describe block
    lines.push(`describe('${this.escapeString(spec.info.title)} API Tests', () => {`);

    // Group operations by tag
    const tagGroups = new Map<string, Operation[]>();
    for (const op of operations) {
      const tags = op.tags.length > 0 ? op.tags : ['untagged'];
      for (const tag of tags) {
        const existing = tagGroups.get(tag) || [];
        if (!existing.find(e => e.operationId === op.operationId)) {
          tagGroups.set(tag, [...existing, op]);
        }
      }
    }

    // Generate describe block for each tag
    for (const [tag, tagOps] of tagGroups) {
      lines.push('');
      lines.push(`  describe('${this.escapeString(tag)}', () => {`);

      for (const op of tagOps) {
        const opTestCases = testCases.filter(tc => tc.operationId === op.operationId);
        
        if (opTestCases.length > 0) {
          lines.push('');
          lines.push(`    describe('${op.method} ${this.escapeString(op.path)}', () => {`);
          
          for (const tc of opTestCases) {
            lines.push(this.generateTestCase(tc, op, baseUrlVar, 6));
          }
          
          lines.push('    });');
        }
      }

      lines.push('  });');
    }

    lines.push('});');
    return lines.join('\n');
  }

  /**
   * Generate a single test case
   */
  private generateTestCase(
    testCase: TestCaseDefinition,
    operation: Operation,
    baseUrlVar: string,
    indentLevel: number
  ): string {
    const indent = ' '.repeat(indentLevel);
    const lines: string[] = [];

    lines.push('');
    lines.push(`${indent}it('${this.escapeString(testCase.name)}', async () => {`);

    // Build the request
    const hasPathParams = operation.path.includes('{');
    const hasQueryParams = operation.parameters.some(p => p.in === 'query');
    const hasBody = ['POST', 'PUT', 'PATCH'].includes(operation.method) && operation.requestBody;

    // Path params setup
    if (hasPathParams) {
      lines.push(`${indent}  const pathParams = ${this.generatePathParams(operation, testCase)};`);
      lines.push(`${indent}  const url = buildUrl('${operation.path}', pathParams);`);
    } else {
      lines.push(`${indent}  const url = '${operation.path}';`);
    }

    // Query params setup
    if (hasQueryParams) {
      lines.push(`${indent}  const params = ${this.generateQueryParams(operation, testCase)};`);
    }

    // Request body setup
    if (hasBody) {
      lines.push(`${indent}  const requestBody = ${this.generateRequestBody(operation, testCase)};`);
    }

    // Make the request
    lines.push('');
    lines.push(`${indent}  const response = await api.${operation.method.toLowerCase()}(`);
    lines.push(`${indent}    url,`);
    
    if (hasBody) {
      lines.push(`${indent}    requestBody,`);
    }
    
    const configParts: string[] = [];
    if (hasQueryParams) {
      configParts.push('params');
    }
    if (testCase.type === 'auth-error') {
      // For auth error tests, we explicitly don't send auth
      configParts.push('headers: {}');
    }
    
    if (configParts.length > 0 || !hasBody) {
      if (hasBody) {
        lines.push(`${indent}    { ${configParts.join(', ')} }`);
      } else {
        lines.push(`${indent}    { ${configParts.join(', ')} }`);
      }
    }
    
    lines.push(`${indent}  ).catch((error: AxiosError) => error.response as AxiosResponse);`);

    // Assertions
    lines.push('');
    lines.push(`${indent}  // Assertions`);
    
    if (testCase.expectedStatusRange) {
      lines.push(`${indent}  expect(response.status).toBeGreaterThanOrEqual(${testCase.expectedStatusRange.min});`);
      lines.push(`${indent}  expect(response.status).toBeLessThanOrEqual(${testCase.expectedStatusRange.max});`);
    } else {
      lines.push(`${indent}  expect(response.status).toBe(${testCase.expectedStatus});`);
    }

    // Additional assertions based on test type
    if (testCase.type === 'happy-path') {
      lines.push(`${indent}  expect(isSuccessStatus(response.status)).toBe(true);`);
    } else if (testCase.type === 'validation-error') {
      lines.push(`${indent}  expect(isClientErrorStatus(response.status)).toBe(true);`);
    } else if (testCase.type === 'auth-error') {
      lines.push(`${indent}  expect([401, 403]).toContain(response.status);`);
    }

    lines.push(`${indent}});`);

    return lines.join('\n');
  }

  /**
   * Generate path parameters object
   */
  private generatePathParams(operation: Operation, testCase: TestCaseDefinition): string {
    const pathParams = operation.parameters.filter(p => p.in === 'path');
    const overrides = testCase.overrides?.pathParams || {};
    
    const params: Record<string, string> = {};
    for (const param of pathParams) {
      if (overrides[param.name]) {
        params[param.name] = overrides[param.name];
      } else if (param.example !== undefined) {
        params[param.name] = String(param.example);
      } else {
        // Generate placeholder value
        params[param.name] = this.generatePlaceholderValue(param.name, param.schema);
      }
    }

    return JSON.stringify(params, null, 2).replace(/\n/g, '\n      ');
  }

  /**
   * Generate query parameters object
   */
  private generateQueryParams(operation: Operation, testCase: TestCaseDefinition): string {
    const queryParams = operation.parameters.filter(p => p.in === 'query');
    const overrides = testCase.overrides?.queryParams || {};
    
    const params: Record<string, string> = {};
    for (const param of queryParams) {
      if (overrides[param.name]) {
        params[param.name] = overrides[param.name];
      } else if (param.example !== undefined) {
        params[param.name] = String(param.example);
      } else if (param.required) {
        // Generate value only for required params
        params[param.name] = this.generatePlaceholderValue(param.name, param.schema);
      }
    }

    return JSON.stringify(params, null, 2).replace(/\n/g, '\n      ');
  }

  /**
   * Generate request body
   */
  private generateRequestBody(operation: Operation, testCase: TestCaseDefinition): string {
    // Use override if provided
    if (testCase.overrides?.body) {
      return JSON.stringify(testCase.overrides.body, null, 2).replace(/\n/g, '\n      ');
    }

    // Try to generate from schema
    if (operation.requestBody?.content) {
      const jsonContent = operation.requestBody.content['application/json'];
      if (jsonContent) {
        // Use example if available
        if (jsonContent.example) {
          return JSON.stringify(jsonContent.example, null, 2).replace(/\n/g, '\n      ');
        }
        
        // Use first example if available
        if (jsonContent.examples) {
          const firstExample = Object.values(jsonContent.examples)[0];
          if (firstExample?.value) {
            return JSON.stringify(firstExample.value, null, 2).replace(/\n/g, '\n      ');
          }
        }

        // Generate from schema
        if (jsonContent.schema) {
          const generated = this.generateFromSchema(jsonContent.schema);
          return JSON.stringify(generated, null, 2).replace(/\n/g, '\n      ');
        }
      }
    }

    // For validation error tests, return invalid data
    if (testCase.type === 'validation-error') {
      return JSON.stringify({ invalid: 'data' }, null, 2);
    }

    return '{}';
  }

  /**
   * Generate placeholder value based on parameter name and schema
   */
  private generatePlaceholderValue(name: string, schema?: Record<string, unknown>): string {
    if (!schema) {
      // Try to infer from name
      if (name.toLowerCase().includes('id')) return '1';
      if (name.toLowerCase().includes('name')) return 'test-name';
      if (name.toLowerCase().includes('email')) return 'test@example.com';
      return 'test-value';
    }

    const type = schema.type as string;
    
    switch (type) {
      case 'integer':
      case 'number':
        return schema.example !== undefined ? String(schema.example) : '1';
      case 'boolean':
        return 'true';
      case 'string':
        if (schema.format === 'email') return 'test@example.com';
        if (schema.format === 'date') return '2024-01-01';
        if (schema.format === 'date-time') return '2024-01-01T00:00:00Z';
        if (schema.format === 'uuid') return '550e8400-e29b-41d4-a716-446655440000';
        if (schema.enum && Array.isArray(schema.enum)) return String(schema.enum[0]);
        return schema.example !== undefined ? String(schema.example) : 'test-value';
      default:
        return 'test-value';
    }
  }

  /**
   * Generate sample data from JSON schema
   */
  private generateFromSchema(schema: Record<string, unknown>): unknown {
    const type = schema.type as string;

    // Use example if available
    if (schema.example !== undefined) {
      return schema.example;
    }

    switch (type) {
      case 'object': {
        const obj: Record<string, unknown> = {};
        const properties = schema.properties as Record<string, Record<string, unknown>> | undefined;
        const required = schema.required as string[] | undefined;
        
        if (properties) {
          for (const [propName, propSchema] of Object.entries(properties)) {
            // Only include required properties or first few
            if (required?.includes(propName) || Object.keys(obj).length < 5) {
              obj[propName] = this.generateFromSchema(propSchema);
            }
          }
        }
        return obj;
      }
      
      case 'array': {
        const items = schema.items as Record<string, unknown> | undefined;
        if (items) {
          return [this.generateFromSchema(items)];
        }
        return [];
      }
      
      case 'string':
        if (schema.format === 'email') return 'test@example.com';
        if (schema.format === 'date') return '2024-01-01';
        if (schema.format === 'date-time') return '2024-01-01T00:00:00Z';
        if (schema.format === 'uuid') return '550e8400-e29b-41d4-a716-446655440000';
        if (schema.enum && Array.isArray(schema.enum)) return schema.enum[0];
        return 'string';
      
      case 'integer':
        return schema.minimum !== undefined ? schema.minimum : 1;
      
      case 'number':
        return schema.minimum !== undefined ? schema.minimum : 1.0;
      
      case 'boolean':
        return true;
      
      default:
        return null;
    }
  }

  /**
   * Escape string for use in JavaScript string literal
   */
  private escapeString(str: string): string {
    return str.replace(/'/g, "\\'").replace(/\n/g, '\\n');
  }

  /**
   * Generate test file name
   */
  private generateFileName(spec: NormalizedSpec): string {
    const safeName = spec.info.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    return `${safeName}.test.ts`;
  }
}

/**
 * Factory function to create the use case
 */
export function createGenerateAxiosTestsUseCase(
  specRepository: ISpecRepository,
  environmentRepository: IEnvironmentRepository
): GenerateAxiosTestsUseCase {
  return new GenerateAxiosTestsUseCase(specRepository, environmentRepository);
}
