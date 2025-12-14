// API Configuration
export const apiConfig = {
  baseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001',
  pollingInterval: Number(import.meta.env.VITE_POLLING_INTERVAL) || 2000,
  timeout: 30000,
};

export const endpoints = {
  // Health endpoint
  health: '/api/health',
  
  // Spec endpoints
  spec: {
    import: '/api/spec/import',
    list: '/api/spec',
    get: (specId: string) => `/api/spec/${specId}`,
    operations: (specId: string) => `/api/spec/${specId}/operations`,
    tags: (specId: string) => `/api/spec/${specId}/tags`,
    delete: (specId: string) => `/api/spec/${specId}`,
    validate: '/api/spec/validate',
  },
  
  // Environment endpoints
  environment: {
    create: '/api/environment',
    get: (envId: string) => `/api/environment/${envId}`,
    update: (envId: string) => `/api/environment/${envId}`,
    delete: (envId: string) => `/api/environment/${envId}`,
    list: (specId: string) => `/api/spec/${specId}/environments`,
  },
  
  // Execution endpoints
  execution: {
    plan: '/api/execution/plan',
    run: '/api/execution/run',
    status: (runId: string) => `/api/execution/status/${runId}`,
    retryFailed: '/api/execution/retry-failed',
  },
};
