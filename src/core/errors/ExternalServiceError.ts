/**
 * External service error class
 * Used when an external service (MCP, LLM, HTTP client) fails
 */

import { AppError } from './AppError';

export class ExternalServiceError extends AppError {
  public readonly serviceName: string;
  public readonly originalError?: Error;

  /**
   * Creates an ExternalServiceError instance
   * @param serviceName - Name of the external service that failed
   * @param message - Human-readable error message
   * @param originalError - Original error from the external service
   */
  constructor(serviceName: string, message: string, originalError?: Error) {
    super(
      `External service error [${serviceName}]: ${message}`,
      503,
      'EXTERNAL_SERVICE_ERROR',
      true,
      {
        serviceName,
        originalMessage: originalError?.message,
      }
    );
    this.serviceName = serviceName;
    this.originalError = originalError;

    Object.setPrototypeOf(this, ExternalServiceError.prototype);
  }

  /**
   * Creates an ExternalServiceError for MCP service
   * @param message - Error message
   * @param originalError - Original error
   */
  static forMcp(message: string, originalError?: Error): ExternalServiceError {
    return new ExternalServiceError('mcp', message, originalError);
  }

  /**
   * Creates an ExternalServiceError for LLM service
   * @param message - Error message
   * @param originalError - Original error
   */
  static forLlm(message: string, originalError?: Error): ExternalServiceError {
    return new ExternalServiceError('llm', message, originalError);
  }

  /**
   * Creates an ExternalServiceError for Swagger parser service
   * @param message - Error message
   * @param originalError - Original error
   */
  static forSwaggerParser(message: string, originalError?: Error): ExternalServiceError {
    return new ExternalServiceError('swagger-parser', message, originalError);
  }

  /**
   * Creates an ExternalServiceError for HTTP client
   * @param message - Error message
   * @param originalError - Original error
   */
  static forHttpClient(message: string, originalError?: Error): ExternalServiceError {
    return new ExternalServiceError('http-client', message, originalError);
  }
}
