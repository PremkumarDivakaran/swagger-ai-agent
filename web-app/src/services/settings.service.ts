/**
 * Settings Service
 * API calls for application settings management
 */

import { get, put } from './api.client';
import { endpoints } from '@/config';

export interface LlmSettings {
  provider: string;
  groqApiKey?: string;
  groqModel?: string;
  testleafApiKey?: string;
  testleafModel?: string;
  openaiApiKey?: string;
  openaiModel?: string;
}

export interface GitHubSettings {
  githubToken: string;
}

export interface AppSettings {
  llm: LlmSettings;
  github: GitHubSettings;
}

export interface UpdateSettingsRequest {
  llm?: Partial<LlmSettings>;
  github?: Partial<GitHubSettings>;
}

/**
 * Get current settings (API keys are masked)
 */
export async function getSettings(): Promise<AppSettings> {
  return get<AppSettings>(endpoints.settings.get);
}

/**
 * Update settings
 */
export async function updateSettings(
  request: UpdateSettingsRequest
): Promise<{ message: string }> {
  return put<{ message: string }>(endpoints.settings.update, request);
}

export const settingsService = {
  getSettings,
  updateSettings,
};
