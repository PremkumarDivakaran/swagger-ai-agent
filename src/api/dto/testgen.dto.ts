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
 * Generate Axios tests request DTO
 */
export interface GenerateAxiosTestsRequestDto {
  /** Spec ID to generate tests for */
  specId: string;
  /** Operation selection criteria */
  selection?: {
    /** Selection mode */
    mode: 'single' | 'tag' | 'full';
    /** Single operation ID (for 'single' mode) */
    operationId?: string;
    /** Tag names (for 'tag' mode) */
    tags?: string[];
    /** Operation IDs to exclude */
    exclude?: string[];
  };
  /** Test generation options */
  options?: TestGenerationOptionsDto;
}

/**
 * Generated test case DTO
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
 * Generate Axios tests response DTO
 */
export interface GenerateAxiosTestsResponseDto {
  /** Generated test code */
  code: string;
  /** Generated test file name */
  fileName: string;
  /** Spec ID */
  specId: string;
  /** Spec title */
  specTitle: string;
  /** Number of test cases generated */
  testCount: number;
  /** Number of operations covered */
  operationCount: number;
  /** Test cases metadata */
  testCases: GeneratedTestCaseDto[];
  /** Generation timestamp */
  generatedAt: string;
  /** Options used */
  options: TestGenerationOptionsDto;
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
