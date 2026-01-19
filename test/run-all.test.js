const { describe, it } = require('node:test');
const assert = require('node:assert');
const { execSync } = require('node:child_process');
const fs = require('node:fs');

describe('Test Suite Health Check', () => {
  it('should have all expected test files', () => {
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
      'test/e2e/basic-workflow.test.js',
    ];

    expectedFiles.forEach((file) => {
      assert.ok(
        fs.existsSync(file),
        `Should have ${file}`
      );
    });
  });

  it('should have minimum number of tests', () => {
    const testFiles = [
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
      'test/e2e/basic-workflow.test.js',
      'test/run-all.test.js',
    ];

    // Verify we have at least 12 test files
    const existingFiles = testFiles.filter(file => fs.existsSync(file));
    assert.ok(existingFiles.length >= 12, `Should have at least 12 test files, found ${existingFiles.length}`);
  });
});
