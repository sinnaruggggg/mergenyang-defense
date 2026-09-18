# 머지냥 디펜스 · Android 네이티브

기획서(`art/source/game-design.md`)의 기술 스택대로 만든 네이티브 버전입니다.

| 영역 | 사용 기술 |
| --- | --- |
| 언어 | Kotlin 2.2 |
| 엔진 | libGDX 1.13.1 + KTX |
| 게임 구조 | Fleks ECS (고양이·몬스터·투사체 엔티티, 시스템) |
| UI | Scene2D (메뉴·팝업·결과·일시정지) |
| 리소스 | TexturePacker 아틀라스 6장(ui·icons·items·portraits·chars·lobby) + 배경 PNG |
| 데이터 | kotlinx.serialization + `assets/data/gamedata.json` (코드 수정 없이 밸런스 조정) |
| 저장 | Jetpack DataStore (Android), 파일 (데스크톱 개발용) |
| 빌드 | Gradle 8.14 Kotlin DSL, AGP 8.13, compileSdk/targetSdk 36, minSdk 26 |

## 모듈

- `core`: 게임 규칙, 머지 보드, 웨이브, 전투 공식, 저장 모델 (순수 Kotlin, 서버와 공유 가능, 단위 테스트 13개)
- `game`: libGDX 화면·연출·입력 (타이틀, 로비, 고양이, 성장, 모드, 스테이지, 상점, 랭킹, 전투)
- `android`: 앱 실행기, DataStore 저장, 진동. 결제·광고·로그인 연동 자리(`AndroidServices`)
- `desktop`: PC 개발 실행기, 자동 스크린샷 시나리오
- `tools`: 원화 → 아틀라스·런처 아이콘 생성, `gen_audio.py` 효과음·BGM 생성

## 빌드와 실행

모든 도구와 캐시는 D 드라이브에 있습니다 (`D:\Android\Sdk`, `D:\Android\gradle-home`, 가상기기 `D:\Android\avd`).

```bash
cd /d/머지냥디펜스/native
./gradlew :core:test                 # 규칙 단위 테스트
./gradlew :tools:run                 # 원화가 바뀌었을 때 아틀라스 재생성
./gradlew :android:assembleDebug     # APK 빌드
./gradlew :desktop:run               # PC에서 바로 실행
./gradlew :desktop:run --args="--shots D:/머지냥디펜스/native/shots"   # 자동 스크린샷
```

빌드된 APK는 `apk/mergenyang-debug.apk`에 복사해 두었습니다. 에뮬레이터 실행:

```bash
D:/Android/Sdk/emulator/emulator.exe -avd MergeNyang -gpu host
D:/Android/Sdk/platform-tools/adb.exe -s emulator-5554 install -r apk/mergenyang-debug.apk
```

경로에 한글이 있으면 Windows에서 테스트 실행기·aapt2가 실패하므로, 빌드 결과물은 자동으로 `D:\Android\gradle-home\project-builds\MergeNyangDefense` 아래에 만들어집니다.

## 캐릭터 프레임 크기 보정

대기 프레임(V3)과 공격 프레임(V4)은 원화 배율이 다르고, 공격 원화의 준비·타격 프레임끼리도 몸 크기가 다릅니다. 실루엣 겹침 비교로 구한 프레임별 보정값을 `gamedata.json`의 `atkFit` / `smithAtkFit`(`[[준비 배율, 가로 이동], [타격 배율, 가로 이동]]`)에 두고, 모든 화면이 `Chars.catAttack`을 거쳐 그립니다. 확인용 비교 시트는 자동 스크린샷의 `20_frame_sheet.png`입니다.

## 합성 해금 규칙

아이템은 4단계까지만 자유롭게 합성할 수 있고, 공방 레벨(대장간·머지냥이 강화 합계 + 1)이 오를 때마다 한 단계씩 열립니다. 요구 레벨은 뒤로 갈수록 가팔라집니다(`gamedata.json`의 `freeMergeTier`, `mergeUnlockLevels`: 2, 4, 7, 10, 14, 18, 23, 28, 34, 40, 47, 54 → 최대 16단계). 아직 열리지 않은 단계를 합치려 하면 필요한 공방 레벨을 알려 줍니다. 로비의 공방 카드에도 현재 상한과 다음 해금 레벨이 표시됩니다.

## 참고

- 빌드 결과물은 경로에 한글이 없는 폴더로 옮겨지므로, `GRADLE_USER_HOME`도 영문 경로를 쓰세요(예: `export GRADLE_USER_HOME=D:/Android/gradle-home`). 한글 경로면 Gradle 테스트 실행기가 뜨지 않습니다.
- 자동 스크린샷은 절대 경로로 주는 편이 안전합니다(상대 경로는 `assets` 기준으로 만들어집니다).

## 아직 연동하지 않은 것

Google Play 결제, AdMob 광고, Play Games 로그인, Firebase, Nakama 서버(멀티·대전·온라인 랭킹), 인트로 영상, 출시 서명 키. 스토어 계정과 키가 준비되면 `android` 모듈의 `AndroidServices`와 서버 모듈에 붙입니다.

## 새 버전 알림

스토어를 거치지 않는 APK는 자동 갱신이 없습니다. 앱을 켜면 `UpdateCheck`가 GitHub Releases API로 최신 태그를 확인하고, 설치된 버전보다 높으면 로비에서 한 번 "새 버전이 나왔어요" 팝업을 띄워 릴리즈 페이지를 열어 줍니다. 저장소는 `MergeNyangGame.REPO`, 버전은 `Platform.version`(Android는 `BuildConfig.VERSION_NAME`, 데스크톱은 `dev`로 확인을 건너뜀)입니다. 릴리즈 APK는 모두 같은 키로 서명하므로 받은 APK를 그대로 설치하면 저장 데이터가 유지됩니다.

## 긴 화면 대응

레이아웃 기준은 1080 × 1920(9:16)이고, 세로가 더 긴 폰에서는 `ExtendViewport`로 논리 높이를 늘려 위아래 여백 없이 채웁니다(`RESPONSIVE_LOBBY_HANDOFF.md`의 로비 방식을 앱 전체로 확장).

- `Gfx.ext`: 기준 1920 위·아래로 더 보이는 높이(한쪽 몫). `Gfx.top`/`Gfx.bottom`이 실제 화면 끝, `Gfx.safeTop`은 카메라 구멍 등 상단 안전영역
- 로비: 배경을 화면 전체에 cover로 채우고, 상단 HUD는 화면 위에, 대장장이와 하단 카드 묶음은 화면 아래에 붙음
- 다른 메뉴: 상단 재화 바·제목은 위, 하단 탭은 아래에 붙고(`anchorTop`/`anchorBottom`), 배경은 기준 박스 그대로에 가장자리를 거울처럼 이어 붙임(`Gfx.background`)
- 전투: 배경과 레인·보드가 맞물려 있어 레이아웃은 그대로 두고 배경만 위아래로 이어 붙임. 상단 HUD와 일시정지·배속 버튼은 화면 위에 붙음
- 암전·팝업 막·플래시는 `Gfx.fullRect`로 늘어난 화면 전체를 덮음

## 전투 배속, 무한의 탑

- 전투 상단의 `1배속/2배속` 버튼으로 전환하며, 선택은 저장돼 다음 전투에도 유지됩니다. 배속은 게임 내 시간에 적용되므로 별 조건(150초)은 공정하게 유지됩니다.
- 무한의 탑은 한 층을 깨면 결과 화면 없이 바로 다음 층으로 이어집니다. 보드·착용 장비·체력·에너지·피버는 그대로이고, 층 보상 골드는 돌파할 때마다 바로 지급됩니다. 모든 고양이가 쓰러지면 "N층까지 돌파!" 결과가 나옵니다.
