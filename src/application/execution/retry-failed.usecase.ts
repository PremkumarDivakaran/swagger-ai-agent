/**
 * Retry Failed Use Case
 * Retries only failed or errored tests from a previous run
 */

import {
  IRunPlanRepository,
  IRunReportRepository,
  IEnvironmentRepository,
} from '../../domain/repositories';
import {
  RunPlan,
  RunReport,
  TestCaseResult,
  TestResultWithMetadata,
  RequestDetails,
  ResponseDetails,
  AssertionResult,
  createRunPlan,
  createRunReportWithAggregations,
  getFailedTests,
  buildUrl,
} from '../../domain/models';
import { NotFoundError, ValidationError } from '../../core/errors';
import { generateId } from '../../utils';
import { HttpClient, HttpResponse } from './execute-run.usecase';

/**
 * Input for retrying failed tests
 */
export interface RetryFailedInput {
  runId: string;
}

/**
 * Output from retrying failed tests
 */
export interface RetryFailedOutput {
  newRunId: string;
  originalRunId: string;
  specId: string;
  envName: string;
  status: string;
  summary: {
    total: number;
    passed: number;
    failed: number;
    errors: number;
    skipped: number;
    passRate: number;
    duration: number;
  };
  retriedTests: number;
}

/**
 * Dependencies for RetryFailedUseCase
 */
export interface RetryFailedDependencies {
  runPlanRepository: IRunPlanRepository;
  runReportRepository: IRunReportRepository;
  environmentRepository: IEnvironmentRepository;
  httpClient?: HttpClient;
}

/**
 * Default mock HTTP client for testing
 */
class MockHttpClient implements HttpClient {
  async request(options: any): Promise<HttpResponse> {
    await new Promise(resolve => setTimeout(resolve, 50));
    
    return {
      statusCode: 200,
      statusText: 'OK',
      headers: { 'content-type': 'application/json' },
      body: { message: 'Success', timestamp: new Date().toISOString() },
      responseTime: 50,
    };
  }
}

/**
 * Retries failed or errored tests from a previous run
 */
export class RetryFailedUseCase {
  private httpClient: HttpClient;

  constructor(private readonly deps: RetryFailedDependencies) {
    this.httpClient = deps.httpClient ?? new MockHttpClient();
  }

  /**
   * Execute the use case
   * @param input - Input parameters
   * @returns Retry execution summary
   */
  async execute(input: RetryFailedInput): Promise<RetryFailedOutput> {
    // Get original run report
    const originalReport = await this.deps.runReportRepository.findById(input.runId);
    if (!originalReport) {
      throw new NotFoundError(`Run report not found: ${input.runId}`);
    }

    // Get failed tests
    const failedTests = getFailedTests(originalReport);
    if (failedTests.length === 0) {
      throw new ValidationError('No failed or errored tests to retry');
    }

    // Get original run plan for test case details
    const originalPlan = await this.deps.runPlanRepository.findById(input.runId);
    if (!originalPlan) {
      throw new NotFoundError(`Original run plan not found: ${input.runId}`);
    }

    // Get environment
    const environments = await this.deps.environmentRepository.findBySpecId(originalReport.specId);
    const environment = environments.find(env => env.name === originalReport.envName);
    if (!environment) {
      throw new NotFoundError(`Environment '${originalReport.envName}' not found`);
    }

    // Create new run plan for retry
    const newRunId = generateId();
    const retryExecutionItems = this.extractRetryItems(originalPlan, failedTests);
    
    const retryPlan = createRunPlan({
      runId: newRunId,
      specId: originalReport.specId,
      envName: originalReport.envName,
      envId: originalPlan.envId,
      status: 'running',
      selection: { mode: 'single' },
      executionItems: retryExecutionItems,
      operationCount: retryExecutionItems.length,
      testCount: failedTests.length,
      description: `Retry of failed tests from run ${input.runId}`,
      tags: ['retry'],
    });

    // Save retry plan
    await this.deps.runPlanRepository.create(retryPlan);

    // Execute retry tests
    const startedAt = new Date();
    const testResults: TestResultWithMetadata[] = [];

    for (const failedResult of failedTests) {
      // Find the original test case
      const testCase = this.findTestCase(originalPlan, failedResult.testCaseId);
      const operation = this.findOperation(originalPlan, failedResult.operationId);

      if (testCase && operation) {
        const result = await this.executeTestCase(testCase, operation, environment, failedResult.retryAttempt + 1);
        // Add operation metadata to result for aggregations
        const resultWithMetadata: TestResultWithMetadata = {
          ...result,
          method: operation.method,
          path: operation.path,
          tags: operation.tags,
        };
        testResults.push(resultWithMetadata);
      }
    }

    const completedAt = new Date();

    // Create new run report with aggregations
    const runReport = createRunReportWithAggregations(
      {
        runId: newRunId,
        specId: originalReport.specId,
        envName: originalReport.envName,
        startedAt,
        completedAt,
        environmentDetails: {
          baseUrl: environment.baseUrl,
          headers: environment.defaultHeaders,
        },
      },
      testResults
    );

    // Save report
    await this.deps.runReportRepository.create(runReport);

    // Update plan status
    const success = runReport.summary.failed === 0 && runReport.summary.errors === 0;
    retryPlan.status = success ? 'completed' : 'failed';
    retryPlan.completedAt = completedAt;
    await this.deps.runPlanRepository.update(retryPlan);

    return {
      newRunId,
      originalRunId: input.runId,
      specId: runReport.specId,
      envName: runReport.envName,
      status: success ? 'completed' : 'failed',
      summary: {
        total: runReport.summary.total,
        passed: runReport.summary.passed,
        failed: runReport.summary.failed,
        errors: runReport.summary.errors,
        skipped: runReport.summary.skipped,
        passRate: runReport.summary.passRate,
        duration: runReport.duration,
      },
      retriedTests: failedTests.length,
    };
  }

  /**
   * Extract execution items for failed tests
   */
  private extractRetryItems(plan: RunPlan, failedTests: TestCaseResult[]): any[] {
    const failedTestIds = new Set(failedTests.map(t => t.testCaseId));
    const retryItems: any[] = [];

    for (const item of plan.executionItems) {
      const failedTestCases = item.testCases.filter(tc => failedTestIds.has(tc.id));
      if (failedTestCases.length > 0) {
        retryItems.push({
          ...item,
          id: generateId(),
          testCases: failedTestCases,
        });
      }
    }

    return retryItems;
  }

  /**
   * Find test case by ID
   */
  private findTestCase(plan: RunPlan, testCaseId: string): any | undefined {
    for (const item of plan.executionItems) {
      const testCase = item.testCases.find(tc => tc.id === testCaseId);
      if (testCase) return testCase;
    }
    return undefined;
  }

  /**
   * Find operation by ID
   */
  private findOperation(plan: RunPlan, operationId: string): any | undefined {
    for (const item of plan.executionItems) {
      if (item.operation.operationId === operationId) {
        return item.operation;
      }
    }
    return undefined;
  }

  /**
   * Execute a single test case
   */
  private async executeTestCase(
    testCase: any,
    operation: any,
    environment: any,
    retryAttempt: number
  ): Promise<TestCaseResult> {
    const startedAt = new Date();
    const requestDetails: RequestDetails = {
      url: buildUrl(environment, operation.path),
      method: operation.method,
      headers: { ...environment.defaultHeaders },
      body: testCase.overrides?.body,
      timestamp: startedAt,
    };

    try {
      const response = await this.httpClient.request({
        method: operation.method,
        url: requestDetails.url,
        headers: requestDetails.headers,
        body: requestDetails.body,
        timeout: testCase.timeout ?? 30000,
      });

      const completedAt = new Date();
      const responseDetails: ResponseDetails = {
        statusCode: response.statusCode,
        statusText: response.statusText,
        headers: response.headers,
        body: response.body,
        responseTime: response.responseTime,
        timestamp: completedAt,
      };

      const assertions = this.runAssertions(testCase, response);
      const allPassed = assertions.every(a => a.passed);

      return {
        testCaseId: testCase.id,
        testCaseName: testCase.name,
        operationId: operation.operationId,
        status: allPassed ? 'passed' : 'failed',
        request: requestDetails,
        response: responseDetails,
        assertions,
        duration: completedAt.getTime() - startedAt.getTime(),
        retryAttempt,
        startedAt,
        completedAt,
      };
    } catch (error) {
      const completedAt = new Date();
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      return {
        testCaseId: testCase.id,
        testCaseName: testCase.name,
        operationId: operation.operationId,
        status: 'error',
        request: requestDetails,
        assertions: [],
        error: errorMessage,
        errorStack: error instanceof Error ? error.stack : undefined,
        duration: completedAt.getTime() - startedAt.getTime(),
        retryAttempt,
        startedAt,
        completedAt,
      };
    }
  }

  /**
   * Run assertions for a test case
   */
  private runAssertions(testCase: any, response: HttpResponse): AssertionResult[] {
    const results: AssertionResult[] = [];

    if (testCase.expectedStatus) {
      results.push({
        description: `Status should be ${testCase.expectedStatus}`,
        passed: response.statusCode === testCase.expectedStatus,
        expected: testCase.expectedStatus,
        actual: response.statusCode,
        error: response.statusCode !== testCase.expectedStatus
          ? `Expected status ${testCase.expectedStatus}, got ${response.statusCode}`
          : undefined,
      });
    }

    return results;
  }
}

/**
 * Factory function to create RetryFailedUseCase
 */
export function createRetryFailedUseCase(deps: RetryFailedDependencies): RetryFailedUseCase {
  return new RetryFailedUseCase(deps);
}
