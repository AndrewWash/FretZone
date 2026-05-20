#!/usr/bin/env node
// Sor etude import pipeline.
//
// Two modes:
//   1. Direct MusicXML / MXL:
//      npm run import-etude -- --xml zmelodyhelper/sor/cache/op60-p12.mvt1.xml \
//        --id sor-op60-no1 --title "Op. 60 No. 1" --number 1 --bpm 72
//
//   2. PDF → page → Audiveris → MusicXML → catalog (end-to-end):
//      npm run import-etude -- --pdf "zmelodyhelper/sor/...pdf" --page 12 \
//        --id sor-op60-no1 --title "Op. 60 No. 1" --number 1 --bpm 72
//
// Emits a TypeScript snippet to stdout that can be pasted into
// src/app/core/sor/catalog.ts. Intended for iterative use: run, paste, spot-
// check against the source, hand-correct any OMR misreads.
//
// Assumes (tunable via flags):
//   - The source part is single-staff classical-guitar notation written one
//     octave HIGHER than it sounds. Set --no-transpose to disable the -12.
//   - Open-position voicings are preferred. Pick uses the printed
//     <fingering> first, then favors open strings, then the lowest fret.
//   - Chords on a single beat split: highest pitch → `upper`, lowest →
//     `lower`. Middle pitches of 3+ note chords are dropped (and a // CHORD
//     comment is emitted so you can hand-fix them — the renderer is single-
//     pitch per tickable per voice).
//
// External deps: fast-xml-parser (npm). Optional for `--pdf` mode: PyMuPDF
// (`py -m pip install pymupdf`), Audiveris on PATH (or pass --audiveris).

import { readFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve, join, basename, dirname, extname } from 'node:path';
import { XMLParser } from 'fast-xml-parser';

// ── CLI ────────────────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
function flag(name, def) {
  const i = argv.indexOf(name);
  if (i < 0) return def;
  const next = argv[i + 1];
  if (!next || next.startsWith('--')) return true;
  return next;
}
function help() {
  console.error('Usage:');
  console.error('  npm run import-etude -- --xml <musicxml> [--id ...] [--title ...] [--number N] [--bpm N]');
  console.error('  npm run import-etude -- --pdf <pdf> --page N [--movement N] [--audiveris <path>] ...same flags');
  process.exit(1);
}
const xmlIn = flag('--xml', null);
const pdfIn = flag('--pdf', null);
const pageNum = flag('--page', null);
const movement = Number(flag('--movement', 1));
const audiverisPath = flag('--audiveris', 'C:\\Program Files\\Audiveris\\Audiveris.exe');
const etudeId = flag('--id', 'sor-op60-no1');
const etudeTitle = flag('--title', 'Op. 60 No. 1');
const etudeNumber = Number(flag('--number', 1));
const bpm = Number(flag('--bpm', 72));
// Transpose is auto-detected from <clef-octave-change> (see below). These flags
// only override the auto-detect:
//   --no-transpose         force transpose = 0  (pitches in XML are sounding)
//   --transpose <N>        force transpose = N  (semitones to add)
const noTransposeFlag = flag('--no-transpose', false) === true;
const transposeOverride = flag('--transpose', null);
if (!xmlIn && !(pdfIn && pageNum)) help();

const CACHE = resolve('zmelodyhelper/sor/cache');
const SEVENZ = 'C:\\Program Files\\7-Zip\\7z.exe';

// Constants used by readBar() / toCatalogNote() — must be declared before
// the top-level call below since `const` has a temporal dead zone.
const STEP_PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const TYPE_TO_DUR = { whole: 'w', half: 'h', quarter: 'q', eighth: '8', '16th': '16', '32nd': '32' };
const OPEN_MIDI = [null, 64, 59, 55, 50, 45, 40]; // sounding, s=1 (high E) .. s=6 (low E)
const MAX_FRET = 14;
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// ── stages A + B (PDF → PNG → MusicXML) ─────────────────────────────────────
const xmlPath = xmlIn ? resolve(xmlIn) : await runOmrPipeline();

// ── stage C (MusicXML → TS) ────────────────────────────────────────────────
const xml = readFileSync(unpackIfMxl(xmlPath), 'utf8');
const tree = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  allowBooleanAttributes: true,
  parseTagValue: true,
  trimValues: true,
}).parse(xml);

const root = tree['score-partwise'] || tree['score-timewise'];
if (!root) { console.error('Not a MusicXML score.'); process.exit(1); }
const part = arr(root.part)[0];
if (!part) { console.error('No <part> in score.'); process.exit(1); }

const measuresRaw = arr(part.measure);

// Pre-scan for the first <attributes> block so we can resolve transpose and
// time signature BEFORE parsing any notes.
let firstAttrs = null;
for (const m of measuresRaw) {
  if (m.attributes) { firstAttrs = m.attributes; break; }
}

// transpose: CLI override wins; otherwise detect from <clef-octave-change>.
// MusicXML guitar exports typically use clef-octave-change=-1 (G clef sounds
// an octave lower), in which case the <pitch> values are SOUNDING pitch and
// no shift is needed. If the element is absent, assume the classical written-
// up convention and subtract 12 semitones.
let transpose;
if (noTransposeFlag) {
  transpose = 0;
} else if (transposeOverride != null && transposeOverride !== true) {
  transpose = Number(transposeOverride);
} else {
  const firstClef = arr(firstAttrs?.clef)[0];
  const oct = firstClef?.['clef-octave-change'];
  transpose = oct != null && Number(oct) === -1 ? 0 : -12;
}
process.stderr.write(`Transpose: ${transpose} semitones ` +
  `(${transpose === 0 ? 'pitches assumed sounding' : 'pitches assumed written, shifting down an octave'})\n`);

// Time signature
let timeSig = '4/4';
if (firstAttrs?.time) {
  const beats = Number(firstAttrs.time.beats ?? 4);
  const beatType = Number(firstAttrs.time['beat-type'] ?? 4);
  timeSig = `${beats}/${beatType}`;
}

const bars = measuresRaw.map((m, idx) => readBar(m, idx + 1));

process.stdout.write(emitCatalog(bars, timeSig));

// ── per-measure parsing ────────────────────────────────────────────────────
function readBar(m) {
  const { startRepeat, endRepeat } = extractRepeats(m);
  const notes = arr(m.note);
  if (!notes.length) return { upper: [], lower: [], startRepeat, endRepeat };

  // Group consecutive notes that share a beat via <chord/>.
  const beats = [];
  let cur = null;
  for (const n of notes) {
    if ('chord' in n) {
      cur.push(n);
    } else {
      cur = [n];
      beats.push(cur);
    }
  }

  const upper = [];

  for (const group of beats) {
    const head = group[0];
    const dur = TYPE_TO_DUR[String(head.type || 'quarter')] || 'q';
    const dot = 'dot' in head;

    if ('rest' in head) {
      upper.push({ kind: 'rest', duration: dur, dotted: dot });
      continue;
    }

    // Sort pitches ascending so the top of the printed chord becomes the
    // primary note (matches Sor's convention of melody-on-top, bass-below).
    const pitched = group
      .filter(g => g.pitch)
      .map(g => ({ el: g, midi: midiFromPitch(g.pitch) }))
      .sort((a, b) => b.midi - a.midi);                 // descending

    if (pitched.length === 0) continue;

    // Primary = top pitch; chord array = the rest (bottom-up so the renderer
    // stack is intuitive). Catalog `chord()` helper takes top + others.
    const primary = toCatalogNote(pitched[0].el, pitched[0].midi, dur, dot);
    if (pitched.length > 1) {
      primary.chord = pitched.slice(1)
        .reverse()        // bottom→up reads naturally in source
        .map(p => toCatalogNote(p.el, p.midi, dur, dot, /* fromChord */ true));
    }
    upper.push(primary);
  }

  // Two-voice writing (genuine polyphony) is still supported by the renderer
  // and the model, but classical guitar etudes in this import path live in
  // voice 1; we emit `lower: []`. Source files that use <voice>2</voice> will
  // need a follow-up enhancement to split here.
  return { upper, lower: [], startRepeat, endRepeat };
}

// MusicXML may have multiple <barline> children per measure (one per side).
// `direction="forward"` on the left edge → start repeat; `direction="backward"`
// on the right edge → end repeat. Location defaults to `right` when omitted.
function extractRepeats(m) {
  let startRepeat = false;
  let endRepeat = false;
  for (const bl of arr(m.barline)) {
    const dir = bl?.repeat?.['@_direction'];
    if (!dir) continue;
    const loc = bl['@_location'] ?? 'right';
    if (dir === 'forward' && loc === 'left') startRepeat = true;
    else if (dir === 'backward') endRepeat = true;
  }
  return { startRepeat, endRepeat };
}

function midiFromPitch(p) {
  const step = String(p.step ?? 'C');
  const octave = Number(p.octave ?? 4);
  const alter = Number(p.alter ?? 0);
  return (octave + 1) * 12 + STEP_PC[step] + alter;
}

function toCatalogNote(noteEl, writtenMidi, duration, dotted, fromChord = false) {
  const sounding = writtenMidi + transpose;
  const printed = extractFingering(noteEl);
  const sf = pickStringFret(sounding, printed.lh);
  if (!sf) {
    // No reachable string/fret in 0..14. Emit a comment-only note.
    return {
      kind: 'note',
      duration,
      dotted,
      midi: sounding,
      s: null,
      f: null,
      lh: printed.lh,
      rh: printed.rh,
      label: midiLabel(sounding),
      unreachable: true,
      fromChord,
    };
  }
  return {
    kind: 'note',
    duration,
    dotted,
    midi: sounding,
    s: sf.s,
    f: sf.f,
    lh: printed.lh != null ? printed.lh : suggestLh(sf.f),
    rh: printed.rh,
    label: midiLabel(sounding),
    fromChord,
  };
}

function extractFingering(noteEl) {
  const out = { lh: null, rh: null };
  const tech = noteEl.notations?.technical;
  if (!tech) return out;
  if (tech.string != null) {/* explicit string ignored — picker handles */ }
  const fn = arr(tech.fingering)[0];
  if (fn == null) return out;
  const text = typeof fn === 'object' ? (fn['#text'] ?? '') : fn;
  const s = String(text).trim().toLowerCase();
  if (/^[0-4]$/.test(s)) out.lh = Number(s);
  else if (/^[pima]$/.test(s)) out.rh = s;
  return out;
}

// ── string/fret picker ─────────────────────────────────────────────────────
// Index by catalog convention: s=1 (high E .. s=6 low E). OPEN_MIDI declared
// at the top of the file (constants block) so it's available before this fn
// is reached via the top-level call sequence.

function pickStringFret(soundingMidi, preferredLh) {
  let best = null;
  for (let s = 1; s <= 6; s++) {
    const f = soundingMidi - OPEN_MIDI[s];
    if (f < 0 || f > MAX_FRET) continue;
    let score = 0;
    if (preferredLh != null && f === preferredLh) score += 100;       // honor printed fingering
    if (f === 0) score += 12;                                          // open strings
    score -= f * 2;                                                    // lower fret better
    if (s >= 2 && s <= 4) score += 2;                                  // slight preference middle strings
    if (best == null || score > best.score) best = { s, f, score };
  }
  return best;
}

function suggestLh(fret) {
  if (fret === 0) return 0;
  if (fret >= 1 && fret <= 4) return fret;
  return undefined;
}

// ── emit catalog snippet ───────────────────────────────────────────────────
function emitCatalog(bars, timeSig) {
  const constBase = etudeId.toUpperCase().replace(/[-.]/g, '_');
  const lines = [];
  lines.push(`// Generated by scripts/musicxml-to-etude.mjs.`);
  lines.push(`// Source: ${xmlIn ? xmlIn : `${pdfIn} (page ${pageNum}, mvt ${movement})`}`);
  lines.push(`// Time: ${timeSig}, transpose ${transpose}st, bars: ${bars.length}`);
  lines.push(`// REVIEW: spot-check against the original engraving. Common OMR/import`);
  lines.push(`// errors: accidentals, ties, fingering choices.`);
  lines.push('');
  lines.push(`const ${constBase}_BARS: EtudeBar[] = [`);
  bars.forEach((bar, i) => {
    const hasChord = bar.upper.some(n => n.chord && n.chord.length);
    lines.push(`  // m${i + 1}${hasChord ? '  — contains chord(s)' : ''}`);
    lines.push(`  {`);
    lines.push(`    upper: [`);
    bar.upper.forEach(n => lines.push(`      ${emitOne(n)}`));
    lines.push(`    ],`);
    lines.push(`    lower: [`);
    bar.lower.forEach(n => lines.push(`      ${emitOne(n)}`));
    lines.push(`    ],`);
    if (bar.startRepeat) lines.push(`    startRepeat: true,`);
    if (bar.endRepeat) lines.push(`    endRepeat: true,`);
    lines.push(`  },`);
  });
  lines.push(`];`);
  lines.push('');
  lines.push(`export const ${constBase}: SorEtude = {`);
  lines.push(`  id: '${etudeId}',`);
  lines.push(`  opus: 60,`);
  lines.push(`  number: ${etudeNumber},`);
  lines.push(`  title: '${etudeTitle.replace(/'/g, "\\'")}',`);
  lines.push(`  key: 'C',`);
  lines.push(`  keyMode: 'Ionian',`);
  lines.push(`  timeSignature: '${timeSig}',`);
  lines.push(`  defaultBpm: ${bpm},`);
  lines.push(`  bars: ${constBase}_BARS,`);
  lines.push(`  enabled: true,`);
  lines.push(`};`);
  lines.push('');
  return lines.join('\n');
}

function emitOne(n) {
  if (n.kind === 'rest') {
    return `rest('${n.duration}'${n.dotted ? ', true' : ''}),`;
  }
  if (n.unreachable) {
    return `n({ /* UNREACHABLE: midi ${n.midi} (${n.label}) */ s: 1, f: 0, d: '${n.duration}' }), // TODO`;
  }
  // Chord tickable — emit chord(...) helper. Primary is the top of the chord;
  // others come from n.chord[] (already in bottom-up order).
  if (n.chord && n.chord.length) {
    const topParts = [`s: ${n.s}`, `f: ${n.f}`];
    if (n.lh != null && n.lh !== 0) topParts.push(`lh: ${n.lh}`);
    if (n.rh != null) topParts.push(`rh: '${n.rh}'`);
    const top = `{ ${topParts.join(', ')} }`;
    const others = n.chord.map(c => {
      const cParts = [`s: ${c.s}`, `f: ${c.f}`];
      if (c.lh != null && c.lh !== 0) cParts.push(`lh: ${c.lh}`);
      return `{ ${cParts.join(', ')} }`;
    }).join(', ');
    const opts = [`top: ${top}`, `others: [${others}]`, `d: '${n.duration}'`];
    if (n.dotted) opts.push(`dot: true`);
    const labels = [n.label, ...n.chord.map(c => c.label)].join(' + ');
    return `chord({ ${opts.join(', ')} }),   // ${labels}`;
  }
  const parts = [`s: ${n.s}`, `f: ${n.f}`, `d: '${n.duration}'`];
  if (n.dotted) parts.push(`dot: true`);
  if (n.lh != null && n.lh !== 0) parts.push(`lh: ${n.lh}`);
  if (n.rh != null) parts.push(`rh: '${n.rh}'`);
  return `n({ ${parts.join(', ')} }),   // ${n.label}`;
}

// ── helpers ────────────────────────────────────────────────────────────────
function arr(x) { return x == null ? [] : Array.isArray(x) ? x : [x]; }

function midiLabel(midi) {
  const oct = Math.floor(midi / 12) - 1;
  return `${NOTE_NAMES[midi % 12]}${oct}`;
}

// MXL files are zipped MusicXML. Unpack and return the inner .xml path.
function unpackIfMxl(p) {
  if (extname(p).toLowerCase() !== '.mxl') return p;
  mkdirSync(CACHE, { recursive: true });
  const outDir = join(CACHE, basename(p, '.mxl'));
  mkdirSync(outDir, { recursive: true });
  execFileSync(SEVENZ, ['x', p, `-o${outDir}`, '-y'], { stdio: 'ignore' });
  // Find a non-container.xml that ends in .xml at the top level.
  const found = readdirSync(outDir).find(f => f.endsWith('.xml') && !f.includes('container'));
  if (!found) throw new Error(`Unpacked ${p} but found no .xml inside ${outDir}`);
  return join(outDir, found);
}

async function runOmrPipeline() {
  mkdirSync(CACHE, { recursive: true });
  const pdfAbs = resolve(pdfIn);
  const stem = `${basename(pdfAbs, '.pdf').replace(/[^a-zA-Z0-9_-]/g, '_')}-p${pageNum}`;
  const pngPath = join(CACHE, `${stem}.png`);
  const mxlPath = join(CACHE, `${stem}.mvt${movement}.mxl`);

  if (!existsSync(pngPath)) {
    process.stderr.write(`Rasterizing page ${pageNum} of ${pdfAbs} → ${pngPath}\n`);
    const pyScript =
      `import fitz; doc=fitz.open(r'${pdfAbs}'); page=doc.load_page(${Number(pageNum) - 1}); ` +
      `mat=fitz.Matrix(300/72,300/72); pix=page.get_pixmap(matrix=mat); pix.save(r'${pngPath}')`;
    execFileSync('py', ['-c', pyScript], { stdio: 'inherit' });
  } else {
    process.stderr.write(`Cached PNG present: ${pngPath}\n`);
  }

  if (!existsSync(mxlPath)) {
    process.stderr.write(`Running Audiveris OMR on ${pngPath}\n`);
    execFileSync(audiverisPath, ['-batch', '-export', '-transcribe', '-output', CACHE, pngPath], { stdio: 'inherit' });
    if (!existsSync(mxlPath)) {
      throw new Error(`Audiveris ran but produced no ${mxlPath}. Check ${CACHE} for mvt files.`);
    }
  } else {
    process.stderr.write(`Cached MusicXML present: ${mxlPath}\n`);
  }

  return mxlPath;
}
