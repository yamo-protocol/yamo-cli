const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { execSync } = require('node:child_process');

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
    assert.match(output, /Block Content Hash/, 'Should show success message');
  });

  it('should show error for non-existent file', () => {
    try {
      execSync(`node ${CLI_PATH} hash /tmp/nonexistent-file.txt`, {
        encoding: 'utf-8',
        stdio: 'pipe',
      });
      assert.fail('Should have thrown error');
    } catch (err) {
      const output = err.stderr ? err.stderr.toString() : err.stdout ? err.stdout.toString() : err.message;
      assert.match(output, /File not found/, 'Should show file not found error');
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
