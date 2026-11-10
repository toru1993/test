require('dotenv').config();
const { loadQueue, clearQueue } = require('./utils/lineQueue');
const { sendLineMessage } = require('./utils/line');

function formatDateTime(isoString) {
  return new Date(isoString).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' });
}

async function main() {
  const queue = loadQueue();

  if (queue.length === 0) {
    console.log('送信待ちのLINE通知はありませんでした。');
    return;
  }

  const body = queue
    .map(item => `[${formatDateTime(item.queuedAt)}] ${item.message}`)
    .join('\n\n');

  const text = `🌙 静かな時間帯にためた通知 (${queue.length}件)\n\n${body}`;

  await sendLineMessage(text);
  clearQueue();
  console.log(`${queue.length}件のLINE通知をまとめて送信しました。`);
}

main().catch(error => {
  console.error('LINE通知キューの送信に失敗しました:', error);
  process.exit(1);
});
