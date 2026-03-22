const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const { execSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const CLI_PATH = path.join(process.cwd(), 'dist/index.js');
const BASE_TEST_DIR = path.join(process.cwd(), 'test-fixtures');

// Constants for the test
const RPC_URL = 'http://127.0.0.1:8545';
const PRIVATE_KEY = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
const CONTRACT_ADDRESS = '0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9';

describe('E2E: Submit and Audit', () => {
  let testDir;

  beforeEach(() => {
    testDir = path.join(BASE_TEST_DIR, `submit-audit-${Date.now()}-${Math.floor(Math.random() * 1000)}`);
    fs.mkdirSync(testDir, { recursive: true });
    testDir = fs.realpathSync(testDir);
    
    // Create ipfs_storage in testDir for mock IPFS
    fs.mkdirSync(path.join(testDir, 'ipfs_storage'), { recursive: true });

    // Set environment variables for the CLI
    process.env.RPC_URL = RPC_URL;
    process.env.PRIVATE_KEY = PRIVATE_KEY;
    process.env.CONTRACT_ADDRESS = CONTRACT_ADDRESS;
    process.env.USE_REAL_IPFS = 'false';
  });

  afterEach(() => {
    if (testDir && fs.existsSync(testDir)) {
      try {
        fs.rmSync(testDir, { recursive: true, force: true });
      } catch (e) {
        // Ignore cleanup errors
      }
    }
  });

  it('should submit a block and audit it', () => {
    const blockId = `e2e${Date.now()}_test`;
    
    // Step 1: Init a block
    execSync(`node ${CLI_PATH} init E2EAgent --intent "test_submission"`, {
      cwd: testDir,
      env: process.env,
    });

    // Step 2: Submit the block
    const submitOutput = execSync(`node ${CLI_PATH} submit block.yamo --id ${blockId} --ipfs`, {
      cwd: testDir,
      env: process.env,
      encoding: 'utf-8',
    });

    assert.match(submitOutput, /Confirmed! Tx: 0x/, 'Should show success message');
    assert.match(submitOutput, /IPFS Bundle CID: Qm/, 'Should show IPFS CID');

    // Step 3: Audit the block
    const auditOutput = execSync(`node ${CLI_PATH} audit ${blockId}`, {
      cwd: testDir,
      env: process.env,
      encoding: 'utf-8',
    });

    assert.match(auditOutput, /INTEGRITY VERIFIED/, 'Audit should succeed');
  });

  it('should submit an encrypted block and audit it with key', () => {
    const blockId = `e2e${Date.now()}_enc`;
    const encryptionKey = 'MyStr0ng!Password123';
    
    // Step 1: Init a block
    execSync(`node ${CLI_PATH} init EncAgent`, {
      cwd: testDir,
      env: process.env,
    });

    // Step 2: Submit with encryption
    const submitOutput = execSync(`node ${CLI_PATH} submit block.yamo --id ${blockId} --ipfs --encrypt --key "${encryptionKey}"`, {
      cwd: testDir,
      env: process.env,
      encoding: 'utf-8',
    });

    assert.match(submitOutput, /Confirmed! Tx: 0x/);

    // Step 3: Audit with key
    const auditOutput = execSync(`node ${CLI_PATH} audit ${blockId} --key "${encryptionKey}"`, {
      cwd: testDir,
      env: process.env,
      encoding: 'utf-8',
    });

    assert.match(auditOutput, /INTEGRITY VERIFIED/);
  });

  it('should fail audit of encrypted block without key', () => {
    const blockId = `e2e${Date.now()}_fail`;
    const encryptionKey = 'MyStr0ng!Password123';
    
    execSync(`node ${CLI_PATH} init FailAgent`, { cwd: testDir, env: process.env });
    execSync(`node ${CLI_PATH} submit block.yamo --id ${blockId} --ipfs --encrypt --key "${encryptionKey}"`, {
      cwd: testDir,
      env: process.env,
    });

    // Audit without key should fail
    try {
      execSync(`node ${CLI_PATH} audit ${blockId}`, {
        cwd: testDir,
        env: process.env,
        stdio: 'pipe',
      });
      assert.fail('Audit should have failed without key');
    } catch (error) {
      const stderr = error.stderr.toString();
      assert.match(stderr, /FAILED.*IPFS download/, 'Should show failure message');
    }
  });
});
