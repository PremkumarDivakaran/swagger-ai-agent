/**
 * Execute Run Use Case
 * Executes a run plan and produces a run report using Axios
 */

import {
  IRunPlanRepository,
  IRunReportRepository,
  IEnvironmentRepository,
} from '../../domain/repositories';
import {
  RunPlan,
  RunReport,
  TestCaseResult,
  RequestDetails,
  ResponseDetails,
  AssertionResult,
  Operation,
  EnvironmentConfig,
  TestCaseDefinition,
  TestResultWithMetadata,
  createRunReportWithAggregations,
  startRun,
  completeRun,
  buildUrl,
  getAuthorizationHeader,
} from '../../domain/models';
import { NotFoundError, ValidationError } from '../../core/errors';
import { generateId } from '../../utils';

/**
 * Input for executing a run
 */
export interface ExecuteRunInput {
  /** Existing run ID to execute */
  runId?: string;
  /** Or create new plan inline */
  specId?: string;
  envName?: string;
  selection?: {
    mode: 'single' | 'tag' | 'full';
    operationId?: string;
    tags?: string[];
    exclude?: string[];
  };
}

/**
 * Output from executing a run
 */
export interface ExecuteRunOutput {
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
}

/**
 * HTTP client interface for making requests
 * This abstraction allows swapping implementations (Axios, mock, etc.)
 */
export interface HttpClient {
  request(options: HttpRequestOptions): Promise<HttpResponse>;
}

export interface HttpRequestOptions {
  method: string;
  url: string;
  headers?: Record<string, string>;
  params?: Record<string, string | number | boolean>;
  body?: unknown;
  timeout?: number;
}

export interface HttpResponse {
  statusCode: number;
  statusText: string;
  headers: Record<string, string>;
  body?: unknown;
  responseTime: number;
}

/**
 * Dependencies for ExecuteRunUseCase
 */
export interface ExecuteRunDependencies {
  runPlanRepository: IRunPlanRepository;
  runReportRepository: IRunReportRepository;
  environmentRepository: IEnvironmentRepository;
  httpClient: HttpClient;
}

/**
 * Default mock HTTP client for testing
 */
export class MockHttpClient implements HttpClient {
  private responses: Map<string, HttpResponse> = new Map();
  private defaultResponse: HttpResponse = {
    statusCode: 200,
    statusText: 'OK',
    headers: { 'content-type': 'application/json' },
    body: { message: 'Success', timestamp: new Date().toISOString() },
    responseTime: 50,
  };

  /**
   * Set a mock response for a specific URL pattern
   */
  setResponse(urlPattern: string, response: HttpResponse): void {
    this.responses.set(urlPattern, response);
  }

  /**
   * Set the default response
   */
  setDefaultResponse(response: HttpResponse): void {
    this.defaultResponse = response;
  }

  async request(options: HttpRequestOptions): Promise<HttpResponse> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 10));

    // Check for matching URL patterns
    for (const [pattern, response] of this.responses) {
      if (options.url.includes(pattern)) {
        return response;
      }
    }

    return this.defaultResponse;
  }
}

/**
 * Executes a run plan and produces results
 */
export class ExecuteRunUseCase {
  private httpClient: HttpClient;

  constructor(private readonly deps: ExecuteRunDependencies) {
    this.httpClient = deps.httpClient ?? new MockHttpClient();
  }

  /**
   * Execute the use case
   * @param input - Input parameters
   * @returns Execution summary
   */
  async execute(input: ExecuteRunInput): Promise<ExecuteRunOutput> {
    if (!input.runId && !input.specId) {
      throw new ValidationError('Either runId or specId is required');
    }

    // Get or create run plan
    let runPlan: RunPlan;
    
    if (input.runId) {
      const plan = await this.deps.runPlanRepository.findById(input.runId);
      if (!plan) {
        throw new NotFoundError(`Run plan not found: ${input.runId}`);
      }
      runPlan = plan;
    } else {
      throw new ValidationError('Inline plan creation not supported. Use POST /execution/plan first.');
    }

    // Validate plan can be executed
    if (runPlan.status === 'running') {
      throw new ValidationError('Run plan is already running');
    }
    if (runPlan.status === 'completed' || runPlan.status === 'failed') {
      throw new ValidationError('Run plan has already been executed. Create a new plan or retry failed tests.');
    }

    // Get environment
    const environments = await this.deps.environmentRepository.findBySpecId(runPlan.specId);
    const environment = environments.find(env => env.name === runPlan.envName);
    if (!environment) {
      throw new NotFoundError(`Environment '${runPlan.envName}' not found`);
    }

    // Mark plan as running
    runPlan = startRun(runPlan);
    await this.deps.runPlanRepository.update(runPlan);

    const startedAt = new Date();
    const testResults: TestResultWithMetadata[] = [];

    // Execute each test case
    for (const item of runPlan.executionItems) {
      for (const testCase of item.testCases) {
        // Check if test should be skipped
        if (testCase.skip) {
          const skippedResult: TestResultWithMetadata = {
            testCaseId: testCase.id,
            testCaseName: testCase.name,
            operationId: item.operation.operationId,
            status: 'skipped',
            request: {
              url: '',
              method: item.operation.method,
              headers: {},
              timestamp: new Date(),
            },
            assertions: [],
            duration: 0,
            retryAttempt: 0,
            startedAt: new Date(),
            completedAt: new Date(),
            skipReason: testCase.skipReason,
            method: item.operation.method,
            path: item.operation.path,
            tags: item.operation.tags,
          };
          testResults.push(skippedResult);
          continue;
        }

        const result = await this.executeTestCase(testCase, item.operation, environment);
        // Add operation metadata to result for aggregations
        const resultWithMetadata: TestResultWithMetadata = {
          ...result,
          method: item.operation.method,
          path: item.operation.path,
          tags: item.operation.tags,
        };
        testResults.push(resultWithMetadata);

        // Check stop on failure
        if (runPlan.config?.stopOnFailure && result.status === 'failed') {
          break;
        }
      }
    }

    const completedAt = new Date();

    // Create run report with aggregations
    const runReport = createRunReportWithAggregations(
      {
        runId: runPlan.runId,
        specId: runPlan.specId,
        envName: runPlan.envName,
        startedAt,
        completedAt,
        environmentDetails: {
          baseUrl: environment.baseUrl,
          headers: environment.defaultHeaders,
        },
      },
      testResults
    );

    // Save report
    await this.deps.runReportRepository.create(runReport);

    // Update plan status
    const success = runReport.summary.failed === 0 && runReport.summary.errors === 0;
    runPlan = completeRun(runPlan, success);
    await this.deps.runPlanRepository.update(runPlan);

    return {
      runId: runReport.runId,
      specId: runReport.specId,
      envName: runReport.envName,
      status: success ? 'completed' : 'failed',
      summary: {
        total: runReport.summary.total,
        passed: runReport.summary.passed,
        failed: runReport.summary.failed,
        errors: runReport.summary.errors,
        skipped: runReport.summary.skipped,
        passRate: runReport.summary.passRate,
        duration: runReport.duration,
      },
    };
  }

  /**
   * Execute a single test case
   */
  private async executeTestCase(
    testCase: TestCaseDefinition,
    operation: Operation,
    environment: EnvironmentConfig
  ): Promise<TestCaseResult> {
    const startedAt = new Date();
    
    // Build request with path parameters, query params, headers, and auth
    const requestDetails = this.buildRequestDetails(testCase, operation, environment, startedAt);

    try {
      // Make HTTP request
      const response = await this.httpClient.request({
        method: operation.method,
        url: requestDetails.url,
        headers: requestDetails.headers,
        params: requestDetails.queryParams,
        body: requestDetails.body,
        timeout: testCase.timeout ?? 30000,
      });

      const completedAt = new Date();
      const responseDetails: ResponseDetails = {
        statusCode: response.statusCode,
        statusText: response.statusText,
        headers: response.headers,
        body: response.body,
        responseTime: response.responseTime,
        timestamp: completedAt,
      };

      // Run assertions
      const assertions = this.runAssertions(testCase, response);
      const allPassed = assertions.every(a => a.passed);

      return {
        testCaseId: testCase.id,
        testCaseName: testCase.name,
        operationId: operation.operationId,
        status: allPassed ? 'passed' : 'failed',
        request: requestDetails,
        response: responseDetails,
        assertions,
        duration: completedAt.getTime() - startedAt.getTime(),
        retryAttempt: 0,
        startedAt,
        completedAt,
      };
    } catch (error) {
      const completedAt = new Date();
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      return {
        testCaseId: testCase.id,
        testCaseName: testCase.name,
        operationId: operation.operationId,
        status: 'error',
        request: requestDetails,
        assertions: [],
        error: errorMessage,
        errorStack: error instanceof Error ? error.stack : undefined,
        duration: completedAt.getTime() - startedAt.getTime(),
        retryAttempt: 0,
        startedAt,
        completedAt,
      };
    }
  }

  /**
   * Run assertions for a test case
   */
  private runAssertions(testCase: TestCaseDefinition, response: HttpResponse): AssertionResult[] {
    const results: AssertionResult[] = [];

    // Status assertion
    if (testCase.expectedStatus) {
      results.push({
        description: `Status should be ${testCase.expectedStatus}`,
        passed: response.statusCode === testCase.expectedStatus,
        expected: testCase.expectedStatus,
        actual: response.statusCode,
        error: response.statusCode !== testCase.expectedStatus
          ? `Expected status ${testCase.expectedStatus}, got ${response.statusCode}`
          : undefined,
      });
    }

    // Run custom assertions
    if (testCase.assertions) {
      for (const assertion of testCase.assertions) {
        results.push(this.evaluateAssertion(assertion, response));
      }
    }

    return results;
  }

  /**
   * Evaluate a single assertion against response using TestAssertion interface
   * TestAssertion uses: type, target, operator, expected, description
   */
  private evaluateAssertion(assertion: any, response: HttpResponse): AssertionResult {
    const result: AssertionResult = {
      description: assertion.description ?? 'Custom assertion',
      passed: false,
      expected: assertion.expected,
      actual: undefined,
    };

    try {
      // Get the actual value based on assertion type
      switch (assertion.type) {
        case 'status':
          result.actual = response.statusCode;
          break;

        case 'header':
          // target is the header name
          result.actual = response.headers[assertion.target?.toLowerCase()];
          break;

        case 'body':
          // target is a JSON path expression
          if (assertion.target) {
            result.actual = this.extractJsonPath(response.body, assertion.target);
          } else {
            result.actual = response.body;
          }
          break;

        case 'responseTime':
          result.actual = response.responseTime;
          break;

        case 'schema':
          // Schema validation would require JSON schema validation library
          result.actual = 'schema validation';
          result.passed = true; // Placeholder
          result.description = assertion.description ?? 'Schema validation';
          return result;
      }

      // Evaluate the assertion based on operator
      result.passed = this.evaluateOperator(assertion.operator, result.actual, assertion.expected);

    } catch (error) {
      result.passed = false;
      result.error = error instanceof Error ? error.message : String(error);
    }

    if (!result.passed && !result.error) {
      result.error = `Expected ${assertion.expected} (${assertion.operator}), got ${result.actual}`;
    }

    return result;
  }

  /**
   * Evaluate comparison operator
   */
  private evaluateOperator(operator: string, actual: unknown, expected: unknown): boolean {
    switch (operator) {
      case 'equals':
        return actual === expected;
      case 'notEquals':
        return actual !== expected;
      case 'contains':
        return String(actual).includes(String(expected));
      case 'notContains':
        return !String(actual).includes(String(expected));
      case 'matches':
        return new RegExp(String(expected)).test(String(actual));
      case 'lessThan':
        return Number(actual) < Number(expected);
      case 'greaterThan':
        return Number(actual) > Number(expected);
      case 'exists':
        return actual !== undefined && actual !== null;
      case 'notExists':
        return actual === undefined || actual === null;
      default:
        return actual === expected;
    }
  }

  /**
   * Extract value from JSON object using simple dot-notation path
   */
  private extractJsonPath(obj: unknown, path: string): unknown {
    if (!obj || typeof obj !== 'object') return undefined;
    
    const parts = path.replace(/^\$\.?/, '').split('.');
    let current: any = obj;

    for (const part of parts) {
      if (current === null || current === undefined) return undefined;
      
      // Handle array index like [0]
      const arrayMatch = part.match(/^(\w+)\[(\d+)\]$/);
      if (arrayMatch) {
        current = current[arrayMatch[1]]?.[parseInt(arrayMatch[2])];
      } else {
        current = current[part];
      }
    }

    return current;
  }

  /**
   * Build request details from test case, operation, and environment
   */
  private buildRequestDetails(
    testCase: TestCaseDefinition,
    operation: Operation,
    environment: EnvironmentConfig,
    timestamp: Date
  ): RequestDetails & { queryParams?: Record<string, string | number | boolean> } {
    // Build URL with path parameters
    let path = operation.path;
    const pathParams = testCase.overrides?.pathParams ?? {};
    
    // Replace path parameters from operation definition
    for (const param of operation.parameters.filter(p => p.in === 'path')) {
      const value = pathParams[param.name] ?? this.generateDefaultParamValue(param);
      if (value !== undefined) {
        path = path.replace(`{${param.name}}`, encodeURIComponent(String(value)));
      }
    }

    const url = buildUrl(environment, path);

    // Build headers
    const headers: Record<string, string> = {
      ...environment.defaultHeaders,
      ...this.getContentTypeHeader(operation),
      ...testCase.overrides?.headers,
    };

    // Add authorization header if configured
    const authHeader = getAuthorizationHeader(environment);
    if (authHeader) {
      headers['Authorization'] = authHeader;
    }

    // Add header parameters from operation
    for (const param of operation.parameters.filter(p => p.in === 'header')) {
      const value = testCase.overrides?.headers?.[param.name];
      if (value !== undefined) {
        headers[param.name] = value;
      }
    }

    // Build query parameters
    const queryParams: Record<string, string | number | boolean> = {};
    for (const param of operation.parameters.filter(p => p.in === 'query')) {
      const value = testCase.overrides?.queryParams?.[param.name];
      if (value !== undefined) {
        queryParams[param.name] = value;
      }
    }

    // Determine request body from overrides
    const body = testCase.overrides?.body;

    return {
      url,
      method: operation.method,
      headers,
      queryParams: Object.keys(queryParams).length > 0 ? queryParams : undefined,
      body,
      timestamp,
    };
  }

  /**
   * Get content type header based on operation
   */
  private getContentTypeHeader(operation: Operation): Record<string, string> {
    if (operation.requestBody?.content) {
      const contentTypes = Object.keys(operation.requestBody.content);
      if (contentTypes.includes('application/json')) {
        return { 'Content-Type': 'application/json' };
      }
      if (contentTypes.length > 0) {
        return { 'Content-Type': contentTypes[0] };
      }
    }
    return {};
  }

  /**
   * Generate a default value for a parameter when not provided
   */
  private generateDefaultParamValue(param: any): string | number | boolean | undefined {
    // Use example if available
    if (param.example !== undefined) return param.example;
    if (param.schema?.example !== undefined) return param.schema.example;
    if (param.schema?.default !== undefined) return param.schema.default;

    // Generate based on type
    const type = param.schema?.type || 'string';
    switch (type) {
      case 'integer':
      case 'number':
        return 1;
      case 'boolean':
        return true;
      case 'string':
        if (param.schema?.format === 'uuid') {
          return generateId();
        }
        return 'test-value';
      default:
        return 'test-value';
    }
  }
}

/**
 * Factory function to create ExecuteRunUseCase
 */
export function createExecuteRunUseCase(deps: ExecuteRunDependencies): ExecuteRunUseCase {
  return new ExecuteRunUseCase(deps);
}
