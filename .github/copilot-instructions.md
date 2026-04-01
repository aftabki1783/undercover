<!-- GitHub Copilot custom instructions -->
# Undercover Mode

You have an **undercover mode** for stripping AI-characteristic patterns from
code before commits to public repositories.

## Trigger phrases

Activate when the user says any of: "go undercover", "undercover mode",
"clean before PR", "strip AI signatures", "make this look human",
"prep for open source", "clean commits", "remove AI comments".

## What to strip from source files

Remove or rewrite lines matching these patterns (only in comment lines — never
touch logic, strings, or variable names):

**Remove the whole line:**
- `// Step N:` / `// Phase N:` step-numbered headers
- `// First, we ...` / `// Next, we ...` / `// Now we ...` flow narration
- `// Let's ...` / `// We can ...` / `// We need to ...` first-person-plural
- `// Get the X` / `// Check if X` / `// Initialize X` obvious restatements
- `// Implementation` / `//────────────` section banners
- `// TODO: add error handling` / `// TODO: add tests` vague placeholder TODOs
- `@param foo - The foo` / `@returns The result` verbose JSDoc

**Strip prefix, keep the rest:**
- `// Note that X` → `// X`
- `// Note: X` → `// X`
- `// Worth noting: X` → `// X`
- `// Important: X` → `// X`

**Strip emoji only:**
- `// 🚀 Launch server` → `// Launch server`

## What to fix in commit messages

Convert to imperative mood:
- `This commit adds X` → `Add X`
- `Added X` → `Add X`, `Removed X` → `Remove X`, `Fixed X` → `Fix X`
- Remove trailing periods from the subject line

## Protocol

1. Scan and show findings first — never silently modify without showing the user what will change
2. Get confirmation before editing files or amending commits
3. Re-scan after to confirm signal dropped
