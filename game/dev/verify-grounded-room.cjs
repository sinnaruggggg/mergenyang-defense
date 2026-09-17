const fs=require('fs'),path=require('path');
const {chromium}=require('C:/Users/sinna/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
process.env.TEMP='D:/CodexData/temp';process.env.TMP=process.env.TEMP;
(async()=>{const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});try{
 const page=await browser.newPage({viewport:{width:540,height:960}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('file:///D:/머지냥디펜스/game/index.html');await page.waitForFunction(()=>Game.name==='title');await page.evaluate(()=>Game.enter('lobby'));
 const start=await page.evaluate(()=>LobbyScene.walkers.map(w=>[w.x,w.y]));await page.waitForTimeout(8000);
 const live=await page.evaluate(()=>({positions:LobbyScene.walkers.map(w=>[w.x,w.y]),travel:WorkshopRoom.travel}));
 const sim=await page.evaluate(()=>{let invalid=0;const depth=new Map();for(let i=0;i<7200;i++){for(const w of LobbyScene.walkers){WorkshopRoom.update(w,1/60,LobbyScene.walkers);if(WorkshopRoom.blocked(w.x,w.y))invalid++;for(const p of WorkshopRoom.props){if(Math.abs(w.x-p.x)<p.width/2){const key=p.id;const a=depth.get(key)||{behind:false,front:false};if(w.y<p.y-p.footD)a.behind=true;if(w.y>p.y+26)a.front=true;depth.set(key,a)}}}}return{simulatedSeconds:120,invalidFootPositions:invalid,depth:Object.fromEntries(depth),travel:WorkshopRoom.travel}});
 await page.screenshot({path:'D:/머지냥디펜스/game/dev/workshop-grounded.png'});
 // Freeze a legal rear and front position to inspect real compositing on both sides of the workbench.
 for(const [name,y]of [['behind',565],['front',752]]){
  await page.evaluate(y=>{LobbyScene.walkers=[{id:'warrior',x:840,y,wait:999,face:-1,phase:0,moving:false,jump:0,path:[]}];},y);
  await page.waitForTimeout(100);await page.screenshot({path:`D:/머지냥디펜스/game/dev/workshop-${name}.png`});
 }
 const report={status:errors.length||sim.invalidFootPositions||live.travel<20?'FAIL':'PASS',errors,start,live,sim};fs.writeFileSync('D:/머지냥디펜스/game/dev/grounded-validation.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));if(report.status==='FAIL')process.exitCode=1;
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
