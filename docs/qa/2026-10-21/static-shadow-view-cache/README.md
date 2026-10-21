# Rejected shadow-view cache experiment

All 20 actual WebKit island colour/shadow comparisons are byte-identical at DPR 2. The component saves CPU culling work, but the native RAF/GPU queue gesture check does not establish a consistent frame-rate gain. Job City is slower in both enabled repeats; capybara also trends slower. The candidate is NOT released or adopted as a template. Preserve the independent live construction-cache fixes. Software Mesa timings are not MacBook FPS.

| Island | Native FPS off | Native FPS on |
| --- | --- | --- |
| moon | 2.349 | 2.275 |
| autumn | 1.097 | 1.088 |
| winter | 1.387 | 1.373 |
| water | 1.212 | 1.368 |
| summer | 0.875, 0.742 | 0.811, 0.704 |
| sakura | 0.735 | 0.798 |
| clouds | 3.137 | 3.481 |
| stars | 2.453 | 2.322 |
| volcano | 1.130 | 1.076 |
| candy | 2.780 | 2.674 |
| galaxy | 1.857 | 1.761 |
| coral | 2.048 | 1.994 |
| ice | 1.586 | 1.649 |
| clockwork | 1.248 | 1.295 |
| foodcourt | 1.427 | 1.658 |
| bikini | 1.393 | 1.600 |
| homestead | 1.141, 1.189 | 1.413, 1.245 |
| aquarium | 0.922, 1.000 | 0.944, 1.025 |
| jobcity | 1.041, 1.055 | 1.001, 0.818 |
| cat-homes | 1.667 | 1.362 |
