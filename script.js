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

  /* reveal on scroll: staggered inside a group, cleaned up afterwards so hover transitions stay fast */
  var rv = document.querySelectorAll('.sec__head,.card,.process li,.faq details,.numbers__grid>div,.strip>div,.reach,.about__photo,.proj,.price,.price__note');
  rv.forEach(function (n) {
    var sibs = Array.prototype.filter.call(n.parentNode.children, function (c) { return c.classList && (c.className === n.className || n.parentNode.classList.contains('prices') || n.parentNode.classList.contains('proj-grid')); });
    var idx = Math.max(0, sibs.indexOf(n));
    n.style.setProperty('--d', Math.min(idx, 5) * 80 + 'ms');
    n.classList.add('rv');
  });
  function done(n) {
    var fin = function () { n.classList.remove('rv', 'in'); n.style.removeProperty('--d'); };
    var t = setTimeout(fin, 1600);
    n.addEventListener('transitionend', function h(e) { if (e.propertyName === 'transform') { clearTimeout(t); n.removeEventListener('transitionend', h); fin(); } });
  }
  if ('IntersectionObserver' in window && !reduce) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); done(e.target); io.unobserve(e.target); } });
    }, { threshold: .08 });
    rv.forEach(function (n) { io.observe(n); });
  } else {
    rv.forEach(function (n) { n.classList.remove('rv'); });
  }

  /* count-up for headline numbers */
  document.querySelectorAll('[data-count]').forEach(function (el) {
    if (reduce || !('IntersectionObserver' in window)) return;
    var end = parseFloat(el.dataset.count), dec = parseInt(el.dataset.dec || '0', 10), fin = el.textContent;
    var o = new IntersectionObserver(function (es) {
      if (!es[0].isIntersecting) return; o.disconnect();
      var t0 = performance.now(), dur = 1200;
      (function tick(now) {
        var k = Math.min(1, (now - t0) / dur), v = end * (1 - Math.pow(1 - k, 3));
        el.textContent = dec ? v.toFixed(dec).replace('.', ',') : fmt(Math.round(v));
        if (k < 1) requestAnimationFrame(tick); else el.textContent = fin;
      })(t0);
    }, { threshold: .6 });
    o.observe(el);
  });

  /* screenshot lightbox */
  var lb = document.createElement('div');
  lb.className = 'lightbox'; lb.hidden = true; lb.setAttribute('role', 'dialog'); lb.setAttribute('aria-label', 'Просмотр изображения');
  lb.innerHTML = '<button class="lightbox__x" type="button" aria-label="Закрыть">×</button><img alt="">';
  document.body.appendChild(lb);
  var lbImg = lb.querySelector('img'), lastBtn = null;
  function closeLb() { lb.hidden = true; lbImg.removeAttribute('src'); document.body.style.overflow = ''; if (lastBtn) lastBtn.focus(); }
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-full]');
    if (!b) return;
    lastBtn = b; lbImg.src = b.getAttribute('data-full'); lbImg.alt = (b.querySelector('img') || {}).alt || '';
    lb.hidden = false; document.body.style.overflow = 'hidden'; lb.querySelector('.lightbox__x').focus();
  });
  lb.addEventListener('click', closeLb);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !lb.hidden) closeLb(); });

  /* header shadow on scroll */
  var navEl = document.querySelector('.nav');
  var onScroll = function () { navEl.classList.toggle('is-scrolled', window.scrollY > 8); };
  window.addEventListener('scroll', onScroll, { passive: true }); onScroll();

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
