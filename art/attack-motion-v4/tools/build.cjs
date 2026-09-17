const fs=require('fs'),path=require('path');
const sharp=require('C:/Users/sinna/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const root=path.resolve(__dirname,'..'),roster=JSON.parse(fs.readFileSync(path.join(root,'roster.json'),'utf8'));
function box(data,w,h){let l=w,t=h,r=-1,b=-1,n=0;for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(data[(y*w+x)*4+3]>32){l=Math.min(l,x);r=Math.max(r,x);t=Math.min(t,y);b=Math.max(b,y);n++;}return {x:l,y:t,width:r-l+1,height:b-t+1,bottom:b,pixels:n};}
(async()=>{const manifest=[],checks=[],overview=[];fs.mkdirSync(path.join(root,'previews'),{recursive:true});
for(const c of roster){const src=path.join(root,'sources',c.id+'.png'),m=await sharp(src).metadata(),h=m.height,parts=[];
 const raw=await sharp(src).ensureAlpha().raw().toBuffer(),runs=[];let start=-1;
 for(let x=Math.floor(m.width*.35);x<Math.ceil(m.width*.65);x++){let n=0;for(let y=0;y<h;y++)if(raw[(y*m.width+x)*4+3]>32)n++;if(n===0){if(start<0)start=x;}else if(start>=0){runs.push([start,x]);start=-1;}}
 runs.sort((a,b)=>(b[1]-b[0])-(a[1]-a[0]));const split=runs.length?Math.round((runs[0][0]+runs[0][1])/2):Math.floor(m.width/2);
 for(let f=0;f<2;f++){const left=f?split:0,cw=f?m.width-split:split;const {data}=await sharp(src).extract({left,top:0,width:cw,height:h}).ensureAlpha().raw().toBuffer({resolveWithObject:true});const b=box(data,cw,h);let sum=0,n=0;for(let y=Math.round(b.bottom-b.height*.09);y<=b.bottom;y++)for(let x=0;x<cw;x++)if(data[(y*cw+x)*4+3]>64){sum+=x;n++;}parts.push({data,b,cw,left,anchorX:sum/n});}
 // A single scale for both poses. Translation aligns the support baseline; no per-pose fit.
 const extent=Math.max(...parts.map(p=>Math.max(p.anchorX-p.b.x,p.b.x+p.b.width-p.anchorX))),maxH=Math.max(...parts.map(p=>p.b.height));
 const scale=Math.min(224/extent,432/maxH);
 const dir=path.join(root,'characters',c.id);fs.mkdirSync(dir,{recursive:true});const frames=[],buffers=[];
 for(let f=0;f<2;f++){const p=parts[f],b=p.b,w=Math.round(b.width*scale),hh=Math.round(b.height*scale),x=Math.round(256+(b.x-p.anchorX)*scale),y=472-hh;
 const crop=await sharp(p.data,{raw:{width:p.cw,height:h,channels:4}}).extract({left:b.x,top:b.y,width:b.width,height:b.height}).resize(w,hh).png().toBuffer();
 const buf=await sharp({create:{width:512,height:512,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite([{input:crop,left:x,top:y}]).png().toBuffer();
 fs.writeFileSync(path.join(dir,'attack-'+f+'.png'),buf);buffers.push(buf);frames.push({file:'characters/'+c.id+'/attack-'+f+'.png',index:f,phase:f?'impact':'anticipation',durationMs:f?140:220,rect:{x:f*512,y:0,width:512,height:512},sourceCell:{x:p.left,y:0,width:p.cw,height:h},sourceBounds:b,sourceAnchor:{x:p.anchorX,y:b.bottom},placement:{x,y,width:w,height:hh},scale,pivot:{x:256,y:472}});
 }
 const sheet=await sharp({create:{width:1024,height:512,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite(buffers.map((input,i)=>({input,left:i*512,top:0}))).png().toBuffer();fs.writeFileSync(path.join(dir,'attack-sheet.png'),sheet);
 overview.push({input:await sharp(sheet).resize(512,256).png().toBuffer(),left:(manifest.length%3)*512,top:Math.floor(manifest.length/3)*256});
 const same=parts[0].data.equals(parts[1].data);checks.push({id:c.id,alpha:m.hasAlpha,sourceSize:[m.width,m.height],split,sameScale:frames[0].scale===frames[1].scale,identicalFrames:same,bounds:parts.map(p=>p.b),edgeTouch:parts.some(p=>p.b.x<=0||p.b.y<=0||p.b.x+p.b.width>=p.cw||p.b.bottom>=h-1),note:'Checks canvas/alpha/scale only. Independent painted poses are not pixel-identical anatomy.'});
 manifest.push({...c,canvas:{width:512,height:512},pivot:{x:256,y:472},facing:c.id.startsWith('cat-')?'right':'left',sheet:'characters/'+c.id+'/attack-sheet.png',frames});
}
fs.writeFileSync(path.join(root,'manifest.json'),JSON.stringify({version:4,characters:manifest},null,2));fs.writeFileSync(path.join(root,'data.js'),'window.ATTACKS='+JSON.stringify(manifest)+';');fs.writeFileSync(path.join(root,'validation.json'),JSON.stringify(checks,null,2));
await sharp({create:{width:1536,height:Math.ceil(roster.length/3)*256,channels:4,background:'#eee6dc'}}).composite(overview).png().toFile(path.join(root,'previews','all-attacks.png'));
console.log(JSON.stringify({characters:manifest.length,frames:manifest.length*2,alphaFailures:checks.filter(x=>!x.alpha),edgeTouches:checks.filter(x=>x.edgeTouch).map(x=>x.id)}));})();
