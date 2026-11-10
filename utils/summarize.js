const Anthropic = require('@anthropic-ai/sdk');

async function summarizeTranscript(transcriptText, meetingTopic) {
  const { ANTHROPIC_API_KEY } = process.env;
  if (!ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY を .env に設定してください。');
  }

  const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

  const response = await client.messages.create({
    model: 'claude-opus-5',
    max_tokens: 2000,
    output_config: { effort: 'low' },
    system:
      'あなたは会議の文字起こしを要約するアシスタントです。日本語で、以下の構成の要約を作成してください。'
      + '\n1. 会議の概要(2〜3文)'
      + '\n2. 決定事項(箇条書き)'
      + '\n3. ToDo・アクションアイテム(担当者が分かれば明記、箇条書き)'
      + '\n4. その他の重要なポイント(箇条書き)'
      + '\n該当する情報がない項目は「特になし」と記載してください。',
    messages: [
      {
        role: 'user',
        content: `会議名: ${meetingTopic}\n\n以下は会議の文字起こしです。要約してください。\n\n${transcriptText}`,
      },
    ],
  });

  const textBlock = response.content.find(block => block.type === 'text');
  return textBlock ? textBlock.text : '';
}

module.exports = { summarizeTranscript };
