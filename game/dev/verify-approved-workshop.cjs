const fs=require('fs'),path=require('path');
const {chromium}=require('C:/Users/sinna/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
process.env.TEMP='D:/CodexData/temp';process.env.TMP=process.env.TEMP;
(async()=>{
 const root=path.resolve(__dirname),browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
 const context=await browser.newContext({viewport:{width:540,height:960}});
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto('file:///D:/머지냥디펜스/game/index.html?scene=lobby');
  await page.waitForFunction(()=>Game.name==='lobby');
  const start=await page.evaluate(()=>LobbyScene.walkers.map(w=>[w.x,w.y]));
  await page.waitForTimeout(7000);
  const live=await page.evaluate(()=>({travel:WorkshopRoom.travel,positions:LobbyScene.walkers.map(w=>[w.x,w.y]),invalid:LobbyScene.walkers.filter(w=>WorkshopRoom.blocked(w.x,w.y)).length}));
  // A stable, unobscured view of two legal positions in the finished lobby.
  await page.evaluate(()=>{const s=WorkshopRoom.scale;LobbyScene.walkers.forEach((w,i)=>Object.assign(w,{x:(i?610:425)*s,y:(i?820:740)*s,wait:999,path:[],moving:false,face:1}));});
  await page.waitForTimeout(150);await page.screenshot({path:path.join(root,'workshop-approved.png')});
  for(const [name,y] of [['behind',900],['front',1120]]){
   await page.evaluate(y=>{const s=WorkshopRoom.scale;LobbyScene.walkers=[{id:'warrior',art:'warrior',x:515*s,y:y*s,wait:999,path:[],moving:false,face:1,phase:0,jump:0}];},y);
   await page.waitForTimeout(900);await page.screenshot({path:path.join(root,`workshop-approved-${name}.png`)});
  }
  await page.mouse.click(160,763);await page.waitForTimeout(400);
  const buttonWorks=await page.evaluate(()=>Game.name==='growth');
  const report={status:errors.length||live.invalid||live.travel<50||!buttonWorks?'FAIL':'PASS',errors,start,live,growthButtonWorks:buttonWorks,sourceAssembly:JSON.parse(fs.readFileSync(path.resolve(root,'../assets/workshop-approved/placement.json'))).validation};
  fs.writeFileSync(path.join(root,'approved-validation.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));if(report.status==='FAIL')process.exitCode=1;
 }finally{await context.close();await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
