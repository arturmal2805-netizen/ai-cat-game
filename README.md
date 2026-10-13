# Чичи — маленький мир
Уютный сайт с котиком, который выбирает маршруты по саду через Cloudflare Workers AI. Каждое нажатие «Дай Чичи решить самой» запрашивает одно решение ИИ; автоматического цикла нет. Демо явно обозначено и работает без ИИ.

## Запуск
Node.js 20 или новее. Внешних npm-зависимостей нет.

```sh
npm test
npm start
```
Сервер слушает порт 3000 (можно переопределить PORT).

## Cloudflare AI
На сервере нужны `CLOUDFLARE_ACCOUNT_ID` и `CLOUDFLARE_API_TOKEN` с правом Workers AI Read для выбранного аккаунта. В облачной среде добавьте их через настройки окружения, не в исходники и не в браузер. Для локального запуска можно использовать игнорируемый `.env` и `node --env-file=.env server.mjs`. Доступ нужен к `api.cloudflare.com` по HTTPS. Модель: `@cf/meta/llama-3.1-8b-instruct`.

Ключ остаётся на сервере. Некорректные ответы ИИ отклоняются. При ошибке прогулка останавливается, подмена ИИ случайными решениями не выполняется. Запросы ограничены одним одновременно и интервалом 4 секунды на сервер.

Это локальный прототип. Перед публичным размещением добавьте авторизацию пользователей и лимиты расходов Cloudflare: доступ к `/api/decide` сейчас открыт посетителям сервера. Публикация не выполнялась.

## GitHub Actions → Cloudflare Workers
Workflow `.github/workflows/cloudflare.yml` запускает тесты и проверку сборки при push в main и pull request. Публикация запускается отдельно: GitHub → Actions → Test and deploy Chichi → Run workflow → ветка main → включить deploy.

В Settings → Secrets and variables → Actions нужны:
- Secret `CLOUDFLARE_API_TOKEN`: разрешения Account / Workers Scripts / Edit и Account / Workers AI / Read для нужного аккаунта.
- `CLOUDFLARE_ACCOUNT_ID`: secret либо repository variable.

Если ваши секреты имеют другие имена, измените ссылки в workflow. Для environment-scoped secrets используйте environment `production`; секреты репозитория также доступны. Организационные secrets должны разрешать доступ этому репозиторию.

Опубликованный Worker использует прямой AI binding: API-ключ нужен только GitHub Actions для деплоя, в браузер он не передаётся и в Worker не сохраняется. Адрес сайта появится в выводе шага Deploy. Перед открытием публичного доступа настройте защиту и бюджет Cloudflare Workers AI: API сайта пока не требует входа. Лимит локального Node-сервера не применяется к Worker.

## GitHub Pages
`pages.yml` публикует папку public при push в main. Адрес: https://arturmal2805-netizen.github.io/ai-cat-game/ . Если автоматическое включение Pages запрещено, в Settings → Pages выберите Source: GitHub Actions и повторите workflow.

В Settings → Secrets and variables → Actions → Variables добавьте `CHICHI_API_URL` — публичный HTTPS-адрес опубликованного Cloudflare Worker (не ключ). Затем повторите Publish Chichi to GitHub Pages. Cloudflare Worker нужно повторно опубликовать через Test and deploy Chichi с deploy=true, чтобы применить CORS для GitHub Pages. Без доступного backend сайт открывается в явно обозначенном деморежиме.

Если Pages использует Deploy from a branch → main → / (root), корневой index.html перенаправит посетителей в public/. Рекомендуемый вариант остаётся Source: GitHub Actions. Не выбирайте /docs: такой папки в проекте нет.

## Автоматическое подключение ИИ к Pages
Запустите Test and deploy Chichi вручную с deploy=true. После публикации Worker workflow определит workers.dev subdomain, выполнит реальный запрос решения и проверит CORS. Только после успешной проверки он публикует GitHub Pages с адресом AI backend. Дополнительная CHICHI_API_URL при таком запуске не нужна. Проверка выполняет до трёх небольших AI-запросов при сбоях. API-token должен также позволять чтение Workers subdomain; Workers Scripts Edit включает доступ к конфигурации Worker.
