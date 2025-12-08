/**
 * planApiRun MCP Tool
 * Creates a run plan for executing API operations
 */

import { McpToolDefinition } from '../../common/McpToolRegistry';
import { CreateRunPlanUseCase, CreateRunPlanInput, CreateRunPlanOutput } from '../../../../application/execution';
import { SelectionMode } from '../../../../domain/models/RunPlan';

/**
 * Input for planApiRun tool
 */
export interface PlanApiRunToolInput {
  /** Spec ID */
  specId: string;
  /** Environment name (dev, qa, stage, prod) */
  envName: string;
  /** Selection mode */
  selection: {
    mode: 'single' | 'tag' | 'full';
    /** Operation ID for single mode */
    operationId?: string;
    /** Tags for tag mode */
    tags?: string[];
    /** Operations to exclude */
    exclude?: string[];
  };
}

/**
 * Output from planApiRun tool
 */
export interface PlanApiRunToolOutput {
  runId: string;
  specId: string;
  envName: string;
  status: string;
  operationCount: number;
  testCount: number;
  createdAt: string;
}

/**
 * Create the planApiRun MCP tool
 * @param createRunPlanUseCase - Use case instance
 * @returns MCP tool definition
 */
export function createPlanApiRunTool(
  createRunPlanUseCase: CreateRunPlanUseCase
): McpToolDefinition {
  return {
    name: 'swagger_plan_run',
    description: 'Create a run plan to test API operations. Specify which operations to include using selection mode (single, tag, or full). Returns a runId that can be used to execute the plan.',
    inputSchema: {
      type: 'object',
      properties: {
        specId: {
          type: 'string',
          description: 'The ID of the imported spec to plan tests for',
        },
        envName: {
          type: 'string',
          description: 'The environment name to run tests against (e.g., dev, qa, stage, prod)',
        },
        selection: {
          type: 'object',
          properties: {
            mode: {
              type: 'string',
              enum: ['single', 'tag', 'full'],
              description: 'Selection mode: single (one operation), tag (by tags), full (all operations)',
            },
            operationId: {
              type: 'string',
              description: 'Operation ID when mode is "single"',
            },
            tags: {
              type: 'array',
              items: { type: 'string' },
              description: 'Tag names when mode is "tag"',
            },
            exclude: {
              type: 'array',
              items: { type: 'string' },
              description: 'Operation IDs to exclude from the run',
            },
          },
          required: ['mode'],
        },
      },
      required: ['specId', 'envName', 'selection'],
    },
    handler: async (input: unknown): Promise<PlanApiRunToolOutput> => {
      const toolInput = input as PlanApiRunToolInput;

      const createInput: CreateRunPlanInput = {
        specId: toolInput.specId,
        envName: toolInput.envName,
        selection: {
          mode: toolInput.selection.mode as SelectionMode,
          operationId: toolInput.selection.operationId,
          tags: toolInput.selection.tags,
          exclude: toolInput.selection.exclude,
        },
      };

      const result = await createRunPlanUseCase.execute(createInput);

      return {
        runId: result.runId,
        specId: result.specId,
        envName: result.envName,
        status: result.status,
        operationCount: result.operationCount,
        testCount: result.testCount,
        createdAt: result.createdAt.toISOString(),
      };
    },
  };
}

/**
 * Tool name constant for registration
 */
export const PLAN_API_RUN_TOOL_NAME = 'swagger_plan_run';
