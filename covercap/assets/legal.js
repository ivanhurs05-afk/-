/* Подставляет реквизиты оператора из content.json в политику и согласие.
   Поля правятся в админке (Цены и контент → Реквизиты, Контакты). */
(function () {
  'use strict';
  function get(o, p) { return p.split('.').reduce(function (x, k) { return x == null ? undefined : x[k]; }, o); }
  fetch('../content.json', { cache: 'no-cache' })
    .then(function (r) { return r.json(); })
    .then(function (c) {
      document.querySelectorAll('[data-l]').forEach(function (el) {
        var v = get(c, el.getAttribute('data-l'));
        if (v) { el.textContent = v; el.classList.remove('ph'); }
      });
    })
    .catch(function () {});
})();
