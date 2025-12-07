/**
 * Domain repositories module exports
 * Re-exports all repository interfaces and types
 */

// Pagination types
export {
  PaginationOptions,
  PaginatedResult,
  createPaginatedResult,
  getDefaultPaginationOptions,
} from './types';

// Repository interfaces
export {
  ISpecRepository,
  FindSpecsOptions,
} from './ISpecRepository';

export {
  IEnvironmentRepository,
  FindEnvironmentsOptions,
} from './IEnvironmentRepository';

export {
  IRunPlanRepository,
  FindRunPlansOptions,
} from './IRunPlanRepository';

export {
  IRunReportRepository,
  FindRunReportsOptions,
  AggregateStats,
} from './IRunReportRepository';

export {
  ITestTemplateRepository,
  FindTemplatesOptions,
} from './ITestTemplateRepository';
