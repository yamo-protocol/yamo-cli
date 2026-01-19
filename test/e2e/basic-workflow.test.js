const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const { execSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

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

    assert.match(initOutput, /Created.*block.yamo/, 'Init should succeed');
    assert.ok(fs.existsSync(path.join(TEST_DIR, 'block.yamo')), 'block.yamo should exist');

    // Step 2: Calculate hash of created block
    const hashOutput = execSync(`cd ${TEST_DIR} && node ${CLI_PATH} hash block.yamo`, {
      encoding: 'utf-8',
    });

    assert.match(hashOutput, /0x[a-fA-F0-9]{64}/, 'Hash should be calculated');
    assert.match(hashOutput, /Block Content Hash/, 'Should show success message');
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
