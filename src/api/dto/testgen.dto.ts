/**
 * Test Generation DTOs
 * Data Transfer Objects for test generation endpoints
 */

import { OperationSelection } from '../../domain/models/RunPlan';
import { TestCaseType, HttpMethod } from '../../domain/models';

/**
 * Test generation options DTO
 */
export interface TestGenerationOptionsDto {
  /** Include negative test cases */
  includeNegativeTests?: boolean;
  /** Include auth error tests */
  includeAuthTests?: boolean;
  /** Include boundary value tests */
  includeBoundaryTests?: boolean;
  /** Group tests by tag instead of path */
  groupByTag?: boolean;
  /** Include setup/teardown blocks */
  includeSetup?: boolean;
  /** Base URL variable name */
  baseUrlVariable?: string;
  /** Environment name for the tests */
  envName?: string;
}

/**
 * Generated test case DTO (for preview response)
 */
export interface GeneratedTestCaseDto {
  /** Test case ID */
  id: string;
  /** Test case name */
  name: string;
  /** Test case type */
  type: TestCaseType;
  /** Operation ID */
  operationId: string;
  /** HTTP method */
  method: HttpMethod;
  /** API path */
  path: string;
  /** Expected status code */
  expectedStatus: number;
  /** Test case description */
  description?: string;
}

/**
 * Test preview request DTO
 */
export interface TestPreviewRequestDto {
  /** Spec ID to preview tests for */
  specId: string;
  /** Maximum number of operations to include in preview */
  maxOperations?: number;
}

/**
 * Test preview response DTO
 */
export interface TestPreviewResponseDto {
  /** Preview code snippet */
  previewCode: string;
  /** Estimated total test count */
  estimatedTestCount: number;
  /** Estimated operations count */
  estimatedOperationCount: number;
  /** Tags available for selection */
  availableTags: string[];
  /** Sample test cases */
  sampleTestCases: GeneratedTestCaseDto[];
}

/**
 * Export test suite request DTO
 */
export interface ExportTestSuiteRequestDto {
  /** Spec ID to export tests for */
  specId: string;
  /** Selection criteria */
  selection?: {
    mode: 'single' | 'tag' | 'full';
    operationId?: string;
    operationIds?: string[];
    tags?: string[];
    exclude?: string[];
  };
  /** Export options */
  exportOptions?: {
    /** Export format */
    format?: 'single-file' | 'multi-file' | 'zip';
    /** Include package.json */
    includePackageJson?: boolean;
    /** Include Jest configuration */
    includeJestConfig?: boolean;
    /** Include README */
    includeReadme?: boolean;
  };
  /** Test generation options */
  testOptions?: TestGenerationOptionsDto;
}

/**
 * Exported file DTO
 */
export interface ExportedFileDto {
  /** File name */
  name: string;
  /** File content */
  content: string;
  /** MIME type */
  mimeType: string;
}

/**
 * Export test suite response DTO
 */
export interface ExportTestSuiteResponseDto {
  /** Export format used */
  format: 'single-file' | 'multi-file' | 'zip';
  /** Exported files */
  files: ExportedFileDto[];
  /** Total size in bytes */
  totalSize: number;
  /** Export timestamp */
  exportedAt: string;
}

/**
 * Execute tests request DTO
 */
export interface ExecuteTestsRequestDto {
  testSuitePath: string;
  framework: 'cucumber' | 'jest' | 'maven';
  args?: string[];
  env?: Record<string, string>;
}

/**
 * Execute tests response DTO
 */
export interface ExecuteTestsResponseDto {
  executionId: string;
  status: 'pending' | 'installing' | 'running' | 'completed' | 'failed';
  startedAt: string;
  message?: string;
}

/**
 * Test execution status response DTO
 */
export interface TestExecutionStatusDto {
  executionId: string;
  status: 'pending' | 'installing' | 'running' | 'completed' | 'failed';
  startedAt: string;
  completedAt?: string;
  duration: number;
  exitCode: number;
  stdout: string;
  stderr: string;
  results?: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
  };
  /** URL path to Allure report (when Maven + report generated). Frontend: baseUrl + reportUrl */
  reportUrl?: string;
}

// ──────────────────────────────────────────────
//  AI REST Assured DTOs
// ──────────────────────────────────────────────

/**
 * Start an AI Agent run request
 */
export interface AgentRunRequestDto {
  specId: string;
  maxIterations?: number;
  baseDirectory?: string;
  basePackage?: string;
  autoExecute?: boolean;
}

/**
 * Agent run response (returned immediately when run starts)
 */
export interface AgentRunResponseDto {
  runId: string;
  status: string;
  message: string;
}

/**
 * Agent run status response (returned when polling)
 */
export interface AgentRunStatusDto {
  runId: string;
  phase: string;
  currentIteration: number;
  maxIterations: number;
  testSuitePath?: string;
  log: { timestamp: string; phase: string; message: string }[];
  iterations: {
    iteration: number;
    passed: number;
    failed: number;
    total: number;
    fixesApplied: number;
  }[];
  finalResult?: {
    success: boolean;
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    durationMs: number;
  };
  testPlan?: {
    title: string;
    reasoning: string;
    itemCount: number;
    dependencyCount: number;
  };
  error?: string;
  startedAt: string;
  completedAt?: string;
}
