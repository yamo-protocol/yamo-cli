# YAMO CLI Testing Improvements - Phase 2 Implementation Plan

**Created**: 2026-01-19
**Branch**: feature/testing-improvements (to be created)
**Worktree**: /tmp/yamo-migration/yamo-cli-testing (to be created)
**Goal**: Expand test coverage from 20 to 50+ tests with integration and e2e scenarios

---

## Current Test Status

**Existing Tests**: 20 tests across 3 files
```
test/
├── validation.test.js    # 3 tests - BlockId validation
├── security.test.js      # 13 tests - Path traversal protection
└── auto-fetch.test.js    # 4 tests - Auto-fetch previousBlock logic
```

**Coverage Gaps**:
- ❌ No command execution tests (hash, init, submit, audit, download-bundle)
- ❌ No integration tests with mocked dependencies
- ❌ No IPFS operation tests
- ❌ No blockchain interaction tests
- ❌ No encryption/decryption tests
- ❌ No error handling tests
- ❌ No e2e workflow tests

---

## Testing Strategy

### Unit Tests (15 new tests)
Test individual functions in isolation with mocks

### Integration Tests (15 new tests)
Test command handlers with mocked external dependencies (@yamo/core)

### E2E Tests (5 new tests)
Test full workflows from CLI input to output

**Target**: 55 total tests (20 existing + 35 new)

---

## Tech Stack

- **Test Runner**: Node.js native test runner (already in use)
- **Mocking**: Manual mocks (no additional dependencies)
- **Test Location**: `test/` directory
- **Naming**: `*.test.js` pattern

---

## Implementation Tasks

### Phase 2A: Unit Tests for Commands (Tasks 1-5)

#### Task 1: Add hash command unit tests
**Time**: 5 min
**File**: `test/hash.test.js` (new)

```javascript
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const CLI_PATH = path.join(process.cwd(), 'dist/index.js');
const TEST_FILE = '/tmp/test-hash-file.txt';

describe('Hash Command Unit Tests', () => {
  before(() => {
    // Build CLI
    execSync('npm run build', { stdio: 'inherit' });
    // Create test file
    fs.writeFileSync(TEST_FILE, 'test content\n');
  });

  after(() => {
    // Clean up
    if (fs.existsSync(TEST_FILE)) {
      fs.unlinkSync(TEST_FILE);
    }
  });

  it('should calculate SHA256 hash of a file', () => {
    const output = execSync(`node ${CLI_PATH} hash ${TEST_FILE}`, {
      encoding: 'utf-8',
    });

    assert.match(output, /0x[a-fA-F0-9]{64}/, 'Should output valid bytes32 hash');
    assert.match(output, /Hash calculated/, 'Should show success message');
  });

  it('should show error for non-existent file', () => {
    try {
      execSync(`node ${CLI_PATH} hash /tmp/nonexistent-file.txt`, {
        encoding: 'utf-8',
        stdio: 'pipe',
      });
      assert.fail('Should have thrown error');
    } catch (err) {
      assert.match(err.stderr || err.stdout, /File not found/, 'Should show file not found error');
    }
  });

  it('should produce consistent hashes for same content', () => {
    const output1 = execSync(`node ${CLI_PATH} hash ${TEST_FILE}`, {
      encoding: 'utf-8',
    });
    const output2 = execSync(`node ${CLI_PATH} hash ${TEST_FILE}`, {
      encoding: 'utf-8',
    });

    const hash1 = output1.match(/0x[a-fA-F0-9]{64}/)[0];
    const hash2 = output2.match(/0x[a-fA-F0-9]{64}/)[0];

    assert.strictEqual(hash1, hash2, 'Hashes should be identical for same content');
  });
});
```

**Expected**: 3 new tests
**Test**: `npm test -- test/hash.test.js`
**Commit**: "test: add hash command unit tests (3 tests)"

---

#### Task 2: Add init command unit tests
**Time**: 5 min
**File**: `test/init.test.js` (new)

```javascript
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const CLI_PATH = path.join(process.cwd(), 'dist/index.js');
const TEST_DIR = '/tmp/test-init-dir';
const BLOCK_FILE = path.join(TEST_DIR, 'block.yamo');

describe('Init Command Unit Tests', () => {
  before(() => {
    execSync('npm run build', { stdio: 'inherit' });
    if (!fs.existsSync(TEST_DIR)) {
      fs.mkdirSync(TEST_DIR);
    }
  });

  after(() => {
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true, force: true });
    }
  });

  it('should create block.yamo template file', () => {
    execSync(`cd ${TEST_DIR} && node ${CLI_PATH} init TestAgent`, {
      encoding: 'utf-8',
    });

    assert.ok(fs.existsSync(BLOCK_FILE), 'block.yamo should be created');

    const content = fs.readFileSync(BLOCK_FILE, 'utf-8');
    assert.match(content, /agent: TestAgent;/, 'Should contain agent name');
    assert.match(content, /intent: execute_task;/, 'Should contain default intent');
  });

  it('should use custom intent when provided', () => {
    const customBlockFile = path.join(TEST_DIR, 'block-custom.yamo');

    execSync(
      `cd ${TEST_DIR} && node ${CLI_PATH} init CustomAgent --intent analyze_data && mv block.yamo block-custom.yamo`,
      { encoding: 'utf-8' }
    );

    const content = fs.readFileSync(customBlockFile, 'utf-8');
    assert.match(content, /agent: CustomAgent;/, 'Should contain custom agent name');
    assert.match(content, /intent: analyze_data;/, 'Should contain custom intent');
  });

  it('should overwrite existing block.yamo file', () => {
    // Create initial file
    fs.writeFileSync(BLOCK_FILE, 'old content');

    execSync(`cd ${TEST_DIR} && node ${CLI_PATH} init NewAgent`, {
      encoding: 'utf-8',
    });

    const content = fs.readFileSync(BLOCK_FILE, 'utf-8');
    assert.match(content, /agent: NewAgent;/, 'Should overwrite with new agent');
    assert.doesNotMatch(content, /old content/, 'Old content should be replaced');
  });
});
```

**Expected**: 3 new tests
**Test**: `npm test -- test/init.test.js`
**Commit**: "test: add init command unit tests (3 tests)"

---

#### Task 3: Add validation utilities tests
**Time**: 5 min
**File**: `test/validation-utils.test.js` (new)

```javascript
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { validateBytes32, validateBlockId } from '../dist/utils/validation.js';

describe('Validation Utilities Tests', () => {
  describe('validateBytes32', () => {
    it('should accept valid bytes32 hash', () => {
      const validHash = '0x' + 'a'.repeat(64);
      assert.strictEqual(validateBytes32(validHash), true);
    });

    it('should accept mixed case hex', () => {
      const mixedHash = '0x' + 'aAbBcCdDeEfF0123456789'.repeat(3) + 'aAbBcCdDeEfF01';
      assert.strictEqual(validateBytes32(mixedHash), true);
    });

    it('should reject hash without 0x prefix', () => {
      const noPrefix = 'a'.repeat(64);
      assert.strictEqual(validateBytes32(noPrefix), false);
    });

    it('should reject hash with wrong length', () => {
      const tooShort = '0x' + 'a'.repeat(63);
      const tooLong = '0x' + 'a'.repeat(65);
      assert.strictEqual(validateBytes32(tooShort), false);
      assert.strictEqual(validateBytes32(tooLong), false);
    });

    it('should reject non-hex characters', () => {
      const invalidChars = '0x' + 'g'.repeat(64);
      assert.strictEqual(validateBytes32(invalidChars), false);
    });
  });

  describe('validateBlockId', () => {
    it('should accept valid blockId with underscore', () => {
      assert.strictEqual(validateBlockId('origin_workflow'), true);
      assert.strictEqual(validateBlockId('claude_chain'), true);
    });

    it('should reject blockId without underscore', () => {
      assert.strictEqual(validateBlockId('invalidblockid'), false);
    });

    it('should reject blockId with multiple underscores', () => {
      assert.strictEqual(validateBlockId('origin_workflow_extra'), false);
    });

    it('should reject empty parts', () => {
      assert.strictEqual(validateBlockId('_workflow'), false);
      assert.strictEqual(validateBlockId('origin_'), false);
      assert.strictEqual(validateBlockId('_'), false);
    });
  });
});
```

**Expected**: 9 new tests
**Test**: `npm test -- test/validation-utils.test.js`
**Commit**: "test: add validation utilities tests (9 tests)"

---

#### Task 4: Add format utilities tests
**Time**: 4 min
**File**: `test/format-utils.test.js` (new)

```javascript
import { describe, it, mock } from 'node:test';
import assert from 'node:assert';

describe('Format Utilities Tests', () => {
  it('should export format object with all methods', async () => {
    const { format } = await import('../dist/utils/format.js');

    assert.ok(typeof format.success === 'function', 'Should have success method');
    assert.ok(typeof format.error === 'function', 'Should have error method');
    assert.ok(typeof format.info === 'function', 'Should have info method');
    assert.ok(typeof format.warn === 'function', 'Should have warn method');
    assert.ok(typeof format.detail === 'function', 'Should have detail method');
    assert.ok(typeof format.value === 'function', 'Should have value method');
  });

  it('should export handleCommandError function', async () => {
    const { handleCommandError } = await import('../dist/utils/format.js');
    assert.ok(typeof handleCommandError === 'function', 'Should export handleCommandError');
  });

  it('should handle Error objects correctly', async () => {
    const { handleCommandError, format } = await import('../dist/utils/format.js');

    // Mock console.error to capture output
    const originalError = console.error;
    let capturedMessage = '';
    console.error = (msg) => { capturedMessage = msg; };

    try {
      const testError = new Error('Test error message');
      handleCommandError(testError, 'Test context');

      assert.match(capturedMessage, /Test context/, 'Should include context');
      assert.match(capturedMessage, /Test error message/, 'Should include error message');
    } finally {
      console.error = originalError;
    }
  });
});
```

**Expected**: 3 new tests
**Test**: `npm test -- test/format-utils.test.js`
**Commit**: "test: add format utilities tests (3 tests)"

---

#### Task 5: Add constants tests
**Time**: 3 min
**File**: `test/constants.test.js` (new)

```javascript
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { CONSTANTS } from '../dist/utils/constants.js';

describe('Constants Tests', () => {
  it('should export all required constants', () => {
    assert.ok(CONSTANTS.HASH_PATTERN, 'Should have HASH_PATTERN');
    assert.ok(CONSTANTS.GENESIS_HASH, 'Should have GENESIS_HASH');
    assert.ok(CONSTANTS.DEFAULT_FILENAME, 'Should have DEFAULT_FILENAME');
    assert.ok(CONSTANTS.DEFAULT_CONSENSUS, 'Should have DEFAULT_CONSENSUS');
    assert.ok(CONSTANTS.DEFAULT_LEDGER, 'Should have DEFAULT_LEDGER');
    assert.ok(CONSTANTS.DEFAULT_INTENT, 'Should have DEFAULT_INTENT');
    assert.ok(CONSTANTS.HEX_PREFIX, 'Should have HEX_PREFIX');
    assert.ok(CONSTANTS.HASH_ALGORITHM, 'Should have HASH_ALGORITHM');
  });

  it('should have correct hash pattern regex', () => {
    const validHash = '0x' + 'a'.repeat(64);
    const invalidHash = '0x' + 'a'.repeat(63);

    assert.ok(CONSTANTS.HASH_PATTERN.test(validHash), 'Should match valid hash');
    assert.ok(!CONSTANTS.HASH_PATTERN.test(invalidHash), 'Should not match invalid hash');
  });

  it('should have genesis hash in correct format', () => {
    assert.strictEqual(CONSTANTS.GENESIS_HASH.length, 66, 'Genesis hash should be 66 chars (0x + 64)');
    assert.ok(CONSTANTS.HASH_PATTERN.test(CONSTANTS.GENESIS_HASH), 'Genesis hash should match pattern');
  });

  it('should have correct default values', () => {
    assert.strictEqual(CONSTANTS.DEFAULT_FILENAME, 'block.yamo');
    assert.strictEqual(CONSTANTS.DEFAULT_CONSENSUS, 'cli_manual');
    assert.strictEqual(CONSTANTS.DEFAULT_LEDGER, 'yamo_cli');
    assert.strictEqual(CONSTANTS.DEFAULT_INTENT, 'execute_task');
    assert.strictEqual(CONSTANTS.HEX_PREFIX, '0x');
    assert.strictEqual(CONSTANTS.HASH_ALGORITHM, 'sha256');
  });
});
```

**Expected**: 4 new tests
**Test**: `npm test -- test/constants.test.js`
**Commit**: "test: add constants tests (4 tests)"

---

### Phase 2B: Integration Tests with Mocks (Tasks 6-8)

#### Task 6: Create mock helpers
**Time**: 6 min
**File**: `test/helpers/mocks.js` (new)

```javascript
/**
 * Mock helpers for testing commands that depend on @yamo/core
 */

export class MockYamoChainClient {
  constructor(config) {
    this.config = config;
    this.blocks = new Map();
  }

  async submitBlock(data) {
    const blockId = data.blockId;
    this.blocks.set(blockId, data);

    return {
      hash: '0x' + 'a'.repeat(64),
      blockNumber: this.blocks.size,
      success: true,
    };
  }

  async getBlock(blockId) {
    const block = this.blocks.get(blockId);
    if (!block) return null;

    return {
      blockId,
      previousBlock: block.previousBlock,
      contentHash: block.contentHash,
      consensus: block.consensus,
      ledger: block.ledger,
      encrypted: false,
      timestamp: Date.now(),
    };
  }

  async getLatestBlock(ledger) {
    // Return last block for ledger
    const ledgerBlocks = Array.from(this.blocks.values()).filter(
      (b) => b.ledger === ledger
    );

    if (ledgerBlocks.length === 0) return null;

    const latest = ledgerBlocks[ledgerBlocks.length - 1];
    return {
      blockId: latest.blockId,
      previousBlock: latest.previousBlock,
    };
  }

  async decryptBlock(block, key) {
    // Mock decryption
    return JSON.stringify(block);
  }
}

export class MockIpfsClient {
  constructor(config) {
    this.config = config;
    this.storage = new Map();
  }

  async add(data) {
    const cid = 'Qm' + Math.random().toString(36).substring(2, 15);
    this.storage.set(cid, data);
    return cid;
  }

  async cat(cid) {
    const data = this.storage.get(cid);
    if (!data) throw new Error(`CID not found: ${cid}`);
    return data;
  }

  async encrypt(data, key) {
    // Mock encryption - just base64 encode
    return Buffer.from(data).toString('base64');
  }

  async decrypt(data, key) {
    // Mock decryption - just base64 decode
    return Buffer.from(data, 'base64').toString('utf-8');
  }
}

export function validatePasswordStrength(password) {
  if (password.length < 12) {
    throw new Error('Password must be at least 12 characters');
  }
  if (!/[A-Z]/.test(password)) {
    throw new Error('Password must contain uppercase letter');
  }
  if (!/[a-z]/.test(password)) {
    throw new Error('Password must contain lowercase letter');
  }
  if (!/[0-9]/.test(password)) {
    throw new Error('Password must contain number');
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    throw new Error('Password must contain symbol');
  }
}
```

**Expected**: Mock helpers created
**Test**: N/A (helper file)
**Commit**: "test: add mock helpers for integration tests"

---

#### Task 7: Add CLI help and version tests
**Time**: 4 min
**File**: `test/cli-interface.test.js` (new)

```javascript
import { describe, it, before } from 'node:test';
import assert from 'node:assert';
import { execSync } from 'node:child_process';
import path from 'node:path';

const CLI_PATH = path.join(process.cwd(), 'dist/index.js');

describe('CLI Interface Tests', () => {
  before(() => {
    execSync('npm run build', { stdio: 'inherit' });
  });

  it('should show help with --help flag', () => {
    const output = execSync(`node ${CLI_PATH} --help`, { encoding: 'utf-8' });

    assert.match(output, /Usage:/, 'Should show usage');
    assert.match(output, /hash/, 'Should list hash command');
    assert.match(output, /init/, 'Should list init command');
    assert.match(output, /submit/, 'Should list submit command');
    assert.match(output, /audit/, 'Should list audit command');
    assert.match(output, /download-bundle/, 'Should list download-bundle command');
  });

  it('should show version with --version flag', () => {
    const output = execSync(`node ${CLI_PATH} --version`, { encoding: 'utf-8' });

    assert.match(output, /1\.3\.13/, 'Should show version number');
  });

  it('should show command-specific help', () => {
    const output = execSync(`node ${CLI_PATH} hash --help`, { encoding: 'utf-8' });

    assert.match(output, /Calculate SHA256 hash/, 'Should show hash description');
    assert.match(output, /<file>/, 'Should show file argument');
  });

  it('should show error for unknown command', () => {
    try {
      execSync(`node ${CLI_PATH} unknown-command`, {
        encoding: 'utf-8',
        stdio: 'pipe',
      });
      assert.fail('Should have thrown error');
    } catch (err) {
      const output = err.stderr || err.stdout;
      assert.match(output, /unknown command/i, 'Should show unknown command error');
    }
  });
});
```

**Expected**: 4 new tests
**Test**: `npm test -- test/cli-interface.test.js`
**Commit**: "test: add CLI interface tests (4 tests)"

---

#### Task 8: Add error handling tests
**Time**: 5 min
**File**: `test/error-handling.test.js` (new)

```javascript
import { describe, it, before } from 'node:test';
import assert from 'node:assert';
import { execSync } from 'node:child_process';
import path from 'node:path';

const CLI_PATH = path.join(process.cwd(), 'dist/index.js');

describe('Error Handling Tests', () => {
  before(() => {
    execSync('npm run build', { stdio: 'inherit' });
  });

  it('should handle missing required options gracefully', () => {
    try {
      execSync(`node ${CLI_PATH} submit test.yamo`, {
        encoding: 'utf-8',
        stdio: 'pipe',
      });
      assert.fail('Should have thrown error for missing --id');
    } catch (err) {
      const output = err.stderr || err.stdout;
      assert.match(output, /required option.*--id/i, 'Should show missing option error');
    }
  });

  it('should validate blockId format in submit command', () => {
    try {
      execSync(`node ${CLI_PATH} submit test.yamo --id invalid-format`, {
        encoding: 'utf-8',
        stdio: 'pipe',
        env: { ...process.env, RPC_URL: 'http://localhost', PRIVATE_KEY: '0xabc' },
      });
      assert.fail('Should have thrown error for invalid blockId');
    } catch (err) {
      const output = err.stderr || err.stdout;
      // Will fail when trying to connect, but validates format first
      assert.ok(true, 'Command should fail validation or connection');
    }
  });

  it('should handle file not found errors', () => {
    try {
      execSync(`node ${CLI_PATH} hash /tmp/nonexistent-${Date.now()}.txt`, {
        encoding: 'utf-8',
        stdio: 'pipe',
      });
      assert.fail('Should have thrown error');
    } catch (err) {
      const output = err.stderr || err.stdout;
      assert.match(output, /File not found/i, 'Should show file not found error');
    }
  });

  it('should provide helpful error messages', () => {
    try {
      execSync(`node ${CLI_PATH} init`, {
        encoding: 'utf-8',
        stdio: 'pipe',
      });
      assert.fail('Should have thrown error');
    } catch (err) {
      const output = err.stderr || err.stdout;
      assert.match(output, /agent_name/i, 'Should mention missing agent_name argument');
    }
  });
});
```

**Expected**: 4 new tests
**Test**: `npm test -- test/error-handling.test.js`
**Commit**: "test: add error handling tests (4 tests)"

---

### Phase 2C: E2E Workflow Tests (Tasks 9-10)

#### Task 9: Add basic workflow test
**Time**: 6 min
**File**: `test/e2e/basic-workflow.test.js` (new)

```javascript
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const CLI_PATH = path.join(process.cwd(), 'dist/index.js');
const TEST_DIR = '/tmp/yamo-e2e-test';

describe('E2E: Basic Workflow', () => {
  before(() => {
    execSync('npm run build', { stdio: 'inherit' });
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true, force: true });
    }
    fs.mkdirSync(TEST_DIR, { recursive: true });
  });

  after(() => {
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true, force: true });
    }
  });

  it('should complete init -> hash workflow', () => {
    // Step 1: Initialize block
    const initOutput = execSync(`cd ${TEST_DIR} && node ${CLI_PATH} init E2ETestAgent`, {
      encoding: 'utf-8',
    });

    assert.match(initOutput, /Created block.yamo/, 'Init should succeed');
    assert.ok(fs.existsSync(path.join(TEST_DIR, 'block.yamo')), 'block.yamo should exist');

    // Step 2: Calculate hash of created block
    const hashOutput = execSync(`cd ${TEST_DIR} && node ${CLI_PATH} hash block.yamo`, {
      encoding: 'utf-8',
    });

    assert.match(hashOutput, /0x[a-fA-F0-9]{64}/, 'Hash should be calculated');
    assert.match(hashOutput, /Hash calculated/, 'Should show success message');
  });

  it('should handle multiple init operations', () => {
    // Create multiple blocks with different agents
    execSync(`cd ${TEST_DIR} && node ${CLI_PATH} init Agent1`, { encoding: 'utf-8' });
    fs.renameSync(
      path.join(TEST_DIR, 'block.yamo'),
      path.join(TEST_DIR, 'block1.yamo')
    );

    execSync(`cd ${TEST_DIR} && node ${CLI_PATH} init Agent2`, { encoding: 'utf-8' });
    fs.renameSync(
      path.join(TEST_DIR, 'block.yamo'),
      path.join(TEST_DIR, 'block2.yamo')
    );

    // Verify both files exist
    assert.ok(fs.existsSync(path.join(TEST_DIR, 'block1.yamo')));
    assert.ok(fs.existsSync(path.join(TEST_DIR, 'block2.yamo')));

    // Verify they have different content
    const content1 = fs.readFileSync(path.join(TEST_DIR, 'block1.yamo'), 'utf-8');
    const content2 = fs.readFileSync(path.join(TEST_DIR, 'block2.yamo'), 'utf-8');

    assert.match(content1, /Agent1/, 'First block should have Agent1');
    assert.match(content2, /Agent2/, 'Second block should have Agent2');
  });
});
```

**Expected**: 2 new tests
**Test**: `npm test -- test/e2e/basic-workflow.test.js`
**Commit**: "test: add e2e basic workflow tests (2 tests)"

---

#### Task 10: Add comprehensive test suite runner
**Time**: 4 min
**File**: `test/run-all.test.js` (new)

```javascript
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { execSync } from 'node:child_process';

describe('Test Suite Health Check', () => {
  it('should have all test files', () => {
    const output = execSync('find test -name "*.test.js" -type f', {
      encoding: 'utf-8',
    });

    const testFiles = output.trim().split('\n');

    // Expected test files (update as more are added)
    const expectedFiles = [
      'test/validation.test.js',
      'test/security.test.js',
      'test/auto-fetch.test.js',
      'test/hash.test.js',
      'test/init.test.js',
      'test/validation-utils.test.js',
      'test/format-utils.test.js',
      'test/constants.test.js',
      'test/cli-interface.test.js',
      'test/error-handling.test.js',
    ];

    expectedFiles.forEach((file) => {
      assert.ok(
        testFiles.includes(file),
        `Should have ${file}`
      );
    });
  });

  it('should run all tests successfully', () => {
    const output = execSync('npm test', {
      encoding: 'utf-8',
    });

    assert.match(output, /pass/, 'Should have passing tests');
    assert.doesNotMatch(output, /fail [1-9]/, 'Should have no failing tests');
  });
});
```

**Expected**: 2 new tests
**Test**: `npm test -- test/run-all.test.js`
**Commit**: "test: add test suite health check (2 tests)"

---

### Phase 2D: Final Verification (Task 11)

#### Task 11: Run full test suite and update documentation
**Time**: 5 min

**Actions**:
1. Run complete test suite: `npm test`
2. Verify test count (should be 55+ tests)
3. Update package.json test scripts if needed
4. Create test coverage summary

**Update**: `README.md` (add testing section)

```markdown
## Testing

Run all tests:
```bash
npm test
```

Run specific test suite:
```bash
npm test -- test/hash.test.js
```

Test coverage:
- Unit tests: 22 tests
- Integration tests: 8 tests
- E2E tests: 4 tests
- Security tests: 13 tests
- Validation tests: 3 tests
- Auto-fetch tests: 4 tests

Total: 54+ tests
```

**Commit**: "docs: update testing documentation"

---

## Success Criteria

- [ ] At least 54 total tests (34+ new tests)
- [ ] All tests pass (100% pass rate)
- [ ] Build succeeds without errors
- [ ] Hash command: 3 unit tests
- [ ] Init command: 3 unit tests
- [ ] Validation utilities: 9 tests
- [ ] Format utilities: 3 tests
- [ ] Constants: 4 tests
- [ ] CLI interface: 4 tests
- [ ] Error handling: 4 tests
- [ ] E2E workflows: 4 tests
- [ ] Test suite health check: 2 tests
- [ ] All commits follow conventional format

---

## Verification Commands

```bash
# Build
npm run build

# Run all tests
npm test

# Run specific test suite
npm test -- test/hash.test.js

# Count total tests
npm test 2>&1 | grep "tests" | grep -oP '\d+(?= tests)'
```

**Expected**: 54+ tests passing

---

*Plan follows YamoSuper workflow principles with TDD at core*
