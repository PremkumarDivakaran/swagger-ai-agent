/**
 * Spec Validators
 * Request validation for spec API endpoints
 */

import Joi from 'joi';
import { Request, Response, NextFunction } from 'express';
import { ValidationError } from '../../core/errors';

/**
 * URL source schema
 */
const urlSourceSchema = Joi.object({
  type: Joi.string().valid('url').required(),
  url: Joi.string().uri().required(),
  headers: Joi.object().pattern(Joi.string(), Joi.string()).optional(),
});

/**
 * File source schema
 */
const fileSourceSchema = Joi.object({
  type: Joi.string().valid('file').required(),
  path: Joi.string().min(1).required(),
});

/**
 * Git source schema
 */
const gitSourceSchema = Joi.object({
  type: Joi.string().valid('git').required(),
  repo: Joi.string().min(1).required(),
  ref: Joi.string().min(1).required(),
  filePath: Joi.string().min(1).required(),
  auth: Joi.object({
    token: Joi.string().optional(),
    username: Joi.string().optional(),
    password: Joi.string().optional(),
  }).optional(),
});

/**
 * Inline source schema (raw content)
 */
const inlineSourceSchema = Joi.object({
  type: Joi.string().valid('inline').required(),
  content: Joi.string().min(1).required(),
  filename: Joi.string().optional(),
});

/**
 * Spec source schema (union)
 */
const specSourceSchema = Joi.alternatives().try(
  urlSourceSchema,
  fileSourceSchema,
  gitSourceSchema,
  inlineSourceSchema
);

/**
 * Import spec request schema
 */
const importSpecSchema = Joi.object({
  source: specSourceSchema.required(),
  generateMissingOperationIds: Joi.boolean().optional(),
  includeDeprecated: Joi.boolean().optional(),
});

/**
 * Validate spec request schema
 */
const validateSpecSchema = Joi.object({
  specId: Joi.string().uuid().optional(),
  rawSpec: Joi.alternatives().try(
    Joi.string().min(1),
    Joi.object()
  ).optional(),
}).or('specId', 'rawSpec').nand('specId', 'rawSpec');

/**
 * Delete spec request schema
 */
const deleteSpecSchema = Joi.object({
  force: Joi.boolean().optional(),
});

/**
 * Create validation middleware
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
      next(new ValidationError('Validation failed', fieldErrors));
      return;
    }

    // Replace with validated data
    if (source === 'body') {
      req.body = value;
    } else if (source === 'query') {
      req.query = value;
    }

    next();
  };
}

/**
 * Validate import spec request
 */
export const validateImportSpec = createValidator(importSpecSchema, 'body');

/**
 * Validate validate-spec request
 */
export const validateValidateSpec = createValidator(validateSpecSchema, 'body');

/**
 * Validate delete spec request
 */
export const validateDeleteSpec = createValidator(deleteSpecSchema, 'body');

/**
 * Validate spec ID parameter
 */
export const validateSpecIdParam = (req: Request, _res: Response, next: NextFunction): void => {
  const { specId } = req.params;
  
  if (!specId || typeof specId !== 'string' || specId.length === 0) {
    next(new ValidationError('Invalid spec ID', [
      { field: 'specId', message: 'specId parameter is required' },
    ]));
    return;
  }

  next();
};
