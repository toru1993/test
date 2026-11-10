function parseVttToPlainText(vtt) {
  const lines = vtt.split(/\r?\n/);
  const textLines = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed === 'WEBVTT') continue;
    if (/^\d+$/.test(trimmed)) continue;
    if (/\d{2}:\d{2}:\d{2}[.,]\d{3}\s*-->\s*\d{2}:\d{2}:\d{2}[.,]\d{3}/.test(trimmed)) continue;
    textLines.push(trimmed);
  }

  return textLines.join('\n');
}

module.exports = { parseVttToPlainText };
