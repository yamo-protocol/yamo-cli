
const assert = require('node:assert');
const { describe, it } = require('node:test');

// We'll import or mock the validation function later, 
// for now let's define the test expectations based on the same logic as MCP server.

function validateBlockId(blockId) {
  if (!blockId) throw new Error("blockId is required");
  
  const parts = blockId.split('_');
  if (parts.length < 2) {
    throw new Error(`blockId must follow format {origin}_{workflow} (e.g., 'claude_chain'). Received: ${blockId}`);
  }
}

describe('CLI BlockId Validation', () => {
  it('should accept valid blockIds', () => {
    const validIds = ['claude_chain', 'aurora_weave', 'document_translation', 'my_agent_task'];
    validIds.forEach(id => {
      assert.doesNotThrow(() => validateBlockId(id), `Should accept ${id}`);
    });
  });

  it('should reject blockIds without underscore', () => {
    const invalidIds = ['claude', 'chain', 'testblock'];
    invalidIds.forEach(id => {
      assert.throws(() => validateBlockId(id), /must follow format/, `Should reject ${id}`);
    });
  });
  
  it('should reject empty blockId', () => {
      assert.throws(() => validateBlockId(''), /blockId is required/);
  });
});
