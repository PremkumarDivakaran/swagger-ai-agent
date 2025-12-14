/**
 * Execution Types
 */

export type RunStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
export type TestStatus = 'pending' | 'running' | 'passed' | 'failed' | 'skipped';

// Selection criteria matching backend API
export interface SelectionCriteria {
  mode: 'single' | 'tag' | 'full';
  operationId?: string;
  tags?: string[];
  exclude?: string[];
}

export interface RunConfig {
  parallel?: boolean;
  maxWorkers?: number;
  timeout?: number;
  stopOnFailure?: boolean;
}

export interface CreateRunPlanRequest {
  specId: string;
  envName: string;
  selection: SelectionCriteria;
  description?: string;
  config?: RunConfig;
}

export interface TestItem {
  operationId: string;
  method: string;
  path: string;
  summary?: string;
}

export interface CreateRunPlanResponse {
  runId: string;
  specId: string;
  envName: string;
  description?: string;
  operationCount: number;
  testCount: number;
  status: string;
  createdAt: string;
}

export interface ExecuteRunRequest {
  runId?: string;
  specId?: string;
  envName?: string;
  selection?: SelectionCriteria;
}

export interface ExecuteRunResponse {
  runId: string;
  status: RunStatus;
  startedAt: string;
  message: string;
}

export interface TestResult {
  testCaseId: string;
  testCaseName: string;
  operationId: string;
  status: TestStatus;
  duration?: number;
  skipReason?: string;
  retryAttempt?: number;
  startedAt?: string;
  completedAt?: string;
  request?: {
    url: string;
    method: string;
    headers?: Record<string, string>;
    body?: unknown;
    timestamp?: string;
  };
  response?: {
    statusCode: number;
    statusText: string;
    headers?: Record<string, string>;
    body?: unknown;
    responseTime?: number;
    timestamp?: string;
  };
  assertions?: Array<{
    description: string;
    passed: boolean;
    expected?: unknown;
    actual?: unknown;
    error?: string;
  }>;
  error?: {
    message: string;
    stack?: string;
  };
}

export interface Aggregations {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  errors?: number;
  passRate: number;
  avgDuration: number;
  totalDuration: number;
}

export interface GetRunStatusResponse {
  runId: string;
  specId: string;
  envName: string;
  description?: string;
  status: RunStatus;
  operationCount?: number;
  testCount?: number;
  duration?: number;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  // Backend uses testResults, not details
  testResults?: TestResult[];
  // Backend uses summary, not aggregations
  summary?: Aggregations;
  // Progress is computed from summary
  progress?: {
    completed: number;
    total: number;
    percentage: number;
  };
  // Stats
  tagStats?: Array<{ tag: string; total: number; passed: number; failed: number; skipped: number }>;
  methodStats?: Array<{ method: string; total: number; passed: number; failed: number; skipped: number }>;
  pathStats?: Array<{ path: string; total: number; passed: number; failed: number; skipped: number }>;
}

export interface RetryFailedRequest {
  runId: string;
}

export interface RetryFailedResponse {
  newRunId: string;
  originalRunId: string;
  testsToRetry: number;
  status: RunStatus;
  message: string;
}
