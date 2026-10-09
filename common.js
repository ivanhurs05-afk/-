(function () {
  'use strict';
  var L = window.LEGAL || {};
  var METRIKA_ID = 113578987;

  /* ---- fill operator data ---- */
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  document.querySelectorAll('[data-legal]').forEach(function (el) {
    var k = el.getAttribute('data-legal');
    var v = L[k];
    if (v) { el.innerHTML = esc(v); } else if (el.hasAttribute('data-hide-empty')) { el.hidden = true; }
  });
  document.querySelectorAll('[data-legal-row]').forEach(function (el) {
    if (!L[el.getAttribute('data-legal-row')]) el.hidden = true;
  });
  document.querySelectorAll('[data-site]').forEach(function (el) { el.textContent = location.host + location.pathname.replace(/[^/]*$/, ''); });

  /* ---- optional Yandex Form (hosted in RF) ---- */
  var yf = document.getElementById('yaform');
  if (yf && /^https:\/\/forms\.yandex\.(ru|com)\//.test(L.yandexFormUrl || '')) {
    var fr = document.createElement('iframe');
    fr.src = L.yandexFormUrl; fr.title = 'Форма заявки'; fr.loading = 'lazy';
    yf.appendChild(fr); yf.hidden = false;
  }

  /* ---- Yandex.Metrika: only after consent ---- */
  var KEY = 'cookie-consent';
  function get() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }
  function set(v) { try { localStorage.setItem(KEY, v); } catch (e) {} }
  var loaded = false;
  function loadMetrika() {
    if (loaded) return; loaded = true;
    (function (m, e, t, r, i, k, a) {
      m[i] = m[i] || function () { (m[i].a = m[i].a || []).push(arguments); };
      m[i].l = 1 * new Date();
      for (var j = 0; j < document.scripts.length; j++) { if (document.scripts[j].src === r) { return; } }
      k = e.createElement(t); a = e.getElementsByTagName(t)[0]; k.async = 1; k.src = r; a.parentNode.insertBefore(k, a);
    })(window, document, 'script', 'https://mc.yandex.ru/metrika/tag.js?id=' + METRIKA_ID, 'ym');
    window.ym(METRIKA_ID, 'init', { ssr: true, webvisor: true, clickmap: true, ecommerce: 'dataLayer', referrer: document.referrer, url: location.href, accurateTrackBounce: true, trackLinks: true });
  }
  if (get() === 'yes') loadMetrika();
  if (get() === 'no') window['disableYaCounter' + METRIKA_ID] = true;

  /* ---- cookie banner ---- */
  var bar = document.getElementById('cookie');
  function show() { if (bar) bar.hidden = false; }
  function hide() { if (bar) bar.hidden = true; }
  if (bar) {
    if (!get()) show();
    bar.querySelector('[data-cookie="yes"]').addEventListener('click', function () { set('yes'); hide(); loadMetrika(); });
    bar.querySelector('[data-cookie="no"]').addEventListener('click', function () {
      var was = get(); set('no'); hide(); window['disableYaCounter' + METRIKA_ID] = true;
      if (was === 'yes') location.reload();
    });
  }
  document.querySelectorAll('[data-cookie-settings]').forEach(function (a) {
    a.addEventListener('click', function (e) { e.preventDefault(); show(); });
  });
})();
