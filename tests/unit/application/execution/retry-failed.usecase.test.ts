/**
 * RetryFailedUseCase tests
 */

import {
  RetryFailedUseCase,
  RetryFailedInput,
  RetryFailedDependencies,
} from '../../../../src/application/execution/retry-failed.usecase';
import { HttpClient, HttpResponse } from '../../../../src/application/execution/execute-run.usecase';
import { IRunPlanRepository, IRunReportRepository, IEnvironmentRepository } from '../../../../src/domain/repositories';
import { RunPlan, RunReport, EnvironmentConfig, createRunPlan, createRunReport, createOperation } from '../../../../src/domain/models';

// Mock run plan with execution items
const createMockRunPlan = (): RunPlan => createRunPlan({
  runId: 'run-123',
  specId: 'spec-123',
  envName: 'qa',
  envId: 'env-123',
  status: 'failed',
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

// Mock run report with failed tests
const createMockRunReport = (): RunReport => {
  const startedAt = new Date('2024-01-01T10:00:00Z');
  const completedAt = new Date('2024-01-01T10:01:00Z');
  
  return createRunReport({
    runId: 'run-123',
    specId: 'spec-123',
    envName: 'qa',
    testResults: [
      {
        testCaseId: 'test-1',
        testCaseName: 'GET /users - Happy Path',
        operationId: 'getUsers',
        status: 'failed',
        assertions: [
          {
            description: 'Status should be 200',
            passed: false,
            expected: 200,
            actual: 500,
          },
        ],
        duration: 100,
        retryAttempt: 0,
        startedAt,
        completedAt,
      },
    ],
    startedAt,
    completedAt,
  });
};

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

describe('RetryFailedUseCase', () => {
  let useCase: RetryFailedUseCase;
  let mockRunPlanRepo: jest.Mocked<IRunPlanRepository>;
  let mockRunReportRepo: jest.Mocked<IRunReportRepository>;
  let mockEnvRepo: jest.Mocked<IEnvironmentRepository>;
  let mockHttpClient: jest.Mocked<HttpClient>;

  beforeEach(() => {
    mockRunPlanRepo = createMockRunPlanRepository();
    mockRunReportRepo = createMockRunReportRepository();
    mockEnvRepo = createMockEnvironmentRepository();
    mockHttpClient = createMockHttpClient();

    mockRunReportRepo.findById.mockResolvedValue(createMockRunReport());
    mockRunPlanRepo.findById.mockResolvedValue(createMockRunPlan());
    mockRunPlanRepo.create.mockImplementation(async (plan) => plan);
    mockRunPlanRepo.update.mockImplementation(async (plan) => plan);
    mockRunReportRepo.create.mockImplementation(async (report) => report);
    mockEnvRepo.findBySpecId.mockResolvedValue([mockEnvironment]);

    // Default successful response for retry
    mockHttpClient.request.mockResolvedValue({
      statusCode: 200,
      statusText: 'OK',
      headers: { 'content-type': 'application/json' },
      body: { data: [] },
      responseTime: 100,
    });

    useCase = new RetryFailedUseCase({
      runPlanRepository: mockRunPlanRepo,
      runReportRepository: mockRunReportRepo,
      environmentRepository: mockEnvRepo,
      httpClient: mockHttpClient,
    });
  });

  it('should retry failed tests and return new run summary', async () => {
    const input: RetryFailedInput = {
      runId: 'run-123',
    };

    const result = await useCase.execute(input);

    expect(result.originalRunId).toBe('run-123');
    expect(result.newRunId).toBeDefined();
    expect(result.specId).toBe('spec-123');
    expect(result.envName).toBe('qa');
    expect(result.retriedTests).toBe(1);
    expect(result.status).toBe('completed');
    expect(result.summary.passed).toBe(1);
    expect(mockRunPlanRepo.create).toHaveBeenCalled();
    expect(mockRunReportRepo.create).toHaveBeenCalled();
  });

  it('should increment retry attempt count', async () => {
    const input: RetryFailedInput = {
      runId: 'run-123',
    };

    await useCase.execute(input);

    // Check that the new report has retryAttempt > 0
    expect(mockRunReportRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        testResults: expect.arrayContaining([
          expect.objectContaining({
            retryAttempt: 1,
          }),
        ]),
      })
    );
  });

  it('should throw NotFoundError when original report does not exist', async () => {
    mockRunReportRepo.findById.mockResolvedValue(null);

    const input: RetryFailedInput = {
      runId: 'non-existent',
    };

    await expect(useCase.execute(input)).rejects.toThrow('Run report not found');
  });

  it('should throw ValidationError when no failed tests exist', async () => {
    const successfulReport = createMockRunReport();
    successfulReport.testResults[0].status = 'passed';
    mockRunReportRepo.findById.mockResolvedValue(successfulReport);

    const input: RetryFailedInput = {
      runId: 'run-123',
    };

    await expect(useCase.execute(input)).rejects.toThrow('No failed or errored tests');
  });

  it('should throw NotFoundError when original plan does not exist', async () => {
    mockRunPlanRepo.findById.mockResolvedValue(null);

    const input: RetryFailedInput = {
      runId: 'run-123',
    };

    await expect(useCase.execute(input)).rejects.toThrow('Original run plan not found');
  });

  it('should throw NotFoundError when environment does not exist', async () => {
    mockEnvRepo.findBySpecId.mockResolvedValue([]);

    const input: RetryFailedInput = {
      runId: 'run-123',
    };

    await expect(useCase.execute(input)).rejects.toThrow("Environment 'qa' not found");
  });

  it('should handle retry failures gracefully', async () => {
    mockHttpClient.request.mockRejectedValue(new Error('Network error'));

    const input: RetryFailedInput = {
      runId: 'run-123',
    };

    const result = await useCase.execute(input);

    expect(result.status).toBe('failed');
    expect(result.summary.errors).toBe(1);
  });

  it('should tag retry runs appropriately', async () => {
    const input: RetryFailedInput = {
      runId: 'run-123',
    };

    await useCase.execute(input);

    expect(mockRunPlanRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        tags: expect.arrayContaining(['retry']),
        description: expect.stringContaining('Retry of failed tests'),
      })
    );
  });
});
