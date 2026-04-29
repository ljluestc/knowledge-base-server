import { config } from 'dotenv';
import { homedir } from 'os';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';

// Default KB directory: prefer explicit env, else use CWD-based path for MCP workflows
// This allows MCP clients to use CWD as KB root (like mcpvault behavior)
export const KB_DIR = process.env.KB_DIR || join(homedir(), '.knowledge-base');
export const FILES_DIR = join(KB_DIR, 'files');
export const DB_PATH = join(KB_DIR, 'kb.db');
export const CONFIG_PATH = join(KB_DIR, 'config.json');
export const PID_PATH = join(KB_DIR, 'kb.pid');
export const ENV_PATH = join(KB_DIR, '.env');

mkdirSync(FILES_DIR, { recursive: true });

// Load .env from KB_DIR — the canonical config location.
// No CWD fallback: CWD is unreliable (could be $HOME via systemd, /tmp, or npx cache).
if (existsSync(ENV_PATH)) {
  config({ path: ENV_PATH });
}

/**
 * Resolve KB root path with CWD fallback for MCP-first workflows.
 * When KB_USE_CWD=true, uses current working directory as KB root.
 * This matches mcpvault behavior where the vault is assumed to be CWD.
 */
export function resolveKbRoot() {
  if (process.env.KB_USE_CWD === 'true') {
    return process.cwd();
  }
  return KB_DIR;
}

/**
 * Check if KB should auto-initialize at MCP startup.
 * Returns true if KB storage doesn't exist yet and auto-init is enabled.
 */
export function shouldAutoInit() {
  const dbExists = existsSync(DB_PATH);
  const autoInitEnabled = process.env.KB_AUTO_INIT !== 'false'; // default true
  return !dbExists && autoInitEnabled;
}
