#!/usr/bin/env node
'use strict';
// Rebuilds sitemap.xml from the HTML files that exist in the repo, so new pages are always listed.
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const ROOT = process.argv[2] || '.';
const SITE = 'https://apikeys.in';
const SKIP = new Set(['dashboard.html', 'admin.html', '404.html', 'workspace-embed.html']);
const files = [];
for (const f of fs.readdirSync(ROOT)) if (f.endsWith('.html') && !SKIP.has(f)) files.push(f);
if (fs.existsSync(path.join(ROOT, 'models'))) for (const f of fs.readdirSync(path.join(ROOT, 'models'))) if (f.endsWith('.html')) files.push('models/' + f);
const isStub = (f) => { try { const h = fs.readFileSync(path.join(ROOT, f), 'utf8').slice(0, 1500); return /name="robots"\s+content="[^"]*noindex/i.test(h) || /http-equiv="refresh"/i.test(h); } catch { return false; } };
for (let i = files.length - 1; i >= 0; i--) if (isStub(files[i])) files.splice(i, 1);
const today = new Date().toISOString().slice(0, 10);
const lastmod = (f) => { try { const d = execSync(`git log -1 --format=%cs -- "${f}"`, { cwd: ROOT, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); return d || today; } catch { return today; } };
const meta = (f) => {
  if (f === 'index.html') return ['', 'weekly', '1.0'];
  if (f === 'guides.html' || f === 'models.html') return [f, 'weekly', '0.8'];
  if (f === 'status.html') return [f, 'daily', '0.4'];
  if (f.startsWith('models/')) return [f, 'weekly', '0.7'];
  if (/-india\.html$|credit-card\.html$/.test(f)) return [f, 'monthly', '0.8'];
  return [f, 'monthly', '0.6'];
};
files.sort((a, b) => (a === 'index.html' ? -1 : b === 'index.html' ? 1 : a.localeCompare(b)));
const xml = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + files.map((f) => { const [p, c, pr] = meta(f); return `  <url>\n    <loc>${SITE}/${p}</loc>\n    <lastmod>${lastmod(f)}</lastmod>\n    <changefreq>${c}</changefreq>\n    <priority>${pr}</priority>\n  </url>`; }).join('\n') + '\n</urlset>\n';
fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), xml);
console.log(`sitemap.xml: ${files.length} pages`);
