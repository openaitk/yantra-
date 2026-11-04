#!/usr/bin/env node
'use strict';
// Compares today's catalogue with scripts/known_models.json and writes report.md when something changed.
const fs = require('fs');
const path = require('path');
const cat = JSON.parse(fs.readFileSync(path.join(__dirname, 'catalog.json'), 'utf8'));
const knownPath = path.join(__dirname, 'known_models.json');
const known = fs.existsSync(knownPath) ? JSON.parse(fs.readFileSync(knownPath, 'utf8')) : null;
const now = {};
for (const m of cat.models) now[m.id] = { l: m.label, p: m.provider, i: m.inr && m.inr.in, o: m.inr && m.inr.out, c: !(m.tags || []).includes('community') };
fs.writeFileSync(knownPath, JSON.stringify(now));
if (!known) { console.log('first run: baseline saved, no report'); process.exit(0); }
const added = Object.keys(now).filter((id) => !known[id]);
const gone = Object.keys(known).filter((id) => !now[id]);
const changed = Object.keys(now).filter((id) => known[id] && known[id].i != null && now[id].i != null && (Math.abs(now[id].i - known[id].i) / (known[id].i || 1) >= 0.1 || Math.abs(now[id].o - known[id].o) / (known[id].o || 1) >= 0.1));
if (!added.length && !changed.length && gone.length < 5) { console.log('no notable model changes'); process.exit(0); }
const row = (id) => `- \`${id}\` ${now[id].l ? '(' + now[id].l + ')' : ''} ₹${now[id].i} in / ₹${now[id].o} out`;
let md = `Catalogue check on ${new Date().toISOString().slice(0, 10)}: ${Object.keys(now).length} models.\n\n`;
if (added.length) md += `## New models (${added.length})\n${added.slice(0, 60).map(row).join('\n')}${added.length > 60 ? `\n…and ${added.length - 60} more` : ''}\n\n`;
if (changed.length) md += `## Price changes of 10% or more (${changed.length})\n${changed.slice(0, 40).map((id) => `- \`${id}\`: in ₹${known[id].i} → ₹${now[id].i}, out ₹${known[id].o} → ₹${now[id].o}`).join('\n')}\n\n`;
if (gone.length) md += `## No longer listed (${gone.length})\nUsually a provider outage or a hidden model, not a removal.\n${gone.slice(0, 40).map((id) => '- `' + id + '`').join('\n')}\n\n`;
md += 'New curated models get their own page automatically. Community models only appear on the Models page.\n';
fs.writeFileSync(path.join(__dirname, '..', 'report.md'), md);
console.log(`report.md written: ${added.length} new, ${changed.length} price changes, ${gone.length} not listed`);
