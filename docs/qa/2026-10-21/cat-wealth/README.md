# Personal-wallet top three

The existing “Життя та монетки котиків” dialog now shows the three richest
current cats above the profile selector and family/inventory sections. Gold,
silver and bronze cards reuse the approved offline portraits. Clicking a card
selects that existing profile. Rank uses available personal cat coins, then
lifetime earnings and a stable ID tie-breaker; player money and property value
are not included.

The display is read-only. It shares the existing dialog refresh, only replaces
podium cards when the top three IDs, names or balances change, and performs no
AI requests, save writes, new timers or 3D portrait renders.

## Browser verification

Private local fixture with the production UI component and stylesheet, at DPR 2.
WebKit and Chromium each passed desktop 1280×900, phone 390×844 and narrow
320×780 layouts. This is a browser/layout check, not a physical-device FPS claim.
The fixture uses 12,340, 8,750 and 6,300 personal coins for its initial leaders;
player money is 999,999 and is excluded.

- All three images load, cards stay within the dialog, and long names and
  10,000,000-coin balances do not introduce horizontal overflow.
- A leader card opens the matching existing profile, including its family,
  inventory and history sections.
- Spending and earning reorder the podium; an unchanged refresh reuses cards.
- Partial rosters, a world without Job City, and returning to an initialized
  city display correctly.
- Twenty save/load normalizations preserve the ranking and all three balances.
- Six browser cases: zero page errors, zero API requests and zero canvas nodes
  in the isolated dialog. Rendering the dialog leaves its game fixture unchanged.

See `browser-results.json` and the desktop/phone screenshots. The wider family,
housing and personal-wallet tests also pass; no existing save fields are changed.

## Release checks

- Full suite: 669/669 pass.
- Focused wallet/family/housing/ranking checks: 55/55 pass.
- `npm run build` and `wrangler deploy --dry-run`: pass.
