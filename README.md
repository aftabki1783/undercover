# undercover

> AI agent skill — strips AI signatures from code before you push to open-source.

AI-generated code has identifiable fingerprints: step-numbered comment headers, first-person-plural prose ("Let's start by...", "We can now..."), emoji in docstrings, vague placeholder TODOs, verbose JSDoc, and passive-tense commit messages. These cluster in diffs and expose contributors to "AI-labeling" bias during open-source review.

**undercover** gives any AI agent an **undercover mode**: scan staged files and commit messages for those patterns, show exactly what would change, get confirmation, then clean them — so the work is judged on its technical merit.

> **Origin:** This skill was born inside [Claude Code](https://claude.ai/code) — Anthropic's agentic CLI — where the pattern rules and execution protocol were developed and refined as a native bundled skill. This repo extracts that mode and makes it available to every agent: Claude Code, GitHub Copilot, Gemini CLI, Cursor, Zed, Windsurf, Ollama, OpenAI, and anything that speaks MCP.

---

## How to plug it into your agent

Pick the integration that matches your agent. Each is a single copy-paste.

---

### Any agent via MCP (Claude Desktop, Cursor, Zed, Windsurf, VS Code)

The MCP server runs over stdio and requires no dependencies beyond Node.js.

**Start it:**
```bash
node mcp/server.mjs
```

**Register in Claude Desktop** (`~/Library/Application Support/Claude/claude_desktop_config.json`):
```json
{
  "mcpServers": {
    "undercover": {
      "command": "node",
      "args": ["/absolute/path/to/undercover/mcp/server.mjs"]
    }
  }
}
```

**Register in Cursor** (`.cursor/mcp.json` or global MCP settings):
```json
{
  "mcpServers": {
    "undercover": {
      "command": "node",
      "args": ["/absolute/path/to/undercover/mcp/server.mjs"]
    }
  }
}
```

**Register in Zed** (`~/.config/zed/settings.json`):
```json
{
  "context_servers": {
    "undercover": {
      "command": { "path": "node", "args": ["/absolute/path/to/undercover/mcp/server.mjs"] }
    }
  }
}
```

Or install from npm and run without cloning:
```bash
npx undercover-mcp
```

Once registered, the agent gets three tools:

| Tool | What it does |
|---|---|
| `undercover_scan` | Detect AI signatures in source text — read-only, call first |
| `undercover_strip` | Remove AI signatures from source text, return cleaned version |
| `undercover_check_commit` | Check and fix a commit message (imperative mood, remove AI phrasing) |

The agent should always call `undercover_scan` first, surface the findings, get user confirmation, then call `undercover_strip`.

---

### Gemini CLI / Google AI Studio agents

`AGENTS.md` at the repo root is read by Gemini CLI and Google AI Studio agents as project-level instructions.

```bash
# Drop into your repo root
cp AGENTS.md <your-repo>/AGENTS.md
```

Or append the undercover section to an existing `AGENTS.md`:
```bash
cat AGENTS.md >> <your-repo>/AGENTS.md
```

The file instructs the agent on trigger phrases, which line patterns to remove or rewrite, commit message rules, and the scan-first protocol. No code execution needed — the agent performs the edits directly using its file tools.

---

### GitHub Copilot (VS Code / JetBrains)

`.github/copilot-instructions.md` is read by Copilot as custom instructions for the repository.

```bash
cp .github/copilot-instructions.md <your-repo>/.github/copilot-instructions.md
```

Copilot Chat will then understand undercover mode and apply the pattern rules when asked.

---

### Ollama / OpenAI-compatible agents (system prompt injection)

For any agent where you control the system prompt, paste the contents of `AGENTS.md` directly into the system prompt. The pattern rules are written in plain language any instruction-following model understands — no code execution required.

```python
import ollama
from pathlib import Path

undercover_instructions = Path("AGENTS.md").read_text()

response = ollama.chat(
    model="llama3",
    messages=[
        {"role": "system", "content": undercover_instructions},
        {"role": "user",   "content": "Go undercover on my staged files before I push."},
    ],
)
```

For OpenAI:
```python
from openai import OpenAI
from pathlib import Path

client = OpenAI()
undercover_instructions = Path("AGENTS.md").read_text()

completion = client.chat.completions.create(
    model="gpt-4o",
    messages=[
        {"role": "system", "content": undercover_instructions},
        {"role": "user",   "content": "Go undercover on my staged files."},
    ],
)
```

---

## What gets stripped

| Pattern | Before | After |
|---|---|---|
| Step headers | `// Step 1: Initialize the database` | *(removed)* |
| Flow narration | `// First, we need to parse the input` | *(removed)* |
| Assistant-speak | `// Let's start by loading the config` | *(removed)* |
| Obvious comments | `// Get the user` | *(removed)* |
| Hedge prefixes | `// Note that this can throw` | `// this can throw` |
| Section banners | `// Implementation` | *(removed)* |
| Emoji | `// 🚀 Launch the server` | `// Launch the server` |
| Verbose JSDoc | `@param foo - The foo` | *(removed)* |
| Placeholder TODOs | `// TODO: add error handling` | *(removed)* |
| Commit phrasing | `This commit adds retry logic` | `Add retry logic` |
| Passive commit | `Added retry logic to fetch` | `Add retry logic to fetch` |

**Never touched:** logic, strings, variable names, or comments explaining non-obvious *why* (workarounds, constraints, subtle bugs).

---

## Files in this repo

```
AGENTS.md                             ← Gemini CLI / any agent that reads AGENTS.md
.github/copilot-instructions.md       ← GitHub Copilot custom instructions
mcp/server.mjs                        ← MCP server for Claude Desktop, Cursor, Zed, Windsurf, VS Code
```

---

## License

MIT
