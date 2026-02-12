/**
 * Test Execution Types
 * Types for running generated tests and viewing reports
 */

export type TestExecutionStatus = 'pending' | 'installing' | 'running' | 'completed' | 'failed';

export interface TestExecutionRequest {
  /** Path to the test suite directory */
  testSuitePath: string;
  /** Test framework (cucumber, jest, maven for REST Assured) */
  framework: 'cucumber' | 'jest' | 'maven';
  /** Additional command arguments */
  args?: string[];
  /** Environment variables */
  env?: Record<string, string>;
}

export interface TestExecutionResponse {
  /** Execution ID */
  executionId: string;
  /** Status */
  status: TestExecutionStatus;
  /** Started at */
  startedAt: string;
  /** Message */
  message?: string;
}

export interface TestExecutionProgress {
  /** Execution ID */
  executionId: string;
  /** Current status */
  status: TestExecutionStatus;
  /** Progress percentage (0-100) */
  progress: number;
  /** Current step */
  currentStep?: string;
  /** Output lines */
  output: string[];
  /** Errors */
  errors: string[];
}

export interface TestResult {
  /** Test name */
  name: string;
  /** Status */
  status: 'passed' | 'failed' | 'skipped' | 'pending';
  /** Duration in ms */
  duration: number;
  /** Error message if failed */
  error?: string;
  /** Steps (for BDD) */
  steps?: TestStep[];
}

export interface TestStep {
  /** Step keyword (Given, When, Then, And, But) */
  keyword: string;
  /** Step text */
  text: string;
  /** Status */
  status: 'passed' | 'failed' | 'skipped' | 'undefined';
  /** Duration in ms */
  duration: number;
  /** Error message if failed */
  error?: string;
}

export interface TestSuite {
  /** Suite name */
  name: string;
  /** Tests in this suite */
  tests: TestResult[];
  /** Total duration in ms */
  duration: number;
}

export interface TestExecutionReport {
  /** Execution ID */
  executionId: string;
  /** Status */
  status: TestExecutionStatus;
  /** Started at */
  startedAt: string;
  /** Completed at */
  completedAt?: string;
  /** Total duration in ms */
  duration: number;
  /** Test suites */
  suites?: TestSuite[];
  /** Summary statistics (API returns results with total, passed, failed, skipped) */
  summary?: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    pending?: number;
  };
  /** Parsed results from backend */
  results?: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
  };
  /** Console output */
  output?: string[];
  /** Errors */
  errors?: string[];
  /** Stdout from test run */
  stdout?: string;
  /** Stderr from test run */
  stderr?: string;
  /** Exit code */
  exitCode?: number;
  /** URL path to Allure report (Maven). Full URL: apiConfig.baseUrl + reportUrl */
  reportUrl?: string;
}

export interface GetExecutionStatusResponse {
  /** Execution data */
  execution: TestExecutionReport;
  /** Whether execution is complete */
  isComplete: boolean;
}


