# Contributing

Contributions are welcome — new patterns, agent integrations, bug fixes.

## Adding a new pattern

Patterns live in two places that must stay in sync:

| File | Used by |
|---|---|
| `AGENTS.md` | Gemini CLI, Ollama, any AGENTS.md reader |
| `mcp/server.mjs` — `PATTERNS` array | MCP server (`undercover_scan`, `undercover_strip`) |
| `.github/copilot-instructions.md` | GitHub Copilot |
| `.claude/skills/undercover/SKILL.md` — "What gets removed" list | Claude Code |

**Steps:**

1. Add the regex to `PATTERNS` in `mcp/server.mjs` with an `id`, `action` (`remove`/`strip`/`emoji`), and `re`
2. Add the same pattern in plain-English form to `AGENTS.md` under the matching section
3. Add a one-liner to `.github/copilot-instructions.md`
4. Add a bullet to the "What gets removed" list in `.claude/skills/undercover/SKILL.md`
5. Test the MCP server:
   ```bash
   echo '{"jsonrpc":"2.0","id":0,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{}}}
   {"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"undercover_scan","arguments":{"content":"<your test line>"}}}' \
   | node mcp/server.mjs
   ```

## Adding a new agent integration

If you have a working integration for an agent not yet covered (Aider, Continue.dev, Cline, etc.):

1. Add a section to `README.md` under "How to plug it into your agent"
2. If the agent reads a config file, add the appropriate file to the repo (e.g. `.aider/instructions.md`)
3. Open a PR with a clear description of which agent it targets and how you tested it

## Submitting a PR

- Keep PRs focused — one pattern or one integration per PR
- Test the MCP server with `echo ... | node mcp/server.mjs` before submitting
- No build step required — the server is plain ESM

## Reporting a false positive

Open an issue with:
- The exact comment line that was incorrectly flagged
- The language / file type
- Which pattern ID fired (`patternId` in the scan output)
