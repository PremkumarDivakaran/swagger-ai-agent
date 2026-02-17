/**
 * Test Generation Types
 * Focused on AI REST Assured (agentic) test generation
 */

// Test type — currently only AI REST Assured; future: 'ai-bdd'
export type TestType = 'ai-rest-assured';

// Operation selection
export interface OperationSelection {
  mode: 'single' | 'tag' | 'full';
  operationId?: string;
  operationIds?: string[];
  tags?: string[];
  exclude?: string[];
}

// ──────────────────────────────────────────────
//  AI REST Assured types
// ──────────────────────────────────────────────

export interface AgentRunRequest {
  specId: string;
  maxIterations?: number;
  baseDirectory?: string;
  basePackage?: string;
  autoExecute?: boolean;
  operationFilter?: {
    mode: 'full' | 'tag' | 'single';
    tags?: string[];
    operationIds?: string[];
  };
}

export interface AgentRunResponse {
  runId: string;
  status: string;
  message: string;
}

export interface AgentLogEntry {
  timestamp: string;
  phase: string;
  message: string;
}

export interface AgentIterationSummary {
  iteration: number;
  passed: number;
  failed: number;
  total: number;
  fixesApplied: number;
}

export interface AgentRunStatus {
  runId: string;
  phase: string;
  currentIteration: number;
  maxIterations: number;
  testSuitePath?: string;
  log: AgentLogEntry[];
  iterations: AgentIterationSummary[];
  finalResult?: {
    success: boolean;
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    durationMs: number;
  };
  testPlan?: {
    title: string;
    reasoning: string;
    itemCount: number;
    dependencyCount: number;
  };
  error?: string;
  startedAt: string;
  completedAt?: string;
}
