---
description: Implement a feature or bug fix with an implementer/adversary review loop
argument-hint: <feature or bug description>
---

Orchestrate an iterative implement-and-review cycle for this task:

**Task:** $ARGUMENTS

You are the orchestrator. Do NOT implement or review the code yourself — delegate to the agents and manage the loop.

## 1. Scope

- If the task above is empty, ask the user what to build or fix.
- If the scope, expected behavior, or acceptance criteria are ambiguous, ask clarifying questions with `AskUserQuestion` before spawning any agent.
- Use `TaskCreate` to track the rounds if the work is non-trivial.

## 2. Round 1

- Spawn the `implementer` agent (Agent tool, `subagent_type: implementer`) with the full task and any clarifications. Instruct it to implement and verify (`npm run build` + relevant specs).
- When it finishes, spawn the `adversary` agent in **Mode A** (review an implementation). Tell it the original task so it can check spec completeness, and to review the `git diff`.

## 3. Loop until clean

- If the adversary returns `VERDICT: PASS` — done.
- If `VERDICT: FAIL` — spawn a fresh `implementer` agent to fix the findings. Since agents do not share memory, pass it the full context it needs: the original task, the BLOCKER and SHOULD-FIX findings verbatim, and which files were already changed. Then spawn a fresh `adversary` review of the updated diff.
- Repeat. **Cap at 3 review rounds.** If still failing after round 3, stop and present the outstanding findings to the user for a decision — do not loop further.

## 4. Wrap up

- Summarize for the user: what changed, files touched, verification status (build + tests), any `*.spec.ts` the adversary added (note that these are now permanent coverage), and any remaining NITPICKs.
- Do NOT commit or push unless the user explicitly asks.
