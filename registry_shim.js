'use strict';
// Lets the page generators run without the backend code: it rebuilds the
// "registry" they expect from scripts/catalog.json (downloaded from the live gateway).
const fs = require('fs');
const path = require('path');
const cat = JSON.parse(fs.readFileSync(path.join(__dirname, 'catalog.json'), 'utf8'));
const isCurated = (m) => m.curated === true || (m.curated === undefined && !(m.tags || []).includes('community') && !!m.baseInr);
const MODELS = {};
for (const m of cat.models) {
  if (!isCurated(m) || !m.inr) continue;
  MODELS[m.id] = { ...m, tags: m.tags || m.capabilities || [], blurb: m.blurb || m.description || '', author: m.author || (m.openWeight ? m.id.split('/')[0] : undefined) };
}
const PROVIDERS = {};
for (const p of cat.providers) PROVIDERS[p.id] = { label: p.label, glyph: p.glyph };
const getModel = (id) => MODELS[id] || null;
module.exports = { MODELS, PROVIDERS, getModel };
