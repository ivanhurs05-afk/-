(function () {
  'use strict';

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fmt = function (n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' '); };

  /* mobile menu */
  var burger = document.querySelector('.burger');
  var menu = document.getElementById('menu');
  burger.addEventListener('click', function () {
    var open = menu.classList.toggle('open');
    burger.setAttribute('aria-expanded', open);
  });
  menu.addEventListener('click', function (e) {
    if (e.target.tagName === 'A') {
      menu.classList.remove('open');
      burger.setAttribute('aria-expanded', 'false');
    }
  });

  /* bar charts, drawn from data-attributes */
  var charts = document.querySelectorAll('.chart');
  charts.forEach(function (el) {
    var labels = el.dataset.labels.split(',');
    var vals = el.dataset.series.split(',').map(Number);
    var max = Math.max.apply(null, vals);
    var isCost = el.classList.contains('chart--dim');
    var best = isCost ? Math.min.apply(null, vals) : max;
    var html = '<div class="chart__t">' + el.dataset.title + '</div><div class="bars">';
    vals.forEach(function (v, i) {
      html += '<div class="bar' + (v === best ? ' is-best' : '') + '" title="' + labels[i] + ': ' + fmt(v) + '">' +
        '<em>' + fmt(v) + '</em><i data-h="' + Math.max(4, Math.round(v / max * 100)) + '"></i><small>' + labels[i] + '</small></div>';
    });
    el.innerHTML = html + '</div>';
  });

  function growBars(scope) {
    scope.querySelectorAll('.bar i').forEach(function (b) {
      b.style.height = reduce ? b.dataset.h + '%' : '0';
      if (!reduce) requestAnimationFrame(function () { requestAnimationFrame(function () { b.style.height = b.dataset.h + '%'; }); });
    });
  }

  /* tabs */
  var tabs = Array.prototype.slice.call(document.querySelectorAll('.tab'));
  function select(tab, focus) {
    tabs.forEach(function (t) {
      var on = t === tab;
      t.classList.toggle('is-active', on);
      t.setAttribute('aria-selected', on);
      t.tabIndex = on ? 0 : -1;
      var p = document.getElementById(t.getAttribute('aria-controls'));
      p.hidden = !on;
      p.classList.toggle('is-active', on);
      if (on) growBars(p);
    });
    if (focus) tab.focus();
  }
  tabs.forEach(function (t, i) {
    t.addEventListener('click', function () { select(t); });
    t.addEventListener('keydown', function (e) {
      var n = null;
      if (e.key === 'ArrowRight') n = tabs[(i + 1) % tabs.length];
      if (e.key === 'ArrowLeft') n = tabs[(i - 1 + tabs.length) % tabs.length];
      if (n) { e.preventDefault(); select(n, true); }
    });
  });
  tabs.forEach(function (t, i) { t.tabIndex = i ? -1 : 0; });

  /* animate active case's bars once it scrolls into view */
  var caseWrap = document.querySelector('.case.is-active');
  document.querySelectorAll('.bar i').forEach(function (b) { b.style.height = reduce ? b.dataset.h + '%' : '0'; });
  if ('IntersectionObserver' in window && !reduce) {
    var cio = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { growBars(document.querySelector('.case.is-active')); cio.disconnect(); } });
    }, { threshold: .25 });
    cio.observe(caseWrap);
  } else {
    growBars(caseWrap);
  }

  /* reveal on scroll */
  var rv = document.querySelectorAll('.card,.process li,.faq details,.numbers__grid>div,.strip>div,.reach,.about__photo,.proj');
  rv.forEach(function (n) { n.classList.add('rv'); });
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { threshold: .08 });
    rv.forEach(function (n) { io.observe(n); });
  } else {
    rv.forEach(function (n) { n.classList.add('in'); });
  }

  /* Yandex.Metrika goals (create these goal IDs in Metrika: JavaScript event) */
  function goal(name) { try { if (window.ym) ym(113578987, 'reachGoal', name); } catch (e) {} }
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href]');
    if (!a) return;
    var h = a.getAttribute('href');
    if (h.indexOf('t.me/') > -1) goal('click_telegram');
    else if (h.indexOf('wa.me/') > -1) goal('click_whatsapp');
    else if (h.indexOf('tel:') === 0) goal('click_phone');
    else if (h.indexOf('vk.com/') > -1) goal('click_vk');
  });
  tabs.forEach(function (t) { t.addEventListener('click', function () { goal('case_tab_' + t.id.replace('t-', '')); }); });

  document.getElementById('year').textContent = new Date().getFullYear();
})();
