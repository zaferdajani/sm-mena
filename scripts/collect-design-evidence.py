"""Export screenshots and test metadata, never traces, credentials or font binaries."""
from pathlib import Path
import base64
import io
import re
import shutil
import zipfile

source = Path('playwright-report')
out = Path('design-evidence')
out.mkdir(exist_ok=True)
for image in source.rglob('*'):
    if image.is_file() and image.suffix.lower() in {'.png', '.jpg', '.jpeg'}:
        dest = out / image.relative_to(source)
        dest.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(image, dest)
index = source / 'index.html'
if index.exists():
    match = re.search(r'data:application/zip;base64,([A-Za-z0-9+/=]+)', index.read_text())
    if match:
        with zipfile.ZipFile(io.BytesIO(base64.b64decode(match.group(1)))) as archive:
            for name in archive.namelist():
                if name.endswith('.json'):
                    # Basename-only: no archive-controlled path traversal.
                    dest = out / 'metadata' / Path(name).name
                    dest.parent.mkdir(parents=True, exist_ok=True)
                    dest.write_bytes(archive.read(name))
print(f'Design evidence: {len(list(out.rglob("*.png")))} screenshots')
