// Яндекс Облако → Cloud Functions (Node.js 18+). Принимает заявку с лендинга и отправляет её владельцу в Telegram.
// Переменные окружения функции: TG_TOKEN (токен бота от @BotFather), TG_CHAT_ID (ваш chat id), ALLOWED_ORIGIN (адрес сайта, например https://ivanhurs05-afk.github.io)
const https = require('https');

const cors = (origin) => ({
  'Access-Control-Allow-Origin': origin,
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
});
const esc = (s) => String(s || '').replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]));

function sendTelegram(text) {
  const data = JSON.stringify({ chat_id: process.env.TG_CHAT_ID, text, parse_mode: 'HTML', disable_web_page_preview: true });
  return new Promise((resolve, reject) => {
    const req = https.request({ hostname: 'api.telegram.org', path: `/bot${process.env.TG_TOKEN}/sendMessage`, method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } },
      (res) => { res.resume(); res.on('end', () => (res.statusCode === 200 ? resolve() : reject(new Error('tg ' + res.statusCode)))); });
    req.on('error', reject); req.write(data); req.end();
  });
}

module.exports.handler = async (event) => {
  const origin = process.env.ALLOWED_ORIGIN || '*';
  const headers = { 'Content-Type': 'application/json', ...cors(origin) };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: '{"ok":false}' };
  let b;
  try { b = JSON.parse(event.isBase64Encoded ? Buffer.from(event.body, 'base64').toString() : event.body); } catch (e) { return { statusCode: 400, headers, body: '{"ok":false}' }; }
  const phone = String(b.phone || '').replace(/\D/g, '');
  if (!b.name || phone.length !== 11 || b.consent !== true) return { statusCode: 400, headers, body: '{"ok":false,"error":"invalid"}' };
  const text = [
    '<b>Новая заявка с сайта</b>',
    `Имя: ${esc(b.name).slice(0, 80)}`,
    `Телефон: +${phone}`,
    `Задача: ${esc(b.task).slice(0, 120)}`,
    `Страница: ${esc(b.page).slice(0, 200)}`,
    b.utm && Object.keys(b.utm).length ? `Метки: ${esc(JSON.stringify(b.utm)).slice(0, 300)}` : '',
    `Согласие на обработку ПДн: ${esc(b.consentAt)}`,
  ].filter(Boolean).join('\n');
  try { await sendTelegram(text); } catch (e) { return { statusCode: 502, headers, body: '{"ok":false}' }; }
  return { statusCode: 200, headers, body: '{"ok":true}' };
};
