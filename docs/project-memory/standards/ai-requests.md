# AI-запросы и компактный контекст

## Требование

Сохранить все решения/котиков, уменьшить повторяющийся текст. Число вызовов
не равно длине запроса. Внутренний20k-character guard legacyплана не лимит
Cloudflare; провайдер считает токены. Не обещать стоимость/latency по символам.

## Источники истины и устройство

Опубликованный сервер827e3708979cb95c4675e38caf6354364c733b64:
`jobcity-ai.mjs` — legacy полное планирование;
`city-life-ai.mjs` — события выбора профессии/вечера, strict schema;
`public/city-ai-schedule.js` — сохранённый маркер ДО запроса/расписание;
`city-ai-vault.mjs` — дедупликация/сохранённый ответ;
`city-ai-pack.mjs` — lossless dictionary только известных строковых столбцов.
Повторяющиеся personality/wishes/visited stores — индексы text; уникальные строки
остаются literal. Другие числа (skills/coins/cat/place IDs) не переинтерпретировать.
System prompt явно описывает расшифровку. Нет экономии — исходный payload.
Ответы/валидация/max_tokens/число вызовов не менялись. Исходный state не мутировать.

Профессия выбирается первоначальным событием; вечерние решения — отдельным
пакетом. Не называть каждый игровой тик новым запросом и не обещать строго
один API-call на весь день для всех режимов: есть отдельные пользовательские
решения Чичи, события города и ограниченные повторы ошибки провайдера.

## Воспроизведение/проверки

Node22, `node --test test/city-ai-pack.test.mjs test/city-ai-events.test.mjs`.
Legacy147 guard без дорогого120-day повтора:
`node --test --test-name-pattern='the one daily AI batch' test/cat-life-cycle.test.mjs`.
`node docs/qa/2026-11-18/ai-context-compact/measure.mjs` в ветке827e370.
Exactdecode сохраняет147identities/skills/coins/needs/wishes/partners/allvenues;
один fakeprovider invocation, strict output schemas и40-day lifecycle guards.
[Метрики](../../qa/2026-11-18/ai-context-publication/live-verification.json),
[код/данные измерений](https://github.com/arturmal2805-netizen/ai-cat-game/tree/827e3708979cb95c4675e38caf6354364c733b64/docs/qa/2026-11-18/ai-context-compact).
Рутинные QA не вызывают платный реальный inference; opt-in только по явному запросу.

## Установленные ошибки

Добавление14полных SPAназваний: legacy147input20162chars>internal20000guard.
Причина установлена сравнением тех же строк с/без каталога. Краткие AIlabels
исправили guard; интерфейсные полные имена сохранены. Затем dictionaryуменьшил
stableплан19281→15620, карьеры5734→4090, stressвечер30661→21175chars.
Не увеличивать guard и не удалять котиков ради зелёного теста.
HTTP-tunnel403 к Worker из среды — ограничение прямого аудита. CIотдельно
верифицировал release/sharedsaves; не объявлять403 доказательством сломанногоAI.
