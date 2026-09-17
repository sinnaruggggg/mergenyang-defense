# 머지냥 디펜스

고양이 대장간에서 아이템을 합성해 전선의 고양이 부대에 보급하는 머지 × 자동전투 디펜스 게임입니다. 기획서는 [art/source/game-design.md](art/source/game-design.md)에 있습니다.

| 폴더 | 내용 |
| --- | --- |
| [native/](native/README.md) | **Android 네이티브 앱** (Kotlin + libGDX + KTX + Fleks) |
| [game/](game/README.md) | 웹 프로토타입 (HTML5 캔버스) |
| [art/](art/raster-ui-v3/README.md) | 원화 에셋: UI V3, 공격 모션 V4, 기획 원본 |
| tools/ | 웹 배포용 dist 생성 스크립트 |

## 릴리즈

`v`로 시작하는 태그를 올리면 GitHub Actions가 테스트 → APK 빌드 → 릴리즈 생성을 자동으로 합니다.

```bash
git tag v0.2.0
git push origin v0.2.0
```

APK는 [Releases](../../releases)에서 받을 수 있습니다. 태그 없이 빌드만 하려면 Actions 탭에서 **Release APK** 워크플로를 수동 실행하면 결과물이 아티팩트로 남습니다.

### 서명

- 기본: 저장소에 있는 공용 테스트 키(`native/android/project-debug.keystore`)로 서명합니다. 모든 릴리즈가 같은 서명이라 기존 설치 위에 업데이트됩니다. 비밀번호가 공개된 테스트용 키이므로 스토어 출시에 쓰면 안 됩니다.
- 스토어 출시: 저장소 Secrets에 `RELEASE_KEYSTORE_BASE64`, `RELEASE_KEYSTORE_PASSWORD`, `RELEASE_KEY_ALIAS`, `RELEASE_KEY_PASSWORD`를 등록하면 그 키로 서명합니다.

## 저장소에 포함하지 않은 것

용량 때문에 에셋 패키지 zip, 사용 중단된 `art/build`, 화면 미리보기(`art/raster-ui-v3/screens`, `previews`, `assets/placed`), 생성 원본(`sources`)은 올리지 않았습니다. 원본은 로컬 `D:\머지냥디펜스`에 있습니다.
