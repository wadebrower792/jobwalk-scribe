/* Optional AI polish. Free only: WebLLM (runs in your browser on WebGPU) or a local Ollama.
   Every rewrite passes JWS.safeRewrite; anything that changes a number is thrown out. */
(function (root) {
  'use strict';
  const SYS = 'You rewrite one line from a contractor\'s job-walk note into one clear, professional sentence for a client scope of work. Keep every number, size and quantity exactly. Do not add work, materials, prices or promises. Reply with the sentence only.';
  let engine = null;
  const WEBLLM_MODEL = 'Qwen2.5-0.5B-Instruct-q4f16_1-MLC';
  async function loadWebLLM(onProgress) {
    if (engine) return engine;
    if (!navigator.gpu) throw new Error('This browser has no WebGPU, so the in-browser AI cannot run here.');
    const webllm = await import('https://esm.run/@mlc-ai/web-llm');
    engine = await webllm.CreateMLCEngine(WEBLLM_MODEL, { initProgressCallback: p => onProgress && onProgress(p.text || '') });
    return engine;
  }
  async function askWebLLM(line) {
    const r = await engine.chat.completions.create({ messages: [{ role: 'system', content: SYS }, { role: 'user', content: line }], temperature: 0.2, max_tokens: 120 });
    return r.choices[0].message.content;
  }
  async function askOllama(line, model) {
    const r = await fetch('http://localhost:11434/api/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: model || 'llama3.2:1b', system: SYS, prompt: line, stream: false, options: { temperature: 0.2 } }) });
    if (!r.ok) throw new Error('Ollama answered ' + r.status);
    return (await r.json()).response;
  }
  async function polish(items, mode, opts) {
    opts = opts || {};
    const stats = { accepted: 0, rejected: 0, mode };
    if (mode === 'webllm') await loadWebLLM(opts.onProgress);
    for (const it of items) {
      try {
        const out = mode === 'webllm' ? await askWebLLM(it.text) : await askOllama(it.text, opts.model);
        const g = root.JWS.safeRewrite(it.text, out);
        if (g.ok) { it.original = it.text; it.text = g.text; it.ai = true; stats.accepted++; } else { it.aiRejected = g.reason; stats.rejected++; }
      } catch (e) { stats.error = e.message; break; }
      opts.onItem && opts.onItem(stats);
    }
    return stats;
  }
  root.JWSAI = { polish, WEBLLM_MODEL };
})(this);
