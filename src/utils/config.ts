import * as dotenv from 'dotenv';
import { storage } from './storage.js';

// Load environment variables
dotenv.config();

/**
 * Centralized configuration for YAMO CLI.
 * Loads and types environment variables with local storage fallback.
 */
export const config = {
  rpcUrl: process.env.RPC_URL || storage.get('RPC_URL') || 'http://127.0.0.1:8545',
  privateKey: process.env.PRIVATE_KEY || storage.get('PRIVATE_KEY'),
  contractAddress: process.env.CONTRACT_ADDRESS || storage.get('CONTRACT_ADDRESS'),
  encryptionKey: process.env.YAMO_ENCRYPTION_KEY || storage.get('YAMO_ENCRYPTION_KEY'),
  pinataJwt: process.env.PINATA_JWT || storage.get('PINATA_JWT'),
  bridgeUrl: process.env.YAMO_BRIDGE_URL || storage.get('YAMO_BRIDGE_URL'),
};

/**
 * Validates that required configuration is present for specific operations.
 */
export const validateConfig = {
  /**
   * Ensure encryption key is available
   */
  requireEncryptionKey: (providedKey?: string): string => {
    const key = providedKey || config.encryptionKey;
    if (!key) {
      throw new Error(
        'Encryption enabled but no key provided. Use --key or set YAMO_ENCRYPTION_KEY'
      );
    }
    return key;
  }
};
