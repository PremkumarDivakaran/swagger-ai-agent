/**
 * Shared Repository Instances
 * Centralized repository instances for dependency injection
 * 
 * In a production app, this would use a proper DI container.
 * For now, we use singleton instances to share state between routes.
 */

import {
  InMemorySpecRepository,
  InMemoryEnvironmentRepository,
  InMemoryRunPlanRepository,
  InMemoryRunReportRepository,
} from '../../infrastructure/persistence';
import {
  SwaggerLoader,
  SwaggerParserAdapter,
  OpenApiNormalizer,
} from '../../infrastructure/swagger';
import { createAxiosHttpClient } from '../../infrastructure/http';

// Create shared repository instances (singletons)
export const specRepository = new InMemorySpecRepository();
export const environmentRepository = new InMemoryEnvironmentRepository();
export const runPlanRepository = new InMemoryRunPlanRepository();
export const runReportRepository = new InMemoryRunReportRepository();

// Create shared infrastructure instances
export const swaggerLoader = new SwaggerLoader();
export const swaggerParser = new SwaggerParserAdapter();
export const openApiNormalizer = new OpenApiNormalizer();

// Create HTTP client for API execution
export const httpClient = createAxiosHttpClient({
  timeout: 30000,
});
