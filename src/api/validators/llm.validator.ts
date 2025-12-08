/**
 * LLM Validators
 * Request validation schemas for LLM endpoints
 */

import Joi from 'joi';
import { Request, Response, NextFunction } from 'express';

/**
 * Payload generation hints schema
 */
const hintsSchema = Joi.object({
  locale: Joi.string().optional().max(10).example('en-US'),
  domain: Joi.string().optional().max(100).example('e-commerce'),
  context: Joi.string().optional().max(500),
  examples: Joi.object().optional(),
}).optional();

/**
 * Build payload request schema
 */
export const buildPayloadSchema = Joi.object({
  specId: Joi.string().required().messages({
    'any.required': 'specId is required',
    'string.empty': 'specId cannot be empty',
  }),
  operationId: Joi.string().required().messages({
    'any.required': 'operationId is required',
    'string.empty': 'operationId cannot be empty',
  }),
  hints: hintsSchema,
});

/**
 * Build payload variants request schema
 */
export const buildPayloadVariantsSchema = Joi.object({
  specId: Joi.string().required().messages({
    'any.required': 'specId is required',
    'string.empty': 'specId cannot be empty',
  }),
  operationId: Joi.string().required().messages({
    'any.required': 'operationId is required',
    'string.empty': 'operationId cannot be empty',
  }),
  count: Joi.number().integer().min(1).max(10).default(3).messages({
    'number.min': 'count must be at least 1',
    'number.max': 'count cannot exceed 10',
  }),
  hints: hintsSchema,
});

/**
 * Suggest scenarios request schema
 */
export const suggestScenariosSchema = Joi.object({
  specId: Joi.string().required().messages({
    'any.required': 'specId is required',
    'string.empty': 'specId cannot be empty',
  }),
  operationId: Joi.string().required().messages({
    'any.required': 'operationId is required',
    'string.empty': 'operationId cannot be empty',
  }),
});

/**
 * Spec ID param schema
 */
export const specIdParamSchema = Joi.object({
  specId: Joi.string().required().messages({
    'any.required': 'specId is required',
    'string.empty': 'specId cannot be empty',
  }),
});

/**
 * Generic validation middleware factory
 */
function createValidator(
  schema: Joi.ObjectSchema,
  source: 'body' | 'params' | 'query' = 'body'
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const data = source === 'body' ? req.body : source === 'params' ? req.params : req.query;
    const { error, value } = schema.validate(data, {
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

    // Update request with validated data
    if (source === 'body') {
      req.body = value;
    } else if (source === 'params') {
      req.params = value;
    } else {
      req.query = value;
    }

    next();
  };
}

/**
 * Validate build payload request
 */
export const validateBuildPayload = createValidator(buildPayloadSchema, 'body');

/**
 * Validate build payload variants request
 */
export const validateBuildPayloadVariants = createValidator(buildPayloadVariantsSchema, 'body');

/**
 * Validate suggest scenarios request
 */
export const validateSuggestScenarios = createValidator(suggestScenariosSchema, 'body');

/**
 * Validate spec ID param for LLM routes
 */
export const validateLlmSpecIdParam = createValidator(specIdParamSchema, 'params');
