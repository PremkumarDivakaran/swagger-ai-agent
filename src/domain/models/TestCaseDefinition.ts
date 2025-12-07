/**
 * TestCaseDefinition domain model
 * Represents a single test case definition for an API operation
 * 
 * This is a pure domain model with NO infrastructure dependencies
 */

import { HttpMethod } from './Operation';

/**
 * Test case type
 */
export type TestCaseType = 
  | 'happy-path'           // Successful request with valid data
  | 'validation-error'     // Request with invalid data (400)
  | 'auth-error'           // Request without/invalid auth (401/403)
  | 'not-found'            // Request for non-existent resource (404)
  | 'server-error'         // Trigger server error (500)
  | 'boundary'             // Boundary value tests
  | 'negative'             // Negative test cases
  | 'custom';              // Custom test case

/**
 * Payload generation strategy
 */
export type PayloadStrategy = 
  | 'schema-default'       // Generate from schema with defaults
  | 'schema-examples'      // Use examples from schema
  | 'llm-generated'        // Generate using LLM
  | 'custom'               // Custom payload provided
  | 'empty'                // Empty payload
  | 'invalid';             // Invalid payload for negative testing

/**
 * Expected assertion
 */
export interface TestAssertion {
  /** Assertion type */
  type: 'status' | 'header' | 'body' | 'responseTime' | 'schema';
  /** Target for body assertions (JSONPath expression) */
  target?: string;
  /** Comparison operator */
  operator: 'equals' | 'notEquals' | 'contains' | 'notContains' | 'matches' | 'lessThan' | 'greaterThan' | 'exists' | 'notExists';
  /** Expected value */
  expected?: unknown;
  /** Description of the assertion */
  description?: string;
}

/**
 * TestCaseDefinition domain model
 * Represents a complete test case definition
 */
export interface TestCaseDefinition {
  /** Unique identifier for this test case */
  id: string;
  
  /** Test case name */
  name: string;
  
  /** Test case description */
  description?: string;
  
  /** Test case type */
  type: TestCaseType;
  
  /** Associated operation ID */
  operationId: string;
  
  /** HTTP method (from operation) */
  method: HttpMethod;
  
  /** API path (from operation) */
  path: string;
  
  /** Payload generation strategy */
  payloadStrategy: PayloadStrategy;
  
  /** Expected HTTP status code */
  expectedStatus: number;
  
  /** Expected status range (alternative to exact status) */
  expectedStatusRange?: {
    min: number;
    max: number;
  };
  
  /** Assertions to validate */
  assertions: TestAssertion[];
  
  /** Test priority (1 = highest) */
  priority: number;
  
  /** Tags for filtering */
  tags: string[];
  
  /** Request overrides */
  overrides?: {
    pathParams?: Record<string, string>;
    queryParams?: Record<string, string>;
    headers?: Record<string, string>;
    body?: unknown;
  };
  
  /** Pre-request script (for setup) */
  preRequestScript?: string;
  
  /** Post-response script (for teardown) */
  postResponseScript?: string;
  
  /** Skip this test case */
  skip?: boolean;
  
  /** Skip reason */
  skipReason?: string;
  
  /** Dependencies on other test cases (run after these) */
  dependsOn?: string[];
  
  /** Timeout override for this test */
  timeout?: number;
  
  /** Retry configuration */
  retry?: {
    count: number;
    delay: number;
  };
}

/**
 * Creates a new TestCaseDefinition with default values
 * @param partial - Partial test case data
 * @returns Complete TestCaseDefinition object
 */
export function createTestCaseDefinition(
  partial: Partial<TestCaseDefinition> & { 
    id: string; 
    name: string; 
    operationId: string;
    method: HttpMethod;
    path: string;
  }
): TestCaseDefinition {
  return {
    id: partial.id,
    name: partial.name,
    description: partial.description,
    type: partial.type ?? 'happy-path',
    operationId: partial.operationId,
    method: partial.method,
    path: partial.path,
    payloadStrategy: partial.payloadStrategy ?? 'schema-default',
    expectedStatus: partial.expectedStatus ?? 200,
    expectedStatusRange: partial.expectedStatusRange,
    assertions: partial.assertions ?? [
      { type: 'status', operator: 'equals', expected: partial.expectedStatus ?? 200 }
    ],
    priority: partial.priority ?? 1,
    tags: partial.tags ?? [],
    overrides: partial.overrides,
    preRequestScript: partial.preRequestScript,
    postResponseScript: partial.postResponseScript,
    skip: partial.skip ?? false,
    skipReason: partial.skipReason,
    dependsOn: partial.dependsOn,
    timeout: partial.timeout,
    retry: partial.retry,
  };
}

/**
 * Creates a happy path test case
 * @param operationId - Operation ID
 * @param method - HTTP method
 * @param path - API path
 * @returns Happy path test case definition
 */
export function createHappyPathTestCase(
  operationId: string,
  method: HttpMethod,
  path: string
): TestCaseDefinition {
  return createTestCaseDefinition({
    id: `${operationId}_happy_path`,
    name: `${method} ${path} - Happy Path`,
    description: `Verify successful response for ${method} ${path}`,
    type: 'happy-path',
    operationId,
    method,
    path,
    expectedStatus: method === 'POST' ? 201 : 200,
    payloadStrategy: 'schema-default',
    priority: 1,
    tags: ['smoke', 'happy-path'],
  });
}

/**
 * Creates a validation error test case
 * @param operationId - Operation ID
 * @param method - HTTP method
 * @param path - API path
 * @returns Validation error test case definition
 */
export function createValidationErrorTestCase(
  operationId: string,
  method: HttpMethod,
  path: string
): TestCaseDefinition {
  return createTestCaseDefinition({
    id: `${operationId}_validation_error`,
    name: `${method} ${path} - Validation Error`,
    description: `Verify validation error response for invalid data`,
    type: 'validation-error',
    operationId,
    method,
    path,
    expectedStatus: 400,
    payloadStrategy: 'invalid',
    priority: 2,
    tags: ['negative', 'validation'],
  });
}

/**
 * Creates an auth error test case
 * @param operationId - Operation ID
 * @param method - HTTP method
 * @param path - API path
 * @returns Auth error test case definition
 */
export function createAuthErrorTestCase(
  operationId: string,
  method: HttpMethod,
  path: string
): TestCaseDefinition {
  return createTestCaseDefinition({
    id: `${operationId}_auth_error`,
    name: `${method} ${path} - Auth Error`,
    description: `Verify unauthorized response without authentication`,
    type: 'auth-error',
    operationId,
    method,
    path,
    expectedStatus: 401,
    payloadStrategy: 'schema-default',
    priority: 2,
    tags: ['security', 'auth'],
    overrides: {
      headers: {
        'Authorization': '',
      },
    },
  });
}

/**
 * Checks if test case should be skipped
 * @param testCase - TestCaseDefinition to check
 * @returns true if test should be skipped
 */
export function shouldSkip(testCase: TestCaseDefinition): boolean {
  return testCase.skip === true;
}

/**
 * Gets test cases by type
 * @param testCases - Array of test cases
 * @param type - Test case type
 * @returns Filtered test cases
 */
export function getTestCasesByType(testCases: TestCaseDefinition[], type: TestCaseType): TestCaseDefinition[] {
  return testCases.filter(tc => tc.type === type);
}

/**
 * Sorts test cases by priority and dependencies
 * @param testCases - Array of test cases
 * @returns Sorted test cases
 */
export function sortTestCases(testCases: TestCaseDefinition[]): TestCaseDefinition[] {
  return [...testCases].sort((a, b) => {
    // First, check dependencies
    if (a.dependsOn?.includes(b.id)) return 1;
    if (b.dependsOn?.includes(a.id)) return -1;
    // Then sort by priority
    return a.priority - b.priority;
  });
}
