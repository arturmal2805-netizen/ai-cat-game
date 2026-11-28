# V20 interior and V21 travel implementation tracker

2026-11-28. Additive to V19, V19.1 and V19.2. No release claim.

Primary visual reference: latest user supplied pink Jelly / collection wall / white giant image. Keep underwater context. Never use concept art as actual game evidence. Existing physics mesh and IDs retained. No building geometry or world scale changes.

## V20 requirements

- **NOT STARTED** — 2. КРИТИЧЕСКОЕ ПРАВИЛО — НЕ ТРОГАТЬ ДРУГИЕ ЛОКАЦИИ
- **NOT STARTED** — 3. КАК ИСПОЛЬЗОВАТЬ ФОТОРЕФЕРЕНС
- **NOT STARTED** — 4. ПРЕДВАРИТЕЛЬНЫЙ ТЕХНИЧЕСКИЙ АУДИТ
- **NOT STARTED** — 5. ОСНОВНАЯ ПРОБЛЕМА — СЛИШКОМ ПРОСТОЙ ВИЗУАЛЬНЫЙ УРОВЕНЬ
- **NOT STARTED** — 6. НОВАЯ ЦВЕТОВАЯ ПАЛИТРА
- **NOT STARTED** — 7. ПЕРЕРАБОТКА ПОЛА
- **NOT STARTED** — 8. КОЛЛЕКЦИОННЫЕ СТЕЛЛАЖИ
- **NOT STARTED** — 9. ГЛАВНАЯ ВЫВЕСКА — MEGA SQUISH COLLECTION
- **NOT STARTED** — 10. ГЛАВНЫЙ ПРОЗРАЧНЫЙ РОЗОВЫЙ СКВИШ
- **NOT STARTED** — 11. КЛЮЧЕВОЕ ТРЕБОВАНИЕ — ФИЗИКА ПРОЗРАЧНОГО СКВИША
- **NOT STARTED** — 12. ПЛАТФОРМА ГЛАВНОГО СКВИША
- **NOT STARTED** — 13. БОКОВЫЕ ПОДИУМЫ
- **NOT STARTED** — 14. ОГРОМНЫЙ БЕЛЫЙ СКВИШ НА ЗАДНЕМ ПЛАНЕ
- **NOT STARTED** — 15. ВЕРТИКАЛЬНОЕ НАПОЛНЕНИЕ
- **NOT STARTED** — 16. ДЕКОРАТИВНЫЕ БАННЕРЫ CHICHI
- **NOT STARTED** — 17. РАСТЕНИЯ И ЦВЕТОЧНЫЙ ДЕКОР
- **NOT STARTED** — 18. МАЛЕНЬКИЕ СКВИШИ ДОЛЖНЫ ВЫГЛЯДЕТЬ КАК КОЛЛЕКЦИОННЫЕ ПРЕДМЕТЫ
- **NOT STARTED** — 19. УЛУЧШЕНИЕ АРХИТЕКТУРНОГО ОСВЕЩЕНИЯ
- **NOT STARTED** — 20. БЛИКИ, BLOOM И ОТРАЖЕНИЯ
- **NOT STARTED** — 21. ПОВЫШЕНИЕ КАЧЕСТВА ГЕОМЕТРИИ
- **NOT STARTED** — 22. ДЕСЯТЬ ТЕМАТИЧЕСКИХ ЗОН
- **NOT STARTED** — 23. КОТИКИ И ЖИВАЯ АТМОСФЕРА
- **NOT STARTED** — 24. СИСТЕМА ФИЗИКИ ИЗ V19
- **NOT STARTED** — 25. ОПТИМИЗАЦИЯ ПРОИЗВОДИТЕЛЬНОСТИ
- **NOT STARTED** — 26. КОНКРЕТНАЯ ПОЭТАПНАЯ РЕАЛИЗАЦИЯ
- **NOT STARTED** — 27. ОБЯЗАТЕЛЬНАЯ СВЕРКА С РЕФЕРЕНСОМ
- **NOT STARTED** — 28. НЕ ИЗМЕНЯЙ КАМЕРУ РАДИ КРАСИВОГО СКРИНШОТА
- **NOT STARTED** — 29. СИСТЕМА ПРОВЕРКИ ПРОГРЕССА
- **NOT STARTED** — 30. ЗАПРЕЩЁННЫЕ УПРОЩЕНИЯ
- **NOT STARTED** — 31. ФИНАЛЬНЫЕ ТЕСТЫ
- **NOT STARTED** — 32. ФИНАЛЬНАЯ ВИЗУАЛЬНАЯ ПРЕЗЕНТАЦИЯ
- **NOT STARTED** — 33. КРИТЕРИИ ПРИЁМКИ
- **NOT STARTED** — 34. ИТОГОВОЕ УКАЗАНИЕ

## V21 requirements

- **NOT STARTED** — 1. ГЛАВНАЯ ЗАДАЧА
- **NOT STARTED** — 2. СТРОГИЕ ОГРАНИЧЕНИЯ
- **NOT STARTED** — 3. ПРИНЦИП ИНТЕГРАЦИИ
- **NOT STARTED** — 4. НОВАЯ ЛОГИКА ОТПРАВКИ КОТИКА
- **NOT STARTED** — 5. КАК ДОЛЖЕН ВЫГЛЯДЕТЬ ПОРТАЛ
- **NOT STARTED** — 6. АНИМАЦИЯ ИСЧЕЗНОВЕНИЯ КОТИКА
- **NOT STARTED** — 7. СКОРОСТЬ СИСТЕМЫ
- **NOT STARTED** — 8. ОСОБЫЙ МАРШРУТ — WAREHOUSE И СУБМАРИНА
- **NOT STARTED** — 9. ТЕЛЕПОРТАЦИЯ НА БАТУТ
- **NOT STARTED** — 10. ТЕЛЕПОРТАЦИЯ В SPA
- **NOT STARTED** — 11. ТЕЛЕПОРТАЦИЯ В ТРЦ
- **NOT STARTED** — 12. ТЕЛЕПОРТАЦИЯ В РЕСТОРАН И НА НАБЕРЕЖНУЮ
- **NOT STARTED** — 13. ТЕЛЕПОРТАЦИЯ В ЛЮБУЮ ДРУГУЮ ЛОКАЦИЮ
- **NOT STARTED** — 14. УНИКАЛЬНЫЕ ТЕМЫ ПОРТАЛОВ
- **NOT STARTED** — 15. МНОЖЕСТВО КОТИКОВ ОДНОВРЕМЕННО
- **NOT STARTED** — 16. КОНТАКТЫ, КОЛЛИЗИИ И БЕЗОПАСНОЕ ПОЯВЛЕНИЕ
- **NOT STARTED** — 17. УПРАВЛЕНИЕ AI И СОСТОЯНИЯМИ
- **NOT STARTED** — 18. ПОВТОРНЫЕ КОМАНДЫ
- **NOT STARTED** — 19. ИНТЕРФЕЙС
- **NOT STARTED** — 20. КАМЕРА
- **NOT STARTED** — 21. ОПТИМИЗАЦИЯ ПОРТАЛОВ
- **NOT STARTED** — 22. СОХРАНЕНИЕ СОСТОЯНИЯ
- **NOT STARTED** — 23. АВТОМАТИЧЕСКОЕ ТЕСТИРОВАНИЕ
- **NOT STARTED** — 24. РЕЕСТР ПОКРЫТИЯ ВСЕХ ЛОКАЦИЙ
- **NOT STARTED** — 25. ПОРЯДОК РЕАЛИЗАЦИИ
- **NOT STARTED** — 26. НЕ ЗАСТРЕВАЙ НА ОДНОМ ПОРТАЛЕ
- **NOT STARTED** — 27. ФИНАЛЬНЫЕ КРИТЕРИИ ПРИЁМКИ
- **NOT STARTED** — 28. ФИНАЛЬНОЕ УКАЗАНИЕ

## Current audit

Existing sending owners: world.perform / performResident, leisure runtime, MallWorld.start/startReady, ResortSpaWorld.startReady/call/invitations, WaterfrontWorld.invite/startReady, WarehouseWorld.invite/startReady. Registry and four native owners are implemented; see checkpoint and generated coverage. Generic native coverage remains pending; must not silently skip an owner. Existing Warehouse has actual bounded three-boat fleet, real gangplanks and pressure doors. Preserve these.

Space request: general manual jump native PC VERIFIED (20 tests and actual keyboard/airborne/release frames under docs/qa/2026-11-28/chichi-space), separate from venue transport; exact camera/walker source hashes preserved in protection manifest.

## V22 additive dynamic physics

Full exact request: [V22](specifications/warehouse-dynamic-physics-v22-2026-11-28.md). Adds time-dependent local material state, static load vs impact, 3 distinct Slime modes, bounded physical immersion, contact age/history, real 0/.2/.5/1/2/4/6/10s game frames, 3 impact levels, material audio and real depth/time plots. Existing main pink is Jelly, not liquid Slime. Keep all previous work and finished jump/camera.

- **NOT STARTED** — 1. ГЛАВНАЯ ЦЕЛЬ
- **NOT STARTED** — 2. НЕ ТРОГАТЬ СУЩЕСТВУЮЩИЙ МИР
- **NOT STARTED** — 3. ГЛАВНОЕ ИЗМЕНЕНИЕ — TIME-DEPENDENT DEFORMATION
- **NOT STARTED** — 4. НЕ ПУТАЙ ПРУЖИНУ, ПЕНУ И ВЯЗКУЮ ЖИДКОСТЬ
- **NOT STARTED** — 5. СОЗДАЙ DYNAMIC MATERIAL PROFILE V2
- **NOT STARTED** — 6. ОСНОВНОЙ ЦИКЛ ФИЗИКИ
- **NOT STARTED** — 7. РАЗДЕЛИ СТАТИЧЕСКУЮ НАГРУЗКУ И УДАРНЫЙ ИМПУЛЬС
- **NOT STARTED** — 8. СИСТЕМА CONTACT AGE
- **NOT STARTED** — 9. TIME-DEPENDENT CREEP SOLVER
- **NOT STARTED** — 10. SLIME — DEEP IMMERSION SYSTEM
- **NOT STARTED** — 11. ФИЗИЧЕСКАЯ ПОДДЕРЖКА ПРИ ПОГРУЖЕНИИ
- **NOT STARTED** — 12. НЕЗАВИСИМЫЕ РЕЖИМЫ СЛАЙМА
- **NOT STARTED** — 13. JELLY — IMPACT, WOBBLE & STATIC EQUILIBRIUM
- **NOT STARTED** — 14. MEMORY FOAM — PRESSURE HISTORY
- **NOT STARTED** — 15. CLOUD — EXTREME SOFT COMPRESSION
- **NOT STARTED** — 16. BUTTER — PLASTIC DEFORMATION OVER TIME
- **NOT STARTED** — 17. CRUNCHY — PRESSURE-SENSITIVE FILLER
- **NOT STARTED** — 18. ДИНАМИЧЕСКАЯ ГЛУБИНА ПОГРУЖЕНИЯ
- **NOT STARTED** — 19. CAT BODY DEFORMATION COUPLING
- **NOT STARTED** — 20. АНИМАЦИЯ ВЫХОДА ИЗ ГЛУБОКОГО СЛАЙМА
- **NOT STARTED** — 21. ПЕРЕНОС ВЕСА МЕЖДУ ЛАПАМИ
- **NOT STARTED** — 22. НЕЛИНЕЙНАЯ РЕАКЦИЯ НА СИЛУ ПРЫЖКА
- **NOT STARTED** — 23. CONTACT AREA EVOLUTION
- **NOT STARTED** — 24. ДЕФОРМАЦИЯ ОБЪЁМА И МАССЫ
- **NOT STARTED** — 25. НЕ ДОПУСКАЙ БЕСКОНЕЧНОГО ПРОВАЛИВАНИЯ
- **NOT STARTED** — 26. ФИЗИКА ВНЕШНЕГО МЕША
- **NOT STARTED** — 27. SHADER RESPONSE
- **NOT STARTED** — 28. ЗВУКОВОЙ ОТКЛИК
- **NOT STARTED** — 29. AI-ПОВЕДЕНИЕ НА МЯГКИХ МАТЕРИАЛАХ
- **NOT STARTED** — 30. ТЕСТЫ ДЛИТЕЛЬНОГО СТОЯНИЯ
- **NOT STARTED** — 31. ТЕСТЫ СИЛЫ ПРЫЖКА
- **NOT STARTED** — 32. ТЕСТЫ ПОЗЫ КОТИКА
- **NOT STARTED** — 33. DEBUG PANEL — DYNAMIC DEFORMATION
- **NOT STARTED** — 34. REFERENCE VALIDATION
- **NOT STARTED** — 35. ПРОИЗВОДИТЕЛЬНОСТЬ
- **NOT STARTED** — 36. ПОРЯДОК РЕАЛИЗАЦИИ
- **NOT STARTED** — 37. КРИТЕРИИ ПРИЁМКИ
- **NOT STARTED** — 38. САМОЕ ГЛАВНОЕ ТРЕБОВАНИЕ

Current physics audit: integrated e646a6b (agent075c3ca4). V2 profiles, actual local material-node creep/plastic history, physical static paw/body weight, separate one-shot landing impulse and history transfer across LOD are implemented. CPU50/50 plus focused9/9 pass on agent branch; parent combined94/94PASS. Three Slime modes use distinct bounded rheology; ultra displaced-contact-volume is an artistic cross-section proxy, NOT a full fluid solver. Native temporal images/true deep limb wrapping/full adhesive exit/COM load transfer/audio/AI/global regression remain OPEN.

## V21 implementation checkpoint

Shared CatTeleportationSystem + 12 pooled cat-head portals + real destination adapter helpers implemented. Five core tests cover token cancellation, negative floors, group separation, changing support, safe snapshots, no particle buffer uploads. Four-owner actual-game baseline archived in docs/qa/2026-11-28/cat-teleport/owner-handoff. World generic commands wired, but generic native coverage and gather/moveResident/autonomous preliminary travel remain OPEN. Initial complete venue registry + free hero SPA retention added after that run; not yet native verified. Source-preservation pins updated only for explicitly authorized transport/command files; all model/exterior/economy/save pins remain unchanged. Full generated catalogue/remaining gaps: CAT_TELEPORT_DESTINATION_COVERAGE.md.

## Integrated continuation checkpoint

Parent bf763498 (remote verified): V22 constitutive baseline + V21 generic/recall/drop ownership dispatch, safe save projection and followed-camera rebasing integrated. Source and intermediate real-game evidence stored; no publication or reference parity claim.

V20 Pass1: owned HDR/material/floor/shelf/podium refinements and2220 unchangedcollectibles implemented. Repeated actual before/after11/14views archived in docs/qa/2026-11-28/squish-v20/pass1. IMPORTANT: later found QA pause wrapper blocked internal PMREM conversion and even mapreadback; these old lighting captures are rejected as acceptance proof. Corrected gate must permit offscreen/internal passes and fresh browser regenerate cache. New actual-capture verification running. Production lighting has not been shown faulty by that diagnostic.

V21 dispatch: ea5dec9+d9850d9,69 agent CPU/Worker tests +Node22 build PASS. Recall and moveResident now shared portal, deferred greeting after real arrival; generic cold preparation/token cancellation/current native service entry; dynamic placed IDs and lost-support failure; transient save projection. Parent preserves asynchronous Warehouse invite .result, Waterfront manual request after arrival, and instantDispatch removes preliminary leisure flight. 48-operation cap and Warehouse departure safe wait remain; full native generic/group/phone/cold-save not yet verified.

V22 limitations: vertical scalar constitutive history within actual volumetric cage, not full3D viscous tensor/fluid; native immersion calibration/limb wrapping/automatic deep body transition unfinished. Sticky withdrawal is bounded resistance with existing real strands, not verified full9-stage exit. Existing equal planted-paw shares remain, COM transfer pending. No new material audio or AI choreography claimed.
