/**
 * Application configuration loader
 * Merges environment-specific config with default config
 */

import { getEnv, Env } from './env';
import { defaultConfig, DefaultConfig } from '../../config/default';
import { developmentConfig } from '../../config/development';
import { productionConfig } from '../../config/production';
import { testConfig } from '../../config/test';

/**
 * Application configuration interface
 */
export interface AppConfig extends DefaultConfig {
  env: Env;
}

/**
 * Gets the environment-specific configuration
 * @param nodeEnv - The current NODE_ENV value
 * @returns Environment-specific configuration object
 */
function getEnvironmentConfig(nodeEnv: string): DefaultConfig {
  switch (nodeEnv) {
    case 'production':
      return productionConfig;
    case 'test':
      return testConfig;
    case 'development':
    default:
      return developmentConfig;
  }
}

/**
 * Loads and merges all configuration
 * @returns Complete application configuration
 */
export function loadConfig(): AppConfig {
  const env = getEnv();
  const envConfig = getEnvironmentConfig(env.NODE_ENV);

  return {
    ...defaultConfig,
    ...envConfig,
    server: {
      ...defaultConfig.server,
      ...envConfig.server,
      port: env.PORT,
    },
    logging: {
      ...defaultConfig.logging,
      ...envConfig.logging,
      level: env.LOG_LEVEL,
    },
    swagger: {
      ...defaultConfig.swagger,
      ...envConfig.swagger,
      uploadMaxSize: env.SWAGGER_UPLOAD_MAX_SIZE,
      cacheTtl: env.SWAGGER_CACHE_TTL,
    },
    execution: {
      ...defaultConfig.execution,
      ...envConfig.execution,
      timeout: env.EXECUTION_TIMEOUT,
      maxRetries: env.EXECUTION_MAX_RETRIES,
    },
    llm: {
      ...defaultConfig.llm,
      ...envConfig.llm,
      provider: env.LLM_PROVIDER,
      apiKey: env.LLM_API_KEY || '',
      model: env.LLM_MODEL || defaultConfig.llm.model,
      baseUrl: env.LLM_BASE_URL || defaultConfig.llm.baseUrl,
      apiVersion: env.LLM_API_VERSION || defaultConfig.llm.apiVersion,
      deploymentName: env.LLM_DEPLOYMENT_NAME || defaultConfig.llm.deploymentName,
      maxTokens: env.LLM_MAX_TOKENS || defaultConfig.llm.maxTokens,
      temperature: env.LLM_TEMPERATURE || defaultConfig.llm.temperature,
    },
    mcp: {
      ...defaultConfig.mcp,
      ...envConfig.mcp,
      enabled: env.MCP_ENABLED,
    },
    env,
  };
}

/**
 * Singleton instance of application configuration
 */
let configInstance: AppConfig | null = null;

/**
 * Gets the singleton configuration instance
 * @returns Complete application configuration
 */
export function getConfig(): AppConfig {
  if (!configInstance) {
    configInstance = loadConfig();
  }
  return configInstance;
}

/**
 * Resets the configuration instance (useful for testing)
 */
export function resetConfig(): void {
  configInstance = null;
}
