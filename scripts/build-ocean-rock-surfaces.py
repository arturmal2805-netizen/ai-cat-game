"""Offline-only CC0 scan preparation. Requires Pillow; never runs in the game.

Sources are downloaded with integrity checks. RGB photographs stay unchanged;
the OpenGL normal's unused alpha stores the scan's linear roughness.
"""
import hashlib
import io
import json
import pathlib
import urllib.request
from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parents[1]
OUT = ROOT / 'public/art/ocean-rock'
OUT.mkdir(parents=True, exist_ok=True)
SOURCES = [
    ('color', 'rock_face_03', 'diff', '2k', 'jpg', ''),
    ('normal', 'rock_face_03', 'nor_gl', '1k', 'png', ''),
    ('rough', 'rock_face_03', 'rough', '1k', 'png', ''),
    ('reef', 'coral_ground_02', 'diff', '1k', 'jpg', ''),
    ('coralNormal', 'coral_ground_02', 'nor_gl', '1k', 'png', ''),
    ('coralRough', 'coral_ground_02', 'rough', '1k', 'png', ''),
    ('sand', 'coast_sand_01', 'diff', '1k', 'jpg', ''),
]

def download(url):
    return urllib.request.urlopen(urllib.request.Request(
        url, headers={'User-Agent': 'ChichiAssetAuthoring/1.0'}), timeout=60).read()

manifest, provenance, data = {}, [], {}
for role, asset, kind, size, fmt, _ in SOURCES:
    metadata = json.loads(download('https://api.polyhaven.com/files/' + asset))
    key = {'diff': 'Diffuse', 'rough': 'Rough'}.get(kind, kind)
    entry = metadata[key][size][fmt]
    content = download(entry['url'])
    assert len(content) == entry['size']
    assert hashlib.md5(content).hexdigest() == entry['md5']
    data[role] = content
    provenance.append({'asset': asset, 'role': role, 'url': entry['url'],
                       'md5': entry['md5'], 'sha256': hashlib.sha256(content).hexdigest()})

for normal_role, rough_role in [('normal', 'rough'), ('coralNormal', 'coralRough')]:
    normal = Image.open(io.BytesIO(data[normal_role])).convert('RGBA')
    rough = Image.open(io.BytesIO(data[rough_role]))
    # Preserve 16-bit linear roughness; Pillow's ordinary L conversion clamps.
    rough = rough.point(lambda v: v / 257).convert('L') if rough.mode.startswith('I') else rough.convert('L')
    normal.putalpha(rough)
    packed = io.BytesIO()
    normal.save(packed, format='PNG', optimize=True)
    data[normal_role] = packed.getvalue()
download_bytes, gpu_bytes = 0, 0
for role in ['color', 'normal', 'coralNormal', 'reef', 'sand']:
    content = data[role]
    fmt = 'png' if role in ['normal', 'coralNormal'] else 'jpg'
    name = role + '-' + hashlib.sha256(content).hexdigest()[:12] + '.' + fmt
    (OUT / name).write_bytes(content)
    manifest[role] = './art/ocean-rock/' + name
    image = Image.open(io.BytesIO(content))
    download_bytes += len(content)
    width, height = image.size
    while True:
        gpu_bytes += width * height * 4
        if width == height == 1:
            break
        width, height = max(1, width // 2), max(1, height // 2)
(ROOT / 'public/mosasaur-rock-surface-assets.js').write_text(
    '// CC0 Poly Haven scans. See docs/assets/ocean-surfaces.md.\n'
    'export const MOSA_ROCK_SURFACES=' + json.dumps(manifest, indent=2) + ';\n'
    'export const MOSA_ROCK_SURFACE_BYTES=' + json.dumps(
        {'download': download_bytes, 'gpuMipmapped': gpu_bytes}) + ';\n')
(OUT / 'sources.json').write_text(json.dumps(provenance, indent=2) + '\n')
keep = {pathlib.Path(url).name for url in manifest.values()} | {'sources.json'}
for path in OUT.iterdir():
    if path.name not in keep:
        path.unlink()
print({'download': download_bytes, 'gpuMipmapped': gpu_bytes})
