# 머지냥 디펜스 · 파스텔 이미지 UI V3

기준 원화는 `../battle-concepts-v2/04-ratking-boss-pastel.png`입니다. 기존 V1 그래픽과 코드로 그린 아이콘·버튼·패널은 이 패키지에서 사용하지 않습니다. 기획서의 메뉴 내용과 연결 구조를 유지하며 새 원화로 화면을 구성했습니다.

## 구성

- 82개 메뉴·팝업·전투 화면: `screens/*.png`, 각 1080×1920.
- 120개 개별 원화 PNG: `assets/manifest.json`에서 원화와 추출 범위를 추적할 수 있습니다.
- 배경 4종, 메뉴 아이콘 36종, 머지 아이템 32종(4라인×8단계), 고양이 6종, 보스 2종.
- 버튼 4색 × normal/pressed/disabled/selected. 패널·레일·게이지·포인터·효과를 각각 분리했습니다.
- 모든 화면의 글자도 `assets/text/*.png`로 분리했습니다. 문자열·폰트·크기는 레이아웃 JSON에 남아 있어 실제 게임에서는 숫자와 번역 문구를 동적으로 바꿀 수 있습니다.
- PNG만으로 조립하는 `index.html`: 전체 메뉴, 에셋, 레이어 좌표, 메뉴 이동, 애니메이션 확인.
- 생성 원화와 프롬프트: `sources/`, `production.json`. 내장 image_gen 사용.

## 좌표와 배치

`layouts/화면ID.json`은 기준 해상도 1080×1920, 좌측 상단 원점의 x/y/width/height/z를 제공합니다. `yScene2D = 1920 - y - height`는 LibGDX 하단 원점용 좌표입니다. `hitRect`는 버튼 터치 영역입니다. 일반 이미지는 화면에 실제 배치된 PNG(`asset`)와 원화 에셋(`sourceAsset`)을 모두 기록합니다. `sourceFit`이 nine-slice인 패널은 생성 원화의 가장자리를 보존하여 분할 확대한 결과이며, 새 도형을 그린 것이 아닙니다. 화면 좌표와 같은 크기의 `assets/placed/` PNG를 사용하면 프리뷰와 동일하게 배치됩니다.

기기 화면비가 다르면 전체 게임 영역에 동일 비율의 fit 변환을 적용하고 남는 공간을 배경으로 처리하세요. 전투 보드는 5열×7행, 칸과 간격은 각 전투 JSON의 board 항목을 참고하세요.

## 2프레임 동작

고양이 6종의 대기 2프레임과 액션 2프레임, 총 24 PNG 및 12개 시트를 제공합니다. 512×512 고정 캔버스, 피벗 (256,476). 대기는 원본의 수직 2px 이동, 액션은 12px 전진/4px 상승 후 복귀하는 전진·반동 동작입니다. 프레임마다 캐릭터를 재생성하지 않았고, 이동량을 제거한 몸체 픽셀이 동일함을 검사했습니다. 관절이 꺾이거나 검을 휘두르는 포즈 애니메이션은 포함하지 않습니다.

## 제작 규칙

배경·캐릭터·아이콘·아이템·버튼·패널·효과의 그림은 전부 image_gen으로 만든 래스터 원화입니다. 코드의 역할은 투명 경계 탐색, 자르기, 크기/배치, 이미지 합성, 문자 조판, 아틀라스 패킹입니다. SVG/CSS/Canvas 도형으로 그림이나 아이콘을 대체하지 않습니다. 문자 PNG를 만들 때만 폰트 조판을 사용합니다.

이 패키지는 메뉴 디자인 및 에셋 인계용입니다. 미리보기의 메뉴 이동은 구현되어 있으나 실제 결제·서버·전투 게임 로직은 포함하지 않습니다.

## 화면 목록

| 분류 | 화면 | ID |
|---|---|---|
|시작|머지냥 디펜스|title|
|시작|반가워요, 집사님|login|
|대장간|냥이들의 대장간|workshop|
|대장간|대장간 성장|forge-growth|
|대장간|머지냥이 성장|smith-growth|
|대장간|생산 라인 확률|line-rates|
|팝업|방치 보상|offline|
|팝업|강화하기|upgrade|
|팝업|공방이 성장했어요!|upgrade-done|
|고양이|우리 고양이들|cats|
|고양이|전사냥이|cat-warrior|
|고양이|뚱냥이|cat-tank|
|고양이|궁사냥이|cat-archer|
|고양이|성직냥이|cat-healer|
|고양이|마법사냥이|cat-wizard|
|고양이|출전 편성|squad|
|고양이|장비 숙련도|mastery|
|고양이|수집 도감|codex|
|고양이|수집 보너스|collection-bonus|
|고양이|생선뼈 단검|item-detail|
|전투|모험을 떠나요|modes|
|전투|챕터 선택|chapters|
|전투|고양이 마을|stages|
|전투|출전 준비|prepare|
|전투|요일 던전|dungeon|
|전투|무한의 탑|tower|
|전투|이벤트|events|
|전투|가을 공방 축제|event-detail|
|협동|멀티 디펜스|coop|
|협동|협동 대기실|coop-room|
|협동|방 만들기|create-room|
|협동|초대 코드 입력|join-room|
|월드보스|월드보스|worldboss|
|월드보스|월드보스 보상|boss-rewards|
|대전|1:1 대전|arena|
|대전|팀 대전|team-arena|
|대전|친구 · 자유 대전|friendly|
|대전|상대를 찾고 있어요|matching|
|랭킹|대전 랭킹|ranking|
|랭킹|팀 대전 랭킹|ranking-team|
|랭킹|월드보스 랭킹|ranking-boss|
|랭킹|무한의 탑 랭킹|ranking-tower|
|랭킹|전투력 랭킹|ranking-power|
|랭킹|랭킹 선택|ranking-types|
|랭킹|집사 프로필|ranking-profile|
|랭킹|시즌 보상|season-rewards|
|상점|냥냥 상점|shop|
|상점|보석 충전|gems|
|상점|스킨 옷장|skins|
|상점|포근한 수호자|skin-detail|
|상점|스킨 뽑기|skin-draw|
|상점|스킨 뽑기 확률|probability|
|상점|월정액 츄르 구독|subscription|
|상점|패키지 상점|packages|
|상점|교환 상점|mode-shop|
|상점|시즌 패스|pass|
|소셜|일일 · 시즌 미션|missions|
|소셜|출석 선물|attendance|
|소셜|우편함|mail|
|소셜|친구|friends|
|소셜|내 프로필|profile|
|시스템|설정|settings|
|시스템|사운드|sound|
|시스템|화면 · 알림|notifications|
|시스템|고객 지원|support|
|팝업|쿠폰 입력|coupon|
|팝업|에너지 충전|energy|
|팝업|구매 확인|purchase|
|팝업|선물을 받았어요!|reward|
|팝업|잠시 쉬어갈까요?|pause|
|팝업|전투를 나갈까요?|leave-confirm|
|팝업|연결을 확인해 주세요|disconnected|
|전투 결과|승리했어요!|victory|
|전투 결과|다시 도전해 볼까요?|defeat|
|전투 결과|함께 지켜냈어요!|coop-results|
|전투 결과|대전 승리!|pvp-results|
|전투 HUD|개인 디펜스|battle|
|전투 HUD|협동 디펜스|battle-coop|
|전투 HUD|월드보스 도전|battle-boss|
|전투 HUD|1:1 대전|battle-pvp|
|전투 HUD|처음 만드는 작은 칼|tutorial|
|협동|도움 요청 · 스티커|coop-ping|
