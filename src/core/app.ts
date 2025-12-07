/**
 * Express application setup
 * Configures middleware, routes, and error handling
 */

import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import { ILogger } from '../infrastructure/logging';
import { AppConfig } from './config';
import { errorHandler } from './middlewares/errorHandler';
import { requestLogger } from './middlewares/requestLogger';
import { ApiResponse, HealthCheckResponse } from './types';
import apiRoutes from '../api/routes';

/**
 * Application dependencies interface
 */
export interface AppDependencies {
  config: AppConfig;
  logger: ILogger;
}

/**
 * Creates and configures the Express application
 * @param dependencies - Application dependencies
 * @returns Configured Express application
 */
export function createApp(dependencies: AppDependencies): Application {
  const { config, logger } = dependencies;
  const app = express();

  // CORS - Allow cross-origin requests
  app.use(cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl)
      if (!origin) return callback(null, true);
      
      // Allow localhost for development
      if (/^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)) {
        return callback(null, true);
      }
      
      // In production, you would add specific allowed origins
      callback(null, true);
    },
    credentials: true,
  }));

  // Basic middleware
  app.use(express.json({ limit: config.swagger.uploadMaxSize }));
  app.use(express.urlencoded({ extended: true }));

  // Request logging
  app.use(requestLogger(logger));

  // Health check endpoint
  app.get('/health', (_req: Request, res: Response) => {
    const response: ApiResponse<HealthCheckResponse> = {
      success: true,
      data: {
        status: 'healthy',
        version: '1.0.0',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        services: [
          { name: 'api', status: 'up' },
          { name: 'mcp', status: config.mcp.enabled ? 'up' : 'down' },
        ],
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    };
    res.json(response);
  });

  // Root endpoint
  app.get('/', (_req: Request, res: Response) => {
    const response: ApiResponse<{ message: string; documentation: string }> = {
      success: true,
      data: {
        message: 'Swagger AI Agent API',
        documentation: '/api/docs',
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    };
    res.json(response);
  });

  // API routes
  app.use('/api', apiRoutes);

  // 404 handler
  app.use((_req: Request, res: Response) => {
    const response: ApiResponse = {
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: 'The requested resource was not found',
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    };
    res.status(404).json(response);
  });

  // Global error handler (must be last)
  app.use(errorHandler(logger));

  return app;
}
