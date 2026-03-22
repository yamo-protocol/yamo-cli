import { CONSTANTS } from './constants.js';

/**
 * Validates bytes32 hash format (0x + 64 hex characters).
 * @param hash - Hash string to validate
 * @returns True if valid bytes32 format
 */
export function validateBytes32(hash: string): boolean {
  return CONSTANTS.HASH_PATTERN.test(hash);
}

/**
 * Validates YAMO block ID format (origin_workflow).
 * Enforces alphanumeric characters and a single underscore.
 * @param blockId - Block identifier to validate
 * @returns True if valid format
 */
export function validateBlockId(blockId: string): boolean {
  const pattern = /^[a-z0-9]+_[a-z0-9]+$/i;
  return pattern.test(blockId);
}

/**
 * Validates artifact path for security (no path traversal).
 * @param artifactName - Artifact name from YAMO file
 * @param artifactPath - Resolved artifact path
 * @param inputDir - Directory of YAMO file
 * @throws Error if path is unsafe
 */
export function validateArtifactPath(
  artifactName: string,
  artifactPath: string,
  inputDir: string
): void {
  if (artifactName.includes('..') || artifactName.startsWith('/')) {
    throw new Error(
      `Invalid artifact name: ${artifactName}. Path traversal attempts are blocked for security.`
    );
  }

  if (!artifactPath.startsWith(inputDir)) {
    throw new Error(
      `Artifact path outside allowed directory: ${artifactName}. Only artifacts in the same directory or subdirectories are allowed.`
    );
  }
}
