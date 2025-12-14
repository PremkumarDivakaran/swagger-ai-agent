/**
 * Environment validators
 * Joi validation schemas for environment endpoints
 */

import Joi from 'joi';
import { Request, Response, NextFunction } from 'express';

/**
 * Auth config validation schemas
 */
const apiKeyAuthSchema = Joi.object({
  type: Joi.string().valid('apiKey').required(),
  parameterName: Joi.string().required(),
  in: Joi.string().valid('header', 'query').required(),
  value: Joi.string().required(),
});

const basicAuthSchema = Joi.object({
  type: Joi.string().valid('basic').required(),
  username: Joi.string().required(),
  password: Joi.string().required(),
});

const bearerAuthSchema = Joi.object({
  type: Joi.string().valid('bearer').required(),
  token: Joi.string().required(),
  prefix: Joi.string().optional(),
});

const oauth2AuthSchema = Joi.object({
  type: Joi.string().valid('oauth2').required(),
  accessToken: Joi.string().required(),
  refreshToken: Joi.string().optional(),
  tokenUrl: Joi.string().uri().optional(),
  clientId: Joi.string().optional(),
  clientSecret: Joi.string().optional(),
  scopes: Joi.array().items(Joi.string()).optional(),
});

const noAuthSchema = Joi.object({
  type: Joi.string().valid('none').required(),
});

const authConfigSchema = Joi.alternatives().try(
  noAuthSchema,
  apiKeyAuthSchema,
  basicAuthSchema,
  bearerAuthSchema,
  oauth2AuthSchema
);

/**
 * Create environment request validation schema
 */
const createEnvironmentSchema = Joi.object({
  specId: Joi.string().uuid().required().messages({
    'string.uuid': 'specId must be a valid UUID',
    'any.required': 'specId is required',
  }),
  name: Joi.string().min(1).max(50).required().pattern(/^[a-zA-Z0-9_-]+$/).messages({
    'string.min': 'name must be at least 1 character',
    'string.max': 'name must be at most 50 characters',
    'string.pattern.base': 'name can only contain letters, numbers, underscores, and hyphens',
    'any.required': 'name is required',
  }),
  baseUrl: Joi.string().uri({ scheme: ['http', 'https'] }).optional().messages({
    'string.uri': 'baseUrl must be a valid HTTP or HTTPS URL',
  }),
  defaultHeaders: Joi.object().pattern(Joi.string(), Joi.string()).optional(),
  authConfig: authConfigSchema.optional(),
  timeout: Joi.number().integer().min(1000).max(300000).optional().messages({
    'number.min': 'timeout must be at least 1000ms',
    'number.max': 'timeout must be at most 300000ms (5 minutes)',
  }),
  verifySsl: Joi.boolean().optional(),
  variables: Joi.object().pattern(Joi.string(), Joi.string()).optional(),
  isDefault: Joi.boolean().optional(),
  description: Joi.string().max(500).optional(),
});

/**
 * Update environment request validation schema
 */
const updateEnvironmentSchema = Joi.object({
  baseUrl: Joi.string().uri({ scheme: ['http', 'https'] }).optional().messages({
    'string.uri': 'baseUrl must be a valid HTTP or HTTPS URL',
  }),
  defaultHeaders: Joi.object().pattern(Joi.string(), Joi.string()).optional(),
  authConfig: authConfigSchema.optional(),
  timeout: Joi.number().integer().min(1000).max(300000).optional().messages({
    'number.min': 'timeout must be at least 1000ms',
    'number.max': 'timeout must be at most 300000ms (5 minutes)',
  }),
  verifySsl: Joi.boolean().optional(),
  variables: Joi.object().pattern(Joi.string(), Joi.string()).optional(),
  isDefault: Joi.boolean().optional(),
  description: Joi.string().max(500).optional(),
}).min(1).messages({
  'object.min': 'At least one field must be provided for update',
});

/**
 * Environment ID param validation schema
 */
const envIdParamSchema = Joi.object({
  envId: Joi.string().uuid().required().messages({
    'string.uuid': 'envId must be a valid UUID',
    'any.required': 'envId is required',
  }),
});

/**
 * Spec ID param validation schema (for environment list)
 */
const specIdParamSchema = Joi.object({
  specId: Joi.string().uuid().required().messages({
    'string.uuid': 'specId must be a valid UUID',
    'any.required': 'specId is required',
  }),
});

/**
 * Validation middleware factory
 */
function createValidator(
  schema: Joi.Schema,
  source: 'body' | 'params' | 'query' = 'body'
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error, value } = schema.validate(req[source], { abortEarly: false });

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
          details: errors,
        },
        meta: {
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

    req[source] = value;
    next();
  };
}

/**
 * Validate create environment request
 */
export const validateCreateEnvironment = createValidator(createEnvironmentSchema, 'body');

/**
 * Validate update environment request
 */
export const validateUpdateEnvironment = createValidator(updateEnvironmentSchema, 'body');

/**
 * Validate environment ID param
 */
export const validateEnvIdParam = createValidator(envIdParamSchema, 'params');

/**
 * Validate spec ID param (for environment list)
 */
export const validateSpecIdParamForEnv = createValidator(specIdParamSchema, 'params');
