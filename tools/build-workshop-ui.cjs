const fs=require('fs'),path=require('path');
const sharp=require('C:/Users/sinna/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const root=path.resolve(__dirname,'../game/assets/workshop-ui');
const src='C:/Users/sinna/.codex/generated_images/01a0ad8a-318f-75d1-814b-048441e405e8/exec-2e3ac89d-4e98-4a30-b91c-cc7a92be65bf.png';
const cuts=[['reward',48,45,1440,225],['level',48,307,1440,211],['gold',51,554,712,198],['mint',775,554,712,198],['adventure',47,783,1444,195]];
(async()=>{fs.mkdirSync(root,{recursive:true});fs.copyFileSync(src,path.join(root,'source.png'));
for(const[id,left,top,width,height]of cuts){const{data,info}=await sharp(src).extract({left,top,width,height}).ensureAlpha().raw().toBuffer({resolveWithObject:true});
for(let y=0;y<height;y++)for(let x=0;x<width;x++){const r=43;const cx=Math.max(r,Math.min(width-r,x)),cy=Math.max(r,Math.min(height-r,y));if(Math.hypot(x-cx,y-cy)>r)data[(y*width+x)*4+3]=0;}
await sharp(data,{raw:info}).png().toFile(path.join(root,id+'.png'));}
fs.writeFileSync(path.join(root,'manifest.json'),JSON.stringify(cuts.map(([id,x,y,width,height])=>({id,width,height,ratio:width/height})),null,2));})();
