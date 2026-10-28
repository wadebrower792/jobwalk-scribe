---
doc: prd
status: approved
---
# JobWalk Scribe — Product Requirements

A free browser tool that turns a contractor's rough spoken or typed job-walk note into a traceable client Scope of Work & Proposal. Source: `scope.md > The Unique Kernel`, `scope.md > Who It's For`.

## The Core Journey
1. Open `index.html` (served locally or from any static host). Company name and last note are restored from the device.
2. Tap **Tap to talk** and speak the walk, or type/paste it; **Load a sample walk** fills a realistic bathroom note.
3. Optionally enter a price and choose AI polish (Off / Browser AI / Local Ollama).
4. Tap **Write it up →**. The rule-based draft appears instantly with a meter: note lines accounted for, scope items, exclusions, client questions, flagged site conditions.
5. Click any document line → the source phrase is highlighted in the note.
6. If AI polish is on, lines are reworded one by one; rewrites that alter numbers are rejected and counted.
7. Edit inline if needed, then **Print / PDF**, **Copy**, or **Download .txt**. Success = a document the contractor would hand a homeowner without retyping.

## Screens and Layout
One screen, two panes: left "1 · Your job-walk note" (mic, sample, clear, note, source view, price, AI mode, Write it up, status); right "2 · Client-ready scope" (meter chips, actions, paper document). Stacks vertically on phones.

## Look and Feel
Charcoal header, hard-hat yellow accents, paper-white serif document, blue for client questions, amber for site conditions. Print hides the app chrome.

## Features and Behavior
### Capture
- Browser speech recognition (Web Speech API), continuous, each final phrase appended as a sentence. Unsupported browsers show "Voice not supported here — type instead".
### Structuring (deterministic, always on)
- Splits the note into phrases; pulls client name, street address, room/area and duration.
- Sorts phrases into 12 trade sections by keyword scoring; exclusions ("owner supplies", "not included", "by others"); allowances; uncertain phrases → "Please confirm: …?"; risk words (rot, probably, asbestos, permit, load-bearing…) → hidden-conditions clause.
- Cleans speech filler ("gonna", "um", "w/") without touching numbers.
- As a contractor, I want every line traced so I can trust it.
  - [x] Coverage meter shows N/N note lines accounted for
  - [x] Clicking a line highlights its source phrase
### AI polish (optional, free)
- WebLLM (Qwen2.5-0.5B, runs on the device's GPU) or a local Ollama model.
  - [x] Any rewrite whose numbers differ from the original is rejected
  - [x] If the AI fails or is unavailable, the full rule-based document stays
### Output
- Print/PDF, Copy, Download .txt; document is editable before export.

## States and Boundaries
- **First use** — empty paper with a hint. **Empty note** — "Say or type a few lines…". **AI loading** — progress in status. **AI error** — fallback message, nothing lost. **Persistence** — note, company, price in localStorage only.

## Product Decisions
- Deterministic first, AI second — the demo must always work and never invent scope.
- Questions instead of guesses — uncertainty is surfaced to the client.

## What We're Building
Everything in Core Journey steps 1–7.

## Deferred From the POC
Photos, multiple saved jobs, templates per trade, Spanish — each adds UI without proving the kernel.

## Possible Later Enhancements
Site-visit report and change-order letter modes; e-signature; PWA install for offline jobsite use.

## Non-Goals
No pricing engine, no legal contract language, no cloud storage, no paid APIs.

## Open Questions
None blocking. Real-device WebLLM speed on low-end laptops is unverified (fallback covers it).
