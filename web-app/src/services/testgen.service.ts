/**
 * Test Generation Service
 * API calls for AI REST Assured test generation
 */

import { post, get } from './api.client';
import { endpoints } from '@/config';
import type {
  TestExecutionRequest,
  TestExecutionResponse,
  TestExecutionReport,
  AgentRunRequest,
  AgentRunResponse,
  AgentRunStatus,
} from '@/types';

// ──────────────────────────────────────────────
//  File review types (used by TestLab review step)
// ──────────────────────────────────────────────

export interface AgentRunFile {
  path: string;
  content: string;
  language: string;
}

export interface AgentRunFilesResponse {
  files: AgentRunFile[];
  testSuitePath: string;
}

export interface AgentPushRequest {
  branchName: string;
  commitMessage: string;
  baseBranch?: string;
  repoFullName: string;
}

export interface AgentPushResponse {
  success: boolean;
  prUrl?: string;
  branchName: string;
  error?: string;
}

/**
 * Execute generated tests
 */
export async function executeTests(
  request: TestExecutionRequest
): Promise<TestExecutionResponse> {
  return post<TestExecutionResponse>(endpoints.testgen.executeTests, request);
}

/**
 * Get test execution status
 */
export async function getExecutionStatus(
  executionId: string
): Promise<TestExecutionReport> {
  return get<TestExecutionReport>(endpoints.testgen.executionStatus(executionId));
}

/**
 * Start an AI REST Assured run (Plan → Write → Execute → Reflect → Fix loop)
 */
export async function startAgentRun(
  request: AgentRunRequest
): Promise<AgentRunResponse> {
  return post<AgentRunResponse>(endpoints.testgen.agentRun, request);
}

/**
 * Get AI REST Assured run status (poll for progress)
 */
export async function getAgentRunStatus(
  runId: string
): Promise<AgentRunStatus> {
  return get<AgentRunStatus>(endpoints.testgen.agentStatus(runId));
}

/**
 * Get generated test files for human review
 */
export async function getAgentRunFiles(
  runId: string
): Promise<AgentRunFilesResponse> {
  return get<AgentRunFilesResponse>(endpoints.testgen.agentFiles(runId));
}

/**
 * Push generated tests to GitHub and create a PR
 */
export async function pushToGitHub(
  runId: string,
  request: AgentPushRequest
): Promise<AgentPushResponse> {
  return post<AgentPushResponse>(endpoints.testgen.agentPush(runId), request);
}

/**
 * Rerun agent with human feedback
 */
export async function rerunWithFeedback(
  runId: string,
  request: { specId: string; feedback: string; maxIterations?: number; baseDirectory?: string }
): Promise<AgentRunResponse> {
  return post<AgentRunResponse>(endpoints.testgen.agentRerun(runId), request);
}

export const testgenService = {
  executeTests,
  getExecutionStatus,
  startAgentRun,
  getAgentRunStatus,
  getAgentRunFiles,
  pushToGitHub,
  rerunWithFeedback,
};
