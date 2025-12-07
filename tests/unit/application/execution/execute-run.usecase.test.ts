/**
 * ExecuteRunUseCase tests
 */

import {
  ExecuteRunUseCase,
  ExecuteRunInput,
  ExecuteRunDependencies,
  HttpClient,
  HttpResponse,
} from '../../../../src/application/execution/execute-run.usecase';
import { IRunPlanRepository, IRunReportRepository, IEnvironmentRepository } from '../../../../src/domain/repositories';
import { RunPlan, EnvironmentConfig, createRunPlan, createOperation } from '../../../../src/domain/models';

// Mock run plan
const createMockRunPlan = (): RunPlan => createRunPlan({
  runId: 'run-123',
  specId: 'spec-123',
  envName: 'qa',
  envId: 'env-123',
  status: 'ready',
  selection: { mode: 'full' },
  executionItems: [
    {
      id: 'item-1',
      operation: createOperation({
        operationId: 'getUsers',
        method: 'GET',
        path: '/users',
        tags: ['Users'],
      }),
      testCases: [
        {
          id: 'test-1',
          name: 'GET /users - Happy Path',
          description: 'Test get users',
          type: 'happy-path' as const,
          operationId: 'getUsers',
          method: 'GET' as const,
          path: '/users',
          payloadStrategy: 'schema-default' as const,
          expectedStatus: 200,
          assertions: [],
          priority: 1,
          tags: [],
        },
      ],
      order: 1,
    },
  ],
  operationCount: 1,
  testCount: 1,
});

// Mock environment
const mockEnvironment: EnvironmentConfig = {
  id: 'env-123',
  specId: 'spec-123',
  name: 'qa',
  baseUrl: 'https://qa.example.com',
  defaultHeaders: { 'Content-Type': 'application/json' },
  authConfig: { type: 'none' },
  variables: {},
  isDefault: false,
  createdAt: new Date(),
  updatedAt: new Date(),
};

// Mock HTTP client
const createMockHttpClient = (): jest.Mocked<HttpClient> => ({
  request: jest.fn(),
});

// Mock repositories
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

const createMockRunReportRepository = (): jest.Mocked<IRunReportRepository> => ({
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  findById: jest.fn(),
  find: jest.fn(),
  findBySpecId: jest.fn(),
  findLatestBySpecId: jest.fn(),
  findBySpecIdAndEnv: jest.fn(),
  getStatsBySpecId: jest.fn(),
  getStatsByDateRange: jest.fn(),
  count: jest.fn(),
  exists: jest.fn(),
  deleteBySpecId: jest.fn(),
  deleteOlderThan: jest.fn(),
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

describe('ExecuteRunUseCase', () => {
  let useCase: ExecuteRunUseCase;
  let mockRunPlanRepo: jest.Mocked<IRunPlanRepository>;
  let mockRunReportRepo: jest.Mocked<IRunReportRepository>;
  let mockEnvRepo: jest.Mocked<IEnvironmentRepository>;
  let mockHttpClient: jest.Mocked<HttpClient>;

  beforeEach(() => {
    mockRunPlanRepo = createMockRunPlanRepository();
    mockRunReportRepo = createMockRunReportRepository();
    mockEnvRepo = createMockEnvironmentRepository();
    mockHttpClient = createMockHttpClient();

    const mockPlan = createMockRunPlan();
    mockRunPlanRepo.findById.mockResolvedValue(mockPlan);
    mockRunPlanRepo.update.mockImplementation(async (plan) => plan);
    mockEnvRepo.findBySpecId.mockResolvedValue([mockEnvironment]);
    mockRunReportRepo.create.mockImplementation(async (report) => report);

    // Default successful response
    mockHttpClient.request.mockResolvedValue({
      statusCode: 200,
      statusText: 'OK',
      headers: { 'content-type': 'application/json' },
      body: { data: [] },
      responseTime: 100,
    });

    useCase = new ExecuteRunUseCase({
      runPlanRepository: mockRunPlanRepo,
      runReportRepository: mockRunReportRepo,
      environmentRepository: mockEnvRepo,
      httpClient: mockHttpClient,
    });
  });

  it('should execute a run plan successfully', async () => {
    const input: ExecuteRunInput = {
      runId: 'run-123',
    };

    const result = await useCase.execute(input);

    expect(result.runId).toBe('run-123');
    expect(result.specId).toBe('spec-123');
    expect(result.envName).toBe('qa');
    expect(result.status).toBe('completed');
    expect(result.summary.total).toBe(1);
    expect(result.summary.passed).toBe(1);
    expect(mockRunPlanRepo.update).toHaveBeenCalled();
    expect(mockRunReportRepo.create).toHaveBeenCalled();
  });

  it('should handle test failures', async () => {
    mockHttpClient.request.mockResolvedValue({
      statusCode: 500,
      statusText: 'Internal Server Error',
      headers: {},
      body: { error: 'Server error' },
      responseTime: 50,
    });

    const input: ExecuteRunInput = {
      runId: 'run-123',
    };

    const result = await useCase.execute(input);

    expect(result.status).toBe('failed');
    expect(result.summary.failed).toBe(1);
    expect(result.summary.passed).toBe(0);
  });

  it('should throw ValidationError when runId and specId are both missing', async () => {
    const input: ExecuteRunInput = {};

    await expect(useCase.execute(input)).rejects.toThrow('Either runId or specId is required');
  });

  it('should throw NotFoundError when run plan does not exist', async () => {
    mockRunPlanRepo.findById.mockResolvedValue(null);

    const input: ExecuteRunInput = {
      runId: 'non-existent',
    };

    await expect(useCase.execute(input)).rejects.toThrow('Run plan not found');
  });

  it('should throw ValidationError when plan is already running', async () => {
    const runningPlan = createMockRunPlan();
    runningPlan.status = 'running';
    mockRunPlanRepo.findById.mockResolvedValue(runningPlan);

    const input: ExecuteRunInput = {
      runId: 'run-123',
    };

    await expect(useCase.execute(input)).rejects.toThrow('already running');
  });

  it('should throw ValidationError when plan is already completed', async () => {
    const completedPlan = createMockRunPlan();
    completedPlan.status = 'completed';
    mockRunPlanRepo.findById.mockResolvedValue(completedPlan);

    const input: ExecuteRunInput = {
      runId: 'run-123',
    };

    await expect(useCase.execute(input)).rejects.toThrow('already been executed');
  });

  it('should throw NotFoundError when environment does not exist', async () => {
    mockEnvRepo.findBySpecId.mockResolvedValue([]);

    const input: ExecuteRunInput = {
      runId: 'run-123',
    };

    await expect(useCase.execute(input)).rejects.toThrow("Environment 'qa' not found");
  });

  it('should handle HTTP request errors', async () => {
    mockHttpClient.request.mockRejectedValue(new Error('Network error'));

    const input: ExecuteRunInput = {
      runId: 'run-123',
    };

    const result = await useCase.execute(input);

    expect(result.status).toBe('failed');
    expect(result.summary.errors).toBe(1);
  });
});
