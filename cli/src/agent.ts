import { streamText } from 'ai';
import chalk from 'chalk';
import type { Config } from './config.js';
import { getModel } from './providers.js';
import { buildSystemPrompt } from './skills/router.js';
import { applyFrameworkTool } from './tools/apply-framework.js';
import { listFrameworksTool } from './tools/list-frameworks.js';

export interface AgentOptions {
  config: Config;
  input: string;
  category?: string;
  framework?: string;
}

export async function runAgent(options: AgentOptions): Promise<void> {
  const { config, input, category, framework } = options;

  let model;
  try {
    model = await getModel(config);
  } catch (e: any) {
    console.error(chalk.red(`Failed to initialize model: ${e.message}`));
    console.error(chalk.dim('Run `founder config setup` to reconfigure.'));
    process.exit(1);
  }

  const systemPrompt = buildSystemPrompt({ category, framework });

  try {
    const result = streamText({
      model,
      system: systemPrompt,
      messages: [{ role: 'user', content: input }],
      tools: {
        applyFramework: applyFrameworkTool,
        listFrameworks: listFrameworksTool,
      },
      maxSteps: 10,
    });

    let fullText = '';
    for await (const chunk of result.textStream) {
      fullText += chunk;
      process.stdout.write(chunk);
    }

    // Add trailing newline if needed
    if (fullText && !fullText.endsWith('\n')) {
      process.stdout.write('\n');
    }
  } catch (e: any) {
    const msg = e.message ?? String(e);

    if (msg.includes('401') || msg.includes('Unauthorized') || msg.includes('invalid_api_key')) {
      console.error(chalk.red('\nInvalid API key.'));
      console.error(chalk.dim('Run `founder config setup` to reconfigure.'));
    } else if (msg.includes('429') || msg.includes('rate_limit')) {
      console.error(chalk.red('\nRate limited. Wait a moment and try again.'));
    } else if (msg.includes('thought_signature') || msg.includes('INVALID_ARGUMENT')) {
      console.error(chalk.red(`\nThis model doesn't support tool calling properly.`));
      console.error(chalk.dim('Try a different model: `founder config set model gemini-2.5-flash`'));
    } else {
      console.error(chalk.red(`\nError: ${msg}`));
    }
    process.exit(1);
  }
}
