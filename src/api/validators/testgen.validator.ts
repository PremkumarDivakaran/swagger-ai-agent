/**
 * Test Generation Validators
 * Request validation schemas for test generation endpoints
 */

import Joi from 'joi';
import { Request, Response, NextFunction } from 'express';

/**
 * Selection schema (reused across validators)
 */
const selectionSchema = Joi.object({
  mode: Joi.string().valid('single', 'tag', 'full').required(),
  operationId: Joi.string().when('mode', {
    is: 'single',
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
  tags: Joi.array().items(Joi.string()).min(1).when('mode', {
    is: 'tag',
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
  exclude: Joi.array().items(Joi.string()).optional(),
});

/**
 * Test generation options schema
 */
const testOptionsSchema = Joi.object({
  includeNegativeTests: Joi.boolean().default(false),
  includeAuthTests: Joi.boolean().default(false),
  includeBoundaryTests: Joi.boolean().default(false),
  groupByTag: Joi.boolean().default(false),
  includeSetup: Joi.boolean().default(false),
  baseUrlVariable: Joi.string().optional(),
  envName: Joi.string().optional(),
});

/**
 * Generate Axios tests request schema
 */
export const generateAxiosTestsSchema = Joi.object({
  specId: Joi.string().required().messages({
    'any.required': 'specId is required',
    'string.empty': 'specId cannot be empty',
  }),
  selection: selectionSchema.optional(),
  options: testOptionsSchema.optional(),
});

/**
 * Test preview request schema
 */
export const testPreviewSchema = Joi.object({
  specId: Joi.string().required().messages({
    'any.required': 'specId is required',
    'string.empty': 'specId cannot be empty',
  }),
  maxOperations: Joi.number().integer().min(1).max(50).default(5),
});

/**
 * Export options schema
 */
const exportOptionsSchema = Joi.object({
  format: Joi.string().valid('single-file', 'multi-file', 'zip').default('single-file'),
  includePackageJson: Joi.boolean().default(true),
  includeJestConfig: Joi.boolean().default(true),
  includeReadme: Joi.boolean().default(true),
});

/**
 * Export test suite request schema
 */
export const exportTestSuiteSchema = Joi.object({
  specId: Joi.string().required().messages({
    'any.required': 'specId is required',
    'string.empty': 'specId cannot be empty',
  }),
  selection: selectionSchema.optional(),
  exportOptions: exportOptionsSchema.optional(),
  testOptions: testOptionsSchema.optional(),
});

/**
 * Create Joi validation middleware
 */
function createValidator(schema: Joi.Schema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
      }));

      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Request validation failed',
          details: { fields: errors },
        },
      });
      return;
    }

    req.body = value;
    next();
  };
}

/**
 * Validate generate axios tests request
 */
export const validateGenerateAxiosTests = createValidator(generateAxiosTestsSchema);

/**
 * Validate test preview request
 */
export const validateTestPreview = createValidator(testPreviewSchema);

/**
 * Validate export test suite request
 */
export const validateExportTestSuite = createValidator(exportTestSuiteSchema);
