# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm start` / `ng serve` — dev server at `http://localhost:4200/`
- `npm run build` / `ng build` — production build into `dist/`
- `npm run watch` — development build with `--watch`
- `npm test` / `ng test` — run unit tests (Vitest via `@angular/build:unit-test`)
- Run a single test file: `ng test --include src/app/app.spec.ts` (specs live next to source as `*.spec.ts`)

## Coding Conventions

Angular/TypeScript style rules are defined in `.claude/CLAUDE.md` and `.junie/guidelines.md` (identical content) — follow them. In short: Angular 21 standalone components, signals for state, `OnPush` everywhere, `input()`/`output()` functions, native control flow (`@if`/`@for`), `class`/`style` bindings (never `ngClass`/`ngStyle`), host bindings in the `host` object.

`PRODUCT.md` defines product intent and design personality (precise, patient, minimal — no gamification). Honor it when touching UI.

## Architecture

FretZone is a guitar ear-training / fretboard practice app. The structure separates **framework-agnostic domain logic** from **Angular UI**.

### `src/app/core/` — domain logic (no Angular dependencies, except audio services)

Each practice tool has its own subfolder with an `engine.ts` (pure functions / classes that generate exercises and score answers) plus `models.ts` for types:

- `core/theory/` — the shared music-theory layer. `note.ts` (MIDI ↔ note name ↔ frequency conversions, `STANDARD_TUNING_MIDI`, enharmonic spelling) and `modes.ts` (scales, modes, key signatures). Most other modules import from here.
- `core/melody/` — a **planner pipeline**. `engine.ts` orchestrates `form-planner` → `harmony-planner` → `contour-planner` → `rhythm-planner` → `pitch-planner` to generate melodic phrases. `engine-pool.ts` (`playablePool`) computes which MIDI pitches are reachable given scale + selected strings + fret range.
- `core/quiz/`, `core/intervals/`, `core/scales/` — engines for the Fretboard Quiz, Interval Memorization, and Scales tools. `scales/catalog.ts` holds hand-authored fretboard patterns (string/fret/finger).
- `core/audio/` — the only Angular-aware part of core. `pitch-detect.service.ts` and `metronome.service.ts` are `providedIn: 'root'` services; `melody-detection.ts` / `two-note-detection.ts` are pitch-matching helpers.
- `core/utils/` — `random.ts`, `storage.ts` (typed `localStorage` wrappers used to persist tool configs).

### `src/app/<feature>/` — feature components

`quiz/`, `intervals/`, `tuner/`, `melody/`, `scales/`, `timebase/` are each a lazy-loaded route (see `app.routes.ts`; default route redirects to `quiz`). Components hold UI state in signals and delegate exercise logic to the matching `core/` engine.

### `src/app/notation/` — music notation rendering

`vexflow-render.ts` wraps the `vexflow` library to render staves/notes as themeable (light/dark) SVG. Components here (`staff`, `melody-staff`, `scale-staff`, `treble-note`, `fretboard-diagram`) consume it.

### Pitch detection — important quirk

Live pitch detection is **not** an npm dependency. `PitchDetectService` injects an external script at runtime from `public/zPitchDetect/PitchDetect-main/...` and calls globals (`autoCorrelate`, `startPitchDetect`) it exposes on `window`. The `zPitchDetect/` folder at repo root is the source; `public/zPitchDetect/` is the served copy.

## Multi-agent workflows

Two slash commands orchestrate iterative agent loops (agents defined in `.claude/agents/`):

- `/feature <description>` — `implementer` makes the change, `adversary` attacks it (and proves bugs with failing `*.spec.ts` tests); loops until the adversary signs off (max 3 rounds).
- `/test <target>` — `test-author` writes Vitest specs, `adversary` critiques coverage and assertion strength; loops until clean. Suspected production bugs are routed back to `/feature`.

The `adversary` only ever writes test files, never production code.

## Stack notes

- Angular 21, standalone bootstrap via `src/main.ts` → `app.config.ts` (only `provideRouter` + global error listeners).
- Styling: Tailwind CSS v4 through PostCSS (`.postcssrc.json`); design tokens are CSS custom properties (`--fz-*`, oklch colors) in `src/styles.css`.
- Tests run under Vitest with `jsdom`.
