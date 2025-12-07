/**
 * Unit tests for AppError class
 */

import { AppError } from '../../../../src/core/errors/AppError';

describe('AppError', () => {
  describe('constructor', () => {
    it('should create an error with default values', () => {
      const error = new AppError('Test error');
      
      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(500);
      expect(error.code).toBe('INTERNAL_ERROR');
      expect(error.isOperational).toBe(true);
      expect(error.details).toBeUndefined();
    });

    it('should create an error with custom values', () => {
      const error = new AppError(
        'Custom error',
        400,
        'CUSTOM_ERROR',
        false,
        { field: 'value' }
      );
      
      expect(error.message).toBe('Custom error');
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('CUSTOM_ERROR');
      expect(error.isOperational).toBe(false);
      expect(error.details).toEqual({ field: 'value' });
    });

    it('should be an instance of Error', () => {
      const error = new AppError('Test error');
      
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(AppError);
    });

    it('should have a stack trace', () => {
      const error = new AppError('Test error');
      
      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('AppError');
    });
  });

  describe('toJSON', () => {
    it('should return a JSON-serializable object', () => {
      const error = new AppError(
        'Test error',
        400,
        'TEST_ERROR',
        true,
        { extra: 'data' }
      );
      
      const json = error.toJSON();
      
      expect(json).toEqual({
        code: 'TEST_ERROR',
        message: 'Test error',
        statusCode: 400,
        details: { extra: 'data' },
      });
    });

    it('should exclude undefined details', () => {
      const error = new AppError('Test error');
      
      const json = error.toJSON();
      
      expect(json.details).toBeUndefined();
    });
  });
});
