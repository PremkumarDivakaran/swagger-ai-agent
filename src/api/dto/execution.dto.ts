/**
 * Execution DTOs
 * Data Transfer Objects for execution API endpoints
 */

/**
 * Selection criteria DTO
 */
export interface SelectionDTO {
  mode: 'single' | 'tag' | 'full';
  operationId?: string;
  tags?: string[];
  exclude?: string[];
}

/**
 * Run configuration DTO
 */
export interface RunConfigDTO {
  parallel?: boolean;
  maxWorkers?: number;
  stopOnFailure?: boolean;
  timeout?: number;
}

/**
 * Create run plan request DTO
 */
export interface CreateRunPlanRequestDTO {
  specId: string;
  envName: string;
  selection: SelectionDTO;
  description?: string;
  config?: RunConfigDTO;
}

/**
 * Create run plan response DTO
 */
export interface CreateRunPlanResponseDTO {
  runId: string;
  specId: string;
  envName: string;
  operationCount: number;
  testCount: number;
  status: string;
  createdAt: string;
}

/**
 * Execute run request DTO
 */
export interface ExecuteRunRequestDTO {
  runId?: string;
  specId?: string;
  envName?: string;
  selection?: SelectionDTO;
}

/**
 * Run summary DTO
 */
export interface RunSummaryDTO {
  total: number;
  passed: number;
  failed: number;
  errors: number;
  skipped: number;
  passRate: number;
  duration: number;
}

/**
 * Execute run response DTO
 */
export interface ExecuteRunResponseDTO {
  runId: string;
  specId: string;
  envName: string;
  status: string;
  summary: RunSummaryDTO;
}

/**
 * Get run status request DTO (path params + query)
 */
export interface GetRunStatusRequestDTO {
  runId: string;
  includeDetails?: boolean;
}

/**
 * Test assertion result DTO
 */
export interface AssertionResultDTO {
  description: string;
  passed: boolean;
  expected?: unknown;
  actual?: unknown;
  error?: string;
}

/**
 * Request details DTO
 */
export interface RequestDetailsDTO {
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: unknown;
  timestamp: string;
}

/**
 * Response details DTO
 */
export interface ResponseDetailsDTO {
  statusCode: number;
  statusText: string;
  headers: Record<string, string>;
  body?: unknown;
  responseTime: number;
  timestamp: string;
}

/**
 * Test case result DTO
 */
export interface TestCaseResultDTO {
  testCaseId: string;
  testCaseName: string;
  operationId: string;
  status: 'passed' | 'failed' | 'error' | 'skipped';
  request?: RequestDetailsDTO;
  response?: ResponseDetailsDTO;
  assertions: AssertionResultDTO[];
  error?: string;
  duration: number;
  retryAttempt: number;
  startedAt: string;
  completedAt: string;
}

/**
 * Full run summary DTO
 */
export interface FullRunSummaryDTO {
  total: number;
  passed: number;
  failed: number;
  errors: number;
  skipped: number;
  passRate: number;
  totalDuration: number;
  avgDuration: number;
}

/**
 * Tag statistics DTO
 */
export interface TagStatsDTO {
  tag: string;
  total: number;
  passed: number;
  failed: number;
  passRate: number;
}

/**
 * Method statistics DTO
 */
export interface MethodStatsDTO {
  method: string;
  total: number;
  passed: number;
  failed: number;
  passRate: number;
}

/**
 * Path statistics DTO
 */
export interface PathStatsDTO {
  path: string;
  method: string;
  total: number;
  passed: number;
  failed: number;
  avgDuration: number;
  passRate: number;
}

/**
 * Get run status response DTO
 */
export interface GetRunStatusResponseDTO {
  runId: string;
  specId: string;
  envName: string;
  status: string;
  operationCount: number;
  testCount: number;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  duration?: number;
  summary?: FullRunSummaryDTO;
  testResults?: TestCaseResultDTO[];
  tagStats?: TagStatsDTO[];
  methodStats?: MethodStatsDTO[];
  pathStats?: PathStatsDTO[];
}

/**
 * Retry failed request DTO
 */
export interface RetryFailedRequestDTO {
  runId: string;
}

/**
 * Retry failed response DTO
 */
export interface RetryFailedResponseDTO {
  newRunId: string;
  originalRunId: string;
  specId: string;
  envName: string;
  status: string;
  summary: RunSummaryDTO;
  retriedTests: number;
}

/**
 * Maps use case output to DTO
 */
export function toCreateRunPlanResponseDTO(output: {
  runId: string;
  specId: string;
  envName: string;
  operationCount: number;
  testCount: number;
  status: string;
  createdAt: Date;
}): CreateRunPlanResponseDTO {
  return {
    runId: output.runId,
    specId: output.specId,
    envName: output.envName,
    operationCount: output.operationCount,
    testCount: output.testCount,
    status: output.status,
    createdAt: output.createdAt.toISOString(),
  };
}

/**
 * Maps use case output to DTO
 */
export function toExecuteRunResponseDTO(output: {
  runId: string;
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
}): ExecuteRunResponseDTO {
  return {
    runId: output.runId,
    specId: output.specId,
    envName: output.envName,
    status: output.status,
    summary: output.summary,
  };
}

/**
 * Maps test case result to DTO
 */
export function toTestCaseResultDTO(result: any): TestCaseResultDTO {
  return {
    testCaseId: result.testCaseId,
    testCaseName: result.testCaseName,
    operationId: result.operationId,
    status: result.status,
    request: result.request ? {
      url: result.request.url,
      method: result.request.method,
      headers: result.request.headers,
      body: result.request.body,
      timestamp: result.request.timestamp.toISOString(),
    } : undefined,
    response: result.response ? {
      statusCode: result.response.statusCode,
      statusText: result.response.statusText,
      headers: result.response.headers,
      body: result.response.body,
      responseTime: result.response.responseTime,
      timestamp: result.response.timestamp.toISOString(),
    } : undefined,
    assertions: result.assertions,
    error: result.error,
    duration: result.duration,
    retryAttempt: result.retryAttempt,
    startedAt: result.startedAt.toISOString(),
    completedAt: result.completedAt.toISOString(),
  };
}

/**
 * Maps use case output to DTO
 */
export function toGetRunStatusResponseDTO(output: {
  runId: string;
  specId: string;
  envName: string;
  status: string;
  operationCount: number;
  testCount: number;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  duration?: number;
  summary?: any;
  testResults?: any[];
  tagStats?: any[];
  methodStats?: any[];
  pathStats?: any[];
}): GetRunStatusResponseDTO {
  return {
    runId: output.runId,
    specId: output.specId,
    envName: output.envName,
    status: output.status,
    operationCount: output.operationCount,
    testCount: output.testCount,
    createdAt: output.createdAt.toISOString(),
    startedAt: output.startedAt?.toISOString(),
    completedAt: output.completedAt?.toISOString(),
    duration: output.duration,
    summary: output.summary,
    testResults: output.testResults?.map(toTestCaseResultDTO),
    tagStats: output.tagStats,
    methodStats: output.methodStats,
    pathStats: output.pathStats,
  };
}

/**
 * Maps use case output to DTO
 */
export function toRetryFailedResponseDTO(output: {
  newRunId: string;
  originalRunId: string;
  specId: string;
  envName: string;
  status: string;
  summary: any;
  retriedTests: number;
}): RetryFailedResponseDTO {
  return {
    newRunId: output.newRunId,
    originalRunId: output.originalRunId,
    specId: output.specId,
    envName: output.envName,
    status: output.status,
    summary: output.summary,
    retriedTests: output.retriedTests,
  };
}
