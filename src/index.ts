#!/usr/bin/env node
import { Command } from 'commander';
import fs from 'fs';
import path from 'path';
import { CONSTANTS } from './utils/constants.js';
import { hashCommand } from './commands/hash.js';
import { initCommand } from './commands/init.js';
import { auditCommand } from './commands/audit.js';
import { downloadBundleCommand } from './commands/download-bundle.js';
import { submitCommand } from './commands/submit.js';

const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8'));

const program = new Command();

program
  .name('yamo')
  .description('YAMO Protocol CLI - Manage Agentic Reasoning Chains')
  .version(pkg.version);

program
  .command('hash')
  .description('Calculate the content hash of a YAMO block')
  .argument('<file>', 'Path to the YAMO file')
  .action(hashCommand);

program
  .command('init')
  .description('Initialize a new YAMO block template')
  .argument('<agent_name>', 'Name of the agent')
  .option('-i, --intent <intent>', 'Agent intent', CONSTANTS.DEFAULT_INTENT)
  .action(initCommand);

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
  .action(submitCommand);

program
  .command('audit')
  .description("Audit a block's integrity (Chain vs IPFS)")
  .argument('<blockId>', 'Block ID to audit')
  .option('-k, --key <key>', 'Decryption key')
  .action(auditCommand);

program
  .command('download-bundle')
  .description('Download complete IPFS bundle including all artifacts')
  .argument('<cid>', 'IPFS CID to download')
  .option('-k, --key <key>', 'Decryption key (if encrypted)')
  .option('-o, --output <dir>', 'Output directory (default: ./bundle_<cid>)', './bundle_<cid>')
  .action(downloadBundleCommand);

program.parse();
