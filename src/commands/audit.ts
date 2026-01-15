import crypto from 'crypto';
import * as dotenv from 'dotenv';
import { YamoChainClient, IpfsManager } from '@yamo/core';
import { format, handleCommandError } from '../utils/format.js';
import { CONSTANTS } from '../utils/constants.js';
import type { AuditOptions } from '../types/index.js';

dotenv.config();

/**
 * Audit a block's integrity on the blockchain.
 * @param blockId - Block ID to audit
 * @param options - Command options
 */
export async function auditCommand(blockId: string, options: AuditOptions): Promise<void> {
  try {
    format.info(`Auditing Block ${blockId}...`);

    const chainClient = new YamoChainClient();
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

    const ipfsManager = new IpfsManager();
    const key = options.key || process.env.YAMO_ENCRYPTION_KEY;
    const content = await ipfsManager.download(block.ipfsCID, key);

    const hash = crypto.createHash(CONSTANTS.HASH_ALGORITHM).update(content).digest('hex');
    const calcHash = CONSTANTS.HEX_PREFIX + hash;

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
}
