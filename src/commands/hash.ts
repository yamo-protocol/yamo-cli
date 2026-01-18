import fs from 'fs';
import crypto from 'crypto';
import { CONSTANTS } from '../utils/constants.js';
import { format, handleCommandError } from '../utils/format.js';

/**
 * Calculate SHA256 hash of a file.
 * @param file - Path to file
 */
export function hashCommand(file: string): void {
  try {
    if (!fs.existsSync(file)) {
      throw new Error(`File not found: ${file}`);
    }

    const content = fs.readFileSync(file, 'utf-8').trim();
    const hash = crypto.createHash(CONSTANTS.HASH_ALGORITHM).update(content).digest('hex');
    const bytes32 = CONSTANTS.HEX_PREFIX + hash;

    format.success('Block Content Hash:');
    format.value(bytes32);
  } catch (error) {
    handleCommandError(error);
  }
}
