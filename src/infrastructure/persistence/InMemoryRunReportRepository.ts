/**
 * InMemoryRunReportRepository
 * In-memory implementation of IRunReportRepository
 */

import {
  IRunReportRepository,
  FindRunReportsOptions,
  AggregateStats,
  PaginatedResult,
  PaginationOptions,
  createPaginatedResult,
  getDefaultPaginationOptions,
} from '../../domain/repositories';
import { RunReport, isSuccessful } from '../../domain/models';

/**
 * InMemoryRunReportRepository class
 * Stores run reports in memory using a Map
 */
export class InMemoryRunReportRepository implements IRunReportRepository {
  private reports: Map<string, RunReport> = new Map();

  async create(report: RunReport): Promise<RunReport> {
    this.reports.set(report.runId, report);
    return report;
  }

  async update(report: RunReport): Promise<RunReport> {
    if (!this.reports.has(report.runId)) {
      throw new Error(`Run report not found: ${report.runId}`);
    }
    this.reports.set(report.runId, report);
    return report;
  }

  async delete(runId: string): Promise<boolean> {
    return this.reports.delete(runId);
  }

  async findById(runId: string): Promise<RunReport | null> {
    return this.reports.get(runId) ?? null;
  }

  async find(options?: FindRunReportsOptions): Promise<PaginatedResult<RunReport>> {
    const opts = { ...getDefaultPaginationOptions(), ...options };
    let items = Array.from(this.reports.values());

    // Apply filters
    if (opts.specId) {
      items = items.filter(r => r.specId === opts.specId);
    }

    if (opts.envName) {
      items = items.filter(r => r.envName === opts.envName);
    }

    if (opts.successful !== undefined) {
      items = items.filter(r => isSuccessful(r) === opts.successful);
    }

    if (opts.minPassRate !== undefined) {
      items = items.filter(r => r.summary.passRate >= opts.minPassRate!);
    }

    if (opts.maxPassRate !== undefined) {
      items = items.filter(r => r.summary.passRate <= opts.maxPassRate!);
    }

    if (opts.startedAfter) {
      items = items.filter(r => r.startedAt >= opts.startedAfter!);
    }

    if (opts.startedBefore) {
      items = items.filter(r => r.startedAt <= opts.startedBefore!);
    }

    // Sort
    items.sort((a, b) => {
      const aVal = this.getSortValue(a, opts.sortBy);
      const bVal = this.getSortValue(b, opts.sortBy);
      const cmp = (aVal as string | number) < (bVal as string | number) ? -1 : (aVal as string | number) > (bVal as string | number) ? 1 : 0;
      return opts.sortOrder === 'desc' ? -cmp : cmp;
    });

    // Paginate
    const total = items.length;
    const start = (opts.page - 1) * opts.limit;
    const pageItems = items.slice(start, start + opts.limit);

    return createPaginatedResult(pageItems, total, opts.page, opts.limit);
  }

  async findBySpecId(specId: string, options?: PaginationOptions): Promise<PaginatedResult<RunReport>> {
    return this.find({ ...options, specId });
  }

  async findLatestBySpecId(specId: string): Promise<RunReport | null> {
    const reports = Array.from(this.reports.values())
      .filter(r => r.specId === specId)
      .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());
    
    return reports[0] ?? null;
  }

  async findBySpecIdAndEnv(
    specId: string,
    envName: string,
    options?: PaginationOptions
  ): Promise<PaginatedResult<RunReport>> {
    return this.find({ ...options, specId, envName });
  }

  async getStatsBySpecId(specId: string): Promise<AggregateStats> {
    const reports = Array.from(this.reports.values())
      .filter(r => r.specId === specId);
    
    return this.calculateAggregateStats(reports);
  }

  async getStatsByDateRange(startDate: Date, endDate: Date): Promise<AggregateStats> {
    const reports = Array.from(this.reports.values())
      .filter(r => r.startedAt >= startDate && r.startedAt <= endDate);
    
    return this.calculateAggregateStats(reports);
  }

  async count(options?: Omit<FindRunReportsOptions, 'page' | 'limit' | 'sortBy' | 'sortOrder'>): Promise<number> {
    const result = await this.find({ ...options, page: 1, limit: Number.MAX_SAFE_INTEGER });
    return result.total;
  }

  async exists(runId: string): Promise<boolean> {
    return this.reports.has(runId);
  }

  async deleteBySpecId(specId: string): Promise<number> {
    let count = 0;
    for (const [runId, report] of this.reports.entries()) {
      if (report.specId === specId) {
        this.reports.delete(runId);
        count++;
      }
    }
    return count;
  }

  async deleteOlderThan(olderThan: Date): Promise<number> {
    let count = 0;
    for (const [runId, report] of this.reports.entries()) {
      if (report.completedAt < olderThan) {
        this.reports.delete(runId);
        count++;
      }
    }
    return count;
  }

  /**
   * Clear all reports (useful for testing)
   */
  clear(): void {
    this.reports.clear();
  }

  private getSortValue(report: RunReport, sortBy?: string): unknown {
    switch (sortBy) {
      case 'passRate':
        return report.summary.passRate;
      case 'duration':
        return report.duration;
      case 'completedAt':
        return report.completedAt;
      case 'startedAt':
      case 'createdAt':
      default:
        return report.startedAt;
    }
  }

  private calculateAggregateStats(reports: RunReport[]): AggregateStats {
    if (reports.length === 0) {
      return {
        totalReports: 0,
        totalTests: 0,
        totalPassed: 0,
        totalFailed: 0,
        avgPassRate: 0,
        avgDuration: 0,
      };
    }

    const totalReports = reports.length;
    const totalTests = reports.reduce((sum, r) => sum + r.summary.total, 0);
    const totalPassed = reports.reduce((sum, r) => sum + r.summary.passed, 0);
    const totalFailed = reports.reduce((sum, r) => sum + r.summary.failed + r.summary.errors, 0);
    const avgPassRate = reports.reduce((sum, r) => sum + r.summary.passRate, 0) / totalReports;
    const avgDuration = reports.reduce((sum, r) => sum + r.duration, 0) / totalReports;

    return {
      totalReports,
      totalTests,
      totalPassed,
      totalFailed,
      avgPassRate,
      avgDuration,
    };
  }
}

/**
 * Creates an InMemoryRunReportRepository instance
 * @returns InMemoryRunReportRepository instance
 */
export function createInMemoryRunReportRepository(): InMemoryRunReportRepository {
  return new InMemoryRunReportRepository();
}
