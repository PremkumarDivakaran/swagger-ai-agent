/**
 * Operation domain model
 * Represents a single API operation from a Swagger/OpenAPI spec
 * 
 * This is a pure domain model with NO infrastructure dependencies
 */

/**
 * HTTP methods supported by OpenAPI
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS' | 'TRACE';

/**
 * Parameter location in the request
 */
export type ParameterIn = 'path' | 'query' | 'header' | 'cookie';

/**
 * Operation parameter
 */
export interface OperationParameter {
  /** Parameter name */
  name: string;
  /** Where the parameter is located */
  in: ParameterIn;
  /** Whether the parameter is required */
  required: boolean;
  /** Parameter description */
  description?: string;
  /** JSON Schema for the parameter */
  schema?: Record<string, unknown>;
  /** Example value */
  example?: unknown;
  /** Whether to allow empty value */
  allowEmptyValue?: boolean;
  /** Deprecated flag */
  deprecated?: boolean;
}

/**
 * Request body definition
 */
export interface OperationRequestBody {
  /** Whether the request body is required */
  required: boolean;
  /** Description of the request body */
  description?: string;
  /** Content types and their schemas */
  content: Record<string, {
    schema?: Record<string, unknown>;
    example?: unknown;
    examples?: Record<string, { value: unknown; summary?: string }>;
  }>;
}

/**
 * Response definition
 */
export interface OperationResponse {
  /** HTTP status code (as string, e.g., '200', '4XX', 'default') */
  statusCode: string;
  /** Response description */
  description: string;
  /** Content types and their schemas */
  content?: Record<string, {
    schema?: Record<string, unknown>;
    example?: unknown;
    examples?: Record<string, { value: unknown; summary?: string }>;
  }>;
  /** Response headers */
  headers?: Record<string, {
    description?: string;
    schema?: Record<string, unknown>;
  }>;
}

/**
 * Security requirement for an operation
 */
export interface SecurityRequirement {
  /** Security scheme name */
  schemeName: string;
  /** Required scopes (for OAuth2) */
  scopes: string[];
}

/**
 * Operation domain model
 * Represents a complete API operation
 */
export interface Operation {
  /** Unique operation identifier (method_path format, e.g., 'GET_/users/{id}') */
  operationId: string;
  
  /** Original operationId from spec (if different) */
  originalOperationId?: string;
  
  /** HTTP method */
  method: HttpMethod;
  
  /** API path (with path parameters, e.g., '/users/{id}') */
  path: string;
  
  /** Operation summary (short description) */
  summary?: string;
  
  /** Operation description (detailed) */
  description?: string;
  
  /** Tags for categorization */
  tags: string[];
  
  /** Operation parameters (path, query, header, cookie) */
  parameters: OperationParameter[];
  
  /** Request body definition */
  requestBody?: OperationRequestBody;
  
  /** Response definitions by status code */
  responses: OperationResponse[];
  
  /** Security requirements */
  security: SecurityRequirement[];
  
  /** Whether the operation is deprecated */
  deprecated: boolean;
  
  /** External documentation URL */
  externalDocs?: {
    url: string;
    description?: string;
  };
  
  /** Server overrides for this operation */
  servers?: {
    url: string;
    description?: string;
  }[];
}

/**
 * Creates a new Operation with default values
 * @param partial - Partial operation data
 * @returns Complete Operation object
 */
export function createOperation(
  partial: Partial<Operation> & { operationId: string; method: HttpMethod; path: string }
): Operation {
  return {
    operationId: partial.operationId,
    originalOperationId: partial.originalOperationId,
    method: partial.method,
    path: partial.path,
    summary: partial.summary,
    description: partial.description,
    tags: partial.tags ?? [],
    parameters: partial.parameters ?? [],
    requestBody: partial.requestBody,
    responses: partial.responses ?? [],
    security: partial.security ?? [],
    deprecated: partial.deprecated ?? false,
    externalDocs: partial.externalDocs,
    servers: partial.servers,
  };
}

/**
 * Generates a unique operation ID from method and path
 * @param method - HTTP method
 * @param path - API path
 * @returns Generated operation ID
 */
export function generateOperationId(method: HttpMethod, path: string): string {
  return `${method}_${path}`;
}

/**
 * Checks if operation has a request body
 * @param operation - Operation to check
 * @returns true if operation has request body
 */
export function hasRequestBody(operation: Operation): boolean {
  return operation.requestBody !== undefined;
}

/**
 * Checks if operation requires authentication
 * @param operation - Operation to check
 * @returns true if operation has security requirements
 */
export function requiresAuth(operation: Operation): boolean {
  return operation.security.length > 0;
}

/**
 * Gets required parameters for an operation
 * @param operation - Operation to check
 * @returns Array of required parameters
 */
export function getRequiredParameters(operation: Operation): OperationParameter[] {
  return operation.parameters.filter(p => p.required);
}

/**
 * Gets parameters by location
 * @param operation - Operation to check
 * @param location - Parameter location
 * @returns Array of parameters in the specified location
 */
export function getParametersByLocation(operation: Operation, location: ParameterIn): OperationParameter[] {
  return operation.parameters.filter(p => p.in === location);
}
