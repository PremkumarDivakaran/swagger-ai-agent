/**
 * Unit tests for AxiosHttpClientAdapter
 */

import { AxiosHttpClientAdapter, createAxiosHttpClient } from '../../../../src/infrastructure/http/AxiosHttpClientAdapter';
import { AxiosClient } from '../../../../src/infrastructure/http/AxiosClient';

// Mock AxiosClient
jest.mock('../../../../src/infrastructure/http/AxiosClient', () => ({
  AxiosClient: jest.fn().mockImplementation(() => ({
    request: jest.fn(),
  })),
  createAxiosClient: jest.fn(() => ({
    request: jest.fn(),
  })),
}));

describe('AxiosHttpClientAdapter', () => {
  let adapter: AxiosHttpClientAdapter;
  let mockAxiosClient: jest.Mocked<AxiosClient>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockAxiosClient = {
      request: jest.fn(),
    } as unknown as jest.Mocked<AxiosClient>;
    
    (require('../../../../src/infrastructure/http/AxiosClient').createAxiosClient as jest.Mock)
      .mockReturnValue(mockAxiosClient);
    
    adapter = new AxiosHttpClientAdapter();
  });

  describe('request', () => {
    it('should make a request and return formatted response', async () => {
      mockAxiosClient.request.mockResolvedValue({
        status: 200,
        statusText: 'OK',
        headers: { 'content-type': 'application/json' },
        data: { message: 'Success' },
        responseTime: 123,
      });

      const response = await adapter.request({
        method: 'GET',
        url: 'https://api.example.com/test',
        headers: { 'Accept': 'application/json' },
      });

      expect(response).toEqual({
        statusCode: 200,
        statusText: 'OK',
        headers: { 'content-type': 'application/json' },
        body: { message: 'Success' },
        responseTime: 123,
      });
    });

    it('should pass correct parameters to AxiosClient', async () => {
      mockAxiosClient.request.mockResolvedValue({
        status: 201,
        statusText: 'Created',
        headers: {},
        data: { id: 1 },
        responseTime: 50,
      });

      await adapter.request({
        method: 'post',
        url: 'https://api.example.com/items',
        headers: { 'Content-Type': 'application/json' },
        params: { category: 'electronics' },
        body: { name: 'Test Item' },
        timeout: 5000,
      });

      expect(mockAxiosClient.request).toHaveBeenCalledWith({
        url: 'https://api.example.com/items',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        params: { category: 'electronics' },
        data: { name: 'Test Item' },
        timeout: 5000,
      });
    });

    it('should use default timeout when not specified', async () => {
      mockAxiosClient.request.mockResolvedValue({
        status: 200,
        statusText: 'OK',
        headers: {},
        data: null,
        responseTime: 10,
      });

      await adapter.request({
        method: 'GET',
        url: 'https://api.example.com/test',
      });

      expect(mockAxiosClient.request).toHaveBeenCalledWith(
        expect.objectContaining({
          timeout: 30000,
        })
      );
    });

    it('should normalize method to uppercase', async () => {
      mockAxiosClient.request.mockResolvedValue({
        status: 200,
        statusText: 'OK',
        headers: {},
        data: null,
        responseTime: 10,
      });

      await adapter.request({
        method: 'delete',
        url: 'https://api.example.com/items/1',
      });

      expect(mockAxiosClient.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'DELETE',
        })
      );
    });

    it('should re-throw errors from AxiosClient', async () => {
      const error = new Error('Connection refused');
      mockAxiosClient.request.mockRejectedValue(error);

      await expect(adapter.request({
        method: 'GET',
        url: 'https://api.example.com/test',
      })).rejects.toThrow('Connection refused');
    });
  });

  describe('createAxiosHttpClient factory', () => {
    it('should create an adapter instance', () => {
      const client = createAxiosHttpClient();
      expect(client).toBeDefined();
      expect(typeof client.request).toBe('function');
    });

    it('should pass config to AxiosClient', () => {
      const config = {
        baseURL: 'https://api.example.com',
        timeout: 10000,
        headers: { 'X-API-Key': 'test-key' },
      };

      createAxiosHttpClient(config);

      expect(require('../../../../src/infrastructure/http/AxiosClient').createAxiosClient)
        .toHaveBeenCalledWith(config);
    });
  });
});
