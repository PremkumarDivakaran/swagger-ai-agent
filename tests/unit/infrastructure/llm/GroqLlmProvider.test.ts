/**
 * Tests for GroqLlmProvider
 */

import { GroqLlmProvider } from '../../../../src/infrastructure/llm/GroqLlmProvider';
import axios from 'axios';

// Mock axios
jest.mock('axios', () => {
  const mockInstance = {
    post: jest.fn(),
  };
  return {
    create: jest.fn(() => mockInstance),
    __mockInstance: mockInstance,
  };
});

describe('GroqLlmProvider', () => {
  let provider: GroqLlmProvider;
  const mockAxiosInstance = (axios as any).__mockInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    provider = new GroqLlmProvider({
      apiKey: 'test-api-key',
      model: 'meta-llama/llama-4-scout-17b-16e-instruct',
    });
  });

  describe('complete', () => {
    it('should make completion request', async () => {
      const mockResponse = {
        data: {
          choices: [
            {
              message: {
                content: 'Generated response',
                role: 'assistant',
              },
              finish_reason: 'stop',
            },
          ],
          usage: {
            prompt_tokens: 10,
            completion_tokens: 5,
            total_tokens: 15,
          },
          model: 'meta-llama/llama-4-scout-17b-16e-instruct',
        },
      };

      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const result = await provider.complete([
        { role: 'user', content: 'Test prompt' },
      ]);

      expect(mockAxiosInstance.post).toHaveBeenCalled();
      expect(result.content).toBe('Generated response');
      expect(result.usage?.totalTokens).toBe(15);
    });

    it('should include system prompt when provided', async () => {
      mockAxiosInstance.post.mockResolvedValue({
        data: {
          choices: [{ message: { content: 'Response', role: 'assistant' }, finish_reason: 'stop' }],
          usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
          model: 'test-model',
        },
      });

      await provider.complete([
        { role: 'system', content: 'You are a helpful assistant' },
        { role: 'user', content: 'Test prompt' },
      ]);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/chat/completions',
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({ role: 'system', content: 'You are a helpful assistant' }),
          ]),
        })
      );
    });

    it('should throw error on API failure', async () => {
      mockAxiosInstance.post.mockRejectedValue(new Error('API Error'));

      await expect(provider.complete([
        { role: 'user', content: 'Test prompt' },
      ])).rejects.toThrow();
    });

    it('should respect maxTokens option', async () => {
      mockAxiosInstance.post.mockResolvedValue({
        data: {
          choices: [{ message: { content: 'Response', role: 'assistant' }, finish_reason: 'stop' }],
          usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
          model: 'test-model',
        },
      });

      await provider.complete(
        [{ role: 'user', content: 'Test prompt' }],
        { maxTokens: 100 }
      );

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/chat/completions',
        expect.objectContaining({
          max_tokens: 100,
        })
      );
    });
  });

  describe('generateText', () => {
    it('should generate text from simple prompt', async () => {
      mockAxiosInstance.post.mockResolvedValue({
        data: {
          choices: [{ message: { content: 'Generated text', role: 'assistant' }, finish_reason: 'stop' }],
          usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
          model: 'test-model',
        },
      });

      const result = await provider.generateText('Simple prompt');

      expect(result).toBe('Generated text');
    });
  });

  describe('getAvailableModels', () => {
    it('should return list of available models', () => {
      const models = provider.getAvailableModels();

      expect(Array.isArray(models)).toBe(true);
      expect(models.length).toBeGreaterThan(0);
    });
  });

  describe('name', () => {
    it('should return provider name', () => {
      expect(provider.name).toBe('groq');
    });
  });

  describe('isAvailable', () => {
    it('should return true when API is accessible', async () => {
      mockAxiosInstance.post.mockResolvedValue({
        data: {
          choices: [{ message: { content: 'ok', role: 'assistant' }, finish_reason: 'stop' }],
          usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
          model: 'test-model',
        },
      });

      const available = await provider.isAvailable();

      expect(available).toBe(true);
    });

    it('should return false when API is not accessible', async () => {
      mockAxiosInstance.post.mockRejectedValue(new Error('Network error'));

      const available = await provider.isAvailable();

      expect(available).toBe(false);
    });
  });
});
