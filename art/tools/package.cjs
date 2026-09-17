const fs=require('fs'),path=require('path'),crypto=require('crypto');
const sharp=require('C:/Users/sinna/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const ROOT=path.resolve(__dirname,'..'),B=path.join(ROOT,'build');const read=p=>JSON.parse(fs.readFileSync(path.join(B,p)));const write=(p,s)=>fs.writeFileSync(path.join(B,p),s);const csv=v=>'"'+String(v??'').replaceAll('"','""')+'"';
async function main(){const screens=read('layouts/screens.json'),rigs=read('characters/manifest.json');
const rows=[['screen','screenTitle','id','type','asset','text','x','yTop','width','height','yScene2D','z','fontSize','hitX','hitY','hitWidth','hitHeight','target']];for(const s of screens)for(const e of s.elements)rows.push([s.id,s.title,e.id,e.type,e.asset,e.text,e.x,e.y,e.width,e.height,1920-e.y-e.height,e.z,e.fontSize,e.hitRect?.x,e.hitRect?.y,e.hitRect?.width,e.hitRect?.height,e.action?.target]);write('docs/coordinates.csv','\ufeff'+rows.map(r=>r.map(csv).join(',')).join('\r\n'));
let catalog='# 화면 목록 · '+screens.length+'개\n\n각 화면은 screens/ID.png, screens/ID.svg, layouts/ID.json으로 제공됩니다.\n\n| 분류 | 화면 | ID | 요소 수 |\n|---|---|---|---:|\n';for(const s of screens)catalog+=`|${s.group}|${s.title}|${s.id}|${s.elements.length}|\n`;write('docs/SCREEN_CATALOG.md',catalog);
const icons=fs.readdirSync(path.join(B,'assets','icons')).filter(x=>x.endsWith('.png')),cols=8,cell=136,rowsN=Math.ceil(icons.length/cols),sprites=[];for(let i=0;i<icons.length;i++)sprites.push({name:icons[i].slice(0,-4),x:4+(i%cols)*cell,y:4+Math.floor(i/cols)*cell,width:128,height:128});fs.mkdirSync(path.join(B,'atlas'),{recursive:true});await sharp({create:{width:cols*cell,height:rowsN*cell,channels:4,background:'#00000000'}}).composite(sprites.map((s,i)=>({input:path.join(B,'assets','icons',icons[i]),left:s.x,top:s.y}))).png().toFile(path.join(B,'atlas','icons.png'));write('atlas/icons.json',JSON.stringify({texture:'icons.png',origin:'top-left',padding:4,trim:false,rotation:false,regions:sprites},null,2));write('atlas/icons.atlas',`icons.png\nsize: ${cols*cell},${rowsN*cell}\nformat: RGBA8888\nfilter: Linear,Linear\nrepeat: none\n`+sprites.map(s=>`${s.name}\n  rotate: false\n  xy: ${s.x}, ${s.y}\n  size: 128, 128\n  orig: 128, 128\n  offset: 0, 0\n  index: -1\n`).join(''));
const guide=`# 머지냥 디펜스 · 파스텔 UI 제작 패키지

선택한 2번 시안을 기반으로 크림·민트·더스티 블루·피치·라벤더 팔레트로 제작했습니다. 이미지 생성 도구는 내장 image_gen을 사용했습니다. 배경/고양이/보스의 생성 프롬프트와 원본은 ../source에 있습니다. UI 패널·버튼·아이콘은 좌표와 상태가 정확한 SVG 원본에서 PNG로 내보냈습니다.

## 납품 구성

- ${screens.length}개 개별 UI 화면: 1080×1920 PNG, 레이어 ID가 유지되는 SVG, 레이아웃 JSON.
- ${screens.reduce((n,s)=>n+s.elements.length,0)}개 배치 요소: 이미지·패널·버튼·아이콘·글자를 각각 분리.
- 공방/마을/상점 배경 3장, 고양이 6종, 월드보스 4종 투명 PNG.
- 고양이별 대기 2프레임 + 액션 2프레임: 512×512, 총 24프레임. 각각 1024×512 스프라이트 시트.
- 버튼 normal / pressed / disabled / selected, 패널 색상별 PNG와 SVG.
- 아이콘 PNG/SVG 및 LibGDX 텍스처 아틀라스, Noto Sans KR 폰트와 OFL 라이선스.
- index.html: 오프라인에서도 열리는 화면/레이어/좌표/애니메이션 검사기.
- docs/coordinates.csv: 전체 요소의 상단 기준 좌표와 Scene2D 좌표.

## 바로 확인하기

1. index.html을 브라우저로 엽니다.
2. 왼쪽에서 화면을 선택합니다. 레이어 선택 모드로 개별 요소를 누르면 좌표/파일을 확인합니다.
3. 메뉴 이동 모드에서는 디자인 동선을 확인할 수 있습니다. 계정, 입력 저장, 결제, 매칭, 보상, 전투 로직은 연결되지 않은 디자인 프로토타입입니다.
4. 캐릭터 액션 탭에서 6종의 2프레임 동작을 볼 수 있습니다.
5. screens의 PNG는 결과 확인용입니다. 게임 구현 시 한 장짜리 PNG를 UI 전체로 사용하지 말고 layouts의 요소를 순서대로 조립합니다.

## 좌표 계약

- 디자인 캔버스: W=1080, H=1920. 원점은 왼쪽 위, +x는 오른쪽, +y는 아래.
- 요소 x,y는 PNG 캔버스의 왼쪽 위이며 width,height는 배치 크기입니다. 알파가 있는 이미지도 임의로 다시 trim하지 않습니다.
- z 오름차순으로 렌더링합니다. UI 이미지와 텍스트는 분리되어 있습니다. 버튼 배경 안에 문구가 구워져 있지 않습니다.
- LibGDX/Scene2D 아래 원점 변환: xGdx=x, yGdx=1920-y-height.
- 텍스트 SVG 기준선: yBaselineTop=y+fontSize×1.03. 폰트는 fonts/NotoSansKR.ttf. 글꼴/굵기/크기를 유지해야 줄 길이가 같습니다.
- Noto Sans KR 가변 폰트 지원이 불확실한 모바일 글꼴 도구에서는 고정 굵기 인스턴스 또는 SDF/비트맵 폰트로 변환한 뒤 자간과 기준선을 대조하십시오. 이 패키지의 SVG/PNG와 브라우저는 동일한 번들 폰트를 사용합니다.
- FitViewport(1080,1920) 기준 균등 배율을 사용합니다. 더 긴 기기는 배경만 확장하고 컨트롤은 안전 영역에 유지합니다. x,y에 각기 다른 배율을 적용하면 고양이 몸이 찌그러집니다.
- 화면 컨트롤: 좌우 36px 이상, 상단 32px, 하단 26px 이상. 네이티브 시스템 바/노치 인셋은 런타임에서 별도 반영합니다.
- 버튼은 visual rect와 hitRect를 분리했습니다. 최소 hitRect 132px(360px 논리 폭 기준 44px). hitRect는 PNG 자체 크기를 바꾸지 않습니다.
- 실제 크기로 생성된 surfaces는 해당 width,height로 사용합니다. 다른 크기가 필요하면 SVG 원본 또는 9-slice를 사용합니다. 전체 PNG를 비균등 확대하면 모서리/테두리가 왜곡됩니다.

## 캐릭터 크기·형태 보존

- 각 캐릭터의 body.png는 한 번만 확정한 투명 원본입니다. 새 프레임에서 재생성하거나 다시 크기를 맞추지 않았습니다.
- 두 프레임 모두 512×512, 기준 앵커 (256,470). 몸 배율 scaleX=scaleY=1, 몸 회전=0입니다.
- 대기: 동일 몸을 y=0/-4px로 이동. 액션: 동일 몸을 x=0/+5px로 이동하고 별도 장비만 피벗 회전 또는 이동.
- 전사=검 휘두르기, 탱커=방패 밀기, 궁사=화살 발사, 성직자=회복 반짝임, 마법사=마법 반짝임, 대장장이=망치질.
- 이는 몸 실루엣을 고정한 2프레임 컷아웃 액션입니다. 걷기 사이클이나 관절별 리깅/Spine 프로젝트는 아닙니다.
- 프레임별 장비 위치, 각도, 피벗, 효과, 지속시간 220ms는 characters/이름/rig.json에 있습니다. 원본 몸과 장비 PNG를 실시간 조립하거나 완성 프레임 PNG/시트를 선택해 사용할 수 있습니다.
- 장비 교체는 rig의 weapon.source만 교체하고 해당 장비의 그립점에 맞춰 배치합니다. 검/방패 등 모든 종류에 동일한 그립점을 임의로 적용하지 않습니다.
- 아틀라스 패킹 시 자동 trim, 회전, 프레임별 tight packing을 끕니다. 캔버스와 앵커를 유지하세요. PNG는 straight alpha이며 블렌드는 SRC_ALPHA, ONE_MINUS_SRC_ALPHA에 맞춥니다.
- validation.json은 모든 프레임의 몸 원본 SHA-256과 얼굴 영역 실제 픽셀 일치를 검사합니다. 몸의 크기/얼굴/무늬는 프레임 간 동일하며 장비와 효과의 바깥 실루엣은 액션에 따라 변합니다.

## 화면 커버리지와 동적 콘텐츠

메인 5개, 시작/로그인, 성장, 5개 고양이 상세, 편성, 숙련도, 도감, 챕터/스테이지, 요일 던전, 탑, 이벤트, 협동 방/초대, 월드보스, 대전/팀/친선, 5종 랭킹, 프로필, 스킨/뽑기/교환/패키지/패스, 미션/출석/우편/친구, 설정, 각종 보상/확인/오류 팝업, 전투 HUD 5종을 포함합니다. 전체 목록은 SCREEN_CATALOG.md를 봅니다.

모든 스테이지/상품/랭킹 항목의 조합을 별도 이미지로 복제한 것은 아닙니다. 같은 구조의 동적 목록은 템플릿을 재사용합니다. 숫자·골드·닉네임은 샘플 데이터이며 게임 서버 값으로 대체합니다. 보석 상품 수량, 스킨 뽑기 확률/천장 등 기획서에 없는 값은 화면에 예시로 표기했습니다. 도감은 4개 라인의 대표 아이콘과 T1~T8 표기로 배치했으며 32종 장비의 개별 원화 세트는 아닙니다. 월드보스 4종은 메뉴용 정적 스프라이트이며 2프레임 대상은 플레이어 고양이 6종입니다.

## 검증과 재생성

- docs/validation.json: 파일/동선/양수 크기/화면 경계/히트 영역/상태 파일/알파/잘림/얼굴 픽셀 검사.
- docs/browser-validation.json: 번들 폰트 로딩, 한국어 글자 가로 넘침, 메뉴 이동, 82개 갤러리, 애니메이션 실제 프레임 전환.
- ../tools/build-assets.cjs → ../tools/build-ui.cjs → ../tools/validate.cjs → ../tools/verify-browser.cjs → ../tools/package.cjs 순서로 재생성합니다.
- Node의 sharp/playwright 경로는 제작 PC의 번들 런타임 경로입니다. 다른 PC에서는 해당 패키지 경로와 fonts.conf를 변경하면 됩니다. 원본 소스와 출력은 모두 D: 작업 폴더에 보관했습니다.

## 저장 위치

작업: D:/머지냥디펜스/art. 이미지 자동 저장: D:/CodexData/generated_images. C:/Users/sinna/.codex/generated_images는 D:를 가리키는 디렉터리 연결입니다.

세션/데스크톱 데이터 이전은 실행 중인 DB를 이동하지 않도록 D:/CodexData/Move-Codex-AfterExit.ps1에 분리했습니다. Codex 완전 종료 후 실행해야 하며, 기존 파일을 해시 검증한 뒤 D:/CodexData/home 및 desktop으로 연결합니다. 기존 C: 원본 백업은 자동 삭제하지 않습니다. 상태는 D:/CodexData/migration-status.txt에 기록됩니다. 현재 세션이 이동되었다고 가정하면 안 됩니다.
`;
write('docs/HANDOFF.md',guide);
const manifest=[];function walk(dir){for(const f of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,f.name);if(f.isDirectory())walk(p);else if(f.name!=='files-manifest.json'){const b=fs.readFileSync(p);manifest.push({path:path.relative(B,p).replaceAll('\\','/'),bytes:b.length,sha256:crypto.createHash('sha256').update(b).digest('hex')})}}}walk(B);write('files-manifest.json',JSON.stringify({version:'1.0',referenceSize:[1080,1920],files:manifest},null,2));
console.log(JSON.stringify({files:manifest.length,bytes:manifest.reduce((n,f)=>n+f.bytes,0),screens:screens.length,coordinateRows:rows.length-1}));
}
main().catch(e=>{console.error(e);process.exit(1)});
