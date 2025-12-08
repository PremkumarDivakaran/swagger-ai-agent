/**
 * GetRunStatusUseCase tests
 */

import {
  GetRunStatusUseCase,
  GetRunStatusInput,
  GetRunStatusDependencies,
} from '../../../../src/application/execution/get-run-status.usecase';
import { IRunPlanRepository, IRunReportRepository } from '../../../../src/domain/repositories';
import { RunPlan, RunReport, createRunPlan, createRunReport } from '../../../../src/domain/models';

// Mock run plan
const createMockRunPlan = (status: string = 'ready'): RunPlan => createRunPlan({
  runId: 'run-123',
  specId: 'spec-123',
  envName: 'qa',
  status: status as any,
  selection: { mode: 'full' },
  executionItems: [],
  operationCount: 3,
  testCount: 3,
});

// Mock run report
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
        testCaseName: 'Test 1',
        operationId: 'op-1',
        status: 'passed',
        assertions: [],
        duration: 100,
        retryAttempt: 0,
        startedAt,
        completedAt,
      },
      {
        testCaseId: 'test-2',
        testCaseName: 'Test 2',
        operationId: 'op-2',
        status: 'failed',
        assertions: [],
        duration: 150,
        retryAttempt: 0,
        startedAt,
        completedAt,
      },
    ],
    startedAt,
    completedAt,
    tagStats: [
      { tag: 'pets', total: 2, passed: 1, failed: 1, passRate: 50 },
    ],
    methodStats: [
      { method: 'GET', total: 1, passed: 1, failed: 0, passRate: 100 },
      { method: 'POST', total: 1, passed: 0, failed: 1, passRate: 0 },
    ],
    pathStats: [
      { path: '/pets', total: 2, passed: 1, failed: 1, passRate: 50 },
    ],
  });
};

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

describe('GetRunStatusUseCase', () => {
  let useCase: GetRunStatusUseCase;
  let mockRunPlanRepo: jest.Mocked<IRunPlanRepository>;
  let mockRunReportRepo: jest.Mocked<IRunReportRepository>;

  beforeEach(() => {
    mockRunPlanRepo = createMockRunPlanRepository();
    mockRunReportRepo = createMockRunReportRepository();

    useCase = new GetRunStatusUseCase({
      runPlanRepository: mockRunPlanRepo,
      runReportRepository: mockRunReportRepo,
    });
  });

  it('should get status of a ready run plan', async () => {
    const mockPlan = createMockRunPlan('ready');
    mockRunPlanRepo.findById.mockResolvedValue(mockPlan);

    const input: GetRunStatusInput = {
      runId: 'run-123',
    };

    const result = await useCase.execute(input);

    expect(result.runId).toBe('run-123');
    expect(result.specId).toBe('spec-123');
    expect(result.envName).toBe('qa');
    expect(result.status).toBe('ready');
    expect(result.operationCount).toBe(3);
    expect(result.testCount).toBe(3);
    expect(result.summary).toBeUndefined();
  });

  it('should include summary for completed run', async () => {
    const mockPlan = createMockRunPlan('completed');
    mockPlan.startedAt = new Date('2024-01-01T10:00:00Z');
    mockPlan.completedAt = new Date('2024-01-01T10:01:00Z');
    mockRunPlanRepo.findById.mockResolvedValue(mockPlan);

    const mockReport = createMockRunReport();
    mockRunReportRepo.findById.mockResolvedValue(mockReport);

    const input: GetRunStatusInput = {
      runId: 'run-123',
    };

    const result = await useCase.execute(input);

    expect(result.status).toBe('completed');
    expect(result.summary).toBeDefined();
    expect(result.summary?.total).toBe(2);
    expect(result.summary?.passed).toBe(1);
    expect(result.summary?.failed).toBe(1);
    expect(result.summary?.passRate).toBe(50);
  });

  it('should include test results when includeDetails is true', async () => {
    const mockPlan = createMockRunPlan('completed');
    mockPlan.startedAt = new Date('2024-01-01T10:00:00Z');
    mockPlan.completedAt = new Date('2024-01-01T10:01:00Z');
    mockRunPlanRepo.findById.mockResolvedValue(mockPlan);

    const mockReport = createMockRunReport();
    mockRunReportRepo.findById.mockResolvedValue(mockReport);

    const input: GetRunStatusInput = {
      runId: 'run-123',
      includeDetails: true,
    };

    const result = await useCase.execute(input);

    expect(result.testResults).toBeDefined();
    expect(result.testResults).toHaveLength(2);
    expect(result.testResults![0].testCaseId).toBe('test-1');
  });

  it('should not include test results when includeDetails is false', async () => {
    const mockPlan = createMockRunPlan('completed');
    mockRunPlanRepo.findById.mockResolvedValue(mockPlan);

    const mockReport = createMockRunReport();
    mockRunReportRepo.findById.mockResolvedValue(mockReport);

    const input: GetRunStatusInput = {
      runId: 'run-123',
      includeDetails: false,
    };

    const result = await useCase.execute(input);

    expect(result.testResults).toBeUndefined();
  });

  it('should calculate duration for running plan', async () => {
    const mockPlan = createMockRunPlan('running');
    mockPlan.startedAt = new Date(Date.now() - 5000); // Started 5 seconds ago
    mockRunPlanRepo.findById.mockResolvedValue(mockPlan);

    const input: GetRunStatusInput = {
      runId: 'run-123',
    };

    const result = await useCase.execute(input);

    expect(result.status).toBe('running');
    expect(result.duration).toBeGreaterThanOrEqual(5000);
  });

  it('should throw NotFoundError when run does not exist', async () => {
    mockRunPlanRepo.findById.mockResolvedValue(null);

    const input: GetRunStatusInput = {
      runId: 'non-existent',
    };

    await expect(useCase.execute(input)).rejects.toThrow('Run not found');
  });

  it('should include aggregations when includeAggregations is true', async () => {
    const mockPlan = createMockRunPlan('completed');
    mockPlan.startedAt = new Date('2024-01-01T10:00:00Z');
    mockPlan.completedAt = new Date('2024-01-01T10:01:00Z');
    mockRunPlanRepo.findById.mockResolvedValue(mockPlan);

    const mockReport = createMockRunReport();
    mockRunReportRepo.findById.mockResolvedValue(mockReport);

    const input: GetRunStatusInput = {
      runId: 'run-123',
      includeAggregations: true,
    };

    const result = await useCase.execute(input);

    expect(result.tagStats).toBeDefined();
    expect(result.tagStats).toHaveLength(1);
    expect(result.tagStats![0].tag).toBe('pets');

    expect(result.methodStats).toBeDefined();
    expect(result.methodStats).toHaveLength(2);

    expect(result.pathStats).toBeDefined();
    expect(result.pathStats).toHaveLength(1);
    expect(result.pathStats![0].path).toBe('/pets');
  });

  it('should not include aggregations when includeAggregations is false', async () => {
    const mockPlan = createMockRunPlan('completed');
    mockRunPlanRepo.findById.mockResolvedValue(mockPlan);

    const mockReport = createMockRunReport();
    mockRunReportRepo.findById.mockResolvedValue(mockReport);

    const input: GetRunStatusInput = {
      runId: 'run-123',
      includeAggregations: false,
    };

    const result = await useCase.execute(input);

    expect(result.tagStats).toBeUndefined();
    expect(result.methodStats).toBeUndefined();
    expect(result.pathStats).toBeUndefined();
  });

  it('should include both details and aggregations when both requested', async () => {
    const mockPlan = createMockRunPlan('completed');
    mockPlan.startedAt = new Date('2024-01-01T10:00:00Z');
    mockPlan.completedAt = new Date('2024-01-01T10:01:00Z');
    mockRunPlanRepo.findById.mockResolvedValue(mockPlan);

    const mockReport = createMockRunReport();
    mockRunReportRepo.findById.mockResolvedValue(mockReport);

    const input: GetRunStatusInput = {
      runId: 'run-123',
      includeDetails: true,
      includeAggregations: true,
    };

    const result = await useCase.execute(input);

    // Check details
    expect(result.testResults).toBeDefined();
    expect(result.testResults).toHaveLength(2);

    // Check aggregations
    expect(result.tagStats).toBeDefined();
    expect(result.methodStats).toBeDefined();
    expect(result.pathStats).toBeDefined();
  });
});
