import crypto from 'crypto';
import { config } from '../utils/config.js';
import { format, handleCommandError } from '../utils/format.js';
import { createSpinner } from '../utils/spinner.js';
import { CONSTANTS } from '../utils/constants.js';
import type { AuditOptions } from '../types/index.js';
import type { IChainClient, IIpfsClient } from '../interfaces.js';

export interface AuditDependencies {
  chainClient: IChainClient;
  ipfsClient: IIpfsClient;
}

/**
 * Audit a block's integrity on the blockchain.
 * @param blockId - Block ID to audit
 * @param options - Command options
 * @param deps - Injected dependencies
 */
export async function auditCommand(
  blockId: string, 
  options: AuditOptions, 
  deps: AuditDependencies
): Promise<void> {
  try {
    const chainSpinner = createSpinner(`Fetching Block ${blockId} from chain...`);
    let block;
    try {
      block = await deps.chainClient.getBlock(blockId);
      if (!block) {
        chainSpinner.fail(`[ERROR] Block ${blockId} not found on-chain.`);
        return;
      }
      chainSpinner.succeed(`[DONE] Found on-chain record for ${blockId}`);
    } catch (e) {
      chainSpinner.fail(`[FAILED] Failed to fetch block ${blockId}`);
      throw e;
    }

    format.detail('Record Details:');
    console.log(`  Agent: ${block.agentAddress}`);
    console.log(`  Hash:  ${block.contentHash}`);
    console.log(`  IPFS:  ${block.ipfsCID || 'None'}`);

    if (!block.ipfsCID) {
      format.warn('No IPFS CID. Cannot perform deep content audit.');
      return;
    }

    const ipfsSpinner = createSpinner('Fetching content from IPFS...');
    try {
      const key = options.key || config.encryptionKey;
      const content = await deps.ipfsClient.download(block.ipfsCID, key);

      const hash = crypto.createHash(CONSTANTS.HASH_ALGORITHM).update(content).digest('hex');
      const calcHash = CONSTANTS.HEX_PREFIX + hash;

      ipfsSpinner.succeed('[DONE] Content retrieved and hashed');
      console.log(`  Calculated: ${calcHash}`);

      if (calcHash === block.contentHash) {
        format.success('✅ INTEGRITY VERIFIED: Content matches chain hash.');
      } else {
        format.error('INTEGRITY FAILED: Hash mismatch!');
        console.log(`  Expected: ${block.contentHash}`);
        console.log(`  Got:      ${calcHash}`);
      }
    } catch (e) {
      ipfsSpinner.fail('[FAILED] IPFS download or hash failed');
      throw e;
    }
  } catch (error) {
    handleCommandError(error);
  }
}