/**
 * Unit tests for EnvironmentConfig domain model
 */

import {
  EnvironmentConfig,
  createEnvironmentConfig,
  hasAuth,
  getAuthorizationHeader,
  buildUrl,
  replaceVariables,
} from '../../../../src/domain/models/EnvironmentConfig';

describe('EnvironmentConfig', () => {
  describe('createEnvironmentConfig', () => {
    it('should create an environment with required fields', () => {
      const env = createEnvironmentConfig({
        id: 'env-1',
        specId: 'spec-1',
        name: 'development',
        baseUrl: 'https://dev.api.example.com',
      });

      expect(env.id).toBe('env-1');
      expect(env.specId).toBe('spec-1');
      expect(env.name).toBe('development');
      expect(env.baseUrl).toBe('https://dev.api.example.com');
      expect(env.authConfig.type).toBe('none');
      expect(env.defaultHeaders).toEqual({});
      expect(env.timeout).toBe(30000);
      expect(env.verifySsl).toBe(true);
    });

    it('should create an environment with auth config', () => {
      const env = createEnvironmentConfig({
        id: 'env-1',
        specId: 'spec-1',
        name: 'production',
        baseUrl: 'https://api.example.com',
        authConfig: {
          type: 'bearer',
          token: 'secret-token',
        },
        defaultHeaders: {
          'X-Api-Version': '2',
        },
      });

      expect(env.authConfig.type).toBe('bearer');
      expect(env.defaultHeaders['X-Api-Version']).toBe('2');
    });
  });

  describe('hasAuth', () => {
    it('should return false for no auth', () => {
      const env = createEnvironmentConfig({
        id: 'env-1',
        specId: 'spec-1',
        name: 'dev',
        baseUrl: 'http://localhost',
      });
      expect(hasAuth(env)).toBe(false);
    });

    it('should return true for bearer auth', () => {
      const env = createEnvironmentConfig({
        id: 'env-1',
        specId: 'spec-1',
        name: 'dev',
        baseUrl: 'http://localhost',
        authConfig: { type: 'bearer', token: 'token' },
      });
      expect(hasAuth(env)).toBe(true);
    });
  });

  describe('getAuthorizationHeader', () => {
    it('should return undefined for no auth', () => {
      const env = createEnvironmentConfig({
        id: 'env-1',
        specId: 'spec-1',
        name: 'dev',
        baseUrl: 'http://localhost',
      });
      expect(getAuthorizationHeader(env)).toBeUndefined();
    });

    it('should return Basic header for basic auth', () => {
      const env = createEnvironmentConfig({
        id: 'env-1',
        specId: 'spec-1',
        name: 'dev',
        baseUrl: 'http://localhost',
        authConfig: { type: 'basic', username: 'user', password: 'pass' },
      });

      const header = getAuthorizationHeader(env);
      expect(header).toBe('Basic dXNlcjpwYXNz'); // base64(user:pass)
    });

    it('should return Bearer header for bearer auth', () => {
      const env = createEnvironmentConfig({
        id: 'env-1',
        specId: 'spec-1',
        name: 'dev',
        baseUrl: 'http://localhost',
        authConfig: { type: 'bearer', token: 'my-token' },
      });

      expect(getAuthorizationHeader(env)).toBe('Bearer my-token');
    });

    it('should use custom prefix for bearer auth', () => {
      const env = createEnvironmentConfig({
        id: 'env-1',
        specId: 'spec-1',
        name: 'dev',
        baseUrl: 'http://localhost',
        authConfig: { type: 'bearer', token: 'my-token', prefix: 'Token' },
      });

      expect(getAuthorizationHeader(env)).toBe('Token my-token');
    });

    it('should return Bearer header for oauth2', () => {
      const env = createEnvironmentConfig({
        id: 'env-1',
        specId: 'spec-1',
        name: 'dev',
        baseUrl: 'http://localhost',
        authConfig: { type: 'oauth2', accessToken: 'oauth-token' },
      });

      expect(getAuthorizationHeader(env)).toBe('Bearer oauth-token');
    });
  });

  describe('buildUrl', () => {
    it('should build URL correctly', () => {
      const env = createEnvironmentConfig({
        id: 'env-1',
        specId: 'spec-1',
        name: 'dev',
        baseUrl: 'https://api.example.com',
      });

      expect(buildUrl(env, '/users')).toBe('https://api.example.com/users');
      expect(buildUrl(env, 'users')).toBe('https://api.example.com/users');
    });

    it('should handle trailing slash in base URL', () => {
      const env = createEnvironmentConfig({
        id: 'env-1',
        specId: 'spec-1',
        name: 'dev',
        baseUrl: 'https://api.example.com/',
      });

      expect(buildUrl(env, '/users')).toBe('https://api.example.com/users');
    });
  });

  describe('replaceVariables', () => {
    it('should replace variables in string', () => {
      const env = createEnvironmentConfig({
        id: 'env-1',
        specId: 'spec-1',
        name: 'dev',
        baseUrl: 'http://localhost',
        variables: {
          userId: '12345',
          apiVersion: 'v2',
        },
      });

      expect(replaceVariables(env, '/api/{{apiVersion}}/users/{{userId}}')).toBe('/api/v2/users/12345');
    });

    it('should leave unmatched variables unchanged', () => {
      const env = createEnvironmentConfig({
        id: 'env-1',
        specId: 'spec-1',
        name: 'dev',
        baseUrl: 'http://localhost',
        variables: { known: 'value' },
      });

      expect(replaceVariables(env, '{{known}}/{{unknown}}')).toBe('value/{{unknown}}');
    });
  });
});
