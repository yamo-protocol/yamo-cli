import chalk from 'chalk';

export const format = {
  success(msg: string): void {
    console.log(chalk.green(msg));
  },
  error(msg: string): void {
    console.error(chalk.red(`Error: ${msg}`));
  },
  info(msg: string): void {
    console.log(chalk.blue(msg));
  },
  warn(msg: string): void {
    console.log(chalk.yellow(msg));
  },
  detail(msg: string): void {
    console.log(chalk.gray(msg));
  },
  value(msg: string): void {
    console.log(chalk.cyan(msg));
  },
};

/**
 * Handles command errors with consistent formatting.
 * @param error - Error object or unknown value
 * @param context - Optional context message
 */
export function handleCommandError(error: unknown, context?: string): void {
  if (error instanceof Error) {
    const message = context ? `${context}: ${error.message}` : error.message;
    format.error(message);
  } else {
    format.error('Unknown error occurred');
  }
}
