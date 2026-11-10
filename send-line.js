require('dotenv').config();
const { sendLineMessage } = require('./utils/line');

const [message, to] = process.argv.slice(2);

if (!message) {
  console.error('使い方: node send-line.js "送信するメッセージ" [送信先ID(省略時はLINE_TARGET_ID)]');
  process.exit(1);
}

sendLineMessage(message, to)
  .then(() => console.log('LINEにメッセージを送信しました。'))
  .catch(error => {
    console.error(error.message);
    process.exit(1);
  });
