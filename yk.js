/* Yantra funnel analytics: counts visits and key steps, no cookies, no personal data.
   Respects Do Not Track. Exposes window.ykTrack(name). */
(function () {
  'use strict';
  var API = 'https://api.aitklabs.in/app/collect';
  var host = location.hostname;
  if (!/(^|\.)apikeys\.in$/.test(host)) return;                  // only the real site (not localhost/previews)
  if (navigator.doNotTrack === '1' || window.doNotTrack === '1') { window.ykTrack = function () {}; return; }

  function get(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } }
  function set(k, v) { try { sessionStorage.setItem(k, v); } catch (e) { /* private mode */ } }

  var sid = get('yk.sid');
  if (!sid) { sid = Math.random().toString(36).slice(2, 12) + Date.now().toString(36).slice(-4); set('yk.sid', sid); }

  function source() {
    var s = get('yk.src'); if (s) return s;
    var q = {}; location.search.replace(/^\?/, '').split('&').forEach(function (p) { var kv = p.split('='); if (kv[0]) q[kv[0]] = decodeURIComponent(kv[1] || ''); });
    var u = (q.utm_source || q.ref || '').toLowerCase(), r = '';
    try { r = document.referrer ? new URL(document.referrer).hostname.replace(/^www\./, '') : ''; } catch (e) { /* ignore */ }
    var v = 'direct';
    if (/chatgpt|openai\.com|perplexity|claude\.ai|gemini\.google|copilot|you\.com|phind/.test(r + ' ' + u)) v = 'ai-chat';
    else if (/google\./.test(r) || u === 'google') v = 'google';
    else if (/bing\.com|duckduckgo|yahoo|ecosia/.test(r) || u === 'bing') v = 'bing';
    else if (/twitter|t\.co|x\.com|linkedin|lnkd|reddit|facebook|fb\.com|instagram|whatsapp|telegram|t\.me|youtube|youtu\.be|discord|news\.ycombinator|dev\.to|medium|quora/.test(r + ' ' + u)) v = 'social';
    else if (r && /apikeys\.in$/.test(r)) v = 'apikeys';
    else if (r || u) v = 'other';
    set('yk.src', v); return v;
  }
  var SRC = source();

  function track(name) {
    try {
      var body = JSON.stringify({ e: name, s: SRC, u: sid });
      if (navigator.sendBeacon && navigator.sendBeacon(API, new Blob([body], { type: 'text/plain' }))) return;
      fetch(API, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: body, keepalive: true }).catch(function () {});
    } catch (e) { /* analytics must never break the page */ }
  }
  window.ykTrack = track;

  var p = location.pathname.replace(/\/+$/, '') || '/';
  var view = p === '/' || p === '/index.html' ? 'view_home'
    : p === '/docs.html' ? 'view_docs' : p === '/models.html' ? 'view_models' : p === '/playground.html' ? 'view_playground'
    : p === '/dashboard.html' ? 'view_dashboard' : p.indexOf('/models/') === 0 ? 'view_model_page'
    : /-india\.html$|guides\.html$|credit-card\.html$|cheapest-|alternative-/.test(p) ? 'view_guide' : 'view_other';
  track(view);

  document.addEventListener('click', function (ev) {
    var a = ev.target && ev.target.closest ? ev.target.closest('a,button') : null; if (!a) return;
    var h = a.getAttribute('href') || '', oc = a.getAttribute('onclick') || '';
    if (/ykGetKey/.test(oc)) track('cta_get_key');
    else if (/playground\.html/.test(h)) track('cta_playground');
    else if (/dashboard\.html/.test(h)) track('cta_dashboard');
    else if (a.id === 'rd-copy' || a.hasAttribute('data-yk-copy')) track('copy_snippet');
  }, true);
})();
