/**
 * MCP Validators
 * Request validation schemas for MCP endpoints
 */

import Joi from 'joi';
import { Request, Response, NextFunction } from 'express';

/**
 * Selection schema (reused)
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
 * List operations request schema
 */
export const mcpListOperationsSchema = Joi.object({
  specId: Joi.string().required().messages({
    'any.required': 'specId is required',
    'string.empty': 'specId cannot be empty',
  }),
  tags: Joi.array().items(Joi.string()).optional(),
  method: Joi.string().valid('GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS').optional(),
});

/**
 * Plan run request schema
 */
export const mcpPlanRunSchema = Joi.object({
  specId: Joi.string().required().messages({
    'any.required': 'specId is required',
    'string.empty': 'specId cannot be empty',
  }),
  envName: Joi.string().required().messages({
    'any.required': 'envName is required',
    'string.empty': 'envName cannot be empty',
  }),
  selection: selectionSchema.required(),
});

/**
 * Execute operation request schema
 */
export const mcpExecuteOperationSchema = Joi.object({
  specId: Joi.string().required().messages({
    'any.required': 'specId is required',
    'string.empty': 'specId cannot be empty',
  }),
  envName: Joi.string().required().messages({
    'any.required': 'envName is required',
    'string.empty': 'envName cannot be empty',
  }),
  operationId: Joi.string().required().messages({
    'any.required': 'operationId is required',
    'string.empty': 'operationId cannot be empty',
  }),
  overrides: Joi.object({
    pathParams: Joi.object().pattern(Joi.string(), Joi.string()).optional(),
    query: Joi.object().pattern(
      Joi.string(),
      Joi.alternatives().try(Joi.string(), Joi.number(), Joi.boolean())
    ).optional(),
    headers: Joi.object().pattern(Joi.string(), Joi.string()).optional(),
    body: Joi.any().optional(),
  }).optional(),
});

/**
 * Test generation options schema
 */
const testOptionsSchema = Joi.object({
  includeNegativeTests: Joi.boolean().default(true),
  includeAuthTests: Joi.boolean().default(true),
  includeBoundaryTests: Joi.boolean().default(false),
  groupByTag: Joi.boolean().default(false),
  includeSetup: Joi.boolean().default(false),
  baseUrlVariable: Joi.string().optional(),
  envName: Joi.string().optional(),
});

/**
 * Generate tests request schema
 */
export const mcpGenerateTestsSchema = Joi.object({
  specId: Joi.string().required().messages({
    'any.required': 'specId is required',
    'string.empty': 'specId cannot be empty',
  }),
  selection: selectionSchema.optional(),
  options: testOptionsSchema.optional(),
});

/**
 * Generic validation middleware factory
 */
function createValidator(schema: Joi.ObjectSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errors = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message,
      }));

      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Request validation failed',
          details: errors,
        },
        meta: {
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

    req.body = value;
    next();
  };
}

/**
 * Validate list operations request
 */
export const validateMcpListOperations = createValidator(mcpListOperationsSchema);

/**
 * Validate plan run request
 */
export const validateMcpPlanRun = createValidator(mcpPlanRunSchema);

/**
 * Validate execute operation request
 */
export const validateMcpExecuteOperation = createValidator(mcpExecuteOperationSchema);

/**
 * Validate generate tests request
 */
export const validateMcpGenerateTests = createValidator(mcpGenerateTestsSchema);
