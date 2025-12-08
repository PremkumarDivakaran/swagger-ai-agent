/**
 * Test Generation Routes
 * HTTP routes for test generation endpoints
 */

import { Router } from 'express';
import {
  createTestGenController,
  TestGenController,
} from '../controllers/testgen.controller';
import {
  createGenerateAxiosTestsUseCase,
} from '../../application/testgen/generate-axios-tests.usecase';
import {
  createExportTestSuiteUseCase,
} from '../../application/testgen/export-test-suite.usecase';
import {
  validateGenerateAxiosTests,
  validateExportTestSuite,
} from '../validators/testgen.validator';
import { specRepository, environmentRepository } from './shared-repositories';

const router = Router();

// Create use cases
const generateAxiosTestsUseCase = createGenerateAxiosTestsUseCase(
  specRepository,
  environmentRepository
);
const exportTestSuiteUseCase = createExportTestSuiteUseCase();

// Create controller
const controller = createTestGenController(
  generateAxiosTestsUseCase,
  exportTestSuiteUseCase,
  specRepository
);

/**
 * POST /testgen/generate-axios-tests
 * Generate Axios + Jest test code from a spec
 * 
 * Request body:
 * {
 *   "specId": "spec-123",
 *   "selection": {
 *     "mode": "tag",
 *     "tags": ["pet"]
 *   },
 *   "options": {
 *     "includeNegativeTests": true,
 *     "includeAuthTests": true,
 *     "includeBoundaryTests": false
 *   }
 * }
 * 
 * Response:
 * {
 *   "code": "import axios...",
 *   "fileName": "petstore-api.test.ts",
 *   "testCount": 15,
 *   "operationCount": 5,
 *   "testCases": [...]
 * }
 */
router.post(
  '/generate-axios-tests',
  validateGenerateAxiosTests,
  (req, res, next) => controller.generateAxiosTests(req, res, next)
);

/**
 * GET /testgen/spec/:specId/preview
 * Get a preview of generated tests for a spec
 * 
 * Query params:
 * - maxOperations: Maximum number of operations to include in preview (default: 5)
 * 
 * Response:
 * {
 *   "previewCode": "...",
 *   "estimatedTestCount": 30,
 *   "estimatedOperationCount": 15,
 *   "availableTags": ["pet", "store", "user"],
 *   "sampleTestCases": [...]
 * }
 */
router.get(
  '/spec/:specId/preview',
  (req, res, next) => controller.getTestPreview(req, res, next)
);

/**
 * POST /testgen/export
 * Export generated tests as downloadable files
 * 
 * Request body:
 * {
 *   "specId": "spec-123",
 *   "selection": { "mode": "full" },
 *   "exportOptions": {
 *     "format": "single-file",
 *     "includePackageJson": true,
 *     "includeJestConfig": true,
 *     "includeReadme": true
 *   },
 *   "testOptions": {
 *     "includeNegativeTests": true
 *   }
 * }
 * 
 * Response:
 * {
 *   "format": "single-file",
 *   "files": [
 *     { "name": "petstore.test.ts", "content": "...", "mimeType": "application/typescript" }
 *   ],
 *   "totalSize": 12345
 * }
 */
router.post(
  '/export',
  validateExportTestSuite,
  (req, res, next) => controller.exportTestSuite(req, res, next)
);

export default router;
