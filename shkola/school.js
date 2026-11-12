(function () {
  'use strict';
  var L = window.LEGAL || {};
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* reveal on scroll */
  var rv = document.querySelectorAll('.stat,.card,.faq details,.fsteps li,.photo');
  rv.forEach(function (n) {
    var i = Array.prototype.indexOf.call(n.parentNode.children, n);
    n.style.setProperty('--d', Math.min(i, 5) * 70 + 'ms'); n.classList.add('rv');
  });
  function settle(n) {
    var fin = function () { n.classList.remove('rv', 'in'); n.style.removeProperty('--d'); };
    var t = setTimeout(fin, 1500);
    n.addEventListener('transitionend', function h(e) { if (e.propertyName === 'transform') { clearTimeout(t); n.removeEventListener('transitionend', h); fin(); } });
  }
  if ('IntersectionObserver' in window && !reduce) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); settle(e.target); io.unobserve(e.target); } });
    }, { threshold: .08 });
    rv.forEach(function (n) { io.observe(n); });
  } else { rv.forEach(function (n) { n.classList.remove('rv'); }); }

  /* lightbox */
  var lb = document.createElement('div');
  lb.className = 'lightbox'; lb.hidden = true; lb.setAttribute('role', 'dialog');
  lb.innerHTML = '<button class="lightbox__x" type="button" aria-label="Закрыть">×</button><img alt="">';
  document.body.appendChild(lb);
  var img = lb.querySelector('img'), last = null;
  function close() { lb.hidden = true; img.removeAttribute('src'); document.body.style.overflow = ''; if (last) last.focus(); }
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-full]'); if (!b) return;
    last = b; img.src = b.getAttribute('data-full'); img.alt = (b.querySelector('img') || {}).alt || '';
    lb.hidden = false; document.body.style.overflow = 'hidden';
  });
  lb.addEventListener('click', close);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !lb.hidden) close(); });

  /* group price table toggle */
  document.addEventListener('click', function (e) {
    var t = e.target.closest && e.target.closest('[data-toggle]'); if (!t) return;
    var box = document.getElementById(t.getAttribute('data-toggle')); if (!box) return;
    box.hidden = !box.hidden; t.setAttribute('aria-expanded', String(!box.hidden));
  });

  /* mobile bar hides while a form is visible */
  var bar = document.getElementById('mbar');
  if (bar && 'IntersectionObserver' in window) {
    var on = new Set();
    var fo = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) on.add(e.target); else on.delete(e.target); });
      bar.classList.toggle('is-off', on.size > 0);
    }, { threshold: .2 });
    document.querySelectorAll('.fcard').forEach(function (f) { fo.observe(f); });
  }

  /* phone mask */
  function fmt(v) {
    var d = v.replace(/\D/g, ''); if (!d.length) return '';
    if (d[0] === '8') d = '7' + d.slice(1); else if (d[0] !== '7') d = '7' + d;
    d = d.slice(0, 11);
    var s = '+7';
    if (d.length > 1) s += ' (' + d.slice(1, 4); if (d.length >= 4) s += ')';
    if (d.length > 4) s += ' ' + d.slice(4, 7); if (d.length > 7) s += '-' + d.slice(7, 9); if (d.length > 9) s += '-' + d.slice(9, 11);
    return s;
  }
  document.querySelectorAll('input[type=tel]').forEach(function (i) { i.addEventListener('input', function () { i.value = fmt(i.value); }); });

  /* Webvisor: do not record typed values */
  document.querySelectorAll('input,select').forEach(function (i) { i.classList.add('ym-disable-keys'); });

  /* goals (Yandex.Metrika, only if a counter id is set) */
  function goal(n) { try { if (window.ym && window.METRIKA_ID_OVERRIDE) ym(window.METRIKA_ID_OVERRIDE, 'reachGoal', n); } catch (e) {} }

  /* поведенческие цели Яндекс Метрики (срабатывают после согласия на cookie) */
  var fired = {};
  function once(n) { if (fired[n]) return; fired[n] = 1; goal(n); }
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href],button[data-toggle]'); if (!a) return;
    var h = a.getAttribute('href') || '';
    if (h.indexOf('tel:') === 0) goal('click_phone');
    else if (h === '#zapis' || h === '#final') goal('click_cta');
    else if (a.hasAttribute('data-toggle')) goal('click_group_prices');
  });
  document.addEventListener('focusin', function (e) { if (e.target.closest && e.target.closest('[data-form]')) once('form_start'); });
  document.querySelectorAll('.faq summary').forEach(function (s) { s.addEventListener('click', function () { if (!s.parentNode.open) once('faq_open'); }); });
  var marks = [['scroll_50', .5], ['scroll_90', .9]];
  window.addEventListener('scroll', function () {
    var h = document.documentElement, p = (window.scrollY + window.innerHeight) / h.scrollHeight;
    marks.forEach(function (m) { if (p >= m[1]) once(m[0]); });
  }, { passive: true });

  /* lead forms */
  var utm = {};
  try { new URLSearchParams(location.search).forEach(function (v, k) { if (/^(utm_|yclid|rs|from)/.test(k)) utm[k] = v; }); } catch (e) {}
  document.querySelectorAll('[data-form]').forEach(function (form) {
    var st = form.querySelector('.fstatus'), btn = form.querySelector('button[type=submit]');
    function say(t, c) { st.hidden = false; st.className = 'fstatus ' + c; st.textContent = t; }
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var f = form.elements, d = f.phone.value.replace(/\D/g, '');
      f.name.classList.toggle('err', !f.name.value.trim()); f.phone.classList.toggle('err', d.length !== 11);
      if (!f.agree.checked) return say('Отметьте согласие на обработку персональных данных.', 'fail');
      if (!f.name.value.trim() || d.length !== 11) return say('Проверьте имя и телефон.', 'fail');
      if (f.botcheck.checked) return;
      if (!L.leadEndpoint) return say('Приём заявок временно не работает. Попробуйте позже.', 'fail');
      var title = document.querySelector('h1').textContent.replace(/\s+/g, ' ').trim();
      var payload = { site: 'school', name: f.name.value.trim(), phone: '+' + d, task: 'Школа Проходной балл · ' + title,
        answers: 'Предмет: ' + f.subject.value + '; класс: ' + f.grade.value, page: location.href, utm: utm, consent: true, consentAt: new Date().toISOString() };
      btn.disabled = true; say('Отправляю…', 'ok');
      fetch(L.leadEndpoint, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=UTF-8' }, body: JSON.stringify(payload) })
        .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); })
        .then(function () { goal('lead_form'); form.reset(); say('Спасибо! Заявка отправлена, мы перезвоним в течение рабочего дня.', 'ok'); })
        .catch(function (er) { console.error('lead send failed:', er && er.message); say('Не удалось отправить заявку. Попробуйте ещё раз через минуту.', 'fail'); })
        .then(function () { btn.disabled = false; });
    });
  });

  document.getElementById('year') && (document.getElementById('year').textContent = new Date().getFullYear());
})();
