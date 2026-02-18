/**
 * ============================================================
 *  AI Agent Types & Interfaces
 * ============================================================
 *
 * This file defines the contracts for the agentic test-generation
 * pipeline. The architecture follows a multi-agent pattern:
 *
 *   ┌──────────┐    ┌─────────────┐    ┌──────────┐    ┌───────────┐
 *   │ Planner  │───▶│ Test Writer │───▶│ Executor │───▶│ Reflector │
 *   │  Agent   │    │   Agent     │    │  Agent   │    │   Agent   │
 *   └──────────┘    └─────────────┘    └──────────┘    └─────┬─────┘
 *        ▲                                                    │
 *        └────────────────── loop back ───────────────────────┘
 *
 *  1. PlannerAgent  – reads the OpenAPI spec, asks the LLM to find
 *                     operation dependencies and build a test strategy
 *  2. TestWriterAgent – asks the LLM to write complete Java test code
 *  3. ExecutorAgent  – runs `mvn test`, captures results
 *  4. SelfHealAgent – sends failures back to the LLM, gets fixes
 *  5. Orchestrator   – coordinates the loop (max N iterations)
 *
 * ============================================================
 */

import { Operation } from '../../domain/models/Operation';
import { NormalizedSpec } from '../../domain/models/NormalizedSpec';

// ──────────────────────────────────────────────
//  Agent run configuration (what the user sends)
// ──────────────────────────────────────────────

export interface AgentRunConfig {
  /** Spec ID to generate tests for */
  specId: string;
  /** Maximum agentic iterations (default 3) */
  maxIterations?: number;
  /** Base directory for generated test project */
  baseDirectory?: string;
  /** Java base package (default com.api.tests) */
  basePackage?: string;
  /** Whether to auto-execute and self-heal (default true) */
  autoExecute?: boolean;
  /** Operation filter — which operations to include */
  operationFilter?: {
    /** 'full' = all, 'tag' = filter by tags, 'single' = specific operationIds */
    mode: 'full' | 'tag' | 'single';
    /** Tags to include (when mode = 'tag') */
    tags?: string[];
    /** Specific operationIds to include (when mode = 'single') */
    operationIds?: string[];
  };
}

// ──────────────────────────────────────────────
//  Planner Agent types
// ──────────────────────────────────────────────

/** A dependency between two operations (e.g. POST before GET) */
export interface OperationDependency {
  /** The operation that must run first (e.g. createProduct) */
  sourceOperationId: string;
  /** The operation that depends on the source (e.g. getProductById) */
  targetOperationId: string;
  /** What data flows between them (e.g. "id from POST response used as path param") */
  dataFlow: string;
}

/** Category of test — determines the scenario type */
export type TestCategory = 'positive' | 'negative' | 'edge-case' | 'destructive';

/** One item in the test plan — what to test and how */
export interface TestPlanItem {
  operationId: string;
  method: string;
  path: string;
  /** Short human-readable test description */
  testDescription: string;
  /** Category of the test scenario */
  category: TestCategory;
  /** Expected HTTP status code for this scenario */
  expectedStatus: number;
  /** Priority (1 = highest) */
  priority: number;
  /** IDs of operations that must run before this one */
  dependsOn: string[];
  /** What assertions to make on the response */
  assertions: string[];
  /** Whether this needs a request body */
  needsBody: boolean;
  /** LLM-suggested request body (JSON string) */
  suggestedBody?: string;
}

/** Output of the PlannerAgent */
export interface AgentTestPlan {
  /** Human-readable title */
  title: string;
  /** Base URL from the spec */
  baseUrl: string;
  /** Ordered list of operations to test */
  items: TestPlanItem[];
  /** Dependencies between operations */
  dependencies: OperationDependency[];
  /** LLM reasoning about the test strategy */
  reasoning: string;
}

// ──────────────────────────────────────────────
//  Test Writer Agent types
// ──────────────────────────────────────────────

/** A single generated file (Java class, config, pom, etc.) */
export interface GeneratedFile {
  path: string;
  content: string;
}

/** Output of the TestWriterAgent */
export interface AgentTestSuite {
  /** Maven project name */
  suiteName: string;
  /** All files in the generated project */
  files: GeneratedFile[];
  /** Base package */
  basePackage: string;
}

// ──────────────────────────────────────────────
//  Executor Agent types
// ──────────────────────────────────────────────

/** Structured result of one test case */
export interface AgentTestCaseResult {
  testName: string;
  className: string;
  status: 'passed' | 'failed' | 'error' | 'skipped';
  durationMs: number;
  /** Error message (if failed/error) */
  errorMessage?: string;
  /** Stack trace snippet (if failed/error) */
  stackTrace?: string;
}

/** Output of the ExecutorAgent */
export interface AgentExecutionResult {
  /** Overall pass/fail */
  success: boolean;
  /** Total / passed / failed / skipped */
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  /** Duration of the mvn test run (ms) */
  durationMs: number;
  /** Per-test results */
  testResults: AgentTestCaseResult[];
  /** Raw stdout (trimmed) */
  rawOutput: string;
}

// ──────────────────────────────────────────────
//  Reflector Agent types
// ──────────────────────────────────────────────

/** A fix suggested by the SelfHealAgent */
export interface TestFix {
  /** Which file to patch */
  filePath: string;
  /** Complete new content for the file */
  newContent: string;
  /** LLM explanation of what was fixed */
  explanation: string;
}

/** Output of the SelfHealAgent */
export interface AgentReflection {
  /** Are the failures in the test code or in the API itself? */
  failureSource: 'test-code' | 'api-bug' | 'environment' | 'unknown';
  /** Human-readable summary */
  summary: string;
  /** Fixes to apply (empty if failureSource is not test-code) */
  fixes: TestFix[];
  /** Should we re-run after applying fixes? */
  shouldRetry: boolean;
}

// ──────────────────────────────────────────────
//  Orchestrator progress (for polling from UI)
// ──────────────────────────────────────────────

export type AgentPhase =
  | 'planning'      // PlannerAgent is working
  | 'writing'       // TestWriterAgent is writing code
  | 'persisting'    // Writing files to disk
  | 'executing'     // Running mvn test
  | 'reflecting'    // SelfHealAgent analyzing failures
  | 'fixing'        // Applying fixes from SelfHealAgent
  | 'completed'     // All done
  | 'failed';       // Unrecoverable error

export interface AgentIteration {
  iteration: number;
  executionResult: AgentExecutionResult;
  reflection?: AgentReflection;
  fixesApplied: number;
}

export interface AgentRunStatus {
  /** Unique run ID */
  runId: string;
  /** Current phase */
  phase: AgentPhase;
  /** Current iteration (1-based) */
  currentIteration: number;
  /** Max iterations configured */
  maxIterations: number;
  /** Log of messages for the UI */
  log: AgentLogEntry[];
  /** The test plan (set after planning phase) */
  testPlan?: AgentTestPlan;
  /** Path where tests were written */
  testSuitePath?: string;
  /** History of each execute→reflect iteration */
  iterations: AgentIteration[];
  /** Final result summary */
  finalResult?: AgentExecutionResult;
  /** Error message if phase is 'failed' */
  error?: string;
  /** Timestamps */
  startedAt: Date;
  completedAt?: Date;
}

export interface AgentLogEntry {
  timestamp: Date;
  phase: AgentPhase;
  message: string;
}
