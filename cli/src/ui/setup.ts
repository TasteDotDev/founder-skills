import prompts from 'prompts';
import chalk from 'chalk';
import { setConfig, type Provider } from '../config.js';
import { DEFAULT_MODELS, RECOMMENDED_MODELS } from '../providers.js';

const PROVIDERS: { title: string; value: Provider; description: string }[] = [
  { title: 'Anthropic (Claude)', value: 'anthropic', description: 'claude-sonnet-4, claude-opus-4' },
  { title: 'OpenAI', value: 'openai', description: 'gpt-4o, o1' },
  { title: 'Google (Gemini)', value: 'google', description: 'gemini-2.0-flash, gemini-2.5-pro' },
  { title: 'OpenRouter', value: 'openrouter', description: 'Any model via openrouter.ai' },
  { title: 'Custom (OpenAI-compatible)', value: 'custom', description: 'Any OpenAI-compatible API' },
];

export async function runSetup(): Promise<void> {
  console.log(chalk.bold('\nFounder CLI Setup\n'));
  console.log(chalk.dim('Configure your LLM provider and API key.\n'));

  const { provider } = await prompts({
    type: 'select',
    name: 'provider',
    message: 'Choose your LLM provider',
    choices: PROVIDERS,
  });

  if (!provider) {
    console.log(chalk.dim('Setup cancelled.'));
    process.exit(1);
  }

  setConfig('provider', provider);

  const { apiKey } = await prompts({
    type: 'password',
    name: 'apiKey',
    message: `Enter your ${provider} API key`,
  });

  if (!apiKey) {
    console.log(chalk.dim('Setup cancelled.'));
    process.exit(1);
  }

  setConfig('apiKey', apiKey);

  if (provider === 'custom') {
    const { baseUrl } = await prompts({
      type: 'text',
      name: 'baseUrl',
      message: 'Enter the API base URL',
      initial: 'http://localhost:11434/v1',
    });

    if (baseUrl) {
      setConfig('baseUrl', baseUrl);
    }
  }

  // Optional model selection
  const recommended = RECOMMENDED_MODELS[provider] ?? [];
  const defaultModel = DEFAULT_MODELS[provider] ?? '';

  if (recommended.length > 0) {
    const { model } = await prompts({
      type: 'select',
      name: 'model',
      message: 'Choose a model (or keep default)',
      choices: [
        { title: `Default (${defaultModel})`, value: '' },
        ...recommended.map(m => ({ title: m, value: m })),
        { title: 'Custom model ID', value: '__custom__' },
      ],
    });

    if (model === '__custom__') {
      const { customModel } = await prompts({
        type: 'text',
        name: 'customModel',
        message: 'Enter the model ID',
      });
      if (customModel) {
        setConfig('model', customModel);
      }
    } else if (model) {
      setConfig('model', model);
    }
  }

  console.log(chalk.green('\nSetup complete!'));
  console.log(chalk.dim(`Config saved. Run ${chalk.cyan('founder config show')} to review.\n`));
}
