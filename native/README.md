# 머지냥 디펜스 · Android 네이티브

기획서(`art/source/game-design.md`)의 기술 스택대로 만든 네이티브 버전입니다.

| 영역 | 사용 기술 |
| --- | --- |
| 언어 | Kotlin 2.2 |
| 엔진 | libGDX 1.13.1 + KTX |
| 게임 구조 | Fleks ECS (고양이·몬스터·투사체 엔티티, 시스템) |
| UI | Scene2D (메뉴·팝업·결과·일시정지) |
| 리소스 | TexturePacker 아틀라스 5장 + 배경 PNG |
| 데이터 | kotlinx.serialization + `assets/data/gamedata.json` (코드 수정 없이 밸런스 조정) |
| 저장 | Jetpack DataStore (Android), 파일 (데스크톱 개발용) |
| 빌드 | Gradle 8.14 Kotlin DSL, AGP 8.13, compileSdk/targetSdk 36, minSdk 26 |

## 모듈

- `core`: 게임 규칙, 머지 보드, 웨이브, 전투 공식, 저장 모델 (순수 Kotlin, 서버와 공유 가능, 단위 테스트 12개)
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

## 아직 연동하지 않은 것

Google Play 결제, AdMob 광고, Play Games 로그인, Firebase, Nakama 서버(멀티·대전·온라인 랭킹), 인트로 영상, 출시 서명 키. 스토어 계정과 키가 준비되면 `android` 모듈의 `AndroidServices`와 서버 모듈에 붙입니다.
