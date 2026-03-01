import chalk from 'chalk';
import { marked } from 'marked';
import TerminalRenderer from 'marked-terminal';

marked.use({ renderer: new TerminalRenderer() as any });

export function renderMarkdown(text: string): string {
  return marked.parse(text) as string;
}

export function printMarkdown(text: string): void {
  process.stdout.write(renderMarkdown(text));
}

export function printError(message: string): void {
  console.error(chalk.red(`Error: ${message}`));
}

export function printSuccess(message: string): void {
  console.log(chalk.green(message));
}

export function printInfo(message: string): void {
  console.log(chalk.dim(message));
}
