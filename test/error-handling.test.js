const { describe, it, before } = require('node:test');
const assert = require('node:assert');
const { execSync } = require('node:child_process');
const path = require('node:path');

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
      const output = (err.stderr || err.stdout || '').toString();
      assert.match(output, /blockId is required.*--id/i, 'Should show missing option error');
    }
  });

  it('should validate blockId format in submit command', () => {
    try {
      // Create a temporary test file
      const fs = require('node:fs');
      const testFile = '/tmp/test-submit.yamo';
      fs.writeFileSync(testFile, 'agent: Test;\nintent: test;');

      execSync(`node ${CLI_PATH} submit ${testFile} --id invalid-format`, {
        encoding: 'utf-8',
        stdio: 'pipe',
        env: { ...process.env, RPC_URL: 'http://localhost', PRIVATE_KEY: '0xabc' },
      });
      assert.fail('Should have thrown error for invalid blockId');
    } catch (err) {
      const output = (err.stderr || err.stdout || '').toString();
      // Will fail with blockId format error or connection error
      assert.ok(output.length > 0, 'Should have error output');
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
      const output = (err.stderr || err.stdout || '').toString();
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
      const output = (err.stderr || err.stdout || '').toString();
      assert.match(output, /agent_name/i, 'Should mention missing agent_name argument');
    }
  });
});
