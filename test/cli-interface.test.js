const { describe, it, before } = require('node:test');
const assert = require('node:assert');
const { execSync } = require('node:child_process');
const path = require('node:path');

const CLI_PATH = path.join(process.cwd(), 'dist/index.js');

describe('CLI Interface Tests', () => {
  before(() => {
    execSync('npm run build', { stdio: 'inherit' });
  });

  it('should show help with --help flag', () => {
    const output = execSync(`node ${CLI_PATH} --help`, { encoding: 'utf-8' });

    assert.match(output, /Usage:/, 'Should show usage');
    assert.match(output, /hash/, 'Should list hash command');
    assert.match(output, /init/, 'Should list init command');
    assert.match(output, /submit/, 'Should list submit command');
    assert.match(output, /audit/, 'Should list audit command');
    assert.match(output, /download-bundle/, 'Should list download-bundle command');
  });

  it('should show version with --version flag', () => {
    const output = execSync(`node ${CLI_PATH} --version`, { encoding: 'utf-8' });

    assert.match(output, /1\.3\.13/, 'Should show version number');
  });

  it('should show command-specific help', () => {
    const output = execSync(`node ${CLI_PATH} hash --help`, { encoding: 'utf-8' });

    assert.match(output, /Calculate SHA256 hash/, 'Should show hash description');
    assert.match(output, /<file>/, 'Should show file argument');
  });

  it('should show error for unknown command', () => {
    try {
      execSync(`node ${CLI_PATH} unknown-command`, {
        encoding: 'utf-8',
        stdio: 'pipe',
      });
      assert.fail('Should have thrown error');
    } catch (err) {
      const output = (err.stderr || err.stdout || '').toString();
      assert.match(output, /unknown command/i, 'Should show unknown command error');
    }
  });
});
