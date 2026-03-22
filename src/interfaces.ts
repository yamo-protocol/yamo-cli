import { IpfsUploadOptions, BundleDownloadResult } from '@yamo/core';

export interface IChainClient {
  getLatestBlockHash(): Promise<string>;
  submitBlock(
    blockId: string,
    previousBlock: string,
    contentHash: string,
    consensusType: string,
    ledger: string,
    ipfsCID?: string
  ): Promise<unknown>;
  getBlock(blockId: string): Promise<{
    blockId: string;
    previousBlock: string;
    agentAddress: string;
    contentHash: string;
    timestamp: number;
    consensusType: string;
    ledger: string;
    ipfsCID?: string;
  } | null>;
}

export interface IIpfsClient {
  upload(options: IpfsUploadOptions): Promise<string>;
  download(cid: string, encryptionKey?: string): Promise<string>;
  downloadBundle(cid: string, encryptionKey?: string): Promise<BundleDownloadResult>;
}
