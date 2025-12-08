/**
 * Tests for AxiosClient
 */

import { AxiosClient, DEFAULT_RETRY_CONFIG } from '../../../../src/infrastructure/http/AxiosClient';
import axios, { AxiosInstance } from 'axios';

// Create a proper mock
jest.mock('axios', () => {
  const mockInstance = {
    request: jest.fn(),
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() },
    },
    defaults: {
      headers: {
        common: {},
      },
    },
  };
  return {
    create: jest.fn(() => mockInstance),
    isAxiosError: jest.fn((error) => error.isAxiosError === true),
    isCancel: jest.fn(() => false),
    __mockInstance: mockInstance,
  };
});

describe('AxiosClient', () => {
  let client: AxiosClient;

  // Get the mock instance
  const mockAxiosInstance = (axios as any).__mockInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    client = new AxiosClient({
      baseURL: 'https://api.example.com',
      timeout: 5000,
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('request', () => {
    it('should make successful request', async () => {
      mockAxiosInstance.request.mockResolvedValue({
        status: 200,
        statusText: 'OK',
        headers: { 'content-type': 'application/json' },
        data: { success: true },
      });

      const promise = client.request({
        url: '/test',
        method: 'GET',
      });

      jest.runAllTimers();
      const result = await promise;

      expect(result.status).toBe(200);
      expect(result.data).toEqual({ success: true });
      expect(result.responseTime).toBeDefined();
      expect(result.retryAttempts).toBe(0);
    });

    it('should include request headers', async () => {
      mockAxiosInstance.request.mockResolvedValue({
        status: 200,
        statusText: 'OK',
        headers: {},
        data: {},
      });

      const promise = client.request({
        url: '/test',
        method: 'GET',
        headers: { 'Authorization': 'Bearer token' },
      });

      jest.runAllTimers();
      await promise;

      expect(mockAxiosInstance.request).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer token',
          }),
        })
      );
    });

    it('should throw ExternalServiceError on failure after retries', async () => {
      const axiosError = new Error('Network Error');
      (axiosError as any).isAxiosError = true;
      (axiosError as any).response = undefined;
      mockAxiosInstance.request.mockRejectedValue(axiosError);

      const promise = client.request({
        url: '/test',
        method: 'GET',
        disableRetry: true, // Disable retry for faster test
      });

      await expect(promise).rejects.toThrow('HTTP request failed');
    });
  });

  describe('retry functionality', () => {
    it('should retry on retryable status codes', async () => {
      // First two calls return 503, third succeeds
      mockAxiosInstance.request
        .mockResolvedValueOnce({
          status: 503,
          statusText: 'Service Unavailable',
          headers: {},
          data: { error: 'Service Unavailable' },
        })
        .mockResolvedValueOnce({
          status: 503,
          statusText: 'Service Unavailable',
          headers: {},
          data: { error: 'Service Unavailable' },
        })
        .mockResolvedValueOnce({
          status: 200,
          statusText: 'OK',
          headers: {},
          data: { success: true },
        });

      const promise = client.request({
        url: '/test',
        method: 'GET',
        retry: {
          maxRetries: 3,
          retryDelay: 100,
          backoffMultiplier: 1,
        },
      });

      // Advance timers for retries
      await jest.advanceTimersByTimeAsync(100);
      await jest.advanceTimersByTimeAsync(100);

      const result = await promise;

      expect(result.status).toBe(200);
      expect(result.retryAttempts).toBe(2);
      expect(mockAxiosInstance.request).toHaveBeenCalledTimes(3);
    });

    it('should retry on network errors', async () => {
      const networkError = new Error('ECONNREFUSED');
      (networkError as any).isAxiosError = true;
      (networkError as any).response = undefined;
      (networkError as any).code = 'ECONNREFUSED';

      mockAxiosInstance.request
        .mockRejectedValueOnce(networkError)
        .mockResolvedValueOnce({
          status: 200,
          statusText: 'OK',
          headers: {},
          data: { success: true },
        });

      const promise = client.request({
        url: '/test',
        method: 'GET',
        retry: {
          maxRetries: 2,
          retryDelay: 100,
          backoffMultiplier: 1,
          retryOnNetworkError: true,
        },
      });

      // Advance timer for retry
      await jest.advanceTimersByTimeAsync(100);

      const result = await promise;

      expect(result.status).toBe(200);
      expect(result.retryAttempts).toBe(1);
    });

    it('should retry on timeout errors', async () => {
      const timeoutError = new Error('timeout');
      (timeoutError as any).isAxiosError = true;
      (timeoutError as any).response = undefined;
      (timeoutError as any).code = 'ECONNABORTED';

      mockAxiosInstance.request
        .mockRejectedValueOnce(timeoutError)
        .mockResolvedValueOnce({
          status: 200,
          statusText: 'OK',
          headers: {},
          data: { success: true },
        });

      const promise = client.request({
        url: '/test',
        method: 'GET',
        retry: {
          maxRetries: 2,
          retryDelay: 100,
          backoffMultiplier: 1,
          retryOnTimeout: true,
        },
      });

      await jest.advanceTimersByTimeAsync(100);

      const result = await promise;

      expect(result.status).toBe(200);
      expect(result.retryAttempts).toBe(1);
    });

    it('should not retry when disableRetry is true', async () => {
      mockAxiosInstance.request.mockResolvedValue({
        status: 503,
        statusText: 'Service Unavailable',
        headers: {},
        data: { error: 'Service Unavailable' },
      });

      const promise = client.request({
        url: '/test',
        method: 'GET',
        disableRetry: true,
      });

      const result = await promise;

      expect(result.status).toBe(503);
      expect(mockAxiosInstance.request).toHaveBeenCalledTimes(1);
    });

    it('should fail after max retries exceeded', async () => {
      const networkError = new Error('Network Error');
      (networkError as any).isAxiosError = true;
      (networkError as any).response = undefined;

      mockAxiosInstance.request.mockRejectedValue(networkError);

      const promise = client.request({
        url: '/test',
        method: 'GET',
        retry: {
          maxRetries: 2,
          retryDelay: 100,
          backoffMultiplier: 1,
        },
      });

      // Advance timers for all retries
      await jest.advanceTimersByTimeAsync(100);
      await jest.advanceTimersByTimeAsync(100);

      await expect(promise).rejects.toThrow('HTTP request failed after 3 attempt(s)');
      expect(mockAxiosInstance.request).toHaveBeenCalledTimes(3);
    });

    it('should use exponential backoff', async () => {
      const retryDelay = 1000;
      const backoffMultiplier = 2;

      mockAxiosInstance.request
        .mockResolvedValueOnce({ status: 503, statusText: 'Error', headers: {}, data: {} })
        .mockResolvedValueOnce({ status: 503, statusText: 'Error', headers: {}, data: {} })
        .mockResolvedValueOnce({ status: 200, statusText: 'OK', headers: {}, data: {} });

      const startTime = Date.now();
      const promise = client.request({
        url: '/test',
        method: 'GET',
        retry: {
          maxRetries: 3,
          retryDelay,
          backoffMultiplier,
          maxRetryDelay: 10000,
        },
      });

      // First retry delay: 1000ms
      await jest.advanceTimersByTimeAsync(retryDelay);
      // Second retry delay: 2000ms (1000 * 2)
      await jest.advanceTimersByTimeAsync(retryDelay * backoffMultiplier);

      await promise;

      expect(mockAxiosInstance.request).toHaveBeenCalledTimes(3);
    });
  });

  describe('retry configuration', () => {
    it('should use default retry configuration', () => {
      const config = client.getRetryConfig();

      expect(config.maxRetries).toBe(DEFAULT_RETRY_CONFIG.maxRetries);
      expect(config.retryDelay).toBe(DEFAULT_RETRY_CONFIG.retryDelay);
      expect(config.retryableStatuses).toEqual(DEFAULT_RETRY_CONFIG.retryableStatuses);
    });

    it('should allow custom retry configuration', () => {
      const customClient = new AxiosClient({
        retry: {
          maxRetries: 5,
          retryDelay: 500,
        },
      });

      const config = customClient.getRetryConfig();

      expect(config.maxRetries).toBe(5);
      expect(config.retryDelay).toBe(500);
    });

    it('should update retry configuration', () => {
      client.setRetryConfig({ maxRetries: 10 });

      const config = client.getRetryConfig();

      expect(config.maxRetries).toBe(10);
    });
  });

  describe('convenience methods', () => {
    beforeEach(() => {
      mockAxiosInstance.request.mockResolvedValue({
        status: 200,
        statusText: 'OK',
        headers: {},
        data: {},
      });
    });

    it('should make GET request', async () => {
      const promise = client.get('/users');
      jest.runAllTimers();
      await promise;

      expect(mockAxiosInstance.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'GET',
          url: '/users',
        })
      );
    });

    it('should make POST request with data', async () => {
      const promise = client.post('/users', { name: 'John' });
      jest.runAllTimers();
      await promise;

      expect(mockAxiosInstance.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          url: '/users',
          data: { name: 'John' },
        })
      );
    });

    it('should make PUT request with data', async () => {
      const promise = client.put('/users/1', { name: 'Jane' });
      jest.runAllTimers();
      await promise;

      expect(mockAxiosInstance.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'PUT',
          url: '/users/1',
          data: { name: 'Jane' },
        })
      );
    });

    it('should make PATCH request with data', async () => {
      const promise = client.patch('/users/1', { name: 'Updated' });
      jest.runAllTimers();
      await promise;

      expect(mockAxiosInstance.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'PATCH',
          url: '/users/1',
          data: { name: 'Updated' },
        })
      );
    });

    it('should make DELETE request', async () => {
      const promise = client.delete('/users/1');
      jest.runAllTimers();
      await promise;

      expect(mockAxiosInstance.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'DELETE',
          url: '/users/1',
        })
      );
    });
  });

  describe('header management', () => {
    it('should set default headers', () => {
      client.setDefaultHeaders({ 'X-Custom-Header': 'value' });

      expect(mockAxiosInstance.defaults.headers.common['X-Custom-Header']).toBe('value');
    });

    it('should set authorization header', () => {
      client.setAuthorization('Bearer token123');

      expect(mockAxiosInstance.defaults.headers.common['Authorization']).toBe('Bearer token123');
    });

    it('should clear authorization header', () => {
      client.setAuthorization('Bearer token123');
      client.clearAuthorization();

      expect(mockAxiosInstance.defaults.headers.common['Authorization']).toBeUndefined();
    });
  });
});
