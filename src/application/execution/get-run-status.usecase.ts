/**
 * Get Run Status Use Case
 * Retrieves the status and results of a run
 */

import { IRunPlanRepository, IRunReportRepository } from '../../domain/repositories';
import { RunPlan, RunReport, TestCaseResult, TagStats, MethodStats, PathStats } from '../../domain/models';
import { NotFoundError } from '../../core/errors';

/**
 * Input for getting run status
 */
export interface GetRunStatusInput {
  runId: string;
  includeDetails?: boolean;
  includeAggregations?: boolean;
}

/**
 * Output from getting run status
 */
export interface GetRunStatusOutput {
  runId: string;
  specId: string;
  envName: string;
  status: string;
  operationCount: number;
  testCount: number;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  duration?: number;
  summary?: {
    total: number;
    passed: number;
    failed: number;
    errors: number;
    skipped: number;
    passRate: number;
    totalDuration: number;
    avgDuration: number;
  };
  testResults?: TestCaseResult[];
  tagStats?: TagStats[];
  methodStats?: MethodStats[];
  pathStats?: PathStats[];
}

/**
 * Dependencies for GetRunStatusUseCase
 */
export interface GetRunStatusDependencies {
  runPlanRepository: IRunPlanRepository;
  runReportRepository: IRunReportRepository;
}

/**
 * Retrieves run status and results
 */
export class GetRunStatusUseCase {
  constructor(private readonly deps: GetRunStatusDependencies) {}

  /**
   * Execute the use case
   * @param input - Input parameters
   * @returns Run status and optionally results
   */
  async execute(input: GetRunStatusInput): Promise<GetRunStatusOutput> {
    // Get run plan
    const runPlan = await this.deps.runPlanRepository.findById(input.runId);
    if (!runPlan) {
      throw new NotFoundError(`Run not found: ${input.runId}`);
    }

    // Build base output
    const output: GetRunStatusOutput = {
      runId: runPlan.runId,
      specId: runPlan.specId,
      envName: runPlan.envName,
      status: runPlan.status,
      operationCount: runPlan.operationCount,
      testCount: runPlan.testCount,
      createdAt: runPlan.createdAt,
      startedAt: runPlan.startedAt,
      completedAt: runPlan.completedAt,
    };

    // Calculate duration if started
    if (runPlan.startedAt) {
      const endTime = runPlan.completedAt ?? new Date();
      output.duration = endTime.getTime() - runPlan.startedAt.getTime();
    }

    // If run has completed, get the report
    if (runPlan.status === 'completed' || runPlan.status === 'failed') {
      const report = await this.deps.runReportRepository.findById(input.runId);
      if (report) {
        output.summary = {
          total: report.summary.total,
          passed: report.summary.passed,
          failed: report.summary.failed,
          errors: report.summary.errors,
          skipped: report.summary.skipped,
          passRate: report.summary.passRate,
          totalDuration: report.summary.totalDuration,
          avgDuration: report.summary.avgDuration,
        };

        // Include test results if requested
        if (input.includeDetails) {
          output.testResults = report.testResults;
        }

        // Include aggregated stats if requested
        if (input.includeAggregations) {
          output.tagStats = report.tagStats;
          output.methodStats = report.methodStats;
          output.pathStats = report.pathStats;
        }
      }
    }

    return output;
  }
}

/**
 * Factory function to create GetRunStatusUseCase
 */
export function createGetRunStatusUseCase(deps: GetRunStatusDependencies): GetRunStatusUseCase {
  return new GetRunStatusUseCase(deps);
}
