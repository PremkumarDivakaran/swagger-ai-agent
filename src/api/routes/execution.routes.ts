/**
 * Execution Routes
 * Defines routes for execution API endpoints
 */

import { Router } from 'express';
import {
  validateCreateRunPlan,
  validateExecuteRun,
  validateGetRunStatusParams,
  validateGetRunStatusQuery,
  validateRetryFailed,
} from '../validators/execution.validator';
import { ExecutionController, createExecutionController } from '../controllers/execution.controller';
import {
  CreateRunPlanUseCase,
  ExecuteRunUseCase,
  GetRunStatusUseCase,
  RetryFailedUseCase,
} from '../../application/execution';
import {
  specRepository,
  environmentRepository,
  runPlanRepository,
  runReportRepository,
  httpClient,
} from './shared-repositories';

// Create use cases with shared repository instances
const createRunPlanUseCase = new CreateRunPlanUseCase({
  specRepository,
  environmentRepository,
  runPlanRepository,
});

const executeRunUseCase = new ExecuteRunUseCase({
  runPlanRepository,
  runReportRepository,
  environmentRepository,
  httpClient,
});

const getRunStatusUseCase = new GetRunStatusUseCase({
  runPlanRepository,
  runReportRepository,
});

const retryFailedUseCase = new RetryFailedUseCase({
  runPlanRepository,
  runReportRepository,
  environmentRepository,
  httpClient,
});

// Create controller
const executionController = createExecutionController({
  createRunPlanUseCase,
  executeRunUseCase,
  getRunStatusUseCase,
  retryFailedUseCase,
});

// Create router
const router = Router();

/**
 * POST /execution/plan
 * Creates a new run plan
 */
router.post(
  '/plan',
  validateCreateRunPlan,
  executionController.createRunPlan
);

/**
 * POST /execution/run
 * Executes a run plan
 */
router.post(
  '/run',
  validateExecuteRun,
  executionController.executeRun
);

/**
 * GET /execution/status/:runId
 * Gets the status of a run
 */
router.get(
  '/status/:runId',
  validateGetRunStatusParams,
  validateGetRunStatusQuery,
  executionController.getRunStatus
);

/**
 * POST /execution/retry-failed
 * Retries failed tests from a previous run
 */
router.post(
  '/retry-failed',
  validateRetryFailed,
  executionController.retryFailed
);

export default router;
