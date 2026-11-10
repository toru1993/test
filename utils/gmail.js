const fs = require('node:fs');
const path = require('node:path');
const { google } = require('googleapis');

const TOKEN_PATH = path.join(__dirname, '..', 'gmail-token.json');

function getOAuth2Client() {
  const { GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET } = process.env;

  if (!GMAIL_CLIENT_ID || !GMAIL_CLIENT_SECRET) {
    throw new Error('GMAIL_CLIENT_ID / GMAIL_CLIENT_SECRET を .env に設定してください。');
  }
  if (!fs.existsSync(TOKEN_PATH)) {
    throw new Error('gmail-token.json が見つかりません。先に `node setup-gmail-auth.js` を実行してください。');
  }

  const client = new google.auth.OAuth2(GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, 'http://localhost:53682');
  client.setCredentials(JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf-8')));

  client.on('tokens', tokens => {
    const current = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf-8'));
    fs.writeFileSync(TOKEN_PATH, JSON.stringify({ ...current, ...tokens }, null, 2));
  });

  return client;
}

function encodeSubject(subject) {
  return `=?UTF-8?B?${Buffer.from(subject, 'utf-8').toString('base64')}?=`;
}

function buildRawMessage({ to, subject, body }) {
  const message = [
    `To: ${to}`,
    `Subject: ${encodeSubject(subject)}`,
    'Content-Type: text/plain; charset="UTF-8"',
    'Content-Transfer-Encoding: base64',
    '',
    Buffer.from(body, 'utf-8').toString('base64'),
  ].join('\r\n');

  return Buffer.from(message).toString('base64url');
}

async function createDraft({ to, subject, body }) {
  const auth = getOAuth2Client();
  const gmail = google.gmail({ version: 'v1', auth });

  const raw = buildRawMessage({ to, subject, body });
  const result = await gmail.users.drafts.create({
    userId: 'me',
    requestBody: { message: { raw } },
  });

  return result.data;
}

function getHeader(headers, name) {
  const header = (headers ?? []).find(h => h.name.toLowerCase() === name.toLowerCase());
  return header ? header.value : '';
}

function extractBodyParts(payload) {
  let text = '';
  let html = '';

  function walk(part) {
    if (!part) return;
    if (part.body?.data) {
      const decoded = Buffer.from(part.body.data, 'base64url').toString('utf-8');
      if (part.mimeType === 'text/plain') text += `${decoded}\n`;
      else if (part.mimeType === 'text/html') html += `${decoded}\n`;
    }
    for (const sub of part.parts ?? []) walk(sub);
  }

  walk(payload);
  return { text, html };
}

function htmlToPlainText(html) {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|tr|li)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

async function searchMessageIds(query, maxTotal = 200) {
  const auth = getOAuth2Client();
  const gmail = google.gmail({ version: 'v1', auth });

  const ids = [];
  let pageToken;

  do {
    const result = await gmail.users.messages.list({
      userId: 'me',
      q: query,
      maxResults: 100,
      pageToken,
    });
    ids.push(...(result.data.messages ?? []).map(m => m.id));
    pageToken = result.data.nextPageToken;
  } while (pageToken && ids.length < maxTotal);

  return ids.slice(0, maxTotal);
}

async function getMessageDetail(id) {
  const auth = getOAuth2Client();
  const gmail = google.gmail({ version: 'v1', auth });

  const result = await gmail.users.messages.get({ userId: 'me', id, format: 'full' });
  const payload = result.data.payload ?? {};
  const headers = payload.headers ?? [];
  const { text, html } = extractBodyParts(payload);
  const plainText = text.trim() || htmlToPlainText(html);

  return {
    id,
    subject: getHeader(headers, 'Subject'),
    from: getHeader(headers, 'From'),
    date: getHeader(headers, 'Date'),
    bodyText: plainText,
  };
}

module.exports = {
  getOAuth2Client,
  createDraft,
  searchMessageIds,
  getMessageDetail,
  TOKEN_PATH,
};
