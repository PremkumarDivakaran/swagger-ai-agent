/**
 * RunReport domain model
 * Represents the results of an executed run
 * 
 * This is a pure domain model with NO infrastructure dependencies
 */

import { HttpMethod } from './Operation';

/**
 * Individual test result status
 */
export type TestResultStatus = 'passed' | 'failed' | 'error' | 'skipped';

/**
 * HTTP request details (for logging)
 */
export interface RequestDetails {
  /** Full URL */
  url: string;
  /** HTTP method */
  method: HttpMethod;
  /** Request headers */
  headers: Record<string, string>;
  /** Request body (if any) */
  body?: unknown;
  /** Timestamp when request was sent */
  timestamp: Date;
}

/**
 * HTTP response details (for logging)
 */
export interface ResponseDetails {
  /** HTTP status code */
  statusCode: number;
  /** Status text */
  statusText: string;
  /** Response headers */
  headers: Record<string, string>;
  /** Response body */
  body?: unknown;
  /** Response time in milliseconds */
  responseTime: number;
  /** Timestamp when response was received */
  timestamp: Date;
}

/**
 * Assertion result
 */
export interface AssertionResult {
  /** Assertion description */
  description: string;
  /** Whether assertion passed */
  passed: boolean;
  /** Expected value */
  expected?: unknown;
  /** Actual value */
  actual?: unknown;
  /** Error message if failed */
  error?: string;
}

/**
 * Individual test case result
 */
export interface TestCaseResult {
  /** Test case ID */
  testCaseId: string;
  /** Test case name */
  testCaseName: string;
  /** Operation ID */
  operationId: string;
  /** Result status */
  status: TestResultStatus;
  /** Request details */
  request?: RequestDetails;
  /** Response details */
  response?: ResponseDetails;
  /** Assertion results */
  assertions: AssertionResult[];
  /** Error message (for 'error' status) */
  error?: string;
  /** Error stack trace */
  errorStack?: string;
  /** Execution duration in milliseconds */
  duration: number;
  /** Retry attempt number (0 = first attempt) */
  retryAttempt: number;
  /** When this test started */
  startedAt: Date;
  /** When this test completed */
  completedAt: Date;
}

/**
 * Summary statistics
 */
export interface RunSummary {
  /** Total number of tests */
  total: number;
  /** Number of passed tests */
  passed: number;
  /** Number of failed tests */
  failed: number;
  /** Number of error tests */
  errors: number;
  /** Number of skipped tests */
  skipped: number;
  /** Pass rate percentage */
  passRate: number;
  /** Total execution time in milliseconds */
  totalDuration: number;
  /** Average test duration */
  avgDuration: number;
}

/**
 * Statistics by tag
 */
export interface TagStats {
  /** Tag name */
  tag: string;
  /** Total tests with this tag */
  total: number;
  /** Passed tests */
  passed: number;
  /** Failed tests */
  failed: number;
  /** Pass rate */
  passRate: number;
}

/**
 * Statistics by method
 */
export interface MethodStats {
  /** HTTP method */
  method: HttpMethod;
  /** Total tests for this method */
  total: number;
  /** Passed tests */
  passed: number;
  /** Failed tests */
  failed: number;
  /** Pass rate */
  passRate: number;
}

/**
 * Statistics by path
 */
export interface PathStats {
  /** API path */
  path: string;
  /** Total tests for this path */
  total: number;
  /** Passed tests */
  passed: number;
  /** Failed tests */
  failed: number;
  /** Pass rate */
  passRate: number;
}

/**
 * RunReport domain model
 * Represents complete results of an execution
 */
export interface RunReport {
  /** Run ID (matches RunPlan.runId) */
  runId: string;
  
  /** Spec ID */
  specId: string;
  
  /** Environment name used */
  envName: string;
  
  /** Summary statistics */
  summary: RunSummary;
  
  /** Individual test results */
  testResults: TestCaseResult[];
  
  /** Statistics by tag */
  tagStats: TagStats[];
  
  /** Statistics by HTTP method */
  methodStats: MethodStats[];
  
  /** Statistics by path */
  pathStats: PathStats[];
  
  /** When the run started */
  startedAt: Date;
  
  /** When the run completed */
  completedAt: Date;
  
  /** Total execution duration */
  duration: number;
  
  /** Environment details used */
  environmentDetails?: {
    baseUrl: string;
    headers: Record<string, string>;
  };
  
  /** Any run-level errors */
  runErrors?: string[];
}

/**
 * Creates a new RunReport
 * @param partial - Partial report data
 * @returns Complete RunReport object
 */
export function createRunReport(
  partial: Partial<RunReport> & { 
    runId: string; 
    specId: string; 
    envName: string;
    testResults: TestCaseResult[];
    startedAt: Date;
    completedAt: Date;
  }
): RunReport {
  const summary = calculateSummary(partial.testResults);
  
  return {
    runId: partial.runId,
    specId: partial.specId,
    envName: partial.envName,
    summary,
    testResults: partial.testResults,
    tagStats: partial.tagStats ?? [],
    methodStats: partial.methodStats ?? [],
    pathStats: partial.pathStats ?? [],
    startedAt: partial.startedAt,
    completedAt: partial.completedAt,
    duration: partial.completedAt.getTime() - partial.startedAt.getTime(),
    environmentDetails: partial.environmentDetails,
    runErrors: partial.runErrors,
  };
}

/**
 * Calculates summary statistics from test results
 * @param results - Array of test case results
 * @returns Summary statistics
 */
export function calculateSummary(results: TestCaseResult[]): RunSummary {
  const total = results.length;
  const passed = results.filter(r => r.status === 'passed').length;
  const failed = results.filter(r => r.status === 'failed').length;
  const errors = results.filter(r => r.status === 'error').length;
  const skipped = results.filter(r => r.status === 'skipped').length;
  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);
  
  return {
    total,
    passed,
    failed,
    errors,
    skipped,
    passRate: total > 0 ? (passed / total) * 100 : 0,
    totalDuration,
    avgDuration: total > 0 ? totalDuration / total : 0,
  };
}

/**
 * Gets failed test results
 * @param report - RunReport to analyze
 * @returns Array of failed test results
 */
export function getFailedTests(report: RunReport): TestCaseResult[] {
  return report.testResults.filter(r => r.status === 'failed' || r.status === 'error');
}

/**
 * Gets test results by operation
 * @param report - RunReport to analyze
 * @param operationId - Operation ID
 * @returns Test results for the operation
 */
export function getResultsByOperation(report: RunReport, operationId: string): TestCaseResult[] {
  return report.testResults.filter(r => r.operationId === operationId);
}

/**
 * Checks if run was successful (all tests passed)
 * @param report - RunReport to check
 * @returns true if all tests passed
 */
export function isSuccessful(report: RunReport): boolean {
  return report.summary.failed === 0 && report.summary.errors === 0;
}

/**
 * Creates a test case result for a passed test
 * @param testCaseId - Test case ID
 * @param testCaseName - Test case name
 * @param operationId - Operation ID
 * @param request - Request details
 * @param response - Response details
 * @param assertions - Assertion results
 * @returns TestCaseResult for passed test
 */
export function createPassedResult(
  testCaseId: string,
  testCaseName: string,
  operationId: string,
  request: RequestDetails,
  response: ResponseDetails,
  assertions: AssertionResult[]
): TestCaseResult {
  const now = new Date();
  return {
    testCaseId,
    testCaseName,
    operationId,
    status: 'passed',
    request,
    response,
    assertions,
    duration: response.responseTime,
    retryAttempt: 0,
    startedAt: request.timestamp,
    completedAt: now,
  };
}

/**
 * Creates a test case result for a failed test
 * @param testCaseId - Test case ID
 * @param testCaseName - Test case name
 * @param operationId - Operation ID
 * @param request - Request details
 * @param response - Response details
 * @param assertions - Assertion results
 * @returns TestCaseResult for failed test
 */
export function createFailedResult(
  testCaseId: string,
  testCaseName: string,
  operationId: string,
  request: RequestDetails,
  response: ResponseDetails,
  assertions: AssertionResult[]
): TestCaseResult {
  const now = new Date();
  return {
    testCaseId,
    testCaseName,
    operationId,
    status: 'failed',
    request,
    response,
    assertions,
    duration: response.responseTime,
    retryAttempt: 0,
    startedAt: request.timestamp,
    completedAt: now,
  };
}

/**
 * Creates a test case result for an error
 * @param testCaseId - Test case ID
 * @param testCaseName - Test case name
 * @param operationId - Operation ID
 * @param error - Error message
 * @param errorStack - Error stack trace
 * @returns TestCaseResult for error
 */
export function createErrorResult(
  testCaseId: string,
  testCaseName: string,
  operationId: string,
  error: string,
  errorStack?: string
): TestCaseResult {
  const now = new Date();
  return {
    testCaseId,
    testCaseName,
    operationId,
    status: 'error',
    assertions: [],
    error,
    errorStack,
    duration: 0,
    retryAttempt: 0,
    startedAt: now,
    completedAt: now,
  };
}

/**
 * Result with operation metadata for aggregation
 */
export interface TestResultWithMetadata extends TestCaseResult {
  /** HTTP method from operation */
  method?: HttpMethod;
  /** Path from operation */
  path?: string;
  /** Tags from operation */
  tags?: string[];
}

/**
 * Calculates statistics by tag from test results
 * @param results - Test results with metadata
 * @returns Array of tag statistics
 */
export function calculateTagStats(results: TestResultWithMetadata[]): TagStats[] {
  const tagMap = new Map<string, { total: number; passed: number; failed: number }>();

  for (const result of results) {
    const tags = result.tags ?? [];
    for (const tag of tags) {
      const existing = tagMap.get(tag) ?? { total: 0, passed: 0, failed: 0 };
      existing.total++;
      if (result.status === 'passed') existing.passed++;
      if (result.status === 'failed' || result.status === 'error') existing.failed++;
      tagMap.set(tag, existing);
    }
  }

  return Array.from(tagMap.entries()).map(([tag, stats]) => ({
    tag,
    total: stats.total,
    passed: stats.passed,
    failed: stats.failed,
    passRate: stats.total > 0 ? (stats.passed / stats.total) * 100 : 0,
  }));
}

/**
 * Calculates statistics by HTTP method from test results
 * @param results - Test results with metadata
 * @returns Array of method statistics
 */
export function calculateMethodStats(results: TestResultWithMetadata[]): MethodStats[] {
  const methodMap = new Map<HttpMethod, { total: number; passed: number; failed: number }>();

  for (const result of results) {
    const method = result.method;
    if (!method) continue;
    
    const existing = methodMap.get(method) ?? { total: 0, passed: 0, failed: 0 };
    existing.total++;
    if (result.status === 'passed') existing.passed++;
    if (result.status === 'failed' || result.status === 'error') existing.failed++;
    methodMap.set(method, existing);
  }

  return Array.from(methodMap.entries()).map(([method, stats]) => ({
    method,
    total: stats.total,
    passed: stats.passed,
    failed: stats.failed,
    passRate: stats.total > 0 ? (stats.passed / stats.total) * 100 : 0,
  }));
}

/**
 * Calculates statistics by path from test results
 * @param results - Test results with metadata
 * @returns Array of path statistics
 */
export function calculatePathStats(results: TestResultWithMetadata[]): PathStats[] {
  const pathMap = new Map<string, { total: number; passed: number; failed: number }>();

  for (const result of results) {
    const path = result.path;
    if (!path) continue;
    
    const existing = pathMap.get(path) ?? { total: 0, passed: 0, failed: 0 };
    existing.total++;
    if (result.status === 'passed') existing.passed++;
    if (result.status === 'failed' || result.status === 'error') existing.failed++;
    pathMap.set(path, existing);
  }

  return Array.from(pathMap.entries()).map(([path, stats]) => ({
    path,
    total: stats.total,
    passed: stats.passed,
    failed: stats.failed,
    passRate: stats.total > 0 ? (stats.passed / stats.total) * 100 : 0,
  }));
}

/**
 * Creates a RunReport with calculated aggregations
 * @param partial - Partial report data
 * @param resultsWithMetadata - Test results with operation metadata
 * @returns Complete RunReport with aggregations
 */
export function createRunReportWithAggregations(
  partial: Partial<RunReport> & { 
    runId: string; 
    specId: string; 
    envName: string;
    startedAt: Date;
    completedAt: Date;
  },
  resultsWithMetadata: TestResultWithMetadata[]
): RunReport {
  const testResults = resultsWithMetadata.map(r => {
    // Strip metadata fields to get base TestCaseResult
    const { method, path, tags, ...baseResult } = r;
    return baseResult as TestCaseResult;
  });

  const summary = calculateSummary(testResults);
  const tagStats = calculateTagStats(resultsWithMetadata);
  const methodStats = calculateMethodStats(resultsWithMetadata);
  const pathStats = calculatePathStats(resultsWithMetadata);
  
  return {
    runId: partial.runId,
    specId: partial.specId,
    envName: partial.envName,
    summary,
    testResults,
    tagStats,
    methodStats,
    pathStats,
    startedAt: partial.startedAt,
    completedAt: partial.completedAt,
    duration: partial.completedAt.getTime() - partial.startedAt.getTime(),
    environmentDetails: partial.environmentDetails,
    runErrors: partial.runErrors,
  };
}
