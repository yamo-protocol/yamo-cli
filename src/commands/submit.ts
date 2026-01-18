import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import * as dotenv from 'dotenv';
import { YamoChainClient, IpfsManager } from '@yamo/core';
import { format, handleCommandError } from '../utils/format.js';
import { validateBytes32, validateBlockId, validateArtifactPath } from '../utils/validation.js';
import { CONSTANTS } from '../utils/constants.js';
import type { SubmitOptions } from '../types/index.js';

dotenv.config();

/**
 * Validate bytes32 hash format
 */
function validateBytes32Hash(value: string, fieldName: string): void {
  if (!validateBytes32(value)) {
    throw new Error(
      `${fieldName} must be a valid bytes32 hash (0x + 64 hex chars). ` +
        `Received: ${value.substring(0, 20)}...` +
        `\nDo NOT include algorithm prefixes like "sha256:"`
    );
  }
}

/**
 * Validate block ID format
 */
function validateBlockIdFormat(blockId: string): void {
  if (!blockId) throw new Error('blockId is required');

  if (!validateBlockId(blockId)) {
    throw new Error(
      `blockId must follow format {origin}_{workflow} (e.g., 'claude_chain'). Received: ${blockId}`
    );
  }
}

/**
 * Validate encryption key strength
 */
async function validateEncryptionKey(key: string): Promise<void> {
  const { validatePasswordStrength } = await import('@yamo/core');
  try {
    validatePasswordStrength(key);
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : 'Unknown validation error';
    format.error('Password validation failed:');
    format.error(errorMessage);
    format.warn('\nKey requirements:');
    console.error('  • Minimum 12 characters');
    console.error('  • Mix of uppercase, lowercase, numbers, symbols');
    console.error('  • Avoid common patterns (password, 123456, qwerty)');
    throw e;
  }
}

/**
 * Prepare files for IPFS upload
 */
function prepareIpfsFiles(content: string, file: string): Array<{ name: string; content: string }> {
  const files: Array<{ name: string; content: string }> = [
    { name: CONSTANTS.DEFAULT_FILENAME, content },
  ];
  const outputMatch = content.match(/output:\s*([^;]+);/);

  if (outputMatch) {
    const artifactName = outputMatch[1].trim();

    const artifactPath = path.join(path.dirname(file), artifactName);
    const resolvedPath = path.resolve(artifactPath);
    const inputDir = path.resolve(path.dirname(file));

    // Security: Validate artifact path
    validateArtifactPath(artifactName, resolvedPath, inputDir);

    if (fs.existsSync(resolvedPath)) {
      format.info(`Bundling output: ${artifactName}`);
      files.push({ name: artifactName, content: fs.readFileSync(resolvedPath, 'utf8') });
    }
  }

  return files;
}

/**
 * Resolve previous block hash
 */
async function resolvePreviousBlock(chainClient: YamoChainClient, prev?: string): Promise<string> {
  if (prev) {
    validateBytes32Hash(prev, 'previousBlock');
    return prev;
  }

  format.info('[INFO] No previousBlock provided, fetching latest block from chain...');
  const latestHash = await chainClient.getLatestBlockHash();

  if (latestHash && latestHash !== CONSTANTS.GENESIS_HASH) {
    format.success(`[INFO] Using latest block's contentHash: ${latestHash}`);
    return latestHash;
  }

  format.warn('[INFO] No existing blocks found, using genesis');
  return CONSTANTS.GENESIS_HASH;
}

/**
 * Submit a YAMO block to the blockchain.
 * @param file - Path to YAMO file
 * @param options - Command options
 */
export async function submitCommand(file: string, options: SubmitOptions): Promise<void> {
  try {
    // Validate inputs
    validateBlockIdFormat(options.id);

    // Validate encryption key if needed
    if (options.encrypt) {
      const key = options.key || process.env.YAMO_ENCRYPTION_KEY;
      if (!key) {
        throw new Error(
          'Encryption enabled but no key provided. Use --key or set YAMO_ENCRYPTION_KEY'
        );
      }
      await validateEncryptionKey(key);
    }

    // Calculate content hash
    const content = fs.readFileSync(file, 'utf8').trim();
    const hash = crypto.createHash(CONSTANTS.HASH_ALGORITHM).update(content).digest('hex');
    const contentHash = CONSTANTS.HEX_PREFIX + hash;
    format.info(`Calculated Hash: ${contentHash}`);

    // Handle IPFS upload
    let ipfsCID: string | undefined;
    if (options.ipfs) {
      const ipfsManager = new IpfsManager();
      const files = prepareIpfsFiles(content, file);

      const encryptionKey = options.encrypt
        ? options.key || process.env.YAMO_ENCRYPTION_KEY
        : undefined;

      if (encryptionKey) {
        format.warn('🔒 Encrypting bundle...');
      }

      ipfsCID = await ipfsManager.upload({ content, files, encryptionKey });
      format.info(`IPFS Bundle CID: ${ipfsCID}`);
    }

    // Resolve previous block
    const chainClient = new YamoChainClient();
    const resolvedPreviousBlock = await resolvePreviousBlock(chainClient, options.prev);

    // Submit to blockchain
    await chainClient.submitBlock(
      options.id,
      resolvedPreviousBlock,
      contentHash,
      options.consensus,
      options.ledger,
      ipfsCID
    );
  } catch (error) {
    handleCommandError(error);
  }
}
