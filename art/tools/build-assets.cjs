const fs=require('fs'), path=require('path'), crypto=require('crypto');
const sharp=require('C:/Users/sinna/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const ROOT=path.resolve(__dirname,'..'), OUT=path.join(ROOT,'build');
const mkdir=p=>fs.mkdirSync(p,{recursive:true});
const write=(p,s)=>{mkdir(path.dirname(p));fs.writeFileSync(p,s)};
const svg=(w,h,s)=>`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${s}</svg>`;
const C={ink:'#3D4554',cream:'#FFF8EB',mint:'#BEDFCD',blue:'#C8DFF0',peach:'#F1CEBC',purple:'#DACFEC',yellow:'#F5DA8B',line:'#727C83'};
const icons={
 gold:'<circle cx="64" cy="64" r="43" fill="#F5DA8B"/><circle cx="64" cy="64" r="31" fill="none"/><path d="m64 40 7 15 17 2-13 12 3 17-14-8-15 8 3-17-12-12 17-2z" fill="#FFF8EB"/>',
 gem:'<path d="m21 47 19-24h49l20 24-45 60z" fill="#DACFEC"/><path d="m21 47h88M40 23l-2 24 26 60 25-60V23M38 47l26-24 25 24" fill="none"/>',
 energy:'<path d="M69 12 28 70h29l-5 46 47-64H69z" fill="#F5DA8B"/>',
 forge:'<path d="M15 41h98L91 63H73v24h22v15H34V87h20V65L15 52z" fill="#BED7E3"/>',
 cat:'<path d="m28 44-3-28 28 18h23l28-18-3 31q16 17 7 42-10 27-46 24-37 0-45-24-5-22 11-45z" fill="#FFF8EB"/><path d="M40 65v6m47-6v6M58 80q6 9 12 0" fill="none"/>',
 sword:'<path d="m89 12 23 5-6 23-55 52-18-18z" fill="#DCE9EF"/><path d="m27 70 32 32M21 107l23-22" fill="none" stroke-width="12"/><path d="m20 103 5 6"/>',
 shield:'<path d="m64 13 41 16-5 50q-8 23-36 36-30-14-37-36l-5-50z" fill="#BEDFCD"/><path d="m64 30 26 9-4 34q-5 17-22 26-18-10-22-27l-4-33z" fill="#E8F1E5"/>',
 bow:'<path d="M40 15q75 45 0 98" fill="none" stroke="#A78062" stroke-width="11"/><path d="m40 15 6 49-6 49M22 64h92m-15-12 16 12-16 12" fill="none"/>',
 staff:'<path d="m61 49 8 69" stroke="#A78062" stroke-width="12"/><path d="m63 12 7 16 18 4-13 12 1 19-14-10-18 7 6-18-10-15 19-1z" fill="#BEDFCD"/>',
 wand:'<path d="m58 54 16 64" stroke="#A78062" stroke-width="11"/><path d="m58 8 12 21 24 6-18 18-3 23-20-14-23 3 8-23-8-20 24 1z" fill="#DACFEC"/>',
 hammer:'<path d="m60 50 8 65" stroke="#AD8F73" stroke-width="19"/><rect x="23" y="18" width="82" height="41" rx="10" fill="#C3D4DF"/>',
 shop:'<path d="M22 55h85v56H22z" fill="#FFF8EB"/><path d="M14 56 26 19h75l15 37q-13 15-26 0-13 15-26 0-13 15-25 0-13 15-25 0z" fill="#F1CEBC"/><path d="M48 112V78h30v34" fill="#C8DFF0"/>',
 trophy:'<path d="M37 18h53v29q0 32-26 32T37 47z" fill="#F5DA8B"/><path d="M37 28H19v20q0 19 24 18m47-38h18v20q0 19-24 18M64 80v20M44 112h40" fill="none" stroke-width="10"/>',
 chest:'<path d="M19 62V44q0-24 25-24h41q26 0 26 24v18" fill="#F5DA8B"/><rect x="17" y="57" width="95" height="51" rx="9" fill="#D4B394"/><path d="M36 23v84m58-83v83M18 66h94" fill="none"/><rect x="54" y="57" width="22" height="29" rx="5" fill="#F5DA8B"/>',
 heart:'<path d="M64 110 18 64C-8 27 36 1 64 35c28-34 71-8 47 29z" fill="#EDB4B5"/>',
 mail:'<rect x="16" y="30" width="98" height="69" rx="12" fill="#FFF8EB"/><path d="m20 36 45 36 45-36" fill="none"/>',
 gear:'<path d="m51 13 25 0 5 15 14 8 17-1 11 22-12 14-1 15-12 20-20-1-12 9-24-6-5-18-13-11 1-23 16-10z" fill="#C8DFF0"/><circle cx="66" cy="64" r="22" fill="#FFF8EB"/>',
 plus:'<path d="M64 25v78M25 64h78" fill="none" stroke-width="15"/>',
 close:'<path d="m32 32 64 64m0-64-64 64" fill="none" stroke-width="12"/>',
 back:'<path d="M82 24 41 64l41 40" fill="none" stroke-width="12"/>',
 lock:'<path d="M39 56V37q0-27 25-27t25 27v19" fill="none" stroke-width="10"/><rect x="25" y="52" width="79" height="65" rx="12" fill="#C9CFD5"/><path d="M64 77v16"/>',
 star:'<path d="m64 12 15 30 33 6-23 23 4 34-29-15-31 15 6-34-24-23 34-6z" fill="#F5DA8B"/>',
 book:'<path d="M13 23q27-9 51 7 26-17 51-7v79q-30-10-51 5-24-15-51-5z" fill="#C8DFF0"/><path d="M64 30v77M26 48h22M26 66h22m32-18h21M80 66h21" fill="none"/>',
 flag:'<path d="M29 115V16m0 5q29-15 48 0t33 0v54q-15 15-33 0T29 75" fill="#F1CEBC"/>',
 clock:'<circle cx="64" cy="64" r="48" fill="#FFF8EB"/><path d="M64 31v35l23 15" fill="none"/>',
 can:'<rect x="32" y="27" width="65" height="80" rx="11" fill="#F1CEBC"/><ellipse cx="64" cy="27" rx="32" ry="10" fill="#D6E2E8"/><path d="M52 70q12-17 26 0-13 16-26 0m0 0-9-9v18z" fill="#FFF8EB"/>',
 yarn:'<circle cx="64" cy="59" r="38" fill="#DACFEC"/><path d="M38 31q45 14 54 50M27 54q37 5 60 37M57 22q-19 44-5 74m29-10q31 0 26 21-5 19-29 7" fill="none"/>',
 paw:'<ellipse cx="64" cy="86" rx="30" ry="24" fill="#F5DA8B"/><ellipse cx="26" cy="52" rx="12" ry="17" fill="#F5DA8B"/><ellipse cx="51" cy="34" rx="12" ry="17" fill="#F5DA8B"/><ellipse cx="80" cy="34" rx="12" ry="17" fill="#F5DA8B"/><ellipse cx="103" cy="54" rx="12" ry="17" fill="#F5DA8B"/>',
 play:'<path d="M36 18 107 64 36 111z" fill="#BEDFCD"/>',
 pause:'<rect x="32" y="22" width="20" height="84" rx="7" fill="#FFF8EB"/><rect x="78" y="22" width="20" height="84" rx="7" fill="#FFF8EB"/>',
 rat:'<circle cx="35" cy="35" r="21" fill="#DACFEC"/><circle cx="92" cy="35" r="21" fill="#DACFEC"/><path d="M19 67q0-39 45-39t45 39v25q-43 29-90 0z" fill="#D6CFDF"/><path d="M44 64v5m39-5v5m-27 16q8 8 16 0" fill="none"/>',
 crown:'<path d="m19 34 24 19 21-33 23 33 24-19-12 62H30z" fill="#F5DA8B"/>',
 tree:'<path d="M64 11 20 57h20L15 90h38v28h22V90h38L86 57h23z" fill="#BEDFCD"/>',
 ticket:'<path d="M15 34h98v23q-22 7 0 23v23H15V80q22-10 0-23z" fill="#DACFEC"/><path d="M85 39v58" stroke-dasharray="7 7" fill="none"/>',
 check:'<path d="m24 62 27 27 54-54" fill="none" stroke="#628E79" stroke-width="14"/>',
 help:'<circle cx="64" cy="64" r="47" fill="#C8DFF0"/><path d="M45 46q2-23 24-17 23 12 4 28-11 7-9 20m0 16v2" fill="none"/>',
 people:'<circle cx="49" cy="40" r="22" fill="#BEDFCD"/><path d="M14 111V95q0-28 35-28t35 28v16z" fill="#BEDFCD"/><path d="M83 20q41-2 26 37M91 72q29 4 25 35" fill="none"/>',
 scroll:'<rect x="26" y="18" width="76" height="94" rx="9" fill="#FFF8EB"/><path d="M41 43h45M41 63h45M41 83h29" fill="none"/>'
};
async function asset(name,w,h,body){const s=svg(w,h,body);write(path.join(OUT,'assets',name+'.svg'),s);await sharp(Buffer.from(s)).png().toFile(path.join(OUT,'assets',name+'.png'));return{name,w,h};}
async function main(){mkdir(path.join(OUT,'assets'));mkdir(path.join(OUT,'characters'));mkdir(path.join(OUT,'backgrounds'));
const catalog=[];
for(const [id,body] of Object.entries(icons))catalog.push(await asset('icons/'+id,128,128,`<g stroke="${C.ink}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round">${body}</g>`));
for(const [id,color] of Object.entries({cream:C.cream,mint:C.mint,blue:C.blue,peach:C.peach,purple:C.purple,yellow:C.yellow,dark:'#53616D'})){
 catalog.push(await asset('panels/'+id,128,128,`<rect x="4" y="10" width="120" height="114" rx="23" fill="#4E5662" opacity=".15"/><rect x="3" y="3" width="122" height="115" rx="23" fill="${color}" stroke="${C.line}" stroke-width="3"/><rect x="9" y="9" width="110" height="103" rx="18" fill="none" stroke="white" stroke-opacity=".55" stroke-width="3"/>`));
 for(const [state,fill,off] of [['normal',color,0],['pressed',color,5],['disabled','#E0DFD9',0],['selected',color,0]]){
 catalog.push(await asset(`buttons/${id}-${state}`,320,104,`<rect x="3" y="10" width="314" height="91" rx="25" fill="#737A78" opacity=".4"/><rect x="3" y="${3+off}" width="314" height="88" rx="25" fill="${fill}" stroke="${state==='selected'?'#547F70':C.line}" stroke-width="${state==='selected'?5:3}"/><path d="M26 ${15+off}h268" stroke="white" opacity=".6" stroke-width="5" stroke-linecap="round"/>`));
 }}
catalog.push(await asset('effects/slash',256,256,'<path d="M33 226Q98 85 225 30Q149 151 33 226" fill="#FFF5C3" stroke="#F5DA8B" stroke-width="6"/>'));
catalog.push(await asset('effects/spark',256,256,'<path d="m128 13 19 79 81-30-62 59 77 36-85-6-5 88-31-75-77 49 52-72-76-29 82-5z" fill="#F5DA8B" stroke="#FFF8EB" stroke-width="8"/>'));
for(const id of ['workshop','town','shop'])await sharp(path.join(ROOT,'source',`background-${id}.png`)).resize(1080,1920,{fit:'cover'}).png().toFile(path.join(OUT,'backgrounds',id+'.png'));
const {data,info}=await sharp(path.join(ROOT,'source','characters-master.png')).ensureAlpha().raw().toBuffer({resolveWithObject:true});
const chars=['warrior','tank','archer','healer','wizard','smith'];const names=['전사냥이','뚱냥이','궁사냥이','성직냥이','마법사냥이','머지냥이'];const weapons=['sword','shield','bow','staff','wand','hammer'];const rigs=[];
for(let i=0;i<6;i++){
 const cell={x:Math.floor(i%3*info.width/3),y:Math.floor(Math.floor(i/3)*info.height/2),w:Math.floor(info.width/3),h:Math.floor(info.height/2)};
 let left=cell.x+cell.w,top=cell.y+cell.h,right=cell.x,bottom=cell.y;
 for(let y=cell.y;y<cell.y+cell.h;y++)for(let x=cell.x;x<cell.x+cell.w;x++)if(data[(y*info.width+x)*4+3]>16){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y)}
 const trim={left,top,width:right-left+1,height:bottom-top+1};
 const body=await sharp(path.join(ROOT,'source','characters-master.png')).extract(trim).resize(420,420,{fit:'inside'}).png().toBuffer();const bmeta=await sharp(body).metadata();
 const bx=Math.round((512-bmeta.width)/2),by=470-bmeta.height;
 const base=await sharp({create:{width:512,height:512,channels:4,background:'#00000000'}}).composite([{input:body,left:bx,top:by}]).png().toBuffer();
 const dir=path.join(OUT,'characters',chars[i]);mkdir(dir);write(path.join(dir,'body.png'),base);
 const bodyHash=crypto.createHash('sha256').update(base).digest('hex');
 const rig={id:chars[i],name:names[i],canvas:[512,512],anchor:[256,470],body:{file:'body.png',sha256:bodyHash,rect:[bx,by,bmeta.width,bmeta.height]},weapon:weapons[i],frameDurationMs:220,scaleInvariant:true,frames:[]};
 for(const action of ['idle','action'])for(let f=0;f<2;f++){
   const dx=action==='action'?f*5:0,dy=action==='idle'?-f*4:0;
   const angles=[[-20,50],[0,0],[-3,0],[-8,8],[-12,12],[-35,48]];
   const angle=action==='action'?angles[i][f]:0;
   const grip=[370,400];
   const locals={sword:[20,107],shield:[64,88],bow:[46,64],staff:[67,94],wand:[67,94],hammer:[66,94]};
   const local=locals[weapons[i]],toolX=grip[0]-local[0]*.94,toolY=grip[1]-local[1]*.94;
   const tool=fs.readFileSync(path.join(OUT,'assets','icons',weapons[i]+'.svg'),'utf8').replace(/^<svg[^>]*>/,'').replace(/<\/svg>$/,'');
   const embedded=base.toString('base64');
   const effect=action==='action'&&f===1?(i===2?'<path d="M404 359h73m-11-9 13 9-13 9" fill="none" stroke="#A78062" stroke-width="5" stroke-linecap="round"/>':i===3||i===4?`<path d="m439 277 6 18 19 5-19 6-6 18-5-18-19-6 19-5z" fill="${i===3?'#BEDFCD':'#DACFEC'}" stroke="#FFF8EB" stroke-width="3"/>`:i===5?'<path d="m448 417 4 13 16 3-15 6-4 15-5-15-15-5 15-4z" fill="#F5DA8B"/>':''):'';
   const content=`<image href="data:image/png;base64,${embedded}" x="${dx}" y="${dy}" width="512" height="512"/><g transform="translate(${dx+(i===1&&action==='action'?f*12:0)} ${dy}) rotate(${angle} ${grip[0]} ${grip[1]})"><g transform="translate(${toolX} ${toolY}) scale(.94)">${tool}</g></g>${effect}`;
   const frameSvg=svg(512,512,content);const filename=`${action}-${f}.png`;await sharp(Buffer.from(frameSvg)).png().toFile(path.join(dir,filename));write(path.join(dir,`${action}-${f}.svg`),frameSvg);
   rig.frames.push({action,frame:f,file:filename,body:{x:dx,y:dy,rotation:0,scaleX:1,scaleY:1,sha256:bodyHash},weapon:{source:`../../assets/icons/${weapons[i]}.png`,position:[toolX+dx+(i===1&&action==='action'?f*12:0),toolY+dy],size:[120.32,120.32],pivot:[grip[0]+dx+(i===1&&action==='action'?f*12:0),grip[1]+dy],rotation:angle},effect:effect?{sourceSvg:effect,coordinateSystem:'512x512-top-left'}:null,durationMs:220});
 }
 for(const action of ['idle','action']){await sharp({create:{width:1024,height:512,channels:4,background:'#00000000'}}).composite([0,1].map(f=>({input:path.join(dir,`${action}-${f}.png`),left:f*512,top:0}))).png().toFile(path.join(dir,action+'-sheet.png'));}
 write(path.join(dir,'rig.json'),JSON.stringify(rig,null,2));rigs.push(rig);
}
write(path.join(OUT,'characters','manifest.json'),JSON.stringify(rigs,null,2));
const bossSource=path.join(ROOT,'source','boss-master.png');
if(fs.existsSync(bossSource)){
 const {data:bd,info:bi}=await sharp(bossSource).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 const bossIds=['eel','whale','golem','dog'];mkdir(path.join(OUT,'bosses'));
 for(let i=0;i<4;i++){const cx=Math.floor(i%2*bi.width/2),cy=Math.floor(Math.floor(i/2)*bi.height/2),cw=Math.floor(bi.width/2),ch=Math.floor(bi.height/2);let l=cx+cw,t=cy+ch,r=cx,b=cy;for(let y=cy;y<cy+ch;y++)for(let x=cx;x<cx+cw;x++)if(bd[(y*bi.width+x)*4+3]>16){l=Math.min(l,x);r=Math.max(r,x);t=Math.min(t,y);b=Math.max(b,y)}const piece=await sharp(bossSource).extract({left:l,top:t,width:r-l+1,height:b-t+1}).resize(450,450,{fit:'inside'}).png().toBuffer();const pm=await sharp(piece).metadata();await sharp({create:{width:512,height:512,channels:4,background:'#00000000'}}).composite([{input:piece,left:Math.round((512-pm.width)/2),top:480-pm.height}]).png().toFile(path.join(OUT,'bosses',bossIds[i]+'.png'))}
}
write(path.join(OUT,'assets','catalog.json'),JSON.stringify({palette:C,nineSlice:{panels:[28,28,28,28],buttons:[32,32,32,32]},assets:catalog},null,2));
console.log(JSON.stringify({assets:catalog.length,characters:rigs.length,frames:rigs.length*4,backgrounds:3}));
}
main().catch(e=>{console.error(e);process.exit(1)});
