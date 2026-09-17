const fs=require('fs'),path=require('path');
const {chromium}=require('C:/Users/sinna/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
process.env.TEMP='D:/CodexData/temp';process.env.TMP=process.env.TEMP;
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
 try{
  const page=await browser.newPage({viewport:{width:540,height:960}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('file:///D:/머지냥디펜스/game/index.html?scene=lobby');await page.waitForFunction(()=>Game.name==='lobby');await page.waitForTimeout(250);
  await page.screenshot({path:path.join(__dirname,'workshop-original-ui.png')});
  const actual=await page.evaluate(()=>({background:IMG['lobby.ui.main-background'].src,walkers:LobbyScene.walkers.length}));
  await page.mouse.click(150,763);await page.waitForTimeout(500);const growth=await page.evaluate(()=>Game.name==='growth');
  await page.evaluate(()=>Game.enter('lobby'));await page.mouse.click(280,833);await page.waitForTimeout(500);const adventure=await page.evaluate(()=>Game.name==='modes');
  const report={errors,actual,growth,adventure,pass:!errors.length&&growth&&adventure&&actual.walkers===0};
  fs.writeFileSync(path.join(__dirname,'original-workshop-validation.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));if(!report.pass)process.exitCode=1;
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
