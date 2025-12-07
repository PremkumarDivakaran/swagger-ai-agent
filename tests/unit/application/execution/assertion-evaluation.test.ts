/**
 * Unit tests for ExecuteRunUseCase assertion evaluation
 */

import {
  ExecuteRunUseCase,
  ExecuteRunDependencies,
  MockHttpClient,
  HttpResponse,
  HttpClient,
} from '../../../../src/application/execution/execute-run.usecase';
import { IRunPlanRepository, IRunReportRepository, IEnvironmentRepository } from '../../../../src/domain/repositories';
import { RunPlan, TestCaseDefinition, Operation, EnvironmentConfig, createRunPlan, createOperation } from '../../../../src/domain/models';

// Mock environment
const createMockEnvironment = (overrides?: Partial<EnvironmentConfig>): EnvironmentConfig => ({
  id: 'env-1',
  specId: 'spec-1',
  name: 'qa',
  baseUrl: 'https://api.example.com',
  defaultHeaders: {},
  authConfig: { type: 'none' },
  variables: {},
  isDefault: false,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

// Mock operation
const createMockOperation = (): Operation => createOperation({
  operationId: 'getPet',
  method: 'GET',
  path: '/pets/{petId}',
  summary: 'Get pet by ID',
  description: 'Returns a single pet',
  tags: ['pets'],
  parameters: [
    { name: 'petId', in: 'path', required: true, schema: { type: 'integer' } },
  ],
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

// Create test case
const createMockTestCase = (overrides?: Partial<TestCaseDefinition>): TestCaseDefinition => ({
  id: 'tc-1',
  name: 'Happy path',
  type: 'happy-path',
  operationId: 'getPet',
  method: 'GET',
  path: '/pets/{petId}',
  payloadStrategy: 'schema-default',
  expectedStatus: 200,
  assertions: [],
  priority: 1,
  tags: [],
  overrides: { pathParams: { petId: '1' } },
  ...overrides,
});

// Create run plan
const createTestRunPlan = (testCases: TestCaseDefinition[], operation?: Operation): RunPlan => {
  const op = operation ?? createMockOperation();
  return createRunPlan({
    runId: 'run-1',
    specId: 'spec-1',
    envId: 'env-1',
    envName: 'qa',
    status: 'ready',
    selection: { mode: 'single' },
    executionItems: [
      {
        id: 'item-1',
        operation: op,
        testCases,
        order: 1,
      },
    ],
    operationCount: 1,
    testCount: testCases.length,
  });
};

describe('ExecuteRunUseCase - Assertion Evaluation', () => {
  let useCase: ExecuteRunUseCase;
  let mockRunPlanRepo: jest.Mocked<IRunPlanRepository>;
  let mockRunReportRepo: jest.Mocked<IRunReportRepository>;
  let mockEnvironmentRepo: jest.Mocked<IEnvironmentRepository>;
  let mockHttpClient: MockHttpClient;
  let mockEnvironment: EnvironmentConfig;

  beforeEach(() => {
    mockRunPlanRepo = createMockRunPlanRepository();
    mockRunReportRepo = createMockRunReportRepository();
    mockEnvironmentRepo = createMockEnvironmentRepository();
    mockHttpClient = new MockHttpClient();
    mockEnvironment = createMockEnvironment();

    const deps: ExecuteRunDependencies = {
      runPlanRepository: mockRunPlanRepo,
      runReportRepository: mockRunReportRepo,
      environmentRepository: mockEnvironmentRepo,
      httpClient: mockHttpClient,
    };

    useCase = new ExecuteRunUseCase(deps);
  });

  describe('status assertions', () => {
    it('should pass status assertion when status matches', async () => {
      mockHttpClient.setDefaultResponse({
        statusCode: 200,
        statusText: 'OK',
        headers: { 'content-type': 'application/json' },
        body: { id: 1, name: 'Fluffy' },
        responseTime: 50,
      });

      const testCase = createMockTestCase({ expectedStatus: 200 });
      const runPlan = createTestRunPlan([testCase]);
      
      mockRunPlanRepo.findById.mockResolvedValue(runPlan);
      mockRunPlanRepo.update.mockImplementation(async (plan) => plan);
      mockEnvironmentRepo.findBySpecId.mockResolvedValue([mockEnvironment]);
      mockRunReportRepo.create.mockResolvedValue(undefined as any);

      const result = await useCase.execute({ runId: runPlan.runId });

      expect(result.summary.passed).toBe(1);
      expect(result.summary.failed).toBe(0);
    });

    it('should fail status assertion when status does not match', async () => {
      mockHttpClient.setDefaultResponse({
        statusCode: 404,
        statusText: 'Not Found',
        headers: {},
        body: { error: 'Pet not found' },
        responseTime: 30,
      });

      const testCase = createMockTestCase({ expectedStatus: 200 });
      const runPlan = createTestRunPlan([testCase]);
      
      mockRunPlanRepo.findById.mockResolvedValue(runPlan);
      mockRunPlanRepo.update.mockImplementation(async (plan) => plan);
      mockEnvironmentRepo.findBySpecId.mockResolvedValue([mockEnvironment]);
      mockRunReportRepo.create.mockResolvedValue(undefined as any);

      const result = await useCase.execute({ runId: runPlan.runId });

      expect(result.summary.passed).toBe(0);
      expect(result.summary.failed).toBe(1);
    });
  });

  describe('custom assertions', () => {
    it('should evaluate header assertions', async () => {
      mockHttpClient.setDefaultResponse({
        statusCode: 200,
        statusText: 'OK',
        headers: { 'content-type': 'application/json', 'x-rate-limit': '100' },
        body: {},
        responseTime: 50,
      });

      const testCase = createMockTestCase({
        assertions: [
          { 
            type: 'header', 
            target: 'x-rate-limit', 
            operator: 'equals', 
            expected: '100', 
            description: 'Rate limit header' 
          },
        ],
      });
      const runPlan = createTestRunPlan([testCase]);
      
      mockRunPlanRepo.findById.mockResolvedValue(runPlan);
      mockRunPlanRepo.update.mockImplementation(async (plan) => plan);
      mockEnvironmentRepo.findBySpecId.mockResolvedValue([mockEnvironment]);
      mockRunReportRepo.create.mockResolvedValue(undefined as any);

      const result = await useCase.execute({ runId: runPlan.runId });

      expect(result.summary.passed).toBe(1);
    });

    it('should evaluate body assertions with JSON path', async () => {
      mockHttpClient.setDefaultResponse({
        statusCode: 200,
        statusText: 'OK',
        headers: {},
        body: { data: { user: { name: 'John', age: 30 } } },
        responseTime: 50,
      });

      const testCase = createMockTestCase({
        assertions: [
          { 
            type: 'body', 
            target: 'data.user.name', 
            operator: 'equals', 
            expected: 'John', 
            description: 'User name' 
          },
        ],
      });
      const runPlan = createTestRunPlan([testCase]);
      
      mockRunPlanRepo.findById.mockResolvedValue(runPlan);
      mockRunPlanRepo.update.mockImplementation(async (plan) => plan);
      mockEnvironmentRepo.findBySpecId.mockResolvedValue([mockEnvironment]);
      mockRunReportRepo.create.mockResolvedValue(undefined as any);

      const result = await useCase.execute({ runId: runPlan.runId });

      expect(result.summary.passed).toBe(1);
    });

    it('should evaluate response time assertions', async () => {
      mockHttpClient.setDefaultResponse({
        statusCode: 200,
        statusText: 'OK',
        headers: {},
        body: {},
        responseTime: 150,
      });

      const testCase = createMockTestCase({
        assertions: [
          { 
            type: 'responseTime', 
            operator: 'lessThan', 
            expected: 200, 
            description: 'Response time under 200ms' 
          },
        ],
      });
      const runPlan = createTestRunPlan([testCase]);
      
      mockRunPlanRepo.findById.mockResolvedValue(runPlan);
      mockRunPlanRepo.update.mockImplementation(async (plan) => plan);
      mockEnvironmentRepo.findBySpecId.mockResolvedValue([mockEnvironment]);
      mockRunReportRepo.create.mockResolvedValue(undefined as any);

      const result = await useCase.execute({ runId: runPlan.runId });

      expect(result.summary.passed).toBe(1);
    });
  });

  describe('request building', () => {
    it('should build URL with path parameters', async () => {
      let capturedUrl = '';
      mockHttpClient.setDefaultResponse({
        statusCode: 200,
        statusText: 'OK',
        headers: {},
        body: {},
        responseTime: 50,
      });

      // Capture the URL by wrapping the mock
      const originalRequest = mockHttpClient.request.bind(mockHttpClient);
      mockHttpClient.request = async (options) => {
        capturedUrl = options.url;
        return originalRequest(options);
      };

      const testCase = createMockTestCase({
        overrides: { pathParams: { petId: '42' } },
      });
      const runPlan = createTestRunPlan([testCase]);
      
      mockRunPlanRepo.findById.mockResolvedValue(runPlan);
      mockRunPlanRepo.update.mockImplementation(async (plan) => plan);
      mockEnvironmentRepo.findBySpecId.mockResolvedValue([mockEnvironment]);
      mockRunReportRepo.create.mockResolvedValue(undefined as any);

      await useCase.execute({ runId: runPlan.runId });

      expect(capturedUrl).toBe('https://api.example.com/pets/42');
    });

    it('should include authorization header when environment has bearer auth', async () => {
      let capturedHeaders: Record<string, string> = {};
      mockHttpClient.setDefaultResponse({
        statusCode: 200,
        statusText: 'OK',
        headers: {},
        body: {},
        responseTime: 50,
      });

      const originalRequest = mockHttpClient.request.bind(mockHttpClient);
      mockHttpClient.request = async (options) => {
        capturedHeaders = options.headers || {};
        return originalRequest(options);
      };

      const envWithAuth = createMockEnvironment({
        authConfig: {
          type: 'bearer',
          token: 'test-token-123',
        },
      });

      const testCase = createMockTestCase();
      const runPlan = createTestRunPlan([testCase]);
      
      mockRunPlanRepo.findById.mockResolvedValue(runPlan);
      mockRunPlanRepo.update.mockImplementation(async (plan) => plan);
      mockEnvironmentRepo.findBySpecId.mockResolvedValue([envWithAuth]);
      mockRunReportRepo.create.mockResolvedValue(undefined as any);

      await useCase.execute({ runId: runPlan.runId });

      expect(capturedHeaders['Authorization']).toBe('Bearer test-token-123');
    });

    it('should include authorization header when environment has basic auth', async () => {
      let capturedHeaders: Record<string, string> = {};
      mockHttpClient.setDefaultResponse({
        statusCode: 200,
        statusText: 'OK',
        headers: {},
        body: {},
        responseTime: 50,
      });

      const originalRequest = mockHttpClient.request.bind(mockHttpClient);
      mockHttpClient.request = async (options) => {
        capturedHeaders = options.headers || {};
        return originalRequest(options);
      };

      const envWithAuth = createMockEnvironment({
        authConfig: {
          type: 'basic',
          username: 'user',
          password: 'pass',
        },
      });

      const testCase = createMockTestCase();
      const runPlan = createTestRunPlan([testCase]);
      
      mockRunPlanRepo.findById.mockResolvedValue(runPlan);
      mockRunPlanRepo.update.mockImplementation(async (plan) => plan);
      mockEnvironmentRepo.findBySpecId.mockResolvedValue([envWithAuth]);
      mockRunReportRepo.create.mockResolvedValue(undefined as any);

      await useCase.execute({ runId: runPlan.runId });

      // Basic auth: base64(user:pass)
      const expectedAuth = 'Basic ' + Buffer.from('user:pass').toString('base64');
      expect(capturedHeaders['Authorization']).toBe(expectedAuth);
    });
  });
});
