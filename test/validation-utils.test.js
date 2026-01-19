const { describe, it } = require('node:test');
const assert = require('node:assert');
const { validateBytes32, validateBlockId } = require('../dist/utils/validation.js');

describe('Validation Utilities Tests', () => {
  describe('validateBytes32', () => {
    it('should accept valid bytes32 hash', () => {
      const validHash = '0x' + 'a'.repeat(64);
      assert.strictEqual(validateBytes32(validHash), true);
    });

    it('should accept mixed case hex', () => {
      const mixedHash = '0x' + 'aAbBcCdD'.repeat(8); // 8 * 8 = 64 chars
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
