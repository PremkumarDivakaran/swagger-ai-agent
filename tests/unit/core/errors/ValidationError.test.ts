/**
 * Unit tests for ValidationError class
 */

import { ValidationError, ValidationErrorField } from '../../../../src/core/errors/ValidationError';
import { AppError } from '../../../../src/core/errors/AppError';

describe('ValidationError', () => {
  describe('constructor', () => {
    it('should create a validation error with empty fields', () => {
      const error = new ValidationError('Validation failed');
      
      expect(error.message).toBe('Validation failed');
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.isOperational).toBe(true);
      expect(error.fields).toEqual([]);
    });

    it('should create a validation error with field errors', () => {
      const fields: ValidationErrorField[] = [
        { field: 'email', message: 'Invalid email format' },
        { field: 'age', message: 'Must be a positive number', value: -5 },
      ];
      
      const error = new ValidationError('Validation failed', fields);
      
      expect(error.fields).toEqual(fields);
      expect(error.details).toEqual({ fields });
    });

    it('should be an instance of AppError', () => {
      const error = new ValidationError('Test');
      
      expect(error).toBeInstanceOf(AppError);
      expect(error).toBeInstanceOf(ValidationError);
    });
  });

  describe('fromField', () => {
    it('should create error from a single field', () => {
      const error = ValidationError.fromField('username', 'Username is required');
      
      expect(error.message).toBe('Validation failed for field: username');
      expect(error.fields).toHaveLength(1);
      expect(error.fields[0]).toEqual({
        field: 'username',
        message: 'Username is required',
        value: undefined,
      });
    });

    it('should include the invalid value', () => {
      const error = ValidationError.fromField('age', 'Must be positive', -10);
      
      expect(error.fields[0].value).toBe(-10);
    });
  });

  describe('fromFields', () => {
    it('should create error from multiple fields', () => {
      const fields: ValidationErrorField[] = [
        { field: 'name', message: 'Required' },
        { field: 'email', message: 'Invalid format' },
      ];
      
      const error = ValidationError.fromFields(fields);
      
      expect(error.message).toBe('Validation failed for fields: name, email');
      expect(error.fields).toEqual(fields);
    });
  });
});
