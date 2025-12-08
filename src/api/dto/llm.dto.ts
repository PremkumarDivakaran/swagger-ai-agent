/**
 * LLM DTOs
 * Data Transfer Objects for LLM-assisted payload generation endpoints
 */

import { PayloadGenerationHints, GeneratedPayload } from '../../infrastructure/llm';

/**
 * Build payload request DTO
 */
export interface BuildPayloadRequestDto {
  /** Spec ID */
  specId: string;
  /** Operation ID within the spec */
  operationId: string;
  /** Optional hints for payload generation */
  hints?: PayloadGenerationHintsDto;
}

/**
 * Payload generation hints DTO
 */
export interface PayloadGenerationHintsDto {
  /** Locale for generated data (e.g., 'en-US', 'de-DE') */
  locale?: string;
  /** Domain context (e.g., 'e-commerce', 'healthcare') */
  domain?: string;
  /** Additional context or instructions */
  context?: string;
  /** Example values to guide generation */
  examples?: Record<string, unknown>;
}

/**
 * Generated payload DTO
 */
export interface GeneratedPayloadDto {
  /** The generated payload object */
  payload: Record<string, unknown>;
  /** Explanation of how the payload was generated */
  explanation?: string;
  /** Confidence score (0-1) */
  confidence: number;
}

/**
 * Build payload response DTO
 */
export interface BuildPayloadResponseDto {
  /** Spec ID */
  specId: string;
  /** Spec title */
  specTitle: string;
  /** Operation ID */
  operationId: string;
  /** Operation path */
  operationPath: string;
  /** HTTP method */
  operationMethod: string;
  /** Generated payload */
  payload: GeneratedPayloadDto;
  /** Generation timestamp */
  generatedAt: string;
}

/**
 * Build payload variants request DTO
 */
export interface BuildPayloadVariantsRequestDto {
  /** Spec ID */
  specId: string;
  /** Operation ID within the spec */
  operationId: string;
  /** Number of variants to generate (1-10) */
  count: number;
  /** Optional hints for payload generation */
  hints?: PayloadGenerationHintsDto;
}

/**
 * Build payload variants response DTO
 */
export interface BuildPayloadVariantsResponseDto {
  /** Spec ID */
  specId: string;
  /** Spec title */
  specTitle: string;
  /** Operation ID */
  operationId: string;
  /** Operation path */
  operationPath: string;
  /** HTTP method */
  operationMethod: string;
  /** Generated payload variants */
  payloads: GeneratedPayloadDto[];
  /** Actual number of variants generated */
  count: number;
  /** Generation timestamp */
  generatedAt: string;
}

/**
 * Suggest scenarios request DTO
 */
export interface SuggestScenariosRequestDto {
  /** Spec ID */
  specId: string;
  /** Operation ID within the spec */
  operationId: string;
}

/**
 * Test scenario DTO
 * Simple scenario description from LLM
 */
export interface TestScenarioDto {
  /** Scenario description */
  description: string;
}

/**
 * Suggest scenarios response DTO
 */
export interface SuggestScenariosResponseDto {
  /** Spec ID */
  specId: string;
  /** Spec title */
  specTitle: string;
  /** Operation ID */
  operationId: string;
  /** Operation path */
  operationPath: string;
  /** HTTP method */
  operationMethod: string;
  /** Suggested test scenarios */
  scenarios: TestScenarioDto[];
  /** Generation timestamp */
  generatedAt: string;
}

/**
 * List operations request params
 */
export interface ListOperationsParamsDto {
  /** Spec ID */
  specId: string;
}

/**
 * Operation summary DTO
 */
export interface OperationSummaryDto {
  /** Operation ID */
  operationId: string;
  /** HTTP method */
  method: string;
  /** API path */
  path: string;
  /** Operation summary */
  summary?: string;
  /** Whether operation has a request body */
  hasRequestBody: boolean;
}

/**
 * List operations response DTO
 */
export interface ListOperationsResponseDto {
  /** Spec ID */
  specId: string;
  /** Spec title */
  specTitle: string;
  /** List of operations */
  operations: OperationSummaryDto[];
}

/**
 * LLM provider status DTO
 */
export interface LlmProviderStatusDto {
  /** Provider name */
  provider: string;
  /** Whether provider is available */
  available: boolean;
  /** Available models */
  models?: string[];
  /** Error message if not available */
  error?: string;
}
