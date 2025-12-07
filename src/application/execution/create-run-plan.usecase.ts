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
      case 'single':
        if (selection.operationId) {
          const op = operations.find(o => o.operationId === selection.operationId);
          selected = op ? [op] : [];
        } else {
          selected = [];
        }
        break;

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
   * For now, generates a happy path test for each operation
   */
  private generateDefaultTestCases(operation: Operation): TestCaseDefinition[] {
    const testCases: TestCaseDefinition[] = [];

    // Happy path test
    testCases.push(createHappyPathTestCase(
      operation.operationId,
      operation.method,
      operation.path
    ));

    // Add more test types based on operation characteristics
    // This can be expanded to include validation tests, auth tests, etc.

    return testCases;
  }
}

/**
 * Factory function to create CreateRunPlanUseCase
 */
export function createCreateRunPlanUseCase(deps: CreateRunPlanDependencies): CreateRunPlanUseCase {
  return new CreateRunPlanUseCase(deps);
}
