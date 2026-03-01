import { createInterface } from 'readline';
import chalk from 'chalk';
import { existsSync } from 'fs';
import { join } from 'path';
import { getConfig, isConfigured } from './config.js';
import { runAgent } from './agent.js';
import { runSetup } from './ui/setup.js';
import { VERSION } from './version.js';

function detectProject(): boolean {
  const markers = ['package.json', 'Cargo.toml', 'pyproject.toml', 'go.mod', 'Gemfile', 'pom.xml', 'build.gradle', '.git', 'README.md'];
  return markers.some((m) => existsSync(join(process.cwd(), m)));
}

export async function startRepl(): Promise<void> {
  if (!isConfigured()) {
    await runSetup();
  }

  console.log(chalk.bold(`\nFounder CLI v${VERSION}`));
  console.log(chalk.dim('523 frameworks. Describe your problem. Type "quit" or Ctrl+C to exit.\n'));

  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: chalk.cyan('founder > '),
  });

  // Clean exit on Ctrl+C
  rl.on('SIGINT', () => {
    console.log(chalk.dim('\n\nBye.'));
    process.exit(0);
  });

  rl.on('close', () => {
    console.log(chalk.dim('\nBye.'));
    process.exit(0);
  });

  rl.prompt();

  for await (const line of rl) {
    const input = line.trim();

    if (!input) {
      rl.prompt();
      continue;
    }

    if (input === 'quit' || input === 'exit' || input === 'q') {
      console.log(chalk.dim('Bye.'));
      process.exit(0);
    }

    if (input === 'help') {
      console.log(`
  ${chalk.bold('Interactive mode')}

  Just type your business problem and press Enter.

  ${chalk.cyan('quit')} / ${chalk.cyan('exit')} / ${chalk.cyan('Ctrl+C')}  Exit
  ${chalk.cyan('help')}                    Show this help
  ${chalk.cyan('list')}                    Show all categories
  ${chalk.cyan('list <category>')}         Show frameworks in a category
`);
      rl.prompt();
      continue;
    }

    if (input === 'list' || input.startsWith('list ')) {
      const { getAllCategories, getCategoryFrameworks } = await import('./skills/loader.js');
      const parts = input.split(/\s+/);
      const category = parts[1];

      if (category) {
        const frameworks = getCategoryFrameworks(category);
        if (!frameworks.length) {
          console.error(chalk.red(`Unknown category: ${category}`));
        } else {
          console.log(chalk.bold(`\n${category} frameworks:\n`));
          for (const fw of frameworks) {
            console.log(`  ${chalk.cyan(fw.slug)} — ${fw.name}: ${fw.description}`);
          }
        }
      } else {
        const categories = getAllCategories();
        console.log(chalk.bold('\nAvailable categories:\n'));
        for (const cat of categories) {
          console.log(`  ${chalk.cyan(cat.name.padEnd(20))} ${chalk.dim(`${cat.frameworkCount} frameworks`)}  ${cat.description}`);
        }
        console.log(`\n  ${chalk.dim('Total: ' + categories.reduce((sum: number, c: any) => sum + c.frameworkCount, 0) + ' frameworks')}`);
      }
      console.log();
      rl.prompt();
      continue;
    }

    // Parse optional flags from input: -c category, -f framework
    let category: string | undefined;
    let framework: string | undefined;
    let userInput = input;

    const catMatch = input.match(/^-c\s+(\S+)\s+([\s\S]+)$/);
    if (catMatch) {
      category = catMatch[1];
      userInput = catMatch[2];
    }

    const fwMatch = input.match(/^-f\s+(\S+)\s+([\s\S]+)$/);
    if (fwMatch) {
      framework = fwMatch[1];
      userInput = fwMatch[2];
    }

    const config = getConfig();
    const allowFileAccess = detectProject();
    console.log();

    await runAgent({
      config,
      input: userInput,
      category,
      framework,
      allowFileAccess,
    });

    console.log();
    rl.prompt();
  }
}
