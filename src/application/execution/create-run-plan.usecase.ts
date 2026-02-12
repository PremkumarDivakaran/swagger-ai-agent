/**
 * Create Run Plan Use Case
 * Creates a new execution plan for API tests
 */

import { ISpecRepository, IEnvironmentRepository, IRunPlanRepository } from '../../domain/repositories';
import {
  RunPlan,
  OperationSelection,
  TestExecutionItem,
  Operation,
  TestCaseDefinition,
  createRunPlan,
  getOperationsByTag,
  findOperation,
  createHappyPathTestCase,
} from '../../domain/models';
import { NotFoundError } from '../../core/errors';
import { generateId } from '../../utils';
import { generateFakerValue } from '../../utils/faker-schema';

/**
 * Input for creating a run plan
 */
export interface CreateRunPlanInput {
  specId: string;
  envName: string;
  selection: OperationSelection;
  description?: string;
  config?: {
    parallel?: boolean;
    maxWorkers?: number;
    stopOnFailure?: boolean;
    timeout?: number;
  };
}

/**
 * Output from creating a run plan
 */
export interface CreateRunPlanOutput {
  runId: string;
  specId: string;
  envName: string;
  operationCount: number;
  testCount: number;
  status: string;
  createdAt: Date;
}

/**
 * Dependencies for CreateRunPlanUseCase
 */
export interface CreateRunPlanDependencies {
  specRepository: ISpecRepository;
  environmentRepository: IEnvironmentRepository;
  runPlanRepository: IRunPlanRepository;
}

/**
 * Creates a new run plan for API tests
 */
export class CreateRunPlanUseCase {
  constructor(private readonly deps: CreateRunPlanDependencies) {}

  /**
   * Execute the use case
   * @param input - Input parameters
   * @returns Created run plan summary
   */
  async execute(input: CreateRunPlanInput): Promise<CreateRunPlanOutput> {
    // Validate spec exists
    const spec = await this.deps.specRepository.findById(input.specId);
    if (!spec) {
      throw new NotFoundError(`Spec not found: ${input.specId}`);
    }

    // Validate environment exists
    const environments = await this.deps.environmentRepository.findBySpecId(input.specId);
    const environment = environments.find(env => env.name === input.envName);
    if (!environment) {
      throw new NotFoundError(`Environment '${input.envName}' not found for spec ${input.specId}`);
    }

    // Select operations based on selection criteria
    const selectedOperations = this.selectOperations(spec.operations, input.selection);
    
    if (selectedOperations.length === 0) {
      throw new NotFoundError('No operations match the selection criteria');
    }

    // Generate test cases for each operation
    const executionItems = this.generateExecutionItems(selectedOperations);

    // Calculate counts
    const operationCount = selectedOperations.length;
    const testCount = executionItems.reduce((sum, item) => sum + item.testCases.length, 0);

    // Create run plan
    const runId = generateId();
    const runPlan = createRunPlan({
      runId,
      specId: input.specId,
      envName: input.envName,
      envId: environment.id,
      status: 'ready',
      selection: input.selection,
      executionItems,
      operationCount,
      testCount,
      description: input.description,
      config: input.config,
    });

    // Save run plan
    await this.deps.runPlanRepository.create(runPlan);

    return {
      runId: runPlan.runId,
      specId: runPlan.specId,
      envName: runPlan.envName,
      operationCount: runPlan.operationCount,
      testCount: runPlan.testCount,
      status: runPlan.status,
      createdAt: runPlan.createdAt,
    };
  }

  /**
   * Select operations based on selection criteria
   */
  private selectOperations(operations: Operation[], selection: OperationSelection): Operation[] {
    let selected: Operation[];

    switch (selection.mode) {
      case 'single': {
        const ids = selection.operationIds?.length
          ? selection.operationIds
          : selection.operationId
            ? [selection.operationId]
            : [];
        selected = ids.length > 0
          ? operations.filter(o => ids.includes(o.operationId))
          : [];
        break;
      }

      case 'tag':
        if (selection.tags && selection.tags.length > 0) {
          selected = operations.filter(op =>
            op.tags.some(tag => selection.tags!.includes(tag))
          );
        } else {
          selected = [];
        }
        break;

      case 'full':
      default:
        selected = [...operations];
        break;
    }

    // Apply exclusions
    if (selection.exclude && selection.exclude.length > 0) {
      selected = selected.filter(op => !selection.exclude!.includes(op.operationId));
    }

    return selected;
  }

  /**
   * Generate execution items with test cases for operations
   */
  private generateExecutionItems(operations: Operation[]): TestExecutionItem[] {
    return operations.map((operation, index) => ({
      id: generateId(),
      operation,
      testCases: this.generateDefaultTestCases(operation),
      order: index + 1,
    }));
  }

  /**
   * Generate default test cases for an operation
   * Generates smart test cases with proper expected status and request bodies
   */
  private generateDefaultTestCases(operation: Operation): TestCaseDefinition[] {
    const testCases: TestCaseDefinition[] = [];

    // Determine expected status from Swagger spec responses
    const expectedStatus = this.determineExpectedStatus(operation);

    // Check if this is a file upload operation
    const isFileUpload = this.isFileUploadOperation(operation);

    // Generate request body if needed
    const requestBody = this.generateRequestBody(operation);

    // Happy path test
    testCases.push(createHappyPathTestCase(
      operation.operationId,
      operation.method,
      operation.path,
      {
        expectedStatus,
        overrides: requestBody ? { body: requestBody } : undefined,
        skip: isFileUpload,
        skipReason: isFileUpload ? 'File upload operations require manual setup' : undefined,
      }
    ));

    // Add more test types based on operation characteristics
    // This can be expanded to include validation tests, auth tests, etc.

    return testCases;
  }

  /**
   * Determine the expected success status code from operation responses
   */
  private determineExpectedStatus(operation: Operation): number {
    // Look for successful responses (2xx) in the operation
    const successResponses = operation.responses.filter(r => {
      const code = parseInt(r.statusCode, 10);
      return code >= 200 && code < 300;
    });

    // Sort to get the most specific (200, 201, 204) first
    successResponses.sort((a, b) => parseInt(a.statusCode) - parseInt(b.statusCode));

    if (successResponses.length > 0) {
      return parseInt(successResponses[0].statusCode, 10);
    }

    // Fallback: Use 200 as default (most common actual API behavior)
    // Many APIs don't properly document success responses but return 200
    return 200;
  }

  /**
   * Check if the operation is a file upload operation
   * Handles both OpenAPI 3.x (requestBody.content) and Swagger 2.0 (formData parameters with type: file)
   */
  private isFileUploadOperation(operation: Operation): boolean {
    // Check OpenAPI 3.x style - requestBody with multipart content
    if (operation.requestBody?.content) {
      const contentTypes = Object.keys(operation.requestBody.content);
      if (contentTypes.some(ct => 
        ct.includes('multipart/form-data') || ct.includes('application/octet-stream')
      )) {
        return true;
      }
    }

    // Check Swagger 2.0 style - formData parameters with type: file
    // These may be normalized differently, so check multiple patterns
    if (operation.parameters.some(p => {
      const schema = p.schema as Record<string, unknown> | undefined;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const paramAny = p as any;
      const inValue = String(p.in || paramAny.in || '');
      const typeValue = String(schema?.type || paramAny.type || '');
      return inValue === 'formData' && typeValue === 'file';
    })) {
      return true;
    }

    // Check if path suggests file upload (common patterns)
    if (operation.path.includes('upload') && operation.method === 'POST') {
      return true;
    }

    return false;
  }

  /**
   * Generate request body from operation schema
   */
  private generateRequestBody(operation: Operation): unknown | undefined {
    if (!operation.requestBody?.content) return undefined;

    // Try application/json first
    const jsonContent = operation.requestBody.content['application/json'];
    if (jsonContent) {
      // Use example if available
      if (jsonContent.example) {
        return jsonContent.example;
      }

      // Use first example from examples if available
      if (jsonContent.examples) {
        const firstExample = Object.values(jsonContent.examples)[0];
        if (firstExample?.value) {
          return firstExample.value;
        }
      }

      // Generate from schema (with Faker for meaningful data)
      if (jsonContent.schema) {
        return this.generateFromSchema(jsonContent.schema as Record<string, unknown>);
      }
    }

    // Try form-urlencoded
    const formContent = operation.requestBody.content['application/x-www-form-urlencoded'];
    if (formContent?.schema) {
      return this.generateFromSchema(formContent.schema as Record<string, unknown>);
    }

    return undefined;
  }

  /**
   * Generate sample data from JSON schema using Faker for meaningful values.
   * @param schema - JSON Schema object
   * @param propName - Optional property name (for object properties) to pick contextual Faker values
   */
  private generateFromSchema(schema: Record<string, unknown>, propName?: string): unknown {
    const type = schema.type as string;

    // Use example if available
    if (schema.example !== undefined) {
      return schema.example;
    }

    // Use default if available
    if (schema.default !== undefined) {
      return schema.default;
    }

    // Use enum first value if available
    if (schema.enum && Array.isArray(schema.enum)) {
      return schema.enum[0];
    }

    switch (type) {
      case 'object': {
        const obj: Record<string, unknown> = {};
        const properties = schema.properties as Record<string, Record<string, unknown>> | undefined;
        const required = schema.required as string[] | undefined;

        if (properties) {
          for (const [name, propSchema] of Object.entries(properties)) {
            if (required?.includes(name) || Object.keys(obj).length < 5) {
              obj[name] = this.generateFromSchema(propSchema, name);
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
      case 'integer':
      case 'number':
      case 'boolean': {
        const fakerVal = generateFakerValue(
          {
            type,
            format: schema.format as string | undefined,
            minimum: schema.minimum as number | undefined,
            maximum: schema.maximum as number | undefined,
            enum: schema.enum as unknown[] | undefined,
          },
          propName
        );
        if (fakerVal !== null) return fakerVal;
        // Fallbacks when Faker didn't map
        if (type === 'string') return 'test-value';
        if (type === 'integer') return (schema.minimum as number) ?? 1;
        if (type === 'number') return (schema.minimum as number) ?? 1.0;
        if (type === 'boolean') return true;
        return null;
      }

      default:
        return null;
    }
  }
}

/**
 * Factory function to create CreateRunPlanUseCase
 */
export function createCreateRunPlanUseCase(deps: CreateRunPlanDependencies): CreateRunPlanUseCase {
  return new CreateRunPlanUseCase(deps);
}
