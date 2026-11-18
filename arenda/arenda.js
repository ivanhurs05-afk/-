(function () {
  'use strict';
  var L = window.LEGAL || {};
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* появление блоков при прокрутке */
  var rv = document.querySelectorAll('.rv');
  if ('IntersectionObserver' in window && !reduce) {
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }); }, { threshold: .1 });
    rv.forEach(function (n) { io.observe(n); });
  } else { rv.forEach(function (n) { n.classList.add('in'); }); }

  /* маска телефона */
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

  /* Вебвизор не записывает введённые значения */
  document.querySelectorAll('input,textarea').forEach(function (i) { i.classList.add('ym-disable-keys'); });

  /* цели Яндекс Метрики (работают после согласия на cookie) */
  function goal(n) { try { if (window.ym && window.METRIKA_ID_OVERRIDE) ym(window.METRIKA_ID_OVERRIDE, 'reachGoal', n); } catch (e) {} }
  var fired = {};
  function once(n) { if (fired[n]) return; fired[n] = 1; goal(n); }
  document.addEventListener('click', function (e) { var a = e.target.closest && e.target.closest('[data-goal]'); if (a) goal(a.getAttribute('data-goal')); });
  document.addEventListener('focusin', function (e) { if (e.target.closest && e.target.closest('[data-form]')) once('form_start'); });
  document.querySelectorAll('.faq summary').forEach(function (s) { s.addEventListener('click', function () { if (!s.parentNode.open) once('faq_open'); }); });
  var marks = [['scroll_50', .5], ['scroll_90', .9]];
  window.addEventListener('scroll', function () {
    var h = document.documentElement, p = (window.scrollY + window.innerHeight) / h.scrollHeight;
    marks.forEach(function (m) { if (p >= m[1]) once(m[0]); });
  }, { passive: true });

  /* мобильная кнопка прячется, пока видна форма */
  var bar = document.getElementById('mbar');
  if (bar && 'IntersectionObserver' in window) {
    var on = new Set();
    var fo = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) on.add(e.target); else on.delete(e.target); });
      bar.classList.toggle('is-off', on.size > 0);
    }, { threshold: .2 });
    document.querySelectorAll('[data-form]').forEach(function (f) { fo.observe(f); });
  }

  /* опросник: четыре шага */
  var quiz = document.getElementById('calc');
  if (quiz) {
    var steps = quiz.querySelectorAll('.qstep'), dots = quiz.querySelectorAll('.qprog i'), back = quiz.querySelector('.qback'), cur = 0;
    function go(n) {
      cur = n;
      steps.forEach(function (s, i) { s.classList.toggle('is-on', i === n); });
      dots.forEach(function (d, i) { d.classList.toggle('on', i <= n); });
      back.hidden = n === 0;
    }
    quiz.addEventListener('change', function (e) {
      if (e.target.type !== 'radio') return;
      once('quiz_start'); goal('quiz_step_' + (cur + 1));
      if (cur < 3) setTimeout(function () { go(cur + 1); }, 160);
    });
    back.addEventListener('click', function () { if (cur > 0) go(cur - 1); });
    quiz.addEventListener('reset', function () { go(0); });
  }

  /* отправка заявок */
  var utm = {};
  try { new URLSearchParams(location.search).forEach(function (v, k) { if (/^(utm_|yclid|rs|from)/.test(k)) utm[k] = v; }); } catch (e) {}
  document.querySelectorAll('[data-form]').forEach(function (form) {
    var st = form.querySelector('.fstatus'), btn = form.querySelector('button[type=submit]'), kind = form.getAttribute('data-kind');
    function say(t, c) { st.hidden = false; st.className = 'fstatus ' + c; st.textContent = t; }
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var f = form.elements, d = f.phone.value.replace(/\D/g, '');
      f.name.classList.toggle('err', !f.name.value.trim()); f.phone.classList.toggle('err', d.length !== 11);
      if (!f.agree.checked) return say('Отметьте согласие на обработку персональных данных.', 'fail');
      if (!f.name.value.trim() || d.length !== 11) return say('Проверьте имя и телефон.', 'fail');
      if (f.botcheck.checked) return;
      if (!L.leadEndpoint) return say('Приём заявок временно не работает. Попробуйте позже.', 'fail');
      var answers = kind === 'calc'
        ? 'Комнат: ' + (f.rooms.value || '—') + '; статус: ' + (f.status.value || '—') + '; состояние: ' + (f.state.value || '—')
        : (f.note && f.note.value.trim() ? 'Вопрос: ' + f.note.value.trim() : '');
      var payload = { site: 'arenda', name: f.name.value.trim(), phone: '+' + d,
        task: kind === 'calc' ? 'Моя Аренда · расчёт арендного дохода' : 'Моя Аренда · консультация',
        answers: answers, page: location.href, utm: utm, consent: true, consentAt: new Date().toISOString() };
      btn.disabled = true; say('Отправляю…', 'ok');
      fetch(L.leadEndpoint, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=UTF-8' }, body: JSON.stringify(payload) })
        .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); })
        .then(function () { goal(kind === 'calc' ? 'lead_calc' : 'lead_consult'); goal('lead_form'); form.reset(); say('Спасибо! Заявка отправлена, мы свяжемся с вами.', 'ok'); })
        .catch(function (er) { console.error('lead send failed:', er && er.message); say('Не удалось отправить заявку. Попробуйте ещё раз через минуту.', 'fail'); })
        .then(function () { btn.disabled = false; });
    });
  });
})();
