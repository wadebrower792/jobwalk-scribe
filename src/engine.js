/* JobWalk Scribe engine: deterministic note -> structured scope. No network. MIT. */
(function (root) {
  'use strict';
  const TRADES = [
    ['Demolition & Haul-Off', /\b(demo|demolish|tear (out|off)|rip out|remove|haul|dumpster|gut)\b/i],
    ['Framing & Carpentry', /\b(fram\w*|stud|joist|header|beam|subfloor|sister|rafter|blocking|trim|baseboard|casing|crown|door|stair)\w*/i],
    ['Roofing', /\b(roof\w*|shingle|flashing|drip edge|ice and water|underlayment)\b/i],
    ['Windows & Exterior', /\b(window|siding|soffit|fascia|gutter|deck|railing|exterior)\w*/i],
    ['Plumbing', /\b(plumb\w*|toilet|faucet|sink|drain|shower valve|supply line|water heater|p-?trap|vanity)\b/i],
    ['Electrical', /\b(electric\w*|outlet|gfci|receptacle|switch|circuit|panel|breaker|light|fixture|fan|wiring)\w*/i],
    ['HVAC', /\b(hvac|duct|vent fan|exhaust fan|furnace|register|mini ?split)\b/i],
    ['Insulation & Drywall', /\b(insulat\w*|drywall|sheetrock|mud|tape|texture|patch|cement board|durock)\b/i],
    ['Tile & Flooring', /\b(tile|floor\w*|lvp|vinyl|carpet|hardwood|grout|backsplash|underlayment)\b/i],
    ['Paint & Finish', /\b(paint\w*|prime\w*|stain|caulk|finish)\b/i],
    ['Cabinets & Counters', /\b(cabinet|counter\w*|countertop|quartz|granite|laminate top)\b/i],
    ['Water / Rot Repair', /\b(rot\w*|water damage|leak\w*|mold|soft spot|moisture)\b/i],
  ];
  const EXCL = /\b(not includ\w*|exclud\w*|by owner|owner (to )?(supplies|supply|provides|buys|picks)|client (supplies|provides|buys)|n\.?i\.?c\.?|not in (this|our) scope|others to)\b/i;
  const QUESTION = /(\?|\b(tbd|not sure|maybe|check (if|whether|with)|ask (her|him|them|client|owner)|confirm|unknown|depends|might)\b)/i;
  const ALLOW = /\ballowance\b|\$\s?\d[\d,]*(\.\d+)?/i;
  const META_LINE = /^(client|customer|homeowner|owner is|address|should take|est\w*\.? (time|duration)|\d+\s*(working )?(days|weeks))|\b(should take|will take)\b \d+/i;
  const SAFETY = /\b(rot|rotted|soft spot|water damage|probably|asbestos|lead paint|knob and tube|aluminum wiring|mold|structural|load.?bearing|permit)\b/i;

  function splitNote(text) {
    return String(text || '')
      .replace(/\r/g, '')
      .split(/\n+|(?<=[.;!?])\s+|\s+(?:then|also|and then|plus)\s+/i)
      .map(s => s.replace(/^[\s\-*•\d.)]+/, '').trim())
      .filter(s => s.length > 2);
  }
  function numbers(s) { return (String(s).match(/\d+(?:[.,/]\d+)?/g) || []); }
  function cap(s) { s = s.trim().replace(/\s+/g, ' '); return s.charAt(0).toUpperCase() + s.slice(1); }
  function tidy(s) {
    let t = s
      .replace(/\b(gonna|going to)\b/gi, 'will')
      .replace(/\b(wanna|want to)\b/gi, 'wants to')
      .replace(/\bw\/o\b/gi, 'without').replace(/\bw\//gi, 'with ')
      .replace(/\bapprox\.?\b/gi, 'approximately')
      .replace(/\b(sq ?ft|sqft|sf)\b/gi, 'sq ft').replace(/\blf\b/gi, 'linear ft')
      .replace(/\b(uh|um|like,|you know,?|basically|kinda|sorta)\s*/gi, '')
      .replace(/\b(\d+)\s*x\s*(\d+)\b/gi, '$1 x $2')
      .replace(/\s+([,.])/g, '$1').replace(/[.;!]+$/, '');
    return cap(t) + '.';
  }
  function meta(text) {
    const m = {};
    const c = text.match(/\b(?:[Cc]lient|[Cc]ustomer|[Hh]omeowner|[Oo]wner)(?: is|:)?\s+([A-Z][a-z]+(?:\s[A-Z][a-z]+)?)/);
    if (c) m.client = c[1];
    const a = text.match(/\b(\d{2,6}\s+[A-Z][\w.]*(?:\s[A-Z][\w.]*){0,3}\s(?:St|Street|Ave|Avenue|Rd|Road|Dr|Drive|Ln|Lane|Ct|Court|Blvd|Way|Pl|Place|Trail|Hwy)\b\.?)/);
    if (a) m.address = a[1];
    const r = text.match(/\b(kitchen|bathroom|bath|basement|deck|porch|roof|bedroom|garage|laundry|attic|living room)\b/i);
    if (r) m.area = r[1].toLowerCase();
    const w = text.match(/\b(\d+)\s*(?:-|to)?\s*(\d+)?\s*(working days|days|weeks)\b/i);
    if (w) m.duration = w[0];
    return m;
  }
  function analyze(text) {
    const lines = splitNote(text);
    const metaLines = [], scope = {}, exclusions = [], questions = [], allowances = [], flags = [], general = [];
    lines.forEach((raw, i) => {
      const item = { text: tidy(raw), source: raw, idx: i, nums: numbers(raw) };
      if (EXCL.test(raw)) { exclusions.push(item); return; }
      if (SAFETY.test(raw)) flags.push(item);
      if (QUESTION.test(raw)) { questions.push(Object.assign({}, item, { text: toQuestion(raw) })); return; }
      if (/\ballowance\b/i.test(raw)) { allowances.push(item); return; }
      if (META_LINE.test(raw) && !bestTrade(raw)) { metaLines.push(item); return; }
      const t = bestTrade(raw);
      if (t) (scope[t[0]] = scope[t[0]] || []).push(item);
      else general.push(item);
    });
    return { meta: meta(text), lines, metaLines, scope, exclusions, questions, allowances, flags, general };
  }
  function bestTrade(raw) {
    let best = null, score = 0;
    TRADES.forEach(tr => { const g = new RegExp(tr[1].source, 'gi'); const k = (raw.match(g) || []).length; if (k > score) { score = k; best = tr; } });
    return best;
  }
  function toQuestion(raw) {
    let q = raw.replace(/\b(not sure|maybe|tbd|check (if|whether|with)|ask (her|him|them|client|owner)( about| if| whether)?|confirm( if| whether)?|might)\b/gi, '').replace(/\?+/g, '').replace(/\s+/g, ' ').trim();
    return 'Please confirm: ' + cap(q.replace(/^[,\s]+/, '').replace(/^(if|whether)\s+/i, '').replace(/^(she|he|they|the client|client|owner|homeowner)\s+wants?\b/i, 'do you want').replace(/[.;]+$/, '')) + '?';
  }
  const ROLES = { gc: 'General Contractor', remodel: 'Remodeling Contractor', handy: 'Handyman Service' };
  function buildDoc(a, opts) {
    opts = opts || {};
    const m = Object.assign({}, a.meta, opts.meta || {});
    const company = opts.company || 'Your Company';
    const client = m.client || 'Client';
    const date = opts.date || new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const area = m.area ? m.area.replace(/^\w/, c => c.toUpperCase()) + ' ' : '';
    const s = [];
    s.push({ h: 'title', text: `${area}Scope of Work & Proposal` });
    s.push({ h: 'meta', rows: [['Prepared for', client], ['Project address', m.address || '—'], ['Prepared by', company], ['Date', date]] });
    s.push({ h: 'p', text: `Dear ${client === 'Client' ? 'Client' : client.split(' ')[0]},` });
    s.push({ h: 'p', text: `Thank you for walking the ${m.area || 'project'} with us. Below is the work we discussed, written out so we both agree on exactly what is and is not included before any work begins.` });
    let n = 0;
    const tradeNames = Object.keys(a.scope);
    if (a.general.length) { s.push({ h: 'h2', text: 'Project Overview' }); s.push({ h: 'ul', items: a.general }); }
    if (tradeNames.length) {
      s.push({ h: 'h2', text: 'Scope of Work' });
      tradeNames.forEach(t => { s.push({ h: 'h3', text: t }); s.push({ h: 'ol', start: n + 1, items: a.scope[t] }); n += a.scope[t].length; });
    }
    if (a.allowances.length) { s.push({ h: 'h2', text: 'Allowances' }); s.push({ h: 'ul', items: a.allowances }); }
    s.push({ h: 'h2', text: 'Not Included' });
    s.push({ h: 'ul', items: a.exclusions.length ? a.exclusions : [{ text: 'Anything not listed under Scope of Work.', source: null }] });
    if (a.flags.length) {
      s.push({ h: 'h2', text: 'Conditions That May Change This Scope' });
      s.push({ h: 'ul', items: a.flags.map(f => ({ text: `Noted on site: ${f.text.replace(/\.$/, '')}. If conditions behind walls, floors or ceilings differ, or a permit or specialist is required, we will stop, show you, and agree on a written change order before continuing.`, source: f.source })) });
    }
    if (a.questions.length) { s.push({ h: 'h2', text: 'Questions We Need Answered Before Pricing Is Final' }); s.push({ h: 'ul', items: a.questions }); }
    s.push({ h: 'h2', text: 'Price & Schedule' });
    s.push({ h: 'p', text: opts.price ? `Proposed price: ${opts.price}. ` + (m.duration ? `Estimated duration: ${m.duration}.` : '') : `Price: to be confirmed once the questions above are answered.${m.duration ? ' Estimated duration: ' + m.duration + '.' : ''}` });
    s.push({ h: 'p', text: 'Any change to this scope will be agreed in writing before the work is done.' });
    s.push({ h: 'sign', rows: [client, company] });
    return { sections: s, itemCount: n, stats: { scope: n, excluded: a.exclusions.length, questions: a.questions.length, flags: a.flags.length, lines: a.lines.length } };
  }
  function coverage(a) {
    const used = new Set();
    [].concat(...Object.values(a.scope), a.exclusions, a.questions, a.allowances, a.general, a.metaLines).forEach(i => used.add(i.idx));
    return { used: used.size, total: a.lines.length, missing: a.lines.filter((_, i) => !used.has(i)) };
  }
  // AI polish guard: a rewrite is accepted only if it keeps every number and adds none.
  function safeRewrite(original, rewrite) {
    if (!rewrite || typeof rewrite !== 'string') return { ok: false, text: original, reason: 'empty' };
    const r = rewrite.trim().replace(/^["']|["']$/g, '');
    if (r.length > original.length * 2.5 + 40) return { ok: false, text: original, reason: 'too long' };
    const a = numbers(original).sort().join('|'), b = numbers(r).sort().join('|');
    if (a !== b) return { ok: false, text: original, reason: 'numbers changed' };
    return { ok: true, text: r };
  }
  function toPlainText(doc) {
    const out = [];
    doc.sections.forEach(s => {
      if (s.h === 'title') out.push(s.text.toUpperCase(), '');
      else if (s.h === 'meta') s.rows.forEach(r => out.push(`${r[0]}: ${r[1]}`)), out.push('');
      else if (s.h === 'h2') out.push('', s.text.toUpperCase());
      else if (s.h === 'h3') out.push(s.text);
      else if (s.h === 'p') out.push(s.text);
      else if (s.h === 'ol') s.items.forEach((it, i) => out.push(`  ${s.start + i}. ${it.text}`));
      else if (s.h === 'ul') s.items.forEach(it => out.push(`  - ${it.text}`));
      else if (s.h === 'sign') { out.push(''); s.rows.forEach(r => out.push(`${r}: ______________________  Date: ________`)); }
    });
    return out.join('\n');
  }
  const api = { splitNote, analyze, buildDoc, coverage, safeRewrite, toPlainText, tidy, numbers, ROLES };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.JWS = api;
})(this);
