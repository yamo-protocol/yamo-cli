import ora, { Ora } from 'ora';

/**
 * Creates and starts a professional, emoji-free spinner.
 * @param text - The text to display with the spinner
 * @returns The spinner instance
 */
export function createSpinner(text: string): Ora {
  return ora({
    text,
    color: 'blue',
    spinner: 'dots',
  }).start();
}

/**
 * Wraps a promise with a spinner.
 * @param promise - The promise to track
 * @param text - The text to display
 * @returns The result of the promise
 */
export async function withSpinner<T>(promise: Promise<T>, text: string): Promise<T> {
  const spinner = createSpinner(text);
  try {
    const result = await promise;
    spinner.succeed(`[DONE] ${text}`);
    return result;
  } catch (error) {
    spinner.fail(`[FAILED] ${text}`);
    throw error;
  }
}
