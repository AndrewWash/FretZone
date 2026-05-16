---
description: Add unit tests for a target with a test-author/adversary review loop
argument-hint: <file, module, or area to test>
---

Orchestrate an iterative write-and-review cycle for unit tests:

**Target:** $ARGUMENTS

You are the orchestrator. Do NOT write or review tests yourself — delegate to the agents and manage the loop.

## 1. Pick the target

- If the target above is empty, suggest concrete candidates (the `src/app/core/` engines and planners are pure logic with almost no coverage — high value) and ask the user with `AskUserQuestion` which to tackle.
- Use `TaskCreate` to track rounds if the scope is non-trivial.

## 2. Round 1

- Spawn the `test-author` agent (Agent tool, `subagent_type: test-author`) with the target. Instruct it to design and write `*.spec.ts` tests that all pass against current code, and to run `ng test --include <path>`.
- When it finishes, spawn the `adversary` agent in **Mode B** (review a test suite). Tell it which target code and which spec files to scrutinize.

## 3. Loop until clean

- If the adversary returns `VERDICT: PASS` — done.
- If `VERDICT: FAIL` — spawn a fresh `test-author` agent to address the findings. Since agents do not share memory, pass it the full context: the target, the coverage-gap and weak-assertion findings verbatim, and which spec files already exist. Then spawn a fresh `adversary` review.
- Repeat. **Cap at 3 review rounds.** If still failing after round 3, stop and present outstanding findings to the user.

## 4. Handle discovered bugs

- If the test-author or adversary reports a suspected **production bug** (correct-looking test fails against the code), do NOT paper over it. Stop the loop, report it to the user, and recommend running `/feature` to fix it.

## 5. Wrap up

- Summarize: spec files created, behavior now covered, final `ng test` result, remaining coverage gaps, and any bugs routed to `/feature`.
- Do NOT commit or push unless the user explicitly asks.
