/* Подставляет реквизиты оператора из content.json в политику и согласие.
   В HTML уже записаны текущие значения; скрипт подтягивает изменения из админки. */
(function () {
  'use strict';
  function get(o, p) { return p.split('.').reduce(function (x, k) { return x == null ? undefined : x[k]; }, o); }
  fetch('../content.json', { cache: 'no-cache' })
    .then(function (r) { return r.json(); })
    .then(function (c) {
      document.querySelectorAll('[data-l]').forEach(function (el) {
        var v = get(c, el.getAttribute('data-l'));
        if (!v) return;
        el.textContent = v;
        if (el.tagName === 'A' && v.indexOf('@') > 0) el.href = 'mailto:' + v;
      });
      document.querySelectorAll('[data-l-opt]').forEach(function (el) {
        el.hidden = !get(c, el.getAttribute('data-l-opt'));
      });
    })
    .catch(function () {});
})();
