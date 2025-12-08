/**
 * generateAxiosTests MCP Tool
 * Generates Axios + Jest test code from a spec
 */

import { McpToolDefinition } from '../../common/McpToolRegistry';
import { 
  GenerateAxiosTestsUseCase, 
  TestGenerationResult,
  GeneratedTestCase,
} from '../../../../application/testgen/generate-axios-tests.usecase';
import { SelectionMode } from '../../../../domain/models/RunPlan';

/**
 * Input for generateAxiosTests tool
 */
export interface GenerateAxiosTestsToolInput {
  /** Spec ID */
  specId: string;
  /** Selection criteria */
  selection?: {
    mode: 'single' | 'tag' | 'full';
    operationId?: string;
    tags?: string[];
    exclude?: string[];
  };
  /** Test generation options */
  options?: {
    /** Include negative tests (validation errors) */
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
    /** Environment name for tests */
    envName?: string;
  };
}

/**
 * Output from generateAxiosTests tool
 */
export interface GenerateAxiosTestsToolOutput {
  /** Generated test code */
  code: string;
  /** Suggested file name */
  fileName: string;
  /** Spec ID */
  specId: string;
  /** Spec title */
  specTitle: string;
  /** Number of test cases */
  testCount: number;
  /** Number of operations covered */
  operationCount: number;
  /** Test case summaries */
  testCases: Array<{
    name: string;
    type: string;
    operationId: string;
    method: string;
    path: string;
    expectedStatus: number;
  }>;
}

/**
 * Create the generateAxiosTests MCP tool
 * @param generateAxiosTestsUseCase - Use case instance
 * @returns MCP tool definition
 */
export function createGenerateAxiosTestsTool(
  generateAxiosTestsUseCase: GenerateAxiosTestsUseCase
): McpToolDefinition {
  return {
    name: 'swagger_generate_tests',
    description: 'Generate Axios + Jest test code from an OpenAPI spec. Produces ready-to-run TypeScript test files with describe/it blocks, Axios calls, and status assertions.',
    inputSchema: {
      type: 'object',
      properties: {
        specId: {
          type: 'string',
          description: 'The ID of the imported spec to generate tests from',
        },
        selection: {
          type: 'object',
          properties: {
            mode: {
              type: 'string',
              enum: ['single', 'tag', 'full'],
              description: 'Selection mode: single (one operation), tag (by tags), full (all operations)',
              default: 'full',
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
              description: 'Operation IDs to exclude',
            },
          },
        },
        options: {
          type: 'object',
          properties: {
            includeNegativeTests: {
              type: 'boolean',
              description: 'Include tests for validation errors',
              default: true,
            },
            includeAuthTests: {
              type: 'boolean',
              description: 'Include tests for authentication errors',
              default: true,
            },
            includeBoundaryTests: {
              type: 'boolean',
              description: 'Include boundary value tests',
              default: false,
            },
            groupByTag: {
              type: 'boolean',
              description: 'Group tests by tag instead of path',
              default: false,
            },
            includeSetup: {
              type: 'boolean',
              description: 'Include beforeAll/afterAll setup blocks',
              default: false,
            },
            baseUrlVariable: {
              type: 'string',
              description: 'Variable name for base URL (default: BASE_URL)',
            },
            envName: {
              type: 'string',
              description: 'Environment name for the tests',
            },
          },
        },
      },
      required: ['specId'],
    },
    handler: async (input: unknown): Promise<GenerateAxiosTestsToolOutput> => {
      const { specId, selection, options } = input as GenerateAxiosTestsToolInput;

      const result = await generateAxiosTestsUseCase.execute({
        specId,
        selection: selection ? {
          mode: selection.mode as SelectionMode,
          operationId: selection.operationId,
          tags: selection.tags,
          exclude: selection.exclude,
        } : undefined,
        options,
      });

      return {
        code: result.code,
        fileName: result.fileName,
        specId: result.specId,
        specTitle: result.specTitle,
        testCount: result.testCount,
        operationCount: result.operationCount,
        testCases: result.testCases.map(tc => ({
          name: tc.name,
          type: tc.type,
          operationId: tc.operationId,
          method: tc.method,
          path: tc.path,
          expectedStatus: tc.expectedStatus,
        })),
      };
    },
  };
}

/**
 * Tool name constant for registration
 */
export const GENERATE_AXIOS_TESTS_TOOL_NAME = 'swagger_generate_tests';
