# Active working set cache — published, 2026-11-21

Main **15cb5b4c20dd8acaf3a80818d9c1fb0ea0ce7992**, source **b67979f1880cc32985265e963ad70122a84ac683**, PR#14 normal merge.
Official workflow44914901033 test/deploy/pages SUCCESS; live HTTP verified
2026-11-21 16:52 Europe/Kyiv: exact HTML/JS/CSS/resource hashes, exactly one application script.
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
