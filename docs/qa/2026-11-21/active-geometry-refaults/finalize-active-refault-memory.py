from pathlib import Path
import json,shutil,subprocess,datetime,zoneinfo
repo=Path('/workspace/chichi-shared-water');m=repo/'docs/project-memory';q=repo/'docs/qa/2026-11-21/active-geometry-refaults';w=Path('/workspace/qa')
source='b67979f1880cc32985265e963ad70122a84ac683';main='15cb5b4c20dd8acaf3a80818d9c1fb0ea0ce7992'
live=json.loads((w/'active-refault-live/live-verification.json').read_text());assert live['release']==main and live['candidate']==source and len(live['applicationScripts'])==1
rows=json.loads((w/'active-refault-all-map-final/native-map-frames.json').read_text());assert len(rows)==21 and len({x['id'] for x in rows})==19
assert all(x['frames']>=3 and x['dpr']==2 and not x['contextLost'] and x['orbitRange']>.08 and x['zoomRange']>6 for x in rows)
phone=json.loads((w/'active-refault-phone/warehouse-open-water-movement.json').read_text());assert len(phone['rows'])==8 and len(phone['restores'])==2
for folder in ['active-refault-all-map-final','active-refault-phone']:
 errors_path=w/folder/('v12-views.json' if folder=='active-refault-phone' else 'browser-errors.json')
 e=json.loads(errors_path.read_text());assert not e['errors'] and not e['httpErrors']
for folder,role in [('active-refault-all-map-final','all-map-final'),('active-refault-phone','phone-final')]:
 subprocess.run(['python',str(w/'archive-active-refaults.py'),str(w/folder),role,source,'final-native-DPR2-pass'],check=True)
shutil.copytree(w/'active-refault-live',q/'live',dirs_exist_ok=True)
for n in ['active-refault-all-map-final.log','active-refault-phone.log','active-refault-native-finish.log','active-refault-main-ci-watch.log','active-refault-publication.log','active-refault-live-verifier.log','check-scene-fairness-map.cjs','check-native-map-fairness-ready.mjs','native-readonly-hardlinks.cjs','finish-active-refault-native.py','watch-active-refault-release.py','verify-active-refault-live.py','finalize-active-refault-memory.py']:
 p=w/n
 if p.exists():shutil.copy2(p,q/n)
old=(m/'CURRENT.md').read_text();hist=m/'history/CURRENT-before-active-geometry-publication-2026-11-21.md'
if not hist.exists():hist.write_text(old)
protected=old.split('## Защищённые предыдущие изменения')[1].split('\nPR#14MERGED')[0]
t=datetime.datetime.fromisoformat(live['verifiedAt']).astimezone(zoneinfo.ZoneInfo('Europe/Kyiv')).strftime('%Y-%m-%d %H:%M')
expected=json.loads((w/'active-refault-expected-production.json').read_text())
current=f'''# Текущий статус

21 ноября 2026, Europe/Kyiv. Каноническая память: `codex/ocean-recovery-memory`.
Приложение этой ветки памяти старое; актуальный код — main и source ниже.
[Предыдущий CURRENT со всеми checkpoint](history/CURRENT-before-active-geometry-publication-2026-11-21.md).

## Опубликовано и проверено

Main **{main}**, source **{source}**,
branch `codex/active-geometry-refaults`, worktree `/workspace/chichi-v12-island-warehouse`.
[PR #14](https://github.com/arturmal2805-netizen/ai-cat-game/pull/14) merged normally,
без admin/bypass. Exact source/main tree `a2edf381fc9e4f958ef21a0c3bc2387e94ba05c9`.
[Игра](https://arturmal2805-netizen.github.io/ai-cat-game/?v=15cb5b4) ·
[FPS](https://arturmal2805-netizen.github.io/ai-cat-game/?v=15cb5b4&profile=1).
[Workflow 44914901033](https://github.com/arturmal2805-netizen/ai-cat-game/actions/runs/44914901033):
test/build/deploy/pages SUCCESS; точный Worker release/shared-save checks PASS.
Paid AI routine deploy не вызывает. PR duplicate 44914690669 отменён после merge;
отдельный external Workers Builds не подменяет результат этого official workflow.
Actual HTTP **{t} Europe/Kyiv**: HTML/JS/CSS/coast/reef/SPA/wind совпали с expected
bytes, **одно подключение приложения** и корректные versioned JS/CSS URL.
[Receipt](../qa/2026-11-21/active-geometry-refaults/live/live-verification.json).

- JS SHA256: `{expected['dist/app.js']['sha256']}`.
- CSS SHA256: `{expected['style.css']['sha256']}`.
- HTML SHA256: `{expected['index.html']['sha256']}`.
- App URL: `./dist/app.js?v={expected['dist/app.js']['sha256'][:16]}`.
- CSS URL: `./style.css?v={expected['style.css']['sha256'][:16]}`.
- Coast/reef/SPA/wind полные хеши в receipt; art/model bytes не менялись.

## Исправление повторных GPU uploads

Fixed pressure target 192+64 MiB был недостижим, когда уже используемые и
защищённые общими attributes буферы сами занимали больше. Контроллер преждевременно
выбрасывал возвращающиеся в камеру буферы даже внутри learned grace.
Теперь pressure floor = max(192 MiB, unique bytes уже non-retireable shared-owner
components) плюс ПРЕЖНИЙ bounded idle allowance <=64 MiB и <=budget/3.
Это учёт уже защищённой памяти, без нового owning model cache/повышения констант.
Cold-first reclaim, 250ms/3 absent frames, learned 2s, cat time grace 10s,
2ms retirement budget и совместная безопасность owners прежние. Floor bookkeeping
вне 2ms sweep timer, как существующие candidate filter/sort. Abandoned data
освобождаются. Вода/DPR/тени/материалы/геометрия/позы/котики/AI/сохранения прежние.
Sculpt cache version: `sculpt-v2-a496203fa13a037a7a10a927` неизменна.

## Доказательства и ограничения

36 focused tests PASS; два новых regression cases FAIL на опубликованной старой
policy и PASS на новой. Full Node22 build PASS до финального перемещения bookkeeping;
после него runtime/Worker rebuilt и 36 tests повторно PASS. Official main CI
собрал и проверил exact final source. Не выдумывать общее число CI tests из blocked raw logs.

Native full Mall+SPA/lagoon camera cycle: refault bytes **1,450,375,695 → 1,368,164,071**,
**82,211,624 bytes / около 5.7% меньше**, tracked peak ровно **616,583,450** в обоих.
Это submission-only resource trace: raster suppressed только в QA, virtual30Hz,
нативные culling/shader dispatch/uploads сохранены; НЕ FPS или pixel benchmark.
Events capped5000 с разным coverage, raw held-event counts между ролями не сравнивать.
Cold returns остаются при bounded cache. Separate actual isolated64x64 realGL:
exact pixels, same8400B peak, late uploads11760→0B, rapid returns16→2,
abandonment reclaim2520B=originalbudget; actual game DPR2 прежний.
Actual fullwide GPU retirement/return: **0 changed pixels**, 19,206,975tri/3688calls,
GPU611,233,198→3,037,076→611,233,198 bytes; cats81/atlas slots2191 сохранены,
GLerror0/contextnotlost/DPR2. Не выдавать маленький isolated proof за full-game FPS.

Final native **19 islands+2 returns**, full RAF/DPR2/real mouse orbit/zoom PASS.
Phone390×844/coarse/DPR2/product overview/full Warehouse bbox: **8 held-touch
crossings, deep dive below-200m, 2 private SQLite reloads PASS**; balances,
inventory/placements/personal wallets сохранены. JS/HTTP/GL errors отсутствуют.
Все453 public modules каждого capture совпали с exact source. QA only private
Worker/SQLite, один GPU job за раз. SoftwareGPU correctness не physicalM2/iPhone FPS.
All-map QA global readiness600s — ранее обоснованный explicit helper только для
software background warmup, не изменение продукта/графики/asserts и не ускорение.
[Raw reports, hashes, source archives, runners, PNG and results](../qa/2026-11-21/active-geometry-refaults/README.md).

## Последний физический M2 report и следующий шаг

Baseline 1e0ea4762167e0572c9c53121b975c6cd1ebbd70/app1a198981:
54.167s session; worst framegap533.334ms/rolling432.6ms — прежняя8.9s пауза не
повторилась в этом сеансе. Eventloop max1523.4ms, то есть все задержки не исчезли.
FPS24.85 за12.033s, current19.38Mtri/3908calls/GPU24.32median/p9537.32ms,
CPU render14.6median/p9540.9/max417.8ms, geometry608.9MB/JS2.126GB;
1264refaults/508.8MB и588rapid/174.4MB. Это не контролируемый FPS рост относительно
старого1.147Mtri/496calls report. User«красава осталось довести до идеала» —
положительный отзыв о предыдущем результате, не visual approval Crimson Desert.
Новый cache fix опубликован; следующий шаг — свежий M2 report той же камеры/
loading/transition с новым app hashfec56d9990ec8549. Не обещать60FPS/«идеал»/полное
исчезновение пауз. Не расширять scope/снижать качество без новых измерений.
Диагностика opt-in, one-shot, закрываемая; обычная игра не открывает её сама.
Предыдущий release1e0 сохранил Window MessageChannel FIFO раньше scheduler.yield;
это устранение boosted continuation starvation не откатывать.

## Защищённые предыдущие изменения
{protected}
'''
(m/'CURRENT.md').write_text(current)
(m/'ROADMAP.md').write_text(f'''# Очередь

21 ноября2026: опубликован main **{main}**, source **{source}**, PR#14.
Workflow44914901033 test/deploy/pages SUCCESS, actual HTTP bytes/одноapp verified.
36focusedchecks/fullmainbuild/native19+2/phone8touch/deepdive/2SQLite reload PASS.
Контрольный resource cycle:82,211,624B меньше refault uploads при том же пике;
realGL/fullwide pixels и котики сохранены. Полные условия/границы — CURRENT/QA.

Следующее: свежий M2report той же камеры/перехода наappfec56d9990ec8549.
8.9sпауза не повторилась в baseline54s, но GPU24ms и меньшие задержки остаются.
Не обещать60FPS/идеал/visualapproval. Не снижать DPR/графику/воду/тени/котиков.
BroadSPAexcavation parked, редизайнТРЦ исключён, Warehouseinterior не запрошен.
''')
readme=q/'README.md'
if not(q/'README-before-publication.md').exists():shutil.copy2(readme,q/'README-before-publication.md')
readme.write_text(f'''# Active working set cache — published, 2026-11-21

Main **{main}**, source **{source}**, PR#14 normal merge.
Official workflow44914901033 test/deploy/pages SUCCESS; live HTTP verified
{t} Europe/Kyiv: exact HTML/JS/CSS/resource hashes, exactly one application script.
See `live/`, expected production JSON and CURRENT for full SHA/hashes/links.
Prior checkpoints retained in README-before-publication.md.

User baseline app1a198981:54.167s session, worst framegap533ms (8.9s did not recur),
eventloopmax1523.4ms,24.85FPS at19.38Mtri/3908calls/GPU24.32ms. Rawreport/provenance
preserved; differing camera counters prevent a controlled FPS multiplier claim.

36focused regressions PASS, including2 that fail old published cache policy;
full Node22/main CI builds verified. Runtime only alters pressure accounting of
already pinned shared-owner components, keeping192MiB budget,<=64MiB idle allowance,
all grace/cold reclaim/shared ownership/2ms retirement unchanged. No art/data/DPR cuts.

Resource trace baseline/candidate:1,450,375,695→1,368,164,071 refault bytes,
82,211,624 fewer (~5.7%), exact616,583,450B peak both. Virtual30Hz submission-only,
QA raster suppression; NOT FPS or pixels. Capped5000 event subsets not comparable.
Separate isolated realGL actual draw/readPixels:0changed/same8400B peak,
lateuploads11760→0/rapid16→2/eventual2520B reclaim. Fullwide actual GPUreturn:
0changed,19,206,975tri/3688calls,611233198→3037076→611233198B,cats81/slots2191
preserved/noGLerror/contextloss/DPR2. Raw JSON and exact source archives retained.

Final full native19islands+2returns/DPR2/fullRAF/realmouse orbitzoom PASS.
Phone390×844/coarse/DPR2/overview/Warehouse bbox/8heldtouch crossings/deepdive/
2privateSQLite reloads PASS. Balances/inventory/placements/personalwallets retained.
JS/HTTP/GL errors absent;453publicmodules each capture exactsource. One GPUjob
at a time, privateWorker/SQLite only. Exact QA wrappers/600s all-map global readiness
helper retained; no product timeout/quality/assert change. Software correctness
and resource savings are not physicalM2/iPhone FPS or artistic approval.
Next fresh physical report must match appfec56d9990ec8549 before claiming gains.
''')
(m/'decisions.md').open('a').write(f'''\n## 2026-11-21 — учитывать уже защищённый GPU working set\n\nMain{main}/source{source},PR#14normalmerge,workflow44914901033/actualHTTPPASS.\nНовый пользовательский M2report показал отсутствие прежней8.9sпаузы в54s, но\n508.8MBrefaults/12s. Pressure accounting теперь использует unique shared-owner\nnonretireable floor плюс тот же <=64MiBidlecache; cold reclaim/grace/2msbudget\nпрежние. Controlled cycle82,211,624B fewer uploads, same616,583,450Bpeak; exact\nGL/fullwidepixels/native19+2/phone2reloads/dataPASS. PhysicalnewFPSещёнеизмерен.\n[QA](../qa/2026-11-21/active-geometry-refaults/README.md).\n''')
standard='''\n## 2026-11-21 — pinned floor и bounded returning-camera cache\n\nПри active/shared-owner working set выше soft192MiB fixed192+64MiBtarget\nнедостижим. Учитывать unique BufferAttribute bytes всего nonretireable owner\ncomponent: pressure target=max(softbudget,pinnedfloor)+ПРЕЖНИЙ idle allowance\n<=64MiB и <=budget/3. Это не повышениеконстант/новый owning cache. Cold-first pass\nпо-прежнему стремится к originalbudget, abandoned data reclaim сохраняется,\n250ms/3frames/learned2s/cat10s и общий2msretirementtimer прежние. Floor/sort/filter\nbookkeeping вне cleanup timer; allsharedowners safe и currentdrawing wins.\nНужны old-policy failing regression, actualuploadbytes/sameintrinsicpeak, exact\nGPU pixels/retire-return/livecat slots, all19+returns и phone2reloads. Resource\nproof не hardwareFPS; capped event subset counts нельзя сравнивать междуролями.\nСм. [измеренный релиз и rawQA](../../qa/2026-11-21/active-geometry-refaults/README.md).\n'''
(m/'standards/render-preparation.md').open('a').write(standard)
p=m/'standards/project-rules.md';s=p.read_text();s=s.replace('rendering still wins and the existing sweep cadence is not a hard memory cap.','rendering still wins and the existing sweep cadence is not a hard memory cap.\nWhen the already non-retireable/shared-owner working set exceeds the soft budget,\naccount for its unique attribute bytes before adding that SAME bounded idle-cache\nallowance: max(soft budget, pinned floor) + allowance. Cold reclaim still aims at\nthe original budget; do not enlarge constants or keep a second owning model cache.');p.write_text(s)
print('Final memory prepared',main,t)
