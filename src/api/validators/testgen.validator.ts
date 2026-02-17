/**
 * Test Generation Validators
 * Request validation schemas for test generation endpoints
 */

import Joi from 'joi';
import { Request, Response, NextFunction } from 'express';

/**
 * Selection schema (reused across validators).
 * For mode 'single': either operationId (string) or operationIds (array) is required.
 */
const selectionSchema = Joi.object({
  mode: Joi.string().valid('single', 'tag', 'full').required(),
  operationId: Joi.string().optional(),
  operationIds: Joi.array().items(Joi.string()).min(1).optional(),
  tags: Joi.array().items(Joi.string()).min(1).when('mode', {
    is: 'tag',
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
  exclude: Joi.array().items(Joi.string()).optional(),
}).custom((value, helpers) => {
  if (value.mode === 'single') {
    const hasOperationId = value.operationId != null && String(value.operationId).trim() !== '';
    const hasOperationIds = Array.isArray(value.operationIds) && value.operationIds.length > 0;
    if (!hasOperationId && !hasOperationIds) {
      return helpers.error('selection.singleRequiresOperation');
    }
  }
  return value;
}).messages({
  'selection.singleRequiresOperation': '"selection" must include either "operationId" or "operationIds" when mode is "single"',
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
 * Validate test preview request
 */
export const validateTestPreview = createValidator(testPreviewSchema);

/**
 * Execute tests request schema
 */
export const executeTestsSchema = Joi.object({
  testSuitePath: Joi.string().required().messages({
    'any.required': 'testSuitePath is required',
    'string.empty': 'testSuitePath cannot be empty',
  }),
  framework: Joi.string().valid('cucumber', 'jest', 'maven').required(),
  args: Joi.array().items(Joi.string()).optional(),
  env: Joi.object().pattern(Joi.string(), Joi.string()).optional(),
});

/**
 * Validate execute tests request
 */
export const validateExecuteTests = createValidator(executeTestsSchema);

/**
 * AI Agent run request schema
 */
export const agentRunSchema = Joi.object({
  specId: Joi.string().required().messages({
    'any.required': 'specId is required',
    'string.empty': 'specId cannot be empty',
  }),
  maxIterations: Joi.number().integer().min(1).max(10).optional().default(5),
  baseDirectory: Joi.string().optional().default('./swagger-tests'),
  basePackage: Joi.string().optional().default('com.api.tests'),
  autoExecute: Joi.boolean().optional().default(true),
  operationFilter: Joi.object({
    mode: Joi.string().valid('full', 'tag', 'single').required(),
    tags: Joi.array().items(Joi.string()).optional(),
    operationIds: Joi.array().items(Joi.string()).optional(),
  }).optional(),
});

/**
 * Validate AI Agent run request
 */
export const validateAgentRun = createValidator(agentRunSchema);
