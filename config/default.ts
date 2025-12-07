/**
 * Default configuration settings
 * These values are used as fallbacks when environment-specific config is not available
 */

export const defaultConfig = {
  server: {
    port: 3001,
    host: 'localhost',
  },
  logging: {
    level: 'info',
    format: 'json',
  },
  swagger: {
    uploadMaxSize: '10mb',
    cacheTtl: 3600,
    supportedVersions: ['2.0', '3.0', '3.1'],
  },
  execution: {
    timeout: 30000,
    maxRetries: 3,
  },
  llm: {
    provider: 'openai',
    apiKey: '',
    model: 'gpt-4',
    baseUrl: '',
    apiVersion: '',
    deploymentName: '',
    maxTokens: 2048,
    temperature: 0.7,
    maxRetries: 3,
    timeout: 60000,
  },
  mcp: {
    enabled: true,
    timeout: 30000,
  },
};

export type DefaultConfig = typeof defaultConfig;
