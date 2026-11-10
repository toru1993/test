require('dotenv').config();
const fs = require('node:fs');
const { google } = require('googleapis');
const { TOKEN_PATH } = require('./utils/gmail');

const { GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET } = process.env;

if (!GMAIL_CLIENT_ID || !GMAIL_CLIENT_SECRET) {
  console.error('GMAIL_CLIENT_ID / GMAIL_CLIENT_SECRET を .env に設定してください。');
  process.exit(1);
}

const REDIRECT_URI = 'http://localhost:53682';
const SCOPES = [
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.readonly',
];

const oauth2Client = new google.auth.OAuth2(GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, REDIRECT_URI);

function extractCode(input) {
  if (input.includes('code=')) {
    const queryPart = input.split('?').pop();
    const params = new URLSearchParams(queryPart);
    return params.get('code') ?? input;
  }
  return input;
}

async function main() {
  const rawArg = process.argv[2];

  if (!rawArg) {
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
      prompt: 'consent',
    });
    console.log('以下のURLをブラウザで開いてGoogleアカウントで認証してください:');
    console.log(authUrl);
    console.log('');
    console.log('認証後、リダイレクト先(接続エラー画面になっても構いません)のアドレスバーに表示される');
    console.log('URL全体、またはその中の code= に続く値をコピーして、以下のコマンドで渡してください:');
    console.log('  node setup-gmail-auth.js "<コピーしたURLまたはcodeの値>"');
    return;
  }

  const code = extractCode(rawArg);
  const { tokens } = await oauth2Client.getToken(code);
  fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens, null, 2));
  console.log(`トークンを ${TOKEN_PATH} に保存しました。`);
}

main().catch(error => {
  console.error('認証に失敗しました:', error.message);
  process.exit(1);
});
