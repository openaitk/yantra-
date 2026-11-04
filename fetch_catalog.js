#!/usr/bin/env node
'use strict';
// Downloads the live catalogue from the gateway and saves scripts/catalog.json.
// Exits with an error (so nothing is changed) if the data looks incomplete.
const fs = require('fs');
const path = require('path');
const API = process.env.API_BASE || 'https://api.aitklabs.in';

async function get(p) {
  for (let i = 0; i < 3; i++) {
    try {
      const r = await fetch(API + p, { headers: { 'user-agent': 'yantra-site-bot' } });
      if (r.ok) return await r.json();
      console.error(`${p} -> HTTP ${r.status}`);
    } catch (e) { console.error(`${p} -> ${e.message}`); }
    await new Promise((r) => setTimeout(r, 3000 * (i + 1)));
  }
  return null;
}

(async () => {
  const app = await get('/app/models');
  if (!app || !Array.isArray(app.models) || app.models.length < 30) { console.error('Catalogue missing or too small, refusing to continue.'); process.exit(1); }
  const images = await get('/v1/images/models');
  const curated = app.models.filter((m) => m.curated === true || (m.curated === undefined && !(m.tags || []).includes('community') && m.baseInr));
  if (curated.length < 20) { console.error(`Only ${curated.length} curated models found, refusing to continue.`); process.exit(1); }
  fs.writeFileSync(path.join(__dirname, 'catalog.json'), JSON.stringify({ fetchedAt: new Date().toISOString(), providers: app.providers || [], models: app.models, images: (images && images.data) || [] }));
  console.log(`catalogue: ${app.models.length} models (${curated.length} curated), ${((images && images.data) || []).length} image models`);
})();
