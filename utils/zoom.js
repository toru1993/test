let cachedToken = null;
let cachedTokenExpiresAt = 0;

async function getZoomAccessToken() {
  const { ZOOM_ACCOUNT_ID, ZOOM_CLIENT_ID, ZOOM_CLIENT_SECRET } = process.env;

  if (!ZOOM_ACCOUNT_ID || !ZOOM_CLIENT_ID || !ZOOM_CLIENT_SECRET) {
    throw new Error('ZOOM_ACCOUNT_ID / ZOOM_CLIENT_ID / ZOOM_CLIENT_SECRET を .env に設定してください。');
  }

  if (cachedToken && Date.now() < cachedTokenExpiresAt) {
    return cachedToken;
  }

  const basicAuth = Buffer.from(`${ZOOM_CLIENT_ID}:${ZOOM_CLIENT_SECRET}`).toString('base64');
  const response = await fetch(
    `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${ZOOM_ACCOUNT_ID}`,
    {
      method: 'POST',
      headers: { Authorization: `Basic ${basicAuth}` },
    },
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Zoomアクセストークンの取得に失敗しました (${response.status}): ${body}`);
  }

  const data = await response.json();
  cachedToken = data.access_token;
  cachedTokenExpiresAt = Date.now() + (data.expires_in - 60) * 1000;
  return cachedToken;
}

async function listRecentRecordings() {
  const { ZOOM_USER_ID, ZOOM_LOOKBACK_DAYS } = process.env;

  if (!ZOOM_USER_ID) {
    throw new Error('ZOOM_USER_ID(Zoomログイン用メールアドレス)を .env に設定してください。');
  }

  const token = await getZoomAccessToken();
  const lookbackDays = Number(ZOOM_LOOKBACK_DAYS) || 1;
  const from = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const to = new Date().toISOString().slice(0, 10);

  const url = `https://api.zoom.us/v2/users/${encodeURIComponent(ZOOM_USER_ID)}/recordings?from=${from}&to=${to}&page_size=50`;
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Zoom録画一覧の取得に失敗しました (${response.status}): ${body}`);
  }

  const data = await response.json();
  return data.meetings ?? [];
}

async function downloadTranscript(downloadUrl) {
  const token = await getZoomAccessToken();
  const response = await fetch(downloadUrl, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`文字起こしのダウンロードに失敗しました (${response.status}): ${body}`);
  }

  return response.text();
}

module.exports = { listRecentRecordings, downloadTranscript };
