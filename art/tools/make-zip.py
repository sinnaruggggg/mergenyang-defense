from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
root = Path(__file__).resolve().parents[1]
dest = root.parent / '머지냥_파스텔_UI_제작패키지_v1.zip'
with ZipFile(dest, 'w', compression=ZIP_DEFLATED, compresslevel=3) as archive:
    for file in sorted(root.rglob('*')):
        if file.is_file():
            archive.write(file, 'mergecat-pastel-ui/' + file.relative_to(root).as_posix())
with ZipFile(dest) as archive:
    bad = archive.testzip()
    if bad:
        raise RuntimeError('Corrupt archive entry: ' + bad)
    print({'archive': str(dest), 'entries': len(archive.infolist()), 'bytes': dest.stat().st_size, 'crc': 'PASS'})
