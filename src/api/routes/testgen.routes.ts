/**
 * Test Generation Routes
 * HTTP routes for AI REST Assured test generation
 */

import { Router } from 'express';
import {
  createTestGenController,
  TestGenController,
} from '../controllers/testgen.controller';
import {
  createExecuteTestsUseCase,
} from '../../application/testgen/execute-tests.usecase';
import {
  validateExecuteTests,
  validateAgentRun,
} from '../validators/testgen.validator';
import { AgentOrchestrator } from '../../application/agents';
import * as SharedRepos from './shared-repositories';

const router = Router();

// Create the AI Agent orchestrator (needs LLM)
function getAgentOrchestrator(): AgentOrchestrator | null {
  if (!SharedRepos.llmRouter) return null;
  return new AgentOrchestrator(SharedRepos.llmRouter, SharedRepos.specRepository);
}

// Singleton orchestrator (so run status persists across requests)
let _orchestrator: AgentOrchestrator | null | undefined;
function orchestrator(): AgentOrchestrator | null {
  if (_orchestrator === undefined) _orchestrator = getAgentOrchestrator();
  return _orchestrator;
}

// Create controller
function getController(): TestGenController {
  return createTestGenController(
    createExecuteTestsUseCase(),
    SharedRepos.specRepository,
    orchestrator()
  );
}

// ──────────────────────────────────────────────
//  Test execution endpoints (used by AI Agent)
// ──────────────────────────────────────────────

/**
 * POST /testgen/execute-tests
 * Execute generated tests
 */
router.post(
  '/execute-tests',
  validateExecuteTests,
  (req, res, next) => getController().executeTests(req, res, next)
);

/**
 * GET /testgen/execution/:executionId
 * Get test execution status and results
 */
router.get(
  '/execution/:executionId',
  (req, res, next) => getController().getExecutionStatus(req, res, next)
);

/**
 * GET /testgen/execution/:executionId/report*
 * Serve Allure report (HTML, JS, CSS, data) for viewing in browser
 */
router.get(
  '/execution/:executionId/report*',
  (req, res, next) => getController().serveExecutionReport(req, res, next)
);

// ──────────────────────────────────────────────
//  AI REST Assured endpoints
// ──────────────────────────────────────────────

/**
 * POST /testgen/agent/run
 * Start an AI REST Assured run.
 * The agent autonomously: Plans → Writes tests → Executes → Reflects → Fixes → Re-runs
 *
 * Request body:
 * {
 *   "specId": "spec-123",
 *   "maxIterations": 5,
 *   "baseDirectory": "./swagger-tests",
 *   "basePackage": "com.api.tests",
 *   "autoExecute": true
 * }
 *
 * Response: { "runId": "uuid", "status": "planning", "message": "..." }
 */
router.post(
  '/agent/run',
  validateAgentRun,
  (req, res, next) => getController().startAgentRun(req, res, next)
);

/**
 * GET /testgen/agent/run/:runId
 * Poll the status of an AI REST Assured run.
 * Returns phase, log, iterations, test plan, and final results.
 */
router.get(
  '/agent/run/:runId',
  (req, res, next) => getController().getAgentRunStatus(req, res, next)
);

export default router;
