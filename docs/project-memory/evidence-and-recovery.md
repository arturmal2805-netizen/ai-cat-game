# Доказательства и восстановление

## Единственный актуальный статус

Состояние — [CURRENT](CURRENT.md), очередь/критерии — [ROADMAP](ROADMAP.md). Стандарты содержат
устойчивые знания, решения — причины изменений. Не держать параллельную очередь
в AGENTS.md, continuity diary или случайном /tmp. Исторические отчёты помечать
историческими; их успех не подтверждает следующую версию.

## QA-манифест каждого существенного этапа

Использовать существующую структуру `docs/qa/YYYY-MM-DD/<stage>/`.
Рядом с PNG хранить manifest: полный SHA, dirty status, точный overlay/снимок,
QA bundle ID и SHA256, asset hashes, Node/browser/renderer, параметры запуска,
локацию/камеру/время/свет/туман/DPR/качество, seed/private-world ID, завершённые
и failed/interrupted/skipped проверки, полные frame intervals/паузы/память,
пути/хеши PNG и логов. Большой bundle/video можно вынести во внешнее хранилище
с постоянной ссылкой и SHA256. Не включать секреты и живую базу игрока.

Если source dirty, одного базового SHA недостаточно. Нужен exact working-tree
snapshot/patch плюс cached patch и новые файлы. PNG после v1 не подтверждает v2.
Не изобретать задним числом отсутствующий исходный bundle hash: отметить пробел,
сохранить доступный snapshot и при необходимости выполнить новый точный прогон.

Новый документальный [native d6fa805](../qa/2026-11-16/project-memory/approved-water/manifest.json)
имеет чистый точный source, сохранённые original/instrumented runner и байты
bundle, PNG/hashes/настройки, timing явно skipped. Это историческая техническая
база, не объявление визуального достижения Crimson Desert.

[Отклонённый океан](../qa/2026-11-16/ocean-recovery/) имеет честную отметку
о неполном старом capture manifest. Его картинки не использовать как финальное
QA новой LOD-правки. Следующий финальный этап должен иметь полный manifest.

## Независимый WIP backup

Основной code/documentation draft хранится в удалённой ветке
[codex/ocean-recovery-memory](https://github.com/arturmal2805-netizen/ai-cat-game/tree/codex/ocean-recovery-memory).
Это WIP, не production. Сам push в эту ветку сайт не публикует: основной
workflow имеет push branches:[main], отдельный pages workflow — только ручной
workflow_dispatch. Не запускать deploy-диспетчер на черновике.

Дополнительная независимая копия проверена в отдельной архивной ветке
[archive/project-memory-2026-11-16](https://github.com/arturmal2805-netizen/ai-cat-game/tree/archive/project-memory-2026-11-16/backups).
Она содержит archive, checksum, manifest и фактический restore-result.
[Удалённые байты и восстановление12деревьев подтверждены](../qa/2026-11-16/project-memory/backup-remote-verification.json).
При следующем архиве снова проверять наличие/байты и восстановление.
Локальный путь /workspace/artifacts сам по себе независимой копией не является.
Архивный binary отделён от игровой ветки и не является частью production deploy.

Создание: `python3 scripts/create-wip-archive.py /outside/backup.tar.gz --base PUBLISHED_SHA`.
Скрипт собирает все реальные linked worktrees и локальные branch refs;
проверяет, что HEAD/index/status/файлы не менялись во время снимка.

Архив сохраняет для КАЖДОГО linked worktree: HEAD/branch, файлы/new files,
удаления через `git diff HEAD --binary`, index через `git diff --cached --binary`,
`git status --porcelain=v1`. Общие локальные commit/refs — incremental Git bundle
с явно указанной опубликованной базой. Bundle сам по себе не сохраняет WIP;
файловый tar не является полной историей Git. Не включать .env/credentials,
токены, live SQLite или посторонние данные.

Восстановление проверяется в НОВОМ каталоге, не поверх оригинальных деревьев:

```bash
python3 scripts/restore-wip-archive.py /path/to/backup.tar.gz /new/restore-dir \
  --sha256 HASH_FROM_BACKUP_MANIFEST \
  --base https://github.com/arturmal2805-netizen/ai-cat-game.git
```

`restore-result.json` должен подтвердить точное совпадение HEAD diff,
cached diff, porcelain status и байтов сохранённых файлов каждого дерева.
После восстановления зависимости/ignored generated assets заново готовятся
Node22; их отсутствие не означает, что они уже восстановлены из Git.

## Публикация

Четыре отдельных статуса: реализовано локально, проверено, опубликовано,
визуально одобрено. Перед публикацией: требуемые native/Node22/full CI проверки,
серверная проверка релиза/сохранений и actual live HTML/JS/CSS hashes. ?v само
по себе не доказательство. Различать phone/Mac hardware measurements и
SwiftShader; не обещать FPS или сходство с референсом без проверки.


## Обновление 2026-11-17: R9 с общим ядром

Историческая независимая копия R9, archive commit501757e09370116b942248e392c6461211cb5632.
60 499 125байт, SHA256aaaa3d9c257258a6dbc98a65271806d8a4805ea3d710d3830ddb1bff690d8af0.
Содержит13деревьев, source4dc9838 и WIP исправления camera harness. Проверены
полное восстановление13/13 и повторное скачивание удалённых байтов. Базаc9a2ac7
по-прежнему обязательна. Точные ссылки/receipt в CURRENT; R8 остаётся в архиве.

## Актуальный запуск (2026-11-18)

Сначала AGENTS→README→CURRENT→ROADMAP→стандарт. Затем:

```bash
git status --porcelain=v1
git branch --show-current
git rev-parse HEAD
git ls-remote origin refs/heads/main refs/heads/codex/underwater-spa-resort refs/heads/codex/ocean-recovery-memory
node --version
npm ci
npm run build
npm test
```

Node должен быть22.x, как CI; Node24 не использовать для генерации моделей.
В этой среде установленный Node22:
`export PATH=/home/agent/.npm/_npx/52027bd8fc0022aa/node_modules/.bin:$PATH`.
Это путь ТЕКУЩЕЙ машины, не универсальная инструкция установки. В свежей среде
установить Node22 через свой versionmanager; затем npmci по lockfile.
`npm start` — Nodeсервер3000/демо; DurableObjects эмулирует `npx wrangler dev --local`.
Live мир/recoverycode/APIkeys не использовать в QA.

SPA exact native command из своей WIPветки (пути проверить на новой машине):

```bash
CHICHI_PLAYWRIGHT_MODULE=/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright CHICHI_CHROMIUM=/usr/bin/chromium CHICHI_EXPLORER_AUDIT=1 CHICHI_RESORT_SPA_AUDIT=1 CHICHI_RESORT_SPA_PROCEDURE_AUDIT=1 CHICHI_DESKTOP=1 CHICHI_REVIEW_DIR=/outside/qa node scripts/check-aquarium.cjs
```

Это in-roomfixture, не весь путь берега/субмарины. Helper snapshotsWorker в свойtemp;
один GPUбраузер за раз. Не переносить SwiftShaderвремя в Mac/phoneFPS.
ПриватныеSQLite живут вtemp и не входят вGit. QAcode/build/patches/PNG сохраняются.

## Передача и backup — последняя процедура

Оригинальные linkedworktrees никогда не reset/remove. Snapshot всех деревьев
через существующий create-wip-archive.py, база39148734bd3f4a0265a6ec9aff8ab4b41f36c0b4.
Bundle incremental, требует эту базу. Проверять LFS: .gitattributes/самые pointerfiles,
при наличииLFS сохранять реальныеобъекты. В текущем checkout LFS не объявлен.
После создания тар читается полностью; restore в НОВОЕ место сравнивает каждый
HEADdiff/cached/status/filebyte. При нехватке места опциональный discardрежим
удаляет только уже проверенные тестовые копии, не исходныеworktrees.
Удалённый архив отдельно от main, скачанные байты сверяют SHA256 и повторно
проверяют восстановлением. Конкретная последняя квитанция будет в CURRENT.
