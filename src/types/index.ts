export interface InitOptions {
  intent: string;
}

export interface SubmitOptions {
  id: string;
  prev?: string;
  consensus: string;
  ledger: string;
  ipfs: boolean;
  encrypt: boolean;
  key?: string;
}

export interface AuditOptions {
  key?: string;
}

export interface DownloadOptions {
  key?: string;
  output: string;
}
