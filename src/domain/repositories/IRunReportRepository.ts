/**
 * IRunReportRepository interface
 * Defines operations for managing RunReport entities
 */

import { RunReport } from '../models';
import { PaginatedResult, PaginationOptions } from './types';

/**
 * Options for finding run reports
 */
export interface FindRunReportsOptions extends PaginationOptions {
  /** Filter by spec ID */
  specId?: string;
  /** Filter by environment name */
  envName?: string;
  /** Filter by success (passRate = 100%) */
  successful?: boolean;
  /** Filter by minimum pass rate */
  minPassRate?: number;
  /** Filter by maximum pass rate */
  maxPassRate?: number;
  /** Started after date */
  startedAfter?: Date;
  /** Started before date */
  startedBefore?: Date;
}

/**
 * Aggregate statistics for multiple reports
 */
export interface AggregateStats {
  /** Total number of reports */
  totalReports: number;
  /** Total tests run */
  totalTests: number;
  /** Total passed tests */
  totalPassed: number;
  /** Total failed tests */
  totalFailed: number;
  /** Average pass rate */
  avgPassRate: number;
  /** Average duration */
  avgDuration: number;
}

/**
 * Repository interface for RunReport entities
 */
export interface IRunReportRepository {
  /**
   * Creates a new run report
   * @param report - Run report to create
   * @returns Created run report
   */
  create(report: RunReport): Promise<RunReport>;

  /**
   * Updates an existing run report
   * @param report - Run report with updates
   * @returns Updated run report
   */
  update(report: RunReport): Promise<RunReport>;

  /**
   * Deletes a run report by ID
   * @param runId - Run report ID
   * @returns true if deleted, false if not found
   */
  delete(runId: string): Promise<boolean>;

  /**
   * Finds a run report by ID
   * @param runId - Run report ID
   * @returns Run report if found, null otherwise
   */
  findById(runId: string): Promise<RunReport | null>;

  /**
   * Finds run reports matching criteria
   * @param options - Filter and pagination options
   * @returns Paginated result of run reports
   */
  find(options?: FindRunReportsOptions): Promise<PaginatedResult<RunReport>>;

  /**
   * Finds run reports by spec ID
   * @param specId - Spec ID
   * @param options - Pagination options
   * @returns Paginated result of run reports
   */
  findBySpecId(specId: string, options?: PaginationOptions): Promise<PaginatedResult<RunReport>>;

  /**
   * Gets the most recent run report for a spec
   * @param specId - Spec ID
   * @returns Most recent run report or null
   */
  findLatestBySpecId(specId: string): Promise<RunReport | null>;

  /**
   * Gets run reports for a spec and environment
   * @param specId - Spec ID
   * @param envName - Environment name
   * @param options - Pagination options
   * @returns Paginated result of run reports
   */
  findBySpecIdAndEnv(specId: string, envName: string, options?: PaginationOptions): Promise<PaginatedResult<RunReport>>;

  /**
   * Gets aggregate statistics for a spec
   * @param specId - Spec ID
   * @returns Aggregate statistics
   */
  getStatsBySpecId(specId: string): Promise<AggregateStats>;

  /**
   * Gets aggregate statistics for a time range
   * @param startDate - Start date
   * @param endDate - End date
   * @returns Aggregate statistics
   */
  getStatsByDateRange(startDate: Date, endDate: Date): Promise<AggregateStats>;

  /**
   * Counts run reports matching criteria
   * @param options - Filter options
   * @returns Count of matching run reports
   */
  count(options?: Omit<FindRunReportsOptions, keyof PaginationOptions>): Promise<number>;

  /**
   * Checks if a run report exists
   * @param runId - Run report ID
   * @returns true if exists
   */
  exists(runId: string): Promise<boolean>;

  /**
   * Deletes all run reports for a spec
   * @param specId - Spec ID
   * @returns Number of deleted run reports
   */
  deleteBySpecId(specId: string): Promise<number>;

  /**
   * Deletes old run reports
   * @param olderThan - Delete reports older than this date
   * @returns Number of deleted run reports
   */
  deleteOlderThan(olderThan: Date): Promise<number>;
}
