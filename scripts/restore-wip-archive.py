"""Restore a verified WIP archive into a NEW directory; never edit its source.

Requires a published Git base because the accompanying bundle is incremental.
Restores each linked worktree's HEAD, index, files and deletions independently.
"""
import argparse
import hashlib
import json
import pathlib
import shutil
import subprocess
import tarfile

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('archive', type=pathlib.Path)
parser.add_argument('destination', type=pathlib.Path)
parser.add_argument('--sha256', required=True)
parser.add_argument('--base', required=True, help='Published repository URL or local checkout')
parser.add_argument('--base-branch', default='main')
parser.add_argument('--discard-verified-trees', action='store_true', help='After exact verification remove only newly restored QA worktree copies to bound disk use')
args = parser.parse_args()
archive = args.archive.resolve()
assert hashlib.sha256(archive.read_bytes()).hexdigest() == args.sha256, 'Archive checksum mismatch'
assert not args.destination.exists(), 'Destination must not exist; source worktrees are never reset'
destination = args.destination.resolve()
destination.mkdir(parents=True)
inputs = destination / 'archive'
inputs.mkdir()
with tarfile.open(archive, 'r:gz') as handle:
    for member in handle.getmembers():
        path = pathlib.PurePosixPath(member.name)
        assert not path.is_absolute() and '..' not in path.parts, 'Unsafe archive path'
        if member.issym():
            target = pathlib.PurePosixPath(member.linkname)
            assert not target.is_absolute() and '..' not in target.parts, 'Unsafe archived symlink'
    handle.extractall(inputs, filter='data')
manifest = json.loads((inputs / 'manifest.json').read_text())
bundles = list((inputs / 'incremental-history').glob('*.bundle'))
assert len(bundles) == 1, 'Expected one explicitly documented incremental history bundle'
repository = destination / 'repository'


def run(*command, cwd=repository):
    return subprocess.check_output(command, cwd=cwd, stderr=subprocess.PIPE)


subprocess.run(['git', 'clone', '--no-local', '--no-checkout', '--single-branch',
                '--branch', args.base_branch, args.base, str(repository)], check=True,
               stdout=subprocess.PIPE, stderr=subprocess.PIPE)
run('git', 'bundle', 'verify', str(bundles[0]))
run('git', 'fetch', '--no-tags', str(bundles[0]), 'refs/heads/*:refs/remotes/archive/*')
results = []
for record in manifest['roots']:
    name = pathlib.Path(record['directory']).name
    source = inputs / name
    target = destination / 'worktrees' / name
    target.parent.mkdir(exist_ok=True)
    run('git', 'worktree', 'add', '--detach', str(target), record['head'])
    for filename, options in [('diff-HEAD.binary.patch', []),
                              ('diff-cached.binary.patch', ['--cached'])]:
        patch = source / filename
        if patch.stat().st_size:
            run('git', 'apply', '--binary', *options, str(patch), cwd=target)
    files = source / 'files'
    if files.exists():
        for item in files.rglob('*'):
            relative = item.relative_to(files)
            output = target / relative
            if item.is_symlink():
                output.parent.mkdir(parents=True, exist_ok=True)
                if output.exists() or output.is_symlink():
                    output.unlink()
                output.symlink_to(item.readlink())
            elif item.is_file():
                output.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(item, output)
    checks = [(['diff', 'HEAD', '--binary'], 'diff-HEAD.binary.patch'),
              (['diff', '--cached', '--binary'], 'diff-cached.binary.patch'),
              (['status', '--porcelain=v1'], 'status.porcelain-v1.txt')]
    for command, expected in checks:
        actual = run('git', *command, cwd=target)
        assert actual == (source / expected).read_bytes(), name + ': mismatch in ' + expected
    if files.exists():
        for item in files.rglob('*'):
            if item.is_file() and not item.is_symlink():
                assert item.read_bytes() == (target / item.relative_to(files)).read_bytes()
    results.append({'name': name, 'head': record['head'], 'headDiff': 'exact',
                    'cachedDiff': 'exact', 'status': 'exact', 'savedFileBytes': 'exact'})
    if args.discard_verified_trees:
        assert target.resolve().is_relative_to((destination / 'worktrees').resolve())
        run('git','worktree','remove','--force',str(target))
report = {'archive': archive.name, 'sha256': args.sha256, 'restored': True,
          'fullGitHistory': False, 'publishedBaseRequired': manifest['incrementalHistoryBase'],
          'worktrees': results, 'sourceWorktreesModified': False, 'verifiedTreesRetained': not args.discard_verified_trees}
(destination / 'restore-result.json').write_text(json.dumps(report, indent=2) + '\n')
print(json.dumps(report, indent=2))
