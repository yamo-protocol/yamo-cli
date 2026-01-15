import chalk from 'chalk';

export const format = {
  success: (msg: string): void => console.log(chalk.green(msg)),
  error: (msg: string): void => console.error(chalk.red(`Error: ${msg}`)),
  info: (msg: string): void => console.log(chalk.blue(msg)),
  warn: (msg: string): void => console.log(chalk.yellow(msg)),
  detail: (msg: string): void => console.log(chalk.gray(msg)),
  value: (msg: string): void => console.log(chalk.cyan(msg)),
};
