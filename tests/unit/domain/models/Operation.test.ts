/**
 * Unit tests for Operation domain model
 */

import {
  Operation,
  createOperation,
  generateOperationId,
  hasRequestBody,
  requiresAuth,
  getRequiredParameters,
  getParametersByLocation,
} from '../../../../src/domain/models/Operation';

describe('Operation', () => {
  describe('createOperation', () => {
    it('should create an operation with required fields', () => {
      const operation = createOperation({
        operationId: 'GET_/users',
        method: 'GET',
        path: '/users',
      });

      expect(operation.operationId).toBe('GET_/users');
      expect(operation.method).toBe('GET');
      expect(operation.path).toBe('/users');
      expect(operation.tags).toEqual([]);
      expect(operation.parameters).toEqual([]);
      expect(operation.responses).toEqual([]);
      expect(operation.security).toEqual([]);
      expect(operation.deprecated).toBe(false);
    });

    it('should create an operation with all fields', () => {
      const operation = createOperation({
        operationId: 'createUser',
        originalOperationId: 'createUser',
        method: 'POST',
        path: '/users',
        summary: 'Create a new user',
        description: 'Creates a new user in the system',
        tags: ['users'],
        parameters: [
          { name: 'X-Request-ID', in: 'header', required: false },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { type: 'object' },
            },
          },
        },
        responses: [
          { statusCode: '201', description: 'User created' },
        ],
        security: [{ schemeName: 'bearerAuth', scopes: [] }],
        deprecated: false,
      });

      expect(operation.operationId).toBe('createUser');
      expect(operation.tags).toContain('users');
      expect(operation.requestBody?.required).toBe(true);
      expect(operation.security).toHaveLength(1);
    });
  });

  describe('generateOperationId', () => {
    it('should generate operation ID from method and path', () => {
      expect(generateOperationId('GET', '/users')).toBe('GET_/users');
      expect(generateOperationId('POST', '/users/{id}')).toBe('POST_/users/{id}');
      expect(generateOperationId('DELETE', '/items/{itemId}/subitems/{subId}')).toBe('DELETE_/items/{itemId}/subitems/{subId}');
    });
  });

  describe('hasRequestBody', () => {
    it('should return true when operation has request body', () => {
      const operation = createOperation({
        operationId: 'test',
        method: 'POST',
        path: '/test',
        requestBody: { required: true, content: {} },
      });
      expect(hasRequestBody(operation)).toBe(true);
    });

    it('should return false when operation has no request body', () => {
      const operation = createOperation({
        operationId: 'test',
        method: 'GET',
        path: '/test',
      });
      expect(hasRequestBody(operation)).toBe(false);
    });
  });

  describe('requiresAuth', () => {
    it('should return true when operation has security requirements', () => {
      const operation = createOperation({
        operationId: 'test',
        method: 'GET',
        path: '/test',
        security: [{ schemeName: 'apiKey', scopes: [] }],
      });
      expect(requiresAuth(operation)).toBe(true);
    });

    it('should return false when operation has no security requirements', () => {
      const operation = createOperation({
        operationId: 'test',
        method: 'GET',
        path: '/test',
      });
      expect(requiresAuth(operation)).toBe(false);
    });
  });

  describe('getRequiredParameters', () => {
    it('should return only required parameters', () => {
      const operation = createOperation({
        operationId: 'test',
        method: 'GET',
        path: '/test',
        parameters: [
          { name: 'id', in: 'path', required: true },
          { name: 'filter', in: 'query', required: false },
          { name: 'Authorization', in: 'header', required: true },
        ],
      });

      const required = getRequiredParameters(operation);
      expect(required).toHaveLength(2);
      expect(required.map(p => p.name)).toEqual(['id', 'Authorization']);
    });
  });

  describe('getParametersByLocation', () => {
    it('should return parameters by location', () => {
      const operation = createOperation({
        operationId: 'test',
        method: 'GET',
        path: '/test/{id}',
        parameters: [
          { name: 'id', in: 'path', required: true },
          { name: 'filter', in: 'query', required: false },
          { name: 'page', in: 'query', required: false },
          { name: 'Authorization', in: 'header', required: true },
        ],
      });

      expect(getParametersByLocation(operation, 'path')).toHaveLength(1);
      expect(getParametersByLocation(operation, 'query')).toHaveLength(2);
      expect(getParametersByLocation(operation, 'header')).toHaveLength(1);
      expect(getParametersByLocation(operation, 'cookie')).toHaveLength(0);
    });
  });
});
