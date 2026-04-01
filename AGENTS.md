# Undercover Mode

You have an **undercover mode** available. When active, you automatically strip
AI-characteristic patterns from code and commit messages before they are
committed or pushed, so the contribution reads as natural, human-authored work.

---

## When to activate

Activate undercover mode **automatically** (without being asked) when:

- The user says "go undercover", "undercover mode", "clean before PR",
  "strip AI signatures", "make this look human", "prep for open source",
  "clean commits", or any semantically equivalent phrase
- The user is about to commit to a **public** or **open-source** repository
  and you detect AI-characteristic patterns in staged or recently changed files
- The user asks you to "review before committing" on a public repo

---

## What undercover mode does

Scan every staged or recently modified source file line by line and remove or
rewrite any line that matches the patterns below. Then apply the same rules to
the commit message.

**Never touch:** logic, strings, variable names, or comments that explain a
non-obvious *why* (workarounds, hidden constraints, performance notes,
subtle bug explanations).

---

## Pattern rules

Apply these rules in order. For each matching line, take the listed action.

### 1. Step-numbered headers — REMOVE the line

Matches:
```
// Step 1:        // Phase 2:        // Part 3:
// Step 1.        # Step 1:          /* Step 1: */
```

### 2. Flow-narrating comments — REMOVE the line

Matches (case-insensitive at the start of a comment):
```
// First, we ...          // Next, we ...
// Now we ...             // Then we ...
// Finally, we ...        // First, we need to ...
```

### 3. First-person-plural assistant phrases — REMOVE the line

Matches:
```
// Let's start by ...     // Let's now ...
// We can now ...         // We can use ...
// We need to ...         // We should ...
// This will ...          // This function will ...
```

### 4. Obvious restating comments — REMOVE the line

Matches (comment directly above or beside trivially named code):
```
// Get the X             // Set the X
// Return the X          // Fetch the X
// Check if X            // Check whether X
// Initialize X          // Initialize the X
// Define X              // Create the X
```

### 5. Hedge / softening prefixes — STRIP prefix, keep the rest

Transform:
```
// Note that X            →  // X
// Note: X                →  // X
// Worth noting: X        →  // X
// Important: X           →  // X
// Important note: X      →  // X
```

### 6. Section banners — REMOVE the line

Matches:
```
// Implementation          // Helper function
// Main logic              // Core logic
//--------------------     //====================
# ────────────────────
```

### 7. Emoji in comment lines — STRIP the emoji characters only

Transform:
```
// 🚀 Launch the server    →  // Launch the server
// ✅ All checks passed     →  // All checks passed
// 🔧 Fix the bug           →  // Fix the bug
```

### 8. Verbose JSDoc — REMOVE the line

Matches `@param` or `@returns` lines that only restate the parameter name:
```
* @param foo - The foo
* @param userId - The user ID
* @returns The result
* @returns The return value
```
If removing these lines leaves a JSDoc block with no content (`/** */` or only
`/**\n */`), remove the entire block.

### 9. AI-planted placeholder TODOs — REMOVE the line

Matches:
```
// TODO: add error handling
// TODO: implement validation
// TODO: handle edge cases
// TODO: add logging
// TODO: add tests
// FIXME: handle this case
```
Keep TODOs that reference a specific issue, ticket, or a concrete technical
concern (e.g. `// TODO(#123): fix race condition when ...`).

---

## Commit message rules

Apply to the commit subject line (first line):

| Before | After |
|--------|-------|
| `This commit adds retry logic` | `Add retry logic` |
| `This commit fixes the auth bug` | `Fix the auth bug` |
| `In this commit we refactor X` | `Refactor X` |
| `Added retry logic to fetch` | `Add retry logic to fetch` |
| `Removed unused imports.` | `Remove unused imports` |
| `Updated the config file` | `Update the config file` |
| `Fixed a bug in the parser` | `Fix a bug in the parser` |

Strip trailing periods from the subject line.

---

## Execution protocol

1. **Scan first** — identify all matches, print a grouped report with line numbers
2. **Confirm** — ask the user before making any change (unless in autonomous/headless mode)
3. **Apply** — edit the files, re-stage them, optionally amend the commit message
4. **Verify** — re-scan to confirm the signal is gone, show a summary

In autonomous/headless mode (no user to confirm): apply silently if signal score
is below 30%, ask for confirmation above that threshold.
