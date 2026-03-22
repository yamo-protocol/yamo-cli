# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

YAMO CLI is a command-line interface for the YAMO Protocol - a blockchain-anchored agent workflow system. It enables submitting `.yamo` files (structured agent workflow definitions) to a blockchain with optional IPFS storage and AES-256-GCM encryption.

**Core Dependencies:**
- `@yamo/core` - Core blockchain and IPFS functionality (YamoChainClient, IpfsManager)
- TypeScript with NodeNext module resolution
- Node.js >=20.0.0 required

## Build & Test Commands

```bash
# Build (compiles TypeScript + makes executable)
npm run build

# Test (uses Node.js native test runner)
npm test

# Run single test file
node --test test/security.test.js

# Linting
npm run lint
npm run lint:fix

# Formatting
npm run format
npm run format:check

# Run locally without building
npm start -- <command> [args]

# Test security validation
npm run test:security
```

## Architecture

### Command Structure

The CLI uses Commander.js with a simple, flat command architecture:

```
src/
├── index.ts              # Entry point, command definitions (~58 lines)
├── commands/             # Command handlers (one file per command)
│   ├── init.ts          # Creates block.yamo templates
│   ├── hash.ts          # SHA256 hashing
│   ├── submit.ts        # Main blockchain submission logic
│   ├── audit.ts         # Integrity verification
│   ├── config.ts        # Local configuration management
│   ├── bridge.ts        # Bridge cluster interaction
│   └── download-bundle.ts
├── utils/
│   ├── constants.ts     # Shared constants (hash patterns, defaults)
│   ├── format.ts        # Console formatting utilities
│   └── validation.ts    # Security validators (path traversal, hash format)
└── types/
    └── index.ts         # TypeScript option interfaces
```

**Key Design Principle:** Each command handler is independent and self-contained. All share `@yamo/core` client instances (YamoChainClient, IpfsManager).

### Critical Security Architecture

**Path Traversal Protection** (`src/utils/validation.ts`):
- `validateArtifactPath()` prevents directory traversal attacks in artifact bundling
- Blocks `..` and absolute paths in artifact names
- Ensures artifacts resolve within YAMO file's directory
- Tested in `test/security.test.js`

**Hash Validation:**
- All hashes must match `0x[a-fA-F0-9]{64}` (bytes32 format)
- NO algorithm prefixes allowed (e.g., reject `sha256:abc...`)
- Genesis hash: `0x0000...0000` (64 zeros)

**Encryption Flow:**
- Uses `@yamo/core`'s encryption utilities
- Password strength validation enforced (12+ chars, mixed case/numbers/symbols)
- Key derivation via scrypt with random salt
- Encryption metadata stored separately in IPFS bundles

### Data Flow: Submit Command

1. **Validation Phase**
   - Block ID format: `{origin}_{workflow}` (e.g., `claude_task`)
   - Encryption key strength check if `--encrypt` enabled
   - Hash format validation

2. **Content Hashing**
   - Read file content (trimmed)
   - SHA256 hash → prepend `0x`

3. **IPFS Bundle Creation** (if `--ipfs`)
   - Always includes `block.yamo`
   - Auto-bundles artifacts if `output: file.json;` found in YAMO content
   - Artifact path resolution secured by `validateArtifactPath()`
   - Optional encryption with AES-256-GCM

4. **Previous Block Resolution**
   - If `--prev` provided: validate and use
   - Else: auto-fetch latest block hash from chain
   - Fallback: genesis hash if chain empty

5. **Blockchain Submission**
   - Submit via `YamoChainClient.submitBlock()`
   - Parameters: blockId, previousBlock, contentHash, consensus, ledger, ipfsCID

### YAMO File Format

Semicolon-delimited key-value format:

```
agent: AgentName;
intent: describe_purpose;
context:
  key;value;
constraints:
  - rule_description;
priority: medium;
output: result.json;
meta: hypothesis;description;
log: event;timestamp;ISO_DATE;
handoff: NextAgent;
```

**Artifact Bundling:** When `output: filename;` is present, the submit command creates a "Deep Bundle" containing both the YAMO file and the output artifact.

## Environment Configuration

Required for blockchain operations:

```bash
CONTRACT_ADDRESS=0x3c9440fa8d604E732233ea17095e14be1a53b015  # Sepolia default
RPC_URL=https://ethereum-sepolia-rpc.publicnode.com
PRIVATE_KEY=0xYOUR_PRIVATE_KEY

# Optional
USE_REAL_IPFS=false
PINATA_JWT=your_jwt
YAMO_ENCRYPTION_KEY=your_passphrase  # For --encrypt without --key flag
```

## Testing Strategy

Uses Node.js native test runner (`node:test`):

- **test/security.test.js** - Path traversal protection, artifact bundling security
- **test/auto-fetch.test.js** - Previous block auto-resolution logic
- **test/validation.test.js** - Hash and block ID format validation

**Test Patterns:**
- No mocking - uses real filesystem fixtures in `test-fixtures/`
- Setup/teardown with `before()`/`after()` hooks
- Assertions use `node:assert`

## Common Workflows

**Local Development:**
```bash
# After code changes
npm run build
node dist/index.js submit block.yamo --id test_001

# Or use npm start
npm start -- submit block.yamo --id test_001
```

**Creating Encrypted Workflow:**
```bash
yamo init MyAgent
yamo submit block.yamo --id agent_task --ipfs --encrypt --key "strong-passphrase"
yamo audit agent_task --key "strong-passphrase"
```

**Testing Hash Validation:**
```bash
# Valid
yamo hash block.yamo
# Output: 0x[64 hex chars]

# Invalid formats will be rejected by submit
```

## Code Conventions

- **Error Handling:** All command handlers wrap logic in try/catch → `handleCommandError(error)`
- **Formatting:** Use `format.info()`, `format.success()`, `format.error()`, `format.warn()` from utils
- **Validation:** Centralize validation logic in `src/utils/validation.ts`
- **Constants:** Never hardcode magic values - use `CONSTANTS` from utils
- **Imports:** Use `.js` extensions in imports (TypeScript NodeNext resolution)

## Recent Refactoring (Phase 1 CLI Improvements)

- Reduced `index.ts` from 200+ to ~58 lines
- Extracted all command logic to separate files
- Consolidated validation utilities
- Improved error handling consistency
- Added security validators for path traversal

See `docs/plans/2026-01-15-cli-improvements-phase1.md` for details.

## Important Notes

- **Module System:** Uses CommonJS (`type: "commonjs"` in package.json) with NodeNext resolution
- **Executable:** `dist/index.js` must have shebang `#!/usr/bin/env node` and be executable
- **No Mocks in Tests:** Tests use real file operations and fixtures
- **Security First:** All user-provided paths must be validated before filesystem operations
- **Genesis Block:** Chain starts with all-zeros hash when no blocks exist
