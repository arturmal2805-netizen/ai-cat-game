# SPA V6 — повторная сверка референсов

Исходное задание: docs/specifications/underwater-spa-v6-2026-11-18.md.
R1 — Wellness Café, R2 — Aroma Therapy Garden, R3 — повтор R1,
R4 — Golden Galaxy VIP, R5 — общий трёхуровневый комплекс.
Оригинальные изображения доступны в сообщении пользователя, их байты не
получены как локальные файлы. Описания и наши PNG не заменяют оригиналы.
Реальные фотографии звёздных SPA-потолков в сообщении не приложены.

| Референс | Исходный игровой вид | Архитектурная сверка | Следующая доработка |
|---|---|---|---|
| R1/R3 Café | baseline/baseline-resort-cafe.png: редкие одинаковые столы | architecture/architecture-resort-cafe.png: новый округлый бар и аквариум, но простор пустой, рыбы похожи на цветные комки, потолок и свет не соответствуют | Разные силуэты рыб, бариста, настоящая опора пола вокруг аквариума, нормальная интерьерная камера, плотнее интерьер; столики-джакузи ещё впереди |
| R2 Aroma | baseline/baseline-resort-aroma.png: шесть ковриков, шаровые кроны | architecture/architecture-resort-aroma.png: арки и цветы добавлены, мягких кресел ещё нет, пол чрезмерно повторяется, композиция слишком пустая | Мягкие кресла с точными контактами, детальные лепестки вместо шаров, органический материал, подвесной цветочный декор и дальнейшее наполнение |
| R4 VIP | baseline/baseline-resort-vip.png: простой бассейн и редкие кресла | architecture/architecture-resort-vip.png: слабый потолок практически не читается, вода серая, чрезмерно светлый пол | Настоящий тёмный куполообразный потолок, звёзды на его геометрии, разделить тёплый свет комнаты и голубой свет бассейна, низкая камера |
| R5 Exterior | baseline/baseline-overview.png: ОШИБКА, камера внутри прибрежного грунта | architecture/architecture-overview.png: SPA появился, но ракурс со стороны ТРЦ перекрыт чужим зданием; силуэт ещё набор павильонов | Ракурс из свободной воды перед SPA, цельный фасад/галереи, более богатые террасы. Не скрывать и не менять ТРЦ |

Обе серии реально просмотрены. Ни одна не принята как финальное соответствие.
Переход к третьей серии: материалы/свет/мебель и геометрия бассейнов.
Далее — независимая сверка наполнения/анимаций и финальный проход каждой зоны.
Не ставить PASS только потому, что объект или его имя присутствует в коде.

Масштаб проверять относительно родной модели кота. Текущая планировка занимает
примерно 226×137 м в существующей резервации 248×144 м; центральный купол уже
70 м в диаметре. Все 14 контуров проверены по реальному дну и воде, отдельно от
ТРЦ. Расширение не нужно ради этих размеров: обзор можно поставить в существующую
расчищенную бухту. Если новая геометрия потребует выхода за границы — пересчитать,
не считать этот вывод разрешением растянуть весь остров.

Новый верхний бассейн имеет отдельное прозрачное дно и настоящий мостик.
Ранняя проверка выявила светильник на мостике: он смещён между направлениями входа.
Кресло перекрывало термальные ступени, дерево — лестницу; предметы переставлены,
столкновения и размер тела не изменены. Повторные проверки лестниц/воды пройдены.
Стеклянные кабины получают реальный внутренний бассейн с отверстиями в полу,
существующими местами, опорными площадками и мостиками; нативная проверка ещё нужна.

## Четвёртая сверка — sealed-light, 19 ноября (Kyiv)

Точные bundle/source/overlay и пять кадров — sealed-light/manifest.json.
Настоящая W вывела Чичи из Nap seat6 по подставке; «Весь мир» снял owner.
Верхний thermal: реальные ступени/плавание/выход, оплата/SQLite reload PASS;
отдельный кадр показывает настоящее прозрачное дно снизу. Это не полный береговой тур.

- R1/R3 Café: бар стал округлым, но аквариум теряется перед чужим ТРЦ, рыбы
  всё ещё абстрактные объёмы без глаз/читаемых плавников. Нужны настоящие силуэты,
  более тонкая геометрия бара, собственная интерьерная композиция и мокрые столики.
- R2 Aroma: нужны плотная цветочная композиция, настоящие стеклянные беседки
  и каскады; арки и кресла сами по себе не воспроизводят сад референса.
- R4 VIP: тёмный верх добавлен, но в основном ракурсе выглядит как далёкая
  сетка. Большой пустой пол, собственных кремовых лежаков нет. Сначала реальные
  лежаки и защищённая архитектурой композиция со звёздным потолком/нишами.
- R5 Exterior: камера теперь в воде, а не в грунте; силуэт всё ещё набор
  разрозненных плоских павильонов, требует цельных карнизов/галерей/садов.

Серия НЕ принята как финал. Не выдавать native PASS за визуальное одобрение.
Пользователь подтвердил разрыв с целью и требует сохранение каждого этапа в remote.

## Fifth comparison — furnishing

Exact proof: ../../2026-11-19/spa-v6-furnishing/native/manifest.json.
R1/R3: fish now identifiable and bar lower, but tank reads as empty air; water
dining is still absent. R2: real canopies/legs/denser blossoms improve structure;
still no lush garden and cascades. R4: supported lounge beds and opaque curved
star vault now visible; lantern/light hierarchy, planting and rich ceiling still
far from reference. R5: pavilion silhouette/wing galleries still need unification.
No final visual acceptance. Recorded source, camera, clock and settings per frame;
clock differs4–10 game minutes from the fourth series, so this is not an exact
lighting A/B. Next controlled comparison must hold the QA clock fixed.

## Seventh comparison — galleries (six native views)

Exact source63976055337663d736dad265b8e10e16eefceae9, clean,
../../2026-11-19/spa-v6-galleries/native/manifest.json.
R1/R3: actual wet dining and identifiable fish now present; tank reads better
with true caps/seams, but lacks luminous detail and actual interior reflections.
R2: planters/flower volume increased; still too sparse and no layered lush
water garden/cascades. R4: real lounge beds and curved star roof read, but flat
floor/light and weak galaxy hierarchy remain far from reference. R5: tier
bands/bridges align but silhouette remains separate discs, not unified palace.
Upper glass pool now36m, genuine transparency/steps/visit/reload work. However
the image exposes Cafe duplicate pseudo-roof/pendant crossing water; this is
a visual geometry failure, despite successful behaviour. Correct it next.
Source also proves missing furniture/opaque-roof castShadow propagation during
bake. Native grey uniform floor is not final; restore flags before probe work.
