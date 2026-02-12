/**
 * Test Generation Controller
 * Handles HTTP requests for test generation endpoints
 * Now focused on AI REST Assured (agentic) test generation
 */

import * as path from 'path';
import * as fs from 'fs';
import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../../core/types';
import {
  ExecuteTestsUseCase,
} from '../../application/testgen/execute-tests.usecase';
import { ISpecRepository } from '../../domain/repositories';
import {
  ExecuteTestsRequestDto,
  ExecuteTestsResponseDto,
  TestExecutionStatusDto,
  AgentRunRequestDto,
  AgentRunResponseDto,
  AgentRunStatusDto,
} from '../dto/testgen.dto';
import { AgentOrchestrator } from '../../application/agents';

/**
 * TestGenController
 * Thin controller that delegates to use cases
 */
export class TestGenController {
  constructor(
    private executeTestsUseCase: ExecuteTestsUseCase,
    private specRepository: ISpecRepository,
    private agentOrchestrator?: AgentOrchestrator | null
  ) {}

  /**
   * POST /testgen/execute-tests
   * Execute generated tests
   */
  async executeTests(
    req: Request<unknown, unknown, ExecuteTestsRequestDto>,
    res: Response<ApiResponse<ExecuteTestsResponseDto>>,
    next: NextFunction
  ): Promise<void> {
    try {
      const { testSuitePath, framework, args, env } = req.body;

      const result = await this.executeTestsUseCase.execute({
        testSuitePath,
        framework,
        args,
        env,
      });

      const response: ApiResponse<ExecuteTestsResponseDto> = {
        success: true,
        data: {
          executionId: result.executionId,
          status: result.status,
          startedAt: result.startedAt.toISOString(),
          message: 'Test execution started',
        },
        meta: {
          timestamp: new Date().toISOString(),
        },
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /testgen/execution/:executionId
   * Get test execution status
   */
  async getExecutionStatus(
    req: Request<{ executionId: string }>,
    res: Response<ApiResponse<TestExecutionStatusDto>>,
    next: NextFunction
  ): Promise<void> {
    try {
      const { executionId } = req.params;

      const result = await this.executeTestsUseCase.getStatus(executionId);

      if (!result) {
        res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: `Execution not found: ${executionId}`,
          },
          meta: { timestamp: new Date().toISOString() },
        });
        return;
      }

      const reportPath = this.executeTestsUseCase.getReportPath(executionId);
      const reportUrl = reportPath
        ? `/api/testgen/execution/${executionId}/report`
        : undefined;

      const response: ApiResponse<TestExecutionStatusDto> = {
        success: true,
        data: {
          executionId: result.executionId,
          status: result.status,
          startedAt: result.startedAt.toISOString(),
          completedAt: result.completedAt?.toISOString(),
          duration: result.duration,
          exitCode: result.exitCode,
          stdout: result.stdout,
          stderr: result.stderr,
          results: result.results,
          reportUrl,
        },
        meta: {
          timestamp: new Date().toISOString(),
        },
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /testgen/execution/:executionId/report*
   * Serve Allure report static files
   */
  async serveExecutionReport(
    req: Request<{ executionId: string }>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { executionId } = req.params;
      const reportDir = this.executeTestsUseCase.getReportPath(executionId);
      if (!reportDir) {
        res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Allure report not found. Run Maven tests and ensure allure:report has been generated.',
          },
          meta: { timestamp: new Date().toISOString() },
        });
        return;
      }
      const resolvedDir = path.resolve(reportDir);
      const pathAfterReport = req.path.replace(new RegExp(`^.*/execution/${executionId}/report/?`), '') || '';
      const requestedPath = pathAfterReport || 'index.html';
      if (requestedPath.includes('..')) {
        res.status(400).json({
          success: false,
          error: { code: 'BAD_REQUEST', message: 'Invalid path' },
          meta: { timestamp: new Date().toISOString() },
        });
        return;
      }
      const filePath = path.join(resolvedDir, requestedPath);
      const normalized = path.normalize(filePath);
      if (!normalized.startsWith(resolvedDir)) {
        res.status(400).json({
          success: false,
          error: { code: 'BAD_REQUEST', message: 'Invalid path' },
          meta: { timestamp: new Date().toISOString() },
        });
        return;
      }
      if (!fs.existsSync(normalized)) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'File not found' },
          meta: { timestamp: new Date().toISOString() },
        });
        return;
      }
      const stat = fs.statSync(normalized);
      if (stat.isDirectory()) {
        const indexFile = path.join(normalized, 'index.html');
        if (fs.existsSync(indexFile)) {
          res.sendFile(indexFile);
          return;
        }
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'index.html not found' },
          meta: { timestamp: new Date().toISOString() },
        });
        return;
      }
      res.sendFile(normalized);
    } catch (error) {
      next(error);
    }
  }

  // ──────────────────────────────────────────────
  //  AI REST Assured endpoints
  // ──────────────────────────────────────────────

  /**
   * POST /testgen/agent/run
   * Start an AI REST Assured run (Plan → Write → Execute → Reflect → Fix loop)
   */
  async startAgentRun(
    req: Request<unknown, unknown, AgentRunRequestDto>,
    res: Response<ApiResponse<AgentRunResponseDto>>,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!this.agentOrchestrator) {
        res.status(400).json({
          success: false,
          error: { code: 'LLM_REQUIRED', message: 'AI REST Assured requires LLM to be enabled. Set LLM_ENABLED=true in .env' },
          meta: { timestamp: new Date().toISOString() },
        });
        return;
      }

      const runId = this.agentOrchestrator.startRun(req.body);

      res.status(200).json({
        success: true,
        data: {
          runId,
          status: 'planning',
          message: 'AI REST Assured run started. Poll /api/testgen/agent/run/:runId for status.',
        },
        meta: { timestamp: new Date().toISOString() },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /testgen/agent/run/:runId
   * Poll the status of an AI REST Assured run
   */
  async getAgentRunStatus(
    req: Request<{ runId: string }>,
    res: Response<ApiResponse<AgentRunStatusDto>>,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!this.agentOrchestrator) {
        res.status(400).json({
          success: false,
          error: { code: 'LLM_REQUIRED', message: 'AI REST Assured requires LLM' },
          meta: { timestamp: new Date().toISOString() },
        });
        return;
      }

      const status = this.agentOrchestrator.getStatus(req.params.runId);
      if (!status) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: `Agent run ${req.params.runId} not found` },
          meta: { timestamp: new Date().toISOString() },
        });
        return;
      }

      const dto: AgentRunStatusDto = {
        runId: status.runId,
        phase: status.phase,
        currentIteration: status.currentIteration,
        maxIterations: status.maxIterations,
        testSuitePath: status.testSuitePath,
        log: status.log.map(l => ({
          timestamp: l.timestamp.toISOString(),
          phase: l.phase,
          message: l.message,
        })),
        iterations: status.iterations.map(it => ({
          iteration: it.iteration,
          passed: it.executionResult.passed,
          failed: it.executionResult.failed,
          total: it.executionResult.total,
          fixesApplied: it.fixesApplied,
        })),
        finalResult: status.finalResult ? {
          success: status.finalResult.success,
          total: status.finalResult.total,
          passed: status.finalResult.passed,
          failed: status.finalResult.failed,
          skipped: status.finalResult.skipped,
          durationMs: status.finalResult.durationMs,
        } : undefined,
        testPlan: status.testPlan ? {
          title: status.testPlan.title,
          reasoning: status.testPlan.reasoning,
          itemCount: status.testPlan.items.length,
          dependencyCount: status.testPlan.dependencies.length,
        } : undefined,
        error: status.error,
        startedAt: status.startedAt.toISOString(),
        completedAt: status.completedAt?.toISOString(),
      };

      res.status(200).json({
        success: true,
        data: dto,
        meta: { timestamp: new Date().toISOString() },
      });
    } catch (error) {
      next(error);
    }
  }
}

/**
 * Factory function to create the controller
 */
export function createTestGenController(
  executeTestsUseCase: ExecuteTestsUseCase,
  specRepository: ISpecRepository,
  agentOrchestrator?: AgentOrchestrator | null
): TestGenController {
  return new TestGenController(
    executeTestsUseCase,
    specRepository,
    agentOrchestrator
  );
}
