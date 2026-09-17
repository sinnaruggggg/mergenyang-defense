"""웹 배포용 dist/ 폴더 생성: 게임 코드와 실제로 쓰는 에셋만 복사한다.

사용법: python tools/build_web.py
"""
import json
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DIST = ROOT / "dist"
UI = ROOT / "art" / "raster-ui-v3"
ATK = ROOT / "art" / "attack-motion-v4" / "characters"


def copy(src: Path, dst: Path) -> None:
    dst.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(src, dst)


def main() -> None:
    if DIST.exists():
        shutil.rmtree(DIST)

    # 게임 코드 (개발 도구 제외)
    shutil.copytree(ROOT / "game", DIST / "game", ignore=shutil.ignore_patterns("dev", "README.md"))

    # V3 UI 에셋 중 게임에서 쓰는 폴더
    for sub in ["backgrounds", "ui", "icons", "items", "characters"]:
        for f in (UI / "assets" / sub).glob("*.png"):
            copy(f, DIST / "art" / "raster-ui-v3" / "assets" / sub / f.name)
    for f in (UI / "animations").glob("*/*-[01].png"):
        copy(f, DIST / "art" / "raster-ui-v3" / "animations" / f.parent.name / f.name)
    copy(UI / "fonts" / "NotoSansKR.ttf", DIST / "art" / "raster-ui-v3" / "fonts" / "NotoSansKR.ttf")
    copy(UI / "fonts" / "OFL.txt", DIST / "art" / "raster-ui-v3" / "fonts" / "OFL.txt")

    # V4 공격 프레임 (시트 제외)
    for f in ATK.glob("*/attack-[01].png"):
        copy(f, DIST / "art" / "attack-motion-v4" / "characters" / f.parent.name / f.name)

    # Vercel 설정: 루트 접속 시 게임으로, 에셋은 길게 캐시
    (DIST / "vercel.json").write_text(json.dumps({
        "redirects": [{"source": "/", "destination": "/game/", "permanent": False}],
        "headers": [
            {"source": "/art/(.*)", "headers": [{"key": "Cache-Control", "value": "public, max-age=604800"}]},
        ],
    }, ensure_ascii=False, indent=2), encoding="utf-8")

    files = [p for p in DIST.rglob("*") if p.is_file()]
    size = sum(p.stat().st_size for p in files)
    print(f"dist 생성 완료: 파일 {len(files)}개, {size / 1024 / 1024:.1f}MB")


if __name__ == "__main__":
    main()
