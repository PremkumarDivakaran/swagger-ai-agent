/**
 * Settings DTOs
 * Data Transfer Objects for application settings (LLM + GitHub config)
 */

export interface LlmSettingsDto {
  provider: 'groq' | 'custom' | 'openai';
  groqApiKey?: string;
  groqModel?: string;
  customApiKey?: string;
  customModel?: string;
  openaiApiKey?: string;
  openaiModel?: string;
}

export interface GitHubSettingsDto {
  githubToken: string;
}

export interface GetSettingsResponseDto {
  llm: {
    provider: string;
    groqApiKey?: string;
    groqModel?: string;
    customApiKey?: string;
    customModel?: string;
    openaiApiKey?: string;
    openaiModel?: string;
  };
  github: {
    githubToken: string;
  };
}

export interface UpdateSettingsRequestDto {
  llm?: LlmSettingsDto;
  github?: GitHubSettingsDto;
}
