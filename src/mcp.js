import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { getToolDefinitions } from './tools.js';
import { shouldAutoInit } from './paths.js';
import { initDatabase } from './db.js';
import { autoSetPassword } from './auth.js';
import { existsSync, readFileSync, unlinkSync } from 'fs';
import { PID_PATH } from './paths.js';

/**
 * Check if a KB server is already running.
 * Returns { running: boolean, pid?: number }
 */
function checkRunningInstance() {
  if (!existsSync(PID_PATH)) {
    return { running: false };
  }
  try {
    const pid = parseInt(readFileSync(PID_PATH, 'utf-8').trim(), 10);
    // Check if process exists (send signal 0)
    try {
      process.kill(pid, 0);
      return { running: true, pid };
    } catch {
      // Process doesn't exist, stale PID file
      try { unlinkSync(PID_PATH); } catch {}
      return { running: false };
    }
  } catch {
    return { running: false };
  }
}

/**
 * Auto-initialize KB if not present.
 * Creates database and sets up minimal config.
 */
function autoInitKb() {
  console.error('[KB MCP] Auto-initializing knowledge base...');
  try {
    initDatabase();
    console.error('[KB MCP] Database initialized');
  } catch (err) {
    console.error('[KB MCP] Failed to init database:', err.message);
  }
}

export async function start() {
  // Check for auto-init on MCP startup
  if (shouldAutoInit()) {
    autoInitKb();
  }

  // Auto-generate password for MCP-only usage if not set
  // This allows MCP clients to work without manual password setup
  const { hasPassword } = await import('./auth.js');
  if (!hasPassword() && process.env.KB_AUTO_PASSWORD !== 'false') {
    const generated = autoSetPassword();
    console.error(`[KB MCP] Auto-generated password: ${generated}`);
  }

  const server = new McpServer({
    name: 'knowledge-base',
    version: '1.0.0',
  });

  // Register all tools from shared definitions
  for (const tool of getToolDefinitions()) {
    server.tool(tool.name, tool.description, tool.schema, tool.handler);
  }

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

// Allow direct execution
const isMain = process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/^\//, ''));
if (isMain || process.argv[1]?.endsWith('mcp.js')) {
  start().catch((err) => {
    console.error('MCP server failed to start:', err);
    process.exit(1);
  });
}
