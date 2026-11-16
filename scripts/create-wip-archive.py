"""Snapshot all linked worktrees plus local branch history, without credentials.

Run from a checkout; --base is an existing published prerequisite, not a reset.
The resulting incremental archive must also pass restore-wip-archive.py.
"""
import argparse
import hashlib
import json
import pathlib
import re
import subprocess
import tarfile
import tempfile

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('output', type=pathlib.Path)
parser.add_argument('--base', required=True)
args = parser.parse_args()


def git(root, *command):
    return subprocess.check_output(['git', '-C', str(root), *command], stderr=subprocess.PIPE)


repo = pathlib.Path.cwd()
base = git(repo, 'rev-parse', args.base + '^{commit}').decode().strip()
roots = [pathlib.Path(line[9:]) for line in git(repo, 'worktree', 'list', '--porcelain').decode().splitlines()
         if line.startswith('worktree ')]
assert len({root.name for root in roots}) == len(roots), 'Worktree basenames must be unique'
for root in roots:
    assert not git(root, 'ls-files', '-u'), 'Resolve index conflicts before a consistent backup'
output = args.output.resolve()
output.parent.mkdir(parents=True, exist_ok=True)
assert not output.exists(), 'Never overwrite an earlier backup'
secret_path = re.compile(r'(^|/)(\.env(?:\..*)?|credentials?(?:\..*)?|id_rsa|id_ed25519)$|\.(?:sqlite|sqlite3|db)(?:-wal|-shm)?$', re.I)
secret_value = re.compile(rb'(?:gh[pousr]_[A-Za-z0-9]{24,}|cfk_[A-Za-z0-9_]{24,}|sk-(?:or-v1-)?[A-Za-z0-9]{40,})')
metadata = {'incrementalHistoryBase': base, 'fullGitHistory': False, 'roots': []}
with tempfile.TemporaryDirectory(prefix='chichi-wip-snapshot-') as directory:
    stage = pathlib.Path(directory)
    bundle = stage / 'local-history.bundle'
    git(repo, 'bundle', 'create', str(bundle), '--branches', '^' + base)
    git(repo, 'bundle', 'verify', str(bundle))
    metadata['bundleRefs'] = git(repo, 'bundle', 'list-heads', str(bundle)).decode().splitlines()
    with tarfile.open(output, 'w:gz', compresslevel=5) as archive:
        archive.add(bundle, arcname='incremental-history/local-history.bundle')
        for root in roots:
            folder = stage / root.name
            folder.mkdir()
            head = git(root, 'rev-parse', 'HEAD').decode().strip()
            snapshots = {'diff-HEAD.binary.patch': git(root, 'diff', 'HEAD', '--binary'),
                         'diff-cached.binary.patch': git(root, 'diff', '--cached', '--binary'),
                         'status.porcelain-v1.txt': git(root, 'status', '--porcelain=v1')}
            for name, content in snapshots.items():
                assert not secret_value.search(content), 'Possible credential in patch; review without printing its value'
                file = folder / name
                file.write_bytes(content)
                archive.add(file, arcname=root.name + '/' + name)
            names = set(git(root, 'diff', 'HEAD', '--name-only', '-z').split(b'\0'))
            names |= set(git(root, 'ls-files', '--others', '--exclude-standard', '-z').split(b'\0'))
            fingerprints = {}
            for name in sorted(names):
                if not name:
                    continue
                relative = name.decode()
                assert not secret_path.search(relative), 'Private file must not enter backup: ' + relative
                file = root / relative
                if file.is_symlink():
                    link = file.readlink()
                    assert not link.is_absolute() and '..' not in link.parts, 'Unsafe symlink: ' + relative
                elif file.is_file():
                    content = file.read_bytes()
                    assert not secret_value.search(content), 'Possible credential in file: ' + relative
                    fingerprints[relative] = hashlib.sha256(content).hexdigest()
                if file.is_file() or file.is_symlink():
                    archive.add(file, arcname=root.name + '/files/' + relative, recursive=False)
            assert head == git(root, 'rev-parse', 'HEAD').decode().strip(), 'HEAD changed during snapshot'
            assert snapshots['diff-HEAD.binary.patch'] == git(root, 'diff', 'HEAD', '--binary'), 'Working diff changed'
            assert snapshots['diff-cached.binary.patch'] == git(root, 'diff', '--cached', '--binary'), 'Index changed'
            assert snapshots['status.porcelain-v1.txt'] == git(root, 'status', '--porcelain=v1'), 'Status changed'
            assert all(hashlib.sha256((root / name).read_bytes()).hexdigest() == digest
                       for name, digest in fingerprints.items()), 'File changed during snapshot'
            metadata['roots'].append({'directory': str(root), 'head': head,
                                      'branch': git(root, 'branch', '--show-current').decode().strip(),
                                      'files': fingerprints})
        record = stage / 'manifest.json'
        record.write_text(json.dumps(metadata, indent=2) + '\n')
        archive.add(record, arcname='manifest.json')
        readme = stage / 'README.txt'
        readme.write_text('Incremental Git history requires the documented published base. '
                          'Each linked worktree has independent HEAD/index/working overlays. '
                          'Ignored dependencies, generated caches, credentials and live databases are absent. '
                          'This is not full Git history. Use restore-wip-archive.py into a NEW directory.\n')
        archive.add(readme, arcname='README.txt')
with tarfile.open(output, 'r:gz') as archive:
    members = archive.getmembers()
    for member in members:
        if member.isfile():
            handle = archive.extractfile(member)
            while handle.read(1024 * 1024):
                pass
result = {'path': str(output), 'bytes': output.stat().st_size,
          'sha256': hashlib.sha256(output.read_bytes()).hexdigest(), 'readableMembers': len(members),
          'publishedBaseRequired': base, 'fullGitHistory': False, 'worktrees': len(roots)}
output.with_suffix(output.suffix + '.json').write_text(json.dumps(result, indent=2) + '\n')
print(json.dumps(result, indent=2))
