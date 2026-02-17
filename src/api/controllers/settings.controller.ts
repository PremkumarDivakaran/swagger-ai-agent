/**
 * Settings Controller
 * Reads and writes application settings from/to the .env file
 */

import * as fs from 'fs';
import * as path from 'path';
import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../../core/types';
import type { GetSettingsResponseDto, UpdateSettingsRequestDto } from '../dto/settings.dto';

const ENV_PATH = path.resolve(process.cwd(), '.env');

/** Mask an API key for display (show first 4 and last 4 chars) */
function maskKey(key?: string): string | undefined {
  if (!key || key.length < 10) return key ? '****' : undefined;
  return `${key.slice(0, 4)}...${key.slice(-4)}`;
}

/** Parse the .env file into a key-value map */
function readEnvFile(): Map<string, string> {
  const map = new Map<string, string>();
  if (!fs.existsSync(ENV_PATH)) return map;
  const lines = fs.readFileSync(ENV_PATH, 'utf-8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex < 0) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    const value = trimmed.slice(eqIndex + 1).trim();
    map.set(key, value);
  }
  return map;
}

/** Write updated values back to the .env file, preserving comments and structure */
function updateEnvFile(updates: Record<string, string>): void {
  if (!fs.existsSync(ENV_PATH)) {
    const lines = Object.entries(updates).map(([k, v]) => `${k}=${v}`);
    fs.writeFileSync(ENV_PATH, lines.join('\n') + '\n', 'utf-8');
    return;
  }

  const content = fs.readFileSync(ENV_PATH, 'utf-8');
  const lines = content.split('\n');
  const updatedKeys = new Set<string>();
  const newLines: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      newLines.push(line);
      continue;
    }
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex < 0) {
      newLines.push(line);
      continue;
    }
    const key = trimmed.slice(0, eqIndex).trim();
    if (key in updates) {
      newLines.push(`${key}=${updates[key]}`);
      updatedKeys.add(key);
    } else {
      newLines.push(line);
    }
  }

  // Append any new keys that weren't already in the file
  for (const [key, value] of Object.entries(updates)) {
    if (!updatedKeys.has(key)) {
      newLines.push(`${key}=${value}`);
    }
  }

  fs.writeFileSync(ENV_PATH, newLines.join('\n'), 'utf-8');
}

export class SettingsController {
  /**
   * GET /settings
   * Returns current settings with masked API keys
   */
  async getSettings(
    _req: Request,
    res: Response<ApiResponse<GetSettingsResponseDto>>,
    next: NextFunction
  ): Promise<void> {
    try {
      const env = readEnvFile();

      const response: ApiResponse<GetSettingsResponseDto> = {
        success: true,
        data: {
          llm: {
            provider: env.get('LLM_PROVIDER') || 'groq',
            groqApiKey: maskKey(env.get('GROQ_API_KEY')),
            groqModel: env.get('GROQ_MODEL') || 'llama-3.3-70b-versatile',
            testleafApiKey: maskKey(env.get('TESTLEAF_API_KEY')),
            testleafModel: env.get('TESTLEAF_MODEL') || 'gpt-4o-mini',
            openaiApiKey: maskKey(env.get('OPENAI_API_KEY')),
            openaiModel: env.get('OPENAI_MODEL') || 'gpt-4o-mini',
          },
          github: {
            githubToken: maskKey(env.get('GITHUB_TOKEN')) || '',
          },
        },
        meta: { timestamp: new Date().toISOString() },
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /settings
   * Updates settings in the .env file
   */
  async updateSettings(
    req: Request<unknown, unknown, UpdateSettingsRequestDto>,
    res: Response<ApiResponse<{ message: string }>>,
    next: NextFunction
  ): Promise<void> {
    try {
      const { llm, github } = req.body;
      const updates: Record<string, string> = {};

      if (llm) {
        if (llm.provider) updates['LLM_PROVIDER'] = llm.provider;
        if (llm.groqApiKey) updates['GROQ_API_KEY'] = llm.groqApiKey;
        if (llm.groqModel) updates['GROQ_MODEL'] = llm.groqModel;
        if (llm.testleafApiKey) updates['TESTLEAF_API_KEY'] = llm.testleafApiKey;
        if (llm.testleafModel) updates['TESTLEAF_MODEL'] = llm.testleafModel;
        if (llm.openaiApiKey) updates['OPENAI_API_KEY'] = llm.openaiApiKey;
        if (llm.openaiModel) updates['OPENAI_MODEL'] = llm.openaiModel;
      }

      if (github) {
        if (github.githubToken) updates['GITHUB_TOKEN'] = github.githubToken;
      }

      if (Object.keys(updates).length > 0) {
        updateEnvFile(updates);

        // Reload into process.env for immediate effect
        for (const [key, value] of Object.entries(updates)) {
          process.env[key] = value;
        }
      }

      res.status(200).json({
        success: true,
        data: { message: 'Settings updated successfully' },
        meta: { timestamp: new Date().toISOString() },
      });
    } catch (error) {
      next(error);
    }
  }
}

export function createSettingsController(): SettingsController {
  return new SettingsController();
}
