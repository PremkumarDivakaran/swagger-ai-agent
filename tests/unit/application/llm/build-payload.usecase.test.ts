/**
 * BuildPayloadUseCase Tests
 */

import { 
  BuildPayloadUseCase,
  createBuildPayloadUseCase,
  createBuildPayloadUseCaseWithClient,
  BuildPayloadInput,
  BuildPayloadVariantsInput,
  SuggestScenariosInput,
} from '../../../../src/application/llm/build-payload.usecase';
import { ISpecRepository } from '../../../../src/domain/repositories';
import { NormalizedSpec, Operation, HttpMethod } from '../../../../src/domain/models';
import { PayloadBuilderLlmClient, ILlmProvider, GeneratedPayload, LlmMessage, LlmCompletionOptions, LlmCompletionResult } from '../../../../src/infrastructure/llm';

// Mock spec with operations
function createMockSpec(): NormalizedSpec {
  const operations: Operation[] = [
    {
      operationId: 'createPet',
      method: 'post' as HttpMethod,
      path: '/pet',
      summary: 'Create a new pet',
      description: 'Creates a pet in the store',
      tags: ['pet'],
      parameters: [],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                status: { type: 'string', enum: ['available', 'pending', 'sold'] },
              },
              required: ['name'],
            },
          },
        },
      },
      responses: [
        {
          statusCode: '201',
          description: 'Pet created',
          content: {},
        },
      ],
      security: [],
      deprecated: false,
    },
    {
      operationId: 'getPet',
      method: 'get' as HttpMethod,
      path: '/pet/{petId}',
      summary: 'Get pet by ID',
      tags: ['pet'],
      parameters: [
        {
          name: 'petId',
          in: 'path',
          required: true,
          schema: { type: 'integer' },
        },
      ],
      responses: [
        {
          statusCode: '200',
          description: 'Success',
          content: {},
        },
      ],
      security: [],
      deprecated: false,
    },
  ];

  return {
    id: 'test-spec-id',
    openApiVersion: '3.0.0' as const,
    info: {
      title: 'Test API',
      version: '1.0.0',
    },
    servers: [{ url: 'https://api.test.com' }],
    operations,
    tags: [{ name: 'pet', description: 'Pet operations' }],
    securitySchemes: [],
    globalSecurity: [],
    metadata: {
      sourceType: 'url' as const,
      sourceLocation: 'https://example.com/spec.yaml',
      importedAt: new Date(),
    },
  };
}

// Mock PayloadBuilderLlmClient
class MockPayloadBuilderLlmClient {
  async buildPayload(operation: Operation, hints?: any): Promise<GeneratedPayload> {
    return {
      payload: { name: 'Buddy', status: 'available' },
      explanation: 'Generated mock payload',
      confidence: 0.95,
    };
  }

  async buildPayloadVariants(operation: Operation, count: number, hints?: any): Promise<GeneratedPayload[]> {
    return Array.from({ length: count }, (_, i) => ({
      payload: { name: `Pet${i + 1}`, status: 'available' },
      explanation: `Generated variant ${i + 1}`,
      confidence: 0.9 - i * 0.05,
    }));
  }

  async suggestTestScenarios(operation: Operation): Promise<string[]> {
    return [
      'Happy path with valid data',
      'Missing required fields',
      'Invalid field types',
    ];
  }
}

// Mock spec repository
class MockSpecRepository implements Partial<ISpecRepository> {
  private specs = new Map<string, NormalizedSpec>();

  constructor() {
    const spec = createMockSpec();
    this.specs.set(spec.id, spec);
  }

  async findById(id: string): Promise<NormalizedSpec | null> {
    return this.specs.get(id) || null;
  }

  async save(spec: NormalizedSpec): Promise<void> {
    this.specs.set(spec.id, spec);
  }

  async findAll(): Promise<NormalizedSpec[]> {
    return Array.from(this.specs.values());
  }

  async delete(id: string): Promise<boolean> {
    return this.specs.delete(id);
  }

  async exists(id: string): Promise<boolean> {
    return this.specs.has(id);
  }
}

// Mock LLM Provider
class MockLlmProvider implements ILlmProvider {
  readonly name = 'mock-provider';
  
  async complete(messages: LlmMessage[], options?: LlmCompletionOptions): Promise<LlmCompletionResult> {
    return { 
      content: 'mock response', 
      usage: { promptTokens: 5, completionTokens: 5, totalTokens: 10 },
      model: 'mock-model',
      finishReason: 'stop',
    };
  }
  async generateText() {
    return 'mock text';
  }
  async generateJson<T>(): Promise<T> {
    return {} as T;
  }
  async isAvailable() {
    return true;
  }
  getAvailableModels() {
    return ['mock-model'];
  }
}

describe('BuildPayloadUseCase', () => {
  let useCase: BuildPayloadUseCase;
  let mockPayloadBuilder: MockPayloadBuilderLlmClient;
  let mockSpecRepository: MockSpecRepository;

  beforeEach(() => {
    mockPayloadBuilder = new MockPayloadBuilderLlmClient();
    mockSpecRepository = new MockSpecRepository();
    useCase = new BuildPayloadUseCase(
      mockPayloadBuilder as unknown as PayloadBuilderLlmClient,
      mockSpecRepository as unknown as ISpecRepository
    );
  });

  describe('buildPayload', () => {
    it('should build payload for valid operation', async () => {
      const input: BuildPayloadInput = {
        specId: 'test-spec-id',
        operationId: 'createPet',
      };

      const result = await useCase.buildPayload(input);

      expect(result.specId).toBe('test-spec-id');
      expect(result.specTitle).toBe('Test API');
      expect(result.operationId).toBe('createPet');
      expect(result.operationPath).toBe('/pet');
      expect(result.operationMethod).toBe('POST');
      expect(result.payload).toBeDefined();
      expect(result.payload.payload).toEqual({ name: 'Buddy', status: 'available' });
      expect(result.payload.confidence).toBe(0.95);
      expect(result.generatedAt).toBeDefined();
    });

    it('should pass hints to payload builder', async () => {
      const buildPayloadSpy = jest.spyOn(mockPayloadBuilder, 'buildPayload');
      
      const input: BuildPayloadInput = {
        specId: 'test-spec-id',
        operationId: 'createPet',
        hints: {
          locale: 'en-US',
          domain: 'pet-store',
        },
      };

      await useCase.buildPayload(input);

      expect(buildPayloadSpy).toHaveBeenCalledWith(
        expect.objectContaining({ operationId: 'createPet' }),
        { locale: 'en-US', domain: 'pet-store' }
      );
    });

    it('should throw error for non-existent spec', async () => {
      const input: BuildPayloadInput = {
        specId: 'non-existent-spec',
        operationId: 'createPet',
      };

      await expect(useCase.buildPayload(input)).rejects.toThrow('Spec not found');
    });

    it('should throw error for non-existent operation', async () => {
      const input: BuildPayloadInput = {
        specId: 'test-spec-id',
        operationId: 'nonExistentOperation',
      };

      await expect(useCase.buildPayload(input)).rejects.toThrow('Operation not found');
    });
  });

  describe('buildPayloadVariants', () => {
    it('should build multiple payload variants', async () => {
      const input: BuildPayloadVariantsInput = {
        specId: 'test-spec-id',
        operationId: 'createPet',
        count: 3,
      };

      const result = await useCase.buildPayloadVariants(input);

      expect(result.specId).toBe('test-spec-id');
      expect(result.operationId).toBe('createPet');
      expect(result.payloads).toHaveLength(3);
      expect(result.count).toBe(3);
      expect(result.payloads[0].payload).toEqual({ name: 'Pet1', status: 'available' });
    });

    it('should throw error for non-existent spec', async () => {
      const input: BuildPayloadVariantsInput = {
        specId: 'non-existent',
        operationId: 'createPet',
        count: 3,
      };

      await expect(useCase.buildPayloadVariants(input)).rejects.toThrow('Spec not found');
    });
  });

  describe('suggestScenarios', () => {
    it('should suggest test scenarios for an operation', async () => {
      const input: SuggestScenariosInput = {
        specId: 'test-spec-id',
        operationId: 'createPet',
      };

      const result = await useCase.suggestScenarios(input);

      expect(result.specId).toBe('test-spec-id');
      expect(result.operationId).toBe('createPet');
      expect(result.scenarios).toHaveLength(3);
      expect(result.scenarios[0].description).toBe('Happy path with valid data');
      expect(result.scenarios[1].description).toBe('Missing required fields');
    });

    it('should throw error for non-existent operation', async () => {
      const input: SuggestScenariosInput = {
        specId: 'test-spec-id',
        operationId: 'nonExistent',
      };

      await expect(useCase.suggestScenarios(input)).rejects.toThrow('Operation not found');
    });
  });

  describe('listOperations', () => {
    it('should list all operations for a spec', async () => {
      const result = await useCase.listOperations('test-spec-id');

      expect(result.specId).toBe('test-spec-id');
      expect(result.specTitle).toBe('Test API');
      expect(result.operations).toHaveLength(2);
      
      const createPetOp = result.operations.find(op => op.operationId === 'createPet');
      expect(createPetOp).toBeDefined();
      expect(createPetOp?.method).toBe('POST');
      expect(createPetOp?.path).toBe('/pet');
      expect(createPetOp?.hasRequestBody).toBe(true);

      const getPetOp = result.operations.find(op => op.operationId === 'getPet');
      expect(getPetOp).toBeDefined();
      expect(getPetOp?.method).toBe('GET');
      expect(getPetOp?.hasRequestBody).toBe(false);
    });

    it('should throw error for non-existent spec', async () => {
      await expect(useCase.listOperations('non-existent')).rejects.toThrow('Spec not found');
    });
  });
});

describe('Factory functions', () => {
  it('createBuildPayloadUseCase should create use case with LLM provider', () => {
    const mockProvider = new MockLlmProvider();
    const mockRepo = new MockSpecRepository();

    const useCase = createBuildPayloadUseCase(
      mockProvider,
      mockRepo as unknown as ISpecRepository
    );

    expect(useCase).toBeInstanceOf(BuildPayloadUseCase);
  });

  it('createBuildPayloadUseCaseWithClient should create use case with existing client', () => {
    const mockClient = new MockPayloadBuilderLlmClient();
    const mockRepo = new MockSpecRepository();

    const useCase = createBuildPayloadUseCaseWithClient(
      mockClient as unknown as PayloadBuilderLlmClient,
      mockRepo as unknown as ISpecRepository
    );

    expect(useCase).toBeInstanceOf(BuildPayloadUseCase);
  });
});
