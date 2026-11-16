"""Pack the original GL normal and roughness data without resizing or recolouring."""
import hashlib
import json
from pathlib import Path
from PIL import Image

root = Path(__file__).resolve().parents[1]
source = json.loads((root / 'docs/assets/meadow-grass004-source.json').read_text())
records = {r['role']: r for r in source['files']}
images = {}
for role in ('normalGL', 'roughness'):
    record = records[role]
    path = root / record['path']
    data = path.read_bytes()
    if hashlib.sha256(data).hexdigest() != record['sha256']:
        raise ValueError('Changed original ' + role)
    images[role] = Image.open(path).convert('RGB')
normal, rough = images['normalGL'], images['roughness']
if normal.size != rough.size:
    raise ValueError('Normal/roughness dimensions differ')
packed = Image.merge('RGBA', (*normal.split(), rough.getchannel('R')))
target_dir = root / 'public/art/meadow'
temporary = target_dir / 'grass004-normal-roughness.tmp.png'
packed.save(temporary, compress_level=9)
data = temporary.read_bytes()
digest = hashlib.sha256(data).hexdigest()
target = target_dir / ('grass004-normal-roughness-' + digest[:12] + '.png')
temporary.replace(target)
# Verify the saved, decoded data, not just the pre-encoding arrays.
check = Image.open(target)
assert check.convert('RGB').tobytes() == normal.tobytes()
assert check.getchannel('A').tobytes() == rough.getchannel('R').tobytes()
record = {
    'source': source['source'], 'license': source['license'],
    'path': str(target.relative_to(root)), 'sha256': digest,
    'bytes': len(data), 'size': list(packed.size),
    'packing': 'RGB = unchanged decoded OpenGL +Y normal; A = unchanged decoded roughness R',
    'colorSpace': 'linear data; no resizing, channel inversion or colour conversion',
    'inputs': [records['normalGL'], records['roughness']],
}
(root / 'docs/assets/meadow-turf-packed.json').write_text(json.dumps(record, indent=2) + '\n')
print(json.dumps(record))
