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

export const testgenService = {
  executeTests,
  getExecutionStatus,
  startAgentRun,
  getAgentRunStatus,
};
