# Текущий статус

Обновлено2026-11-18 Europe/Kiev. [История](history/CURRENT-before-emergency-publication-2026-11-18.md).

## Опубликовано аварийное исправление

**4025f713cea3b8ecfea72128275398af8d3dabc3**, origin/main и codex/emergency-save-recovery.
[Игра](https://arturmal2805-netizen.github.io/ai-cat-game/?v=4025f71), [диагностика](https://arturmal2805-netizen.github.io/ai-cat-game/?v=4025f71&profile=1),
[read-only резервные копии](https://arturmal2805-netizen.github.io/ai-cat-game/?v=4025f71&recover=1).
[FullCI44388536452](https://github.com/arturmal2805-netizen/ai-cat-game/actions/runs/44388536452): test/deploy/pages SUCCESS,
точныйserver release/sharedsaves step SUCCESS. ПлатныйAI QAневызывался.
ActualHTTP 2026-11-18T20:26:29.321591+00:00: одноapp, JS/CSSпроверены:
JS **76e61007f2291f42ff7afb041c54ad58a8f75624c0c4d55cb222f60a6dbf9bd8**;
CSS **9db4746b53b8da87077097c9238673ce7d6a6e4f45652fb7b5c92aed121e9fd1**.
[Квитанции](../qa/2026-11-18/emergency-publication/emergency-live-verification.json).

1. Strictclientload блокирует silentcatch→newGame420→reward/save490. Bootпроверяет
   данные доclaim; returningidentity бездоступногоsnapshot получает readonlyrescue.
   ServerPUTотвергает freshnewepoch с потерейколонии/unlocks, копии не вращаются.
   Это доказанный опасныйпуть; исходная конкретнаяошибка старого147catraw неизвестна.
2. ПодготовкаSPA начинаетсяприфокусеоткрытогоautumn, coalesced/selected/bounded,
   retryне чаще30сек. NativeactualgamePASS: SPAready/visible14zones ДОкликаSPA
   на privateкопии присланного19profile мира (нормализуется20venueprofiles).
3. ПользовательЯВНОпотребовал «начисли не теряйвремя»: scopedодномумирукомпенсация
   доводит playercoinsдо4381984, diamondsдо240; текущие nativeprofilesдо10000coins.
   Большиебалансы неуменьшаются. Permanentvaultreceipt одинраз; снимкиcurrent/
   previous/older ДОначисления отдельно сохранены. Ключ НЕвGit, только one-wayhash.
   Clientflush доgrant; pending/conflictостанавливаетgrant, послепервогоуспеха
   recoveryставит строговалидированнуюкопию. Повторныйbootне стираетofflinestate.
   **ПРИМЕНЕНИЕВРЕАЛЬНОМПОЛЬЗОВАТЕЛЬСКОММИРЕ ЕЩЁ ТРЕБУЕТПОДТВЕРЖДЕНИЯ**:
   это произойдётприоткрытииновогоклиента с авторизованнымкодоммира. Изсреды
   directWorkerзапросtunnel403; невыдаватьCI/юнит зафактическийличныйбаланс.
4. GET/api/save?copies=1 пообычнойtoken-auth читаетcurrent/previous/older и
   preawardкопии; readonlyrescue доавтосохранения выгружаетлокальные/outbox/
   accountarchives и явно запрошенныеоблачные. Ключи неэкспортируются.

## Проверено и ограничения

Node22fullbuild, targeted save/award/auth/duplicate/reload/crypto tests PASS,
реальныйbrowser rescueexport/noautomaticHTTP/noPUT PASS. Реальнаяпокупкаfashion/
receipt/inventory/profession сохранена послеcompensation/strictreload; открытая
криптосделка escrow/path/deadline сохранена и закрываетсяодинраз. Криптоторговля
проверена mockforecasts (long/short/risk/liquidation/restart/nonce/7daycycles),
**реальныйудалённыйAIответ НЕ подтверждён**. CIconfigured/release неравноpaidinference.
Точнаяnative/targetedsource/docs: docs/qa/2026-11-18/emergency-save-recovery в4025f71.
Первыеfails: послеautumnпоявлялсяновыйvenuekittenс0 — исправленоensureдоgrant;
тестпокупкипотребовалреальныйreceiptсуффикс-1, fixtureисправленабезослабленияledger.

Старая147котиковаяколония/работы/история НЕ восстановлены. ДваJSONпользователя
содержали490coins/0diamonds/19profiles/5placements/newEpoch1795028031356,
безautumn. Usercloudlatestдавала450. UserподтвердилвозвратТРЦпослеofflineunlocktool,
SPAисправленотдельно. Последняяпубликация55a9beb былапроверенаприватно/HTTP,
ноНЕподтвердиласохранностьнастоящегопользовательскогомира. Необъявлятьвсёвозвращённым.
Компенсация разрешенакакзаменаожиданиюстарыхкошельков, не восстановлениеихистории.

## Рабочие деревья / следующий шаг

/workspace/chichi-emergency-save-recovery,codex/emergency-save-recovery — текущийкод.
/workspace/chichi-underwater-spa-resort,a8ea375WIP и все старые worktrees сохранены.
Main4025f71 включаетSPA55a9beb; не применятьего/компенсациюзаново вручную.
Каноническаяпамять — codex/ocean-recovery-memory; rawrecoverykey/личныеJSONнепубликовать.
Публичныйofflineunlocktool fa872ec/recovery/offline-location-tool содержитТОЛЬКОHTML,
неигровыеданные; это предыдущийчастичныйинструмент, невозврат147профилей/кошельков.

Послеuserreload проверитьactualSPA/балансы/privatewallets и причиныотказаеслиесть.
Не добавлятьсредствавсеммирам и не обходитьpermanentreceipt. Далее нужные84фазы/
полныйautonomy/manualrelease/nativephone/performance/refpolish; не объявлять
первыйSPAэтап завершённымреференсом. Mallart по-прежнему внеочереди.
[Индекс](README.md), [очередь](ROADMAP.md), [решения](decisions.md),
[recovery](evidence-and-recovery.md). R10 e38a822/30деревьев точновосстановлен,
нораньшепозднегоSPA; неfullGit. Свежийкод/QA уже вremote. Трипотерянныеранниеветки
необъявлятьвосстановленными. Диагностика только?profile=1/close/reloadhidden.
