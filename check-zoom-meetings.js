require('dotenv').config();
const fs = require('node:fs');
const path = require('node:path');
const { listRecentRecordings, downloadTranscript } = require('./utils/zoom');
const { parseVttToPlainText } = require('./utils/transcript');
const { summarizeTranscript } = require('./utils/summarize');
const { createDraft } = require('./utils/gmail');

const PROCESSED_PATH = path.join(__dirname, 'processed-meetings.json');
const DEFAULT_RECIPIENT = 'mqph0110.ts@gmail.com';

function loadProcessedIds() {
  if (!fs.existsSync(PROCESSED_PATH)) return new Set();
  try {
    return new Set(JSON.parse(fs.readFileSync(PROCESSED_PATH, 'utf-8')));
  } catch {
    return new Set();
  }
}

function saveProcessedIds(ids) {
  fs.writeFileSync(PROCESSED_PATH, JSON.stringify([...ids], null, 2));
}

function formatDateTime(isoString) {
  return new Date(isoString).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' });
}

function findTranscriptFile(meeting) {
  return (meeting.recording_files ?? []).find(file => file.file_type === 'TRANSCRIPT');
}

async function main() {
  const processedIds = loadProcessedIds();
  const meetings = await listRecentRecordings();

  if (meetings.length === 0) {
    console.log('チェック対象期間に録画された会議はありませんでした。');
    return;
  }

  for (const meeting of meetings) {
    if (processedIds.has(meeting.uuid)) continue;

    const transcriptFile = findTranscriptFile(meeting);
    if (!transcriptFile) {
      console.log(`[スキップ] "${meeting.topic}" に文字起こしファイルが見つかりません(まだ生成中の可能性があります)。`);
      continue;
    }

    console.log(`[処理中] "${meeting.topic}" (${formatDateTime(meeting.start_time)})`);

    try {
      const vttText = await downloadTranscript(transcriptFile.download_url);
      const plainText = parseVttToPlainText(vttText);

      if (!plainText.trim()) {
        console.log(`[スキップ] "${meeting.topic}" の文字起こしが空でした。`);
        processedIds.add(meeting.uuid);
        continue;
      }

      const summary = await summarizeTranscript(plainText, meeting.topic);
      const recipient = process.env.SUMMARY_RECIPIENT || DEFAULT_RECIPIENT;
      const subject = `[会議要約] ${meeting.topic} (${formatDateTime(meeting.start_time)})`;
      const body = [
        `会議名: ${meeting.topic}`,
        `開始時刻: ${formatDateTime(meeting.start_time)}`,
        `録画: ${meeting.share_url ?? '(共有URLなし)'}`,
        '',
        summary,
      ].join('\n');

      await createDraft({ to: recipient, subject, body });
      console.log(`[完了] "${meeting.topic}" の要約を ${recipient} 宛てのGmail下書きに作成しました。`);

      processedIds.add(meeting.uuid);
    } catch (error) {
      console.error(`[エラー] "${meeting.topic}" の処理に失敗しました:`, error.message);
    }
  }

  saveProcessedIds(processedIds);
}

main().catch(error => {
  console.error('予期しないエラーが発生しました:', error);
  process.exit(1);
});
