// A stand-in for `claude -p` in the harness's tests: `stream` writes a run's
// events split mid-character across chunks; `hang` never ends.
const mode = process.argv[2];

if (mode === 'hang') {
  setInterval(() => {}, 1000);
} else {
  const lines = [
    { type: 'system', subtype: 'init', model: 'fake' },
    { type: 'assistant', message: { content: [{ type: 'text', text: 'Giá đã cập nhật ✓'.slice(0, 15) }] } },
    { type: 'result', subtype: 'success', is_error: false, num_turns: 1, total_cost_usd: 0 },
  ].map((e) => `${JSON.stringify(e)}\n`).join('');
  const bytes = Buffer.from(lines, 'utf8');
  // Cut inside a multibyte character: a reader that decodes chunk by chunk breaks it.
  const cut = bytes.indexOf(Buffer.from('đ', 'utf8')) + 1;
  process.stdout.write(bytes.subarray(0, cut));
  setTimeout(() => process.stdout.write(bytes.subarray(cut)), 50);
}
