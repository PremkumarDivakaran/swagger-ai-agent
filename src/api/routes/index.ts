/**
 * API routes index
 * Aggregates all route modules
 */

import { Router, Request, Response } from 'express';
import { ApiResponse } from '../../core/types';
import specRoutes from './spec.routes';
import environmentRoutes, { createSpecEnvironmentRoutes } from './environment.routes';
import executionRoutes from './execution.routes';
import testgenRoutes from './testgen.routes';
import mcpRoutes from './mcp.routes';
import settingsRoutes from './settings.routes';

const router = Router();

/**
 * Health check endpoint (API level)
 */
router.get('/health', (_req: Request, res: Response) => {
  const response: ApiResponse<{
    status: string;
    timestamp: string;
    uptime: number;
  }> = {
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    },
    meta: {
      timestamp: new Date().toISOString(),
    },
  };
  res.status(200).json(response);
});

/**
 * API documentation endpoint (placeholder)
 */
router.get('/docs', (_req: Request, res: Response) => {
  const response: ApiResponse<{
    message: string;
    endpoints: {
      method: string;
      path: string;
      description: string;
    }[];
  }> = {
    success: true,
    data: {
      message: 'Swagger AI Agent API Documentation',
      endpoints: [
        { method: 'POST', path: '/api/spec/import', description: 'Import a Swagger/OpenAPI spec' },
        { method: 'POST', path: '/api/spec/validate', description: 'Validate a spec' },
        { method: 'GET', path: '/api/spec/:specId', description: 'Get spec metadata' },
        { method: 'GET', path: '/api/spec/:specId/operations', description: 'List operations in a spec' },
        { method: 'GET', path: '/api/spec/:specId/tags', description: 'List tags in a spec' },
        { method: 'GET', path: '/api/spec/:specId/environments', description: 'List environments for a spec' },
        { method: 'POST', path: '/api/environment', description: 'Create an environment' },
        { method: 'GET', path: '/api/environment/:envId', description: 'Get environment by ID' },
        { method: 'PUT', path: '/api/environment/:envId', description: 'Update an environment' },
        { method: 'DELETE', path: '/api/environment/:envId', description: 'Delete an environment' },
        { method: 'POST', path: '/api/execution/plan', description: 'Create a run plan' },
        { method: 'POST', path: '/api/execution/run', description: 'Execute a run' },
        { method: 'GET', path: '/api/execution/status/:runId', description: 'Get run status' },
        { method: 'POST', path: '/api/testgen/agent/run', description: 'Start AI REST Assured run' },
        { method: 'GET', path: '/api/testgen/agent/run/:runId', description: 'Poll AI REST Assured status' },
        { method: 'POST', path: '/api/testgen/execute-tests', description: 'Execute tests' },
        { method: 'GET', path: '/api/testgen/execution/:executionId', description: 'Get execution status' },
        { method: 'POST', path: '/api/mcp/swagger/list-operations', description: 'MCP: List operations' },
        { method: 'POST', path: '/api/mcp/swagger/plan-run', description: 'MCP: Plan a run' },
        { method: 'POST', path: '/api/mcp/swagger/execute-operation', description: 'MCP: Execute operation' },
      ],
    },
    meta: {
      timestamp: new Date().toISOString(),
    },
  };
  res.status(200).json(response);
});

// Route modules
router.use('/spec', specRoutes);
router.use('/environment', environmentRoutes);

// Mount spec-specific environment routes
router.use('/spec/:specId/environments', createSpecEnvironmentRoutes());

// Execution routes
router.use('/execution', executionRoutes);

// Test generation routes
router.use('/testgen', testgenRoutes);

// MCP routes
router.use('/mcp', mcpRoutes);

// Settings routes
router.use('/settings', settingsRoutes);

export default router;
