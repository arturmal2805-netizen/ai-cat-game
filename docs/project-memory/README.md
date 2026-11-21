# Память проекта — точка входа

Порядок: корневой [AGENTS](../../AGENTS.md) → [CURRENT](CURRENT.md) →
[ROADMAP](ROADMAP.md) → [подробные правила](standards/project-rules.md) →
стандарт системы → [решения](decisions.md) и связанные QA-доказательства.

- [Вода](standards/water.md): Crimson Desert — цель; d6fa805 — историческая база.
- [Грунт/растительность](standards/terrain-vegetation.md).
- [ТРЦ](standards/mall.md).
- [Управление/камеры](standards/controls-camera.md).
- [V12: общая лагуна и далёкий Warehouse](standards/island-warehouse-v12.md).
- [Подводный SPA](standards/underwater-spa.md).
- [Waterfront V14: ресторан и прыжки от Чичи](standards/waterfront-v14.md).
- [AI: запросы и упаковка](standards/ai-requests.md).
- [Подготовка renderer и immutable cache](standards/render-preparation.md).
- [Сохранения/экономика](standards/saves-economy.md).
- [Запуск, QA, восстановление и публикация](evidence-and-recovery.md).

CURRENT содержит только текущий статус и ближайший шаг; ROADMAP — приоритеты
и критерии. История — [decisions](decisions.md) и history/, а не параллельные очереди.
Документы сверяют с настоящим checkout. Расхождение расследовать; не reset.

**Различать:** запланировано / реализуется / локально / проверено / опубликовано /
одобрено пользователем / отклонено. NativePASS не означает красоту, CI не
означает одобрение, средний FPS не исключает фризы, PNG другой версии не доказательство.

Каноническая память — удалённая codex/ocean-recovery-memory. Старый main может
содержать прежний CURRENT. Прочитать свежую запись без изменения рабочих файлов:

```bash
git fetch origin codex/ocean-recovery-memory
git show FETCH_HEAD:docs/project-memory/CURRENT.md
```

Исходники активной задачи брать из ветки, названной в CURRENT; не запускать
устаревший код ветки памяти как актуальный main. После значимых изменений,
проверок, публикаций и передачи обновлять документы и проверять remoteSHA.
