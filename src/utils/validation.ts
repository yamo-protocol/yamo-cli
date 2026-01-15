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
 * @param blockId - Block identifier to validate
 * @returns True if valid format
 */
export function validateBlockId(blockId: string): boolean {
  const parts = blockId.split('_');
  return parts.length === 2 && parts.every((p) => p.length > 0);
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
