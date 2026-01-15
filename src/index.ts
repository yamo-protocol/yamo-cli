#!/usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import * as dotenv from 'dotenv';
import { IpfsManager, YamoChainClient } from '@yamo/core';
import { CONSTANTS } from './utils/constants.js';
import { format, handleCommandError } from './utils/format.js';
import { validateBytes32, validateBlockId, validateArtifactPath } from './utils/validation.js';
import type { InitOptions, SubmitOptions, AuditOptions, DownloadOptions } from './types/index.js';

const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8'));

dotenv.config();

const program = new Command();
const ipfsManager = new IpfsManager();
const chainClient = new YamoChainClient();

// Hash utilities
const hash = {
  sha256: (content: string): string => {
    return crypto.createHash(CONSTANTS.HASH_ALGORITHM).update(content).digest('hex');
  },
  bytes32: (content: string): string => {
    return `${CONSTANTS.HEX_PREFIX}${hash.sha256(content)}`;
  },
};

// Submit command helpers
function validateBytes32Hash(value: string, fieldName: string): void {
  if (!validateBytes32(value)) {
    throw new Error(
      `${fieldName} must be a valid bytes32 hash (0x + 64 hex chars). ` +
        `Received: ${value.substring(0, 20)}...` +
        `\nDo NOT include algorithm prefixes like "sha256:"`
    );
  }
}

function validateBlockIdFormat(blockId: string): void {
  if (!blockId) throw new Error('blockId is required');

  if (!validateBlockId(blockId)) {
    throw new Error(
      `blockId must follow format {origin}_{workflow} (e.g., 'claude_chain'). Received: ${blockId}`
    );
  }
}

// Submit command helpers
async function validateEncryptionKey(key: string): Promise<void> {
  const { validatePasswordStrength } = await import('@yamo/core');
  try {
    validatePasswordStrength(key);
  } catch (e: any) {
    format.error('Password validation failed:');
    format.error(e.message);
    format.warn('\nKey requirements:');
    console.error('  • Minimum 12 characters');
    console.error('  • Mix of uppercase, lowercase, numbers, symbols');
    console.error('  • Avoid common patterns (password, 123456, qwerty)');
    throw e;
  }
}

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

async function resolvePreviousBlock(prev?: string): Promise<string> {
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

program
  .name('yamo')
  .description('YAMO Protocol CLI - Manage Agentic Reasoning Chains')
  .version(pkg.version);

program
  .command('hash')
  .description('Calculate the content hash of a YAMO block')
  .argument('<file>', 'Path to the YAMO file')
  .action((file: string) => {
    try {
      const content = fs.readFileSync(file, 'utf8').trim();
      const contentHash = hash.bytes32(content);
      format.success('Block Content Hash:');
      format.value(contentHash);
    } catch (error) {
      handleCommandError(error);
    }
  });

program
  .command('init')
  .description('Initialize a new YAMO block template')
  .argument('<agent_name>', 'Name of the agent')
  .option('-i, --intent <intent>', 'Agent intent', CONSTANTS.DEFAULT_INTENT)
  .action((agent_name: string, options: InitOptions) => {
    try {
      const template = `
agent: ${agent_name};
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
  });

program
  .command('submit')
  .description('Submit a YAMO block to the blockchain')
  .argument('<file>', 'Path to the YAMO file')
  .requiredOption('--id <blockId>', 'Unique Block ID')
  .option('--prev <previousBlock>', 'Previous Block Hash (omits to auto-fetch from chain)')
  .option('--consensus <type>', 'Consensus Type', CONSTANTS.DEFAULT_CONSENSUS)
  .option('--ledger <name>', 'Ledger Name', CONSTANTS.DEFAULT_LEDGER)
  .option('--ipfs', 'Upload content to IPFS before submitting')
  .option('-e, --encrypt', 'Encrypt the bundle')
  .option('-k, --key <key>', 'Encryption key (or set YAMO_ENCRYPTION_KEY)')
  .action(async (file: string, options: SubmitOptions) => {
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
      const contentHash = hash.bytes32(content);
      format.info(`Calculated Hash: ${contentHash}`);

      // Handle IPFS upload
      let ipfsCID: string | undefined;
      if (options.ipfs) {
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
      const resolvedPreviousBlock = await resolvePreviousBlock(options.prev);

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
  });

program
  .command('audit')
  .description("Audit a block's integrity (Chain vs IPFS)")
  .argument('<blockId>', 'Block ID to audit')
  .option('-k, --key <key>', 'Decryption key')
  .action(async (blockId: string, options: AuditOptions) => {
    try {
      format.info(`Auditing Block ${blockId}...`);

      const block = await chainClient.getBlock(blockId);
      if (!block) {
        format.error('Block not found on-chain.');
        return;
      }

      format.detail('Found on-chain record:');
      console.log(`  Agent: ${block.agentAddress}`);
      console.log(`  Hash:  ${block.contentHash}`);
      console.log(`  IPFS:  ${block.ipfsCID || 'None'}`);

      if (!block.ipfsCID) {
        format.warn('⚠️  No IPFS CID. Cannot perform deep content audit.');
        return;
      }

      format.info('Fetching content from IPFS...');

      const key = options.key || process.env.YAMO_ENCRYPTION_KEY;
      const content = await ipfsManager.download(block.ipfsCID, key);
      const calcHash = hash.bytes32(content);

      console.log(`  Calculated: ${calcHash}`);

      if (calcHash === block.contentHash) {
        format.success('✅ INTEGRITY VERIFIED: Content matches chain hash.');
      } else {
        format.error('❌ INTEGRITY FAILED: Hash mismatch!');
        console.log(`  Expected: ${block.contentHash}`);
        console.log(`  Got:      ${calcHash}`);
      }
    } catch (error) {
      handleCommandError(error);
    }
  });

program
  .command('download-bundle')
  .description('Download complete IPFS bundle including all artifacts')
  .argument('<cid>', 'IPFS CID to download')
  .option('-k, --key <key>', 'Decryption key (if encrypted)')
  .option('-o, --output <dir>', 'Output directory (default: ./bundle_<cid>)', './bundle_<cid>')
  .action(async (cid: string, options: DownloadOptions) => {
    try {
      format.info(`Downloading bundle ${cid}...`);

      const { IpfsManager } = await import('@yamo/core');
      const ipfs = new IpfsManager();
      const key = options.key || process.env.YAMO_ENCRYPTION_KEY;
      const bundle = await ipfs.downloadBundle(cid, key);

      // Create output directory
      const outputDir = options.output.replace('<cid>', cid.substring(0, 8));
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      // Write block.yamo
      fs.writeFileSync(path.join(outputDir, CONSTANTS.DEFAULT_FILENAME), bundle.block);
      format.success(`✓ Downloaded ${CONSTANTS.DEFAULT_FILENAME}`);

      // Write metadata
      if (bundle.metadata) {
        fs.writeFileSync(
          path.join(outputDir, 'metadata.json'),
          JSON.stringify(bundle.metadata, null, 2)
        );
        format.success('✓ Downloaded metadata.json');
      }

      // Write artifact files
      for (const [filename, content] of Object.entries(bundle.files)) {
        const filePath = path.join(outputDir, filename);
        fs.writeFileSync(filePath, content as string);
        format.success(`✓ Downloaded ${filename}`);
      }

      format.success(`\nBundle saved to: ${outputDir}`);
      format.detail(`Files: ${1 + Object.keys(bundle.files).length} total`);

      if (bundle.metadata?.hasEncryption) {
        format.warn('🔒 Bundle was decrypted using provided key');
      }
    } catch (error) {
      handleCommandError(error);
      format.detail('\nIf the bundle is encrypted, provide --key or set YAMO_ENCRYPTION_KEY');
    }
  });

program.parse();
