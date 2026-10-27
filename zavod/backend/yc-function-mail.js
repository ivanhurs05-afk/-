// Яндекс Облако → Cloud Functions (Node.js 18+), без зависимостей.
// Принимает заявку с лендинга и отправляет её письмом на почту владельца по SMTP.
//
// Переменные окружения функции:
//   SMTP_HOST   smtp.mail.ru            (для ящика @inbox.ru / @mail.ru)
//   SMTP_PORT   465
//   SMTP_USER   ivan.khurs@inbox.ru     (ящик, с которого отправляем)
//   SMTP_PASS   пароль для внешнего приложения (создаётся в настройках почты, НЕ основной пароль)
//   MAIL_TO     ivan.khurs@inbox.ru     (куда приходят заявки)
//   ALLOWED_ORIGIN  https://ivanhurs05-afk.github.io   (адрес сайта)
const tls = require('tls');
const net = require('net');

const clean = (s, n) => String(s == null ? '' : s).replace(/[\r\n\u0000-\u001f]+/g, ' ').trim().slice(0, n);

function sendMail({ host, port, secure, user, pass, to, subject, text }) {
  return new Promise((resolve, reject) => {
    const sock = secure ? tls.connect({ host, port, servername: host }) : net.connect({ host, port });
    let buf = '', step = 0, finished = false;
    const b64 = (s) => Buffer.from(s, 'utf8').toString('base64');
    const fail = (e) => { if (!finished) { finished = true; sock.destroy(); reject(e); } };
    const send = (l) => sock.write(l + '\r\n');
    const body = b64(text).replace(/.{1,76}/g, '$&\r\n').trimEnd();
    const msg = [
      'From: ' + user, 'To: ' + to,
      'Subject: =?UTF-8?B?' + b64(subject) + '?=',
      'MIME-Version: 1.0', 'Content-Type: text/plain; charset=utf-8', 'Content-Transfer-Encoding: base64', '',
      body, '.'
    ].join('\r\n');
    // шаги диалога: [ожидаемый код, что отправить в ответ]
    const flow = [
      [220, () => send('EHLO lead-form')],
      [250, () => send('AUTH LOGIN')],
      [334, () => send(b64(user))],
      [334, () => send(b64(pass))],
      [235, () => send('MAIL FROM:<' + user + '>')],
      [250, () => send('RCPT TO:<' + to + '>')],
      [250, () => send('DATA')],
      [354, () => send(msg)],
      [250, () => { send('QUIT'); finished = true; sock.end(); resolve(); }]
    ];
    sock.setTimeout(15000, () => fail(new Error('smtp timeout')));
    sock.on('error', fail);
    sock.on('close', () => { if (!finished) fail(new Error('smtp closed')); });
    sock.on('data', (d) => {
      buf += d.toString('utf8');
      let i;
      while ((i = buf.indexOf('\r\n')) > -1) {
        const line = buf.slice(0, i); buf = buf.slice(i + 2);
        if (/^\d{3}-/.test(line)) continue; // продолжение многострочного ответа
        const code = parseInt(line.slice(0, 3), 10);
        const st = flow[step];
        if (!st) return;
        if (code !== st[0]) return fail(new Error('smtp: ожидали ' + st[0] + ', получили ' + line));
        step++; st[1]();
      }
    });
  });
}

module.exports.sendMail = sendMail;

module.exports.handler = async (event) => {
  const origin = process.env.ALLOWED_ORIGIN || '*';
  const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: '{"ok":false}' };
  let b;
  try { b = JSON.parse(event.isBase64Encoded ? Buffer.from(event.body, 'base64').toString() : event.body); } catch (e) { return { statusCode: 400, headers, body: '{"ok":false}' }; }
  const phone = String(b.phone || '').replace(/\D/g, '');
  if (phone.length !== 11 || b.consent !== true) return { statusCode: 400, headers, body: '{"ok":false,"error":"invalid"}' };
  const lines = [
    'Новая заявка с сайта', '',
    'Имя: ' + clean(b.name, 80),
    'Телефон: +' + phone,
    'Задача: ' + clean(b.task, 160),
    b.answers ? 'Ответы квиза: ' + clean(b.answers, 800) : '',
    'Страница: ' + clean(b.page, 300),
    b.utm && Object.keys(b.utm).length ? 'Метки: ' + clean(JSON.stringify(b.utm), 300) : '',
    'Согласие на обработку ПДн: ' + clean(b.consentAt, 40)
  ].filter((l) => l !== '' || true);
  try {
    await sendMail({
      host: process.env.SMTP_HOST || 'smtp.mail.ru', port: parseInt(process.env.SMTP_PORT || '465', 10), secure: process.env.SMTP_SECURE !== 'false',
      user: process.env.SMTP_USER, pass: process.env.SMTP_PASS, to: process.env.MAIL_TO,
      subject: 'Заявка с сайта: ' + clean(b.task, 60) + ' +' + phone, text: lines.join('\n')
    });
  } catch (e) { return { statusCode: 502, headers, body: '{"ok":false}' }; }
  return { statusCode: 200, headers, body: '{"ok":true}' };
};
