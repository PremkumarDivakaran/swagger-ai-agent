/**
 * MCP Routes
 * HTTP routes for MCP-oriented Swagger operations
 */

import { Router } from 'express';
import { createSwaggerMcpController } from '../controllers/mcp/swaggerMcp.controller';
import {
  createListOperationsTool,
  createPlanApiRunTool,
  createExecuteOperationTool,
  createGenerateAxiosTestsTool,
} from '../../infrastructure/mcp/swagger/tools';
import { createCreateRunPlanUseCase } from '../../application/execution/create-run-plan.usecase';
import { createGenerateAxiosTestsUseCase } from '../../application/testgen/generate-axios-tests.usecase';
import { AxiosExecutionAdapter } from '../../infrastructure/http/AxiosExecutionAdapter';
import {
  validateMcpListOperations,
  validateMcpPlanRun,
  validateMcpExecuteOperation,
  validateMcpGenerateTests,
} from '../validators/mcp.validator';
import {
  specRepository,
  environmentRepository,
  runPlanRepository,
} from './shared-repositories';

const router = Router();

// Create MCP tools with dependencies
const listOperationsTool = createListOperationsTool(specRepository);

const createRunPlanUseCase = createCreateRunPlanUseCase({
  specRepository,
  environmentRepository,
  runPlanRepository,
});
const planRunTool = createPlanApiRunTool(createRunPlanUseCase);

// AxiosExecutionAdapter creates its own AxiosClient internally
const executionAdapter = new AxiosExecutionAdapter();
const executeOperationTool = createExecuteOperationTool(
  specRepository,
  environmentRepository,
  executionAdapter
);

const generateAxiosTestsUseCase = createGenerateAxiosTestsUseCase(
  specRepository,
  environmentRepository
);
const generateTestsTool = createGenerateAxiosTestsTool(generateAxiosTestsUseCase);

// Create controller
const controller = createSwaggerMcpController(
  listOperationsTool,
  planRunTool,
  executeOperationTool,
  generateTestsTool
);

/**
 * GET /mcp/swagger/tools
 * List available MCP tools
 * 
 * Response:
 * {
 *   "tools": [
 *     {
 *       "name": "swagger_list_operations",
 *       "description": "...",
 *       "inputSchema": {...}
 *     },
 *     ...
 *   ]
 * }
 */
router.get(
  '/swagger/tools',
  (req, res, next) => controller.listTools(req, res, next)
);

/**
 * POST /mcp/swagger/list-operations
 * List operations from a spec (MCP-oriented)
 * 
 * Request body:
 * {
 *   "specId": "spec-123",
 *   "tags": ["pet"],  // optional
 *   "method": "GET"   // optional
 * }
 * 
 * Response:
 * {
 *   "specId": "spec-123",
 *   "specTitle": "Petstore API",
 *   "totalOperations": 19,
 *   "operations": [...]
 * }
 */
router.post(
  '/swagger/list-operations',
  validateMcpListOperations,
  (req, res, next) => controller.listOperations(req, res, next)
);

/**
 * POST /mcp/swagger/plan-run
 * Create a run plan (MCP-oriented)
 * 
 * Request body:
 * {
 *   "specId": "spec-123",
 *   "envName": "qa",
 *   "selection": {
 *     "mode": "tag",
 *     "tags": ["pet"]
 *   }
 * }
 * 
 * Response:
 * {
 *   "runId": "run-456",
 *   "specId": "spec-123",
 *   "envName": "qa",
 *   "status": "pending",
 *   "operationCount": 5,
 *   "testCount": 15,
 *   "summary": {...}
 * }
 */
router.post(
  '/swagger/plan-run',
  validateMcpPlanRun,
  (req, res, next) => controller.planRun(req, res, next)
);

/**
 * POST /mcp/swagger/execute-operation
 * Execute a single operation (MCP-oriented)
 * 
 * Request body:
 * {
 *   "specId": "spec-123",
 *   "envName": "qa",
 *   "operationId": "getPetById",
 *   "overrides": {
 *     "pathParams": {"petId": "123"},
 *     "query": {"verbose": true},
 *     "headers": {"x-correlation-id": "abc"}
 *   }
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "operationId": "getPetById",
 *   "request": {...},
 *   "response": {...}
 * }
 */
router.post(
  '/swagger/execute-operation',
  validateMcpExecuteOperation,
  (req, res, next) => controller.executeOperation(req, res, next)
);

/**
 * POST /mcp/swagger/generate-axios-tests
 * Generate Axios + Jest tests (MCP-oriented)
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
 *     "includeAuthTests": true
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
  '/swagger/generate-axios-tests',
  validateMcpGenerateTests,
  (req, res, next) => controller.generateTests(req, res, next)
);

export default router;
