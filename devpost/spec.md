---
doc: spec
status: approved
---
# JobWalk Scribe — Technical Spec

## How This Works, In Plain Language
It is a web page with three small scripts. **engine.js** is the "estimator's clerk": it splits your note into phrases, decides which trade each belongs to, spots exclusions and question marks, and lays out the letter — with a pointer from every line back to the phrase it came from. **ai.js** is an optional "proofreader" that rewords lines using a free AI model that runs on your own machine; a number check rejects any rewrite that changes a size, count or dollar amount. **app.js** wires the buttons, microphone and display. No server, no account.

## The Core Journey Through the System
Speak → Web Speech API transcribes → text lands in the note box (saved to localStorage) → "Write it up" → `JWS.analyze()` returns phrases sorted into scope/exclusions/questions/allowances/flags, each with its phrase index → `JWS.buildDoc()` makes sections → `render()` draws the paper; each `<li data-src=index>` → click → `showSource(index)` highlights the phrase. With AI on: `JWSAI.polish()` sends each scope line to WebLLM/Ollama → `JWS.safeRewrite()` accepts or rejects → re-render with ✦ on polished lines. PRD ref: `prd.md > The Core Journey`.

## Stack
- Plain HTML/CSS/JavaScript, no build step — anyone can open it; judges can run it in seconds.
- Web Speech API (Chrome/Edge/Safari) — free voice capture. https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API
- WebLLM `@mlc-ai/web-llm`, model `Qwen2.5-0.5B-Instruct-q4f16_1-MLC`, loaded on demand from esm.run — free, on-device, needs WebGPU. https://webllm.mlc.ai/
- Ollama REST `/api/generate` — free local alternative. https://github.com/ollama/ollama/blob/main/docs/api.md
- Tests: Node 18+ (unit), Python Playwright + Chrome (end-to-end).

## Where It Runs and How Someone Tries It
Browser. `python3 -m http.server 8000` (or `npm start`) in the repo, open http://localhost:8000. Demo: Load a sample walk → Write it up → click a line. Deployment optional (any static host, e.g. GitHub Pages).

## Look and Feel
Charcoal `#1d1f21`, hard-hat yellow `#f2a900`, paper `#fffdf8`; system sans UI, Georgia serif document; plain, friendly copy.

## Components
### Engine (`src/engine.js`) — PRD ref: `prd.md > Structuring (deterministic, always on)`
`analyze`, `buildDoc`, `coverage`, `safeRewrite`, `toPlainText`. Pure functions, UMD so Node tests use it.
### AI (`src/ai.js`) — PRD ref: `prd.md > AI polish (optional, free)`
`polish(items, mode)`; system prompt forbids adding work/prices.
### App (`src/app.js`) — PRD ref: `prd.md > Capture`, `prd.md > Output`
Voice, render, source tracing, meter, export, autosave.

## Data Model
`analysis = {meta:{client,address,area,duration}, lines:[string], scope:{trade:[item]}, exclusions, questions, allowances, flags, general, metaLines}`; `item = {text, source, idx, nums, ai?, original?}`. Only `note`, `company`, `price` persist (localStorage).

## File Structure
```
jobwalk-scribe/
├── index.html          # single screen
├── src/engine.js       # deterministic structuring + number guard
├── src/ai.js           # optional WebLLM / Ollama polish
├── src/app.js          # UI, voice, tracing, export
├── src/styles.css      # screen + print styles
├── tests/engine.test.js# 16 unit tests (node)
├── tests/e2e.py        # 18 browser checks (Playwright), --video records demo
├── docs/               # screenshots
├── devpost/            # scope.md, prd.md, spec.md, checklist.md
└── .agents/, agent/    # Devpost Learn Skill Pack
```

## External Services and Dependencies
- WebLLM CDN (esm.run + model weights from Hugging Face): free, ~400 MB first download, cached; no key.
- Ollama on localhost:11434: free; start with `OLLAMA_ORIGINS=* ollama serve` so the browser may call it.

## Important Failure Modes
- **No WebGPU / slow device** → status says so; rule-based document remains.
- **Ollama not running or CORS blocked** → "AI stopped (…)", document remains.
- **Speech API missing (Firefox)** → mic disabled with a type-instead label.

## What Was Simplified and Why
- **Keyword trade scoring** instead of an ML classifier — predictable, testable, instant.
- **Line-by-line AI polish** instead of whole-letter generation — keeps traceability and lets the number guard work.

## Decisions and Open Issues
- Chosen: deterministic core + optional AI (brief: "solid deterministic fallback so the demo always works").
- Learner uncertainty: whether a tiny in-browser model is good enough — resolved by making AI optional and guarded.
- Open: real WebLLM run on target hardware not yet recorded (box has no GPU); e2e tests mock Ollama.
