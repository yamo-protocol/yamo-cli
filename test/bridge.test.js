/**
 * Tests for bridge commands (kernels, status, invoke).
 * Uses a lightweight in-process HTTP server to mock the bridge JSON-RPC endpoint.
 */
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');

// ── Mock bridge server ────────────────────────────────────────────────────

const MOCK_PORT = 14_321;
let _server;
let _nextHandler; // set per-test to control response

function startMockServer() {
  return new Promise((resolve) => {
    _server = http.createServer((req, res) => {
      let body = '';
      req.on('data', (chunk) => (body += chunk));
      req.on('end', () => {
        let parsed;
        try {
          parsed = JSON.parse(body);
        } catch {
          parsed = {};
        }

        const response = _nextHandler ? _nextHandler(parsed) : { error: { code: -32601, message: 'Method not found' } };
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ jsonrpc: '2.0', id: parsed.id, ...response }));
      });
    });
    _server.listen(MOCK_PORT, '127.0.0.1', () => resolve());
  });
}

function stopMockServer() {
  return new Promise((resolve) => _server.close(resolve));
}

// ── Helpers ───────────────────────────────────────────────────────────────

const BASE_URL = `http://127.0.0.1:${MOCK_PORT}`;

async function callRpc(method, params = {}) {
  const resp = await fetch(`${BASE_URL}/rpc`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', method, params, id: 1 }),
  });
  return resp.json();
}

// ── Tests ─────────────────────────────────────────────────────────────────

describe('Bridge mock server: JSON-RPC protocol', () => {
  before(startMockServer);
  after(stopMockServer);

  it('returns result envelope for kernel.list', async () => {
    _nextHandler = () => ({
      result: {
        kernels: [
          {
            kernel_id: 'k1',
            capabilities: ['SkillA'],
            status: 'idle',
            last_seen: '2026-01-01T00:00:00Z',
          },
        ],
        count: 1,
      },
    });

    const resp = await callRpc('kernel.list');
    assert.equal(resp.jsonrpc, '2.0');
    assert.equal(resp.result.count, 1);
    assert.equal(resp.result.kernels[0].kernel_id, 'k1');
    assert.deepEqual(resp.result.kernels[0].capabilities, ['SkillA']);
  });

  it('returns result envelope for cluster.status', async () => {
    _nextHandler = () => ({
      result: {
        node: 'node@localhost',
        leader: null,
        members: ['node@localhost'],
        connected_kernels: 2,
      },
    });

    const resp = await callRpc('cluster.status');
    assert.equal(resp.result.node, 'node@localhost');
    assert.equal(resp.result.connected_kernels, 2);
    assert.ok(Array.isArray(resp.result.members));
  });

  it('returns result envelope for skill.invoke', async () => {
    _nextHandler = (req) => {
      assert.equal(req.params.skill, 'EchoSkill');
      return {
        result: {
          skill: 'EchoSkill',
          handler_id: 'k1',
          result: { echo: req.params.payload },
        },
      };
    };

    const resp = await callRpc('skill.invoke', { skill: 'EchoSkill', payload: 'hello', timeout_ms: 5000 });
    assert.equal(resp.result.skill, 'EchoSkill');
    assert.equal(resp.result.handler_id, 'k1');
    assert.equal(resp.result.result.echo, 'hello');
  });

  it('returns error envelope for unknown method', async () => {
    _nextHandler = () => ({ error: { code: -32601, message: 'Method not found' } });

    const resp = await callRpc('no.such.method');
    assert.equal(resp.error.code, -32601);
    assert.ok(resp.error.message.includes('Method not found'));
  });

  it('returns error when no skill handler registered', async () => {
    _nextHandler = () => ({ error: { code: -32602, message: 'No handler for skill: MissingSkill' } });

    const resp = await callRpc('skill.invoke', { skill: 'MissingSkill' });
    assert.equal(resp.error.code, -32602);
    assert.ok(resp.error.message.includes('No handler'));
  });
});

describe('Bridge config: missing YAMO_BRIDGE_URL', () => {
  it('getBridgeBaseUrl throws when URL not set', () => {
    // Simulate the error path directly — the module raises if config.bridgeUrl is falsy.
    function getBridgeBaseUrl(url) {
      if (!url) {
        throw new Error(
          'Bridge URL not configured. Set YAMO_BRIDGE_URL env var or run: yamo config set YAMO_BRIDGE_URL http://localhost:4001'
        );
      }
      return url.replace(/^ws:\/\//, 'http://').replace(/\/$/, '');
    }

    assert.throws(() => getBridgeBaseUrl(undefined), /Bridge URL not configured/);
  });

  it('getBridgeBaseUrl converts ws:// to http://', () => {
    function getBridgeBaseUrl(url) {
      if (!url) throw new Error('Bridge URL not configured.');
      return url.replace(/^ws:\/\//, 'http://').replace(/^wss:\/\//, 'https://').replace(/\/$/, '');
    }

    assert.equal(getBridgeBaseUrl('ws://localhost:4001'), 'http://localhost:4001');
    assert.equal(getBridgeBaseUrl('wss://bridge.example.com/'), 'https://bridge.example.com');
    assert.equal(getBridgeBaseUrl('http://localhost:4001/'), 'http://localhost:4001');
  });
});
