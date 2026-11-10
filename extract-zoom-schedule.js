require('dotenv').config();
const fs = require('node:fs');
const path = require('node:path');
const { searchMessageIds, getMessageDetail } = require('./utils/gmail');

const OUTPUT_PATH = path.join(__dirname, 'zoom-schedule.md');

const ZOOM_LINK_RE = /https?:\/\/[a-zA-Z0-9.-]*zoom\.us\/(?:j|my|w|s)\/[A-Za-z0-9?=&_\-#%.]+/g;
const MEETING_ID_RE = /(?:Meeting ID|ミーティングID)[:：]?\s*([\d\s]{9,14}\d)/i;
const PASSCODE_RE = /(?:Passcode|Password|パスコード)[:：]?\s*([^\s<]+)/i;
const WHEN_RE = /(?:^|\n)\s*(?:When|Time|日時|開催日時)[:：]\s*(.+)/i;

function formatDateTime(dateStr) {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' });
}

function extractScheduleFromMessage(message) {
  const { bodyText } = message;
  const links = [...new Set(bodyText.match(ZOOM_LINK_RE) ?? [])];
  if (links.length === 0) return [];

  const meetingId = bodyText.match(MEETING_ID_RE)?.[1]?.replace(/\s+/g, ' ').trim() ?? '';
  const passcode = bodyText.match(PASSCODE_RE)?.[1]?.trim() ?? '';
  const when = bodyText.match(WHEN_RE)?.[1]?.trim() ?? '';

  return links.map(link => ({
    receivedAt: formatDateTime(message.date),
    receivedAtRaw: new Date(message.date).getTime() || 0,
    subject: message.subject,
    from: message.from,
    when,
    link,
    meetingId,
    passcode,
  }));
}

function toMarkdownTable(entries) {
  const header = '| 受信日時 | 件名 | 送信者 | 本文中の開催日時 | Zoomリンク | ミーティングID | パスコード |\n' +
    '| --- | --- | --- | --- | --- | --- | --- |';
  const rows = entries.map(e =>
    `| ${e.receivedAt} | ${e.subject.replace(/\|/g, '\\|')} | ${e.from.replace(/\|/g, '\\|')} | ${e.when.replace(/\|/g, '\\|') || '-'} | ${e.link} | ${e.meetingId || '-'} | ${e.passcode || '-'} |`
  );
  return [header, ...rows].join('\n');
}

async function main() {
  const lookbackDays = Number(process.env.ZOOM_MAIL_LOOKBACK_DAYS) || 180;
  const query = `in:inbox (zoom.us/j/ OR zoom.us/my/ OR zoom.us/w/ OR zoom.us/s/) newer_than:${lookbackDays}d`;

  console.log(`検索クエリ: ${query}`);
  const ids = await searchMessageIds(query);
  console.log(`対象メール: ${ids.length} 件`);

  const entries = [];
  for (const id of ids) {
    const message = await getMessageDetail(id);
    entries.push(...extractScheduleFromMessage(message));
  }

  entries.sort((a, b) => b.receivedAtRaw - a.receivedAtRaw);

  if (entries.length === 0) {
    console.log('Zoomリンクを含むメールは見つかりませんでした。');
    return;
  }

  console.log(`\nZoomリンクを含む予定: ${entries.length} 件\n`);
  for (const e of entries) {
    console.log(`- [${e.receivedAt}] ${e.subject} (${e.from})`);
    if (e.when) console.log(`    開催日時: ${e.when}`);
    console.log(`    リンク: ${e.link}`);
    if (e.meetingId) console.log(`    ミーティングID: ${e.meetingId}`);
    if (e.passcode) console.log(`    パスコード: ${e.passcode}`);
  }

  const markdown = `# Zoom予定一覧\n\n生成日時: ${formatDateTime(new Date().toISOString())}\n\n${toMarkdownTable(entries)}\n`;
  fs.writeFileSync(OUTPUT_PATH, markdown, 'utf-8');
  console.log(`\n一覧を ${OUTPUT_PATH} に書き出しました。`);
}

main().catch(error => {
  console.error('予期しないエラーが発生しました:', error);
  process.exit(1);
});
