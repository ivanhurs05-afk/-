(function () {
  'use strict';
  var L = window.LEGAL || {};
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fmt = function (n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' '); };

  /* reveal on scroll */
  var rv = document.querySelectorAll('.card:not(.form),.how__i,.faq details,.rules li,.vs__col,.verdict,.case__img .shot,.method>.shot');
  rv.forEach(function (n) {
    var sibs = Array.prototype.slice.call(n.parentNode.children);
    n.style.setProperty('--d', Math.min(sibs.indexOf(n), 5) * 80 + 'ms');
    n.classList.add('rv');
  });
  function settle(n) {
    var fin = function () { n.classList.remove('rv', 'in'); n.style.removeProperty('--d'); };
    var t = setTimeout(fin, 1600);
    n.addEventListener('transitionend', function h(e) { if (e.propertyName === 'transform') { clearTimeout(t); n.removeEventListener('transitionend', h); fin(); } });
  }
  var vs = document.querySelector('.vs');
  if ('IntersectionObserver' in window && !reduce) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); settle(e.target); io.unobserve(e.target); } });
    }, { threshold: .08 });
    rv.forEach(function (n) { io.observe(n); });
    if (vs) { var vo = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { vs.classList.add('in'); vo.disconnect(); } }, { threshold: .3 }); vo.observe(vs); }
  } else {
    rv.forEach(function (n) { n.classList.remove('rv'); });
    if (vs) vs.classList.add('in');
  }

  /* count-up */
  document.querySelectorAll('[data-count]').forEach(function (el) {
    if (reduce || !('IntersectionObserver' in window)) return;
    var end = parseFloat(el.dataset.count), suf = el.dataset.suffix || '', fin = el.textContent;
    var o = new IntersectionObserver(function (es) {
      if (!es[0].isIntersecting) return; o.disconnect();
      var t0 = performance.now();
      (function tick(now) {
        var k = Math.min(1, (now - t0) / 1200), v = end * (1 - Math.pow(1 - k, 3));
        el.textContent = fmt(Math.round(v)) + suf;
        if (k < 1) requestAnimationFrame(tick); else el.textContent = fin;
      })(t0);
    }, { threshold: .6 });
    o.observe(el);
  });

  /* lightbox */
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

  /* goals (Yandex.Metrika, if a counter id is set) */
  function goal(name) { try { if (window.ym && window.METRIKA_ID_OVERRIDE) ym(window.METRIKA_ID_OVERRIDE, 'reachGoal', name); } catch (e) {} }
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href]');
    if (!a) return;
    var h = a.getAttribute('href');
    if (h.indexOf('t.me/') > -1) goal('click_telegram');
    else if (h.indexOf('tel:') === 0) goal('click_phone');
    else if (h.indexOf('vk.com/') > -1) goal('click_vk');
  });

  /* phone mask */
  function fmtPhone(v) {
    var d = v.replace(/\D/g, '');
    if (d[0] === '8') d = '7' + d.slice(1);
    if (d[0] !== '7') d = '7' + d;
    d = d.slice(0, 11);
    var s = '+7';
    if (d.length > 1) s += ' (' + d.slice(1, 4);
    if (d.length >= 4) s += ')';
    if (d.length > 4) s += ' ' + d.slice(4, 7);
    if (d.length > 7) s += '-' + d.slice(7, 9);
    if (d.length > 9) s += '-' + d.slice(9, 11);
    return s;
  }
  document.querySelectorAll('input[type=tel]').forEach(function (i) {
    i.addEventListener('input', function () { if (i.value.replace(/\D/g, '').length) i.value = fmtPhone(i.value); });
    i.addEventListener('focus', function () { if (!i.value) i.value = '+7 ('; });
    i.addEventListener('blur', function () { if (i.value.replace(/\D/g, '').length < 2) i.value = ''; });
  });

  /* lead forms */
  var utm = {};
  try { new URLSearchParams(location.search).forEach(function (v, k) { if (/^(utm_|yclid|rs|from)/.test(k)) utm[k] = v; }); } catch (e) {}

  document.querySelectorAll('[data-form]').forEach(function (form) {
    var statusEl = form.querySelector('.form__status');
    function say(t, c) { statusEl.hidden = false; statusEl.className = 'form__status ' + c; statusEl.textContent = t; }
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var f = form.elements, ok = true;
      var phoneDigits = f.phone.value.replace(/\D/g, '');
      f.name.classList.toggle('err', !f.name.value.trim());
      f.phone.classList.toggle('err', phoneDigits.length !== 11);
      if (!f.name.value.trim() || phoneDigits.length !== 11) ok = false;
      if (!f.agree.checked) { say('Отметьте согласие на обработку персональных данных.', 'fail'); return; }
      if (!ok) { say('Проверьте имя и телефон.', 'fail'); return; }
      if (f.botcheck.checked) return;

      var payload = { name: f.name.value.trim(), phone: '+' + phoneDigits, task: f.task.value, page: location.href, utm: utm, consent: true, consentAt: new Date().toISOString() };
      var btn = form.querySelector('button[type=submit]');

      if (L.leadEndpoint) {
        btn.disabled = true; say('Отправляю…', 'ok');
        fetch(L.leadEndpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
          .then(function (r) { if (!r.ok) throw new Error('bad'); return r.json().catch(function () { return {}; }); })
          .then(function () { goal('lead_form'); form.reset(); say('Спасибо! Заявка отправлена, я перезвоню в течение рабочего дня.', 'ok'); })
          .catch(function () { say('Не удалось отправить. Позвоните или напишите: +7 905 095-21-28, Telegram @wovlex.', 'fail'); })
          .then(function () { btn.disabled = false; });
      } else {
        /* no backend connected yet: open a prefilled Telegram message so the lead is not lost */
        var text = 'Здравствуйте! Хочу бесплатный аудит. Имя: ' + payload.name + '. Телефон: ' + payload.phone + '. Задача: ' + payload.task + '.';
        goal('lead_form');
        window.open('https://t.me/wovlex?text=' + encodeURIComponent(text), '_blank', 'noopener');
        say('Открыл Telegram с готовым сообщением, нажмите «Отправить». Или позвоните: +7 905 095-21-28.', 'ok');
      }
    });
  });
})();
