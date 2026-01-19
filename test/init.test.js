const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { execSync } = require('node:child_process');

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
