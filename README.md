# JobWalk Scribe ▲

**Talk the job. Hand over the scope.** A free, in-browser tool for small contractors: dictate or type your rough job-walk notes and get a client-ready **Scope of Work & Proposal** — where every line links back to what you actually said.

![screenshot](docs/screenshot.png)

## Why
Vague scopes cause most contractor–homeowner disputes, and nobody wants to write proposals at 10 PM. JobWalk Scribe structures the note into trade sections, exclusions, allowances, hidden-condition clauses and client questions, without inventing work or numbers.

## Run it (no install, no keys, no cost)
```bash
git clone <this repo> && cd jobwalk-scribe
python3 -m http.server 8000      # or: npm start
```
Open http://localhost:8000 in Chrome or Edge → **Load a sample walk** → **Write it up →** → click any line in the document.
Voice: tap **Tap to talk** (Chrome/Edge/Safari; allow the mic).

### Optional free AI polish
- **Browser AI (WebLLM):** pick it in *AI polish*. Needs a WebGPU browser (recent Chrome/Edge). First run downloads a ~400 MB model, cached after that. Runs entirely on your device.
- **Local Ollama:** install from ollama.com, then `ollama pull llama3.2:1b` and `OLLAMA_ORIGINS=* ollama serve`.
Every AI rewrite is checked: if it changes, adds or drops any number, it is rejected and your original wording stays. If AI is unavailable, the rule-based document is already complete.

## Tests
```bash
node tests/engine.test.js                 # 16 unit tests
pip install playwright && python3 tests/e2e.py   # 18 browser checks (uses installed Chrome)
```

## How it was built
Planned with the Devpost Learn Skill Pack (`npx skills add challengepost/learn-ai-basics --all -y`); planning docs in `devpost/` (scope.md, prd.md, spec.md, checklist.md). Built with an AI coding assistant. No pre-existing project code was used. Third-party, used only at runtime and only if you choose AI polish: WebLLM (Apache-2.0) and the Qwen2.5-0.5B model (Apache-2.0), or Ollama (MIT).

Not legal advice; review documents before sending. MIT License.
