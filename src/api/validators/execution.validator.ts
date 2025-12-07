/**
 * Execution validators
 * Joi schemas and middleware for execution API request validation
 */

import Joi from 'joi';
import { Request, Response, NextFunction } from 'express';
import { ValidationError } from '../../core/errors';

/**
 * Selection schema
 */
const selectionSchema = Joi.object({
  mode: Joi.string().valid('single', 'tag', 'full').required(),
  operationId: Joi.string().when('mode', {
    is: 'single',
    then: Joi.string().required(),
    otherwise: Joi.string().optional(),
  }),
  tags: Joi.array().items(Joi.string()).when('mode', {
    is: 'tag',
    then: Joi.array().items(Joi.string()).min(1).required(),
    otherwise: Joi.array().items(Joi.string()).optional(),
  }),
  exclude: Joi.array().items(Joi.string()).optional(),
});

/**
 * Run configuration schema
 */
const runConfigSchema = Joi.object({
  parallel: Joi.boolean().optional(),
  maxWorkers: Joi.number().integer().min(1).max(10).optional(),
  stopOnFailure: Joi.boolean().optional(),
  timeout: Joi.number().integer().min(1000).max(300000).optional(),
});

/**
 * Create run plan request schema
 */
export const createRunPlanSchema = Joi.object({
  specId: Joi.string().guid({ version: 'uuidv4' }).required(),
  envName: Joi.string().min(1).max(50).required(),
  selection: selectionSchema.required(),
  description: Joi.string().max(500).optional(),
  config: runConfigSchema.optional(),
});

/**
 * Execute run request schema
 */
export const executeRunSchema = Joi.object({
  runId: Joi.string().guid({ version: 'uuidv4' }).optional(),
  specId: Joi.string().guid({ version: 'uuidv4' }).optional(),
  envName: Joi.string().min(1).max(50).optional(),
  selection: selectionSchema.optional(),
}).or('runId', 'specId');

/**
 * Get run status params schema
 */
export const getRunStatusParamsSchema = Joi.object({
  runId: Joi.string().guid({ version: 'uuidv4' }).required(),
});

/**
 * Get run status query schema
 */
export const getRunStatusQuerySchema = Joi.object({
  includeDetails: Joi.boolean().optional(),
});

/**
 * Retry failed request schema
 */
export const retryFailedSchema = Joi.object({
  runId: Joi.string().guid({ version: 'uuidv4' }).required(),
});

/**
 * Create validation middleware from Joi schema
 */
function createValidator(schema: Joi.Schema, source: 'body' | 'query' | 'params' = 'body') {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const data = source === 'body' ? req.body : source === 'query' ? req.query : req.params;
    const { error, value } = schema.validate(data, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const fieldErrors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
      }));
      next(new ValidationError('Request validation failed', fieldErrors));
      return;
    }

    // Replace with validated data
    if (source === 'body') {
      req.body = value;
    } else if (source === 'query') {
      req.query = value;
    } else if (source === 'params') {
      req.params = value as any;
    }

    next();
  };
}

/**
 * Validate create run plan request
 */
export const validateCreateRunPlan = createValidator(createRunPlanSchema, 'body');

/**
 * Validate execute run request
 */
export const validateExecuteRun = createValidator(executeRunSchema, 'body');

/**
 * Validate get run status params
 */
export const validateGetRunStatusParams = createValidator(getRunStatusParamsSchema, 'params');

/**
 * Validate get run status query
 */
export const validateGetRunStatusQuery = createValidator(getRunStatusQuerySchema, 'query');

/**
 * Validate retry failed request
 */
export const validateRetryFailed = createValidator(retryFailedSchema, 'body');
