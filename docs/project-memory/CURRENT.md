# Текущий статус

Обновлено20 ноября2026, Europe/Kyiv.

## Опубликовано

Stable main **9e26f331d91d3ad85e2c0f15b5a6a4e63106e5ce**.
https://arturmal2805-netizen.github.io/ai-cat-game/?v=9e26f33
Workflow44612746706 SUCCESS. LiveJS593013c89da9d392e10c9a42a7ba7297e2073cccff5e3fc32951b930262e4dce;
CSS1ca6fd7d91d93d2434122de8b604f9e1f0306145487ece7434204f01d46492bc.
V11 опубликован:38SPA water surfaces, sharedrefraction, freeChichi/freeNPCbuttons.
V12 ещё НЕ опубликован. Не объявлять его live/визуально одобренным.

## Активный V12: убрать именно внутренний скальный обод

**a6151330c7027b97e2a8949dd465493a83050a46**, remote
**codex/v12-island-warehouse**, /workspace/chichi-v12-island-warehouse.
PR#5 ready, fullCI **44729248201** выполняется.
https://github.com/arturmal2805-netizen/ai-cat-game/pull/5

Пользователь на actual новом screenshot увидел оставшийся малый круг из
headlands/raised bed roots. Предыдущее объяснение, будто он смотрел старый live,
было ОШИБКОЙ: фото действительно показывало candidate. Ошибку признали.
1ec45e8/nativeproof37c208e/fullCI44713392228 SUCCESS теперь SUPERSEDED:
один внешний contour сам по себе не убрал внутренний скальный обод.

Последняя воля: ОДНА большая лагуна без малой чаши. Берег можно менять свободно.
Mall/SPA оставить неподвижными/невредимыми; не менять WORLD_CENTERS, комнаты,
котиков, покупки/ID/кошельки. Warehouse doubled BOTH width/length:480×240м,
platform actual529.4×298.7м, root scale1,local(2200,-177,450). Measured boxes gaps
1773.7/1785.1м (>3newplatformwidths), need recheck exactlatestNative.
Phase1 exterioronly, без оборудованного интерьера/Squish/AI/магазинов/транспорта.

Новая правка: удалены10старых внутренних headlands и их bedcolumns до-10м.
Два headlands сохранены ТОЛЬКО на настоящем внешнем берегу. Crown foliage
переходит на новый drycoast. Широкий smooth bedcut теперь q=.7..1 вместо.95..1.
Все старые floorstones имеютq<=.6902, reefgardens footprints<=.6823: они внутри
точно прежнего ядра. Точный protectedbuildingbed и подходы прежние. Верхние
координаты всех старых watervertices НЕ менялись: дополняется один releasedmesh,
те же material/uniform/clock/fields/opacity.46/globalshader. Existing swimmer/
submarine floor contacts используютactualexpansionBedY, чтобы не осталось ghostrim;
координатный savedomain и управление не расширялись. NewWarehouse remains BASE
visible in lowOnly/worldoverview. Все neighbouringislands/housing gaps прежние.

Настоящий offlineprobe перебейкан на новый coast:
tropical-coast-11fb032edc2b.png,36913bytes/0.33MiBmipGPU,revisionf6a4ccb236467f87.
Старые PNG сохранены для cachedclients. SPAatlas/sharedwaterfield прежние.

## Проверено и следующий шаг

56Node22 geometry/layout/purchase/performance/swimmer/submarine/explorer checks
PASS, diffcheckPASS. Новый regression проверяет удалённыеcrownroots, сохранение
старых stones/core, отсутствие ghostfloor и actualunderwaterpose normalization.
Node22 productionbuild сейчас /workspace/qa/v12-no-inner-ring-build.log, session90181.
После него: finalNative desktop9views и genuinephone390×844/coarse/DPR2/real
Островbutton, один GPUcontext за раз. Не использовать37c208ePNGs какproof a615133.
Затем exactfullCI→mergePR5→mainCI/Workerrelease/sharedsaves/Pages→actualHTTP
HTML/JS/CSS/probehashes/одноapplicationconnection. PaidAI не запускать.
Ни NativePASS, ни CI не означают artisticapproval/Mac/iPhoneFPS.

## Сохранение работы

Canonical memory: codex/ocean-recovery-memory; её приложение старое, не запускать.
Старые статусы/receipts: history/2026-11-20-v12-status-evolution.md.
Evidence37c208e6e65f4c7dc66c24572d3072dab3ab83ad остаётся в
codex/v12-unified-evidence какsuperseded by user's actual imagefeedback.
Старые source512fc4c/5aa0bf9/1ec45e8 и QA/worktrees не удалять.
Своё завершённое privateQA assets копирование очищалось ТОЛЬКО после проверки
remote source-prooftar; SQLite/logs/PNGs/source/worktrees сохранены.
Node22 PATH=/home/agent/.npm/_npx/52027bd8fc0022aa/node_modules/.bin:$PATH.
Playwright=/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright;
Chromium=/usr/bin/chromium. Sparsecheckout excludesdocs/qa; materialize only exact
fixtures throughgitshow. Never checkout entiretree. Never delete oldworktrees.
