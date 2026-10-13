(function () {
  var KODE_KEY = 'gm_stedskode';
  var SIGNALER = ['Latter og smil', 'Beboere tok initiativ', 'Fortalte historier', 'Sang eller musikk', 'Fysisk aktivitet', 'Ba oss komme igjen', 'Uro eller tristhet', 'Noen ble ikke nådd'];
  var AKTIVITETER = ['Samtale', 'Spill', 'Musikk', 'Bevegelse', 'Kreativt', 'Utetur', 'Annet'];
  var AKT_FORSLAG = { Samtale: 'en felles samtale', Spill: 'et spill', Musikk: 'allsang', Bevegelse: 'trim', Kreativt: 'en kreativ aktivitet', Utetur: 'en tur ute' };
  var AVVIK = ['Forsinkelse', 'Sykdom', 'Vanskelig situasjon', 'Samarbeid i teamet', 'Utstyrsbehov', 'Positiv tilbakemelding'];
  var FJES = [['Svært lav', 'M12 26 Q18 19 24 26'], ['Lav', 'M12 25 Q18 21.5 24 25'], ['Nøytral', 'M12 23.5 L24 23.5'], ['God', 'M12 22 Q18 26 24 22'], ['Svært god', 'M11 21 Q18 29.5 25 21']];

  var main = document.getElementById('main');
  var footer = document.getElementById('footer');
  var stepLabel = document.getElementById('steplabel');
  var progress = document.getElementById('progress').children;

  function lagre(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function hent(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function slett(k) { try { localStorage.removeItem(k); } catch (e) {} }
  function idag() { var d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }

  function nyRapport() {
    return {
      dato: idag(), besoksleder: hent('gm_leder') || '', m_venner: 4,
      kontakt_hoy: 0, kontakt_middels: 0, kontakt_lav: 0,
      stemning_for: null, stemning_etter: null, signaler: [], dagens_generasjonsmote: '',
      aktiviteter: [], maal_tekst: '', maal_svar: null, utfordring_resultat: 0,
      personal_dialog: null, neste_gang: '', avvik: [], kommentar: ''
    };
  }

  var S = { kode: hent(KODE_KEY), sted: null, steg: 0, r: nyRapport(), feil: '', sender: false, svar: null };

  function svg(path) {
    var ns = 'http://www.w3.org/2000/svg';
    var s = document.createElementNS(ns, 'svg');
    s.setAttribute('width', '34'); s.setAttribute('height', '34'); s.setAttribute('viewBox', '0 0 36 36');
    s.setAttribute('fill', 'none'); s.setAttribute('stroke', 'currentColor'); s.setAttribute('stroke-width', '2.2'); s.setAttribute('stroke-linecap', 'round'); s.setAttribute('aria-hidden', 'true');
    var c = document.createElementNS(ns, 'circle'); c.setAttribute('cx', 18); c.setAttribute('cy', 18); c.setAttribute('r', 15); s.appendChild(c);
    [13, 23].forEach(function (x) { var e = document.createElementNS(ns, 'circle'); e.setAttribute('cx', x); e.setAttribute('cy', 15); e.setAttribute('r', 1.3); e.setAttribute('fill', 'currentColor'); e.setAttribute('stroke', 'none'); s.appendChild(e); });
    var p = document.createElementNS(ns, 'path'); p.setAttribute('d', path); s.appendChild(p);
    return s;
  }

  function tittel(t, under) {
    return h('div', { class: 'stack gap6' }, h('h1', { class: 'display h1', text: t }), under ? h('p', { class: 'muted', style: 'margin:0;font-size:15px;line-height:1.45', text: under }) : null);
  }
  function teller(label, under, felt, min, farge) {
    var verdi = h('span', { class: 'num', text: String(S.r[felt]) });
    function sett(v) { S.r[felt] = Math.max(min, v); verdi.textContent = String(S.r[felt]); if (S.onChange) S.onChange(); }
    return h('div', { class: 'card row gap12', style: 'padding:14px 14px 14px 16px' },
      h('div', { class: 'stack gap4 grow' },
        h('span', { class: 'row gap8', style: 'font-size:16px;font-weight:700' }, farge ? h('span', { class: 'dot', style: 'background:' + farge }) : null, label),
        under ? h('span', { class: 'small muted', style: 'line-height:1.35', text: under }) : null),
      h('button', { type: 'button', class: 'round', 'aria-label': 'Trekk fra én (' + label + ')', onclick: function () { sett(S.r[felt] - 1); } }, '−'),
      verdi,
      h('button', { type: 'button', class: 'round solid', 'aria-label': 'Legg til én (' + label + ')', onclick: function () { sett(S.r[felt] + 1); } }, '+'));
  }
  function chips(liste, felt) {
    return h('div', { class: 'chips' }, liste.map(function (x) {
      var b = h('button', { type: 'button', class: 'chip', 'aria-pressed': String(S.r[felt].indexOf(x) >= 0), text: x });
      b.onclick = function () {
        var i = S.r[felt].indexOf(x);
        if (i >= 0) S.r[felt].splice(i, 1); else S.r[felt].push(x);
        b.setAttribute('aria-pressed', String(i < 0));
        if (S.onChange) S.onChange();
      };
      return b;
    }));
  }
  function skala(felt, verdier, cols) {
    var knapper = verdier.map(function (v) {
      var b = h('button', { type: 'button', 'aria-pressed': String(S.r[felt] === v[0]), text: v[1] });
      b.onclick = function () { S.r[felt] = v[0]; knapper.forEach(function (k, i) { k.setAttribute('aria-pressed', String(verdier[i][0] === v[0])); }); if (S.onChange) S.onChange(); };
      return b;
    });
    return h('div', { class: 'seg', style: 'grid-template-columns:repeat(' + cols + ',minmax(0,1fr))' }, knapper);
  }
  function fjes(felt) {
    var knapper = FJES.map(function (f, i) {
      var b = h('button', { type: 'button', class: 'face', 'aria-pressed': String(S.r[felt] === i + 1) }, svg(f[1]), h('span', { text: f[0] }));
      b.onclick = function () { S.r[felt] = i + 1; knapper.forEach(function (k, j) { k.setAttribute('aria-pressed', String(j === i)); }); if (S.onChange) S.onChange(); };
      return b;
    });
    return h('div', { class: 'faces' }, knapper);
  }
  function tekstfelt(label, felt, opts) {
    opts = opts || {};
    var el = h(opts.rader ? 'textarea' : 'input', { class: 'input', rows: opts.rader || null, type: opts.rader ? null : (opts.type || 'text'), placeholder: opts.placeholder || null, maxlength: opts.max || null, autocomplete: opts.autocomplete || 'off' });
    el.value = S.r[felt] || '';
    el.oninput = function () { S.r[felt] = el.value; if (S.onChange) S.onChange(); };
    return h('label', { class: 'field' }, label, opts.hint ? h('span', { class: 'small muted', style: 'font-weight:500', text: opts.hint }) : null, el);
  }

  function knapper(liste) {
    footer.textContent = '';
    liste.forEach(function (k) { if (k) footer.appendChild(k); });
  }

  function render() {
    S.onChange = null;
    main.textContent = '';
    window.scrollTo(0, 0);
    var steg = S.steg;
    for (var i = 0; i < 5; i++) progress[i].className = (steg >= 1 && i < steg) || steg === 6 ? 'on' : '';
    stepLabel.textContent = steg >= 1 && steg <= 5 ? 'Steg ' + steg + ' av 5' : (steg === 6 ? 'Ferdig' : '');
    ({ 0: visKode, 1: visBesok, 2: visMoter, 3: visStemning, 4: visMal, 5: visPersonal, 6: visKvittering })[steg]();
  }

  function neste(validering) {
    return h('button', { type: 'button', class: 'btn', style: 'flex:1', onclick: function () {
      var f = validering ? validering() : '';
      if (f) { visFeil(f); return; }
      S.steg++; render();
    } }, 'Neste');
  }
  function tilbake() { return h('button', { type: 'button', class: 'btn ghost', onclick: function () { S.steg--; render(); } }, 'Tilbake'); }
  function visFeil(t) {
    var gammel = document.getElementById('feil'); if (gammel) gammel.remove();
    main.insertBefore(h('div', { id: 'feil', class: 'error', role: 'alert', style: 'margin-bottom:16px', text: t }), main.firstChild);
    window.scrollTo(0, 0);
  }

  // Steg 0: stedskode
  function visKode() {
    var inp = h('input', { class: 'input', autocomplete: 'off', autocapitalize: 'characters', spellcheck: 'false', placeholder: 'F.eks. LIER-BRA-7K2Q', style: 'text-transform:uppercase;letter-spacing:.06em' });
    var feil = h('div', { class: 'error hidden', role: 'alert' });
    var form = h('form', { class: 'stack gap20' },
      tittel('Velkommen', 'Skriv inn koden for stedet du besøker. Du får den av teamlederen. Koden huskes på denne telefonen.'),
      h('label', { class: 'field' }, 'Stedskode', inp), feil,
      h('button', { type: 'submit', class: 'btn blue' }, 'Fortsett'),
      h('p', { class: 'small muted', style: 'margin:0;line-height:1.5' }, 'Svarene lagres sikkert og leses bare av administratorer. ', h('a', { href: '/personvern.html', text: 'Les personvernerklæringen' })));
    form.onsubmit = function (e) {
      e.preventDefault();
      var kode = inp.value.trim().toUpperCase();
      if (kode.length < 8) { feil.textContent = 'Koden har minst 8 tegn.'; feil.classList.remove('hidden'); return; }
      lastSted(kode, feil);
    };
    main.appendChild(form);
    knapper([]);
    inp.focus();
  }

  function lastSted(kode, feilEl) {
    gm.rpc('hent_besokssted', { p_kode: kode }).then(function (res) {
      if (res.error) {
        if (feilEl) { feilEl.textContent = 'Fant ikke koden. Sjekk at den er skrevet riktig.'; feilEl.classList.remove('hidden'); }
        else { slett(KODE_KEY); S.kode = null; S.steg = 0; render(); }
        return;
      }
      S.kode = kode; S.sted = res.data; lagre(KODE_KEY, kode);
      S.steg = 1; render();
    });
  }

  // Steg 1
  function visBesok() {
    var u = S.sted.utfordring;
    main.appendChild(h('section', { class: 'stack gap16' },
      tittel('Om besøket'),
      h('div', { class: 'card stack gap4' },
        h('span', { class: 'small muted', style: 'font-weight:600', text: S.sted.kommune }),
        h('span', { style: 'font-size:17px;font-weight:700', text: S.sted.sted }),
        h('button', { type: 'button', class: 'small', style: 'align-self:flex-start;background:none;border:none;padding:6px 0;color:var(--blue);font-weight:600;text-decoration:underline', onclick: function () { slett(KODE_KEY); S.kode = null; S.sted = null; S.steg = 0; render(); } }, 'Bytt sted')),
      u ? h('div', { class: 'card blue stack gap10' },
        h('div', { class: 'row gap8', style: 'justify-content:space-between' },
          h('span', { class: 'display', style: 'font-size:15px', text: 'Ukas utfordring' }),
          h('span', { class: 'badge', text: { middels: 'Middels', vanskelig: 'Vanskelig', ekstra: 'Ekstra vanskelig' }[u.nivaa] })),
        h('p', { style: 'margin:0;font-size:19px;font-weight:700;line-height:1.3', text: u.tekst }),
        h('span', { class: 'small', style: 'color:#E4EDFF', text: 'Du rapporterer hvordan det gikk på slutten.' })) : null,
      tekstfelt('Dato', 'dato', { type: 'date' }),
      tekstfelt('Besøksleder', 'besoksleder', { placeholder: 'Fullt navn', max: 100, autocomplete: 'name' }),
      teller('M-venner på besøk', 'Inkludert besøksleder', 'm_venner', 1)));
    knapper([neste(function () {
      if (!S.r.besoksleder.trim()) return 'Skriv inn navnet på besøkslederen.';
      if (!S.r.dato) return 'Velg dato.';
      lagre('gm_leder', S.r.besoksleder.trim());
      return '';
    })]);
  }

  // Steg 2
  function visMoter() {
    var sum = h('span', { style: 'font-size:14px;font-weight:600' });
    var dybde = h('strong', { style: 'font-size:20px;font-weight:900' });
    var bar = h('div', { class: 'bar', style: 'background:#1F2A85' });
    function oppdater() {
      var r = S.r, t = r.kontakt_hoy + r.kontakt_middels + r.kontakt_lav;
      sum.textContent = t + ' generasjonsmøter';
      dybde.textContent = t ? Math.round((3 * r.kontakt_hoy + 2 * r.kontakt_middels + r.kontakt_lav) / (3 * t) * 100) + ' %' : '–';
      bar.textContent = '';
      [[r.kontakt_hoy, '#F7C253'], [r.kontakt_middels, '#00B36B'], [r.kontakt_lav, '#6F8DFF']].forEach(function (x) {
        bar.appendChild(h('div', { style: 'width:' + (t ? x[0] / t * 100 : 0) + '%;background:' + x[1] }));
      });
    }
    S.onChange = oppdater;
    main.appendChild(h('section', { class: 'stack gap16' },
      h('div', { class: 'stack gap6' }, h('h1', { class: 'display', style: 'font-size:26px', text: 'Generasjonsmøter' }), h('p', { class: 'muted', style: 'margin:0;font-size:15px;line-height:1.45', text: 'Tell beboere, ikke samtaler. Hver beboer telles én gang, på høyeste nivå.' })),
      teller('Høy kontakt', 'Lang samtale, mye tid sammen, eller deltok i aktivitet', 'kontakt_hoy', 0, '#F7C253'),
      teller('Middels kontakt', 'I rommet og ble tilbudt å delta, så eller lyttet, kortere prat', 'kontakt_middels', 0, '#00B36B'),
      teller('Lav kontakt', 'Hilste og inviterte, men takket nei', 'kontakt_lav', 0, '#6F8DFF'),
      h('div', { class: 'card dark stack gap10' },
        h('div', { class: 'row', style: 'justify-content:space-between;align-items:baseline' }, sum, h('span', { style: 'font-size:14px' }, 'Kontaktdybde ', dybde)),
        bar,
        h('span', { style: 'font-size:12px;line-height:1.4;color:#CDDFFF', text: 'Kontaktdybde vekter høy kontakt mest. 100 % betyr at alle fikk høy kontakt.' }))));
    oppdater();
    knapper([tilbake(), neste(function () {
      return S.r.kontakt_hoy + S.r.kontakt_middels + S.r.kontakt_lav === 0 ? 'Registrer minst ett generasjonsmøte.' : '';
    })]);
  }

  // Steg 3
  function visStemning() {
    var loft = h('div', { class: 'card yellow row hidden', style: 'justify-content:space-between' }, h('span', { style: 'font-size:15px;font-weight:700', text: 'Stemningsløft' }), h('span', { style: 'font-size:26px;font-weight:900' }));
    function oppdater() {
      var r = S.r;
      if (r.stemning_for && r.stemning_etter) {
        var d = r.stemning_etter - r.stemning_for;
        loft.lastChild.textContent = d > 0 ? '+' + d : (d < 0 ? '−' + Math.abs(d) : '0');
        loft.classList.remove('hidden');
      }
    }
    S.onChange = oppdater;
    main.appendChild(h('section', { class: 'stack gap20' },
      tittel('Stemning', 'Gi stemningen i rommet en verdi før og etter. Forskjellen er besøkets stemningsløft.'),
      h('fieldset', null, h('legend', { text: 'Da vi kom' }), fjes('stemning_for')),
      h('fieldset', null, h('legend', { text: 'Da vi dro' }), fjes('stemning_etter')),
      loft,
      h('div', { class: 'stack gap10' }, h('span', { style: 'font-size:15px;font-weight:700' }, 'Hva så dere? ', h('span', { class: 'muted', style: 'font-weight:500', text: 'Velg alle som passer' })), chips(SIGNALER, 'signaler')),
      tekstfelt('Dagens generasjonsmøte', 'dagens_generasjonsmote', { rader: 4, max: 2000, hint: 'Trekk frem ett møte mellom en M-venn og en beboer. Det løftes frem i oppsummeringen. Ikke skriv navn eller helseopplysninger.', placeholder: 'Hva skjedde, hvem tok initiativ, hvordan endret det rommet …' })));
    oppdater();
    knapper([tilbake(), neste(function () {
      return !S.r.stemning_for || !S.r.stemning_etter ? 'Velg stemning både da dere kom og da dere dro.' : '';
    })]);
  }

  // Steg 4
  function visMal() {
    var u = S.sted.utfordring;
    var forslagBoks = h('div', { class: 'card hidden stack gap10', style: 'background:var(--pink);border:none' });
    var malInput;
    function forslag() {
      var a = S.r.aktiviteter.filter(function (x) { return AKT_FORSLAG[x]; })[0];
      return 'Få minst 5 beboere med på ' + (a ? AKT_FORSLAG[a] : 'aktiviteten') + ' i 15 minutter';
    }
    function oppdater() {
      var t = S.r.maal_tekst.trim();
      if (t && !/\d/.test(t)) {
        forslagBoks.textContent = '';
        var f = forslag();
        forslagBoks.appendChild(h('span', { class: 'small', style: 'font-weight:700', text: 'Målet er vanskelig å måle. Forslag:' }));
        forslagBoks.appendChild(h('span', { style: 'font-size:16px;font-weight:700;line-height:1.35', text: '«' + f + '»' }));
        forslagBoks.appendChild(h('button', { type: 'button', class: 'btn small', style: 'align-self:flex-start', onclick: function () { S.r.maal_tekst = f; malInput.value = f; oppdater(); } }, 'Bruk forslaget'));
        forslagBoks.classList.remove('hidden');
      } else forslagBoks.classList.add('hidden');
    }
    S.onChange = oppdater;
    var malFelt = tekstfelt('Målet for besøket', 'maal_tekst', { placeholder: 'F.eks. få 5 beboere med på allsang i 15 minutter', max: 300 });
    malInput = malFelt.querySelector('input');
    var utfBoks = null;
    if (u) {
      var verdi = h('span', { class: 'num', style: 'min-width:64px;font-size:22px' });
      var ok = h('div', { class: 'ok hidden', text: 'Utfordringen er fullført!' });
      function oppdUtf() { verdi.textContent = S.r.utfordring_resultat + ' / ' + u.tall; ok.classList.toggle('hidden', S.r.utfordring_resultat < u.tall); }
      utfBoks = h('div', { class: 'card stack gap12', style: 'border:2px solid var(--blue)' },
        h('div', { class: 'stack gap4' }, h('span', { class: 'display', style: 'font-size:14px;color:var(--blue)', text: 'Ukas utfordring' }), h('span', { style: 'font-size:15px;font-weight:700;line-height:1.35', text: u.tekst })),
        h('div', { class: 'row gap12' },
          h('span', { class: 'grow', style: 'font-size:14px;font-weight:600', text: 'Hvor mange klarte dere?' }),
          h('button', { type: 'button', class: 'round', 'aria-label': 'Trekk fra én', onclick: function () { S.r.utfordring_resultat = Math.max(0, S.r.utfordring_resultat - 1); oppdUtf(); } }, '−'),
          verdi,
          h('button', { type: 'button', class: 'round solid', 'aria-label': 'Legg til én', onclick: function () { S.r.utfordring_resultat++; oppdUtf(); } }, '+')),
        ok);
      oppdUtf();
    }
    main.appendChild(h('section', { class: 'stack gap20' },
      tittel('Mål og utfordring', 'Et mål med tall og tid kan besvares med ja eller nei.'),
      h('div', { class: 'stack gap10' }, h('span', { style: 'font-size:15px;font-weight:700', text: 'Aktivitet' }), chips(AKTIVITETER, 'aktiviteter')),
      malFelt, forslagBoks,
      h('fieldset', null, h('legend', { text: 'Nådde dere målet?' }), skala('maal_svar', [['ja', 'Ja'], ['delvis', 'Delvis'], ['nei', 'Nei']], 3)),
      utfBoks));
    oppdater();
    knapper([tilbake(), neste(function () {
      if (S.r.maal_tekst.trim() && !S.r.maal_svar) return 'Svar på om dere nådde målet.';
      return '';
    })]);
  }

  // Steg 5
  function visPersonal() {
    var send = h('button', { type: 'button', class: 'btn blue', style: 'flex:1' }, 'Send rapport');
    send.onclick = function () {
      if (S.sender) return;
      S.sender = true; send.disabled = true; send.textContent = 'Sender …';
      var r = S.r, u = S.sted.utfordring;
      var payload = Object.assign({}, r, { utfordring_id: u ? u.id : null, utfordring_resultat: u ? r.utfordring_resultat : null });
      gm.rpc('send_rapport', { p_kode: S.kode, p: payload }).then(function (res) {
        S.sender = false;
        if (res.error) { send.disabled = false; send.textContent = 'Send rapport'; visFeil('Rapporten ble ikke sendt: ' + feilmelding(res.error) + '. Prøv igjen.'); return; }
        S.svar = res.data; S.steg = 6; render();
      }, function () {
        S.sender = false; send.disabled = false; send.textContent = 'Send rapport';
        visFeil('Ingen nettforbindelse. Svarene dine er ikke borte – prøv igjen når du har dekning.');
      });
    };
    main.appendChild(h('section', { class: 'stack gap20' },
      tittel('Personalet og læring', 'Det som gjør neste besøk bedre.'),
      h('fieldset', null, h('legend', { text: 'Dialogen med personalet' }),
        h('span', { class: 'small muted', style: 'display:block;margin:-6px 0 10px', text: 'Tilstedeværelse, tilgjengelighet og samarbeid' }),
        skala('personal_dialog', [[1, '1'], [2, '2'], [3, '3'], [4, '4'], [5, '5']], 5),
        h('div', { class: 'row small muted', style: 'justify-content:space-between;margin-top:6px;font-size:12px' }, h('span', { text: 'Svært dårlig' }), h('span', { text: 'Svært godt' }))),
      tekstfelt('Hva tar du med deg til neste besøk?', 'neste_gang', { rader: 3, max: 2000 }),
      h('div', { class: 'stack gap10' }, h('span', { style: 'font-size:15px;font-weight:700' }, 'Noe å melde fra om? ', h('span', { class: 'muted', style: 'font-weight:500', text: 'Valgfritt' })), chips(AVVIK, 'avvik')),
      tekstfelt('Kommentar', 'kommentar', { rader: 3, max: 2000, hint: 'Ikke skriv navn eller helseopplysninger om beboere.' })));
    knapper([tilbake(), send]);
  }

  // Kvittering
  function visKvittering() {
    var r = S.r, t = r.kontakt_hoy + r.kontakt_middels + r.kontakt_lav, d = r.stemning_etter - r.stemning_for, u = S.sted.utfordring;
    function flis(v, l, stil) { return h('div', { class: 'card stack gap4', style: stil || '' }, h('span', { style: 'font-size:30px;font-weight:900', text: v }), h('span', { class: 'small', text: l })); }
    main.appendChild(h('section', { class: 'stack gap20' },
      h('img', { src: '/img/besok-inne.jpg', alt: 'M-venn og beboer ler sammen under en aktivitet', style: 'width:100%;height:180px;object-fit:cover;object-position:center 30%;border-radius:20px' }),
      tittel('Takk, rapporten er sendt'),
      h('div', { style: 'display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px' },
        flis(String(t), 'generasjonsmøter'),
        flis(d > 0 ? '+' + d : (d < 0 ? '−' + Math.abs(d) : '0'), 'stemningsløft', 'background:var(--yellow);border:none'),
        flis(r.maal_svar ? { ja: 'Ja', delvis: 'Delvis', nei: 'Nei' }[r.maal_svar] : '–', 'målet nådd'),
        u ? flis(r.utfordring_resultat + ' / ' + u.tall, 'ukas utfordring', 'background:var(--blue);color:#fff;border:none') : null),
      h('div', { class: 'card stack gap12' },
        h('span', { class: 'display', style: 'font-size:17px', text: 'Oppsummering' }),
        h('p', { style: 'margin:0;font-size:15px;line-height:1.5', text: S.svar.oppsummering }),
        r.dagens_generasjonsmote.trim() ? h('div', { class: 'card yellow stack gap6', style: 'padding:14px 16px' },
          h('span', { style: 'font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase', text: 'Dagens generasjonsmøte' }),
          h('span', { style: 'font-size:15px;font-weight:600;line-height:1.45;white-space:pre-line', text: '«' + r.dagens_generasjonsmote.trim() + '»' })) : null,
        h('span', { class: 'small muted', text: 'Sendt til admin, som kan kopiere den og sende den til kommunen.' }))));
    knapper([h('button', { type: 'button', class: 'btn', style: 'flex:1', onclick: function () { S.r = nyRapport(); S.svar = null; S.steg = 1; lastSted(S.kode); } }, 'Ny rapport')]);
  }

  if (S.kode) lastSted(S.kode); else render();
})();
