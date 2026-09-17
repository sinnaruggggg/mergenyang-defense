const fs=require('fs'),path=require('path');
const sharp=require('C:/Users/sinna/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const root=path.resolve(__dirname,'../art/smith-fullbody-swing-v3');
const src='C:/Users/sinna/.codex/generated_images/01a0ad8a-318f-75d1-814b-048441e405e8/exec-db213dcc-d395-4835-a407-60c7ff607799.png';
(async()=>{fs.mkdirSync(root,{recursive:true});fs.copyFileSync(src,path.join(root,'source-sheet.png'));
const frames=[];for(let i=0;i<2;i++){
const cut=await sharp(src).extract({left:i*887,top:0,width:887,height:887}).png().toBuffer();
const png=await sharp({create:{width:1000,height:1000,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite([{input:cut,left:i?85:50,top:100}]).png().toBuffer();
fs.writeFileSync(path.join(root,i?'strike.png':'raised.png'),png);frames.push(await sharp(png).raw().toBuffer());}
await sharp(Buffer.concat(frames),{raw:{width:1000,height:2000,channels:4,pageHeight:1000}}).gif({delay:[550,250],loop:0}).toFile(path.join(root,'hammer-swing.gif'));
fs.writeFileSync(path.join(root,'placement.json'),JSON.stringify({canvas:[1000,1000],frames:['raised.png','strike.png'],scale:1,translationOnly:true,offsets:[[50,100],[85,100]],note:'AI-drawn poses share rendering scale; source pixel identity is not guaranteed between poses.'},null,2));})();
