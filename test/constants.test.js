const { describe, it } = require('node:test');
const assert = require('node:assert');
const { CONSTANTS } = require('../dist/utils/constants.js');

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
