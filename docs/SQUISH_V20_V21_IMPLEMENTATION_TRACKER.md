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

Existing sending owners: world.perform / performResident, leisure runtime, MallWorld.start/startReady, ResortSpaWorld.startReady/call/invitations, WaterfrontWorld.invite/startReady, WarehouseWorld.invite/startReady. Registry and integration not yet implemented; must not silently skip an owner. Existing Warehouse has actual bounded three-boat fleet, real gangplanks and pressure doors. Preserve these.

Space request: general manual jump native PC VERIFIED (20 tests and actual keyboard/airborne/release frames under docs/qa/2026-11-28/chichi-space), separate from venue transport; exact camera/walker source hashes preserved in protection manifest.
