// Generates rigid two-frame walk cycles from the approved painted character PNGs.
// The source pixels are never rescaled or reshaped: frame 1 is translated only.
const fs = require('fs');
const path = require('path');
const sharp = require('C:/Users/sinna/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const root = 'D:/머지냥디펜스';
const roster = JSON.parse(fs.readFileSync(path.join(root, 'art/attack-motion-v4/manifest.json'), 'utf8')).characters;
const out = path.join(root, 'game/assets/walk');
fs.mkdirSync(out, { recursive: true });

(async () => {
  const manifest = [];
  for (const c of roster) {
    const src = path.join(root, 'art/attack-motion-v4', c.frames[0].file);
    const base = await sharp(src).png().toBuffer();
    const { data } = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    // Copy raw pixels directly. Sharp composite may change RGB values under translucent edges.
    const moved = Buffer.alloc(512 * 512 * 4);
    data.copy(moved, 0, 3 * 512 * 4);
    const lifted = await sharp(moved, { raw: { width: 512, height: 512, channels: 4 } }).png().toBuffer();
    fs.writeFileSync(path.join(out, `${c.id}-walk-0.png`), base);
    fs.writeFileSync(path.join(out, `${c.id}-walk-1.png`), lifted);
    manifest.push({ id: c.id, canvas: [512, 512], pivot: [256, 472], frames: [
      { file: `${c.id}-walk-0.png`, offset: [0, 0], durationMs: 180 },
      { file: `${c.id}-walk-1.png`, offset: [0, -3], durationMs: 180 }
    ], invariant: 'same source bitmap; translation only; no resize, shape edit, or separate redrawing' });
  }
  fs.writeFileSync(path.join(out, 'manifest.json'), JSON.stringify({ version: 1, characters: manifest }, null, 2));
  console.log(JSON.stringify({ characters: manifest.length, frames: manifest.length * 2 }));
})().catch(e => { console.error(e); process.exitCode = 1; });
