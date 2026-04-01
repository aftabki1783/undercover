# Undercover Mode

This repository provides **undercover mode** — an AI agent skill that strips AI-characteristic patterns from code and commit messages before they are pushed to public repositories.

## Available skill

`/undercover [staged|HEAD|HEAD~N|<file>] [--dry-run]`

Use this skill when preparing a contribution for an open-source project. It scans for AI-labeling fingerprints, shows you exactly what it found, asks for confirmation, then cleans the files and optionally fixes the commit message.

## When to use it (without being asked)

Automatically suggest running `/undercover` when:
- The user is about to run `git push` on a branch targeting a public repository
- You detect AI-characteristic comment patterns in files the user just edited
- The user asks to "clean up before the PR" or "prep this for open source"

## What the skill touches

Only comment lines and commit messages. Never logic, strings, or variable names.

See `.claude/skills/undercover/SKILL.md` for the full pattern list and execution protocol.
