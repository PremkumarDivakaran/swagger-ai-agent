/**
 * Logging Utilities
 * Structured logging helpers for consistent log formats across the application
 */

import { ILogger } from './logger.interface';

/**
 * Operation context for structured logging
 */
export interface OperationContext {
  /** Operation name */
  operation: string;
  /** Correlation ID for request tracing */
  correlationId?: string;
  /** User or client identifier */
  userId?: string;
  /** Additional context data */
  [key: string]: unknown;
}

/**
 * Log entry structure for API operations
 */
export interface ApiLogEntry {
  /** HTTP method */
  method: string;
  /** Request path */
  path: string;
  /** Response status code */
  statusCode?: number;
  /** Response time in milliseconds */
  responseTimeMs?: number;
  /** Request ID */
  requestId?: string;
  /** Client IP address */
  clientIp?: string;
  /** User agent */
  userAgent?: string;
  /** Error message if failed */
  error?: string;
}

/**
 * Log entry structure for execution operations
 */
export interface ExecutionLogEntry {
  /** Run ID */
  runId: string;
  /** Spec ID */
  specId: string;
  /** Environment name */
  envName: string;
  /** Total tests */
  totalTests?: number;
  /** Passed tests */
  passedTests?: number;
  /** Failed tests */
  failedTests?: number;
  /** Execution time in milliseconds */
  executionTimeMs?: number;
  /** Error message if failed */
  error?: string;
}

/**
 * Log entry structure for LLM operations
 */
export interface LlmLogEntry {
  /** LLM provider */
  provider: string;
  /** Model name */
  model: string;
  /** Operation type */
  operationType: string;
  /** Input tokens */
  inputTokens?: number;
  /** Output tokens */
  outputTokens?: number;
  /** Latency in milliseconds */
  latencyMs?: number;
  /** Whether request was cached */
  cached?: boolean;
  /** Error message if failed */
  error?: string;
}

/**
 * Log entry structure for spec operations
 */
export interface SpecLogEntry {
  /** Spec ID */
  specId: string;
  /** Source type */
  sourceType: 'url' | 'file' | 'git';
  /** OpenAPI version */
  openApiVersion?: string;
  /** Number of operations */
  operationCount?: number;
  /** Processing time in milliseconds */
  processingTimeMs?: number;
  /** Error message if failed */
  error?: string;
}

/**
 * Creates a logger with operation context
 */
export function createOperationLogger(
  logger: ILogger,
  context: OperationContext
): ILogger {
  const { operation, correlationId, userId, ...rest } = context;
  return logger.child({
    operation,
    correlationId,
    userId,
    ...rest,
  });
}

/**
 * Log API request/response
 */
export function logApiOperation(
  logger: ILogger,
  entry: ApiLogEntry,
  level: 'info' | 'warn' | 'error' = 'info'
): void {
  const message = entry.error
    ? `API ${entry.method} ${entry.path} failed: ${entry.error}`
    : `API ${entry.method} ${entry.path} -> ${entry.statusCode} (${entry.responseTimeMs}ms)`;

  logger[level](message, {
    type: 'api_request',
    ...entry,
  });
}

/**
 * Log execution operation
 */
export function logExecutionOperation(
  logger: ILogger,
  entry: ExecutionLogEntry,
  level: 'info' | 'warn' | 'error' = 'info'
): void {
  const message = entry.error
    ? `Execution ${entry.runId} failed: ${entry.error}`
    : `Execution ${entry.runId} completed: ${entry.passedTests}/${entry.totalTests} passed (${entry.executionTimeMs}ms)`;

  logger[level](message, {
    type: 'execution',
    ...entry,
  });
}

/**
 * Log LLM operation
 */
export function logLlmOperation(
  logger: ILogger,
  entry: LlmLogEntry,
  level: 'info' | 'warn' | 'error' = 'info'
): void {
  const message = entry.error
    ? `LLM ${entry.operationType} failed: ${entry.error}`
    : `LLM ${entry.operationType} completed (${entry.latencyMs}ms, ${entry.inputTokens ?? 0}/${entry.outputTokens ?? 0} tokens)`;

  logger[level](message, {
    type: 'llm_operation',
    ...entry,
  });
}

/**
 * Log spec operation
 */
export function logSpecOperation(
  logger: ILogger,
  entry: SpecLogEntry,
  level: 'info' | 'warn' | 'error' = 'info'
): void {
  const message = entry.error
    ? `Spec ${entry.specId} ${entry.sourceType} import failed: ${entry.error}`
    : `Spec ${entry.specId} imported from ${entry.sourceType}: ${entry.operationCount} operations (${entry.processingTimeMs}ms)`;

  logger[level](message, {
    type: 'spec_operation',
    ...entry,
  });
}

/**
 * Timer utility for measuring operation duration
 */
export class OperationTimer {
  private startTime: number;
  private endTime?: number;

  constructor() {
    this.startTime = Date.now();
  }

  /**
   * Stop the timer and return duration
   */
  stop(): number {
    this.endTime = Date.now();
    return this.getDuration();
  }

  /**
   * Get current duration without stopping
   */
  getDuration(): number {
    const end = this.endTime ?? Date.now();
    return end - this.startTime;
  }

  /**
   * Get start timestamp
   */
  getStartTime(): number {
    return this.startTime;
  }
}

/**
 * Creates a timer for measuring operation duration
 */
export function startTimer(): OperationTimer {
  return new OperationTimer();
}

/**
 * Wraps an async operation with logging
 */
export async function withLogging<T>(
  logger: ILogger,
  operationName: string,
  operation: () => Promise<T>,
  context?: Record<string, unknown>
): Promise<T> {
  const timer = startTimer();
  const opLogger = createOperationLogger(logger, {
    operation: operationName,
    ...context,
  });

  opLogger.debug(`Starting ${operationName}`);

  try {
    const result = await operation();
    const duration = timer.stop();
    opLogger.info(`Completed ${operationName}`, { durationMs: duration });
    return result;
  } catch (error) {
    const duration = timer.stop();
    const errorMessage = error instanceof Error ? error.message : String(error);
    opLogger.error(`Failed ${operationName}`, {
      durationMs: duration,
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
}
