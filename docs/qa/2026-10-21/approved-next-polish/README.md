# Preserve the newly approved world

The player tested the published `b6e428738704b167742c44e1478dd276b0a9c615`
runtime and approved its improved smoothness on 2026-10-21. Their 40-to-60
progress estimate describes their experience; it is not an FPS measurement.

Remote rollback references, verified before the next experiment:

- `baseline/approved-smooth-world-20261021`: exact approved runtime `b6e4287`.
- `baseline/approved-smooth-world`: advanced by fast-forward to the same runtime.
- `baseline/approved-smooth-world-before-20261021`: preceding approved `4e4f7e4`.
- `baseline/capybara-standard`: untouched older reference.

The approved three fixes and their test/publication evidence remain documented
in `../live-frame-polish/`. Future changes are tested separately against this
new approval and committed individually only after verification. Failed
experiments must not remove these independent fixes.
