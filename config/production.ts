/**
 * Production environment configuration
 * Extends default config with production-specific settings
 */

import { defaultConfig } from './default';

export const productionConfig = {
  ...defaultConfig,
  server: {
    ...defaultConfig.server,
    port: parseInt(process.env.PORT || '3001', 10),
  },
  logging: {
    ...defaultConfig.logging,
    level: 'info',
    format: 'json',
  },
  execution: {
    ...defaultConfig.execution,
    timeout: 30000,
  },
  swagger: {
    ...defaultConfig.swagger,
    cacheTtl: 3600,
  },
};

export type ProductionConfig = typeof productionConfig;
