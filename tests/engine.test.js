const assert = require('assert'); const E = require('../src/engine.js');
const note = `Client is Dana Ruiz, 412 Maple St. Hall bathroom, about 5x8.
Demo the tub surround and vanity, haul it all off. Soft spot by the toilet, probably rot, gonna check subfloor.
Install new 60 inch tub and tile surround to ceiling. New 30 inch vanity w/ faucet.
Add GFCI outlet by sink and a new exhaust fan vented outside. Paint walls and ceiling.
Owner supplies the tile and vanity. Not sure if she wants a niche? Tile allowance $6 per sq ft.
Should take 8 working days.`;
let pass = 0; const t = (n, f) => { f(); pass++; console.log('ok -', n); };
const a = E.analyze(note);
t('meta client/address/area', () => { assert.equal(a.meta.client, 'Dana Ruiz'); assert.match(a.meta.address, /412 Maple St/); assert.equal(a.meta.area, 'bathroom'); });
t('demo trade detected', () => assert.ok(a.scope['Demolition & Haul-Off']));
t('electrical detected', () => assert.ok(a.scope['Electrical']));
t('exclusion detected', () => assert.ok(a.exclusions.some(x => /tile and vanity/.test(x.source))));
t('question detected', () => assert.ok(a.questions.some(q => /niche/.test(q.text) && q.text.endsWith('?'))));
t('allowance kept with $', () => assert.ok(a.allowances.some(x => /\$6/.test(x.text))));
t('rot flagged? (soft spot -> question since "check")', () => assert.ok(a.questions.some(q => /subfloor|rot/i.test(q.text)) || a.flags.length));
t('no line dropped', () => { const c = E.coverage(a); assert.deepEqual(c.missing, []); });
const d = E.buildDoc(a, { company: 'Brower Builds', date: 'Oct 21, 2026', price: '$7,850' });
t('doc has sections', () => { const h = d.sections.filter(s => s.h === 'h2').map(s => s.text); ['Scope of Work', 'Not Included', 'Price & Schedule'].forEach(x => assert.ok(h.includes(x), x)); });
const txt = E.toPlainText(d);
t('plain text has client + price + duration', () => { assert.match(txt, /Dana Ruiz/); assert.match(txt, /\$7,850/); assert.match(txt, /8 working days/); });
t('every number from note survives', () => { E.numbers(note).forEach(n => assert.ok(txt.includes(n), 'missing ' + n)); });
t('tidy cleans slang', () => assert.equal(E.tidy('gonna demo the deck w/ um the rails'), 'Will demo the deck with the rails.'));
t('safeRewrite accepts', () => assert.ok(E.safeRewrite('Install 2 outlets.', 'Install two new outlets (2 total).').ok));
t('safeRewrite rejects changed number', () => assert.equal(E.safeRewrite('Install 2 outlets.', 'Install 3 outlets.').ok, false));
t('safeRewrite rejects empty', () => assert.equal(E.safeRewrite('x 1', '').ok, false));
t('empty note safe', () => { const z = E.buildDoc(E.analyze(''), {}); assert.ok(z.sections.length > 3); });
console.log(`\n${pass}/16 passed`);
