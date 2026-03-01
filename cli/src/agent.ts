import { streamText } from 'ai';
import type { Config } from './config.js';
import { getModel } from './providers.js';
import { buildSystemPrompt } from './skills/router.js';
import { applyFrameworkTool } from './tools/apply-framework.js';
import { listFrameworksTool } from './tools/list-frameworks.js';
import { renderMarkdown } from './ui/output.js';

export interface AgentOptions {
  config: Config;
  input: string;
  category?: string;
  framework?: string;
}

export async function runAgent(options: AgentOptions): Promise<void> {
  const { config, input, category, framework } = options;

  const model = await getModel(config);
  const systemPrompt = buildSystemPrompt({ category, framework });

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
}
