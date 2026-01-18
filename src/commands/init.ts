import fs from 'fs';
import chalk from 'chalk';
import { CONSTANTS } from '../utils/constants.js';
import { format, handleCommandError } from '../utils/format.js';
import type { InitOptions } from '../types/index.js';

/**
 * Initialize a new YAMO block template.
 * @param agentName - Name of the agent
 * @param options - Command options
 */
export function initCommand(agentName: string, options: InitOptions): void {
  try {
    const template = `
agent: ${agentName};
intent: ${options.intent};
context:
  platform;yamo_v0.5;
constraints:
  - human_readable;true;
priority: medium;
output: result.json;
meta: hypothesis;Initial hypothesis;
meta: confidence;0.9;
log: session_start;timestamp;${new Date().toISOString()};
handoff: User;
    `.trim();

    fs.writeFileSync(CONSTANTS.DEFAULT_FILENAME, template);
    format.success(`Created YAMO template: ${chalk.bold(CONSTANTS.DEFAULT_FILENAME)}`);
  } catch (error) {
    handleCommandError(error);
  }
}
