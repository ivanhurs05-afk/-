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
  var rv = document.querySelectorAll('.card,.process li,.faq details,.numbers__grid>div,.strip>div,.form,.about__photo,.proj');
  rv.forEach(function (n) { n.classList.add('rv'); });
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { threshold: .08 });
    rv.forEach(function (n) { io.observe(n); });
  } else {
    rv.forEach(function (n) { n.classList.add('in'); });
  }

  /* lead form: sent to Web3Forms, which emails the submission to the owner.
     Get a free Access Key at https://web3forms.com (enter your email, the key arrives by mail) and paste it below. */
  var FORM_ACCESS_KEY = '91f54bbf-3e8a-460f-8422-94d4f19c3367';
  var form = document.getElementById('lead');
  var statusEl = document.getElementById('lead-status');
  function say(text, cls) {
    statusEl.hidden = false;
    statusEl.className = 'form__status ' + cls;
    statusEl.textContent = text;
  }
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var f = form.elements;
    var ok = true;
    [f.name, f.contact].forEach(function (i) {
      var bad = !i.value.trim();
      i.classList.toggle('err', bad);
      if (bad) ok = false;
    });
    if (!ok) { say('Заполните имя и контакт для ответа.', 'fail'); return; }
    if (f.botcheck.checked) return;
    if (!FORM_ACCESS_KEY) { say('Форма временно недоступна. Напишите, пожалуйста, в Telegram: @wovlex', 'fail'); return; }

    var btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    say('Отправляю…', 'ok');
    fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({
        access_key: FORM_ACCESS_KEY,
        subject: 'Новая заявка с сайта: ' + f.name.value.trim(),
        from_name: 'Сайт-портфолио',
        'Имя': f.name.value.trim(),
        'Чем занимается': f.niche.value.trim() || '—',
        'Что нужно': f.channel.value,
        'Контакт': f.contact.value.trim(),
        botcheck: ''
      })
    }).then(function (r) { return r.json(); }).then(function (d) {
      if (!d.success) throw new Error(d.message || 'fail');
      goal('form_submit');
      form.reset();
      say('Спасибо! Заявка отправлена, я свяжусь с вами в ближайшее время.', 'ok');
    }).catch(function () {
      say('Не удалось отправить. Напишите, пожалуйста, в Telegram: @wovlex', 'fail');
    }).then(function () { btn.disabled = false; });
  });

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
