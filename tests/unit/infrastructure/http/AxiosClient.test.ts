/**
 * Tests for AxiosClient
 */

import { AxiosClient } from '../../../../src/infrastructure/http/AxiosClient';
import axios, { AxiosInstance } from 'axios';

// Create a proper mock
jest.mock('axios', () => {
  const mockInstance = {
    request: jest.fn(),
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() },
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
    client = new AxiosClient({
      baseURL: 'https://api.example.com',
      timeout: 5000,
    });
  });

  describe('request', () => {
    it('should make successful request', async () => {
      mockAxiosInstance.request.mockResolvedValue({
        status: 200,
        statusText: 'OK',
        headers: { 'content-type': 'application/json' },
        data: { success: true },
      });

      const result = await client.request({
        url: '/test',
        method: 'GET',
      });

      expect(result.status).toBe(200);
      expect(result.data).toEqual({ success: true });
      expect(result.responseTime).toBeDefined();
    });

    it('should include request headers', async () => {
      mockAxiosInstance.request.mockResolvedValue({
        status: 200,
        statusText: 'OK',
        headers: {},
        data: {},
      });

      await client.request({
        url: '/test',
        method: 'GET',
        headers: { 'Authorization': 'Bearer token' },
      });

      expect(mockAxiosInstance.request).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer token',
          }),
        })
      );
    });

    it('should throw ExternalServiceError on failure', async () => {
      const axiosError = new Error('Network Error');
      (axiosError as any).isAxiosError = true;
      (axiosError as any).response = undefined;
      mockAxiosInstance.request.mockRejectedValue(axiosError);

      await expect(client.request({
        url: '/test',
        method: 'GET',
      })).rejects.toThrow('HTTP request failed');
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
      await client.get('/users');

      expect(mockAxiosInstance.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'GET',
          url: '/users',
        })
      );
    });

    it('should make POST request with data', async () => {
      await client.post('/users', { name: 'John' });

      expect(mockAxiosInstance.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          url: '/users',
          data: { name: 'John' },
        })
      );
    });

    it('should make PUT request with data', async () => {
      await client.put('/users/1', { name: 'Jane' });

      expect(mockAxiosInstance.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'PUT',
          url: '/users/1',
          data: { name: 'Jane' },
        })
      );
    });

    it('should make PATCH request with data', async () => {
      await client.patch('/users/1', { name: 'Updated' });

      expect(mockAxiosInstance.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'PATCH',
          url: '/users/1',
          data: { name: 'Updated' },
        })
      );
    });

    it('should make DELETE request', async () => {
      await client.delete('/users/1');

      expect(mockAxiosInstance.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'DELETE',
          url: '/users/1',
        })
      );
    });
  });
});
