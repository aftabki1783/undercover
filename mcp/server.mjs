#!/usr/bin/env node
/**
 * undercover MCP server
 *
 * Exposes three tools any MCP-compatible agent can call:
 *   undercover_scan   — detect AI signatures in source text (read-only)
 *   undercover_strip  — remove AI signatures from source text
 *   undercover_check_commit — check and clean a commit message
 *
 * Works with: Claude Desktop, Cursor, Zed, Windsurf, VS Code Copilot Chat,
 *             any agent host that supports MCP over stdio.
 *
 * Usage (stdio transport):
 *   node mcp/server.mjs
 *
 * Claude Desktop — add to ~/Library/Application Support/Claude/claude_desktop_config.json:
 * {
 *   "mcpServers": {
 *     "undercover": {
 *       "command": "node",
 *       "args": ["/path/to/undercover/mcp/server.mjs"]
 *     }
 *   }
 * }
 *
 * Cursor / Zed — add to your MCP settings:
 * {
 *   "undercover": {
 *     "command": "node",
 *     "args": ["/path/to/undercover/mcp/server.mjs"]
 *   }
 * }
 *
 * Or run via npx without cloning:
 *   npx undercover-mcp
 */

// ─── Pattern definitions ───────────────────────────────────────────────────────

const PATTERNS = [
  // Remove whole line
  { id: 'step-header',         action: 'remove', re: /^\s*(?:\/\/|#|\*)\s*(?:step|phase|part|stage)\s+\d+[:.]/i },
  { id: 'narrative-flow',      action: 'remove', re: /^\s*(?:\/\/|#)\s*(?:first|next|now|then|finally|lastly)[,\s]+(?:we |let's |we need to )/i },
  { id: 'lets-inline',         action: 'remove', re: /^\s*(?:\/\/|#)\s*let['']s\s+/i },
  { id: 'we-can-inline',       action: 'remove', re: /^\s*(?:\/\/|#)\s*we\s+(?:can|could|need\s+to|should|will)\s+/i },
  { id: 'this-will',           action: 'remove', re: /^\s*(?:\/\/|#)\s*this\s+(?:will|should|can|would|function\s+will)\s+/i },
  { id: 'obvious-comment',     action: 'remove', re: /^\s*(?:\/\/|#)\s*(?:get|set|return|fetch|retrieve|check\s+(?:if|whether|that)|initialize|initialise|define|declare|create)\s+(?:the\s+)?\w+\s*$/i },
  { id: 'implementation',      action: 'remove', re: /^\s*(?:\/\/|#)\s*(?:implementation|helper function|utility function|main logic|core logic|business logic)\s*$/i },
  { id: 'separator',           action: 'remove', re: /^\s*(?:\/\/|#)\s*[-=─━]{8,}\s*$/ },
  { id: 'jsdoc-param',         action: 'remove', re: /^\s*\*\s*@param\s+\{?\w+\}?\s+(\w+)\s*[-–]\s*(?:[Tt]he|[Aa]n?)\s+\1\b/ },
  { id: 'jsdoc-returns',       action: 'remove', re: /^\s*\*\s*@returns?\s*(?:[-–]\s*)?(?:the\s+(?:result|return\s+value)|a\s+promise\s+that\s+resolves)\s*\.?\s*$/i },
  { id: 'ai-todo',             action: 'remove', re: /^\s*(?:\/\/|#)\s*(?:TODO|FIXME):\s*(?:add|implement|handle|consider|improve|refactor|update)\s+(?:error\s+handling|edge\s+cases?|validation|logging|tests?)\s*$/i },
  // Strip prefix, keep rest
  { id: 'note-that',           action: 'strip',  re: /^(\s*(?:\/\/|#)\s*)(?:note\s*[,:]?\s*|note\s+that\s+|worth\s+noting\s*[,:]?\s*|important\s*[,:]?\s*)/i },
  // Strip emoji only
  { id: 'emoji',               action: 'emoji',  re: /^\s*(?:\/\/|#|\*)[^\n]*[\u{1F300}-\u{1F9FF}\u{2600}-\u{27FF}]/u },
]

const COMMIT_RULES = [
  { re: /^(?:this\s+commit\s+|in\s+this\s+commit\s+|this\s+change\s+)/i, replace: '' },
  { re: /^(added|removed|updated|changed|fixed|implemented|refactored|created|deleted)\s+/i,
    replace: (m) => m.trim().replace(/(?:ed|d)$/i, '').replace(/^./, c => c.toUpperCase()) + ' ' },
]

// ─── Core logic ───────────────────────────────────────────────────────────────

function processLine(line) {
  for (const p of PATTERNS) {
    if (!p.re.test(line)) continue
    if (p.action === 'remove') return { out: null, match: { id: p.id, original: line } }
    if (p.action === 'strip') {
      const out = line.replace(p.re, '$1')
      if (out !== line) return { out, match: { id: p.id, original: line, replacement: out } }
    }
    if (p.action === 'emoji') {
      const out = line.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{27FF}\u{FE00}-\u{FE0F}]/gu, '').replace(/\s{2,}/g, ' ').trimEnd()
      if (out !== line) return { out, match: { id: p.id, original: line, replacement: out } }
    }
  }
  return { out: line, match: null }
}

function scan(source) {
  const lines = source.split('\n')
  const matches = []
  for (let i = 0; i < lines.length; i++) {
    const { match } = processLine(lines[i])
    if (match) matches.push({ line: i + 1, ...match })
  }
  const score = Math.min(1, matches.length / Math.max(1, lines.length * 0.1))
  return { matches, signalScore: score }
}

function strip(source) {
  const lines = source.split('\n')
  const out = []
  const matches = []
  for (let i = 0; i < lines.length; i++) {
    const { out: result, match } = processLine(lines[i])
    if (match) matches.push({ line: i + 1, ...match })
    if (result !== null) out.push(result)
  }
  return { output: out.join('\n'), matches }
}

function cleanCommitMessage(msg) {
  let out = msg
  let changed = false
  for (const rule of COMMIT_RULES) {
    const next = out.replace(rule.re, typeof rule.replace === 'function'
      ? (_, m) => rule.replace(m)
      : rule.replace)
    if (next !== out) { out = next; changed = true }
  }
  out = out.replace(/\.\s*$/, '')
  if (changed && out[0]) out = out[0].toUpperCase() + out.slice(1)
  return out.trim()
}

// ─── MCP server (JSON-RPC over stdio) ─────────────────────────────────────────

const TOOLS = [
  {
    name: 'undercover_scan',
    description: 'Scan source code for AI-characteristic patterns without modifying anything. Returns a list of matches with line numbers and a 0–1 signal score. Always call this first before stripping.',
    inputSchema: {
      type: 'object',
      properties: {
        content: { type: 'string', description: 'Source file content to scan' },
      },
      required: ['content'],
    },
  },
  {
    name: 'undercover_strip',
    description: 'Remove AI-characteristic patterns from source code. Returns the cleaned source and a list of changes made. Call undercover_scan first and confirm with the user before calling this.',
    inputSchema: {
      type: 'object',
      properties: {
        content: { type: 'string', description: 'Source file content to clean' },
      },
      required: ['content'],
    },
  },
  {
    name: 'undercover_check_commit',
    description: 'Check a git commit message for AI-characteristic phrasing and return an improved version in imperative mood.',
    inputSchema: {
      type: 'object',
      properties: {
        message: { type: 'string', description: 'Commit message to check' },
      },
      required: ['message'],
    },
  },
]

function handleRequest(req) {
  const { method, params, id } = req

  if (method === 'initialize') {
    return { jsonrpc: '2.0', id, result: {
      protocolVersion: '2024-11-05',
      capabilities: { tools: {} },
      serverInfo: { name: 'undercover', version: '0.1.0' },
    }}
  }

  if (method === 'tools/list') {
    return { jsonrpc: '2.0', id, result: { tools: TOOLS } }
  }

  if (method === 'tools/call') {
    const { name, arguments: args } = params
    let result

    if (name === 'undercover_scan') {
      const { matches, signalScore } = scan(args.content)
      result = {
        signalScore: +signalScore.toFixed(3),
        matchCount: matches.length,
        verdict: matches.length === 0
          ? 'No AI signatures found.'
          : `Found ${matches.length} AI signature(s). Signal score: ${(signalScore * 100).toFixed(0)}%.`,
        matches,
      }
    } else if (name === 'undercover_strip') {
      const { output, matches } = strip(args.content)
      result = { output, changeCount: matches.length, changes: matches }
    } else if (name === 'undercover_check_commit') {
      const cleaned = cleanCommitMessage(args.message)
      result = {
        original: args.message,
        cleaned,
        changed: cleaned !== args.message,
      }
    } else {
      return { jsonrpc: '2.0', id, error: { code: -32601, message: `Unknown tool: ${name}` } }
    }

    return { jsonrpc: '2.0', id, result: {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    }}
  }

  return { jsonrpc: '2.0', id, error: { code: -32601, message: `Unknown method: ${method}` } }
}

// Read newline-delimited JSON from stdin, write responses to stdout
let buf = ''
process.stdin.setEncoding('utf8')
process.stdin.on('data', chunk => {
  buf += chunk
  const lines = buf.split('\n')
  buf = lines.pop() ?? ''
  for (const line of lines) {
    if (!line.trim()) continue
    try {
      const req = JSON.parse(line)
      const res = handleRequest(req)
      process.stdout.write(JSON.stringify(res) + '\n')
    } catch (e) {
      process.stdout.write(JSON.stringify({
        jsonrpc: '2.0', id: null,
        error: { code: -32700, message: 'Parse error' },
      }) + '\n')
    }
  }
})

process.stderr.write('undercover MCP server ready (stdio)\n')
