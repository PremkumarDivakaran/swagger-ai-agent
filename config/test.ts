/**
 * Test environment configuration
 * Extends default config with test-specific settings
 */

import { defaultConfig } from './default';

export const testConfig = {
  ...defaultConfig,
  server: {
    ...defaultConfig.server,
    port: 3002,
  },
  logging: {
    ...defaultConfig.logging,
    level: 'error',
    format: 'json',
  },
  execution: {
    ...defaultConfig.execution,
    timeout: 10000,
    maxRetries: 1,
  },
  swagger: {
    ...defaultConfig.swagger,
    cacheTtl: 0,
  },
  llm: {
    ...defaultConfig.llm,
    provider: 'mock',
  },
};

export type TestConfig = typeof testConfig;
