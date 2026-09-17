const { chromium } = require('C:/Users/sinna/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe' });
  const page = await browser.newPage({ viewport: { width: 540, height: 960 }, deviceScaleFactor: 1 });
  const errors = [];
  const badUrls = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push(e.message));
  page.on('response', r => { if (r.status() >= 400) badUrls.push({ status: r.status(), url: r.url() }); });
  await page.goto('file:///D:/머지냥디펜스/game/index.html');
  await page.waitForFunction(() => Game.name === 'title', { timeout: 30000 });
  await page.mouse.click(270, 830);
  await page.waitForFunction(() => Game.name === 'lobby', { timeout: 10000 });
  await page.waitForFunction(() => Game.fadeDir === 0, { timeout: 10000 });
  await page.screenshot({ path: 'D:/머지냥디펜스/game/dev/workshop-2p5d.png', fullPage: true });
  const audit = await page.evaluate(() => ({
    scene: Game.name,
    walkImages: Object.keys(IMG).filter(k => k.startsWith('walk.')).length,
    props: Object.keys(IMG).filter(k => k.startsWith('workshop2.')).length,
    maxTier: MAX_TIER,
    extraItemLoaded: !!IMG['item.weapon.16'],
  }));
  console.log(JSON.stringify({ audit, errors, badUrls }, null, 2));
  await browser.close();
})().catch(e => { console.error(e); process.exitCode = 1; });
