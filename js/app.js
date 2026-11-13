/* Tourist Spots BD — app wiring (classic scripts, no modules, works over file://) */
(function () {
  'use strict';
  var L = window.TouristLogic;
  var LS_LANG = 'tsbd-lang', LS_FAV = 'tsbd-fav', LS_TRIP = 'tsbd-trip';

  function loadJSON(key, fallback) {
    try { var v = JSON.parse(localStorage.getItem(key)); return v === null || v === undefined ? fallback : v; }
    catch (e) { return fallback; }
  }
  function saveJSON(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) {} }

  var state = {
    lang: localStorage.getItem(LS_LANG) || 'en',
    favs: loadJSON(LS_FAV, []),
    trip: loadJSON(LS_TRIP, []),
    q: '', division: 'All', category: 'All', month: 0, sort: 'name', favOnly: false
  };
  var favSet = {};
  state.favs.forEach(function (id) { favSet[id] = true; });

  function t(key, vars) {
    var s = (I18N[state.lang] && I18N[state.lang][key]) || I18N.en[key] || key;
    if (vars) Object.keys(vars).forEach(function (k) { s = s.split('{' + k + '}').join(vars[k]); });
    return s;
  }
  function bn(n) { return L.bnDigits(n, state.lang); }
  function divName(d) { return state.lang === 'bn' ? DIVISION_BN[d] : d; }
  function catName(c) { return state.lang === 'bn' ? CATEGORY_BN[c] : c; }
  function spotName(s) { return state.lang === 'bn' ? s.bn : s.name; }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

  var $ = function (id) { return document.getElementById(id); };

  function currentSpots() {
    var filtered = L.filterSpots(SPOTS, {
      q: state.q, division: state.division, category: state.category,
      month: state.month || 0, favOnly: state.favOnly, favs: favSet
    });
    return L.sortSpots(filtered, state.sort);
  }

  function renderStats() {
    $('stat-spots').textContent = bn(SPOTS.length);
    $('stat-divs').textContent = bn(DIVISIONS.length);
    $('stat-fav').textContent = bn(state.favs.length);
    $('stat-days').textContent = bn(L.tripDays(state.trip, SPOTS));
  }

  function renderChips() {
    var counts = L.countByDivision(SPOTS);
    var html = '<button class="chip' + (state.division === 'All' ? ' active' : '') + '" data-div="All">' + esc(t('divisionAll')) + ' (' + bn(SPOTS.length) + ')</button>';
    DIVISIONS.forEach(function (d) {
      html += '<button class="chip' + (state.division === d ? ' active' : '') + '" data-div="' + esc(d) + '">' + esc(divName(d)) + ' (' + bn(counts[d] || 0) + ')</button>';
    });
    $('div-chips').innerHTML = html;
    Array.prototype.forEach.call($('div-chips').querySelectorAll('.chip'), function (b) {
      b.addEventListener('click', function () { state.division = b.getAttribute('data-div'); render(); });
    });
  }

  function cardHtml(s) {
    var fav = favSet[s.id];
    var inTrip = state.trip.indexOf(s.id) !== -1;
    return '<article class="card" data-id="' + esc(s.id) + '">' +
      '<div class="card-top"><span class="badge">' + esc(divName(s.division)) + '</span>' +
      '<span class="badge cat">' + esc(catName(s.category)) + '</span>' +
      '<button class="fav-btn' + (fav ? ' on' : '') + '" data-fav="' + esc(s.id) + '" aria-label="' + esc(t('fav')) + '">' + (fav ? '★' : '☆') + '</button></div>' +
      '<h3>' + esc(spotName(s)) + '</h3>' +
      '<p class="desc">' + esc(state.lang === 'bn' ? s.descBn : s.desc) + '</p>' +
      '<p class="meta">' + esc(t('bestSeason', { s: L.seasonLabel(s.months, state.lang, MONTHS_EN, MONTHS_BN) })) + ' · ' + esc(t('daysLabel', { n: bn(s.days) })) + '</p>' +
      '<p class="meta">' + esc(t('entry', { s: L.entryLabel(s.entry, state.lang) })) + '</p>' +
      '<div class="card-actions">' +
      '<button class="btn small" data-detail="' + esc(s.id) + '">' + esc(t('details')) + '</button>' +
      '<button class="btn small primary" data-trip="' + esc(s.id) + '">' + esc(inTrip ? t('inTrip') : t('addTrip')) + '</button>' +
      '</div></article>';
  }

  function renderGrid() {
    var list = currentSpots();
    $('count').textContent = t('spotsCount', { n: bn(list.length) });
    if (!list.length) { $('grid').innerHTML = '<p class="empty">' + esc(t('noResults')) + '</p>'; return; }
    $('grid').innerHTML = list.map(cardHtml).join('');
    Array.prototype.forEach.call($('grid').querySelectorAll('[data-fav]'), function (b) {
      b.addEventListener('click', function (ev) { ev.stopPropagation(); toggleFav(b.getAttribute('data-fav')); });
    });
    Array.prototype.forEach.call($('grid').querySelectorAll('[data-detail]'), function (b) {
      b.addEventListener('click', function () { openDetail(b.getAttribute('data-detail')); });
    });
    Array.prototype.forEach.call($('grid').querySelectorAll('[data-trip]'), function (b) {
      b.addEventListener('click', function () { toggleTrip(b.getAttribute('data-trip')); });
    });
  }

  function renderTrip() {
    var el = $('trip-list');
    if (!state.trip.length) { el.innerHTML = '<p class="empty">' + esc(t('tripEmpty')) + '</p>'; }
    else {
      var byId = {}; SPOTS.forEach(function (s) { byId[s.id] = s; });
      el.innerHTML = state.trip.map(function (id) {
        var s = byId[id]; if (!s) return '';
        return '<li><span>' + esc(spotName(s)) + ' <small>· ' + esc(divName(s.division)) + ' · ' + esc(t('daysLabel', { n: bn(s.days) })) + '</small></span>' +
          '<button class="btn small" data-rm="' + esc(id) + '">' + esc(t('remove')) + '</button></li>';
      }).join('');
      Array.prototype.forEach.call(el.querySelectorAll('[data-rm]'), function (b) {
        b.addEventListener('click', function () { toggleTrip(b.getAttribute('data-rm')); });
      });
    }
    $('trip-total').textContent = t('tripTotal', { d: bn(L.tripDays(state.trip, SPOTS)), n: bn(state.trip.length) });
  }

  function renderMonthHint() {
    var m = state.month || (new Date().getMonth() + 1);
    var inSeason = SPOTS.filter(function (s) { return L.isInSeason(s, m); });
    $('month-hint').textContent = L.monthName(m, state.lang, MONTHS_EN, MONTHS_BN) + ': ' + bn(inSeason.length) + ' ' + t('statsSpots');
  }

  function applyStaticText() {
    document.documentElement.lang = state.lang === 'bn' ? 'bn' : 'en';
    $('app-title').textContent = t('title');
    $('app-sub').textContent = t('subtitle');
    $('search').placeholder = t('searchPh');
    $('lbl-cat').textContent = t('catLabel');
    $('lbl-month').textContent = t('monthPlanner');
    $('lbl-sort').textContent = '⇅';
    $('fav-only-label').textContent = t('favOnly');
    $('trip-title').textContent = t('tripTitle');
    $('btn-clear-trip').textContent = t('tripClear');
    $('btn-export').textContent = t('tripExport');
    $('btn-import').textContent = t('tripImport');
    $('footer-note').textContent = t('footer');
    $('month-hint-label').textContent = t('monthPlannerHint');
    $('lang-toggle').textContent = state.lang === 'bn' ? 'English' : 'বাংলা';
    // labels under stats
    $('lbl-spots').textContent = t('statsSpots');
    $('lbl-divs').textContent = t('statsDivisions');
    $('lbl-fav').textContent = t('statsFav');
    $('lbl-days').textContent = t('statsTripDays');
  }

  function fillSelects() {
    var cat = $('sel-cat');
    cat.innerHTML = '<option value="All">' + esc(t('categoryAll')) + '</option>' +
      CATEGORIES.map(function (c) { return '<option value="' + esc(c) + '"' + (state.category === c ? ' selected' : '') + '>' + esc(catName(c)) + '</option>'; }).join('');
    var mon = $('sel-month');
    var cur = new Date().getMonth() + 1;
    mon.innerHTML = '<option value="0">' + esc(t('monthAll')) + '</option>' +
      MONTHS_EN.map(function (m, i) {
        return '<option value="' + (i + 1) + '"' + (state.month === i + 1 ? ' selected' : '') + '>' + esc(L.monthName(i + 1, state.lang, MONTHS_EN, MONTHS_BN)) + (i + 1 === cur ? ' (' + esc(t('currentMonth')) + ')' : '') + '</option>';
      }).join('');
    var sort = $('sel-sort');
    sort.innerHTML = [['name', t('sortName')], ['division', t('sortDivision')], ['season', t('sortSeason')], ['days', t('sortDays')]]
      .map(function (kv) { return '<option value="' + kv[0] + '"' + (state.sort === kv[0] ? ' selected' : '') + '>' + esc(kv[1]) + '</option>'; }).join('');
  }

  function render() {
    applyStaticText();
    fillSelects();
    renderStats();
    renderChips();
    renderGrid();
    renderTrip();
    renderMonthHint();
  }

  function toggleFav(id) {
    if (favSet[id]) { delete favSet[id]; state.favs = state.favs.filter(function (x) { return x !== id; }); }
    else { favSet[id] = true; state.favs.push(id); }
    saveJSON(LS_FAV, state.favs);
    render();
  }

  function toggleTrip(id) {
    var i = state.trip.indexOf(id);
    if (i === -1) state.trip.push(id); else state.trip.splice(i, 1);
    saveJSON(LS_TRIP, state.trip);
    render();
  }

  function openDetail(id) {
    var s = null;
    SPOTS.forEach(function (x) { if (x.id === id) s = x; });
    if (!s) return;
    $('modal-title').textContent = spotName(s);
    $('modal-body').innerHTML =
      '<p><strong>' + esc(divName(s.division)) + '</strong> · ' + esc(catName(s.category)) + '</p>' +
      '<p>' + esc(state.lang === 'bn' ? s.descBn : s.desc) + '</p>' +
      '<p><strong>' + esc(t('seasonLabel')) + ':</strong> ' + esc(L.seasonLabel(s.months, state.lang, MONTHS_EN, MONTHS_BN)) + '</p>' +
      '<p><strong>' + esc(t('daysNeeded')) + ':</strong> ' + esc(t('daysLabel', { n: bn(s.days) })) + '</p>' +
      '<p><strong>' + esc(t('entry')) .replace('{s}', '') + '</strong> ' + esc(L.entryLabel(s.entry, state.lang)) + '</p>' +
      '<p><strong>' + esc(t('howReach')) + ':</strong> ' + esc(state.lang === 'bn' ? s.reachBn : s.reach) + '</p>' +
      '<p><strong>' + esc(t('tip')) + ':</strong> ' + esc(state.lang === 'bn' ? s.tipBn : s.tip) + '</p>';
    $('modal-trip').textContent = state.trip.indexOf(id) !== -1 ? t('inTrip') : t('addTrip');
    $('modal-trip').onclick = function () { toggleTrip(id); openDetail(id); };
    $('modal').classList.add('open');
  }

  function closeModal() { $('modal').classList.remove('open'); }

  function exportTrip() {
    var payload = { app: 'tourist-spots-bd', version: 1, trip: state.trip, favourites: state.favs };
    var blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'tourist-spots-bd-trip.json';
    document.body.appendChild(a); a.click(); a.remove();
    $('trip-msg').textContent = t('tripExported');
  }

  function importTrip(file) {
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var res = L.validateTripImport(JSON.parse(reader.result), SPOTS);
        if (!res.ok) { $('trip-msg').textContent = t('tripImportBad', { e: res.error }); return; }
        state.trip = res.trip;
        state.favs = res.favourites;
        favSet = {}; state.favs.forEach(function (id) { favSet[id] = true; });
        saveJSON(LS_TRIP, state.trip); saveJSON(LS_FAV, state.favs);
        $('trip-msg').textContent = t('tripImported', { n: bn(state.trip.length) });
        render();
      } catch (e) { $('trip-msg').textContent = t('tripImportBad', { e: 'bad-json' }); }
    };
    reader.readAsText(file);
  }

  function init() {
    $('lang-toggle').addEventListener('click', function () {
      state.lang = state.lang === 'bn' ? 'en' : 'bn';
      localStorage.setItem(LS_LANG, state.lang);
      render();
    });
    $('search').addEventListener('input', function (e) { state.q = e.target.value; renderGrid(); });
    $('sel-cat').addEventListener('change', function (e) { state.category = e.target.value; render(); });
    $('sel-month').addEventListener('change', function (e) { state.month = parseInt(e.target.value, 10) || 0; render(); });
    $('sel-sort').addEventListener('change', function (e) { state.sort = e.target.value; render(); });
    $('fav-only').addEventListener('change', function (e) { state.favOnly = e.target.checked; render(); });
    $('modal-close').addEventListener('click', closeModal);
    $('modal').addEventListener('click', function (e) { if (e.target === $('modal')) closeModal(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeModal(); });
    $('btn-clear-trip').addEventListener('click', function () {
      if (!state.trip.length) return;
      if (window.confirm(t('confirmClear'))) { state.trip = []; saveJSON(LS_TRIP, state.trip); render(); }
    });
    $('btn-export').addEventListener('click', exportTrip);
    $('btn-import').addEventListener('click', function () { $('file-import').click(); });
    $('file-import').addEventListener('change', function (e) {
      if (e.target.files && e.target.files[0]) importTrip(e.target.files[0]);
      e.target.value = '';
    });
    render();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
