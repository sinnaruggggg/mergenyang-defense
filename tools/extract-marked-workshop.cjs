// Direct source-pixel cutouts. Polygons define alpha only; no artwork is drawn.
const fs=require('fs'),path=require('path');
const sharp=require('C:/Users/sinna/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const root=path.resolve(__dirname,'../game/assets/workshop-marked');
const source=path.resolve(__dirname,'../art/workshop-separable-v1/reference-full.png');
const objects=[
 {id:'forge',origin:[0,260],foot:878,p:[[0,139],[18,138],[18,131],[51,92],[99,56],[108,51],[115,30],[143,28],[149,0],[169,0],[169,32],[174,34],[174,45],[162,49],[172,53],[176,62],[177,78],[195,85],[226,128],[237,139],[264,190],[275,208],[290,215],[292,248],[271,256],[247,264],[244,310],[253,312],[260,299],[270,303],[290,320],[292,331],[278,346],[265,349],[257,378],[256,397],[288,394],[299,400],[298,430],[302,433],[307,430],[318,440],[319,451],[309,463],[295,471],[291,489],[271,493],[266,489],[261,470],[247,479],[246,533],[255,554],[269,588],[266,597],[240,597],[230,610],[167,622],[145,613],[139,585],[119,562],[106,520],[68,509],[34,513],[0,506]]},
 {id:'weapons',origin:[0,260],foot:753,p:[[288,403],[292,364],[288,302],[286,263],[291,252],[299,245],[303,248],[307,263],[310,262],[305,250],[306,240],[312,239],[318,249],[321,271],[324,295],[328,300],[333,298],[332,281],[331,268],[335,266],[340,270],[342,299],[348,322],[353,333],[356,354],[361,372],[362,405],[367,420],[370,467],[365,480],[350,490],[317,492],[303,487],[297,468],[297,441],[303,432],[305,409]]},
 {id:'small-barrel',origin:[660,310],foot:763,p:[[16,342],[20,336],[31,340],[35,343],[40,337],[40,308],[47,289],[50,270],[60,253],[65,252],[68,257],[67,280],[60,298],[58,327],[53,341],[61,345],[65,359],[62,375],[64,393],[66,417],[62,436],[53,446],[48,448],[42,445],[32,447],[23,442],[20,423],[16,408],[16,378],[20,353]]},
 {id:'right-workbench',origin:[660,310],foot:964,p:[[78,36],[108,30],[122,35],[151,28],[179,26],[190,19],[218,18],[247,12],[281,10],[281,620],[259,620],[240,593],[233,562],[221,560],[219,607],[201,611],[192,601],[192,560],[180,558],[170,535],[154,535],[149,512],[137,510],[127,489],[107,490],[90,487],[79,470],[73,462],[68,479],[61,482],[57,477],[60,458],[57,451],[45,454],[40,453],[34,484],[26,528],[17,526],[15,516],[26,477],[29,464],[23,460],[21,451],[24,445],[42,440],[58,441],[69,446],[83,458],[83,439],[79,422],[47,414],[32,403],[29,391],[36,384],[49,380],[60,382],[72,370],[88,368],[101,360],[105,335],[114,322],[126,318],[131,310],[123,300],[130,292],[147,289],[151,281],[155,284],[160,297],[168,304],[166,314],[172,325],[168,337],[173,345],[173,357],[157,376],[163,379],[194,381],[186,361],[175,349],[174,338],[178,321],[187,312],[182,301],[181,290],[187,280],[189,267],[197,266],[204,269],[204,282],[209,292],[222,290],[224,276],[238,279],[240,292],[243,302],[252,295],[263,297],[265,311],[281,315],[281,45],[196,59],[160,60],[140,56],[131,69],[128,193],[123,241],[120,266],[114,277],[114,302],[105,310],[98,332],[87,339],[79,342],[83,321],[81,304],[72,314],[67,306],[65,297],[68,273],[77,263],[83,268],[88,257],[91,239],[101,233],[113,235],[116,173],[112,129],[112,78],[79,82]]},
 {id:'central-table',origin:[300,790],foot:1080,p:[[22,57],[29,53],[68,53],[108,41],[109,35],[128,33],[165,38],[177,38],[177,33],[183,30],[210,32],[215,40],[215,49],[272,43],[279,41],[287,44],[287,54],[260,61],[290,63],[328,68],[366,58],[396,57],[403,66],[401,85],[393,94],[373,102],[371,155],[385,152],[409,157],[417,154],[425,158],[434,159],[438,166],[448,169],[451,184],[450,227],[458,233],[459,244],[441,255],[413,257],[405,251],[387,265],[370,267],[368,272],[351,269],[339,266],[329,265],[316,267],[308,264],[299,267],[288,265],[277,258],[273,272],[243,279],[234,278],[229,277],[215,280],[216,288],[186,298],[166,295],[160,289],[138,284],[125,273],[125,264],[133,234],[125,230],[120,237],[122,251],[122,264],[119,275],[113,280],[73,283],[42,275],[33,268],[28,251],[27,236],[23,229],[23,208],[26,203],[25,192],[21,183],[24,176],[30,177],[37,192],[41,187],[38,170],[43,165],[50,169],[57,185],[60,169],[63,157],[61,133],[67,118],[70,109],[62,104],[32,89],[25,84]]},
 {id:'left-chest',origin:[0,0],foot:1280,p:[[0,994],[34,1008],[47,1034],[78,1033],[111,1045],[131,1064],[150,1068],[170,1094],[178,1147],[175,1203],[183,1235],[177,1254],[169,1259],[162,1256],[161,1244],[114,1259],[65,1274],[0,1287]]},
 {id:'right-armor',origin:[0,0],foot:1420,p:[[941,976],[929,984],[923,966],[919,930],[913,912],[909,895],[904,902],[902,934],[898,958],[894,977],[887,985],[881,1000],[877,1013],[869,1040],[856,1043],[844,1030],[842,1004],[847,996],[851,987],[847,978],[836,969],[827,969],[817,980],[817,990],[825,1000],[820,1027],[822,1040],[811,1045],[795,1057],[774,1077],[769,1068],[767,1048],[763,1046],[757,1080],[757,1100],[749,1122],[746,1145],[758,1167],[758,1187],[750,1203],[741,1227],[726,1249],[725,1273],[717,1298],[718,1320],[725,1331],[727,1344],[741,1355],[767,1356],[780,1366],[811,1381],[842,1391],[873,1397],[912,1414],[941,1420]]}
];
// The right unit includes its entire solid tool backboard, not individual tools.
const bench=objects.find(o=>o.id==='right-workbench');
bench.p=bench.p.slice(0,bench.p.findIndex(p=>p[0]===72&&p[1]===370));
bench.p.push([72,370],[78,342],[73,326],[72,314],[67,306],[65,297],[68,273],[77,263],[83,268],[88,257],[91,239],[101,233],[113,235],[116,173],[112,129],[112,78],[79,82]);
objects.find(o=>o.id==='small-barrel').p=[[17,342],[26,339],[45,340],[61,345],[65,359],[62,375],[64,393],[66,417],[62,436],[53,446],[42,450],[27,444],[23,435],[20,423],[16,408],[16,378],[20,353]];
function inside(x,y,p){let yes=false;for(let i=0,j=p.length-1;i<p.length;j=i++){const a=p[i],b=p[j];if((a[1]>y)!=(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])yes=!yes;}return yes;}
(async()=>{
 fs.mkdirSync(root,{recursive:true});const {data,info}=await sharp(source).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 const fill=await sharp(path.resolve(__dirname,'../art/workshop-separable-v1/layers/background-clean.png')).ensureAlpha().raw().toBuffer();
 const bg=Buffer.from(data),manifest=[];
 for(const item of objects){const p=item.p.map(([x,y])=>[x+item.origin[0],y+item.origin[1]]);const x=Math.max(0,Math.floor(Math.min(...p.map(a=>a[0])))),y=Math.max(0,Math.floor(Math.min(...p.map(a=>a[1])))),w=Math.min(info.width,Math.ceil(Math.max(...p.map(a=>a[0]))))-x,h=Math.min(info.height,Math.ceil(Math.max(...p.map(a=>a[1]))))-y;const pixels=Buffer.alloc(w*h*4);
  for(let v=0;v<h;v++)for(let u=0;u<w;u++)if(inside(x+u+.5,y+v+.5,p)){const from=((y+v)*info.width+x+u)*4;data.copy(pixels,(v*w+u)*4,from,from+4);fill.copy(bg,from,from,from+4);}
  await sharp(pixels,{raw:{width:w,height:h,channels:4}}).png().toFile(path.join(root,item.id+'.png'));
  manifest.push({id:item.id,x,y,w,h,depth:item.foot,file:item.id+'.png'});
 }
 await sharp(bg,{raw:info}).png().toFile(path.join(root,'background.png'));
 const live=Buffer.from(bg),oldRoot=path.resolve(root,'../workshop-approved');
 const clean=await sharp(path.join(oldRoot,'background.png')).ensureAlpha().raw().toBuffer();
 const edge=await sharp(path.join(oldRoot,'reference-edge.png')).ensureAlpha().raw().toBuffer();
 for(let i=0;i<edge.length;i+=4)if(edge[i+3])clean.copy(live,i,i,i+4);
 const old=JSON.parse(fs.readFileSync(path.join(oldRoot,'placement.json')));
 for(const c of old.layers.filter(c=>c.character)){
  const cut=await sharp(path.join(oldRoot,c.file)).ensureAlpha().raw().toBuffer();
  for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++)if(cut[(y*c.width+x)*4+3]){const i=((y+c.y)*info.width+x+c.x)*4;clean.copy(live,i,i,i+4);}
 }
 await sharp(live,{raw:info}).png().toFile(path.join(root,'background-live.png'));
 const composed=await sharp(bg,{raw:info}).composite(manifest.map(m=>({input:path.join(root,m.file),left:m.x,top:m.y}))).png().toBuffer();await sharp(composed).toFile(path.join(root,'reassembled.png'));
 const result=await sharp(composed).raw().toBuffer();let different=0;for(let i=0;i<data.length;i+=4)if(!data.subarray(i,i+4).equals(result.subarray(i,i+4)))different++;
 fs.writeFileSync(path.join(root,'placement.json'),JSON.stringify({width:info.width,height:info.height,layers:manifest,validation:{differentPixels:different}},null,2));
 console.log(JSON.stringify({layers:manifest,differentPixels:different}));
})();
