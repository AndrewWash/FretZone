---
name: open-pr
description: Open a well-formed GitHub pull request for the current branch. Generates a clear title and a structured, reviewer-ready description from the branch's commits and diff, then creates the PR with the GitHub CLI. Use when the user wants to open, create, or "raise" a PR.
---

# open-pr

Open a pull request for the current work with a clear, reviewer-ready description. Optimize for the reviewer: they should understand *what changed and why* without reading the diff first.

## 1. Preflight

- Run `git status --porcelain` and `git branch --show-current`.
- Determine the base branch: `git symbolic-ref --quiet refs/remotes/origin/HEAD` (strip the `origin/` prefix). Fall back to `master`, then `main`.
- **If on the base branch:** the work needs its own branch. Propose a short, kebab-case branch name derived from the change and confirm it with the user, then `git checkout -b <name>`.
- **If there are uncommitted changes:** show them to the user and ask whether to include them. If yes, stage and commit with a clear message. NEVER stage `*.local.*` files, `.env*`, credentials, or secrets — call them out and leave them unstaged.
- **If there are no commits ahead of base** (`git log <base>..HEAD --oneline` is empty): stop and tell the user there is nothing to open a PR for.
- Confirm `gh` is available: `command -v gh`. If it is missing, see *Fallback* below.

## 2. Gather context

- `git log <base>..HEAD --oneline` — the commit list (summarize the whole branch, not just the last commit).
- `git diff <base>...HEAD --stat` — the files touched.
- Read the actual diff of anything non-obvious so the description is accurate.

## 3. Push

- `git push -u origin <branch>`.

## 4. Compose the PR

- **Title:** concise and imperative, summarizing the entire branch (e.g. "Add CI workflow and core theory test suite"). Not just the latest commit.
- **Body:** use this structure —
  - `## Summary` — what changed and why, 1-3 sentences.
  - `## Changes` — bullet points, grouped logically (by area or concern).
  - `## Test plan` — checkbox list of how the change was or should be verified. Be honest: if tests were not run, say so; do not check a box that was not done.
- End the body with:

  `🤖 Generated with [Claude Code](https://claude.com/claude-code)`

## 5. Create

- `gh pr create --base <base> --title "..." --body "..."`.
- Report the PR URL to the user.

## Fallback (no `gh`)

If `gh` is not installed: still push the branch, then give the user the compare URL
(`https://github.com/<owner>/<repo>/pull/new/<branch>`) and print the composed title and
body in a copyable block so they can open the PR by hand. Mention they can install the
GitHub CLI (`gh`) to let this skill open PRs directly.

## Rules

- Always confirm the base branch before pushing or creating the PR.
- Do not commit or push without the user's go-ahead when anything is ambiguous.
- Keep the description truthful — it is a record, not a sales pitch.
