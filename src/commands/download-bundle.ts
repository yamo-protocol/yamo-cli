import fs from 'fs';
import path from 'path';
import * as dotenv from 'dotenv';
import { IpfsManager } from '@yamo/core';
import { format, handleCommandError } from '../utils/format.js';
import { CONSTANTS } from '../utils/constants.js';
import type { DownloadOptions } from '../types/index.js';

dotenv.config();

/**
 * Download a bundle from IPFS.
 * @param cid - IPFS content identifier
 * @param options - Command options
 */
export async function downloadBundleCommand(cid: string, options: DownloadOptions): Promise<void> {
  try {
    format.info(`Downloading bundle ${cid}...`);

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
      fs.writeFileSync(filePath, content);
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
}
