(function () {
  var root = document.getElementById('root');
  var DOMENE = GM_CONFIG.adminDomene;
  var A = { bruker: null, tab: 'oversikt', kommuner: [], steder: [], kommuneId: '', periode: '90', rader: [], besok: [] };
  var NIVAA = { middels: 'Middels', vanskelig: 'Vanskelig', ekstra: 'Ekstra vanskelig' };

  function lagre(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function hent(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function dato(d) { if (!d) return '–'; var x = new Date(d + (d.length === 10 ? 'T12:00:00' : '')); return x.toLocaleDateString('nb-NO', { day: 'numeric', month: 'short', year: 'numeric' }); }
  function isoUke(d) {
    var t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    var dag = t.getUTCDay() || 7; t.setUTCDate(t.getUTCDate() + 4 - dag);
    var start = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
    return { aar: t.getUTCFullYear(), uke: Math.ceil(((t - start) / 86400000 + 1) / 7) };
  }
  function fraDato() {
    if (A.periode === 'alt') return null;
    var d = new Date(); d.setDate(d.getDate() - Number(A.periode));
    return d.toISOString().slice(0, 10);
  }
  function melding(el, tekst, type) { el.textContent = tekst; el.className = type === 'ok' ? 'ok' : 'error'; el.classList.remove('hidden'); }

  // ---------- Innlogging ----------
  function visLogin(feil) {
    root.textContent = '';
    var btn = h('button', { type: 'button', class: 'btn blue', style: 'width:100%' }, 'Logg inn med Google');
    btn.onclick = function () {
      btn.disabled = true;
      gm.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: location.origin + '/admin.html', queryParams: { hd: DOMENE, prompt: 'select_account' } } });
    };
    root.appendChild(h('div', { class: 'login' },
      h('div', { class: 'card stack gap20', style: 'width:100%;max-width:420px;padding:32px' },
        h('a', { href: '/', 'aria-label': 'Til forsiden', style: 'align-self:flex-start' }, h('img', { src: '/img/logo-pos.svg', alt: 'Generasjon M', style: 'height:26px;display:block' })),
        h('h1', { class: 'display h1', text: 'Admin' }),
        h('p', { class: 'muted', style: 'margin:0;line-height:1.5', text: 'Logg inn med Google-kontoen din fra Generasjon M (@' + DOMENE + '). Bare godkjente administratorer får tilgang.' }),
        feil ? h('div', { class: 'error', role: 'alert', text: feil }) : null,
        btn)));
  }

  function start() {
    gm.auth.getSession().then(function (r) {
      var s = r.data.session;
      if (!s) return visLogin();
      A.bruker = s.user;
      gm.rpc('is_admin').then(function (res) {
        if (res.error || res.data !== true) {
          var epost = s.user.email || '';
          gm.auth.signOut().then(function () {
            visLogin('Kontoen ' + epost + ' har ikke tilgang. Bruk en godkjent konto på @' + DOMENE + ', eller be en administrator legge deg til.');
          });
          return;
        }
        lastGrunndata().then(skall);
      });
    });
  }
  gm.auth.onAuthStateChange(function (ev) { if (ev === 'SIGNED_OUT' && A.bruker) { A.bruker = null; visLogin(); } });

  function lastGrunndata() {
    return Promise.all([
      gm.from('kommuner').select('id,navn').order('navn'),
      gm.from('steder').select('id,navn,beboere,aktiv,kommune_id').order('navn')
    ]).then(function (r) {
      A.kommuner = r[0].data || []; A.steder = r[1].data || [];
      var lagret = hent('gm_admin_kommune');
      A.kommuneId = A.kommuner.some(function (k) { return k.id === lagret; }) ? lagret : (A.kommuner[0] ? A.kommuner[0].id : '');
    });
  }
  function kommuneNavn() { var k = A.kommuner.filter(function (x) { return x.id === A.kommuneId; })[0]; return k ? k.navn : ''; }
  function stederIKommune() { return A.steder.filter(function (s) { return s.kommune_id === A.kommuneId; }); }

  // ---------- Skall ----------
  var TABS = [['oversikt', 'Oversikt'], ['besok', 'Alle besøk'], ['oppsummeringer', 'Oppsummeringer'], ['utfordring', 'Ukas utfordring'], ['mal', 'Mål'], ['steder', 'Kommuner og steder'], ['admins', 'Administratorer']];
  var innhold;
  function skall() {
    root.textContent = '';
    var tabKnapper = TABS.map(function (t) {
      return h('button', { type: 'button', class: 'tab', 'aria-current': A.tab === t[0] ? 'page' : 'false', onclick: function () { A.tab = t[0]; skall(); } }, t[1]);
    });
    var komSel = h('select', { class: 'input', style: 'background:#fff', 'aria-label': 'Kommune' }, A.kommuner.map(function (k) { var o = h('option', { value: k.id, text: k.navn }); if (k.id === A.kommuneId) o.selected = true; return o; }));
    komSel.onchange = function () { A.kommuneId = komSel.value; lagre('gm_admin_kommune', A.kommuneId); skall(); };
    innhold = h('div', { class: 'inner' });
    root.appendChild(h('div', { class: 'shell' },
      h('nav', { class: 'side', 'aria-label': 'Admin' },
        h('img', { src: '/img/logo-neg.svg', alt: 'Generasjon M', style: 'height:22px;align-self:flex-start' }),
        A.kommuner.length ? h('label', { class: 'field', style: 'color:#CDDFFF;font-size:12px;text-transform:uppercase;letter-spacing:.08em' }, 'Kommune', komSel) : null,
        h('div', { class: 'stack gap4' }, tabKnapper),
        h('div', { class: 'stack gap8', style: 'margin-top:auto' },
          h('span', { class: 'small', style: 'color:#CDDFFF;word-break:break-all', text: A.bruker.email }),
          h('button', { type: 'button', class: 'btn ghost small', style: 'align-self:flex-start;background:transparent;color:#fff;border-color:#6F8DFF', onclick: function () { gm.auth.signOut(); } }, 'Logg ut'))),
      h('main', { class: 'content' }, innhold)));
    ({ oversikt: visOversikt, besok: visBesok, oppsummeringer: visOppsummeringer, utfordring: visUtfordring, mal: visMal, steder: visSteder, admins: visAdmins })[A.tab]();
  }
  function header(over, tittel, tekst, hoyre) {
    return h('header', { class: 'row wrap gap16', style: 'justify-content:space-between;align-items:flex-end' },
      h('div', { class: 'stack gap6' },
        over ? h('span', { style: 'font-size:14px;font-weight:700;color:var(--blue)', text: over }) : null,
        h('h1', { class: 'display', style: 'font-size:38px', text: tittel }),
        tekst ? h('p', { class: 'muted', style: 'margin:0;max-width:640px;line-height:1.5', text: tekst }) : null),
      hoyre || null);
  }
  function periodeVelger(onChange) {
    var sel = h('select', { class: 'input', style: 'width:auto', 'aria-label': 'Periode' },
      [['30', 'Siste 30 dager'], ['90', 'Siste 90 dager'], ['365', 'Siste 12 måneder'], ['alt', 'Hele perioden']].map(function (p) { var o = h('option', { value: p[0], text: p[1] }); if (p[0] === A.periode) o.selected = true; return o; }));
    sel.onchange = function () { A.periode = sel.value; onChange(); };
    return sel;
  }
  function laster() { return h('p', { class: 'muted', text: 'Henter data …' }); }

  // ---------- Oversikt ----------
  function visOversikt() {
    var body = h('div', { class: 'stack gap24' }, laster());
    innhold.appendChild(header(kommuneNavn(), 'Oversikt', 'Effekten av alle besøk, regnet ut fra stemningsrapportene.', periodeVelger(function () { skall(); })));
    innhold.appendChild(body);
    var q = gm.from('besok_statistikk').select('*').eq('kommune_id', A.kommuneId).order('dato', { ascending: true });
    var fra = fraDato(); if (fra) q = q.gte('dato', fra);
    q.then(function (res) {
      body.textContent = '';
      if (res.error) { body.appendChild(h('div', { class: 'error', text: feilmelding(res.error) })); return; }
      var rader = res.data || [];
      if (!rader.length) { body.appendChild(h('div', { class: 'card', text: 'Ingen besøk registrert i perioden ennå.' })); return; }
      var H = 0, M = 0, L = 0, loft = [], ja = 0, svar = 0, ok = 0, utf = 0, pers = [];
      rader.forEach(function (r) {
        H += r.kontakt_hoy; M += r.kontakt_middels; L += r.kontakt_lav;
        if (r.stemningsloft !== null) loft.push(r.stemningsloft);
        if (r.maal_svar) { svar++; if (r.maal_svar === 'ja') ja++; }
        if (r.utfordring_fullfort !== null) { utf++; if (r.utfordring_fullfort) ok++; }
        if (r.personal_dialog) pers.push(r.personal_dialog);
      });
      var T = H + M + L;
      function snitt(a) { return a.length ? a.reduce(function (x, y) { return x + y; }, 0) / a.length : null; }
      var sl = snitt(loft);
      function kpi(l, v, n, stil) { return h('div', { class: 'kpi', style: stil || '' }, h('span', { style: 'font-size:14px;font-weight:600', text: l }), h('span', { class: 'v', text: v }), h('span', { class: 'small', style: 'opacity:.85', text: n })); }
      body.appendChild(h('div', { class: 'kpis' },
        kpi('Besøk', String(rader.length), 'rapporter sendt inn'),
        kpi('Generasjonsmøter', String(T), 'i snitt ' + nb(T / rader.length, 1) + ' per besøk'),
        kpi('Kontaktdybde', T ? Math.round((3 * H + 2 * M + L) / (3 * T) * 100) + ' %' : '–', Math.round(H / (T || 1) * 100) + ' % høy kontakt'),
        kpi('Stemningsløft', sl === null ? '–' : (sl > 0 ? '+' : '') + nb(sl, 1), 'snitt per besøk, skala 1–5', 'background:var(--yellow);border:none'),
        kpi('Mål nådd', svar ? Math.round(ja / svar * 100) + ' %' : '–', ja + ' av ' + svar + ' besvarte mål'),
        kpi('Ukas utfordring', utf ? ok + ' av ' + utf : '–', 'utfordringer fullført', 'background:var(--blue);color:#fff;border:none'),
        kpi('Dialog med personalet', pers.length ? nb(snitt(pers), 1) : '–', 'snitt av 5')));

      // per uke
      var uker = {};
      rader.forEach(function (r) { var u = uker[r.uke_start] || (uker[r.uke_start] = { m: 0, b: 0 }); u.m += r.generasjonsmoter; u.b++; });
      var nokler = Object.keys(uker).sort().slice(-16);
      var maks = Math.max.apply(null, nokler.map(function (k) { return uker[k].m; }).concat([1]));
      var ukeKort = h('section', { class: 'card stack gap12', style: 'padding:24px' },
        h('h2', { class: 'display h2', text: 'Generasjonsmøter per uke' }),
        h('div', { class: 'weeks', role: 'img', 'aria-label': 'Generasjonsmøter per uke' }, nokler.map(function (k) {
          var d = new Date(k + 'T12:00:00');
          return h('div', { class: 'col', title: uker[k].m + ' møter, ' + uker[k].b + ' besøk' },
            h('span', { class: 'small', style: 'font-weight:700', text: String(uker[k].m) }),
            h('div', { class: 'b', style: 'height:' + Math.max(4, uker[k].m / maks * 120) + 'px' }),
            h('span', { class: 'l', text: 'u' + isoUke(d).uke }));
        })));

      // signaler
      var sig = {};
      rader.forEach(function (r) { (r.signaler || []).forEach(function (s) { sig[s] = (sig[s] || 0) + 1; }); });
      var sigListe = Object.keys(sig).sort(function (a, b) { return sig[b] - sig[a]; });
      var sigKort = h('section', { class: 'card stack gap12', style: 'padding:24px' },
        h('h2', { class: 'display h2', text: 'Hva besøkslederne ser' }),
        sigListe.length ? sigListe.map(function (s) {
          return h('div', { style: 'display:grid;grid-template-columns:170px minmax(0,1fr) 70px;gap:12px;align-items:center;font-size:14px' },
            h('span', { style: 'font-weight:600', text: s }),
            h('div', { class: 'bar' }, h('div', { style: 'width:' + (sig[s] / rader.length * 100) + '%;background:' + (s === 'Uro eller tristhet' || s === 'Noen ble ikke nådd' ? 'var(--input)' : 'var(--blue)') })),
            h('span', { class: 'muted', style: 'text-align:right', text: sig[s] + ' av ' + rader.length }));
        }) : h('p', { class: 'muted', text: 'Ingen registrert.' }));
      body.appendChild(h('div', { class: 'two' }, ukeKort, sigKort));

      // per sted
      var steder = {};
      rader.forEach(function (r) {
        var s = steder[r.sted] || (steder[r.sted] = { b: 0, H: 0, M: 0, L: 0, loft: [], ja: 0, svar: 0, ok: 0, utf: 0, siste: r.dato });
        s.b++; s.H += r.kontakt_hoy; s.M += r.kontakt_middels; s.L += r.kontakt_lav;
        if (r.stemningsloft !== null) s.loft.push(r.stemningsloft);
        if (r.maal_svar) { s.svar++; if (r.maal_svar === 'ja') s.ja++; }
        if (r.utfordring_fullfort !== null) { s.utf++; if (r.utfordring_fullfort) s.ok++; }
        if (r.dato > s.siste) s.siste = r.dato;
      });
      body.appendChild(h('section', { class: 'card stack gap12', style: 'padding:24px' },
        h('h2', { class: 'display h2', text: 'Per besøkssted' }),
        h('div', { class: 'scroll' }, h('table', { style: 'min-width:820px' },
          h('thead', null, h('tr', null, ['Sted', 'Besøk', 'Generasjonsmøter', 'Kontakt (høy / middels / lav)', 'Stemningsløft', 'Mål nådd', 'Utfordringer', 'Siste besøk'].map(function (t) { return h('th', { text: t }); }))),
          h('tbody', null, Object.keys(steder).sort().map(function (n) {
            var s = steder[n], t = s.H + s.M + s.L, l = snitt(s.loft);
            return h('tr', null,
              h('td', { style: 'font-weight:700', text: n }), h('td', { text: String(s.b) }), h('td', { text: String(t) }),
              h('td', null, h('div', { class: 'stack gap4' }, h('div', { class: 'bar', style: 'height:12px' },
                h('div', { style: 'width:' + (t ? s.H / t * 100 : 0) + '%;background:#F7C253' }), h('div', { style: 'width:' + (t ? s.M / t * 100 : 0) + '%;background:#00B36B' }), h('div', { style: 'width:' + (t ? s.L / t * 100 : 0) + '%;background:#6F8DFF' })),
                h('span', { class: 'small muted', text: s.H + ' / ' + s.M + ' / ' + s.L }))),
              h('td', { text: l === null ? '–' : (l > 0 ? '+' : '') + nb(l, 1) }),
              h('td', { text: s.svar ? Math.round(s.ja / s.svar * 100) + ' %' : '–' }),
              h('td', { text: s.utf ? s.ok + ' av ' + s.utf : '–' }),
              h('td', { text: dato(s.siste) }));
          }))))));
    });
  }

  // ---------- Alle besøk ----------
  function visBesok() {
    var body = h('div', { class: 'stack gap12' }, laster());
    var eksport = h('button', { type: 'button', class: 'btn ghost small' }, 'Last ned som CSV');
    innhold.appendChild(header(kommuneNavn(), 'Alle besøk', 'Hver innsendte rapport. Trykk på et besøk for å se alle svarene.', h('div', { class: 'row gap8 wrap' }, periodeVelger(function () { skall(); }), eksport)));
    innhold.appendChild(body);
    var ids = stederIKommune().map(function (s) { return s.id; });
    if (!ids.length) { body.textContent = ''; body.appendChild(h('div', { class: 'card', text: 'Ingen steder i denne kommunen ennå.' })); return; }
    var q = gm.from('besok').select('*, steder(navn)').in('sted_id', ids).order('dato', { ascending: false }).order('opprettet', { ascending: false }).limit(1000);
    var fra = fraDato(); if (fra) q = q.gte('dato', fra);
    q.then(function (res) {
      body.textContent = '';
      if (res.error) { body.appendChild(h('div', { class: 'error', text: feilmelding(res.error) })); return; }
      var rader = res.data || [];
      eksport.onclick = function () { lastNedCsv(rader); };
      if (!rader.length) { body.appendChild(h('div', { class: 'card', text: 'Ingen besøk i perioden.' })); return; }
      var sok = h('input', { class: 'input', type: 'search', placeholder: 'Søk i sted, besøksleder eller tekst', 'aria-label': 'Søk' });
      var liste = h('div', { class: 'stack gap10' });
      function tegn() {
        liste.textContent = '';
        var s = sok.value.trim().toLowerCase();
        rader.filter(function (r) { return !s || JSON.stringify([r.steder && r.steder.navn, r.besoksleder, r.oppsummering, r.dagens_generasjonsmote, r.kommentar, r.neste_gang]).toLowerCase().indexOf(s) >= 0; })
          .forEach(function (r) { liste.appendChild(besokKort(r)); });
      }
      sok.oninput = tegn;
      body.appendChild(sok); body.appendChild(h('span', { class: 'small muted', text: rader.length + ' besøk' })); body.appendChild(liste);
      tegn();
    });
  }
  function besokKort(r) {
    var t = r.kontakt_hoy + r.kontakt_middels + r.kontakt_lav;
    var d = r.stemning_for && r.stemning_etter ? r.stemning_etter - r.stemning_for : null;
    var stemn = ['', 'Svært lav', 'Lav', 'Nøytral', 'God', 'Svært god'];
    function rad(k, v) { return v === null || v === undefined || v === '' || (Array.isArray(v) && !v.length) ? null : [h('dt', { text: k }), h('dd', { text: Array.isArray(v) ? v.join(', ') : String(v) })]; }
    var slett = h('button', { type: 'button', class: 'btn ghost small' }, 'Slett besøket');
    var kort = h('details', { class: 'visit card', style: 'padding:0' },
      h('summary', { style: 'padding:16px 18px' }, h('div', { class: 'row wrap gap12', style: 'justify-content:space-between' },
        h('div', { class: 'stack gap4' }, h('span', { style: 'font-size:16px;font-weight:700', text: (r.steder ? r.steder.navn : '') }), h('span', { class: 'small muted', text: dato(r.dato) + ' · ' + r.besoksleder + ' · ' + r.m_venner + ' M-venner' })),
        h('div', { class: 'row wrap gap8' },
          h('span', { class: 'badge', style: 'background:var(--bg)', text: t + ' møter' }),
          h('span', { class: 'badge', text: 'Løft ' + (d === null ? '–' : (d > 0 ? '+' + d : String(d))) }),
          r.maal_svar ? h('span', { class: 'badge', style: 'background:var(--bg)', text: 'Mål: ' + r.maal_svar }) : null,
          r.utfordring_mal ? h('span', { class: 'badge', style: 'background:' + (r.utfordring_resultat >= r.utfordring_mal ? 'var(--green)' : 'var(--pink)'), text: 'Utfordring ' + r.utfordring_resultat + '/' + r.utfordring_mal }) : null))),
      h('div', { class: 'stack gap16', style: 'padding:0 18px 18px' },
        h('dl', { class: 'kv' }, [].concat(
          rad('Kontakt høy / middels / lav', r.kontakt_hoy + ' / ' + r.kontakt_middels + ' / ' + r.kontakt_lav),
          rad('Stemning før → etter', r.stemning_for ? stemn[r.stemning_for] + ' → ' + stemn[r.stemning_etter] : null),
          rad('Signaler', r.signaler), rad('Aktiviteter', r.aktiviteter),
          rad('Mål', r.maal_tekst), rad('Dagens generasjonsmøte', r.dagens_generasjonsmote),
          rad('Dialog med personalet', r.personal_dialog ? r.personal_dialog + ' av 5' : null),
          rad('Til neste besøk', r.neste_gang), rad('Meldt fra om', r.avvik), rad('Kommentar', r.kommentar),
          rad('Sendt inn', new Date(r.opprettet).toLocaleString('nb-NO'))
        ).filter(Boolean).reduce(function (a, b) { return a.concat(b); }, [])),
        h('div', null, slett)));
    slett.onclick = function () {
      if (!confirm('Slette dette besøket for godt? Det kan ikke angres.')) return;
      gm.from('besok').delete().eq('id', r.id).then(function (res) { if (res.error) alert(feilmelding(res.error)); else kort.remove(); });
    };
    return kort;
  }
  function lastNedCsv(rader) {
    var kol = ['dato', 'sted', 'besoksleder', 'm_venner', 'kontakt_hoy', 'kontakt_middels', 'kontakt_lav', 'stemning_for', 'stemning_etter', 'signaler', 'aktiviteter', 'maal_tekst', 'maal_svar', 'utfordring_mal', 'utfordring_resultat', 'personal_dialog', 'neste_gang', 'avvik', 'kommentar', 'dagens_generasjonsmote', 'oppsummering'];
    function esc(v) {
      if (v === null || v === undefined) return '';
      if (Array.isArray(v)) v = v.join('; ');
      v = String(v);
      if (/^[=+\-@]/.test(v)) v = "'" + v; // hindrer formelinjeksjon i Excel
      return '"' + v.replace(/"/g, '""') + '"';
    }
    var linjer = [kol.join(';')].concat(rader.map(function (r) {
      return kol.map(function (k) { return esc(k === 'sted' ? (r.steder && r.steder.navn) : r[k]); }).join(';');
    }));
    var blob = new Blob(['﻿' + linjer.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    var a = h('a', { href: URL.createObjectURL(blob), download: 'besok-' + kommuneNavn().toLowerCase() + '.csv' });
    document.body.appendChild(a); a.click(); a.remove();
  }

  // ---------- Oppsummeringer ----------
  function visOppsummeringer() {
    var body = h('div', { class: 'stack gap16' }, laster());
    var alle = h('button', { type: 'button', class: 'btn' }, 'Kopier alle');
    innhold.appendChild(header(kommuneNavn(), 'Oppsummeringer', 'Lages automatisk når en besøksleder sender rapporten. Rett i teksten om du vil, kopier den og send den til kommunen.', h('div', { class: 'row gap8 wrap' }, periodeVelger(function () { skall(); }), alle)));
    innhold.appendChild(body);
    var ids = stederIKommune().map(function (s) { return s.id; });
    var q = gm.from('besok').select('id,dato,besoksleder,oppsummering,dagens_generasjonsmote,steder(navn)').in('sted_id', ids.length ? ids : ['00000000-0000-0000-0000-000000000000']).order('dato', { ascending: false }).limit(200);
    var fra = fraDato(); if (fra) q = q.gte('dato', fra);
    q.then(function (res) {
      body.textContent = '';
      if (res.error) { body.appendChild(h('div', { class: 'error', text: feilmelding(res.error) })); return; }
      var rader = res.data || [];
      if (!rader.length) { body.appendChild(h('div', { class: 'card', text: 'Ingen oppsummeringer i perioden.' })); return; }
      var felter = [];
      rader.forEach(function (r) {
        var tekst = 'Generasjon M – oppsummering fra besøk\n' + (r.steder ? r.steder.navn : '') + ', ' + dato(r.dato) + '\n\n' + (r.oppsummering || '') +
          (r.dagens_generasjonsmote ? '\n\nDagens generasjonsmøte:\n«' + r.dagens_generasjonsmote + '»' : '') + '\n\nVennlig hilsen\nGenerasjon M ' + kommuneNavn();
        var ta = h('textarea', { class: 'input', rows: 9, 'aria-label': 'Tekst til kommunen' }); ta.value = tekst;
        felter.push(ta);
        var knapp = h('button', { type: 'button', class: 'btn blue small' }, 'Kopier tekst');
        knapp.onclick = function () { kopier(ta.value, knapp, 'Kopier tekst'); };
        body.appendChild(h('article', { class: 'card stack gap14', style: 'padding:22px;gap:14px' },
          h('div', { class: 'stack gap4' }, h('h2', { style: 'margin:0;font-size:19px;font-weight:800', text: r.steder ? r.steder.navn : '' }), h('span', { class: 'small muted', text: dato(r.dato) + ' · besøksleder ' + r.besoksleder })),
          r.dagens_generasjonsmote ? h('div', { class: 'card yellow stack gap6', style: 'padding:14px 16px' },
            h('span', { style: 'font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase', text: 'Dagens generasjonsmøte' }),
            h('span', { style: 'font-size:16px;font-weight:600;line-height:1.45', text: '«' + r.dagens_generasjonsmote + '»' })) : null,
          h('label', { class: 'field' }, 'Tekst til kommunen', ta), h('div', null, knapp)));
      });
      alle.onclick = function () { kopier(felter.map(function (f) { return f.value; }).join('\n\n— — —\n\n'), alle, 'Kopier alle'); };
    });
  }
  function kopier(tekst, knapp, label) {
    function vis(t) { knapp.textContent = t; setTimeout(function () { knapp.textContent = label; }, 2500); }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(tekst).then(function () { vis('Kopiert!'); }, function () { vis('Marker og kopier manuelt'); });
    else vis('Marker og kopier manuelt');
  }

  // ---------- Ukas utfordring ----------
  var FORSLAG = [
    'Få med [antall] nye beboere på en aktivitet',
    'Få [antall] beboere fra rommet til fellesarealet',
    'Få med [antall] beboere som vanligvis ikke ønsker å delta, i minst 15 minutter',
    'Få [antall] stille beboere til å fortelle en historie for gruppen',
    'Få [antall] beboere med på to ulike aktiviteter i løpet av besøket',
    'Få [antall] beboere som har sagt nei to ganger, med på hele aktiviteten'
  ];
  function visUtfordring() {
    var naa = new Date(); var neste = new Date(naa.getTime() + 7 * 86400000);
    var valg = A.utfUke || isoUke(neste);
    var ukeSel = h('select', { class: 'input', style: 'width:auto', 'aria-label': 'Uke' });
    [isoUke(naa), isoUke(neste), isoUke(new Date(naa.getTime() + 14 * 86400000))].forEach(function (u) {
      var o = h('option', { value: u.aar + '-' + u.uke, text: 'Uke ' + u.uke + ' ' + u.aar }); if (u.aar === valg.aar && u.uke === valg.uke) o.selected = true; ukeSel.appendChild(o);
    });
    ukeSel.onchange = function () { var p = ukeSel.value.split('-'); A.utfUke = { aar: +p[0], uke: +p[1] }; skall(); };
    var body = h('div', { class: 'stack gap20' }, laster());
    innhold.appendChild(header(kommuneNavn(), 'Ukas utfordring', 'Skriv utfordringen én gang. Hvert sted får sitt eget tall, foreslått ut fra antall beboere og om forrige utfordring ble fullført.', ukeSel));
    innhold.appendChild(body);
    var steder = stederIKommune().filter(function (s) { return s.aktiv; });
    gm.from('utfordringer').select('*, utfordring_tall(*)').eq('kommune_id', A.kommuneId).eq('aar', valg.aar).eq('uke', valg.uke).maybeSingle().then(function (res) {
      var eks = res.data;
      var U = { tekst: eks ? eks.tekst : FORSLAG[2], nivaa: eks ? eks.nivaa : 'vanskelig', publisert: eks ? eks.publisert : false, tall: {}, overstyrt: {}, forslag: {} };
      if (eks) eks.utfordring_tall.forEach(function (t) { U.tall[t.sted_id] = t.tall; U.overstyrt[t.sted_id] = t.overstyrt; });
      body.textContent = '';
      var ta = h('textarea', { class: 'input', rows: 2, maxlength: 300, style: 'font-size:17px' }); ta.value = U.tekst;
      var status = h('div', { class: 'hidden', role: 'status' });
      var radBoks = h('div', { class: 'stack gap10' });
      var nivKnapper = [];
      function hentForslag() {
        return Promise.all(steder.map(function (s) {
          return gm.rpc('foreslatt_tall', { p_sted: s.id, p_nivaa: U.nivaa }).then(function (r) { U.forslag[s.id] = r.data || 1; if (!U.overstyrt[s.id]) U.tall[s.id] = U.forslag[s.id]; });
        })).then(tegnRader);
      }
      function tegnRader() {
        radBoks.textContent = '';
        if (!steder.length) { radBoks.appendChild(h('p', { class: 'muted', text: 'Ingen aktive steder. Legg til steder under «Kommuner og steder».' })); return; }
        steder.forEach(function (s) {
          var verdi = h('span', { class: 'num', text: String(U.tall[s.id]) });
          var prev = h('span', { style: 'font-size:14px;line-height:1.4' });
          var merke = h('span', { class: 'badge', style: 'background:var(--pink)', text: 'Overstyrt' });
          function oppd() { verdi.textContent = String(U.tall[s.id]); prev.textContent = '«' + ta.value.split('[antall]').join(String(U.tall[s.id])) + '»'; merke.classList.toggle('hidden', !U.overstyrt[s.id]); }
          function sett(v) { U.tall[s.id] = Math.max(1, v); U.overstyrt[s.id] = U.tall[s.id] !== U.forslag[s.id]; oppd(); }
          radBoks.appendChild(h('div', { class: 'row wrap gap16', style: 'padding:16px;border-radius:16px;background:var(--bg)' },
            h('div', { class: 'stack gap4', style: 'flex:1 1 280px;min-width:0' }, h('span', { style: 'font-size:16px;font-weight:700', text: s.navn }), h('span', { class: 'small muted', text: s.beboere + ' beboere · foreslått: ' + U.forslag[s.id] }), prev),
            h('div', { class: 'row gap10' }, merke,
              h('button', { type: 'button', class: 'round', style: 'background:#fff', 'aria-label': 'Senk tallet for ' + s.navn, onclick: function () { sett(U.tall[s.id] - 1); } }, '−'), verdi,
              h('button', { type: 'button', class: 'round solid', 'aria-label': 'Øk tallet for ' + s.navn, onclick: function () { sett(U.tall[s.id] + 1); } }, '+'))));
          oppd();
          ta.addEventListener('input', oppd);
        });
      }
      ta.oninput = function () { U.tekst = ta.value; };
      var nivaaer = h('div', { class: 'chips' }, ['middels', 'vanskelig', 'ekstra'].map(function (n) {
        var b = h('button', { type: 'button', class: 'chip', 'aria-pressed': String(U.nivaa === n), text: NIVAA[n] });
        b.onclick = function () { U.nivaa = n; nivKnapper.forEach(function (k, i) { k.setAttribute('aria-pressed', String(['middels', 'vanskelig', 'ekstra'][i] === n)); }); hentForslag(); };
        nivKnapper.push(b); return b;
      }));
      function lagreUtf(publiser) {
        if (ta.value.indexOf('[antall]') < 0) { melding(status, 'Teksten må inneholde [antall].'); return; }
        var rad = { kommune_id: A.kommuneId, aar: valg.aar, uke: valg.uke, tekst: ta.value.trim(), nivaa: U.nivaa, publisert: publiser, opprettet_av: A.bruker.email };
        gm.from('utfordringer').upsert(rad, { onConflict: 'kommune_id,aar,uke' }).select('id').single().then(function (r) {
          if (r.error) { melding(status, feilmelding(r.error)); return; }
          var tall = steder.map(function (s) { return { utfordring_id: r.data.id, sted_id: s.id, tall: U.tall[s.id], overstyrt: !!U.overstyrt[s.id] }; });
          gm.from('utfordring_tall').upsert(tall, { onConflict: 'utfordring_id,sted_id' }).then(function (r2) {
            if (r2.error) { melding(status, feilmelding(r2.error)); return; }
            U.publisert = publiser;
            melding(status, publiser ? 'Publisert for uke ' + valg.uke + '. M-vennene ser utfordringen fra mandag den uka.' : 'Lagret som utkast.', 'ok');
          });
        });
      }
      body.appendChild(h('section', { class: 'card stack gap16', style: 'padding:24px' },
        eks && eks.publisert ? h('div', { class: 'ok', text: 'Denne uka er allerede publisert. Endringer lagres når du publiserer på nytt.' }) : null,
        h('label', { class: 'field', style: 'font-size:15px;font-weight:700' }, 'Utfordringen', h('span', { class: 'small muted', style: 'font-weight:500', text: 'Skriv [antall] der tallet skal stå.' }), ta),
        h('div', { class: 'stack gap8' }, h('span', { class: 'small muted', style: 'font-weight:700', text: 'Forslag' }), h('div', { class: 'chips' }, FORSLAG.map(function (f) {
          return h('button', { type: 'button', class: 'chip', style: 'background:var(--bg);font-size:13px;text-align:left;padding:6px 14px', onclick: function () { ta.value = f; ta.dispatchEvent(new Event('input')); } }, f);
        }))),
        h('fieldset', null, h('legend', { text: 'Vanskelighetsgrad' }), nivaaer)));
      body.appendChild(h('section', { class: 'card stack gap14', style: 'padding:24px' },
        h('h2', { class: 'display h2', text: 'Tall per sted' }), radBoks,
        status,
        h('div', { class: 'row wrap gap10', style: 'justify-content:flex-end' },
          h('button', { type: 'button', class: 'btn ghost', onclick: function () { U.overstyrt = {}; hentForslag(); } }, 'Bruk foreslåtte tall'),
          h('button', { type: 'button', class: 'btn ghost', onclick: function () { lagreUtf(false); } }, 'Lagre utkast'),
          h('button', { type: 'button', class: 'btn blue', onclick: function () { lagreUtf(true); } }, 'Publiser for uke ' + valg.uke))));
      hentForslag();
    });
  }

  // ---------- Mål ----------
  function visMal() {
    var periodeInp = h('input', { class: 'input', style: 'max-width:240px', 'aria-label': 'Periode' });
    periodeInp.value = A.malPeriode || ((new Date().getMonth() >= 7 ? 'Høst ' : 'Vår ') + new Date().getFullYear());
    var body = h('div', { class: 'stack gap16' }, laster());
    innhold.appendChild(header(kommuneNavn(), 'Mål', 'Sett målene for perioden. Fremdriften regnes ut fra besøkene i den valgte perioden i Oversikt.', h('label', { class: 'field' }, 'Periode', periodeInp)));
    innhold.appendChild(body);
    periodeInp.onchange = function () { A.malPeriode = periodeInp.value.trim(); skall(); };
    var q = gm.from('besok_statistikk').select('*').eq('kommune_id', A.kommuneId); var fra = fraDato(); if (fra) q = q.gte('dato', fra);
    Promise.all([gm.from('kommune_maal').select('*').eq('kommune_id', A.kommuneId).eq('periode', periodeInp.value).maybeSingle(), q]).then(function (r) {
      body.textContent = '';
      var m = r[0].data || { generasjonsmoter: null, stemningsloft: null, maal_nadd_pct: null, utfordring_pct: null };
      var rader = r[1].data || [];
      var T = 0, loft = [], ja = 0, svar = 0, ok = 0, utf = 0;
      rader.forEach(function (x) { T += x.generasjonsmoter; if (x.stemningsloft !== null) loft.push(x.stemningsloft); if (x.maal_svar) { svar++; if (x.maal_svar === 'ja') ja++; } if (x.utfordring_fullfort !== null) { utf++; if (x.utfordring_fullfort) ok++; } });
      var naa = { generasjonsmoter: T, stemningsloft: loft.length ? loft.reduce(function (a, b) { return a + b; }, 0) / loft.length : null, maal_nadd_pct: svar ? Math.round(ja / svar * 100) : null, utfordring_pct: utf ? Math.round(ok / utf * 100) : null };
      var inputs = {};
      var defs = [['generasjonsmoter', 'Generasjonsmøter', 'Antall i perioden', '1'], ['stemningsloft', 'Stemningsløft', 'Snitt per besøk (f.eks. 1,0)', '0.1'], ['maal_nadd_pct', 'Mål nådd (%)', 'Andel besøk der målet ble nådd', '1'], ['utfordring_pct', 'Utfordringer fullført (%)', 'Andel av ukas utfordringer', '1']];
      body.appendChild(h('div', { style: 'display:grid;grid-template-columns:repeat(auto-fit,minmax(min(260px,100%),1fr));gap:16px' }, defs.map(function (d) {
        var inp = h('input', { class: 'input', type: 'number', step: d[3], min: d[0] === 'stemningsloft' ? '-4' : '0', max: d[0].indexOf('pct') > 0 ? '100' : null, style: 'font-size:24px;font-weight:900' });
        if (m[d[0]] !== null) inp.value = m[d[0]];
        inputs[d[0]] = inp;
        var mal = m[d[0]], n = naa[d[0]], pct = mal ? Math.max(0, Math.min(100, (n || 0) / mal * 100)) : 0;
        return h('div', { class: 'card stack gap12', style: 'padding:22px' },
          h('label', { class: 'field', style: 'font-size:16px;font-weight:700' }, d[1], h('span', { class: 'small muted', style: 'font-weight:500', text: d[2] }), inp),
          h('div', { class: 'bar' }, h('div', { style: 'width:' + pct + '%;background:' + (mal && n >= mal ? 'var(--green)' : 'var(--blue)') })),
          h('span', { class: 'small muted', text: 'Nå: ' + (n === null ? '–' : (d[0] === 'stemningsloft' ? nb(n, 1) : n + (d[0].indexOf('pct') > 0 ? ' %' : ''))) + (mal ? (n >= mal ? ' · målet er nådd' : ' · ' + Math.round(pct) + ' % av målet') : '') }));
      })));
      var status = h('div', { class: 'hidden', role: 'status' });
      body.appendChild(status);
      body.appendChild(h('div', { class: 'row', style: 'justify-content:flex-end' }, h('button', { type: 'button', class: 'btn blue', onclick: function () {
        var rad = { kommune_id: A.kommuneId, periode: periodeInp.value.trim(), oppdatert: new Date().toISOString() };
        Object.keys(inputs).forEach(function (k) { rad[k] = inputs[k].value === '' ? null : Number(inputs[k].value); });
        gm.from('kommune_maal').upsert(rad, { onConflict: 'kommune_id,periode' }).then(function (res) {
          if (res.error) melding(status, feilmelding(res.error)); else { A.malPeriode = rad.periode; skall(); }
        });
      } }, 'Lagre mål')));
    });
  }

  // ---------- Kommuner og steder ----------
  function lagKode(kommune, sted) {
    var tegn = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', buf = new Uint32Array(6), s = '';
    crypto.getRandomValues(buf);
    for (var i = 0; i < 6; i++) s += tegn[buf[i] % tegn.length];
    function pre(x) { return (x || '').normalize('NFD').replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase() || 'GM'; }
    return pre(kommune) + '-' + pre(sted) + '-' + s;
  }
  function visSteder() {
    innhold.appendChild(header(null, 'Kommuner og steder', 'M-vennene logger på et sted med en stedskode. Koden vises bare én gang når den lages. Lag en ny hvis den er glemt eller kommet på avveie.'));
    A.kommuner.forEach(function (k) {
      var steder = A.steder.filter(function (s) { return s.kommune_id === k.id; });
      var navnInp = h('input', { class: 'input', placeholder: 'Navn på sted og avdeling', maxlength: 150 });
      var feil = h('div', { class: 'hidden' });
      var nyttForm = h('form', { class: 'row wrap gap10', style: 'align-items:flex-end' }, h('label', { class: 'field', style: 'flex:1 1 260px' }, 'Nytt sted i ' + k.navn, navnInp), h('button', { type: 'submit', class: 'btn' }, 'Legg til sted'));
      nyttForm.onsubmit = function (e) {
        e.preventDefault(); var n = navnInp.value.trim(); if (!n) return;
        gm.from('steder').insert({ kommune_id: k.id, navn: n, beboere: 10 }).then(function (r) { if (r.error) melding(feil, feilmelding(r.error)); else lastGrunndata().then(skall); });
      };
      innhold.appendChild(h('section', { class: 'card stack gap12', style: 'padding:24px' },
        h('div', { class: 'row', style: 'justify-content:space-between;align-items:baseline' }, h('h2', { class: 'display', style: 'font-size:24px', text: k.navn }), h('span', { class: 'small muted', text: steder.length + (steder.length === 1 ? ' sted' : ' steder') })),
        steder.map(function (s) { return stedRad(k, s); }), feil, nyttForm));
    });
    var komInp = h('input', { class: 'input', placeholder: 'Navn på kommunen', maxlength: 100 });
    var feil = h('div', { class: 'hidden' });
    var f = h('form', { class: 'row wrap gap10', style: 'align-items:flex-end;padding:22px;border-radius:20px;border:2px dashed var(--input)' }, h('label', { class: 'field', style: 'flex:1 1 260px;font-size:15px;font-weight:700' }, 'Ny kommune', komInp), h('button', { type: 'submit', class: 'btn blue' }, 'Legg til kommune'), feil);
    f.onsubmit = function (e) {
      e.preventDefault(); var n = komInp.value.trim(); if (!n) return;
      gm.from('kommuner').insert({ navn: n }).then(function (r) { if (r.error) melding(feil, feilmelding(r.error)); else lastGrunndata().then(skall); });
    };
    innhold.appendChild(f);
  }
  function stedRad(k, s) {
    var beb = h('input', { class: 'input', type: 'number', min: '0', max: '1000', style: 'width:96px', 'aria-label': 'Beboere på ' + s.navn }); beb.value = s.beboere;
    beb.onchange = function () { gm.from('steder').update({ beboere: Math.max(0, Number(beb.value) || 0) }).eq('id', s.id).then(function () { s.beboere = Number(beb.value); }); };
    var aktiv = h('button', { type: 'button', class: 'chip', 'aria-pressed': String(s.aktiv), text: s.aktiv ? 'Aktiv' : 'Inaktiv' });
    aktiv.onclick = function () { gm.from('steder').update({ aktiv: !s.aktiv }).eq('id', s.id).then(function (r) { if (!r.error) { s.aktiv = !s.aktiv; aktiv.setAttribute('aria-pressed', String(s.aktiv)); aktiv.textContent = s.aktiv ? 'Aktiv' : 'Inaktiv'; } }); };
    var kodeStatus = h('span', { class: 'small muted', text: 'Sjekker kode …' });
    var kodeVis = h('div', { class: 'hidden' });
    var kodeKnapp = h('button', { type: 'button', class: 'btn ghost small' }, 'Lag ny stedskode');
    gm.rpc('har_stedskode', { p_sted: s.id }).then(function (r) { kodeStatus.textContent = r.data ? 'Har stedskode' : 'Mangler stedskode'; if (!r.data) kodeStatus.style.color = '#8A1F6B'; });
    kodeKnapp.onclick = function () {
      if (kodeStatus.textContent === 'Har stedskode' && !confirm('Lage ny kode? Den gamle slutter å virke med en gang, og M-vennene må skrive inn den nye.')) return;
      var kode = lagKode(k.navn, s.navn);
      gm.rpc('sett_stedskode', { p_sted: s.id, p_kode: kode }).then(function (r) {
        if (r.error) { alert(feilmelding(r.error)); return; }
        kodeStatus.textContent = 'Har stedskode'; kodeStatus.style.color = '';
        kodeVis.className = 'card yellow row wrap gap12'; kodeVis.textContent = '';
        var kb = h('button', { type: 'button', class: 'btn small' }, 'Kopier');
        kb.onclick = function () { kopier(kode, kb, 'Kopier'); };
        kodeVis.appendChild(h('div', { class: 'stack gap4 grow' }, h('span', { class: 'small', style: 'font-weight:700', text: 'Ny stedskode – vises bare nå' }), h('span', { style: 'font-size:24px;font-weight:900;letter-spacing:.08em', text: kode })));
        kodeVis.appendChild(kb);
      });
    };
    return h('div', { class: 'stack gap10', style: 'padding:14px 16px;border-radius:14px;background:var(--bg)' },
      h('div', { class: 'row wrap gap12' },
        h('div', { class: 'stack gap4', style: 'flex:1 1 240px;min-width:0' }, h('span', { style: 'font-size:15px;font-weight:700', text: s.navn }), kodeStatus),
        h('label', { class: 'row gap8 small', style: 'font-weight:600' }, 'Beboere', beb), aktiv, kodeKnapp),
      kodeVis);
  }

  // ---------- Administratorer ----------
  function visAdmins() {
    var body = h('div', { class: 'stack gap12' }, laster());
    innhold.appendChild(header(null, 'Administratorer', 'Bare personer på listen kan logge inn, og bare med Google-kontoer på @' + DOMENE + '.'));
    innhold.appendChild(body);
    function last() {
      gm.from('admins').select('*').order('epost').then(function (r) {
        body.textContent = '';
        (r.data || []).forEach(function (a) {
          var meg = a.epost === (A.bruker.email || '').toLowerCase();
          body.appendChild(h('div', { class: 'card row wrap gap12' },
            h('div', { class: 'stack gap4 grow' }, h('span', { style: 'font-weight:700', text: a.navn || a.epost }), h('span', { class: 'small muted', text: a.epost + (meg ? ' (deg)' : '') })),
            meg ? null : h('button', { type: 'button', class: 'btn ghost small', onclick: function () {
              if (!confirm('Fjerne tilgangen til ' + a.epost + '?')) return;
              gm.from('admins').delete().eq('epost', a.epost).then(last);
            } }, 'Fjern tilgang')));
        });
        var ep = h('input', { class: 'input', type: 'email', placeholder: 'navn@' + DOMENE, required: true });
        var nv = h('input', { class: 'input', placeholder: 'Navn (valgfritt)', maxlength: 100 });
        var feil = h('div', { class: 'hidden' });
        var f = h('form', { class: 'card stack gap12', style: 'border:2px dashed var(--input)' }, h('span', { style: 'font-weight:700', text: 'Legg til administrator' }),
          h('div', { class: 'row wrap gap10' }, h('div', { style: 'flex:1 1 240px' }, ep), h('div', { style: 'flex:1 1 200px' }, nv), h('button', { type: 'submit', class: 'btn blue' }, 'Gi tilgang')), feil);
        f.onsubmit = function (e) {
          e.preventDefault();
          var epost = ep.value.trim().toLowerCase();
          if (!/@/.test(epost) || epost.split('@')[1] !== DOMENE) { melding(feil, 'E-posten må slutte på @' + DOMENE + '.'); return; }
          gm.from('admins').insert({ epost: epost, navn: nv.value.trim() || null }).then(function (r) { if (r.error) melding(feil, feilmelding(r.error)); else last(); });
        };
        body.appendChild(f);
      });
    }
    last();
  }

  start();
})();
