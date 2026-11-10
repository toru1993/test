const fs = require('node:fs');
const path = require('node:path');

const QUEUE_PATH = path.join(__dirname, '..', 'line-queue.json');

function parseTimeToMinutes(value) {
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
}

function getJstMinutesOfDay(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Tokyo',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);

  const hour = Number(parts.find(part => part.type === 'hour').value);
  const minute = Number(parts.find(part => part.type === 'minute').value);
  return hour * 60 + minute;
}

function isQuietHours(now = new Date()) {
  const { LINE_QUIET_HOURS_START, LINE_QUIET_HOURS_END } = process.env;
  if (!LINE_QUIET_HOURS_START || !LINE_QUIET_HOURS_END) return false;

  const startMinutes = parseTimeToMinutes(LINE_QUIET_HOURS_START);
  const endMinutes = parseTimeToMinutes(LINE_QUIET_HOURS_END);
  if (startMinutes === endMinutes) return false;

  const nowMinutes = getJstMinutesOfDay(now);

  if (startMinutes < endMinutes) {
    return nowMinutes >= startMinutes && nowMinutes < endMinutes;
  }
  // 日付をまたぐ指定 (例: 22:00〜07:00)
  return nowMinutes >= startMinutes || nowMinutes < endMinutes;
}

function loadQueue() {
  if (!fs.existsSync(QUEUE_PATH)) return [];
  try {
    return JSON.parse(fs.readFileSync(QUEUE_PATH, 'utf-8'));
  } catch {
    return [];
  }
}

function saveQueue(queue) {
  fs.writeFileSync(QUEUE_PATH, JSON.stringify(queue, null, 2));
}

function enqueueMessage(message) {
  const queue = loadQueue();
  queue.push({ message, queuedAt: new Date().toISOString() });
  saveQueue(queue);
}

function clearQueue() {
  saveQueue([]);
}

module.exports = { isQuietHours, loadQueue, clearQueue, enqueueMessage, QUEUE_PATH };
