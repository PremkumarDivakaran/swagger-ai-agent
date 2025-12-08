/**
 * MCP DTOs
 * Data Transfer Objects for MCP-related endpoints
 */

/**
 * List operations request DTO
 */
export interface McpListOperationsRequestDto {
  /** Spec ID */
  specId: string;
  /** Optional filter by tags */
  tags?: string[];
  /** Optional filter by HTTP method */
  method?: string;
}

/**
 * Operation summary DTO for MCP
 */
export interface McpOperationDto {
  operationId: string;
  method: string;
  path: string;
  summary?: string;
  tags: string[];
  hasRequestBody: boolean;
  requiresAuth: boolean;
}

/**
 * List operations response DTO
 */
export interface McpListOperationsResponseDto {
  specId: string;
  specTitle: string;
  totalOperations: number;
  operations: McpOperationDto[];
}

/**
 * Plan run request DTO
 */
export interface McpPlanRunRequestDto {
  /** Spec ID */
  specId: string;
  /** Environment name */
  envName: string;
  /** Selection criteria */
  selection: {
    mode: 'single' | 'tag' | 'full';
    operationId?: string;
    tags?: string[];
    exclude?: string[];
  };
}

/**
 * Plan run response DTO
 */
export interface McpPlanRunResponseDto {
  runId: string;
  specId: string;
  envName: string;
  status: string;
  operationCount: number;
  testCount: number;
  summary: {
    operations: Array<{
      operationId: string;
      method: string;
      path: string;
      testCaseCount: number;
    }>;
  };
}

/**
 * Execute operation request DTO
 */
export interface McpExecuteOperationRequestDto {
  /** Spec ID */
  specId: string;
  /** Environment name */
  envName: string;
  /** Operation ID */
  operationId: string;
  /** Request overrides */
  overrides?: {
    pathParams?: Record<string, string>;
    query?: Record<string, string | number | boolean>;
    headers?: Record<string, string>;
    body?: unknown;
  };
}

/**
 * Execute operation response DTO
 */
export interface McpExecuteOperationResponseDto {
  success: boolean;
  operationId: string;
  request: {
    url: string;
    method: string;
    headers: Record<string, string>;
    body?: unknown;
  };
  response: {
    status: number;
    statusText: string;
    headers: Record<string, string>;
    body?: unknown;
    duration: number;
  };
  error?: string;
}

/**
 * Generate tests request DTO
 */
export interface McpGenerateTestsRequestDto {
  /** Spec ID */
  specId: string;
  /** Selection criteria */
  selection?: {
    mode: 'single' | 'tag' | 'full';
    operationId?: string;
    tags?: string[];
    exclude?: string[];
  };
  /** Test generation options */
  options?: {
    includeNegativeTests?: boolean;
    includeAuthTests?: boolean;
    includeBoundaryTests?: boolean;
    groupByTag?: boolean;
    includeSetup?: boolean;
    baseUrlVariable?: string;
    envName?: string;
  };
}

/**
 * Test case summary DTO
 */
export interface McpTestCaseDto {
  name: string;
  type: string;
  operationId: string;
  method: string;
  path: string;
  expectedStatus: number;
}

/**
 * Generate tests response DTO
 */
export interface McpGenerateTestsResponseDto {
  code: string;
  fileName: string;
  specId: string;
  specTitle: string;
  testCount: number;
  operationCount: number;
  testCases: McpTestCaseDto[];
}
