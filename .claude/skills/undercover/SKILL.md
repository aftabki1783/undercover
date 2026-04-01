---
name: undercover
description: Strip AI signatures from staged files and commit messages before pushing. Removes verbose comments, AI-phrasing, emoji, placeholder TODOs, and passive commit subjects.
allowed-tools:
  - Bash(git diff*)
  - Bash(git add*)
  - Bash(git commit*)
  - Bash(git log*)
  - Bash(git show*)
  - Read
  - Edit
  - Glob
when_to_use: Use when the user is about to commit or push to a public/open-source repository and wants to remove AI-labeling artifacts from their code. Trigger phrases: 'go undercover', 'clean commits', 'strip AI signatures', 'remove AI comments', 'undercover mode', 'make this look human', 'clean before PR', 'prep for open source'.
argument-hint: "[staged|HEAD|HEAD~N|<file>] [--dry-run]"
context: inline
---

# Undercover Mode

Strip AI-characteristic patterns from code so contributions read as natural, human-authored work — no AI-labeling bias in open-source review.

## What gets removed

- `// Step 1: ...` / `// Phase N:` — step-numbered comment headers
- `// First, we need to...` / `// Next, we...` — flow-narrating prose
- `// Let's start by...` / `// We can now...` — first-person-plural assistant-speak
- `// Get the X` / `// Check if X` / `// Initialize X` — comments restating identifiers
- `// Note that` / `// Worth noting:` — hedge/softening prefixes (strips prefix, keeps content)
- `// Implementation` / `//──────────────` — section banners
- `// 🚀 ...` — emoji stripped from comment lines
- `@param foo - The foo` / `@returns The result` — verbose JSDoc restating the obvious
- `// TODO: add error handling` — vague AI-planted placeholder TODOs
- Commit messages: `This commit adds...` → imperative, `Added X` → `Add X`

**Never touched:** logic, strings, variable names, non-obvious *why* comments (workarounds, subtle bugs, perf constraints).

## Inputs

- `$target`: What to process — `staged` (default), `HEAD`, `HEAD~N`, or a file path
- `$dry_run`: If `--dry-run` is passed, only show what would change

## Steps

### 1. Determine target

If the user passed an argument, use it. Otherwise:
- Run `git diff --cached --name-only` — if there are staged files, target is `staged`
- If nothing staged, target is `HEAD`
- Tell the user what target was resolved

**Success criteria**: target is known, list of files to scan is populated.

### 2. Scan — surface all findings before touching anything

For each text file in the target:

```bash
# Get file content at the right ref
git show HEAD:<file>   # for HEAD / HEAD~N
# or read directly    # for staged / file path
```

Go through every file line by line and flag lines matching any of the patterns listed above. Group findings by pattern kind. Print a report:

```
── src/auth.ts (signal: 62%) ──
  L4  [step-header]       // Step 1: Initialize the connection
  L9  [lets-inline]       // Let's start by loading the user
  L14 [note-that]         // Note that this can throw
  L21 [obvious-comment]   // Get the token
  L28 [ai-todo]           // TODO: add error handling

── commit message ──
  [commit-phrasing]  "Added retry logic to the fetch client"
```

If signal score across all files is negligible (fewer than 2 matches total), say:
> "No significant AI signatures found — nothing to clean."
and stop.

**Success criteria**: report is printed, user can see exactly what will change.

### 3. [human] Confirm

Ask the user: **"Apply these changes?"**
- `yes` — proceed with all changes
- `no` — exit cleanly, nothing modified
- `selective` — go line by line, ask for each match individually

If `--dry-run` was passed, print the report and stop here without asking.

**Human checkpoint**: always pause here — these edits touch source files and potentially rewrite commit history.

### 4. Apply changes to files

For each file with matches:
1. Read the current file content
2. Remove or rewrite each flagged line according to its pattern action:
   - `remove` → delete the line entirely
   - `strip` → remove only the flagged prefix/suffix, keep the rest
   - `rewrite` → transform (e.g. `// Note that X` → `// X`)
3. Write the cleaned content back
4. Re-stage the file: `git add <file>`

**Rules:**
- Only modify comment lines — never touch code, strings, or variable names
- When removing a comment line, also remove any adjacent blank line that was only there to separate that comment from code
- If a JSDoc block becomes empty after removing `@param`/`@returns` lines, remove the whole block

**Success criteria**: all changed files are written and re-staged.

### 5. Clean the commit message (if target includes HEAD or a commit ref)

If processing committed files (not just staged):

```bash
git log -1 --format="%B"
```

Apply commit message rules:
- `This commit adds/removes/fixes...` → strip the prefix, use the rest in imperative form
- `Added/Removed/Updated/Fixed/Changed X` → convert to imperative: `Add/Remove/Update/Fix/Change X`
- Strip trailing periods from the subject line

Amend the commit:
```bash
git commit --amend --message "<cleaned message>"
```

**Human checkpoint**: confirm before amending — this rewrites history.

**Success criteria**: `git log -1 --oneline` shows the cleaned subject.

### 6. Verify

Re-scan the same target. Confirm the signal is gone. Show a brief diff summary:

```
✓ src/auth.ts       — 5 lines removed, 1 rewritten
✓ commit message    — "Added retry logic" → "Add retry logic"

Signal score: 62% → 0%
```

If any matches remain (false-negative from a complex pattern), list them and ask whether to fix manually.
