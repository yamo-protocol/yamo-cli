import { Command } from 'commander';
import { config } from '../utils/config.js';
import { format, handleCommandError } from '../utils/format.js';

// ── Helpers ────────────────────────────────────────────────────────────────

function getBridgeBaseUrl(): string {
  const url = config.bridgeUrl;
  if (!url) {
    throw new Error(
      'Bridge URL not configured. Set YAMO_BRIDGE_URL env var or run: yamo config set YAMO_BRIDGE_URL http://localhost:4001'
    );
  }
  // Accept ws:// URLs (bridge WebSocket) and convert to http://
  return url.replace(/^ws:\/\//, 'http://').replace(/^wss:\/\//, 'https://').replace(/\/$/, '');
}

let _rpcId = 0;

async function bridgeRpc(
  baseUrl: string,
  method: string,
  params: Record<string, unknown> = {}
): Promise<unknown> {
  const id = ++_rpcId;
  const body = JSON.stringify({ jsonrpc: '2.0', method, params, id });

  const resp = await fetch(`${baseUrl}/rpc`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });

  if (!resp.ok) {
    throw new Error(`Bridge HTTP ${resp.status}: ${resp.statusText}`);
  }

  const json = (await resp.json()) as {
    result?: unknown;
    error?: { code: number; message: string };
  };

  if (json.error) {
    throw new Error(`Bridge RPC error ${json.error.code}: ${json.error.message}`);
  }

  return json.result;
}

// ── Subcommand handlers ────────────────────────────────────────────────────

async function kernelsHandler(): Promise<void> {
  try {
    const baseUrl = getBridgeBaseUrl();
    const result = (await bridgeRpc(baseUrl, 'kernel.list')) as {
      kernels: Array<{
        kernel_id: string;
        capabilities: string[];
        status: string;
        last_seen: string;
      }>;
      count: number;
    };

    if (result.count === 0) {
      format.warn('No connected kernels.');
      return;
    }

    format.success(`Connected kernels: ${result.count}`);
    for (const k of result.kernels) {
      format.info(`\n  Kernel: ${k.kernel_id}`);
      format.detail(`    Status:       ${k.status || 'idle'}`);
      format.detail(`    Last seen:    ${k.last_seen || 'unknown'}`);
      format.detail(`    Capabilities: ${k.capabilities?.length ? k.capabilities.join(', ') : 'none'}`);
    }
  } catch (error) {
    handleCommandError(error, 'bridge kernels');
  }
}

async function statusHandler(): Promise<void> {
  try {
    const baseUrl = getBridgeBaseUrl();
    const result = (await bridgeRpc(baseUrl, 'cluster.status')) as {
      node: string;
      leader: string | null;
      members: string[];
      connected_kernels: number;
    };

    format.success('Bridge cluster status');
    format.detail(`  Node:              ${result.node}`);
    format.detail(`  Leader:            ${result.leader ?? 'unknown'}`);
    format.detail(`  Members:           ${result.members?.join(', ') || 'none'}`);
    format.detail(`  Connected kernels: ${result.connected_kernels}`);
  } catch (error) {
    handleCommandError(error, 'bridge status');
  }
}

async function invokeHandler(
  skill: string,
  options: { payload?: string; timeout?: string }
): Promise<void> {
  try {
    const baseUrl = getBridgeBaseUrl();

    let payload: unknown = {};
    if (options.payload) {
      try {
        payload = JSON.parse(options.payload);
      } catch {
        // Treat as plain string if not valid JSON
        payload = options.payload;
      }
    }

    const timeoutMs = options.timeout ? parseInt(options.timeout, 10) : 30_000;

    format.info(`Invoking skill: ${skill}`);

    const result = (await bridgeRpc(baseUrl, 'skill.invoke', {
      skill,
      payload,
      timeout_ms: timeoutMs,
    })) as {
      skill: string;
      handler_id: string;
      result: unknown;
    };

    format.success(`Skill invocation complete`);
    format.detail(`  Skill:      ${result.skill}`);
    format.detail(`  Handler:    ${result.handler_id}`);
    format.value(`  Result:     ${JSON.stringify(result.result, null, 2)}`);
  } catch (error) {
    handleCommandError(error, 'bridge invoke');
  }
}

// ── Command builder ────────────────────────────────────────────────────────

export function bridgeCommand(): Command {
  const bridge = new Command('bridge').description(
    'Interact with the YAMO bridge (requires YAMO_BRIDGE_URL)'
  );

  bridge
    .command('kernels')
    .description('List connected kernels and their capabilities')
    .action(kernelsHandler);

  bridge
    .command('status')
    .description('Show bridge cluster status')
    .action(statusHandler);

  bridge
    .command('invoke <skill>')
    .description('Invoke a skill via the bridge')
    .option('-p, --payload <json>', 'JSON payload to pass to the skill handler')
    .option('-t, --timeout <ms>', 'Timeout in milliseconds', '30000')
    .action(invokeHandler);

  return bridge;
}
