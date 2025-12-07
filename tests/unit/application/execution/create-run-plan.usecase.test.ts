/**
 * CreateRunPlanUseCase tests
 */

import {
  CreateRunPlanUseCase,
  CreateRunPlanInput,
  CreateRunPlanDependencies,
} from '../../../../src/application/execution/create-run-plan.usecase';
import { ISpecRepository, IEnvironmentRepository, IRunPlanRepository } from '../../../../src/domain/repositories';
import { NormalizedSpec, EnvironmentConfig, RunPlan, Operation, createOperation } from '../../../../src/domain/models';

// Mock spec with operations
const mockSpec: NormalizedSpec = {
  id: 'spec-123',
  info: {
    title: 'Test API',
    version: '1.0.0',
  },
  openApiVersion: '3.0.0',
  servers: [{ url: 'https://api.example.com' }],
  operations: [
    createOperation({
      operationId: 'getUsers',
      method: 'GET',
      path: '/users',
      tags: ['Users'],
      summary: 'Get all users',
    }),
    createOperation({
      operationId: 'createUser',
      method: 'POST',
      path: '/users',
      tags: ['Users'],
      summary: 'Create a user',
    }),
    createOperation({
      operationId: 'getOrders',
      method: 'GET',
      path: '/orders',
      tags: ['Orders'],
      summary: 'Get all orders',
    }),
  ],
  tags: [
    { name: 'Users', description: 'User operations' },
    { name: 'Orders', description: 'Order operations' },
  ],
  securitySchemes: [],
  globalSecurity: [],
  metadata: {
    importedAt: new Date(),
    sourceType: 'url',
    sourceLocation: 'https://example.com/api.yaml',
  },
};

// Mock environment
const mockEnvironment: EnvironmentConfig = {
  id: 'env-123',
  specId: 'spec-123',
  name: 'qa',
  baseUrl: 'https://qa.example.com',
  defaultHeaders: {},
  authConfig: { type: 'none' },
  variables: {},
  isDefault: false,
  createdAt: new Date(),
  updatedAt: new Date(),
};

// Mock repository implementations
const createMockSpecRepository = (): jest.Mocked<ISpecRepository> => ({
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  findById: jest.fn(),
  find: jest.fn(),
  findBySourceLocation: jest.fn(),
  findAll: jest.fn(),
  count: jest.fn(),
  exists: jest.fn(),
  existsBySource: jest.fn(),
});

const createMockEnvironmentRepository = (): jest.Mocked<IEnvironmentRepository> => ({
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  findById: jest.fn(),
  find: jest.fn(),
  findBySpecId: jest.fn(),
  findBySpecIdAndName: jest.fn(),
  findDefaultBySpecId: jest.fn(),
  setAsDefault: jest.fn(),
  count: jest.fn(),
  exists: jest.fn(),
  deleteBySpecId: jest.fn(),
});

const createMockRunPlanRepository = (): jest.Mocked<IRunPlanRepository> => ({
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  findById: jest.fn(),
  find: jest.fn(),
  findBySpecId: jest.fn(),
  findByStatus: jest.fn(),
  findLatestBySpecId: jest.fn(),
  findRunning: jest.fn(),
  updateStatus: jest.fn(),
  count: jest.fn(),
  exists: jest.fn(),
  deleteBySpecId: jest.fn(),
  deleteCompletedOlderThan: jest.fn(),
});

describe('CreateRunPlanUseCase', () => {
  let useCase: CreateRunPlanUseCase;
  let mockSpecRepo: jest.Mocked<ISpecRepository>;
  let mockEnvRepo: jest.Mocked<IEnvironmentRepository>;
  let mockRunPlanRepo: jest.Mocked<IRunPlanRepository>;

  beforeEach(() => {
    mockSpecRepo = createMockSpecRepository();
    mockEnvRepo = createMockEnvironmentRepository();
    mockRunPlanRepo = createMockRunPlanRepository();

    mockSpecRepo.findById.mockResolvedValue(mockSpec);
    mockEnvRepo.findBySpecId.mockResolvedValue([mockEnvironment]);
    mockRunPlanRepo.create.mockImplementation(async (plan) => plan);

    useCase = new CreateRunPlanUseCase({
      specRepository: mockSpecRepo,
      environmentRepository: mockEnvRepo,
      runPlanRepository: mockRunPlanRepo,
    });
  });

  it('should create a run plan with full selection', async () => {
    const input: CreateRunPlanInput = {
      specId: 'spec-123',
      envName: 'qa',
      selection: { mode: 'full' },
    };

    const result = await useCase.execute(input);

    expect(result.specId).toBe('spec-123');
    expect(result.envName).toBe('qa');
    expect(result.operationCount).toBe(3);
    expect(result.testCount).toBe(3); // One test per operation
    expect(result.status).toBe('ready');
    expect(mockRunPlanRepo.create).toHaveBeenCalled();
  });

  it('should create a run plan with tag selection', async () => {
    const input: CreateRunPlanInput = {
      specId: 'spec-123',
      envName: 'qa',
      selection: { mode: 'tag', tags: ['Users'] },
    };

    const result = await useCase.execute(input);

    expect(result.operationCount).toBe(2); // Only Users operations
    expect(result.testCount).toBe(2);
  });

  it('should create a run plan with single operation selection', async () => {
    const input: CreateRunPlanInput = {
      specId: 'spec-123',
      envName: 'qa',
      selection: { mode: 'single', operationId: 'getUsers' },
    };

    const result = await useCase.execute(input);

    expect(result.operationCount).toBe(1);
    expect(result.testCount).toBe(1);
  });

  it('should apply exclusions', async () => {
    const input: CreateRunPlanInput = {
      specId: 'spec-123',
      envName: 'qa',
      selection: { mode: 'full', exclude: ['getUsers'] },
    };

    const result = await useCase.execute(input);

    expect(result.operationCount).toBe(2);
  });

  it('should throw NotFoundError when spec does not exist', async () => {
    mockSpecRepo.findById.mockResolvedValue(null);

    const input: CreateRunPlanInput = {
      specId: 'non-existent',
      envName: 'qa',
      selection: { mode: 'full' },
    };

    await expect(useCase.execute(input)).rejects.toThrow('Spec not found');
  });

  it('should throw NotFoundError when environment does not exist', async () => {
    mockEnvRepo.findBySpecId.mockResolvedValue([]);

    const input: CreateRunPlanInput = {
      specId: 'spec-123',
      envName: 'non-existent',
      selection: { mode: 'full' },
    };

    await expect(useCase.execute(input)).rejects.toThrow("Environment 'non-existent' not found");
  });

  it('should throw NotFoundError when no operations match selection', async () => {
    const input: CreateRunPlanInput = {
      specId: 'spec-123',
      envName: 'qa',
      selection: { mode: 'tag', tags: ['NonExistent'] },
    };

    await expect(useCase.execute(input)).rejects.toThrow('No operations match');
  });

  it('should include description and config in run plan', async () => {
    const input: CreateRunPlanInput = {
      specId: 'spec-123',
      envName: 'qa',
      selection: { mode: 'full' },
      description: 'Test run',
      config: { parallel: true, maxWorkers: 4 },
    };

    await useCase.execute(input);

    expect(mockRunPlanRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        description: 'Test run',
        config: expect.objectContaining({ parallel: true, maxWorkers: 4 }),
      })
    );
  });
});
