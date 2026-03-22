const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

// Set temporary config directory before importing anything that might use it
const TEST_CONFIG_DIR = path.join(os.tmpdir(), `yamo-test-config-${Date.now()}`);
process.env.YAMO_CONFIG_DIR = TEST_CONFIG_DIR;

// Import the command handler (using compiled JS from dist since we run with node)
const { configCommand } = require('../dist/commands/config.js');
const { storage } = require('../dist/utils/storage.js');

describe('Unit: Config Command', () => {
  before(() => {
    if (!fs.existsSync(TEST_CONFIG_DIR)) {
      fs.mkdirSync(TEST_CONFIG_DIR, { recursive: true });
    }
  });

  after(() => {
    if (fs.existsSync(TEST_CONFIG_DIR)) {
      fs.rmSync(TEST_CONFIG_DIR, { recursive: true, force: true });
    }
  });

  it('should set and get configuration values', () => {
    configCommand('set', 'TEST_KEY', 'test-value');
    
    // Check storage directly
    assert.strictEqual(storage.get('TEST_KEY'), 'test-value');
    
    // Check via get action (it logs to console, so we can only verify it doesn't throw here)
    // In a more advanced test we would wrap console.log
    configCommand('get', 'TEST_KEY');
  });

  it('should list configuration values and mask sensitive ones', () => {
    storage.set('RPC_URL', 'http://localhost:8545');
    storage.set('PRIVATE_KEY', '0x1234567890');
    storage.set('PINATA_JWT', 'secret-jwt');
    
    // Capture console.log
    const originalLog = console.log;
    let logs = [];
    console.log = (msg) => logs.push(msg);
    
    try {
      configCommand('list');
      const listOutput = logs.join('\n');
      
      assert.ok(listOutput.includes('RPC_URL: http://localhost:8545'), 'Should show non-sensitive keys');
      assert.ok(listOutput.includes('PRIVATE_KEY: ********'), 'Should mask PRIVATE_KEY');
      assert.ok(listOutput.includes('PINATA_JWT: ********'), 'Should mask PINATA_JWT');
      assert.ok(!listOutput.includes('0x1234567890'), 'Should not show actual private key');
    } finally {
      console.log = originalLog;
    }
  });

  it('should remove configuration values', () => {
    storage.set('REMOVE_ME', 'bye');
    assert.strictEqual(storage.get('REMOVE_ME'), 'bye');
    
    configCommand('remove', 'REMOVE_ME');
    assert.strictEqual(storage.get('REMOVE_ME'), undefined);
  });

  it('should throw error for invalid actions', () => {
    // We expect it to log an error via format.error, not throw to the top
    // because handleCommandError is used in some places, but configCommand catches and logs.
    const originalError = console.error;
    let errors = [];
    console.error = (msg) => errors.push(msg);
    
    try {
      configCommand('invalid-action');
      assert.ok(errors.some(e => e.includes('Invalid action')), 'Should log invalid action error');
    } finally {
      console.error = originalError;
    }
  });
});
