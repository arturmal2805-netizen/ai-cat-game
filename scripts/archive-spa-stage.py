#!/usr/bin/env python3
"""Archive one finished private native run; exclude player/browser databases."""
import argparse
import gzip
import hashlib
import json
from pathlib import Path
import shutil
import tarfile

p = argparse.ArgumentParser(description=__doc__)
p.add_argument('source', type=Path)
p.add_argument('destination', type=Path)
p.add_argument('--log', required=True, type=Path)
p.add_argument('--result', required=True)
p.add_argument('--review', required=True)
a = p.parse_args()
if a.destination.exists():
    raise SystemExit('Use a new stage directory; previous evidence is immutable')
digest = lambda path: hashlib.sha256(path.read_bytes()).hexdigest()
build = json.loads((a.source / 'qa-build.json').read_text())
if digest(a.source / 'qa-app.js') != build['sha256']:
    raise SystemExit('QA bundle does not match its recorded hash')
sources = json.loads((a.source / 'source-files.json').read_text())
for name, expected in sources.items():
    if digest(a.source / 'source' / name) != expected:
        raise SystemExit('Imported source hash differs: ' + name)
# Explicit evidence allow-list. Never archive arbitrary world exports, SQLite,
# localStorage, credentials, browser profiles or unreviewed root JSON files.
names = ['v11-group-candidates.json', 'FAILED-group-ui.json', 'v11-group-ui.json', 'v11-optics.json', 'v11-frame-completion.json', 'v11-group-invitation.json', 'v11-group-progress.json', 'INTERRUPTED-group-path.json', 'v8-invitation.json', 'v8-invitation-reload.json', 'water-diagnosis.json', 'layout-world-transforms.json', 'qa-build.json', 'source-files.json', 'source-status.txt',
         'source-HEAD.patch', 'source-cached.patch', 'v6-reference-frames.json', 'v7-mass-frames.json',
         'v7-functional-progress.json', 'v7-functional-sqlite.json', 'actual-phone-third-person.json', 'actual-manual-seat-exit.json', 'actual-pools-sqlite.json',
         'game-scene.json', 'pool-progress.json', 'dry-progress.json',
         'actual-dry-procedures-sqlite.json', 'actual-reflection-array.json', 'actual-garden-public-walk.json']
a.destination.mkdir(parents=True)
for path in [*a.source.glob('*.png'), *(a.source / n for n in names)]:
    if path.is_file():
        shutil.copyfile(path, a.destination / path.name)
shutil.copyfile(a.log, a.destination / 'native.log')
failure = a.source / 'probes' / 'FAILED-capture.json'
if failure.is_file():
    record = json.loads(failure.read_text())
    identifier = record['spec']['id']
    if not identifier.startswith('resort-') or any(c not in 'abcdefghijklmnopqrstuvwxyz-' for c in identifier):
        raise SystemExit('Unexpected failed probe identifier')
    shutil.copyfile(failure, a.destination / 'FAILED-capture.json')
    candidate = a.source / 'probes' / (identifier + '.png')
    if candidate.is_file():
        shutil.copyfile(candidate, a.destination / 'failed-probe.png')
with gzip.GzipFile(filename='', mode='wb', fileobj=(a.destination / 'qa-app.js.gz').open('wb'), mtime=0) as f:
    f.write((a.source / 'qa-app.js').read_bytes())
with tarfile.open(a.destination / 'imported-source.tar.gz', 'w:gz') as f:
    f.add(a.source / 'source', arcname='source')
manifest = {'sourceBase': build['head'], 'sourceState': build['dirty'],
            'result': a.result, 'visualReview': a.review,
            'files': {x.name: digest(x) for x in sorted(a.destination.iterdir())}}
(a.destination / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
for name, expected in manifest['files'].items():
    assert digest(a.destination / name) == expected
print(json.dumps({'archived': str(a.destination), 'files': len(manifest['files']),
                  'sourceFiles': len(sources), 'bundle': build['sha256']}))
