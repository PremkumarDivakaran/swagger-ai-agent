/**
 * Unit tests for executeOperation MCP tool
 */

import { 
  createExecuteOperationTool, 
  ExecuteOperationToolInput,
  ExecuteOperationToolOutput,
  EXECUTE_OPERATION_TOOL_NAME,
} from '../../../../../../src/infrastructure/mcp/swagger/tools/executeOperation.tool';
import { AxiosExecutionAdapter, ExecutionResult } from '../../../../../../src/infrastructure/http/AxiosExecutionAdapter';
import { ISpecRepository, IEnvironmentRepository } from '../../../../../../src/domain/repositories';
import { NormalizedSpec } from '../../../../../../src/domain/models/NormalizedSpec';
import { Operation, HttpMethod } from '../../../../../../src/domain/models/Operation';
import { EnvironmentConfig } from '../../../../../../src/domain/models/EnvironmentConfig';

describe('createExecuteOperationTool', () => {
  let mockSpecRepository: jest.Mocked<ISpecRepository>;
  let mockEnvironmentRepository: jest.Mocked<IEnvironmentRepository>;
  let mockExecutionAdapter: jest.Mocked<AxiosExecutionAdapter>;

  const createMockOperation = (overrides: Partial<Operation> = {}): Operation => ({
    operationId: 'getPet',
    method: 'GET' as HttpMethod,
    path: '/pet/{petId}',
    summary: 'Get pet by ID',
    tags: ['pet'],
    parameters: [
      {
        name: 'petId',
        in: 'path',
        required: true,
        schema: { type: 'string' },
        description: 'Pet ID',
      },
    ],
    responses: [
      {
        statusCode: '200',
        description: 'Successful operation',
        content: {
          'application/json': {
            schema: { type: 'object' },
          },
        },
      },
    ],
    deprecated: false,
    security: [],
    ...overrides,
  });

  const createMockSpec = (overrides: Partial<NormalizedSpec> = {}): NormalizedSpec => ({
    id: 'spec-123',
    openApiVersion: '3.0.0',
    info: {
      title: 'Petstore API',
      version: '1.0.0',
      description: 'A pet store API',
    },
    servers: [{ url: 'https://api.petstore.com' }],
    operations: [createMockOperation()],
    tags: [{ name: 'pet', description: 'Pet operations' }],
    securitySchemes: [],
    globalSecurity: [],
    metadata: {
      importedAt: new Date(),
      sourceType: 'url',
      sourceLocation: 'https://api.petstore.com/swagger.json',
    },
    ...overrides,
  });

  const createMockEnvironment = (overrides: Partial<EnvironmentConfig> = {}): EnvironmentConfig => ({
    id: 'env-123',
    specId: 'spec-123',
    name: 'dev',
    baseUrl: 'https://api.petstore.com',
    variables: {},
    defaultHeaders: {},
    authConfig: { type: 'none' },
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();

    // Only mock the methods we need for testing
    mockSpecRepository = {
      findById: jest.fn(),
      findAll: jest.fn(),
    } as unknown as jest.Mocked<ISpecRepository>;

    mockEnvironmentRepository = {
      findBySpecId: jest.fn(),
      findById: jest.fn(),
    } as unknown as jest.Mocked<IEnvironmentRepository>;

    mockExecutionAdapter = {
      executeOperation: jest.fn(),
      executeMultiple: jest.fn(),
    } as unknown as jest.Mocked<AxiosExecutionAdapter>;
  });

  describe('tool metadata', () => {
    it('should have correct name', () => {
      const tool = createExecuteOperationTool(
        mockSpecRepository,
        mockEnvironmentRepository,
        mockExecutionAdapter
      );
      expect(tool.name).toBe('swagger_execute_operation');
    });

    it('should have correct description', () => {
      const tool = createExecuteOperationTool(
        mockSpecRepository,
        mockEnvironmentRepository,
        mockExecutionAdapter
      );
      expect(tool.description).toContain('Execute a single API operation');
    });

    it('should have correct input schema', () => {
      const tool = createExecuteOperationTool(
        mockSpecRepository,
        mockEnvironmentRepository,
        mockExecutionAdapter
      );
      expect(tool.inputSchema.required).toContain('specId');
      expect(tool.inputSchema.required).toContain('envName');
      expect(tool.inputSchema.required).toContain('operationId');
      expect(tool.inputSchema.properties).toHaveProperty('overrides');
    });

    it('should export tool name constant', () => {
      expect(EXECUTE_OPERATION_TOOL_NAME).toBe('swagger_execute_operation');
    });
  });

  describe('handler', () => {
    it('should execute operation successfully', async () => {
      const mockSpec = createMockSpec();
      const mockEnv = createMockEnvironment();
      const executionResult: ExecutionResult = {
        success: true,
        request: {
          url: 'https://api.petstore.com/pet/123',
          method: 'GET' as HttpMethod,
          headers: { 'Content-Type': 'application/json' },
        },
        response: {
          status: 200,
          statusText: 'OK',
          headers: { 'content-type': 'application/json' },
          data: { id: '123', name: 'Fluffy' },
          responseTime: 150,
        },
      };

      mockSpecRepository.findById.mockResolvedValue(mockSpec);
      mockEnvironmentRepository.findBySpecId.mockResolvedValue([mockEnv]);
      mockExecutionAdapter.executeOperation.mockResolvedValue(executionResult);

      const tool = createExecuteOperationTool(
        mockSpecRepository,
        mockEnvironmentRepository,
        mockExecutionAdapter
      );
      
      const input: ExecuteOperationToolInput = {
        specId: 'spec-123',
        envName: 'dev',
        operationId: 'getPet',
        overrides: {
          pathParams: { petId: '123' },
        },
      };

      const result = await tool.handler(input) as ExecuteOperationToolOutput;

      expect(result.success).toBe(true);
      expect(result.operationId).toBe('getPet');
      expect(result.request.url).toBe('https://api.petstore.com/pet/123');
      expect(result.request.method).toBe('GET');
      expect(result.response.status).toBe(200);
      expect(result.response.body).toEqual({ id: '123', name: 'Fluffy' });
      expect(result.response.responseTime).toBe(150);
    });

    it('should pass all overrides to execution adapter', async () => {
      const mockSpec = createMockSpec();
      const mockEnv = createMockEnvironment();
      const executionResult: ExecutionResult = {
        success: true,
        request: {
          url: 'https://api.petstore.com/pet/123',
          method: 'GET' as HttpMethod,
          headers: {},
        },
        response: {
          status: 200,
          statusText: 'OK',
          headers: {},
          data: {},
          responseTime: 100,
        },
      };

      mockSpecRepository.findById.mockResolvedValue(mockSpec);
      mockEnvironmentRepository.findBySpecId.mockResolvedValue([mockEnv]);
      mockExecutionAdapter.executeOperation.mockResolvedValue(executionResult);

      const tool = createExecuteOperationTool(
        mockSpecRepository,
        mockEnvironmentRepository,
        mockExecutionAdapter
      );

      const input: ExecuteOperationToolInput = {
        specId: 'spec-123',
        envName: 'dev',
        operationId: 'getPet',
        overrides: {
          pathParams: { petId: '456' },
          query: { verbose: true },
          headers: { 'X-Api-Key': 'test-key' },
          body: { data: 'test' },
        },
      };

      await tool.handler(input);

      expect(mockExecutionAdapter.executeOperation).toHaveBeenCalledWith(
        expect.objectContaining({ operationId: 'getPet' }),
        expect.objectContaining({ name: 'dev' }),
        {
          pathParams: { petId: '456' },
          queryParams: { verbose: true },
          headers: { 'X-Api-Key': 'test-key' },
          body: { data: 'test' },
        }
      );
    });

    it('should throw error when spec not found', async () => {
      mockSpecRepository.findById.mockResolvedValue(null);

      const tool = createExecuteOperationTool(
        mockSpecRepository,
        mockEnvironmentRepository,
        mockExecutionAdapter
      );

      const input: ExecuteOperationToolInput = {
        specId: 'invalid-spec',
        envName: 'dev',
        operationId: 'getPet',
      };

      await expect(tool.handler(input)).rejects.toThrow('Spec not found');
    });

    it('should throw error when operation not found', async () => {
      const mockSpec = createMockSpec();
      mockSpecRepository.findById.mockResolvedValue(mockSpec);

      const tool = createExecuteOperationTool(
        mockSpecRepository,
        mockEnvironmentRepository,
        mockExecutionAdapter
      );

      const input: ExecuteOperationToolInput = {
        specId: 'spec-123',
        envName: 'dev',
        operationId: 'invalidOperation',
      };

      await expect(tool.handler(input)).rejects.toThrow('Operation not found');
    });

    it('should throw error when environment not found', async () => {
      const mockSpec = createMockSpec();
      mockSpecRepository.findById.mockResolvedValue(mockSpec);
      mockEnvironmentRepository.findBySpecId.mockResolvedValue([]);

      const tool = createExecuteOperationTool(
        mockSpecRepository,
        mockEnvironmentRepository,
        mockExecutionAdapter
      );

      const input: ExecuteOperationToolInput = {
        specId: 'spec-123',
        envName: 'invalid-env',
        operationId: 'getPet',
      };

      await expect(tool.handler(input)).rejects.toThrow('Environment not found');
    });

    it('should return error field when execution fails', async () => {
      const mockSpec = createMockSpec();
      const mockEnv = createMockEnvironment();
      const executionResult: ExecutionResult = {
        success: false,
        request: {
          url: 'https://api.petstore.com/pet/999',
          method: 'GET' as HttpMethod,
          headers: {},
        },
        response: {
          status: 404,
          statusText: 'Not Found',
          headers: {},
          data: { error: 'Pet not found' },
          responseTime: 50,
        },
        error: 'Request failed with status 404',
      };

      mockSpecRepository.findById.mockResolvedValue(mockSpec);
      mockEnvironmentRepository.findBySpecId.mockResolvedValue([mockEnv]);
      mockExecutionAdapter.executeOperation.mockResolvedValue(executionResult);

      const tool = createExecuteOperationTool(
        mockSpecRepository,
        mockEnvironmentRepository,
        mockExecutionAdapter
      );

      const input: ExecuteOperationToolInput = {
        specId: 'spec-123',
        envName: 'dev',
        operationId: 'getPet',
        overrides: { pathParams: { petId: '999' } },
      };

      const result = await tool.handler(input) as ExecuteOperationToolOutput;

      expect(result.success).toBe(false);
      expect(result.response.status).toBe(404);
      expect(result.error).toBe('Request failed with status 404');
    });
  });
});
