#!/usr/bin/env node
'use strict';

/**
 * Generate one indexable page per model.
 *
 *     MARGIN_PCT=15 node gen_model_pages.js
 *
 * WHY
 *   All 80 models currently live on a single /models.html, so the site has
 *   7 indexable URLs. Someone searching "claude opus 5 price in rupees" or
 *   "deepseek v4 pro india pricing" — real, high-intent, low-competition
 *   queries — has nothing to land on. A page per model is how OpenRouter
 *   ranks for exactly these terms.
 *
 * THE RISK, AND WHAT'S DONE ABOUT IT
 *   78 near-identical pages is textbook thin content, and Google filters it.
 *   Every page here therefore carries data that is genuinely different from
 *   every other page:
 *     · real INR price, in and out, at the live margin
 *     · real context window
 *     · a worked "what does ₹10 actually buy" figure
 *     · a runnable code sample with that exact model id
 *     · links to a cheaper and a more capable alternative, chosen from the
 *       real registry rather than templated
 *     · Product + Offer schema with the real price
 *
 *   Pages are still template-driven — the honest description is "structured
 *   data pages", not "articles". If Google ends up filtering them, the fix is
 *   fewer pages with more written content, not more pages.
 */

const fs = require('fs');
const path = require('path');

const SITE = 'https://apikeys.in';
const SITE_DIR = process.env.SITE_DIR || path.join(__dirname, 'frontend');
const OUT = path.join(SITE_DIR, 'models');
const { MODELS, getModel, PROVIDERS } = require(process.env.REGISTRY_MODULE || './backend/src/router/registry');

const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// "anthropic/claude-opus-5" -> "anthropic-claude-opus-5" (flat, no nested dirs
// so GitHub Pages serves it without extra config)
const slug = (id) => id.replace(/[^a-z0-9]+/gi, '-').toLowerCase();

const fmtCtx = (n) => n >= 1e6 ? (n / 1e6) + 'M' : Math.round(n / 1000) + 'K';
const inr = (n) => '₹' + Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 });

/** Roughly how many words of output ₹10 buys. ~0.75 words per token. */
function wordsPerTenRupees(outPricePerM) {
  if (!outPricePerM) return null;
  return Math.round((10 / (outPricePerM / 1e6)) * 0.75);
}

function pick(all, id, m) {
  // A cheaper and a stronger alternative, chosen from real registry data so the
  // links differ per page rather than pointing everywhere at the same two models.
  const cost = (x) => x.inr.in + x.inr.out;
  const mine = cost(m);
  const others = all.filter(([i]) => i !== id)
    .map(([i, x]) => [i, x, cost(x)])
    .sort((a, b) => a[2] - b[2]);
  const cheaper = others.filter(([, , c]) => c < mine).pop();      // closest below
  const stronger = others.filter(([, , c]) => c > mine)[0];        // closest above
  return { cheaper, stronger };
}

/**
 * Same model, two hosts (e.g. GLM-4.5 Air via Z.AI direct and via Fireworks)
 * would otherwise produce two pages competing for one query — worse than one
 * page, since ranking signals split. The duplicate points its canonical at the
 * primary so Google consolidates onto it.
 */
function canonicalTwinOf(id, m, all) {
  const twin = all.find(([oid, om]) =>
    oid !== id && om.label === m.label && om.provider !== m.provider);
  if (!twin) return null;
  // Prefer the direct provider over a reseller host: fewer hops, and it's the
  // route we'd rather people land on.
  const RESOLD = new Set(['fireworks', 'novita', 'openrouter', 'siliconflow']);
  const iAmResold = RESOLD.has(m.provider);
  const twinResold = RESOLD.has(twin[1].provider);
  if (iAmResold && !twinResold) return twin[0];
  return null;
}

function page(id, m, all) {
  const prov = PROVIDERS[m.author || m.provider] || { label: m.author || m.provider };
  const s = slug(id);
  const twin = canonicalTwinOf(id, m, all);
  const url = `${SITE}/models/${s}.html`;
  const canonical = twin ? `${SITE}/models/${slug(twin)}.html` : url;
  const title = `${m.label} API Price in India (₹) — Pay with UPI | Yantra AI`;
  const words = wordsPerTenRupees(m.inr.out);
  const { cheaper, stronger } = pick(all, id, m);

  const desc = `${m.label} costs ${inr(m.inr.in)} per 1M input tokens and `
    + `${inr(m.inr.out)} per 1M output tokens through Yantra AI. `
    + `${fmtCtx(m.ctx)} context. Pay in Indian rupees with UPI — no international `
    + `credit card needed, ₹10 minimum top-up.`;

  const product = {
    '@context': 'https://schema.org', '@type': 'Product',
    name: m.label,
    description: m.blurb || `${m.label}, available through the Yantra AI gateway.`,
    brand: { '@type': 'Brand', name: prov.label },
    offers: {
      '@type': 'Offer', url: canonical,
      priceCurrency: 'INR', price: String(m.inr.out),
      priceSpecification: {
        '@type': 'UnitPriceSpecification',
        price: String(m.inr.out), priceCurrency: 'INR',
        unitText: 'per 1 million output tokens',
      },
      availability: 'https://schema.org/InStock',
      seller: { '@type': 'Organization', name: 'Yantra AI', url: SITE + '/' },
    },
  };
  const breadcrumb = {
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: SITE + '/' },
      { '@type': 'ListItem', position: 2, name: 'Models', item: SITE + '/models.html' },
      { '@type': 'ListItem', position: 3, name: m.label, item: url },
    ],
  };

  const altLink = (entry, kind) => {
    if (!entry) return '';
    const [aid, am] = entry;
    return `<a class="alt" href="${slug(aid)}.html">
        <span class="alt-k">${kind}</span>
        <span class="alt-n">${esc(am.label)}</span>
        <span class="alt-p">${inr(am.inr.in)} in · ${inr(am.inr.out)} out</span>
      </a>`;
  };

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${canonical}">
<meta property="og:type" content="product">
<meta property="og:title" content="${esc(m.label)} — ${inr(m.inr.in)}/${inr(m.inr.out)} per 1M tokens">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${SITE}/assets/og-image.png">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" type="image/png" sizes="32x32" href="../assets/favicon-32.png">
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@700;800&family=Instrument+Sans:wght@400;600&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet">
<script type="application/ld+json">
${JSON.stringify(product, null, 2)}
</script>
<script type="application/ld+json">
${JSON.stringify(breadcrumb, null, 2)}
</script>
<style>
:root{--bg:#eaeff7;--card:#fff;--border:rgba(15,40,90,.14);--cyan:#0069b8;
 --text:#0f1e33;--text2:#4a5a75;--text3:#78889f;--green:#009453;--saffron:#d16800;
 --fd:'Bricolage Grotesque',sans-serif;--fm:'JetBrains Mono',monospace;--fb:'Instrument Sans',sans-serif;}
*{box-sizing:border-box;margin:0;padding:0}
body{background:var(--bg);color:var(--text);font-family:var(--fb);line-height:1.65}
.wrap{max-width:780px;margin:0 auto;padding:0 22px}
.top{background:var(--card);border-bottom:1px solid var(--border);padding:14px 0}
.brand{display:inline-flex;align-items:center;gap:10px;text-decoration:none}
.mark{width:34px;height:34px;border-radius:10px;background:linear-gradient(135deg,#00d4ff,#9d4edd);
 display:flex;align-items:center;justify-content:center;color:#fff;font-weight:800;font-family:var(--fd)}
.bn{font-family:var(--fd);font-weight:800;font-size:17px;color:var(--text)}
.bn span{color:var(--cyan)}
main{padding:30px 0 60px}
.crumb{font-size:13px;color:var(--text3);margin-bottom:16px}
.crumb a{color:var(--text2);text-decoration:none}.crumb a:hover{color:var(--cyan)}
h1{font-family:var(--fd);font-weight:800;font-size:clamp(26px,5vw,36px);letter-spacing:-1.2px;margin-bottom:8px}
.by{color:var(--text2);font-size:14.5px;margin-bottom:6px}
.mid{font-family:var(--fm);font-size:13px;color:var(--cyan);margin-bottom:20px;word-break:break-all}
.lead{font-size:16px;color:var(--text2);margin-bottom:24px}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin-bottom:26px}
.kpi{background:var(--card);border:1px solid var(--border);border-radius:13px;padding:15px 16px}
.kpi .l{font-size:10.5px;text-transform:uppercase;letter-spacing:1px;color:var(--text3);font-weight:700;margin-bottom:5px}
.kpi .v{font-family:var(--fd);font-weight:800;font-size:20px;letter-spacing:-.5px}
h2{font-family:var(--fd);font-weight:700;font-size:19px;margin:28px 0 10px}
p{color:var(--text2);margin-bottom:13px}
pre{background:#0d1528;color:#e2eaff;border-radius:12px;padding:16px;overflow-x:auto;
 font-family:var(--fm);font-size:12.5px;line-height:1.6;margin-bottom:14px}
.alts{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:11px;margin:14px 0 6px}
.alt{background:var(--card);border:1px solid var(--border);border-radius:12px;padding:14px;
 text-decoration:none;display:block;transition:all .2s}
.alt:hover{border-color:var(--cyan);transform:translateY(-2px)}
.alt-k{display:block;font-size:10.5px;text-transform:uppercase;letter-spacing:1px;color:var(--text3);font-weight:700;margin-bottom:4px}
.alt-n{display:block;font-family:var(--fd);font-weight:700;font-size:15px;color:var(--text);margin-bottom:3px}
.alt-p{display:block;font-family:var(--fm);font-size:11.5px;color:var(--text2)}
.cta{display:inline-flex;align-items:center;gap:8px;background:linear-gradient(135deg,var(--cyan),#005599);
 color:#fff;text-decoration:none;font-family:var(--fd);font-weight:700;font-size:15px;
 padding:13px 24px;border-radius:12px;margin:8px 0 4px}
.tags{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:20px}
.tag{font-size:10.5px;font-weight:700;letter-spacing:.4px;text-transform:uppercase;
 padding:4px 9px;border-radius:6px;background:rgba(0,105,184,.09);color:var(--cyan)}
footer{border-top:1px solid var(--border);padding:24px 0 50px;text-align:center;font-size:13px;color:var(--text3)}
footer a{color:var(--text2);text-decoration:none;margin:0 7px}
</style>
</head>
<body>
<div class="top"><div class="wrap">
  <a class="brand" href="../index.html"><span class="mark">य</span><span class="bn">Yantra <span>AI</span></span></a>
</div></div>

<main><div class="wrap">
  <div class="crumb"><a href="../index.html">Home</a> › <a href="../models.html">Models</a> › ${esc(m.label)}</div>

  <h1>${esc(m.label)} pricing in India</h1>
  <div class="by">by ${esc(prov.label)}</div>
  <div class="mid">${esc(id)}</div>

  <div class="tags">${(m.tags || []).map((t) => `<span class="tag">${esc(t)}</span>`).join('')}</div>

  <p class="lead">${esc(m.blurb || m.label + ' via the Yantra AI gateway.')}
     Billed per token in Indian rupees, paid with UPI — no international credit card required.</p>

  <div class="grid">
    <div class="kpi"><div class="l">Input</div><div class="v">${inr(m.inr.in)}</div><div class="l" style="margin:4px 0 0">per 1M tokens</div></div>
    <div class="kpi"><div class="l">Output</div><div class="v">${inr(m.inr.out)}</div><div class="l" style="margin:4px 0 0">per 1M tokens</div></div>
    <div class="kpi"><div class="l">Context</div><div class="v">${fmtCtx(m.ctx)}</div><div class="l" style="margin:4px 0 0">tokens</div></div>
    <div class="kpi"><div class="l">Minimum top-up</div><div class="v" style="color:var(--saffron)">₹10</div><div class="l" style="margin:4px 0 0">via UPI</div></div>
  </div>

  ${words ? `<h2>What ₹10 actually buys</h2>
  <p>At ${inr(m.inr.out)} per million output tokens, a ₹10 top-up covers roughly
     <strong>${words.toLocaleString('en-IN')} words</strong> of generated text from
     ${esc(m.label)} — enough to genuinely evaluate it before committing more.</p>` : ''}

  <h2>Using ${esc(m.label)} from India</h2>
  <p>Yantra speaks the OpenAI API, so an existing integration needs two changes:
     the base URL and the key. Everything else — the SDK, the request shape, the
     response shape — stays exactly as it is.</p>

<pre>from openai import OpenAI

client = OpenAI(
    base_url="https://api.aitklabs.in/v1",
    api_key="yk_live_xxxxxxxxxxxx",
)

response = client.chat.completions.create(
    model="${esc(id)}",
    messages=[{"role": "user", "content": "Hello"}],
)
print(response.choices[0].message.content)</pre>

  <a class="cta" href="../index.html">Get an API key →</a>

  ${(cheaper || stronger) ? `<h2>Alternatives</h2>
  <div class="alts">
    ${altLink(cheaper, 'Cheaper')}
    ${altLink(stronger, 'More capable')}
  </div>` : ''}

  <h2>Why pay in rupees?</h2>
  <p>Most Indian debit cards decline international transactions, or have them
     disabled by default, which makes paying AI providers directly difficult.
     Yantra accepts UPI and bills in ₹, so ${esc(prov.label)}'s models are
     reachable without an international credit card.
     <a href="../models.html">Compare all models →</a></p>
</div></main>

<footer><div class="wrap">
  <a href="../index.html">Home</a>·<a href="../models.html">Models</a>·
  <a href="../docs.html">Docs</a>·<a href="../legal/terms.html">Terms</a>
  <div style="margin-top:9px">© 2026 Yantra AI · Kolhapur, Maharashtra, India</div>
</div></footer>
</body>
</html>
`;
}

// ── run ───────────────────────────────────────────────────────────────────
fs.mkdirSync(OUT, { recursive: true });
const all = Object.entries(MODELS)
  .filter(([id]) => !id.startsWith('local/'))     // self-hosted: no price to rank on
  .map(([id]) => [id, getModel(id)]);             // getModel applies the live margin

let n = 0;
for (const [id, m] of all) {
  fs.writeFileSync(path.join(OUT, slug(id) + '.html'), page(id, m, all));
  n++;
}
console.log(`wrote ${n} model pages to frontend/models/`);

// Sitemap entries, ready to paste
const urls = all.map(([id]) =>
  `  <url>\n    <loc>${SITE}/models/${slug(id)}.html</loc>\n` +
  `    <lastmod>2026-10-09</lastmod>\n    <changefreq>weekly</changefreq>\n` +
  `    <priority>0.7</priority>\n  </url>`).join('\n');
if (!process.env.SITE_DIR) fs.writeFileSync(path.join(__dirname, 'model_sitemap_entries.xml'), urls);
console.log('wrote model_sitemap_entries.xml');
