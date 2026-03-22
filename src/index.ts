#!/usr/bin/env node
import { Command } from 'commander';
import { YamoChainClient, IpfsManager } from '@yamo/core';
import { config } from './utils/config.js';
import { CONSTANTS } from './utils/constants.js';
import { hashCommand } from './commands/hash.js';
import { initCommand } from './commands/init.js';
import { submitCommand } from './commands/submit.js';
import { auditCommand } from './commands/audit.js';
import { downloadBundleCommand } from './commands/download-bundle.js';
import { configCommand } from './commands/config.js';
import { bridgeCommand } from './commands/bridge.js';

import type { SubmitOptions, AuditOptions } from './types/index.js';

const program = new Command();

program
  .name('yamo')
  .description('YAMO CLI - Blockchain-anchored agent workflow system')
  .version('1.3.14');

program
  .command('hash')
  .description('Calculate SHA256 hash of a file')
  .argument('<file>', 'Path to the file')
  .action(hashCommand);

program
  .command('init')
  .description('Create a new YAMO block template')
  .argument('<agent_name>', 'Name of the agent')
  .option('--intent <intent>', 'Intent description', CONSTANTS.DEFAULT_INTENT)
  .action(initCommand);

program
  .command('submit')
  .description('Submit a YAMO block to the blockchain')
  .argument('<file>', 'Path to the YAMO file')
  .option('--id <blockId>', 'Unique Block ID (format: {origin}_{workflow})')
  .option('--prev <previousBlock>', 'Previous block hash (auto-fetches if omitted)')
  .option('--consensus <type>', 'Consensus mechanism', CONSTANTS.DEFAULT_CONSENSUS)
  .option('--ledger <name>', 'Ledger name', CONSTANTS.DEFAULT_LEDGER)
  .option('--ipfs', 'Upload content to IPFS', false)
  .option('-e, --encrypt', 'Encrypt bundle before IPFS upload', false)
  .option('-k, --key <key>', 'Encryption/decryption key')
  .action((file: string, options: SubmitOptions) => {
    const chainClient = new YamoChainClient(config.rpcUrl, config.privateKey, config.contractAddress);
    const ipfsClient = new IpfsManager({ jwt: config.pinataJwt });
    return submitCommand(file, options, { chainClient, ipfsClient });
  });

program
  .command('audit')
  .description('Verify a block on the blockchain')
  .argument('<blockId>', 'Block ID to audit')
  .option('-k, --key <key>', 'Decryption key')
  .action((blockId: string, options: AuditOptions) => {
    const chainClient = new YamoChainClient(config.rpcUrl, config.privateKey, config.contractAddress);
    const ipfsClient = new IpfsManager({ jwt: config.pinataJwt });
    return auditCommand(blockId, options, { chainClient, ipfsClient });
  });

program
  .command('config')
  .description('Manage local configuration and secrets')
  .argument('<action>', 'Action: set, get, list, remove')
  .argument('[key]', 'Configuration key')
  .argument('[value]', 'Configuration value')
  .action(configCommand);

program
  .command('download-bundle')
  .description('Download bundle from IPFS')
  .argument('<cid>', 'IPFS content identifier')
  .requiredOption('-o, --output <path>', 'Output file path')
  .option('-k, --key <key>', 'Decryption key')
  .action(downloadBundleCommand);

program.addCommand(bridgeCommand());

program.parse();
