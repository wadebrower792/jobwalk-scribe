(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const SAMPLE = `Client is Dana Ruiz, 412 Maple St. Hall bathroom, about 5x8.
Demo the tub surround and vanity, haul it all off. Soft spot by the toilet, probably rot, gonna check subfloor.
Install new 60 inch tub and tile surround to ceiling. New 30 inch vanity w/ faucet.
Add GFCI outlet by sink and a new exhaust fan vented outside. Paint walls and ceiling.
Owner supplies the tile and vanity. Not sure if she wants a niche? Tile allowance $6 per sq ft.
Should take 8 working days.`;
  let lastDoc = null, lastAnalysis = null;
  const store = { get: k => { try { return localStorage.getItem('jws.' + k) || ''; } catch (e) { return ''; } }, set: (k, v) => { try { localStorage.setItem('jws.' + k, v); } catch (e) {} } };
  ['note', 'company', 'price'].forEach(k => { $(k).value = store.get(k); $(k).addEventListener('input', () => store.set(k, $(k).value)); });
  const status = (t) => { $('status').textContent = t; };

  // ---- Voice (browser speech recognition, free) ----
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  let rec = null, listening = false;
  if (!SR) { $('micLabel').textContent = 'Voice not supported here — type instead'; $('mic').disabled = true; }
  else {
    rec = new SR(); rec.continuous = true; rec.interimResults = false; rec.lang = 'en-US';
    rec.onresult = e => { for (let i = e.resultIndex; i < e.results.length; i++) if (e.results[i].isFinal) { const t = e.results[i][0].transcript.trim(); const n = $('note'); n.value = (n.value ? n.value.replace(/\s*$/, '') + '\n' : '') + t.charAt(0).toUpperCase() + t.slice(1) + '.'; store.set('note', n.value); } };
    rec.onend = () => { if (listening) try { rec.start(); } catch (e) {} };
    rec.onerror = e => { status('Mic: ' + e.error + '. You can still type.'); stopRec(); };
  }
  function startRec() { listening = true; try { rec.start(); } catch (e) {} $('mic').setAttribute('aria-pressed', 'true'); $('micLabel').textContent = 'Listening… tap to stop'; }
  function stopRec() { listening = false; try { rec && rec.stop(); } catch (e) {} $('mic').setAttribute('aria-pressed', 'false'); $('micLabel').textContent = 'Tap to talk'; }
  $('micLabel').textContent = SR ? 'Tap to talk' : $('micLabel').textContent;
  $('mic').onclick = () => listening ? stopRec() : startRec();
  $('sample').onclick = () => { $('note').value = SAMPLE; store.set('note', SAMPLE); $('srcView').hidden = true; };
  $('clear').onclick = () => { $('note').value = ''; store.set('note', ''); $('srcView').hidden = true; };

  // ---- Render ----
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  function li(it) { return `<li data-src="${it.idx ?? ''}" class="${it.ai ? 'ai' : ''}" title="${it.ai ? 'AI-polished. Original: ' + esc(it.original) : 'Click to see where this came from'}">${esc(it.text)}</li>`; }
  function render(doc) {
    const h = []; let prevH2 = '';
    doc.sections.forEach(s => {
      if (s.h === 'title') h.push(`<h1>${esc(s.text)}</h1>`);
      else if (s.h === 'meta') h.push('<table>' + s.rows.map(r => `<tr><td>${esc(r[0])}</td><td><b>${esc(r[1])}</b></td></tr>`).join('') + '</table>');
      else if (s.h === 'h2') { prevH2 = s.text; h.push(`<h2>${esc(s.text)}</h2>`); }
      else if (s.h === 'h3') h.push(`<h3>${esc(s.text)}</h3>`);
      else if (s.h === 'p') h.push(`<p>${esc(s.text)}</p>`);
      else if (s.h === 'ol') h.push(`<ol start="${s.start}">${s.items.map(li).join('')}</ol>`);
      else if (s.h === 'ul') h.push(`<ul class="${/Questions/.test(prevH2) ? 'qs' : /Conditions/.test(prevH2) ? 'flags' : ''}">${s.items.map(li).join('')}</ul>`);
      else if (s.h === 'sign') h.push('<div class="sign">' + s.rows.map(r => `<div>${esc(r)} — signature &amp; date</div>`).join('') + '</div>');
    });
    const d = $('doc'); d.className = 'paper'; d.innerHTML = h.join(''); d.contentEditable = 'true';
    d.querySelectorAll('li[data-src]').forEach(el => el.addEventListener('click', () => showSource(+el.dataset.src)));
  }
  function showSource(i) {
    if (!lastAnalysis || isNaN(i)) return;
    const v = $('srcView'); v.hidden = false;
    v.innerHTML = '<b>Where that line came from:</b><br>' + lastAnalysis.lines.map((l, k) => `<span class="${k === i ? 'hit' : ''}">${esc(l)}</span>`).join(' ');
    const hit = v.querySelector('.hit'); hit && hit.scrollIntoView({ block: 'nearest' });
  }
  function meter(a, doc, ai) {
    const c = JWS.coverage(a), m = $('meter'); m.hidden = false;
    m.innerHTML = `<span class="chip ok">${c.used}/${c.total} note lines accounted for</span><span class="chip">${doc.stats.scope} scope items</span><span class="chip">${doc.stats.excluded} exclusions</span><span class="chip q">${doc.stats.questions} questions for client</span>${doc.stats.flags ? `<span class="chip w">${doc.stats.flags} site conditions flagged</span>` : ''}${ai ? `<span class="chip">AI: ${ai.accepted} polished, ${ai.rejected} rejected by number check</span>` : ''}`;
  }
  // ---- Go ----
  $('go').onclick = async () => {
    const note = $('note').value.trim();
    if (!note) { status('Say or type a few lines about the job first.'); return; }
    if (listening) stopRec();
    const a = JWS.analyze(note); lastAnalysis = a;
    const opts = { company: $('company').value.trim() || 'Your Company', price: $('price').value.trim() };
    let doc = JWS.buildDoc(a, opts); render(doc); meter(a, doc); enable(true);
    status('Draft ready (rule-based, instant).');
    const mode = $('aiMode').value;
    if (mode === 'off') return;
    const items = [].concat(...Object.values(a.scope), a.general);
    status(mode === 'webllm' ? 'Loading free in-browser model (first time downloads ~400 MB, then it is cached)…' : 'Asking local Ollama…');
    $('go').disabled = true;
    try {
      const st = await JWSAI.polish(items, mode, { onProgress: t => status(t), onItem: s => status(`AI polishing… ${s.accepted + s.rejected}/${items.length}`) });
      doc = JWS.buildDoc(a, opts); render(doc); meter(a, doc, st);
      status(st.error ? `AI stopped (${st.error}). The rule-based draft is shown, nothing lost.` : `Done. ${st.accepted} lines polished by AI; ${st.rejected} kept as written because the AI changed a number.`);
    } catch (e) { status(`AI unavailable (${e.message}). Rule-based draft shown — it is complete on its own.`); }
    finally { $('go').disabled = false; }
  };
  function enable(on) { ['copy', 'dl', 'print'].forEach(k => $(k).disabled = !on); }
  const docText = () => $('doc').innerText;
  $('copy').onclick = async () => { try { await navigator.clipboard.writeText(docText()); status('Copied — paste into a text or email.'); } catch (e) { status('Copy blocked; use Download instead.'); } };
  $('dl').onclick = () => { const b = new Blob([docText()], { type: 'text/plain' }); const u = URL.createObjectURL(b); const x = document.createElement('a'); x.href = u; x.download = 'scope-of-work.txt'; x.click(); URL.revokeObjectURL(u); };
  $('print').onclick = () => window.print();
  window.__jws = { render: () => lastDoc };
})();
