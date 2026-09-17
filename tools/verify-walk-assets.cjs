const fs = require('fs');
const path = require('path');
const sharp = require('C:/Users/sinna/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const root = 'D:/머지냥디펜스/game/assets/walk';
(async () => {
  const m = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'))).characters;
  const failures = [];
  for (const c of m) {
    const a = await sharp(path.join(root, c.frames[0].file)).raw().toBuffer();
    const b = await sharp(path.join(root, c.frames[1].file)).raw().toBuffer();
    // Frame 1 must equal frame 0 shifted up exactly three pixels, including alpha.
    for (let y = 0; y < 509; y++) for (let x = 0; x < 512; x++) for (let ch = 0; ch < 4; ch++) {
      if (b[(y * 512 + x) * 4 + ch] !== a[((y + 3) * 512 + x) * 4 + ch]) { failures.push(c.id); y = 509; x = 512; break; }
    }
  }
  const report = { status: failures.length ? 'FAIL' : 'PASS', characters: m.length, frames: m.length * 2, exactTranslationPx: [0, -3], failures };
  fs.writeFileSync(path.join(root, 'validation.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report)); if (failures.length) process.exitCode = 1;
})().catch(e => { console.error(e); process.exitCode = 1; });
