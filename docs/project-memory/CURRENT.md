# Текущий статус — 27 ноября2026, Europe/Kyiv

Каноническая память — codex/ocean-recovery-memory. Код ветки памяти старый;
использовать названные ниже source worktrees. Не удалять/reset старые worktrees.
[Полная предыдущая запись и история](history/CURRENT-before-proportions-correction-2026-11-27.md).

## Опубликовано и проверено:7656b95

Main **7656b9544c986ad29dc470f25d45693689f96dd1**, source
**985b436d92b42f721b8ad2c59b1acef09a899364**, PR#18 normalmerge безadmin/bypass.
Workflow **46002981562** test/deploy/pages SUCCESS. ActualHTTP+deployedWorker fullSHA
проверены27ноября13:18UTC; одноappподключение, JS/CSS/assets exact. ManagementAPI
использован дляWorker:прямойworkers.dev ограниченallowlist; самworkflowпроверил
status/shared saves. Paid inference не вызывался.
JS **5020781e6cb7028afa491d8322352910e9ed7afec39e6202f03e7be96e6b299e**,
CSS **6009872ae8865f57fb8d358ee2e71be2eac6ad5bdac240cba496a6664983b2d3**.
[Игра](https://arturmal2805-netizen.github.io/ai-cat-game/?v=7656b95) ·
[FPS opt-in](https://arturmal2805-netizen.github.io/ai-cat-game/?v=7656b95&profile=1) ·
[Live receipt](../qa/2026-11-27/warehouse-threefold/live/live-verification.json) ·
[NativeQA](../qa/2026-11-27/warehouse-threefold/README.md).

Батут: исправленыauto4растущихhops→water/splash/swim/climb, global-button takeover
наapproach/flight/return, заметныйpinnednet sag, groundedcontacts. Thirdpersondefault,
настоящиеkeyboard/touch,7hopsдо43.31m;2privateSQLitedeeprestores wallets/purchases exact.
Техническая проверка — не Mac/iPhoneFPS или художественное одобрение.

## СЕЙЧАС: исправить слишком узкие пропорции Warehouse

Пользователь после7656b95 явно отверг вытянутую узкую форму и прислалliveскрин.
Новая цель — увеличить **ПОПЕРЕЧНЫЙ** размер (data.depth/Z), а не снова длинуX.
Выбрано ×3 depth:240→720, platformDepth296→888; длинуwidth3600 иheightScale7.5
сохранить. Прежнее условие«depth unchanged» явноsuperseded этим новымзапросом.
Вернуть пропорции до последнего×3растяжения, сохранить остальные здания/кошельки.
Новыйworktree `/workspace/chichi-warehouse-proportions`, branch`codex/warehouse-proportions`,
basepublished7656b95. ЕщёWIP. DefaultWarehousecamera станет fittedsteepobliqueoverview:
старыйwest-underwaterfitдляширокогокорпусанаphoneвыходитзаберег/скрываетсядном.
Проверитьactualshape/shoreclearance/camera, Node22/actualdesktop+phone/CI/live.
Не называть7656b95визуальноодобренным: userrejectsaspect. Inlinephotoнетисходныхbytes.

## Затем сразу: рабочий вход и субмарины (не отменено)

Явныйзапрос: безлифта, адекватныйвход, маленькиесубмаринысреальнойпосадкойкотиков,
кнопка«ВідправитиЧічідоWarehouse» принажатииWarehouse, теже рейсыдляЧичи,
WarehouseвсуществующемAIспискевизитов/активностей. Безновыхper-catAIcalls/экономики.
Пользователюсказанпорядок: быстрыепроверенныерелизы, затемфункциональныйвход;
последнеекорректирующеерасширениеприоритетно, но незавершатьобщуюзадачупосленего.

Worktree `/workspace/chichi-warehouse-submarine-access`, branch`codex/warehouse-submarine-access`,
remote **7529ca0faaa7737c89975204824bb265dd757e15**, base985b436 (предыдущийgeometry).
Spec6a89ca7, route/aperture098f1cf, entryc1f5578, fleet/visitRuntime7529ca0.
5NodechecksPASS; API/UI/AI/worldintegration/nativeQA ЕЩЁ НЕ ПОДКЛЮЧЕНЫ.
ActualdoorwaycutsownWarehouseglass/cornices, сохраняетoldvertexprefixиостальныездания;
neighboringglasssealed.8mlevelgallery, sequentialpressuredoors,sharedwatercore; floor
неподнимается. Статика/створкиbatchModelSteps. НетSquish/interior/economyfeature.
Fixed3native-submarinepool, queuedroundtrip simulation, portssemaphores, reverse shipping
lanes, реальныеboarding→outbound→airlock→visit→airlock→inbound→disembark. Queue7testPASS.
Важно:послеwidth/depthкоррекцииmergeновыйmainвэтотworktree и параметризоватьaccessdata/
gallery/aperture/route/lobby отновыхW.depth/platformDepth; сейчасчастьzhardcoded110/170/183.

Нужныдалее: gallery/shoregangplanks,fleetWorldbinding, recallbutton, leisureOffers+validation,
всеsingle-ownerframe/blocked/cancel/saveхукивworld.js, manualinsidefloor/returncontrol,
pressure/collision/cat-clearance/cancellation tests, compactAIbudget и2privateSQLite.
Не вводитьопасныйновыйsaveenum:предпочтительноtransientvisit clegacysafedock и прежним
sharedsaveформатом. Никакихliveplayerworlds/кодааккаунта/paidinferenceвQA.

## Постоянные ограничения

OneGPUbrowser за раз; не менять public/build sourceподrunningQA. Node22:
`/home/agent/.npm/_npx/52027bd8fc0022aa/node_modules/.bin` вPATH.
Нативные коты, Mall/SPA/restaurant/trampoline, всеsavedIDs/покупки/балансы неизменны,
кромеявноновыхWarehouseentry/activities. Диагностика толькоprofile=1/явныйзапрос.
CanonicalQAсmanifest/exactsources/PNG/hash; не переиспользоватьстарыеPNGкакновыепроверки.
Всеисторическиеsnapshots/failedattempts/backupR10 сохраненывистории/QA.
