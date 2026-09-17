const fs=require('fs'),path=require('path');const root=path.resolve(__dirname,'..');
const p=path.join(__dirname,'build-ui.cjs');let s=fs.readFileSync(p,'utf8');s=s.replace("const sharp=require(","process.env.FONTCONFIG_FILE=path.join(__dirname,'fonts.conf');\nconst sharp=require(");s=s.replaceAll('Malgun Gothic','Noto Sans KR');fs.writeFileSync(p,s);
const v=path.join(root,'build','index.html');s=fs.readFileSync(v,'utf8').replaceAll('Malgun Gothic','Noto Sans KR');s=s.replace(':root{',"@font-face{font-family:'Noto Sans KR';src:url('fonts/NotoSansKR.ttf') format('truetype');font-weight:100 900;font-display:block}:root{");
// Preload both animation frames once, avoiding visible frame flashes on slower disks.
s=s.replace("show(location.hash.slice(1)||'workshop');", "for(const id of ['warrior','tank','archer','healer','wizard','smith'])for(const action of ['idle','action'])for(let f=0;f<2;f++){const p=new Image();p.src=`characters/${id}/${action}-${f}.png`}\nshow(location.hash.slice(1)||'workshop');");
fs.writeFileSync(v,s);console.log('Bundled font applied');
