/**
 * Development environment configuration
 * Extends default config with development-specific settings
 */

import { defaultConfig } from './default';

export const developmentConfig = {
  ...defaultConfig,
  server: {
    ...defaultConfig.server,
    port: 3001,
  },
  logging: {
    ...defaultConfig.logging,
    level: 'debug',
    format: 'pretty',
  },
  execution: {
    ...defaultConfig.execution,
    timeout: 60000, // Longer timeout for development
  },
  swagger: {
    ...defaultConfig.swagger,
    cacheTtl: 0, // No cache in development
  },
};

export type DevelopmentConfig = typeof developmentConfig;
