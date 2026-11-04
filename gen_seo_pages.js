#!/usr/bin/env node
'use strict';
/**
 * SEO LANDING PAGES
 * Generates search-intent pages (provider pages, price tables, comparisons, n8n guide,
 * image API page, guides hub) from the REAL registry, so prices never go stale.
 *   node gen_seo_pages.js            writes frontend/*.html and prints sitemap entries
 * Re-run after prices change, then upload the pages.
 */
const fs = require('fs');
const path = require('path');
const SITE = 'https://apikeys.in';
const OUT = process.env.SITE_DIR || path.join(__dirname, 'frontend');
const TODAY = new Date().toISOString().slice(0, 10);
const { MODELS, getModel } = require(process.env.REGISTRY_MODULE || './backend/src/router/registry');
const IMG = require(process.env.IMAGE_MODULE || './backend/src/router/imageModels');

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const slug = (id) => id.replace(/[^a-z0-9]+/gi, '-').toLowerCase();
const inr = (n) => '₹' + Number(n).toLocaleString('en-IN', { minimumFractionDigits: n < 100 && n % 1 ? 2 : 0, maximumFractionDigits: 2 });
const ctx = (n) => (n >= 1e6 ? (n / 1e6) + 'M' : Math.round(n / 1000) + 'K');
const hasPage = (id) => fs.existsSync(path.join(OUT, 'models', slug(id) + '.html'));

const live = () => Object.keys(MODELS).filter((id) => { const m = getModel(id); return m && !m.unverifiedDeploy && m.provider !== 'local' && m.inr && (m.inr.in > 0 || m.inr.out > 0); });
const info = (id) => getModel(id);

// ── shared page shell (same look as the existing landing pages) ──────────────
const css = fs.readFileSync(path.join(OUT, 'openai-api-india.html'), 'utf8').match(/<style>[\s\S]*?<\/style>/)[0]
  .replace('</style>', 'table{width:100%;border-collapse:collapse;margin:8px 0 18px;font-size:13.5px;background:var(--card);border:1px solid var(--border);border-radius:12px;overflow:hidden}th,td{padding:10px 12px;text-align:left;border-bottom:1px solid var(--border)}th{font-size:11px;text-transform:uppercase;letter-spacing:.8px;color:var(--text3)}td.n{font-family:var(--fm);white-space:nowrap}tr:last-child td{border-bottom:none}.scroll{overflow-x:auto}ul.l{margin:0 0 14px 20px;color:var(--text2)}ul.l li{margin-bottom:6px}h3.q{font-family:var(--fd);font-size:16px;margin:14px 0 4px}</style>');

function page({ file, title, desc, h1, lead, body, faq = [], related = [] }) {
  const url = `${SITE}/${file}`;
  const faqLd = faq.length ? `<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a.replace(/<[^>]+>/g, '') } })) })}</script>` : '';
  const crumbLd = `<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Home', item: SITE + '/' }, { '@type': 'ListItem', position: 2, name: 'Guides', item: SITE + '/guides.html' }, { '@type': 'ListItem', position: 3, name: h1, item: url }] })}</script>`;
  const articleLd = `<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@type': 'Article', headline: h1, description: desc, dateModified: TODAY, inLanguage: 'en-IN', author: { '@type': 'Person', name: 'Aditya Sunil Borgaonkar' }, publisher: { '@type': 'Organization', name: 'Yantra AI', url: SITE + '/' }, mainEntityOfPage: url })}</script>`;
  const rel = related.length ? `<h2>Keep reading</h2><div class="alts">${related.map(([h, t, s]) => `<a class="alt" href="${h}"><span class="alt-n">${esc(t)}</span><span class="alt-p">${esc(s || '')}</span></a>`).join('')}</div>` : '';
  return `<!DOCTYPE html>
<html lang="en-IN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${url}">
<link rel="alternate" hreflang="en-IN" href="${url}">
<meta property="og:type" content="article">
<meta property="og:title" content="${esc(h1)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${SITE}/assets/og-image.png">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" type="image/png" sizes="32x32" href="assets/favicon-32.png">
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@700;800&family=Instrument+Sans:wght@400;600&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet">
${faqLd}
${crumbLd}
${articleLd}
${css}
</head>
<body>
<div class="top"><div class="wrap"><a class="brand" href="index.html"><span class="mark">य</span><span class="bn">Yantra <span>AI</span></span></a></div></div>
<main><div class="wrap">
  <div class="crumb"><a href="index.html">Home</a> › <a href="guides.html">Guides</a> › ${esc(h1)}</div>
  <h1>${esc(h1)}</h1>
  <p class="lead">${lead}</p>
  <a class="cta" href="dashboard.html">Get your API key →</a>
${body}
${faq.length ? '<h2>Frequently asked questions</h2>' + faq.map(([q, a]) => `<h3 class="q">${esc(q)}</h3><p>${a}</p>`).join('') : ''}
${rel}
  <p style="font-size:12.5px;color:var(--text3);margin-top:22px">Prices are in Indian rupees per 1M tokens, taken from the live Yantra catalogue on ${TODAY}, and can change. Yantra AI is an independent gateway and is not affiliated with or endorsed by OpenAI, Anthropic, Google, DeepSeek or any other provider named here. Product names are used only to describe compatibility.</p>
</div></main>
<footer><div class="wrap"><a href="index.html">Home</a>·<a href="models.html">Models</a>·<a href="guides.html">Guides</a>·<a href="docs.html">Docs</a>·<a href="status.html">Status</a>·<a href="legal/terms.html">Terms</a><div style="margin-top:9px">© 2026 Yantra AI · Kolhapur, Maharashtra, India</div></div></footer>
</body>
</html>
`;
}

const code = (model, extra = '') => `<pre>from openai import OpenAI

client = OpenAI(
    base_url=&quot;https://api.aitklabs.in/v1&quot;,
    api_key=&quot;yk_live_xxxxxxxxxxxx&quot;,
)

response = client.chat.completions.create(
    model=&quot;${model}&quot;,
    messages=[{&quot;role&quot;: &quot;user&quot;, &quot;content&quot;: &quot;Hello&quot;}],${extra}
)
print(response.choices[0].message.content)</pre>`;

function table(ids, { link = true } = {}) {
  const rows = ids.map((id) => { const m = info(id); const name = esc(m.label); const cell = link && hasPage(id) ? `<a href="models/${slug(id)}.html" style="color:var(--cyan);text-decoration:none">${name}</a>` : name;
    return `<tr><td>${cell}<div style="font-family:var(--fm);font-size:11px;color:var(--text3)">${esc(id)}</div></td><td class="n">${inr(m.inr.in)}</td><td class="n">${inr(m.inr.out)}</td><td class="n">${ctx(m.ctx)}</td></tr>`; }).join('');
  return `<div class="scroll"><table><thead><tr><th>Model</th><th>Input / 1M</th><th>Output / 1M</th><th>Context</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}
const blended = (id) => info(id).inr.in * 0.6 + info(id).inr.out * 0.4;
const written = [];
const write = (p) => { fs.writeFileSync(path.join(OUT, p.file), page(p)); written.push(p.file); };

const HOW = `<h2>How it works</h2>
<p>You top up a balance in rupees with UPI (minimum ₹10) and get one API key. Your code calls Yantra exactly like it calls OpenAI: the same SDK, the same request and response shape. You pay per token from your balance, with no subscription and no monthly fee.</p>`;
const COMMON_FAQ = [
  ['Do I need an international credit card?', 'No. You pay with UPI in Indian rupees. The minimum top-up is ₹10.'],
  ['Is this the official provider API?', 'No. Yantra AI is an independent gateway. It routes your request to the model provider and bills you in rupees.'],
];

// ── provider pages ───────────────────────────────────────────────────────────
const PROVIDERS = [
  { key: 'gemini', file: 'gemini-api-india.html', name: 'Gemini', lab: 'Google', h1: 'Gemini API in India — pay in ₹ with UPI',
    intro: 'Google’s Gemini models are strong on long documents, images and fast, cheap everyday tasks. Developers in India often hit friction setting up Google Cloud billing with an international card. Through Yantra you use a Gemini model with the same OpenAI SDK you already know and pay from a UPI-funded rupee balance.',
    use: ['Long documents: many Gemini models have a 1M-token context window, enough for a whole book or a large codebase.', 'Cheap, fast chat: the “Flash” and “Flash-Lite” models cost a fraction of flagship models.', 'Multimodal prompts: models tagged vision accept images alongside text.'] },
  { key: 'deepseek', file: 'deepseek-api-india.html', name: 'DeepSeek', lab: 'DeepSeek', h1: 'DeepSeek API in India — pay in ₹ with UPI',
    intro: 'DeepSeek is popular because it is cheap for the quality, especially for coding and reasoning. Paying DeepSeek directly means topping up in dollars. Yantra lets you use DeepSeek models from India with UPI and rupee pricing, and one API key that also reaches GPT, Claude and Gemini.',
    use: ['Low-cost coding assistants and agents where token volume is high.', 'Bulk summarising, classification and extraction at a low price per request.', 'A cheap default model with automatic fallback to another model if DeepSeek is busy.'] },
  { key: 'xai', file: 'grok-api-india.html', name: 'Grok', lab: 'xAI', h1: 'Grok API in India — pay in ₹ with UPI',
    intro: 'Grok is xAI’s model family. If you want to try Grok from India without setting up a dollar card, Yantra gives you OpenAI-compatible access with UPI billing in rupees.',
    use: ['Experimenting with a different model family next to GPT and Claude, using the same code.', 'Comparing answers across providers by changing only the model id.'] },
  { key: 'mistral', file: 'mistral-api-india.html', name: 'Mistral', lab: 'Mistral AI', h1: 'Mistral API in India — pay in ₹ with UPI',
    intro: 'Mistral AI builds efficient European models with good multilingual quality. Through Yantra you can call Mistral models from India with UPI billing in rupees, using the standard OpenAI SDK.',
    use: ['Multilingual apps where a smaller, cheaper model is enough.', 'Tool-calling workflows that need a predictable, cost-effective model.'] },
  { key: 'moonshot', file: 'kimi-api-india.html', name: 'Kimi', lab: 'Moonshot AI', h1: 'Kimi API in India — pay in ₹ with UPI',
    intro: 'Kimi, from Moonshot AI, is known for strong agentic coding and long-context work. Yantra gives developers in India access to Kimi models with UPI payment and rupee pricing, through an OpenAI-compatible API.',
    use: ['Agentic coding and multi-step tool use.', 'Reasoning-heavy tasks where you want a strong open-weight-style model.'] },
  { key: 'alibaba', file: 'qwen-api-india.html', name: 'Qwen', lab: 'Alibaba', h1: 'Qwen API in India — pay in ₹ with UPI',
    intro: 'Qwen is Alibaba’s model family, widely used for coding, multilingual work and cost-sensitive reasoning. With Yantra you can call Qwen from India, pay with UPI, and keep the OpenAI SDK you already use.',
    use: ['Cost-effective reasoning and coding.', 'Multilingual prompts, including Indian and East Asian languages.'] },
];
for (const P of PROVIDERS) {
  let ids = live().filter((id) => info(id).provider === P.key).sort((a, b) => blended(a) - blended(b));
  if (P.key === 'alibaba') ids = ids.concat(live().filter((id) => /^qwen\//.test(id) && info(id).provider !== 'alibaba' && !ids.includes(id)));
  if (!ids.length) continue;
  const cheap = ids[0], top = ids[ids.length - 1];
  write({
    file: P.file, h1: P.h1,
    title: `${P.name} API in India — Pay in ₹ with UPI, No Dollar Card | Yantra AI`,
    desc: `Use ${P.name} models from India and pay in rupees with UPI. ${ids.length} ${P.name} models from ${inr(info(cheap).inr.in)} per 1M input tokens. OpenAI-compatible API, ₹10 minimum top-up.`,
    lead: P.intro,
    body: `<h2>${P.name} models and prices in ₹</h2><p>${ids.length} ${P.name} ${ids.length === 1 ? 'model is' : 'models are'} available, sorted from cheapest to most expensive. Prices are per 1 million tokens, and include everything: there is no separate fee.</p>${table(ids)}
${HOW}
<h2>Good uses for ${P.name}</h2><ul class="l">${P.use.map((u) => `<li>${esc(u)}</li>`).join('')}</ul>
<h2>Example</h2><p>Change the base URL and key in your existing code, then set the model id:</p>${code(cheap)}
<h2>Pick the right model</h2><p>For the lowest cost, start with <b>${esc(info(cheap).label)}</b> at ${inr(info(cheap).inr.in)} in / ${inr(info(cheap).inr.out)} out per 1M tokens.${ids.length > 1 ? ` For the strongest results, try <b>${esc(info(top).label)}</b> at ${inr(info(top).inr.in)} in / ${inr(info(top).inr.out)} out.` : ''} You can also pass <span style="font-family:var(--fm)">auto:cheap</span> and let Yantra choose, with automatic failover if a provider is down.</p>`,
    faq: [[`How do I use ${P.name} from India?`, `Create a Yantra account, add credit with UPI (minimum ₹10), create an API key, and call the OpenAI-compatible endpoint https://api.aitklabs.in/v1 with a ${P.name} model id such as ${cheap}.`], [`How much does ${P.name} cost in rupees?`, `${P.name} models on Yantra start at ${inr(info(cheap).inr.in)} per 1M input tokens and ${inr(info(cheap).inr.out)} per 1M output tokens (${info(cheap).label}). See the table on this page for every model.`], ...COMMON_FAQ],
    related: [['llm-api-pricing-india.html', 'LLM API pricing in India', 'All models, ₹ per 1M tokens'], ['openai-alternative-india.html', 'OpenAI alternative for India', 'UPI billing, one key'], ['models.html', 'All 350+ models', 'Search and compare']],
  });
}

// ── LLM API pricing in INR ───────────────────────────────────────────────────
const popular = ['openai/gpt-5.5', 'openai/gpt-4o-mini', 'openai/gpt-6.1-sol', 'anthropic/claude-sonnet-5-5', 'anthropic/claude-haiku-5-5', 'anthropic/claude-opus-5-5', 'google/gemini-3.8-flash', 'google/gemini-3.1-pro', 'deepseek/deepseek-v4.1-flash', 'deepseek/deepseek-v4-pro', 'moonshot/kimi-k3', 'qwen/qwen3.7-plus', 'openai/gpt-oss-120b'].filter((id) => info(id) && !info(id).unverifiedDeploy);
const byCost = live().sort((a, b) => blended(a) - blended(b));
write({
  file: 'llm-api-pricing-india.html', h1: 'LLM API pricing in India (₹ per 1M tokens)',
  title: 'LLM API Pricing in India — GPT, Claude, Gemini, DeepSeek in ₹ | Yantra AI',
  desc: `Current price of GPT, Claude, Gemini, DeepSeek and more in Indian rupees per 1M tokens, pay with UPI. ${live().length}+ models compared. Updated ${TODAY}.`,
  lead: 'Most AI API prices are published in US dollars. This page shows what popular models cost in Indian rupees through Yantra AI, per 1 million input and output tokens, so you can compare before you build.',
  body: `<h2>Popular models</h2>${table(popular)}
<h2>How to read these prices</h2><p>AI APIs charge separately for <b>input tokens</b> (your prompt) and <b>output tokens</b> (the answer). A token is roughly ¾ of a word, so 1M tokens is about 750,000 words. Output tokens usually cost several times more than input tokens, so a chatbot that writes long answers costs more than one that writes short ones.</p>
<h2>Estimate your own cost</h2><p>Cost per request = (input tokens × input price + output tokens × output price) ÷ 1,000,000. For example, a request with 1,000 input and 500 output tokens on ${esc(info(popular[1] || popular[0]).label)} costs about ${inr((1000 * info(popular[1] || popular[0]).inr.in + 500 * info(popular[1] || popular[0]).inr.out) / 1e6)}. The <a href="models.html">models page</a> has a calculator that does this for your monthly usage.</p>
<h2>Cheapest models right now</h2><p>Ranked by a blended price (60% input, 40% output) among models that are live today:</p>${table(byCost.slice(0, 12))}
${HOW}`,
  faq: [['What is the price of the GPT API in rupees?', `On Yantra, GPT-5.5 costs ${inr(info('openai/gpt-5.5') ? info('openai/gpt-5.5').inr.in : 0)} per 1M input tokens and ${inr(info('openai/gpt-5.5') ? info('openai/gpt-5.5').inr.out : 0)} per 1M output tokens. Cheaper GPT models are listed above.`], ['Are these prices final?', 'Prices follow the upstream providers and can change. This page is regenerated from the live catalogue; the models page always shows current prices.'], ['Is GST included?', 'Prices shown are per-token prices. Check the checkout screen for the final payable amount when you top up.'], ...COMMON_FAQ],
  related: [['cheapest-llm-api-india.html', 'Cheapest LLM APIs in India', 'Ranked by cost'], ['openai-api-india.html', 'OpenAI API in India', 'Pay with UPI'], ['claude-api-india.html', 'Claude API in India', 'Pay with UPI']],
});

// ── cheapest ─────────────────────────────────────────────────────────────────
const c10 = byCost.slice(0, 10);
const reqs = (id) => Math.floor(10000 / ((800 * info(id).inr.in + 300 * info(id).inr.out) / 1e6)); // ₹100 = 10000 paise → in rupee terms below
const per100 = (id) => Math.floor(100 / ((800 * info(id).inr.in + 300 * info(id).inr.out) / 1e6));
write({
  file: 'cheapest-llm-api-india.html', h1: 'Cheapest LLM APIs in India',
  title: 'Cheapest LLM API in India (₹) — Low-Cost GPT, DeepSeek, Gemini | Yantra AI',
  desc: `The cheapest AI models you can use from India, ranked by price in rupees. See how many requests ₹100 buys. Pay with UPI from ₹10. Updated ${TODAY}.`,
  lead: 'If you are building a side project, a student app or a high-volume pipeline, the model you pick decides your bill. Here are the lowest-cost models available through Yantra, with a simple measure: how many typical requests ₹100 buys.',
  body: `<h2>Ranked by price</h2><div class="scroll"><table><thead><tr><th>Model</th><th>Input / 1M</th><th>Output / 1M</th><th>Requests for ₹100</th></tr></thead><tbody>${c10.map((id) => `<tr><td>${hasPage(id) ? `<a href="models/${slug(id)}.html" style="color:var(--cyan);text-decoration:none">${esc(info(id).label)}</a>` : esc(info(id).label)}<div style="font-family:var(--fm);font-size:11px;color:var(--text3)">${esc(id)}</div></td><td class="n">${inr(info(id).inr.in)}</td><td class="n">${inr(info(id).inr.out)}</td><td class="n">~${per100(id).toLocaleString('en-IN')}</td></tr>`).join('')}</tbody></table></div>
<p style="font-size:13px">“Requests for ₹100” assumes a typical chat request of 800 input tokens and 300 output tokens. Your real number depends on prompt and answer length.</p>
<h2>Cheap does not mean weak</h2><p>Small models are great for classification, extraction, short answers and simple chat. For hard reasoning, long coding tasks or careful writing, a more capable model is usually cheaper overall because it needs fewer retries. A good pattern is to default to a cheap model and send only the difficult requests to a stronger one.</p>
<h2>Let Yantra pick for you</h2><p>Set the model to <span style="font-family:var(--fm)">auto:cheap</span> to route to a low-cost model, or <span style="font-family:var(--fm)">auto:reasoning</span> for harder work. If a provider is busy or down, the request is retried on another host automatically.</p>${code('auto:cheap')}
${HOW}`,
  faq: [['What is the cheapest AI API for students in India?', `Among live models, the lowest-cost is ${info(c10[0]).label} at ${inr(info(c10[0]).inr.in)} per 1M input tokens. With UPI you can start from ₹10.`], ['Is there a free AI API in India?', 'Free tiers from the model providers often need an international account. On Yantra there is no subscription, and you only pay per token with a minimum top-up of ₹10.'], ...COMMON_FAQ],
  related: [['llm-api-pricing-india.html', 'LLM API pricing in India', 'Popular models in ₹'], ['deepseek-api-india.html', 'DeepSeek API in India', 'Low-cost reasoning'], ['models.html', 'All models', 'Search by price']],
});

// ── OpenAI alternative / OpenRouter alternative ──────────────────────────────
write({
  file: 'openai-alternative-india.html', h1: 'OpenAI API alternative for India — UPI billing, one key',
  title: 'OpenAI API Alternative for India — Pay in ₹ with UPI | Yantra AI',
  desc: 'Looking for an OpenAI API alternative in India? Yantra AI is an OpenAI-compatible gateway: UPI billing in rupees, GPT, Claude, Gemini and more with one API key.',
  lead: 'You may not want to leave OpenAI’s models. The usual blocker for developers in India is payment and billing, not quality. Yantra keeps the OpenAI-style API and fixes the payment and multi-model parts.',
  body: `<h2>What changes, and what does not</h2><div class="scroll"><table><thead><tr><th></th><th>Direct from OpenAI</th><th>Through Yantra AI</th></tr></thead><tbody>
<tr><td>Payment</td><td>International card</td><td>UPI</td></tr>
<tr><td>Currency</td><td>US dollars</td><td>Indian rupees</td></tr>
<tr><td>Minimum to start</td><td>Set by the provider</td><td>₹10</td></tr>
<tr><td>Models</td><td>OpenAI models</td><td>GPT, Claude, Gemini, DeepSeek and 350+ more, one key</td></tr>
<tr><td>Code change</td><td>None</td><td>Change base URL and key</td></tr>
<tr><td>If a provider is down</td><td>Your request fails</td><td>Automatic failover to another host or sibling model</td></tr>
</tbody></table></div>
<h2>The two-line migration</h2><p>If you already use the OpenAI SDK, only the base URL and key change:</p>${code('openai/gpt-5.5')}
<h2>When you should stay with OpenAI directly</h2><p>If you already have a working international payment method and only use OpenAI models, going direct is simplest. Yantra is most useful when you want UPI and rupee billing, or one key for several model families, or built-in failover.</p>
<h2>What it costs</h2><p>Model prices are shown in rupees per 1M tokens on the <a href="llm-api-pricing-india.html">pricing page</a>. There is no subscription.</p>${HOW}`,
  faq: [['Is Yantra a replacement for OpenAI?', 'Yantra is a gateway that gives you an OpenAI-compatible API and routes requests to GPT and other models. You keep using the OpenAI SDK.'], ['Will my existing code work?', 'Yes for chat completions. Change the base URL to https://api.aitklabs.in/v1 and use your Yantra key.'], ...COMMON_FAQ],
  related: [['openai-api-india.html', 'OpenAI API in India', 'Details and example'], ['openrouter-alternative-india.html', 'OpenRouter alternative for India', 'UPI and rupee billing'], ['n8n-openai-india.html', 'Use it in n8n', 'Step by step']],
});
write({
  file: 'openrouter-alternative-india.html', h1: 'OpenRouter alternative for Indian developers — UPI and ₹ billing',
  title: 'OpenRouter Alternative for India — UPI, ₹ Pricing | Yantra AI',
  desc: 'An OpenRouter-style multi-model API built for India: pay with UPI in rupees, one OpenAI-compatible key, 350+ models and automatic failover.',
  lead: 'Multi-model gateways like OpenRouter are useful: one key, many models. For developers in India the sticking points are usually dollar billing and international payment. Yantra offers the same idea with UPI and rupee pricing.',
  body: `<h2>Same idea, built for India</h2><div class="scroll"><table><thead><tr><th></th><th>Typical global gateway</th><th>Yantra AI</th></tr></thead><tbody>
<tr><td>Billing currency</td><td>US dollars</td><td>Indian rupees</td></tr>
<tr><td>Payment</td><td>Card (or crypto)</td><td>UPI, from ₹10</td></tr>
<tr><td>API</td><td>OpenAI-compatible</td><td>OpenAI-compatible</td></tr>
<tr><td>Model choice</td><td>One key, many models</td><td>One key, 350+ models</td></tr>
<tr><td>Routing</td><td>Provider routing options</td><td><span style="font-family:var(--fm)">auto:cheap</span>, <span style="font-family:var(--fm)">auto:fast</span>, <span style="font-family:var(--fm)">auto:reasoning</span> plus failover</td></tr>
<tr><td>Teams</td><td>Varies</td><td>Shared team wallet with roles and per-key spend limits</td></tr>
</tbody></table></div>
<h2>Routing and failover</h2><p>Ask for a specific model, or use a routing mode. If the host serving your model is down, Yantra retries on another host of the same model first, and only then on a similar model. The response headers tell you what served the request.</p>
<h2>Per-key spend limits</h2><p>Every API key can have a credit limit that resets daily, weekly or monthly, an expiry date, and a team owner. Limits protect your balance if a key leaks.</p>
<h2>Try it</h2>${code('auto:cheap')}${HOW}`,
  faq: [['Is Yantra OpenAI-compatible?', 'Yes. Use the OpenAI SDK with base URL https://api.aitklabs.in/v1.'], ['Can my team share one balance?', 'Yes. The Team tab lets you invite people with owner, admin or member roles. Everyone uses their own keys on one wallet.'], ...COMMON_FAQ],
  related: [['openai-alternative-india.html', 'OpenAI alternative for India', 'Compare options'], ['llm-api-pricing-india.html', 'LLM API pricing in India', 'All prices in ₹'], ['docs.html', 'Documentation', 'Routing modes and headers']],
});

// ── n8n ──────────────────────────────────────────────────────────────────────
write({
  file: 'n8n-openai-india.html', h1: 'Use OpenAI, Claude and Gemini in n8n from India (with UPI)',
  title: 'n8n OpenAI Credential Setup for India — Pay with UPI | Yantra AI',
  desc: 'Step-by-step: connect n8n to GPT, Claude, Gemini and 350+ models using one Yantra API key and a custom base URL. Pay in rupees with UPI.',
  lead: 'n8n’s OpenAI nodes let you point at any OpenAI-compatible API. That means you can run GPT, Claude, Gemini or DeepSeek in your n8n workflows from India with one key and rupee billing.',
  body: `<h2>Steps</h2><ol class="l">
<li>Create a Yantra account, add credit with UPI (minimum ₹10) and create an API key on the dashboard.</li>
<li>In n8n open <b>Credentials → New → OpenAI API</b>.</li>
<li>Paste your key (it starts with <span style="font-family:var(--fm)">yk_live_</span>) into <b>API Key</b>.</li>
<li>Set <b>Base URL</b> to <span style="font-family:var(--fm)">https://api.aitklabs.in/v1</span> and save.</li>
<li>Add an <b>OpenAI Chat Model</b> (or the OpenAI node) to your workflow and select the credential.</li>
<li>Choose a model. If the list is empty, switch the model field to <b>By ID</b> and type an id such as <span style="font-family:var(--fm)">openai/gpt-5.5</span>, <span style="font-family:var(--fm)">anthropic/claude-sonnet-5-5</span> or <span style="font-family:var(--fm)">auto:cheap</span>.</li>
</ol>
<h2>Calling it from an HTTP Request node</h2><p>You can also use n8n’s HTTP Request node with the same endpoint:</p><pre>POST https://api.aitklabs.in/v1/chat/completions
Authorization: Bearer yk_live_xxxxxxxxxxxx
Content-Type: application/json

{
  &quot;model&quot;: &quot;auto:cheap&quot;,
  &quot;messages&quot;: [{&quot;role&quot;: &quot;user&quot;, &quot;content&quot;: &quot;Summarise this email: {{ $json.text }}&quot;}]
}</pre>
<h2>Tips for workflows</h2><ul class="l"><li>Use <span style="font-family:var(--fm)">auto:cheap</span> for classification and extraction steps, and a stronger model only where quality matters.</li><li>Set a credit limit on the key you give n8n, so a looping workflow cannot drain your balance.</li><li>Servers that call the API from the cloud (AWS, Hetzner and similar) work normally.</li><li>Images: the same key works with <span style="font-family:var(--fm)">/v1/images/generations</span> from an HTTP Request node. See the <a href="ai-image-generation-api-india.html">image API guide</a>.</li></ul>${HOW}`,
  faq: [['What base URL do I use in n8n?', 'https://api.aitklabs.in/v1, in the OpenAI API credential.'], ['Can I use Claude or Gemini in n8n this way?', 'Yes. Use the model id, for example anthropic/claude-sonnet-5-5 or google/gemini-3.8-flash, through the same OpenAI credential.'], ['How do I stop a workflow overspending?', 'Create a key with a credit limit and a daily, weekly or monthly reset, and use that key in n8n.'], ...COMMON_FAQ],
  related: [['docs.html', 'API documentation', 'All endpoints'], ['llm-api-pricing-india.html', 'Pricing in ₹', 'Pick a model'], ['cheapest-llm-api-india.html', 'Cheapest models', 'Keep workflow costs low']],
});

// ── image API ────────────────────────────────────────────────────────────────
const imgIds = Object.entries(IMG.IMAGE_MODELS).filter(([, m]) => m.verified).map(([id]) => id);
if (imgIds.length) {
  const rows = imgIds.map((id) => { const m = IMG.IMAGE_MODELS[id]; return `<tr><td>${esc(m.label)}<div style="font-family:var(--fm);font-size:11px;color:var(--text3)">${esc(id)}</div></td><td class="n">${inr(Math.round(IMG.pricePaise(m, 1024, 1024, 1)) / 100)}</td></tr>`; }).join('');
  write({
    file: 'ai-image-generation-api-india.html', h1: 'AI image generation API in India — FLUX, pay in ₹ with UPI',
    title: 'AI Image Generation API India — FLUX in ₹, Pay with UPI | Yantra AI',
    desc: `Generate images with FLUX through an OpenAI-style API. From ${inr(Math.round(IMG.pricePaise(IMG.IMAGE_MODELS[imgIds[0]], 1024, 1024, 1)) / 100)} per 1024×1024 image. Pay with UPI, no dollar card.`,
    lead: 'The same Yantra key that calls chat models can generate images. The endpoint follows the OpenAI images API, so existing tools and SDKs work, and you pay per image in rupees.',
    body: `<h2>Image models and prices</h2><div class="scroll"><table><thead><tr><th>Model</th><th>Per 1024×1024 image</th></tr></thead><tbody>${rows}</tbody></table></div><p style="font-size:13px">Some models scale with image size. You are charged only when an image is returned.</p>
<h2>Example</h2><pre>curl https://api.aitklabs.in/v1/images/generations \\
  -H &quot;Authorization: Bearer yk_live_xxxxxxxxxxxx&quot; \\
  -H &quot;Content-Type: application/json&quot; \\
  -d '{&quot;model&quot;:&quot;${imgIds[0]}&quot;,&quot;prompt&quot;:&quot;A diya on a rainy window, photo&quot;,&quot;size&quot;:&quot;1024x1024&quot;}'</pre>
<h2>Good for</h2><ul class="l"><li>Social media posts and thumbnails generated from a workflow.</li><li>Product mock-ups and blog illustrations.</li><li>Apps that need an image step without a separate dollar-billed account.</li></ul>
<h2>Limits</h2><p>Up to 4 images per request, sizes from 256 to 2048 pixels. Use <span style="font-family:var(--fm)">response_format: &quot;url&quot;</span> for a hosted link that stays valid for one hour, or the default base64 data.</p>${HOW}`,
    faq: [['Which image models are available?', 'FLUX models from Black Forest Labs. The list above is generated from the live catalogue.'], ['How am I charged for images?', 'Per image, in rupees, only when an image is returned. Price depends on the model, and for some models on the size.'], ...COMMON_FAQ],
    related: [['n8n-openai-india.html', 'Use it in n8n', 'Automate image posts'], ['docs.html', 'API documentation', 'Image endpoint details'], ['llm-api-pricing-india.html', 'Chat model pricing', 'In ₹']],
  });
}

// ── guides hub ───────────────────────────────────────────────────────────────
const hub = [
  ['openai-api-india.html', 'OpenAI API in India', 'Use GPT with UPI, no international card'],
  ['claude-api-india.html', 'Claude API in India', 'Opus, Sonnet and Haiku in rupees'],
  ['ai-api-without-credit-card.html', 'AI API without a credit card', 'UPI instead of a dollar card'],
  ['openai-alternative-india.html', 'OpenAI alternative for India', 'Compare direct vs gateway'],
  ['openrouter-alternative-india.html', 'OpenRouter alternative', 'UPI and rupee billing'],
  ['llm-api-pricing-india.html', 'LLM API pricing in India', 'Popular models in ₹'],
  ['cheapest-llm-api-india.html', 'Cheapest LLM APIs', 'Ranked by price'],
  ['n8n-openai-india.html', 'n8n with GPT, Claude, Gemini', 'Step-by-step setup'],
  ['ai-image-generation-api-india.html', 'Image generation API', 'FLUX in rupees'],
].concat(PROVIDERS.filter((P) => written.includes(P.file)).map((P) => [P.file, `${P.name} API in India`, `${P.lab} models in rupees`]));
write({
  file: 'guides.html', h1: 'Guides: using AI APIs in India',
  title: 'AI API Guides for India — Pricing, Setup and Comparisons | Yantra AI',
  desc: 'Guides for developers in India: AI API pricing in ₹, paying with UPI, n8n setup, OpenAI and OpenRouter alternatives, and model-by-model pages.',
  lead: 'Practical pages for building with AI models from India: what things cost in rupees, how to pay with UPI, and how to connect popular tools.',
  body: `<div class="alts">${hub.map(([h, t, s]) => `<a class="alt" href="${h}"><span class="alt-n">${esc(t)}</span><span class="alt-p">${esc(s)}</span></a>`).join('')}</div>
<h2>Browse every model</h2><p>The <a href="models.html">models page</a> lists 350+ models with live rupee pricing, and each major model has its own page with an example and a cost estimate.</p>`,
  faq: [], related: [['docs.html', 'API documentation', 'Endpoints, routing, errors'], ['status.html', 'System status', 'Live provider health']],
});
// hub breadcrumb is fine; sitemap entries
const entries = written.map((f) => `  <url>\n    <loc>${SITE}/${f}</loc>\n    <lastmod>${TODAY}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>${f === 'guides.html' ? '0.8' : '0.7'}</priority>\n  </url>`).join('\n');
if (!process.env.SITE_DIR) fs.writeFileSync(path.join(__dirname, 'seo_sitemap_entries.xml'), entries + '\n');
console.log('wrote', written.length, 'pages:\n ' + written.join('\n '));
