/**
 * Tests for Logging Utilities
 */

import {
  createOperationLogger,
  logApiOperation,
  logExecutionOperation,
  logLlmOperation,
  logSpecOperation,
  OperationTimer,
  startTimer,
  withLogging,
} from '../../../../src/infrastructure/logging/logging-utils';
import { ILogger } from '../../../../src/infrastructure/logging/logger.interface';

describe('Logging Utilities', () => {
  let mockLogger: jest.Mocked<ILogger>;

  beforeEach(() => {
    mockLogger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
      child: jest.fn().mockReturnThis(),
    };
  });

  describe('createOperationLogger', () => {
    it('should create a child logger with operation context', () => {
      createOperationLogger(mockLogger, {
        operation: 'testOperation',
        correlationId: 'corr-123',
        userId: 'user-456',
      });

      expect(mockLogger.child).toHaveBeenCalledWith({
        operation: 'testOperation',
        correlationId: 'corr-123',
        userId: 'user-456',
      });
    });

    it('should include additional context', () => {
      createOperationLogger(mockLogger, {
        operation: 'testOperation',
        customField: 'customValue',
      });

      expect(mockLogger.child).toHaveBeenCalledWith({
        operation: 'testOperation',
        customField: 'customValue',
      });
    });
  });

  describe('logApiOperation', () => {
    it('should log successful API operation', () => {
      logApiOperation(mockLogger, {
        method: 'GET',
        path: '/api/users',
        statusCode: 200,
        responseTimeMs: 150,
      });

      expect(mockLogger.info).toHaveBeenCalledWith(
        'API GET /api/users -> 200 (150ms)',
        expect.objectContaining({
          type: 'api_request',
          method: 'GET',
          path: '/api/users',
          statusCode: 200,
          responseTimeMs: 150,
        })
      );
    });

    it('should log failed API operation', () => {
      logApiOperation(
        mockLogger,
        {
          method: 'POST',
          path: '/api/users',
          error: 'Invalid request body',
        },
        'error'
      );

      expect(mockLogger.error).toHaveBeenCalledWith(
        'API POST /api/users failed: Invalid request body',
        expect.objectContaining({
          type: 'api_request',
          error: 'Invalid request body',
        })
      );
    });

    it('should use specified log level', () => {
      logApiOperation(
        mockLogger,
        {
          method: 'GET',
          path: '/api/deprecated',
          statusCode: 200,
          responseTimeMs: 100,
        },
        'warn'
      );

      expect(mockLogger.warn).toHaveBeenCalled();
    });
  });

  describe('logExecutionOperation', () => {
    it('should log successful execution', () => {
      logExecutionOperation(mockLogger, {
        runId: 'run-123',
        specId: 'spec-456',
        envName: 'qa',
        totalTests: 10,
        passedTests: 8,
        failedTests: 2,
        executionTimeMs: 5000,
      });

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Execution run-123 completed: 8/10 passed (5000ms)',
        expect.objectContaining({
          type: 'execution',
          runId: 'run-123',
          passedTests: 8,
          failedTests: 2,
        })
      );
    });

    it('should log failed execution', () => {
      logExecutionOperation(
        mockLogger,
        {
          runId: 'run-123',
          specId: 'spec-456',
          envName: 'qa',
          error: 'Connection timeout',
        },
        'error'
      );

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Execution run-123 failed: Connection timeout',
        expect.objectContaining({
          type: 'execution',
          error: 'Connection timeout',
        })
      );
    });
  });

  describe('logLlmOperation', () => {
    it('should log successful LLM operation', () => {
      logLlmOperation(mockLogger, {
        provider: 'openai',
        model: 'gpt-4',
        operationType: 'payload-generation',
        inputTokens: 100,
        outputTokens: 50,
        latencyMs: 2000,
      });

      expect(mockLogger.info).toHaveBeenCalledWith(
        'LLM payload-generation completed (2000ms, 100/50 tokens)',
        expect.objectContaining({
          type: 'llm_operation',
          provider: 'openai',
          model: 'gpt-4',
        })
      );
    });

    it('should log failed LLM operation', () => {
      logLlmOperation(
        mockLogger,
        {
          provider: 'openai',
          model: 'gpt-4',
          operationType: 'payload-generation',
          error: 'Rate limit exceeded',
        },
        'error'
      );

      expect(mockLogger.error).toHaveBeenCalledWith(
        'LLM payload-generation failed: Rate limit exceeded',
        expect.objectContaining({
          error: 'Rate limit exceeded',
        })
      );
    });
  });

  describe('logSpecOperation', () => {
    it('should log successful spec import', () => {
      logSpecOperation(mockLogger, {
        specId: 'spec-123',
        sourceType: 'url',
        openApiVersion: '3.0.0',
        operationCount: 25,
        processingTimeMs: 500,
      });

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Spec spec-123 imported from url: 25 operations (500ms)',
        expect.objectContaining({
          type: 'spec_operation',
          operationCount: 25,
        })
      );
    });

    it('should log failed spec import', () => {
      logSpecOperation(
        mockLogger,
        {
          specId: 'spec-123',
          sourceType: 'git',
          error: 'Repository not found',
        },
        'error'
      );

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Spec spec-123 git import failed: Repository not found',
        expect.objectContaining({
          error: 'Repository not found',
        })
      );
    });
  });

  describe('OperationTimer', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should measure elapsed time', () => {
      const timer = new OperationTimer();

      jest.advanceTimersByTime(1000);

      expect(timer.getDuration()).toBe(1000);
    });

    it('should stop and return duration', () => {
      const timer = new OperationTimer();

      jest.advanceTimersByTime(500);

      const duration = timer.stop();

      expect(duration).toBe(500);
    });

    it('should return same duration after stop', () => {
      const timer = new OperationTimer();

      jest.advanceTimersByTime(500);
      const duration1 = timer.stop();

      jest.advanceTimersByTime(1000);
      const duration2 = timer.getDuration();

      expect(duration1).toBe(duration2);
    });

    it('should return start time', () => {
      const before = Date.now();
      const timer = new OperationTimer();
      const after = Date.now();

      expect(timer.getStartTime()).toBeGreaterThanOrEqual(before);
      expect(timer.getStartTime()).toBeLessThanOrEqual(after);
    });
  });

  describe('startTimer', () => {
    it('should create a new timer', () => {
      const timer = startTimer();

      expect(timer).toBeInstanceOf(OperationTimer);
    });
  });

  describe('withLogging', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should log operation start and completion', async () => {
      const operation = jest.fn().mockResolvedValue('result');

      const promise = withLogging(mockLogger, 'testOperation', operation);
      
      jest.runAllTimers();
      const result = await promise;

      expect(mockLogger.child).toHaveBeenCalled();
      expect(mockLogger.debug).toHaveBeenCalledWith('Starting testOperation');
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Completed testOperation',
        expect.objectContaining({
          durationMs: expect.any(Number),
        })
      );
      expect(result).toBe('result');
    });

    it('should log operation failure', async () => {
      const error = new Error('Operation failed');
      const operation = jest.fn().mockRejectedValue(error);

      const promise = withLogging(mockLogger, 'failingOperation', operation);

      jest.runAllTimers();

      await expect(promise).rejects.toThrow('Operation failed');
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed failingOperation',
        expect.objectContaining({
          durationMs: expect.any(Number),
          error: 'Operation failed',
          stack: expect.any(String),
        })
      );
    });

    it('should include additional context', async () => {
      const operation = jest.fn().mockResolvedValue('result');

      const promise = withLogging(mockLogger, 'testOperation', operation, {
        customContext: 'value',
      });

      jest.runAllTimers();
      await promise;

      expect(mockLogger.child).toHaveBeenCalledWith(
        expect.objectContaining({
          operation: 'testOperation',
          customContext: 'value',
        })
      );
    });

    it('should handle non-Error exceptions', async () => {
      const operation = jest.fn().mockRejectedValue('string error');

      const promise = withLogging(mockLogger, 'testOperation', operation);

      jest.runAllTimers();

      await expect(promise).rejects.toBe('string error');
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed testOperation',
        expect.objectContaining({
          error: 'string error',
          stack: undefined,
        })
      );
    });
  });
});
