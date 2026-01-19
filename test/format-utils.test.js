const { describe, it } = require('node:test');
const assert = require('node:assert');
const { format, handleCommandError } = require('../dist/utils/format.js');

describe('Format Utilities Tests', () => {
  it('should export format object with all methods', () => {
    assert.ok(typeof format.success === 'function', 'Should have success method');
    assert.ok(typeof format.error === 'function', 'Should have error method');
    assert.ok(typeof format.info === 'function', 'Should have info method');
    assert.ok(typeof format.warn === 'function', 'Should have warn method');
    assert.ok(typeof format.detail === 'function', 'Should have detail method');
    assert.ok(typeof format.value === 'function', 'Should have value method');
  });

  it('should export handleCommandError function', () => {
    assert.ok(typeof handleCommandError === 'function', 'Should export handleCommandError');
  });

  it('should format methods not throw when called', () => {
    // These methods write to console, so we just verify they don't throw
    assert.doesNotThrow(() => {
      // Suppress console output during test
      const originalLog = console.log;
      const originalError = console.error;
      console.log = () => {};
      console.error = () => {};

      try {
        format.success('test');
        format.info('test');
        format.warn('test');
        format.detail('test');
        format.value('test');
      } finally {
        console.log = originalLog;
        console.error = originalError;
      }
    }, 'Format methods should not throw');
  });
});
