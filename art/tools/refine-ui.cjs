const fs=require('fs'),path=require('path');const f=path.join(__dirname,'build-ui.cjs');let s=fs.readFileSync(f,'utf8');
function change(a,b){if(!s.includes(a))throw Error('Expected source not found: '+a.slice(0,80));s=s.replace(a,b)}
change("header(title,back){this.panel(30,28,1020,90,'cream','resource-bar');","header(title,back){this.panel(30,28,1020,90,'cream','resource-bar');this.panel(30,128,1020,104,'cream','title-bar');");
change("hitRect:{x,y,width:w,height:h},action:target?","hitRect:{x:Math.max(0,x-(Math.max(132,w)-w)/2),y:Math.max(0,y-(Math.max(132,h)-h)/2),width:Math.max(132,w),height:Math.max(132,h)},action:target?");
change("this.cat(cat,650,y+Math.max(80,h-290),280)","cat==='eel'?this.image('boss-eel','bosses/eel.png',650,y+Math.max(80,h-290),280,280):this.cat(cat,650,y+Math.max(80,h-290),280)");
change("250,390,'purple','wizard'","250,390,'purple','eel'");
change("s.icon('rat',746,432,170);s.icon('rat',875,368,142);","if(id==='battle-boss'){s.image('boss-eel','bosses/eel.png',684,317,300,300)}else{s.icon('rat',746,432,170);s.icon('rat',875,368,142)};");
// Fix mock data navigation: purchase confirmation must not imply every product is the starter bundle.
change("['첫 구매 패키지','보석 300 · 한정 스킨 · 희귀 무기','₩1,200 · 실제 결제는 연결되지 않았어요']","['상품명 · 선택한 상품 정보','구성 · 수량 · 최종 결제 금액 표시','결제 연결 전 공통 확인 창 디자인']");
change("s.text('추천 조합',78,1590,230,30)","s.text('출전 조합',78,1590,230,30)");
fs.writeFileSync(f,s);console.log('UI refinements applied');
