/**
 * Environment Routes
 * API routes for environment management
 */

import { Router } from 'express';
import { EnvironmentController } from '../controllers/environment.controller';
import {
  validateCreateEnvironment,
  validateUpdateEnvironment,
  validateEnvIdParam,
  validateSpecIdParamForEnv,
} from '../validators/environment.validator';
import {
  CreateEnvironmentUseCase,
  GetEnvironmentUseCase,
  UpdateEnvironmentUseCase,
  DeleteEnvironmentUseCase,
} from '../../application/environment';
import {
  InMemoryEnvironmentRepository,
  InMemorySpecRepository,
} from '../../infrastructure/persistence';

// Get shared repository instances
// In a production app, this would use dependency injection
import { specRepository, environmentRepository } from './shared-repositories';

// Create use cases
const createEnvironmentUseCase = new CreateEnvironmentUseCase(environmentRepository, specRepository);
const getEnvironmentUseCase = new GetEnvironmentUseCase(environmentRepository, specRepository);
const updateEnvironmentUseCase = new UpdateEnvironmentUseCase(environmentRepository);
const deleteEnvironmentUseCase = new DeleteEnvironmentUseCase(environmentRepository);

// Create controller
const controller = new EnvironmentController(
  createEnvironmentUseCase,
  getEnvironmentUseCase,
  updateEnvironmentUseCase,
  deleteEnvironmentUseCase
);

const router = Router();

/**
 * @route POST /environment
 * @desc Create a new environment
 * @access Public
 */
router.post('/', validateCreateEnvironment, controller.createEnvironment);

/**
 * @route GET /environment/:envId
 * @desc Get environment by ID
 * @access Public
 */
router.get('/:envId', validateEnvIdParam, controller.getEnvironment);

/**
 * @route PUT /environment/:envId
 * @desc Update an environment
 * @access Public
 */
router.put('/:envId', validateEnvIdParam, validateUpdateEnvironment, controller.updateEnvironment);

/**
 * @route DELETE /environment/:envId
 * @desc Delete an environment
 * @access Public
 */
router.delete('/:envId', validateEnvIdParam, controller.deleteEnvironment);

export default router;

/**
 * Create spec environment routes
 * These routes are mounted under /spec/:specId/environments
 */
export function createSpecEnvironmentRoutes(): Router {
  const specEnvRouter = Router({ mergeParams: true });

  /**
   * @route GET /spec/:specId/environments
   * @desc List environments for a spec
   * @access Public
   */
  specEnvRouter.get('/', validateSpecIdParamForEnv, controller.listEnvironments);

  return specEnvRouter;
}
