const fs=require('fs'),path=require('path');
const sharp=require('C:/Users/sinna/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const root=path.resolve(__dirname,'../game/assets/workshop-approved');
const source=path.resolve(__dirname,'../art/workshop-separable-v1/reference-full.png');
const fill=path.resolve(__dirname,'../art/workshop-separable-v1/layers/background-clean.png');
const specs=[
 {id:'forge',foot:900,points:[[0,260],[106,275],[180,325],[245,440],[272,521],[306,599],[311,754],[283,780],[275,851],[203,892],[98,919],[0,987]]},
 {id:'bench',foot:950,points:[[941,320],[794,330],[745,370],[731,538],[695,582],[678,683],[648,731],[662,804],[690,830],[689,867],[754,897],[784,934],[941,984]]},
 {id:'table',foot:1080,points:[[408,815],[449,808],[506,814],[533,831],[573,829],[597,837],[642,836],[682,866],[702,897],[694,927],[686,951],[692,972],[737,962],[760,974],[773,1006],[762,1034],[733,1057],[682,1057],[635,1079],[550,1090],[490,1072],[447,1083],[374,1068],[332,1048],[316,1017],[324,979],[344,958],[353,924],[323,903],[310,883],[314,856],[365,838]]},
 {id:'left-front',foot:1600,points:[[0,965],[54,1001],[81,1059],[155,1053],[178,1080],[182,1178],[210,1198],[274,1286],[286,1342],[235,1391],[186,1410],[179,1510],[225,1588],[257,1672],[0,1672]]},
 {id:'right-front',foot:1580,points:[[941,900],[906,921],[894,967],[861,984],[843,997],[821,1015],[816,1025],[790,1035],[769,1076],[739,1122],[730,1173],[724,1221],[690,1238],[654,1300],[654,1389],[626,1424],[628,1490],[656,1514],[643,1587],[677,1664],[941,1672]]},
 {id:'mage',character:true,foot:792,points:[[440,607],[475,600],[501,606],[522,616],[557,621],[567,619],[563,645],[546,665],[545,681],[558,687],[572,670],[582,648],[594,644],[603,658],[596,673],[584,689],[578,708],[566,725],[558,745],[544,768],[535,787],[523,794],[514,780],[500,781],[480,791],[468,795],[455,788],[448,776],[432,780],[414,769],[418,750],[407,742],[394,727],[390,704],[399,692],[411,699],[420,710],[428,710],[433,694],[444,680],[459,673],[466,672],[452,663],[435,652],[419,645],[423,628],[435,624]]},
 {id:'scout',character:true,foot:623,points:[[638,511],[660,514],[673,519],[675,537],[690,540],[693,561],[681,575],[677,594],[666,607],[665,619],[653,625],[643,619],[639,608],[625,617],[613,613],[609,603],[621,586],[609,579],[602,568],[615,547],[621,542],[618,527]]},
 {id:'warrior',character:true,foot:1457,points:[[457,1150],[478,1178],[506,1186],[522,1170],[532,1177],[538,1220],[549,1244],[552,1270],[543,1298],[551,1312],[555,1340],[550,1357],[539,1361],[541,1397],[532,1429],[521,1445],[503,1457],[482,1451],[470,1431],[458,1414],[438,1424],[423,1439],[407,1439],[392,1427],[387,1412],[376,1410],[355,1417],[330,1420],[315,1409],[318,1375],[333,1338],[346,1307],[356,1284],[362,1263],[371,1251],[365,1230],[350,1208],[339,1199],[333,1179],[346,1163],[364,1169],[374,1197],[389,1219],[405,1210],[421,1195],[440,1190]]}
];
// Contours traced on enlarged source crops; coordinates convert back to the
// approved source before extraction. No character pixels are regenerated.
const contours={
 mage:{origin:[350,570],scale:660/280,p:[[188,153],[211,142],[226,104],[254,81],[288,79],[324,83],[352,97],[402,120],[435,137],[466,130],[495,122],[510,127],[510,151],[499,180],[471,213],[477,243],[472,267],[456,285],[450,303],[456,330],[475,341],[491,350],[514,301],[511,291],[529,274],[531,262],[527,247],[510,237],[504,214],[505,201],[521,187],[551,178],[563,165],[572,167],[563,195],[580,220],[581,240],[572,254],[550,261],[541,270],[530,290],[516,310],[494,348],[493,371],[482,384],[465,415],[454,452],[447,467],[449,500],[455,510],[451,523],[431,530],[410,524],[397,504],[389,510],[381,503],[376,486],[360,494],[337,495],[326,483],[316,485],[307,499],[302,519],[284,523],[270,514],[262,491],[264,478],[250,470],[236,479],[215,478],[195,471],[178,457],[169,438],[164,407],[169,381],[181,360],[196,357],[211,365],[223,388],[222,406],[229,431],[244,436],[251,420],[237,400],[220,395],[222,380],[241,372],[252,346],[248,334],[258,315],[275,307],[307,296],[311,282],[292,272],[257,282],[243,280],[240,274],[260,251],[290,219],[278,206],[278,187],[270,164],[257,143],[247,134],[242,151],[227,163],[210,166],[193,162]]},
 warrior:{origin:[270,1100],scale:2,p:[[117,135],[138,123],[167,131],[174,154],[188,168],[206,201],[219,229],[243,217],[248,190],[254,150],[281,150],[322,165],[392,144],[414,97],[447,89],[461,114],[473,154],[471,183],[489,197],[510,234],[518,274],[512,306],[526,338],[535,361],[548,374],[560,400],[568,447],[568,467],[559,483],[543,491],[523,487],[512,472],[521,502],[532,542],[526,570],[520,569],[510,541],[495,523],[494,580],[485,591],[474,578],[476,605],[461,640],[438,658],[439,682],[428,696],[410,706],[387,703],[363,690],[349,671],[324,661],[302,636],[285,613],[269,608],[260,629],[244,621],[234,609],[207,621],[189,628],[174,613],[168,585],[173,554],[148,559],[122,547],[102,552],[94,561],[91,545],[100,499],[120,457],[142,421],[163,386],[184,363],[206,340],[215,325],[217,309],[202,297],[177,314],[163,308],[145,296],[139,285],[160,265],[170,253],[155,216],[136,185],[120,168],[116,152]]},
 scout:{origin:[580,480],scale:660/160,p:[[150,171],[159,194],[166,223],[150,244],[135,264],[141,280],[154,293],[177,304],[164,327],[171,348],[181,361],[179,379],[167,401],[145,431],[115,468],[116,491],[129,508],[162,517],[185,510],[198,518],[196,542],[189,550],[195,568],[205,575],[228,574],[234,566],[232,553],[245,533],[278,531],[291,538],[300,559],[300,570],[307,578],[334,579],[348,569],[347,560],[337,553],[339,537],[344,522],[348,500],[369,491],[371,478],[352,468],[386,464],[409,452],[427,432],[432,400],[431,368],[425,348],[440,326],[457,316],[465,304],[446,303],[456,291],[451,281],[430,289],[436,272],[428,260],[414,270],[412,287],[409,259],[403,251],[395,260],[399,277],[389,272],[376,281],[373,308],[383,318],[370,331],[349,331],[323,310],[334,294],[360,279],[382,259],[396,234],[394,225],[382,225],[377,212],[380,198],[372,185],[356,172],[371,147],[371,159],[352,185],[339,166],[329,155],[340,139],[338,143],[324,161],[297,155],[260,147],[228,150],[198,168],[184,174],[166,166]]}
};
for(const s of specs)if(contours[s.id]){const c=contours[s.id];s.points=c.p.map(([x,y])=>[c.origin[0]+x/c.scale,c.origin[1]+y/c.scale]);s.foot=Math.max(...s.points.map(p=>p[1]));}
function inside(x,y,p){let v=false;for(let i=0,j=p.length-1;i<p.length;j=i++){const a=p[i],b=p[j];if((a[1]>y)!=(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])v=!v;}return v;}
(async()=>{
 fs.mkdirSync(root,{recursive:true});
 const {data,info}=await sharp(source).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 const filler=await sharp(fill).resize(info.width,info.height).ensureAlpha().raw().toBuffer();
 const masks=specs.map(s=>{const m=new Uint8Array(info.width*info.height);for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++)if(inside(x+.5,y+.5,s.points))m[y*info.width+x]=1;return m;});
 // Characters own their pixels even when the furniture masks overlap them.
 for(let k=0;k<specs.length;k++)if(!specs[k].character)for(let j=0;j<specs.length;j++)if(specs[j].character)for(let n=0;n<masks[k].length;n++)if(masks[j][n])masks[k][n]=0;
 const base=Buffer.from(data),manifest=[];
 for(let k=0;k<specs.length;k++){
  const s=specs[k],mask=masks[k];let l=info.width,t=info.height,r=0,b=0;
  for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++)if(mask[y*info.width+x]){l=Math.min(l,x);r=Math.max(r,x);t=Math.min(t,y);b=Math.max(b,y);}
  const w=r-l+1,h=b-t+1,out=Buffer.alloc(w*h*4);
  for(let y=t;y<=b;y++)for(let x=l;x<=r;x++)if(mask[y*info.width+x]){const src=(y*info.width+x)*4,dst=((y-t)*w+x-l)*4;data.copy(out,dst,src,src+4);filler.copy(base,src,src,src+4);}
  await sharp(out,{raw:{width:w,height:h,channels:4}}).png().toFile(path.join(root,s.id+'.png'));
  manifest.push({id:s.id,file:s.id+'.png',x:l,y:t,width:w,height:h,foot:s.foot,character:!!s.character});
 }
 await sharp(base,{raw:{width:info.width,height:info.height,channels:4}}).png().toFile(path.join(root,'background.png'));
 // Actually composite the extracted layers, then compare their decoded pixels.
 const assembled=await sharp(base,{raw:{width:info.width,height:info.height,channels:4}}).composite(manifest.map(s=>({input:path.join(root,s.file),left:s.x,top:s.y}))).png().toBuffer();
 await sharp(assembled).toFile(path.join(root,'reassembled.png'));
 const actual=await sharp(assembled).ensureAlpha().raw().toBuffer();let mismatchedPixels=0;for(let i=0;i<data.length;i+=4)if(!actual.subarray(i,i+4).equals(data.subarray(i,i+4)))mismatchedPixels++;
 const report={canvas:{width:info.width,height:info.height},layers:manifest,validation:{mismatchedPixels,method:'decoded-pixel comparison of actual compositing, not original-file copy'},limitations:'Polygon masks; occluded background is reconstructed. Small surrounding pixels near masks may require final contour cleanup for moving sprites.'};
 fs.writeFileSync(path.join(root,'placement.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));if(mismatchedPixels)process.exitCode=1;
})();
