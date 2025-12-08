/**
 * Unit tests for planApiRun MCP tool
 */

import { 
  createPlanApiRunTool, 
  PlanApiRunToolInput,
  PlanApiRunToolOutput,
  PLAN_API_RUN_TOOL_NAME,
} from '../../../../../../src/infrastructure/mcp/swagger/tools/planApiRun.tool';
import { CreateRunPlanUseCase, CreateRunPlanOutput } from '../../../../../../src/application/execution';

describe('createPlanApiRunTool', () => {
  let mockCreateRunPlanUseCase: jest.Mocked<CreateRunPlanUseCase>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockCreateRunPlanUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<CreateRunPlanUseCase>;
  });

  describe('tool metadata', () => {
    it('should have correct name', () => {
      const tool = createPlanApiRunTool(mockCreateRunPlanUseCase);
      expect(tool.name).toBe('swagger_plan_run');
    });

    it('should have correct description', () => {
      const tool = createPlanApiRunTool(mockCreateRunPlanUseCase);
      expect(tool.description).toContain('Create a run plan');
      expect(tool.description).toContain('API operations');
    });

    it('should have correct input schema', () => {
      const tool = createPlanApiRunTool(mockCreateRunPlanUseCase);
      expect(tool.inputSchema).toEqual({
        type: 'object',
        properties: {
          specId: {
            type: 'string',
            description: expect.any(String),
          },
          envName: {
            type: 'string',
            description: expect.any(String),
          },
          selection: {
            type: 'object',
            properties: {
              mode: {
                type: 'string',
                enum: ['single', 'tag', 'full'],
                description: expect.any(String),
              },
              operationId: {
                type: 'string',
                description: expect.any(String),
              },
              tags: {
                type: 'array',
                items: { type: 'string' },
                description: expect.any(String),
              },
              exclude: {
                type: 'array',
                items: { type: 'string' },
                description: expect.any(String),
              },
            },
            required: ['mode'],
          },
        },
        required: ['specId', 'envName', 'selection'],
      });
    });

    it('should export tool name constant', () => {
      expect(PLAN_API_RUN_TOOL_NAME).toBe('swagger_plan_run');
    });
  });

  describe('handler', () => {
    it('should create run plan with full selection', async () => {
      const createdAt = new Date('2024-01-15T10:00:00Z');
      const useCaseResult: CreateRunPlanOutput = {
        runId: 'run-123',
        specId: 'spec-456',
        envName: 'qa',
        operationCount: 10,
        testCount: 30,
        status: 'ready',
        createdAt,
      };

      mockCreateRunPlanUseCase.execute.mockResolvedValue(useCaseResult);

      const tool = createPlanApiRunTool(mockCreateRunPlanUseCase);
      const input: PlanApiRunToolInput = {
        specId: 'spec-456',
        envName: 'qa',
        selection: {
          mode: 'full',
        },
      };
      
      const result = await tool.handler(input) as PlanApiRunToolOutput;

      expect(result).toEqual({
        runId: 'run-123',
        specId: 'spec-456',
        envName: 'qa',
        status: 'ready',
        operationCount: 10,
        testCount: 30,
        createdAt: '2024-01-15T10:00:00.000Z',
      });
    });

    it('should create run plan with single operation selection', async () => {
      const createdAt = new Date('2024-01-15T10:00:00Z');
      const useCaseResult: CreateRunPlanOutput = {
        runId: 'run-123',
        specId: 'spec-456',
        envName: 'dev',
        operationCount: 1,
        testCount: 3,
        status: 'ready',
        createdAt,
      };

      mockCreateRunPlanUseCase.execute.mockResolvedValue(useCaseResult);

      const tool = createPlanApiRunTool(mockCreateRunPlanUseCase);
      const input: PlanApiRunToolInput = {
        specId: 'spec-456',
        envName: 'dev',
        selection: {
          mode: 'single',
          operationId: 'getUsers',
        },
      };
      
      const result = await tool.handler(input) as PlanApiRunToolOutput;

      expect(mockCreateRunPlanUseCase.execute).toHaveBeenCalledWith({
        specId: 'spec-456',
        envName: 'dev',
        selection: {
          mode: 'single',
          operationId: 'getUsers',
          tags: undefined,
          exclude: undefined,
        },
      });
      expect(result.operationCount).toBe(1);
      expect(result.testCount).toBe(3);
    });

    it('should create run plan with tag selection', async () => {
      const createdAt = new Date('2024-01-15T10:00:00Z');
      const useCaseResult: CreateRunPlanOutput = {
        runId: 'run-789',
        specId: 'spec-456',
        envName: 'stage',
        operationCount: 5,
        testCount: 15,
        status: 'ready',
        createdAt,
      };

      mockCreateRunPlanUseCase.execute.mockResolvedValue(useCaseResult);

      const tool = createPlanApiRunTool(mockCreateRunPlanUseCase);
      const input: PlanApiRunToolInput = {
        specId: 'spec-456',
        envName: 'stage',
        selection: {
          mode: 'tag',
          tags: ['users', 'auth'],
        },
      };
      
      const result = await tool.handler(input) as PlanApiRunToolOutput;

      expect(mockCreateRunPlanUseCase.execute).toHaveBeenCalledWith({
        specId: 'spec-456',
        envName: 'stage',
        selection: {
          mode: 'tag',
          operationId: undefined,
          tags: ['users', 'auth'],
          exclude: undefined,
        },
      });
      expect(result.operationCount).toBe(5);
    });

    it('should handle exclusions', async () => {
      const createdAt = new Date('2024-01-15T10:00:00Z');
      const useCaseResult: CreateRunPlanOutput = {
        runId: 'run-101',
        specId: 'spec-456',
        envName: 'prod',
        operationCount: 8,
        testCount: 24,
        status: 'ready',
        createdAt,
      };

      mockCreateRunPlanUseCase.execute.mockResolvedValue(useCaseResult);

      const tool = createPlanApiRunTool(mockCreateRunPlanUseCase);
      const input: PlanApiRunToolInput = {
        specId: 'spec-456',
        envName: 'prod',
        selection: {
          mode: 'full',
          exclude: ['deleteUser', 'deleteAllUsers'],
        },
      };
      
      const result = await tool.handler(input) as PlanApiRunToolOutput;

      expect(mockCreateRunPlanUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          selection: expect.objectContaining({
            exclude: ['deleteUser', 'deleteAllUsers'],
          }),
        })
      );
      expect(result.operationCount).toBe(8);
    });

    it('should handle errors from use case', async () => {
      mockCreateRunPlanUseCase.execute.mockRejectedValue(new Error('Environment not found'));

      const tool = createPlanApiRunTool(mockCreateRunPlanUseCase);
      const input: PlanApiRunToolInput = {
        specId: 'spec-456',
        envName: 'invalid-env',
        selection: { mode: 'full' },
      };
      
      await expect(tool.handler(input)).rejects.toThrow('Environment not found');
    });
  });
});
