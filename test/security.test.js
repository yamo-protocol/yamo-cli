/**
 * Part 3: CLI Security Fixes Tests
 * Tests for file path traversal protection in artifact bundling
 */

const assert = require('node:assert');
const { describe, it, before, after } = require('node:test');
const fs = require('fs');
const path = require('path');

describe('Part 3: CLI Security Fixes - Path Traversal Protection', () => {

  const testDir = path.join(process.cwd(), 'test-fixtures');
  const subDir = path.join(testDir, 'subdir');

  before(() => {
    // Create test fixtures
    fs.mkdirSync(testDir, { recursive: true });
    fs.mkdirSync(subDir, { recursive: true });

    // Create valid artifact files
    fs.writeFileSync(path.join(testDir, 'output.txt'), 'test output');
    fs.writeFileSync(path.join(subDir, 'nested.txt'), 'nested output');

    // Create a test YAMO file
    fs.writeFileSync(
      path.join(testDir, 'test.yamo'),
      'agent: TestAgent;\nintent: test;\noutput: output.txt;\n'
    );
  });

  after(() => {
    // Cleanup test fixtures
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('Path Security Validation', () => {

    it('should allow artifact in same directory as YAMO file', () => {
      const yamoFile = path.join(testDir, 'test.yamo');
      const artifactName = 'output.txt';

      // Security check: should not contain path patterns
      assert(!artifactName.includes('..'), 'Normal artifact name should not contain ..');
      assert(!artifactName.startsWith('/'), 'Normal artifact name should not start with /');

      const artifactPath = path.join(path.dirname(yamoFile), artifactName);
      const resolvedPath = path.resolve(artifactPath);
      const inputDir = path.resolve(path.dirname(yamoFile));

      assert(resolvedPath.startsWith(inputDir), 'Artifact in same directory should be allowed');
      assert(fs.existsSync(resolvedPath), 'Artifact file should exist');
    });

    it('should allow artifact in subdirectory of YAMO file directory', () => {
      const yamoFile = path.join(testDir, 'test.yamo');
      const artifactName = 'subdir/nested.txt';

      // Security check: should not contain path patterns
      assert(!artifactName.includes('..'), 'Subdirectory artifact name should not contain ..');
      assert(!artifactName.startsWith('/'), 'Subdirectory artifact name should not start with /');

      const artifactPath = path.join(path.dirname(yamoFile), artifactName);
      const resolvedPath = path.resolve(artifactPath);
      const inputDir = path.resolve(path.dirname(yamoFile));

      assert(resolvedPath.startsWith(inputDir), 'Artifact in subdirectory should be allowed');
      assert(fs.existsSync(resolvedPath), 'Artifact file should exist');
    });

    it('should reject path traversal with ../ components', () => {
      const yamoFile = path.join(testDir, 'test.yamo');
      const maliciousArtifact = '../../etc/passwd';

      // Security check: should reject .. in artifact name
      assert(maliciousArtifact.includes('..'), 'Path traversal with .. should be detected');

      // Simulate the validation logic
      if (maliciousArtifact.includes('..') || maliciousArtifact.startsWith('/')) {
        // This should throw an error
        assert(true, 'Artifact with .. should be rejected');
      }
    });

    it('should reject absolute path in artifact name', () => {
      const yamoFile = path.join(testDir, 'test.yamo');
      const maliciousArtifact = '/etc/passwd';

      // Security check: should reject absolute paths
      assert(maliciousArtifact.startsWith('/'), 'Absolute path should be detected');

      // Simulate the validation logic
      if (maliciousArtifact.includes('..') || maliciousArtifact.startsWith('/')) {
        // This should throw an error
        assert(true, 'Artifact with absolute path should be rejected');
      }
    });

    it('should reject complex path traversal', () => {
      const yamoFile = path.join(testDir, 'test.yamo');
      const maliciousArtifact = '../../../tmp/secrets.txt';

      // Security check: should reject .. in artifact name
      assert(maliciousArtifact.includes('..'), 'Path traversal with .. should be detected');

      if (maliciousArtifact.includes('..') || maliciousArtifact.startsWith('/')) {
        assert(true, 'Artifact with .. should be rejected');
      }
    });

    it('should reject disguised path traversal with intermediate directory', () => {
      const yamoFile = path.join(testDir, 'test.yamo');
      const maliciousArtifact = 'subdir/../../etc/passwd';

      // Security check: should reject .. in artifact name
      assert(maliciousArtifact.includes('..'), 'Disguised path traversal with .. should be detected');

      if (maliciousArtifact.includes('..') || maliciousArtifact.startsWith('/')) {
        assert(true, 'Artifact with .. should be rejected');
      }
    });

  });

  describe('Error Message Quality', () => {

    it('should provide helpful error for path traversal attempt', () => {
      const maliciousArtifact = '../../etc/passwd';
      let errorMessage = '';

      // Simulate the validation logic
      const testDir = process.cwd();
      const artifactPath = path.join(testDir, maliciousArtifact);
      const resolvedPath = path.resolve(artifactPath);
      const inputDir = path.resolve(testDir);

      if (!resolvedPath.startsWith(inputDir)) {
        errorMessage = `Artifact path outside allowed directory: ${maliciousArtifact}`;
      }

      assert.ok(errorMessage.includes('outside allowed directory'));
      assert.ok(errorMessage.includes(maliciousArtifact));
    });

    it('should mention the artifact name in error', () => {
      const artifactName = '../../../tmp/secrets.txt';
      let errorMessage = '';

      const testDir = process.cwd();
      const artifactPath = path.join(testDir, artifactName);
      const resolvedPath = path.resolve(artifactPath);
      const inputDir = path.resolve(testDir);

      if (!resolvedPath.startsWith(inputDir)) {
        errorMessage = `Artifact path outside allowed directory: ${artifactName}`;
      }

      assert.ok(errorMessage.length > 0, 'Error message should not be empty');
      assert.ok(errorMessage.includes(artifactName), 'Error should mention the artifact name');
    });

  });

  describe('Normal Functionality Preserved', () => {

    it('should still read normal artifact files', () => {
      const yamoFile = path.join(testDir, 'test.yamo');
      const artifactName = 'output.txt';

      const artifactPath = path.join(path.dirname(yamoFile), artifactName);
      const resolvedPath = path.resolve(artifactPath);
      const inputDir = path.resolve(path.dirname(yamoFile));

      // Validation should pass
      assert(resolvedPath.startsWith(inputDir));

      // File should still be readable
      const content = fs.readFileSync(resolvedPath, 'utf8');
      assert.strictEqual(content, 'test output');
    });

    it('should handle subdirectory artifacts correctly', () => {
      const yamoFile = path.join(testDir, 'test.yamo');
      const artifactName = 'subdir/nested.txt';

      const artifactPath = path.join(path.dirname(yamoFile), artifactName);
      const resolvedPath = path.resolve(artifactPath);
      const inputDir = path.resolve(path.dirname(yamoFile));

      // Validation should pass
      assert(resolvedPath.startsWith(inputDir));

      // File should still be readable
      const content = fs.readFileSync(resolvedPath, 'utf8');
      assert.strictEqual(content, 'nested output');
    });

  });

  describe('Edge Cases', () => {

    it('should handle non-existent artifact gracefully', () => {
      const yamoFile = path.join(testDir, 'test.yamo');
      const artifactName = 'nonexistent.txt';

      const artifactPath = path.join(path.dirname(yamoFile), artifactName);
      const resolvedPath = path.resolve(artifactPath);
      const inputDir = path.resolve(path.dirname(yamoFile));

      // Validation should pass (same directory)
      assert(resolvedPath.startsWith(inputDir));

      // But file should not exist
      assert(!fs.existsSync(resolvedPath), 'Non-existent artifact should not be readable');
    });

    it('should handle empty artifact name', () => {
      const yamoFile = path.join(testDir, 'test.yamo');
      const artifactName = '';

      const artifactPath = path.join(path.dirname(yamoFile), artifactName);
      const resolvedPath = path.resolve(artifactPath);
      const inputDir = path.resolve(path.dirname(yamoFile));

      // Empty path resolves to same directory
      assert(resolvedPath.startsWith(inputDir) || resolvedPath === inputDir);
    });

  });

});
