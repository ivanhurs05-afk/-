(function () {
  'use strict';
  var L = window.LEGAL || {};
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fmt = function (n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' '); };

  /* ---------- reveal on scroll ---------- */
  var rv = document.querySelectorAll('.pain,.card:not(.form):not(.quiz),.faq details,.rules li,.vs__col,.verdict,.case__img .shot,.process>.shot,.price-box,.metrics>div,.ph');
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
  var vsEls = document.querySelectorAll('.vs');
  if ('IntersectionObserver' in window && !reduce) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); settle(e.target); io.unobserve(e.target); } });
    }, { threshold: .08 });
    rv.forEach(function (n) { io.observe(n); });
    var vo = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); vo.unobserve(e.target); } }); }, { threshold: .3 });
    vsEls.forEach(function (v) { vo.observe(v); });
  } else {
    rv.forEach(function (n) { n.classList.remove('rv'); });
    vsEls.forEach(function (v) { v.classList.add('in'); });
  }

  /* ---------- count-up ---------- */
  document.querySelectorAll('[data-count]').forEach(function (el) {
    if (reduce || !('IntersectionObserver' in window)) return;
    var end = parseFloat(el.dataset.count), fin = el.textContent;
    var o = new IntersectionObserver(function (es) {
      if (!es[0].isIntersecting) return; o.disconnect();
      var t0 = performance.now();
      (function tick(now) {
        var k = Math.min(1, (now - t0) / 1200), v = end * (1 - Math.pow(1 - k, 3));
        el.textContent = fmt(Math.round(v));
        if (k < 1) requestAnimationFrame(tick); else el.textContent = fin;
      })(t0);
    }, { threshold: .6 });
    o.observe(el);
  });

  /* ---------- lightbox ---------- */
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

  /* ---------- callback modal ---------- */
  var modal = document.getElementById('callback');
  function openModal() { modal.hidden = false; document.body.style.overflow = 'hidden'; var i = modal.querySelector('input[type=tel]'); if (i) i.focus(); }
  function closeModal() { modal.hidden = true; document.body.style.overflow = ''; }
  document.addEventListener('click', function (e) {
    var o = e.target.closest && e.target.closest('[data-open="callback"]');
    if (o) { e.preventDefault(); openModal(); return; }
    if (e.target === modal || (e.target.closest && e.target.closest('[data-close]'))) closeModal();
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { if (!lb.hidden) closeLb(); else if (!modal.hidden) closeModal(); } });

  /* ---------- goals (Yandex.Metrika, if a counter id is set) ---------- */
  function goal(name) { try { if (window.ym && window.METRIKA_ID_OVERRIDE) ym(window.METRIKA_ID_OVERRIDE, 'reachGoal', name); } catch (e) {} }
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href],button[data-open]');
    if (!a) return;
    var h = a.getAttribute('href') || '';
    if (h.indexOf('t.me/') > -1) goal('click_telegram');
    else if (h.indexOf('tel:') === 0) goal('click_phone');
    else if (h === '#quiz') goal('click_quiz_cta');
    else if (a.getAttribute('data-open')) goal('open_callback');
  });

  /* ---------- floating entry points hide while a form/quiz is on screen ---------- */
  var floaters = [document.getElementById('fab'), document.getElementById('mbar')].filter(Boolean);
  if (floaters.length && 'IntersectionObserver' in window) {
    var on = new Set();
    var fo = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) on.add(e.target); else on.delete(e.target); });
      floaters.forEach(function (f) { f.classList.toggle('is-off', on.size > 0); });
    }, { threshold: .2 });
    document.querySelectorAll('.hero .form,.quiz,.cta .form').forEach(function (f) { fo.observe(f); });
  }

  /* ---------- phone mask ---------- */
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
  function maskPhones(root) {
    root.querySelectorAll('input[type=tel]').forEach(function (i) {
      i.addEventListener('input', function () { if (i.value.replace(/\D/g, '').length) i.value = fmtPhone(i.value); });
      i.addEventListener('focus', function () { if (!i.value) i.value = '+7 ('; });
      i.addEventListener('blur', function () { if (i.value.replace(/\D/g, '').length < 2) i.value = ''; });
    });
  }
  maskPhones(document);

  /* ---------- lead sending ---------- */
  var utm = {};
  try { new URLSearchParams(location.search).forEach(function (v, k) { if (/^(utm_|yclid|rs|from)/.test(k)) utm[k] = v; }); } catch (e) {}

  function sendLead(payload, statusEl, btn, onOk) {
    payload.page = location.href; payload.utm = utm; payload.consent = true; payload.consentAt = new Date().toISOString();
    function say(t, c) { statusEl.hidden = false; statusEl.className = 'form__status ' + c; statusEl.textContent = t; }
    if (L.leadEndpoint) {
      btn.disabled = true; say('Отправляю…', 'ok');
      fetch(L.leadEndpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
        .then(function (r) { if (!r.ok) throw new Error('bad'); })
        .then(function () { goal('lead_form'); onOk(); say('Спасибо! Заявка отправлена, я перезвоню в течение рабочего дня.', 'ok'); })
        .catch(function () { say('Не удалось отправить. Позвоните или напишите: +7 905 095-21-28, Telegram @wovlex.', 'fail'); })
        .then(function () { btn.disabled = false; });
    } else {
      /* no backend connected yet: open a prefilled Telegram message so the lead is not lost */
      var text = 'Здравствуйте! ' + (payload.task || 'Хочу бесплатный аудит') + '. Имя: ' + (payload.name || '—') + '. Телефон: ' + payload.phone + '.' + (payload.answers ? ' Ответы квиза: ' + payload.answers + '.' : '');
      goal('lead_form'); onOk();
      window.open('https://t.me/wovlex?text=' + encodeURIComponent(text), '_blank', 'noopener');
      say('Открыл Telegram с готовым сообщением, нажмите «Отправить». Или позвоните: +7 905 095-21-28.', 'ok');
    }
  }

  document.querySelectorAll('[data-form]').forEach(function (form) {
    var statusEl = form.querySelector('.form__status');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var f = form.elements, optionalName = form.hasAttribute('data-optional-name');
      var digits = f.phone.value.replace(/\D/g, '');
      var nameBad = !optionalName && !f.name.value.trim();
      f.name.classList.toggle('err', nameBad);
      f.phone.classList.toggle('err', digits.length !== 11);
      if (!f.agree.checked) { statusEl.hidden = false; statusEl.className = 'form__status fail'; statusEl.textContent = 'Отметьте согласие на обработку персональных данных.'; return; }
      if (nameBad || digits.length !== 11) { statusEl.hidden = false; statusEl.className = 'form__status fail'; statusEl.textContent = 'Проверьте имя и телефон.'; return; }
      if (f.botcheck && f.botcheck.checked) return;
      sendLead({ name: f.name.value.trim(), phone: '+' + digits, task: f.task.value }, statusEl, form.querySelector('button[type=submit]'), function () { form.reset(); });
    });
  });

  /* ---------- quiz ---------- */
  var quiz = document.querySelector('[data-quiz]');
  if (quiz) {
    var body = quiz.querySelector('[data-body]'), stepEl = quiz.querySelector('[data-step]'), bar = quiz.querySelector('[data-bar]'), back = quiz.querySelector('[data-back]');
    var steps = [
      { k: 'need', q: 'Что вам нужно сейчас?', o: ['Оптовые продажи (B2B-заказы)', 'Найм сотрудников', 'И то и другое'] },
      { k: 'industry', q: 'Чем занимается ваш завод?', o: ['Металлообработка и металлоконструкции', 'Электроника и приборы', 'Стройматериалы и оборудование', 'Пищевое производство', 'Другое'] },
      { k: 'region', q: 'Где нужны клиенты или сотрудники?', o: ['Москва и область', 'Крупные города и ЦФО', 'Вся Россия', 'Один регион'] },
      { k: 'budget', q: 'Какой бюджет на рекламу в месяц рассматриваете?', o: ['До 100 тыс. ₽', '100–300 тыс. ₽', 'Более 300 тыс. ₽', 'Пока не знаю'] }
    ];
    var ans = {}, cur = 0;
    function render() {
      stepEl.textContent = cur + 1; bar.style.width = ((cur + 1) / 5 * 100) + '%'; back.hidden = cur === 0;
      body.classList.remove('quiz__fade'); void body.offsetWidth; body.classList.add('quiz__fade');
      if (cur < steps.length) {
        var s = steps[cur];
        body.innerHTML = '<p class="quiz__q">' + s.q + '</p><div class="quiz__opts">' + s.o.map(function (t) { return '<button type="button" class="opt' + (ans[s.k] === t ? ' is-on' : '') + '" data-v="' + t.replace(/"/g, '&quot;') + '">' + t + '</button>'; }).join('') + '</div>';
      } else {
        body.innerHTML = '<form class="quiz__done" novalidate><p class="quiz__q">Куда прислать прогноз?</p>' +
          '<p>Подготовлю прогноз заявок и цены на ваш завод и перезвоню в течение рабочего дня.</p>' +
          '<label class="qf">Имя<input name="name" autocomplete="name" placeholder="Как к вам обращаться" required></label>' +
          '<label class="qf">Телефон<input name="phone" type="tel" inputmode="tel" autocomplete="tel" placeholder="+7 (___) ___-__-__" required></label>' +
          '<input type="checkbox" name="botcheck" class="hp" tabindex="-1" autocomplete="off" aria-hidden="true">' +
          '<label class="agree"><input type="checkbox" name="agree" required><span>Согласен на обработку персональных данных (<a href="../consent.html" target="_blank" rel="noopener">согласие</a>, <a href="../privacy.html" target="_blank" rel="noopener">политика</a>)</span></label>' +
          '<button class="btn btn--lg" type="submit">Получить прогноз</button><p class="form__status" role="status" aria-live="polite" hidden></p></form>';
        maskPhones(body);
        var qform = body.querySelector('form'), st = qform.querySelector('.form__status');
        qform.addEventListener('submit', function (e) {
          e.preventDefault();
          var f = qform.elements, d = f.phone.value.replace(/\D/g, '');
          f.name.classList.toggle('err', !f.name.value.trim()); f.phone.classList.toggle('err', d.length !== 11);
          var bad = function (t) { st.hidden = false; st.className = 'form__status fail'; st.textContent = t; };
          if (!f.agree.checked) return bad('Отметьте согласие на обработку персональных данных.');
          if (!f.name.value.trim() || d.length !== 11) return bad('Проверьте имя и телефон.');
          if (f.botcheck.checked) return;
          var summary = steps.map(function (s) { return s.q.replace(/\?$/, '') + ': ' + (ans[s.k] || '—'); }).join('; ');
          sendLead({ name: f.name.value.trim(), phone: '+' + d, task: 'Квиз: ' + (ans.need || ''), answers: summary }, st, qform.querySelector('button[type=submit]'), function () { goal('quiz_done'); });
        });
        goal('quiz_contact_step');
      }
    }
    body.addEventListener('click', function (e) {
      var o = e.target.closest('.opt'); if (!o) return;
      ans[steps[cur].k] = o.getAttribute('data-v'); if (cur === 0) goal('quiz_start');
      setTimeout(function () { cur++; render(); }, 180);
    });
    back.addEventListener('click', function () { if (cur > 0) { cur--; render(); } });
    document.querySelectorAll('[data-pick]').forEach(function (a) {
      a.addEventListener('click', function () { ans.need = a.getAttribute('data-pick'); cur = 1; render(); });
    });
    render();
  }
})();
