# YAMO CLI Improvements - Phase 1 Implementation Plan

**Created**: 2026-01-15
**Branch**: feature/cli-improvements
**Worktree**: /tmp/yamo-migration/yamo-cli-improvements
**Goal**: Modernize yamo-cli with updated dependencies, code quality tooling, and modular architecture

---

## Architecture Overview

Current: 381-line monolith in `src/index.ts`
Target: Modular structure with separated concerns

```
src/
├── index.ts              # CLI entry, commander setup (50 lines)
├── commands/             # Command handlers
│   ├── hash.ts
│   ├── init.ts
│   ├── submit.ts
│   ├── audit.ts
│   └── download-bundle.ts
├── utils/                # Utilities
│   ├── format.ts         # Output formatting
│   ├── validation.ts     # Validators
│   └── constants.ts      # Constants
└── types/
    └── index.ts          # Interfaces
```

---

## Tech Stack

- TypeScript 5.9.3 (strict mode)
- Commander 14.x (upgrade from 12.x)
- Chalk 4.x (defer v5 due to ESM)
- ESLint + @typescript-eslint
- Prettier
- Node native test runner

---

## Implementation Tasks

### Phase 1A: Foundation (Dependencies & Tooling)

#### Task 1: Update Commander to v14
**Time**: 2 min
**File**: package.json

Update commander dependency:
```bash
npm install commander@^14.0.0
```

**Expected output**:
```
added 1 package, changed 1 package
```

**Test**: Build and run help
```bash
npm run build
./dist/index.js --help
```

**Expected**: Help output displays correctly

**Commit**: "chore: update commander to v14.0.0"

---

#### Task 2: Update @types/node
**Time**: 1 min
**File**: package.json

Update types:
```bash
npm install --save-dev @types/node@latest
```

**Expected output**:
```
changed 1 package
```

**Commit**: "chore: update @types/node to latest"

---

#### Task 3: Install ESLint dependencies
**Time**: 2 min
**File**: package.json

Install ESLint tooling:
```bash
npm install --save-dev eslint@^9.0.0 @typescript-eslint/parser@^8.0.0 @typescript-eslint/eslint-plugin@^8.0.0
```

**Expected output**:
```
added X packages
```

**Commit**: "chore: add ESLint dependencies"

---

#### Task 4: Create ESLint configuration
**Time**: 3 min
**File**: eslint.config.mjs (new file)

```javascript
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      'no-console': 'off',
      '@typescript-eslint/explicit-function-return-type': 'warn',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  {
    ignores: ['dist/**', 'node_modules/**', 'test/**', 'e2e/**'],
  }
);
```

**Test**:
```bash
npx eslint src/index.ts
```

**Expected**: Linting errors/warnings shown (will fix later)

**Commit**: "chore: add ESLint configuration"

---

#### Task 5: Install Prettier
**Time**: 2 min
**File**: package.json

```bash
npm install --save-dev prettier@^3.0.0 eslint-config-prettier@^9.0.0
```

**Commit**: "chore: add Prettier dependencies"

---

#### Task 6: Create Prettier configuration
**Time**: 2 min
**File**: .prettierrc (new file)

```json
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "printWidth": 100,
  "trailingComma": "es5"
}
```

**File**: .prettierignore (new file)

```
dist/
node_modules/
coverage/
*.md
```

**Test**:
```bash
npx prettier --check src/index.ts
```

**Expected**: Shows formatting issues

**Commit**: "chore: add Prettier configuration"

---

#### Task 7: Add npm scripts for linting
**Time**: 2 min
**File**: package.json

Add to scripts section:
```json
{
  "lint": "eslint src --ext .ts",
  "lint:fix": "eslint src --ext .ts --fix",
  "format": "prettier --write src/**/*.ts",
  "format:check": "prettier --check src/**/*.ts"
}
```

**Test**:
```bash
npm run format:check
```

**Expected**: Shows files that need formatting

**Commit**: "chore: add lint and format scripts"

---

#### Task 8: Format existing code with Prettier
**Time**: 1 min

```bash
npm run format
```

**Expected**: Files reformatted

**Test**: Build still works
```bash
npm run build
npm test
```

**Expected**: All tests pass (20/20)

**Commit**: "style: format code with Prettier"

---

### Phase 1B: Modularization

#### Task 9: Extract constants to separate file
**Time**: 3 min
**File**: src/utils/constants.ts (new file)

```typescript
export const CONSTANTS = {
  HASH_PATTERN: /^0x[a-fA-F0-9]{64}$/,
  GENESIS_HASH:
    '0x0000000000000000000000000000000000000000000000000000000000000000',
  DEFAULT_FILENAME: 'block.yamo',
  DEFAULT_CONSENSUS: 'cli_manual',
  DEFAULT_LEDGER: 'yamo_cli',
  DEFAULT_INTENT: 'execute_task',
  HEX_PREFIX: '0x',
  HASH_ALGORITHM: 'sha256',
} as const;
```

**File**: src/index.ts

Remove CONSTANTS definition (lines 15-25), add import:
```typescript
import { CONSTANTS } from './utils/constants.js';
```

**Test**:
```bash
npm run build
npm test
```

**Expected**: All tests pass (20/20)

**Commit**: "refactor: extract constants to separate file"

---

#### Task 10: Extract types to separate file
**Time**: 3 min
**File**: src/types/index.ts (new file)

```typescript
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
```

**File**: src/index.ts

Remove interface definitions, add import:
```typescript
import type { InitOptions, SubmitOptions, AuditOptions, DownloadOptions } from './types/index.js';
```

**Test**:
```bash
npm run build
npm test
```

**Expected**: All tests pass

**Commit**: "refactor: extract types to separate file"

---

#### Task 11: Extract format utilities
**Time**: 3 min
**File**: src/utils/format.ts (new file)

```typescript
import chalk from 'chalk';

export const format = {
  success: (msg: string): void => console.log(chalk.green(msg)),
  error: (msg: string): void => console.error(chalk.red(`Error: ${msg}`)),
  info: (msg: string): void => console.log(chalk.blue(msg)),
  warn: (msg: string): void => console.log(chalk.yellow(msg)),
  detail: (msg: string): void => console.log(chalk.gray(msg)),
  value: (msg: string): void => console.log(chalk.cyan(msg)),
};
```

**File**: src/index.ts

Remove format definition (lines 65-72), add import:
```typescript
import { format } from './utils/format.js';
```

**Test**:
```bash
npm run build
npm test
```

**Expected**: All tests pass

**Commit**: "refactor: extract format utilities to separate file"

---

#### Task 12: Extract validation functions
**Time**: 4 min
**File**: src/utils/validation.ts (new file)

```typescript
import { CONSTANTS } from './constants.js';

/**
 * Validates bytes32 hash format (0x + 64 hex characters).
 * @param hash - Hash string to validate
 * @returns True if valid bytes32 format
 */
export function validateBytes32(hash: string): boolean {
  return CONSTANTS.HASH_PATTERN.test(hash);
}

/**
 * Validates YAMO block ID format (origin_workflow).
 * @param blockId - Block identifier to validate
 * @returns True if valid format
 */
export function validateBlockId(blockId: string): boolean {
  const parts = blockId.split('_');
  return parts.length === 2 && parts.every((p) => p.length > 0);
}

/**
 * Validates artifact path for security (no path traversal).
 * @param artifactName - Artifact name from YAMO file
 * @param artifactPath - Resolved artifact path
 * @param inputDir - Directory of YAMO file
 * @throws Error if path is unsafe
 */
export function validateArtifactPath(
  artifactName: string,
  artifactPath: string,
  inputDir: string
): void {
  if (artifactName.includes('..') || artifactName.startsWith('/')) {
    throw new Error(
      `Invalid artifact name: ${artifactName}. Path traversal attempts are blocked for security.`
    );
  }

  if (!artifactPath.startsWith(inputDir)) {
    throw new Error(
      `Artifact path outside allowed directory: ${artifactName}. Only artifacts in the same directory or subdirectories are allowed.`
    );
  }
}
```

**File**: src/index.ts

Remove validation functions (lines 84-119), add import:
```typescript
import { validateBytes32, validateBlockId, validateArtifactPath } from './utils/validation.js';
```

**Test**:
```bash
npm run build
npm test
```

**Expected**: All tests pass (20/20)

**Commit**: "refactor: extract validation functions"

---

#### Task 13: Extract error handler
**Time**: 2 min
**File**: src/utils/format.ts

Add to existing file:
```typescript
/**
 * Handles command errors with consistent formatting.
 * @param error - Error object or unknown value
 * @param context - Optional context message
 */
export function handleCommandError(error: unknown, context?: string): void {
  if (error instanceof Error) {
    const message = context ? `${context}: ${error.message}` : error.message;
    format.error(message);
  } else {
    format.error('Unknown error occurred');
  }
}
```

**File**: src/index.ts

Remove handleCommandError function, add to import:
```typescript
import { format, handleCommandError } from './utils/format.js';
```

**Test**:
```bash
npm run build
npm test
```

**Expected**: All tests pass

**Commit**: "refactor: move error handler to format utils"

---

#### Task 14: Extract hash command
**Time**: 5 min
**File**: src/commands/hash.ts (new file)

```typescript
import fs from 'fs';
import crypto from 'crypto';
import { CONSTANTS } from '../utils/constants.js';
import { format, handleCommandError } from '../utils/format.js';

/**
 * Calculate SHA256 hash of a file.
 * @param file - Path to file
 */
export async function hashCommand(file: string): Promise<void> {
  try {
    if (!fs.existsSync(file)) {
      throw new Error(`File not found: ${file}`);
    }

    const content = fs.readFileSync(file);
    const hash = crypto.createHash(CONSTANTS.HASH_ALGORITHM).update(content).digest('hex');
    const bytes32 = CONSTANTS.HEX_PREFIX + hash;

    format.success('Hash calculated:');
    format.value(bytes32);
  } catch (error) {
    handleCommandError(error, 'Hash calculation failed');
    process.exit(1);
  }
}
```

**File**: src/index.ts

Remove hash command handler (lines ~250-270), replace with:
```typescript
import { hashCommand } from './commands/hash.js';

// In program setup:
program
  .command('hash')
  .description('Calculate SHA256 hash of a file')
  .argument('<file>', 'Path to the file')
  .action(hashCommand);
```

**Test**:
```bash
npm run build
npm test
echo "test" > /tmp/test.txt
./dist/index.js hash /tmp/test.txt
```

**Expected**: Hash output displayed

**Commit**: "refactor: extract hash command to separate file"

---

#### Task 15: Extract init command
**Time**: 5 min
**File**: src/commands/init.ts (new file)

```typescript
import fs from 'fs';
import { CONSTANTS } from '../utils/constants.js';
import { format, handleCommandError } from '../utils/format.js';
import type { InitOptions } from '../types/index.js';

/**
 * Initialize a new YAMO block template.
 * @param agentName - Name of the agent
 * @param options - Command options
 */
export async function initCommand(agentName: string, options: InitOptions): Promise<void> {
  try {
    const intent = options.intent || CONSTANTS.DEFAULT_INTENT;
    const template = `agent: ${agentName};
intent: ${intent};
context:
  task;describe_task_here;
constraints:
  - constraint_1;
  - constraint_2;
priority: medium;
output: result;
log: completed;timestamp;
handoff: End;
`;

    fs.writeFileSync(CONSTANTS.DEFAULT_FILENAME, template);
    format.success(`Created ${CONSTANTS.DEFAULT_FILENAME} for agent: ${agentName}`);
    format.info(`Intent: ${intent}`);
  } catch (error) {
    handleCommandError(error, 'Init failed');
    process.exit(1);
  }
}
```

**File**: src/index.ts

Remove init command handler, replace with:
```typescript
import { initCommand } from './commands/init.js';

program
  .command('init')
  .description('Create a new YAMO block template')
  .argument('<agent_name>', 'Name of the agent')
  .option('--intent <intent>', 'Intent description', CONSTANTS.DEFAULT_INTENT)
  .action(initCommand);
```

**Test**:
```bash
npm run build
npm test
./dist/index.js init TestAgent
cat block.yamo
```

**Expected**: Template file created

**Commit**: "refactor: extract init command to separate file"

---

#### Task 16: Extract audit command
**Time**: 5 min
**File**: src/commands/audit.ts (new file)

```typescript
import dotenv from 'dotenv';
import { YamoChainClient } from '@yamo/core';
import { format, handleCommandError } from '../utils/format.js';
import { validateBlockId } from '../utils/validation.js';
import type { AuditOptions } from '../types/index.js';

dotenv.config();

/**
 * Audit a block's integrity on the blockchain.
 * @param blockId - Block ID to audit
 * @param options - Command options
 */
export async function auditCommand(blockId: string, options: AuditOptions): Promise<void> {
  try {
    if (!validateBlockId(blockId)) {
      throw new Error('Invalid block ID format. Expected: {origin}_{workflow}');
    }

    const client = new YamoChainClient({
      rpcUrl: process.env.RPC_URL!,
      privateKey: process.env.PRIVATE_KEY!,
    });

    format.info(`Auditing block: ${blockId}`);

    const block = await client.getBlock(blockId);
    if (!block) {
      throw new Error(`Block not found: ${blockId}`);
    }

    format.success('✅ Block found on-chain');
    format.detail(`Previous: ${block.previousBlock}`);
    format.detail(`Content Hash: ${block.contentHash}`);
    format.detail(`Consensus: ${block.consensus}`);

    if (block.encrypted && !options.key) {
      format.warn('🔒 Block is encrypted (use -k to decrypt)');
      return;
    }

    if (block.encrypted && options.key) {
      const { validatePasswordStrength } = await import('@yamo/core');
      try {
        validatePasswordStrength(options.key);
      } catch (e) {
        const err = e as Error;
        throw new Error(`Password validation failed: ${err.message}`);
      }

      const decrypted = await client.decryptBlock(block, options.key);
      format.success('🔓 Block decrypted successfully');
      format.value(decrypted);
    }
  } catch (error) {
    handleCommandError(error, 'Audit failed');
    process.exit(1);
  }
}
```

**File**: src/index.ts

Remove audit command handler, replace with:
```typescript
import { auditCommand } from './commands/audit.js';

program
  .command('audit')
  .description('Verify a block on the blockchain')
  .argument('<blockId>', 'Block ID to audit')
  .option('-k, --key <key>', 'Decryption key')
  .action(auditCommand);
```

**Test**:
```bash
npm run build
npm test
```

**Expected**: Build succeeds, tests pass

**Commit**: "refactor: extract audit command to separate file"

---

#### Task 17: Extract download-bundle command
**Time**: 5 min
**File**: src/commands/download-bundle.ts (new file)

```typescript
import fs from 'fs';
import dotenv from 'dotenv';
import { IpfsClient } from '@yamo/core';
import { format, handleCommandError } from '../utils/format.js';
import type { DownloadOptions } from '../types/index.js';

dotenv.config();

/**
 * Download a bundle from IPFS.
 * @param cid - IPFS content identifier
 * @param options - Command options
 */
export async function downloadBundleCommand(
  cid: string,
  options: DownloadOptions
): Promise<void> {
  try {
    const ipfs = new IpfsClient({
      host: process.env.IPFS_HOST || 'localhost',
      port: parseInt(process.env.IPFS_PORT || '5001'),
    });

    format.info(`Downloading from IPFS: ${cid}`);

    const data = await ipfs.cat(cid);

    if (options.key) {
      const { validatePasswordStrength } = await import('@yamo/core');
      try {
        validatePasswordStrength(options.key);
      } catch (e) {
        const err = e as Error;
        throw new Error(`Password validation failed: ${err.message}`);
      }

      const decrypted = await ipfs.decrypt(data, options.key);
      fs.writeFileSync(options.output, decrypted);
      format.success(`🔓 Downloaded and decrypted: ${options.output}`);
    } else {
      fs.writeFileSync(options.output, data);
      format.success(`Downloaded: ${options.output}`);
    }
  } catch (error) {
    handleCommandError(error, 'Download failed');
    process.exit(1);
  }
}
```

**File**: src/index.ts

Remove download-bundle command handler, replace with:
```typescript
import { downloadBundleCommand } from './commands/download-bundle.js';

program
  .command('download-bundle')
  .description('Download bundle from IPFS')
  .argument('<cid>', 'IPFS content identifier')
  .requiredOption('-o, --output <path>', 'Output file path')
  .option('-k, --key <key>', 'Decryption key')
  .action(downloadBundleCommand);
```

**Test**:
```bash
npm run build
npm test
```

**Expected**: Build succeeds, tests pass

**Commit**: "refactor: extract download-bundle command"

---

#### Task 18: Extract submit command (largest refactor)
**Time**: 5 min
**File**: src/commands/submit.ts (new file)

```typescript
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { YamoChainClient, IpfsClient } from '@yamo/core';
import { format, handleCommandError } from '../utils/format.js';
import { validateBytes32, validateBlockId, validateArtifactPath } from '../utils/validation.js';
import { CONSTANTS } from '../utils/constants.js';
import type { SubmitOptions } from '../types/index.js';

dotenv.config();

/**
 * Submit a YAMO block to the blockchain.
 * @param file - Path to YAMO file
 * @param options - Command options
 */
export async function submitCommand(file: string, options: SubmitOptions): Promise<void> {
  try {
    if (!fs.existsSync(file)) {
      throw new Error(`File not found: ${file}`);
    }

    if (!validateBlockId(options.id)) {
      throw new Error('Invalid block ID format. Expected: {origin}_{workflow}');
    }

    const client = new YamoChainClient({
      rpcUrl: process.env.RPC_URL!,
      privateKey: process.env.PRIVATE_KEY!,
    });

    let previousBlock = options.prev;

    // Auto-fetch previousBlock if not provided
    if (!previousBlock) {
      format.info('Fetching latest block from chain...');
      const latestBlock = await client.getLatestBlock(options.ledger);
      previousBlock = latestBlock?.blockId || CONSTANTS.GENESIS_HASH;
      format.detail(`Auto-fetched previousBlock: ${previousBlock}`);
    }

    if (!validateBytes32(previousBlock)) {
      throw new Error('Invalid previousBlock format');
    }

    const content = fs.readFileSync(file, 'utf-8');
    let contentCid = '';

    // Handle IPFS upload if requested
    if (options.ipfs) {
      const ipfs = new IpfsClient({
        host: process.env.IPFS_HOST || 'localhost',
        port: parseInt(process.env.IPFS_PORT || '5001'),
      });

      // Parse output directive for bundle creation
      const outputMatch = content.match(/^output:\s*(.+)$/m);
      if (outputMatch) {
        const artifacts: Record<string, Buffer> = {};
        const outputLines = outputMatch[1].split(';');

        for (const line of outputLines) {
          const artifactName = line.trim();
          if (!artifactName) continue;

          const artifactPath = path.resolve(path.dirname(file), artifactName);
          const inputDir = path.resolve(path.dirname(file));

          // Security validation
          validateArtifactPath(artifactName, artifactPath, inputDir);

          if (fs.existsSync(artifactPath)) {
            artifacts[artifactName] = fs.readFileSync(artifactPath);
          }
        }

        const bundle = {
          block: Buffer.from(content),
          artifacts,
        };

        if (options.encrypt) {
          const key = options.key || process.env.YAMO_ENCRYPTION_KEY;
          if (!key) {
            throw new Error('Encryption key required (use -k or YAMO_ENCRYPTION_KEY)');
          }

          const { validatePasswordStrength } = await import('@yamo/core');
          try {
            validatePasswordStrength(key);
          } catch (e) {
            const err = e as Error;
            throw new Error(
              `Password validation failed: ${err.message}\n` +
                'Password must be at least 12 characters with uppercase, lowercase, number, and symbol.'
            );
          }

          const encrypted = await ipfs.encrypt(JSON.stringify(bundle), key);
          contentCid = await ipfs.add(encrypted);
          format.info('🔒 Bundle encrypted and uploaded to IPFS');
        } else {
          contentCid = await ipfs.add(Buffer.from(JSON.stringify(bundle)));
          format.info('Uploaded bundle to IPFS');
        }
      } else {
        contentCid = await ipfs.add(Buffer.from(content));
        format.info('Uploaded content to IPFS');
      }

      format.value(`IPFS CID: ${contentCid}`);
    }

    // Submit to blockchain
    const tx = await client.submitBlock({
      blockId: options.id,
      previousBlock,
      contentHash: contentCid || 'local',
      consensus: options.consensus,
      ledger: options.ledger,
    });

    format.success('✅ Block submitted to blockchain');
    format.detail(`Block ID: ${options.id}`);
    format.detail(`Transaction: ${tx.hash}`);
  } catch (error) {
    handleCommandError(error, 'Submit failed');
    process.exit(1);
  }
}
```

**File**: src/index.ts

Remove submit command handler (largest section), replace with:
```typescript
import { submitCommand } from './commands/submit.js';

program
  .command('submit')
  .description('Submit a YAMO block to the blockchain')
  .argument('<file>', 'Path to the YAMO file')
  .requiredOption('--id <blockId>', 'Unique Block ID (format: {origin}_{workflow})')
  .option('--prev <previousBlock>', 'Previous block hash (auto-fetches if omitted)')
  .option('--consensus <type>', 'Consensus mechanism', CONSTANTS.DEFAULT_CONSENSUS)
  .option('--ledger <name>', 'Ledger name', CONSTANTS.DEFAULT_LEDGER)
  .option('--ipfs', 'Upload content to IPFS', false)
  .option('-e, --encrypt', 'Encrypt bundle before IPFS upload', false)
  .option('-k, --key <key>', 'Encryption/decryption key')
  .action(submitCommand);
```

**Test**:
```bash
npm run build
npm test
```

**Expected**: All tests pass (20/20)

**Commit**: "refactor: extract submit command to separate file"

---

#### Task 19: Clean up main index.ts
**Time**: 3 min
**File**: src/index.ts

Final cleaned-up structure:
```typescript
#!/usr/bin/env node
import { Command } from 'commander';
import { CONSTANTS } from './utils/constants.js';
import { hashCommand } from './commands/hash.js';
import { initCommand } from './commands/init.js';
import { submitCommand } from './commands/submit.js';
import { auditCommand } from './commands/audit.js';
import { downloadBundleCommand } from './commands/download-bundle.js';

const program = new Command();

program
  .name('yamo')
  .description('YAMO CLI - Blockchain-anchored agent workflow system')
  .version('1.3.13');

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
  .requiredOption('--id <blockId>', 'Unique Block ID (format: {origin}_{workflow})')
  .option('--prev <previousBlock>', 'Previous block hash (auto-fetches if omitted)')
  .option('--consensus <type>', 'Consensus mechanism', CONSTANTS.DEFAULT_CONSENSUS)
  .option('--ledger <name>', 'Ledger name', CONSTANTS.DEFAULT_LEDGER)
  .option('--ipfs', 'Upload content to IPFS', false)
  .option('-e, --encrypt', 'Encrypt bundle before IPFS upload', false)
  .option('-k, --key <key>', 'Encryption/decryption key')
  .action(submitCommand);

program
  .command('audit')
  .description('Verify a block on the blockchain')
  .argument('<blockId>', 'Block ID to audit')
  .option('-k, --key <key>', 'Decryption key')
  .action(auditCommand);

program
  .command('download-bundle')
  .description('Download bundle from IPFS')
  .argument('<cid>', 'IPFS content identifier')
  .requiredOption('-o, --output <path>', 'Output file path')
  .option('-k, --key <key>', 'Decryption key')
  .action(downloadBundleCommand);

program.parse();
```

**Expected**: ~90 lines (down from 381)

**Test**:
```bash
npm run build
npm test
./dist/index.js --help
```

**Expected**: All tests pass, help works

**Commit**: "refactor: simplify main index.ts to ~90 lines"

---

#### Task 20: Run full test suite verification
**Time**: 2 min

```bash
npm run build
npm test
npm run lint
```

**Expected output**:
```
✔ tests 20
✔ pass 20
❌ fail 0
```

**Commit**: "test: verify all tests pass after refactoring"

---

#### Task 21: Update tsconfig for module resolution
**Time**: 2 min
**File**: tsconfig.json

Update compiler options:
```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "test", "e2e"]
}
```

**Test**:
```bash
npm run build
npm test
```

**Expected**: Clean build, all tests pass

**Commit**: "chore: update tsconfig for better module resolution"

---

## Success Criteria

- [ ] All 20 tests pass
- [ ] Build succeeds without errors
- [ ] ESLint runs without critical errors
- [ ] Code formatted with Prettier
- [ ] src/index.ts reduced from 381 to ~90 lines
- [ ] 5 command files created
- [ ] 3 utility files created
- [ ] 1 types file created
- [ ] Commander updated to v14
- [ ] All commits follow conventional format

---

## Verification Commands

```bash
# Full verification suite
npm run build && \
npm test && \
npm run lint && \
./dist/index.js --help && \
./dist/index.js hash README.md && \
./dist/index.js init TestAgent && \
cat block.yamo && \
rm block.yamo
```

**Expected**: All commands succeed, output looks correct

---

## Notes

- Each task should take 2-5 minutes
- Commit after each task
- Run tests after structural changes
- Keep original functionality intact
- Follow TDD: test must pass before moving on
- Use `@yamo/cli:superpowers:executing_plans` for execution

---

*Plan follows YamoSuper workflow principles*
