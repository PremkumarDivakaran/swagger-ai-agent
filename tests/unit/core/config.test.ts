/**
 * Unit tests for config module
 */

import { loadConfig, resetConfig, AppConfig } from '../../../src/core/config';
import { resetEnv } from '../../../src/core/env';

describe('Config', () => {
  beforeEach(() => {
    // Reset singletons before each test
    resetConfig();
    resetEnv();
    
    // Set minimal required env vars
    process.env.NODE_ENV = 'test';
    process.env.PORT = '3002';
    process.env.LOG_LEVEL = 'error';
  });

  afterEach(() => {
    resetConfig();
    resetEnv();
  });

  describe('loadConfig', () => {
    it('should load configuration with default values', () => {
      const config = loadConfig();
      
      expect(config).toBeDefined();
      expect(config.server).toBeDefined();
      expect(config.logging).toBeDefined();
      expect(config.swagger).toBeDefined();
      expect(config.execution).toBeDefined();
      expect(config.llm).toBeDefined();
      expect(config.mcp).toBeDefined();
    });

    it('should use PORT from environment', () => {
      process.env.PORT = '4000';
      resetEnv();
      
      const config = loadConfig();
      
      expect(config.server.port).toBe(4000);
    });

    it('should use LOG_LEVEL from environment', () => {
      process.env.LOG_LEVEL = 'debug';
      resetEnv();
      
      const config = loadConfig();
      
      expect(config.logging.level).toBe('debug');
    });

    it('should include env object', () => {
      const config = loadConfig();
      
      expect(config.env).toBeDefined();
      expect(config.env.NODE_ENV).toBe('test');
    });
  });

  describe('test environment config', () => {
    it('should use test-specific settings', () => {
      const config = loadConfig();
      
      // Test config has specific settings
      expect(config.execution.timeout).toBeDefined();
      expect(config.execution.maxRetries).toBeDefined();
      expect(config.logging.level).toBe('error');
    });
  });
});
