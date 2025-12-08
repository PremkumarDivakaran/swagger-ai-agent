/**
 * LLM Routes
 * HTTP routes for LLM-assisted payload generation endpoints
 */

import { Router } from 'express';
import { createLlmController, LlmController } from '../controllers/llm.controller';
import { createBuildPayloadUseCase } from '../../application/llm';
import { createGroqLlmProvider, ILlmProvider } from '../../infrastructure/llm';
import {
  validateBuildPayload,
  validateBuildPayloadVariants,
  validateSuggestScenarios,
  validateSpecIdParam,
} from '../validators/llm.validator';
import { specRepository } from './shared-repositories';

const router = Router();

// Create LLM provider (Groq)
const llmProvider: ILlmProvider = createGroqLlmProvider({
  apiKey: process.env.GROQ_API_KEY || '',
  model: process.env.GROQ_MODEL || 'llama-3.1-70b-versatile',
});

// Create use case with LLM provider
const buildPayloadUseCase = createBuildPayloadUseCase(llmProvider, specRepository);

// Create controller
const controller = createLlmController(buildPayloadUseCase, llmProvider);

/**
 * POST /llm/build-payload
 * Generate a payload for an operation using LLM
 * 
 * Request body:
 * {
 *   "specId": "spec-123",
 *   "operationId": "createPet",
 *   "hints": {
 *     "locale": "en-US",
 *     "domain": "pet-store",
 *     "context": "Generate realistic pet data"
 *   }
 * }
 * 
 * Response:
 * {
 *   "specId": "spec-123",
 *   "specTitle": "Petstore API",
 *   "operationId": "createPet",
 *   "operationPath": "/pet",
 *   "operationMethod": "POST",
 *   "payload": {
 *     "payload": { "name": "Buddy", "status": "available" },
 *     "explanation": "Generated realistic pet data",
 *     "confidence": 0.95
 *   },
 *   "generatedAt": "2024-01-15T10:30:00Z"
 * }
 */
router.post(
  '/build-payload',
  validateBuildPayload,
  (req, res, next) => controller.buildPayload(req, res, next)
);

/**
 * POST /llm/build-payload-variants
 * Generate multiple payload variants for an operation using LLM
 * 
 * Request body:
 * {
 *   "specId": "spec-123",
 *   "operationId": "createPet",
 *   "count": 3,
 *   "hints": {
 *     "domain": "pet-store"
 *   }
 * }
 * 
 * Response:
 * {
 *   "specId": "spec-123",
 *   "specTitle": "Petstore API",
 *   "operationId": "createPet",
 *   "operationPath": "/pet",
 *   "operationMethod": "POST",
 *   "payloads": [
 *     { "payload": {...}, "explanation": "...", "confidence": 0.9 },
 *     { "payload": {...}, "explanation": "...", "confidence": 0.85 },
 *     { "payload": {...}, "explanation": "...", "confidence": 0.88 }
 *   ],
 *   "count": 3,
 *   "generatedAt": "2024-01-15T10:30:00Z"
 * }
 */
router.post(
  '/build-payload-variants',
  validateBuildPayloadVariants,
  (req, res, next) => controller.buildPayloadVariants(req, res, next)
);

/**
 * POST /llm/suggest-scenarios
 * Suggest test scenarios for an operation using LLM
 * 
 * Request body:
 * {
 *   "specId": "spec-123",
 *   "operationId": "createPet"
 * }
 * 
 * Response:
 * {
 *   "specId": "spec-123",
 *   "specTitle": "Petstore API",
 *   "operationId": "createPet",
 *   "operationPath": "/pet",
 *   "operationMethod": "POST",
 *   "scenarios": [
 *     {
 *       "name": "Create pet with valid data",
 *       "description": "Test creating a pet with all required fields",
 *       "payload": { "name": "Max", "status": "available" },
 *       "expectedStatusCode": 201,
 *       "testType": "happy-path"
 *     },
 *     ...
 *   ],
 *   "generatedAt": "2024-01-15T10:30:00Z"
 * }
 */
router.post(
  '/suggest-scenarios',
  validateSuggestScenarios,
  (req, res, next) => controller.suggestScenarios(req, res, next)
);

/**
 * GET /llm/spec/:specId/operations
 * List operations available for payload generation
 * 
 * Response:
 * {
 *   "specId": "spec-123",
 *   "specTitle": "Petstore API",
 *   "operations": [
 *     {
 *       "operationId": "createPet",
 *       "method": "POST",
 *       "path": "/pet",
 *       "summary": "Create a new pet",
 *       "hasRequestBody": true
 *     },
 *     ...
 *   ]
 * }
 */
router.get(
  '/spec/:specId/operations',
  validateSpecIdParam,
  (req, res, next) => controller.listOperations(req as any, res, next)
);

/**
 * GET /llm/status
 * Check LLM provider status
 * 
 * Response:
 * {
 *   "provider": "groq",
 *   "available": true,
 *   "models": ["llama-3.1-70b-versatile", "mixtral-8x7b-32768"]
 * }
 */
router.get(
  '/status',
  (req, res, next) => controller.getStatus(req, res, next)
);

export default router;
