/**
 * Unit tests for generateAxiosTests MCP tool
 */

import { 
  createGenerateAxiosTestsTool, 
  GenerateAxiosTestsToolInput,
  GenerateAxiosTestsToolOutput,
  GENERATE_AXIOS_TESTS_TOOL_NAME,
} from '../../../../../../src/infrastructure/mcp/swagger/tools/generateAxiosTests.tool';
import { 
  GenerateAxiosTestsUseCase, 
  TestGenerationResult,
} from '../../../../../../src/application/testgen/generate-axios-tests.usecase';

describe('createGenerateAxiosTestsTool', () => {
  let mockGenerateAxiosTestsUseCase: jest.Mocked<GenerateAxiosTestsUseCase>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockGenerateAxiosTestsUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<GenerateAxiosTestsUseCase>;
  });

  describe('tool metadata', () => {
    it('should have correct name', () => {
      const tool = createGenerateAxiosTestsTool(mockGenerateAxiosTestsUseCase);
      expect(tool.name).toBe('swagger_generate_tests');
    });

    it('should have correct description', () => {
      const tool = createGenerateAxiosTestsTool(mockGenerateAxiosTestsUseCase);
      expect(tool.description).toContain('Generate Axios + Jest test code');
      expect(tool.description).toContain('OpenAPI');
    });

    it('should have correct input schema', () => {
      const tool = createGenerateAxiosTestsTool(mockGenerateAxiosTestsUseCase);
      expect(tool.inputSchema.required).toContain('specId');
      expect(tool.inputSchema.properties).toHaveProperty('selection');
      expect(tool.inputSchema.properties).toHaveProperty('options');
    });

    it('should export tool name constant', () => {
      expect(GENERATE_AXIOS_TESTS_TOOL_NAME).toBe('swagger_generate_tests');
    });
  });

  describe('handler', () => {
    const createMockResult = (overrides: Partial<TestGenerationResult> = {}): TestGenerationResult => ({
      code: `
import axios from 'axios';

describe('Petstore API', () => {
  it('should get pet by ID', async () => {
    const response = await axios.get('/pet/1');
    expect(response.status).toBe(200);
  });
});
`,
      fileName: 'petstore-api.test.ts',
      specId: 'spec-123',
      specTitle: 'Petstore API',
      testCount: 5,
      operationCount: 2,
      testCases: [
        {
          id: 'tc-1',
          name: 'GET /pet/{petId} - should return pet',
          type: 'happy-path',
          operationId: 'getPetById',
          method: 'GET',
          path: '/pet/{petId}',
          expectedStatus: 200,
          description: 'Test happy path for getPetById',
        },
        {
          id: 'tc-2',
          name: 'GET /pet/{petId} - should return 404 for invalid ID',
          type: 'auth-error',
          operationId: 'getPetById',
          method: 'GET',
          path: '/pet/{petId}',
          expectedStatus: 404,
          description: 'Test error case for getPetById',
        },
      ],
      generatedAt: new Date('2024-01-15T10:00:00Z'),
      options: {},
      ...overrides,
    });

    it('should generate tests with default options', async () => {
      const mockResult = createMockResult();
      mockGenerateAxiosTestsUseCase.execute.mockResolvedValue(mockResult);

      const tool = createGenerateAxiosTestsTool(mockGenerateAxiosTestsUseCase);
      const input: GenerateAxiosTestsToolInput = {
        specId: 'spec-123',
      };
      
      const result = await tool.handler(input) as GenerateAxiosTestsToolOutput;

      expect(result.code).toContain('import axios');
      expect(result.fileName).toBe('petstore-api.test.ts');
      expect(result.specId).toBe('spec-123');
      expect(result.specTitle).toBe('Petstore API');
      expect(result.testCount).toBe(5);
      expect(result.operationCount).toBe(2);
      expect(result.testCases).toHaveLength(2);
    });

    it('should pass selection to use case', async () => {
      const mockResult = createMockResult();
      mockGenerateAxiosTestsUseCase.execute.mockResolvedValue(mockResult);

      const tool = createGenerateAxiosTestsTool(mockGenerateAxiosTestsUseCase);
      const input: GenerateAxiosTestsToolInput = {
        specId: 'spec-123',
        selection: {
          mode: 'tag',
          tags: ['pet'],
        },
      };
      
      await tool.handler(input);

      expect(mockGenerateAxiosTestsUseCase.execute).toHaveBeenCalledWith({
        specId: 'spec-123',
        selection: {
          mode: 'tag',
          operationId: undefined,
          tags: ['pet'],
          exclude: undefined,
        },
        options: undefined,
      });
    });

    it('should pass single selection mode', async () => {
      const mockResult = createMockResult();
      mockGenerateAxiosTestsUseCase.execute.mockResolvedValue(mockResult);

      const tool = createGenerateAxiosTestsTool(mockGenerateAxiosTestsUseCase);
      const input: GenerateAxiosTestsToolInput = {
        specId: 'spec-123',
        selection: {
          mode: 'single',
          operationId: 'getPetById',
        },
      };
      
      await tool.handler(input);

      expect(mockGenerateAxiosTestsUseCase.execute).toHaveBeenCalledWith({
        specId: 'spec-123',
        selection: {
          mode: 'single',
          operationId: 'getPetById',
          tags: undefined,
          exclude: undefined,
        },
        options: undefined,
      });
    });

    it('should pass options to use case', async () => {
      const mockResult = createMockResult();
      mockGenerateAxiosTestsUseCase.execute.mockResolvedValue(mockResult);

      const tool = createGenerateAxiosTestsTool(mockGenerateAxiosTestsUseCase);
      const input: GenerateAxiosTestsToolInput = {
        specId: 'spec-123',
        options: {
          includeNegativeTests: true,
          includeAuthTests: true,
          groupByTag: false,
          baseUrlVariable: 'API_BASE_URL',
          envName: 'qa',
        },
      };
      
      await tool.handler(input);

      expect(mockGenerateAxiosTestsUseCase.execute).toHaveBeenCalledWith({
        specId: 'spec-123',
        selection: undefined,
        options: {
          includeNegativeTests: true,
          includeAuthTests: true,
          groupByTag: false,
          baseUrlVariable: 'API_BASE_URL',
          envName: 'qa',
        },
      });
    });

    it('should map test cases to output format', async () => {
      const mockResult = createMockResult();
      mockGenerateAxiosTestsUseCase.execute.mockResolvedValue(mockResult);

      const tool = createGenerateAxiosTestsTool(mockGenerateAxiosTestsUseCase);
      const input: GenerateAxiosTestsToolInput = {
        specId: 'spec-123',
      };
      
      const result = await tool.handler(input) as GenerateAxiosTestsToolOutput;

      expect(result.testCases[0]).toEqual({
        name: 'GET /pet/{petId} - should return pet',
        type: 'happy-path',
        operationId: 'getPetById',
        method: 'GET',
        path: '/pet/{petId}',
        expectedStatus: 200,
      });
    });

    it('should handle errors from use case', async () => {
      mockGenerateAxiosTestsUseCase.execute.mockRejectedValue(
        new Error('Spec not found')
      );

      const tool = createGenerateAxiosTestsTool(mockGenerateAxiosTestsUseCase);
      const input: GenerateAxiosTestsToolInput = {
        specId: 'invalid-spec',
      };
      
      await expect(tool.handler(input)).rejects.toThrow('Spec not found');
    });

    it('should handle selection with exclusions', async () => {
      const mockResult = createMockResult();
      mockGenerateAxiosTestsUseCase.execute.mockResolvedValue(mockResult);

      const tool = createGenerateAxiosTestsTool(mockGenerateAxiosTestsUseCase);
      const input: GenerateAxiosTestsToolInput = {
        specId: 'spec-123',
        selection: {
          mode: 'full',
          exclude: ['deleteUser', 'deleteAllData'],
        },
      };
      
      await tool.handler(input);

      expect(mockGenerateAxiosTestsUseCase.execute).toHaveBeenCalledWith({
        specId: 'spec-123',
        selection: {
          mode: 'full',
          operationId: undefined,
          tags: undefined,
          exclude: ['deleteUser', 'deleteAllData'],
        },
        options: undefined,
      });
    });
  });
});
