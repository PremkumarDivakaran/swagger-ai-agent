/**
 * IRunPlanRepository interface
 * Defines operations for managing RunPlan entities
 */

import { RunPlan, RunPlanStatus } from '../models';
import { PaginatedResult, PaginationOptions } from './types';

/**
 * Options for finding run plans
 */
export interface FindRunPlansOptions extends PaginationOptions {
  /** Filter by spec ID */
  specId?: string;
  /** Filter by environment name */
  envName?: string;
  /** Filter by status */
  status?: RunPlanStatus;
  /** Filter by status (multiple) */
  statuses?: RunPlanStatus[];
  /** Filter by creator */
  createdBy?: string;
  /** Filter by tag */
  tag?: string;
  /** Created after date */
  createdAfter?: Date;
  /** Created before date */
  createdBefore?: Date;
}

/**
 * Repository interface for RunPlan entities
 */
export interface IRunPlanRepository {
  /**
   * Creates a new run plan
   * @param plan - Run plan to create
   * @returns Created run plan with ID
   */
  create(plan: RunPlan): Promise<RunPlan>;

  /**
   * Updates an existing run plan
   * @param plan - Run plan with updates
   * @returns Updated run plan
   */
  update(plan: RunPlan): Promise<RunPlan>;

  /**
   * Deletes a run plan by ID
   * @param runId - Run plan ID
   * @returns true if deleted, false if not found
   */
  delete(runId: string): Promise<boolean>;

  /**
   * Finds a run plan by ID
   * @param runId - Run plan ID
   * @returns Run plan if found, null otherwise
   */
  findById(runId: string): Promise<RunPlan | null>;

  /**
   * Finds run plans matching criteria
   * @param options - Filter and pagination options
   * @returns Paginated result of run plans
   */
  find(options?: FindRunPlansOptions): Promise<PaginatedResult<RunPlan>>;

  /**
   * Finds run plans by spec ID
   * @param specId - Spec ID
   * @param options - Pagination options
   * @returns Paginated result of run plans
   */
  findBySpecId(specId: string, options?: PaginationOptions): Promise<PaginatedResult<RunPlan>>;

  /**
   * Finds run plans by status
   * @param status - Run plan status
   * @param options - Pagination options
   * @returns Paginated result of run plans
   */
  findByStatus(status: RunPlanStatus, options?: PaginationOptions): Promise<PaginatedResult<RunPlan>>;

  /**
   * Gets the most recent run plan for a spec
   * @param specId - Spec ID
   * @returns Most recent run plan or null
   */
  findLatestBySpecId(specId: string): Promise<RunPlan | null>;

  /**
   * Gets all running run plans
   * @returns Array of running run plans
   */
  findRunning(): Promise<RunPlan[]>;

  /**
   * Updates run plan status
   * @param runId - Run plan ID
   * @param status - New status
   * @returns Updated run plan
   */
  updateStatus(runId: string, status: RunPlanStatus): Promise<RunPlan>;

  /**
   * Counts run plans matching criteria
   * @param options - Filter options
   * @returns Count of matching run plans
   */
  count(options?: Omit<FindRunPlansOptions, keyof PaginationOptions>): Promise<number>;

  /**
   * Checks if a run plan exists
   * @param runId - Run plan ID
   * @returns true if exists
   */
  exists(runId: string): Promise<boolean>;

  /**
   * Deletes all run plans for a spec
   * @param specId - Spec ID
   * @returns Number of deleted run plans
   */
  deleteBySpecId(specId: string): Promise<number>;

  /**
   * Deletes old completed run plans
   * @param olderThan - Delete plans completed before this date
   * @returns Number of deleted run plans
   */
  deleteCompletedOlderThan(olderThan: Date): Promise<number>;
}
