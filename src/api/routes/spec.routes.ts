/**
 * Spec Routes
 * API routes for spec management
 */

import { Router } from 'express';
import { SpecController } from '../controllers/spec.controller';
import {
  validateImportSpec,
  validateValidateSpec,
  validateDeleteSpec,
  validateSpecIdParam,
} from '../validators/spec.validator';

/**
 * Create spec routes
 * @param controller - Spec controller instance
 * @returns Express router
 */
export function createSpecRoutes(controller: SpecController): Router {
  const router = Router();

  /**
   * @route POST /spec/import
   * @desc Import a Swagger/OpenAPI spec from URL, file, or git
   * @access Public
   */
  router.post('/import', validateImportSpec, controller.importSpec);

  /**
   * @route POST /spec/validate
   * @desc Validate a spec by ID or raw content
   * @access Public
   */
  router.post('/validate', validateValidateSpec, controller.validateSpec);

  /**
   * @route GET /spec
   * @desc List all imported specs
   * @access Public
   */
  router.get('/', controller.listSpecs);

  /**
   * @route GET /spec/:specId
   * @desc Get spec metadata by ID
   * @access Public
   */
  router.get('/:specId', validateSpecIdParam, controller.getSpec);

  /**
   * @route GET /spec/:specId/operations
   * @desc List operations for a spec with optional filters
   * @access Public
   */
  router.get('/:specId/operations', validateSpecIdParam, controller.listOperations);

  /**
   * @route GET /spec/:specId/tags
   * @desc Get tag statistics for a spec
   * @access Public
   */
  router.get('/:specId/tags', validateSpecIdParam, controller.getTagStats);

  /**
   * @route DELETE /spec/:specId
   * @desc Delete a spec and optionally cascade to environments
   * @access Public
   */
  router.delete('/:specId', validateSpecIdParam, validateDeleteSpec, controller.deleteSpec);

  return router;
}
