const { isQuietHours, enqueueMessage } = require('./lineQueue');

async function sendLineMessage(message, to = process.env.LINE_TARGET_ID) {
  const { LINE_CHANNEL_ACCESS_TOKEN } = process.env;

  if (!LINE_CHANNEL_ACCESS_TOKEN) {
    throw new Error('LINE_CHANNEL_ACCESS_TOKEN を .env に設定してください。');
  }
  if (!to) {
    throw new Error('送信先のLINEユーザー/グループ/ルームIDが指定されていません。');
  }

  const response = await fetch('https://api.line.me/v2/bot/message/push', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
    },
    body: JSON.stringify({
      to,
      messages: [{ type: 'text', text: message }],
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`LINEメッセージの送信に失敗しました (${response.status}): ${body}`);
  }
}

async function notifyLine(message, to = process.env.LINE_TARGET_ID) {
  if (isQuietHours()) {
    enqueueMessage(message);
    return { queued: true };
  }

  await sendLineMessage(message, to);
  return { queued: false };
}

module.exports = { sendLineMessage, notifyLine };
