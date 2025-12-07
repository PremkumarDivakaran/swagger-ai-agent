/**
 * Tests for SwaggerLoader
 */

import { SwaggerLoader, UrlSource, FileSource, GitSource } from '../../../../src/infrastructure/swagger/SwaggerLoader';
import axios from 'axios';
import * as fs from 'fs/promises';

// Mock dependencies
jest.mock('axios');
jest.mock('fs/promises');

describe('SwaggerLoader', () => {
  let loader: SwaggerLoader;

  const sampleSpec = {
    openapi: '3.0.0',
    info: {
      title: 'Test API',
      version: '1.0.0',
    },
    paths: {
      '/users': {
        get: {
          summary: 'Get users',
          operationId: 'getUsers',
        },
      },
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    loader = new SwaggerLoader();
  });

  describe('loadFromUrl', () => {
    it('should load spec from HTTP URL', async () => {
      const source: UrlSource = { type: 'url', url: 'https://api.example.com/openapi.json' };
      (axios.get as jest.Mock).mockResolvedValue({ data: sampleSpec });

      const result = await loader.loadFromUrl(source);

      expect(axios.get).toHaveBeenCalledWith(source.url, expect.any(Object));
      expect(result.sourceType).toBe('url');
    });

    it('should throw error for failed request', async () => {
      const source: UrlSource = { type: 'url', url: 'https://api.example.com/openapi.json' };
      (axios.get as jest.Mock).mockRejectedValue(new Error('Network error'));

      await expect(loader.loadFromUrl(source)).rejects.toThrow();
    });
  });

  describe('loadFromFile', () => {
    it('should load JSON spec from file', async () => {
      const source: FileSource = { type: 'file', path: '/path/to/spec.json' };
      (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(sampleSpec));

      const result = await loader.loadFromFile(source);

      expect(fs.readFile).toHaveBeenCalledWith(source.path, 'utf-8');
      expect(result.sourceType).toBe('file');
    });

    it('should load YAML spec from file', async () => {
      const source: FileSource = { type: 'file', path: '/path/to/spec.yaml' };
      const yamlContent = `
openapi: "3.0.0"
info:
  title: Test API
  version: "1.0.0"
paths:
  /users:
    get:
      summary: Get users
      operationId: getUsers
`;
      (fs.readFile as jest.Mock).mockResolvedValue(yamlContent);

      const result = await loader.loadFromFile(source);

      expect(result.contentType).toBe('yaml');
    });

    it('should throw error for file read failure', async () => {
      const source: FileSource = { type: 'file', path: '/path/to/nonexistent.json' };
      (fs.readFile as jest.Mock).mockRejectedValue(new Error('ENOENT'));

      await expect(loader.loadFromFile(source)).rejects.toThrow();
    });
  });

  describe('loadFromGit', () => {
    it.skip('should load spec from GitHub raw URL (not yet implemented)', async () => {
      const source: GitSource = {
        type: 'git',
        repo: 'https://github.com/owner/repo',
        filePath: 'openapi.json',
        ref: 'main',
      };

      (axios.get as jest.Mock).mockResolvedValue({ data: sampleSpec });

      const result = await loader.loadFromGit(source);

      expect(axios.get).toHaveBeenCalledWith(
        expect.stringContaining('raw.githubusercontent.com'),
        expect.any(Object)
      );
      expect(result.sourceType).toBe('git');
    });

    it('should throw not implemented error for now', async () => {
      const source: GitSource = {
        type: 'git',
        repo: 'https://github.com/owner/repo',
        filePath: 'openapi.json',
        ref: 'main',
      };

      await expect(loader.loadFromGit(source)).rejects.toThrow('not yet implemented');
    });
  });
});
