# Lossless AI input packing — 2026-11-18

Only server prompt encoding changes; stable3914873 map/assets/saves unchanged.
Shared string dictionary for repeated personalities, wishes and visited venues;
only explicitly string-valued columns encode integer references. Unique strings
stay literal; payload stays original when encoding does not save bytes. System
prompts explain mixed literal/index columns. Original input state is immutable.
Every147 cat/place/skill/balance/need/partner survives exact decode. Output schemas,
validators, max_tokens, frequency, queue and provider invocation count unchanged.
This is NOT reducing autonomous cat decisions or adding a paid repair call.

Node22.23.5build PASS,23targeted event/encoding tests PASS,147-roster guard PASS.
Existing tests now decode dictionary references before checking exact original
personality; initial input keys additionally contain text. No guard was relaxed.
CI/live pending at this commit. No real paid inference used.

Stable roster measurement: full-plan19281→15620characters(-18.99%), initial careers
5734→4090(-28.67%), stress evening+147buyers+families30661→21175(-30.94%). UTF8 byte
counts and unchanged output budgets in measurements.json. These are serialized
user-input measurements, not measured tokens, API billing or speed promises.
20k is a legacy full-plan internal character guard, not Cloudflare request count.
Current scheduled career/evening formats have separate prompt/output budgets.

SPA WIP is NOT included. Its14 future services were measured separately on
codex/underwater-spa-resort; don't claim they are live from this release.
