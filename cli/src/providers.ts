import type { Config } from './config.js';

export const DEFAULT_MODELS: Record<string, string> = {
  anthropic: 'claude-sonnet-4-20250514',
  openai: 'gpt-4o',
  google: 'gemini-2.0-flash',
  openrouter: 'anthropic/claude-sonnet-4',
};

export const RECOMMENDED_MODELS: Record<string, string[]> = {
  anthropic: ['claude-opus-4-6', 'claude-sonnet-4-20250514'],
  openai: ['gpt-4o', 'gpt-4-turbo', 'o1'],
  google: ['gemini-2.0-flash', 'gemini-2.5-pro'],
  openrouter: ['anthropic/claude-sonnet-4', 'openai/gpt-4o', 'google/gemini-2.0-flash'],
};

export async function getModel(config: Config) {
  const modelId = config.model ?? DEFAULT_MODELS[config.provider] ?? 'gpt-4o';

  switch (config.provider) {
    case 'anthropic': {
      const { createAnthropic } = await import('@ai-sdk/anthropic');
      return createAnthropic({ apiKey: config.apiKey })(modelId);
    }
    case 'openai': {
      const { createOpenAI } = await import('@ai-sdk/openai');
      return createOpenAI({ apiKey: config.apiKey })(modelId);
    }
    case 'google': {
      const { createGoogleGenerativeAI } = await import('@ai-sdk/google');
      return createGoogleGenerativeAI({ apiKey: config.apiKey })(modelId);
    }
    case 'openrouter': {
      const { createOpenAI } = await import('@ai-sdk/openai');
      return createOpenAI({
        baseURL: 'https://openrouter.ai/api/v1',
        apiKey: config.apiKey,
      })(modelId);
    }
    case 'custom': {
      const { createOpenAI } = await import('@ai-sdk/openai');
      return createOpenAI({
        baseURL: config.baseUrl!,
        apiKey: config.apiKey,
      })(modelId);
    }
    default:
      throw new Error(`Unknown provider: ${config.provider}`);
  }
}
