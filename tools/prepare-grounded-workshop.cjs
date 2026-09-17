const fs=require('fs'),path=require('path');
const sharp=require('C:/Users/sinna/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const root=path.resolve(__dirname,'../game/assets/workshop-2p5d');
(async()=>{const manifest=[];for(const id of ['forge','bench','barrel','anvil','crates','lamp']){
 const {data,info}=await sharp(path.join(root,id+'.png')).ensureAlpha().raw().toBuffer({resolveWithObject:true});let l=info.width,t=info.height,r=0,b=0;
 for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++)if(data[(y*info.width+x)*4+3]>20){l=Math.min(l,x);r=Math.max(r,x);t=Math.min(t,y);b=Math.max(b,y)}
 await sharp(path.join(root,id+'.png')).extract({left:l,top:t,width:r-l+1,height:b-t+1}).png().toFile(path.join(root,id+'-grounded.png'));
 manifest.push({id,source:id+'.png',file:id+'-grounded.png',crop:{x:l,y:t,width:r-l+1,height:b-t+1},anchor:'bottom-center',preserveAspect:true});
}fs.writeFileSync(path.join(root,'grounded-manifest.json'),JSON.stringify(manifest,null,2));})();
