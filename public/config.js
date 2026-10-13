// Offentlige verdier. Den publiserbare nøkkelen gir bare tilgang til det databasens tilgangsregler tillater.
window.GM_CONFIG = {
  supabaseUrl: 'https://kkjfgejwgjhmxcdvtjii.supabase.co',
  supabaseKey: 'sb_publishable_QGBW0knWwKDloGeKDdEP4Q_hHrUtJSO',
  adminDomene: 'generajsonm.no'
};
window.gm = window.supabase.createClient(window.GM_CONFIG.supabaseUrl, window.GM_CONFIG.supabaseKey, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce' }
});

// Trygg DOM-bygging: all tekst settes som textContent, aldri som HTML.
window.h = function (tag, attrs) {
  var el = document.createElement(tag);
  attrs = attrs || {};
  Object.keys(attrs).forEach(function (k) {
    var v = attrs[k];
    if (v === null || v === undefined || v === false) return;
    if (k === 'class') el.className = v;
    else if (k === 'text') el.textContent = v;
    else if (k === 'style') el.setAttribute('style', v);
    else if (k.slice(0, 2) === 'on') el.addEventListener(k.slice(2).toLowerCase(), v);
    else el.setAttribute(k, v === true ? '' : v);
  });
  for (var i = 2; i < arguments.length; i++) {
    var c = arguments[i];
    if (c === null || c === undefined || c === false) continue;
    if (Array.isArray(c)) c.forEach(function (x) { if (x) el.appendChild(typeof x === 'string' ? document.createTextNode(x) : x); });
    else el.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c);
  }
  return el;
};
window.nb = function (x, d) { return x === null || x === undefined || isNaN(x) ? '–' : Number(x).toFixed(d || 0).replace('.', ','); };
window.feilmelding = function (err) {
  var m = (err && (err.message || err.error_description)) || 'Noe gikk galt';
  return m.replace(/^.*?ERROR:\s*/, '');
};
