/**
 * RunPlan domain model
 * Represents an execution plan for running API tests
 * 
 * This is a pure domain model with NO infrastructure dependencies
 */

import { Operation } from './Operation';
import { TestCaseDefinition } from './TestCaseDefinition';

/**
 * Run plan status
 */
export type RunPlanStatus = 
  | 'draft'        // Plan created but not started
  | 'ready'        // Plan is ready to execute
  | 'running'      // Execution in progress
  | 'paused'       // Execution paused
  | 'completed'    // Execution completed successfully
  | 'failed'       // Execution completed with failures
  | 'cancelled';   // Execution was cancelled

/**
 * Selection mode for operations
 */
export type SelectionMode = 
  | 'single'       // Single operation
  | 'tag'          // Operations by tag(s)
  | 'full';        // All operations

/**
 * Operation selection criteria
 */
export interface OperationSelection {
  /** Selection mode */
  mode: SelectionMode;
  /** Single operation ID (for 'single' mode) */
  operationId?: string;
  /** Operation IDs (for 'single' mode, alternative to operationId) */
  operationIds?: string[];
  /** Tag names (for 'tag' mode) */
  tags?: string[];
  /** Operation IDs to exclude */
  exclude?: string[];
}

/**
 * Test execution item - combines operation with its test cases
 */
export interface TestExecutionItem {
  /** Unique ID for this execution item */
  id: string;
  /** Operation to test */
  operation: Operation;
  /** Test cases for this operation */
  testCases: TestCaseDefinition[];
  /** Execution order */
  order: number;
}

/**
 * RunPlan domain model
 * Represents a complete execution plan
 */
export interface RunPlan {
  /** Unique identifier for this run */
  runId: string;
  
  /** Associated spec ID */
  specId: string;
  
  /** Environment name to use */
  envName: string;
  
  /** Environment ID */
  envId?: string;
  
  /** Plan status */
  status: RunPlanStatus;
  
  /** Operation selection criteria */
  selection: OperationSelection;
  
  /** Execution items (operations with test cases) */
  executionItems: TestExecutionItem[];
  
  /** Total number of operations */
  operationCount: number;
  
  /** Total number of test cases */
  testCount: number;
  
  /** When the plan was created */
  createdAt: Date;
  
  /** When execution started */
  startedAt?: Date;
  
  /** When execution completed */
  completedAt?: Date;
  
  /** Plan creator/owner */
  createdBy?: string;
  
  /** Plan description */
  description?: string;
  
  /** Plan-level configuration overrides */
  config?: {
    /** Run tests in parallel */
    parallel?: boolean;
    /** Max parallel workers */
    maxWorkers?: number;
    /** Stop on first failure */
    stopOnFailure?: boolean;
    /** Global timeout for the run */
    timeout?: number;
  };
  
  /** Tags for categorization */
  tags: string[];
}

/**
 * Creates a new RunPlan with default values
 * @param partial - Partial run plan data
 * @returns Complete RunPlan object
 */
export function createRunPlan(
  partial: Partial<RunPlan> & { 
    runId: string; 
    specId: string; 
    envName: string;
    selection: OperationSelection;
  }
): RunPlan {
  return {
    runId: partial.runId,
    specId: partial.specId,
    envName: partial.envName,
    envId: partial.envId,
    status: partial.status ?? 'draft',
    selection: partial.selection,
    executionItems: partial.executionItems ?? [],
    operationCount: partial.operationCount ?? 0,
    testCount: partial.testCount ?? 0,
    createdAt: partial.createdAt ?? new Date(),
    startedAt: partial.startedAt,
    completedAt: partial.completedAt,
    createdBy: partial.createdBy,
    description: partial.description,
    config: partial.config ?? {
      parallel: false,
      stopOnFailure: false,
    },
    tags: partial.tags ?? [],
  };
}

/**
 * Calculates test count from execution items
 * @param items - Array of execution items
 * @returns Total test count
 */
export function calculateTestCount(items: TestExecutionItem[]): number {
  return items.reduce((sum, item) => sum + item.testCases.length, 0);
}

/**
 * Checks if run plan can be executed
 * @param plan - RunPlan to check
 * @returns true if plan can be executed
 */
export function canExecute(plan: RunPlan): boolean {
  return plan.status === 'draft' || plan.status === 'ready';
}

/**
 * Checks if run plan is currently running
 * @param plan - RunPlan to check
 * @returns true if plan is running
 */
export function isRunning(plan: RunPlan): boolean {
  return plan.status === 'running' || plan.status === 'paused';
}

/**
 * Checks if run plan is complete
 * @param plan - RunPlan to check
 * @returns true if plan is complete
 */
export function isComplete(plan: RunPlan): boolean {
  return plan.status === 'completed' || plan.status === 'failed' || plan.status === 'cancelled';
}

/**
 * Updates plan status to running
 * @param plan - RunPlan to update
 * @returns Updated RunPlan
 */
export function startRun(plan: RunPlan): RunPlan {
  return {
    ...plan,
    status: 'running',
    startedAt: new Date(),
  };
}

/**
 * Updates plan status to completed
 * @param plan - RunPlan to update
 * @param success - Whether run was successful
 * @returns Updated RunPlan
 */
export function completeRun(plan: RunPlan, success: boolean): RunPlan {
  return {
    ...plan,
    status: success ? 'completed' : 'failed',
    completedAt: new Date(),
  };
}

/**
 * Gets execution duration in milliseconds
 * @param plan - RunPlan to check
 * @returns Duration in milliseconds or undefined if not started/completed
 */
export function getExecutionDuration(plan: RunPlan): number | undefined {
  if (!plan.startedAt) return undefined;
  const endTime = plan.completedAt ?? new Date();
  return endTime.getTime() - plan.startedAt.getTime();
}
