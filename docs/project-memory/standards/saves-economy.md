# Сохранения, кошельки и владение

## Требование

Сохранять монеты/инвентарь/оплаченные объекты/профессии/IDs/модели/прогресс.
Не менять общую семантику sharedmerge ради одного поля. Не записывать QA в живоймир.
Обычный job=rest и временный отпуск различны; отпуск2–7ИГРОВЫХдней, единый clock,
срокнеперезапускается/re-syncнепродлевает, stale save не воскрешает завершённый.
Профессия/прежняяработа сохраняются, возврат через назначения/JOB_CAPACITY.

## Источники и устройство

Stable827e370: `public/economy.js` — normalize/load/save;
`shared-world.mjs` — validation/three-way merge;
`public/cloud-save.js` — клиент очереди (проверять актуальные exports);
`public/jobcity-system.js`, `public/cat-vacation.js` — кошельки/clock/отпуск;
`public/mall-system.js` — последовательные purchaseCount/receipts/inventory/used;
`public/cat-locations.js` — позиции, bounded coordinates и timestamps;
`public/housing-system.js` — доказанное владение домами.
Один simulation owner. ACK/ошибка/reload не разрешают повторное списание.
Выбракованный paidplacement возвращается в storage с исходным сроком, не исчезает.
Не изобретать оплаченные постройки/валюту без существующего proof.

SPA WIP4adcbd3427d43c0c3e622361ea03fe076592e356 использует ТОТ ЖЕ privatewallet /
permanent Mall receipts; `resort-spa-economy.js` завершает конкретный билет
идемпотентно. Прогон в privateSQLite:2000→1700/одинusedreceipt послеreload.
Это не новыйmergeалгоритм и не подтверждение всего SPA/входа сберега.

## Воспроизведение/проверки

Node22, `node --test test/mall-economy.test.mjs test/purchase-preservation.test.mjs`.
При изменениях normalization/storage/sharedmerge — также существующий
CHICHI_OWNERSHIP_AUDIT=1 private phone/SQLite путь и нужные stale/racing cases.
SPA: `node --test test/resort-spa-economy.test.mjs` из WIP; актуальная nativeкоманда
в recovery. Валидацию/ownership assertions не ослаблять ради fixture.

Проверять повтор/потерюACK, отказбаланса, чужойчек, reload, cachedclient,
сохранность owned/inventory/профессий и отсутствиедвойногоконтроллера.
Игровой recoverycode — секрет доступа к миру; никогда не хранить его вGit,
журналах, архиве или публикуемых manifests. PrivateQA SQLite тоже не архивировать.

## Известные ошибки

Недействительный QAreceipt дома без суффикса-1 → тест не создавал дом;
исправлена fixture, а не ledger. Lazyhome ожидался при focusedmoon → timeout;
реальный клик нужного острова до ожидания исправляет сценарий без глобальной
отмены ограничений подготовки. Привязанные QA/точные source — в CURRENT/history.
