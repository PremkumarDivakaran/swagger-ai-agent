/**
 * Tests for Rate Limiter Middleware
 */

import { Request, Response, NextFunction } from 'express';
import {
  rateLimiter,
  createRouteRateLimiter,
  getRateLimitStore,
  DEFAULT_RATE_LIMIT_CONFIG,
} from '../../../../src/core/middlewares/rateLimiter';

describe('RateLimiter', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;
  let responseJson: jest.Mock;
  let setHeader: jest.Mock;

  beforeEach(() => {
    // Reset rate limit store
    getRateLimitStore().reset();

    responseJson = jest.fn();
    setHeader = jest.fn();

    mockRequest = {
      ip: '192.168.1.1',
      headers: {},
      socket: {
        remoteAddress: '192.168.1.1',
      } as any,
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: responseJson,
      setHeader,
    };

    nextFunction = jest.fn();
  });

  describe('rateLimiter middleware', () => {
    it('should allow requests within limit', () => {
      const middleware = rateLimiter({
        maxRequests: 10,
        windowMs: 60000,
      });

      middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should block requests exceeding limit', () => {
      const middleware = rateLimiter({
        maxRequests: 3,
        windowMs: 60000,
      });

      // Make 3 requests (should all pass)
      for (let i = 0; i < 3; i++) {
        middleware(mockRequest as Request, mockResponse as Response, nextFunction);
      }

      expect(nextFunction).toHaveBeenCalledTimes(3);

      // Reset next function
      nextFunction = jest.fn();

      // 4th request should be blocked
      middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(429);
      expect(responseJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'RATE_LIMIT_EXCEEDED',
          }),
        })
      );
    });

    it('should set rate limit headers when enabled', () => {
      const middleware = rateLimiter({
        maxRequests: 10,
        windowMs: 60000,
        headers: true,
      });

      middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', '10');
      expect(setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', expect.any(String));
      expect(setHeader).toHaveBeenCalledWith('X-RateLimit-Reset', expect.any(String));
    });

    it('should not set headers when disabled', () => {
      const middleware = rateLimiter({
        maxRequests: 10,
        windowMs: 60000,
        headers: false,
      });

      middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(setHeader).not.toHaveBeenCalled();
    });

    it('should use custom key generator', () => {
      const keyGenerator = jest.fn().mockReturnValue('custom-key');
      const middleware = rateLimiter({
        maxRequests: 10,
        windowMs: 60000,
        keyGenerator,
      });

      middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(keyGenerator).toHaveBeenCalledWith(mockRequest);
      expect(nextFunction).toHaveBeenCalled();
    });

    it('should skip rate limiting when skip function returns true', () => {
      const skip = jest.fn().mockReturnValue(true);
      const middleware = rateLimiter({
        maxRequests: 0, // Would block all requests
        windowMs: 60000,
        skip,
      });

      middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(skip).toHaveBeenCalledWith(mockRequest);
      expect(nextFunction).toHaveBeenCalled();
    });

    it('should use custom handler when rate limit exceeded', () => {
      const customHandler = jest.fn();
      const middleware = rateLimiter({
        maxRequests: 1,
        windowMs: 60000,
        handler: customHandler,
      });

      // First request passes
      middleware(mockRequest as Request, mockResponse as Response, nextFunction);
      
      // Second request should use custom handler
      middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(customHandler).toHaveBeenCalledWith(mockRequest, mockResponse);
    });

    it('should use custom message', () => {
      const customMessage = 'Custom rate limit message';
      const middleware = rateLimiter({
        maxRequests: 1,
        windowMs: 60000,
        message: customMessage,
      });

      // Exhaust rate limit
      middleware(mockRequest as Request, mockResponse as Response, nextFunction);
      middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(responseJson).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            message: customMessage,
          }),
        })
      );
    });

    it('should set Retry-After header when limit exceeded', () => {
      const middleware = rateLimiter({
        maxRequests: 1,
        windowMs: 60000,
        headers: true,
      });

      // Exhaust rate limit
      middleware(mockRequest as Request, mockResponse as Response, nextFunction);
      middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(setHeader).toHaveBeenCalledWith('Retry-After', expect.any(String));
    });
  });

  describe('IP detection', () => {
    it('should use X-Forwarded-For header if present', () => {
      mockRequest.headers = {
        'x-forwarded-for': '10.0.0.1, 10.0.0.2',
      };

      const middleware = rateLimiter({
        maxRequests: 10,
        windowMs: 60000,
      });

      middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
    });

    it('should use X-Real-IP header if present', () => {
      mockRequest.headers = {
        'x-real-ip': '10.0.0.5',
      };

      const middleware = rateLimiter({
        maxRequests: 10,
        windowMs: 60000,
      });

      middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
    });

    it('should fall back to req.ip', () => {
      (mockRequest as any).ip = '192.168.1.100';
      mockRequest.headers = {};

      const middleware = rateLimiter({
        maxRequests: 10,
        windowMs: 60000,
      });

      middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
    });
  });

  describe('createRouteRateLimiter', () => {
    it('should create a rate limiter with specified limits', () => {
      const middleware = createRouteRateLimiter(5, 30000);

      // Make 5 requests
      for (let i = 0; i < 5; i++) {
        middleware(mockRequest as Request, mockResponse as Response, nextFunction);
      }

      expect(nextFunction).toHaveBeenCalledTimes(5);

      // Reset next function
      nextFunction = jest.fn();

      // 6th request should be blocked
      middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(429);
    });
  });

  describe('getRateLimitStore', () => {
    it('should return store with size and reset methods', () => {
      const store = getRateLimitStore();

      expect(typeof store.size).toBe('function');
      expect(typeof store.reset).toBe('function');
    });

    it('should track store size', () => {
      const store = getRateLimitStore();
      const middleware = rateLimiter({
        maxRequests: 10,
        windowMs: 60000,
      });

      // Initial size should be 0
      expect(store.size()).toBe(0);

      // Make a request to add entry
      middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(store.size()).toBe(1);
    });

    it('should reset store', () => {
      const store = getRateLimitStore();
      const middleware = rateLimiter({
        maxRequests: 10,
        windowMs: 60000,
      });

      // Make a request to add entry
      middleware(mockRequest as Request, mockResponse as Response, nextFunction);
      expect(store.size()).toBe(1);

      // Reset store
      store.reset();
      expect(store.size()).toBe(0);
    });
  });

  describe('DEFAULT_RATE_LIMIT_CONFIG', () => {
    it('should have sensible defaults', () => {
      expect(DEFAULT_RATE_LIMIT_CONFIG.maxRequests).toBe(100);
      expect(DEFAULT_RATE_LIMIT_CONFIG.windowMs).toBe(60000);
      expect(DEFAULT_RATE_LIMIT_CONFIG.headers).toBe(true);
      expect(DEFAULT_RATE_LIMIT_CONFIG.message).toBeDefined();
    });
  });

  describe('different clients', () => {
    it('should track different IPs separately', () => {
      const middleware = rateLimiter({
        maxRequests: 2,
        windowMs: 60000,
      });

      const client1: Partial<Request> = {
        ip: '192.168.1.1',
        headers: {},
        socket: { remoteAddress: '192.168.1.1' } as any,
      };

      const client2: Partial<Request> = {
        ip: '192.168.1.2',
        headers: {},
        socket: { remoteAddress: '192.168.1.2' } as any,
      };

      // Client 1 makes 2 requests
      middleware(client1 as Request, mockResponse as Response, nextFunction);
      middleware(client1 as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalledTimes(2);

      // Reset next function
      nextFunction = jest.fn();

      // Client 1 is blocked
      middleware(client1 as Request, mockResponse as Response, nextFunction);
      expect(nextFunction).not.toHaveBeenCalled();

      // Reset next function
      nextFunction = jest.fn();

      // Client 2 should still be allowed
      middleware(client2 as Request, mockResponse as Response, nextFunction);
      expect(nextFunction).toHaveBeenCalled();
    });
  });
});
