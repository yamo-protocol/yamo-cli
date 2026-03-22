import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import inquirer from 'inquirer';
import { config, validateConfig } from '../utils/config.js';
import { format, handleCommandError } from '../utils/format.js';
import { createSpinner } from '../utils/spinner.js';
import { validateBytes32, validateBlockId, validateArtifactPath } from '../utils/validation.js';
import { CONSTANTS } from '../utils/constants.js';
import type { SubmitOptions } from '../types/index.js';
import type { IChainClient, IIpfsClient } from '../interfaces.js';

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
async function resolvePreviousBlock(chainClient: IChainClient, prev?: string): Promise<string> {
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

export interface SubmitDependencies {
  chainClient: IChainClient;
  ipfsClient: IIpfsClient;
}

/**
 * Submit a YAMO block to the blockchain.
 * @param file - Path to YAMO file
 * @param options - Command options
 * @param deps - Injected dependencies (Chain and IPFS clients)
 */
export async function submitCommand(
  file: string, 
  options: SubmitOptions, 
  deps: SubmitDependencies
): Promise<void> {
  try {
    let blockId = options.id;

    // Interactive fallback for blockId
    if (!blockId && process.stdout.isTTY) {
      const answers = await inquirer.prompt<{ blockId: string }>([
        {
          type: 'input',
          name: 'blockId',
          message: 'Enter Unique Block ID (format: {origin}_{workflow}):',
          validate: (input: string): boolean | string => (validateBlockId(input) ? true : 'Invalid format. Use {origin}_{workflow}'),
        },
      ]);
      blockId = answers.blockId;
    }

    if (!blockId) {
      throw new Error('blockId is required. Provide it via --id or interactively.');
    }

    // Validate inputs
    validateBlockIdFormat(blockId);

    // Validate encryption key if needed
    let encryptionKey: string | undefined;
    if (options.encrypt) {
      let key = options.key || config.encryptionKey;
      
      if (!key && process.stdout.isTTY) {
        const answers = await inquirer.prompt<{ key: string }>([
          {
            type: 'password',
            name: 'key',
            message: 'Enter Encryption Key:',
            mask: '*',
          },
        ]);
        key = answers.key;
      }

      encryptionKey = validateConfig.requireEncryptionKey(key);
      await validateEncryptionKey(encryptionKey);
    }

    // Calculate content hash
    const content = fs.readFileSync(file, 'utf8').trim();
    const hash = crypto.createHash(CONSTANTS.HASH_ALGORITHM).update(content).digest('hex');
    const contentHash = CONSTANTS.HEX_PREFIX + hash;
    format.info(`Calculated Hash: ${contentHash}`);

    // Handle IPFS upload
    let ipfsCID: string | undefined;
    if (options.ipfs) {
      const spinner = createSpinner('Preparing and uploading to IPFS...');
      try {
        const files = prepareIpfsFiles(content, file);

        ipfsCID = await deps.ipfsClient.upload({ content, files, encryptionKey });
        spinner.succeed(`[DONE] Uploaded to IPFS`);
        format.info(`IPFS Bundle CID: ${ipfsCID}`);
      } catch (e) {
        spinner.fail('[FAILED] IPFS upload failed');
        throw e;
      }
    }

    // Resolve previous block
    const resolvedPreviousBlock = await resolvePreviousBlock(deps.chainClient, options.prev);

    // Submit to blockchain
    const txSpinner = createSpinner(`Submitting Block ${blockId} to blockchain...`);
    try {
      await deps.chainClient.submitBlock(
        blockId,
        resolvedPreviousBlock,
        contentHash,
        options.consensus,
        options.ledger,
        ipfsCID
      );
      txSpinner.succeed(`[DONE] Block ${blockId} anchored to chain`);
    } catch (e) {
      txSpinner.fail('[FAILED] Blockchain submission failed');
      throw e;
    }
  } catch (error) {
    handleCommandError(error);
  }
}