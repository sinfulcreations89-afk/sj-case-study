# SJ Case Study — Session Handoff

Netflix **ECXD** job-application portfolio: a standalone HTML scroll-deck (Raven = the user).
Goal: pixel-match the user's Figma redesign; she tweaks final positions via in-page FreeHand.

## Where it lives / how to run
- Source: **`/Users/rachels/Desktop/sj_case_src/`** (was `~/Downloads/sj_case_src` — it has MOVED before; if `index.html` isn't there, search Desktop/Downloads).
- `index.html` + `assets/`. Direct edits, **no repack**.
- Served at **http://localhost:8755** via `python3 -m http.server 8755` (cwd must be the folder). Restart if the folder moved: `cd <folder> && python3 -m http.server 8755 &`. Verify: `lsof -tiTCP:8755 -sTCP:LISTEN` then `lsof -p <pid> | grep cwd`.
- Raven views in **Incognito** (clean localStorage). Tell her **hard-refresh (Cmd+Shift+R)** — a normal refresh won't clear FreeHand drag data.

## ⚠️ CRITICAL: only ONE interactions JS is loaded
- `index.html` loads **only `assets/app.js`** (cache-busted: `assets/app.js?v=N`). I removed the duplicate `<script src="assets/63bed2eb-…js">`. The old bundle loaded BOTH → two FreeHand toolbars + global-vs-section-scoped dragid conflicts + the self-heal wiped saved edits. **Do not re-add 63bed2eb.**
- **Cache-bust rule:** browsers hard-cache `app.js`. After ANY edit to `app.js`, **bump `?v=N`** in `index.html` or Raven keeps running the old copy (she'll report "no change"). Currently `?v=11`.

## Baked layout (Raven's locked FreeHand arrangement)
- `app.js` defines `const BAKED_LAYOUT = {…}` just before the `store` load, then `store = Object.assign({}, BAKED_LAYOUT, store)`. So a fresh viewer (empty localStorage) gets Raven's exact arrangement; her live localStorage edits still override per-id. This is how FreeHand gets "locked down" permanently — **she can still drag everything**, nothing is frozen.
- To re-bake after she arranges more: have her run `copy(localStorage['sj-casestudy-layout'])` in console, paste it, and replace the `BAKED_LAYOUT` object. **Exclude ALL `d02-*`** (constellation now lives in HTML — see dragid-drift warning in the Page-2 section) **and any `html` snapshot fields** (e.g. `d02-29` frozen wires, `d07-7` records HTML) — bake positions only.
- `app.js` is canonical: section-scoped dragids `d{data-label}-{index}`, grab logic, `drawCoverGraph` (constellation wires), paging, lightbox, rich-text.

## Pages (5; `data-label` → visual page #)
1. `01` Cover — "From Campaigns to Experiences"
2. `02` Audience Seat — "Built From the Audience Seat" + **constellation web**
3. `07` Pipeline — "One Connected Workflow" (FETCH/APPROVE/COMMIT + approvals + 3 records)
4. `06` Inside Out — "Designed From the Inside Out" + 4 cards + device mockups
5. `08` Next Steps — contact + button
- The old "What I Built" page (`04`) is **dropped** (`class="page-archived" style="display:none"`). Counters renumbered `/05`.

## FreeHand (in-page arrange mode)
- dragids are **section-scoped** `d{label}-{i}` (e.g. `d02-39`, `d07-10`).
- **Self-heal** inline `<script>` near end of `index.html` resets ONLY page 4 on load, keeps the rest:
  `for(var k in L){if(/^d.+-[0-9]+$/.test(k)&&!/^d06-/.test(k))c[k]=L[k];}`
  → pages **2 & 3 save** (d02/d07 kept), **page 4 locked** to designed layout (d06 reset), legacy non-hyphen ids (old `d50…`) stripped.
- Grouping **disabled** (`grab-unit` line commented) → every element grabs individually.
- `SKIP_CHROME` includes `.pipe-h` (page-3 steps not draggable). `SKIP_WRAP` includes `.linked-stack` (no longer `.lr-row`). **Page-3 records are now GROUPED:** `app.js` adds `grab-unit` to every `.lr-row`, so each record (thumbnail `.lr-sq` + caption `.lr-label`) moves as ONE unit and the three records (SERIES/STUDIO/TALENT) are independent — no big group. (Changed from the old "grab independently" model per Raven's request.) Their inner pieces no longer get their own dragids; the rows are `d07-9/11/13`.
- Constellation wrapper not a "big group": els loop skips `if (el.querySelector('.cover-graph, .cg-inpage')) return;`.

## Page 2 constellation — MATCHES THE FIGMA (fixed aspect-ratio + absolute %)
- **History:** old absolute-`%`+drag kept breaking (overlap, **dragid drift** — `d02-*` ids unstable, stale localStorage overriding). Briefly rebuilt as a strict CSS grid, then Raven asked to **match the Figma** exactly → current approach.
- **Current approach** (`<style id="cg-grid">` near end of `index.html`, card classes `gc-top/left/right/bl/br` in markup): `.cg-inpage` has a **fixed `aspect-ratio:835.7/746.64`** (the Figma frame 1:772) so the `%` layout is always proportional and **can't overlap or drift** at any width; cards are `position:absolute` at the **exact Figma %**. Verified centers = Figma (TOP 50 · LEFT 7.5 · RIGHT 92.5 · BL 22 · BR 81.5), ratio 1.119, overlaps=NONE, lines reach. The Figma is a **fanned diamond** (mid pair wide, bottom pair pulled inward) — NOT a strict grid. (Figma is symmetric except BR center 81.5 vs mirror-78 — a ~3.5% asymmetry baked into the Figma; matched faithfully.)
- Exact Figma %: gc-top `29.14%/-11.07%/w41.72%` · gc-left `-5.06%/32.93%/w25.12%` · gc-right `79.94%/32.93%/w25.12%` · gc-bl `5.94%/67.93%/w32.12%` · gc-br `62.94%/67.93%/w37.12%` · logo `.gcenter` `50%/45%` (centered between TALENT/LOOKMHEE; was Figma 45.8%, recentered per Raven). (Figma node `1:772`; positions in saved metadata `…/da3e4622-…/tool-results/toolu_01R2…json`.)
- All rules `!important` (beats inline/localStorage) + cards not draggable. `max-width:1320px` on `.cg-inpage`. To tweak: edit the `%` in `#cg-grid`, NOT dragids.
- **`.line-hub` REMOVED** → `drawCoverGraph` origin falls back to `.gcenter .orb` (lines radiate from the logo). Don't re-add a hub.
- **Immune to stale localStorage:** self-heal `<script>` strips `d02-*` & `d06-*` (`!/^d0[26]-/`). No `d02-*` in BAKED_LAYOUT.
- ⚠️ **Figma access:** Marketing Figma MCP is **rate-limited (Starter plan)** — `get_screenshot`/`get_metadata` fail immediately. Use the saved metadata JSON instead (fileKey `DQJkrnztNonXZcxkjFxohP`; the Figma is an html.to.design auto-import of an earlier page state, page-2 = node `1:720`, constellation = `1:772`). Open page layout = split (text left, constellation right), matching the Figma frame.
- `drawCoverGraph`: origin = `.gcenter .orb` (the logo; `.line-hub` removed); keep-out `cm = Math.max(40, oc.width/2+4)`. Line end is `nx + bx*(t-12)` — **`t-12` tucks the endpoint ~12px INSIDE the card** (hidden under it: cards z9 > wires z7). ⚠️ sign: `t-12` = inside, `t+12` = OUTSIDE (gap).
- **Bottom-line text clearance:** the two downward lines (to BL/BR — cards whose center `ny > textBottom`) have their START dropped to just below the `.gcenter` text block (`textBottom = .gcenter.bottom + 10`), so they never cross "SAPPHIC JUNKIE / CONTENT STUDIO / A single source of truth". Guard is `uy>0 && ny>textBottom` — WITHOUT the `ny>textBottom` part the near-horizontal side lines get clipped too and their start flings off-screen.
- **Each connector draws TWO `<line>`s:** the dashed line PLUS a short **solid tip** (last ~16px, `sx=x2-16*ux`) at the thumbnail. Needed because the dash pattern (`2 9`) can leave the last visible dash up to ~11px short — the solid tip guarantees the line visibly TOUCHES regardless of dash phase/viewport. (So `lines[c*2]`=dashed, `lines[c*2+1]`=solid tip per card.) Note the cards do have a ~3px `outline` + 16px radius, but that's not what caused the gap.
- Wires SVG: **`z-index:7`** (above hub `z6`), `pointer-events:none`, `overflow:visible`. Cards `z-index:9` (above wires). This fixed wires hiding behind the hub box / clipping at graph bounds.
- **Self-heal redraw:** `drawCoverGraph` runs on load + 500ms + 1500ms + resize + each cover-img load, AND via an `IntersectionObserver` on `.cg-inpage` (redraw every time the constellation scrolls into view). Added after Raven saw an intermittent "missing top line" — the build was correct (verified at her viewport: top line len 102, x1==x2 vertical), it was a transient draw; the observer makes any one-off glitch self-heal.
- Stats: 166/51/207/20k+/1. Questions: **Archivo Black weight 400**, list gap **16px**.

## Page 3 workflow
- Steps grid `grid-template-columns:17.2% 21.7% 19.6% 14.1% 27.4%` (exact Figma fractions). Arrows centered in gaps (≈28%, 62%); arrow2 nudged via `.pipe-h .pwire-h:nth-child(4){justify-content:flex-start;padding-left:1.35%}`. Down arrow `.pdown` `translateX(-50px)`.
- Approvals image vs records split `2fr 1fr`. Records: **no number badges**, captions **centered under** thumbnails, **−20%** (`.lt` 13.4px / `.ls` 9.8px), dotted `.lr-wire` connectors removed.
- Heading `margin-left:6px` (optical align to body). Body: `<br>` before "I designed", `margin-top:2px`.

## Page 4
- Heading **69px** (= page 5). Body **same size as all pages** (page-06 shrink removed). 3 paragraphs with **explicit `<br>`** matching Figma wrapping; `.lede max-width:70ch`, paragraph spacing 22px. Cards lightened ~8%.

## Page 5
- Single **"View Entertainment Work"** button → `https://rachelsiner.com` (`_blank`); hover lift+glow, active press.
- Contact: **Rachelsiner.com** (→ rachelsiner.com) **| LinkedIn** (→ https://www.linkedin.com/in/rachelsiner/). `.clink` hover = pink.

## Global
- **No em-dashes** anywhere (middot `·` for caption separators; colon/comma in prose).
- **Body copy `.lede` is white** (`#fff`, was `rgba(255,255,255,0.74)`) across the deck.
- Page-5 contact block scaled **+10%** (container `14.3px`, name `15.4px`).

## Verifying renders (USE THIS — measure, don't eyeball)
Headless Chrome + CDP (the only reliable way to check positions):
```
Chrome --headless=new --user-data-dir=/tmp/X --remote-debugging-port=9333 "--remote-allow-origins=*" --window-size=1920,1200 "http://localhost:8755/index.html"
```
- `--remote-allow-origins=*` is REQUIRED; quote it in zsh.
- python `websocket-client` is installed. Runtime.enable → `document.fonts.ready` + ~2.5s (font load shifts metrics) → `scrollIntoView` page index → measure `getBoundingClientRect` / `Page.captureScreenshot`.
- Page indices: **0 cover · 1 audience · 2 workflow · 3 insideout · 4 nextsteps**.

## Figma
- fileKey **`DQJkrnztNonXZcxkjFxohP`** (html.to.design import of the live page). Marketing Figma MCP, but **RATE-LIMITED (Starter plan)** — expect failures.
- Full coordinate metadata already saved: `~/.claude/projects/-Users-rachels-Documents-SJ-APP-SapphicJunkie-Content-Studio/<sessionId>/tool-results/toolu_01R2LvujQK3sekXxKi5C86z7.json` (get_metadata of node `0:1`).
- Section node ids: cover `1:658` · audience `1:720` · workflow `1:894` · inside-out `1:1001` · next-steps `1:1104`.

## Working with Raven
- She wants **pixel-exact** Figma matches and is (rightly) frustrated by guessing. **Measure with CDP**, state the numbers, then change.
- She drops files on Desktop / in the folder. macOS screenshot filenames contain a narrow no-break space ` ` before "AM/PM" → match with a glob, not a literal path.
- Confirm intent on ambiguous asks; surface trade-offs; don't reset her FreeHand edits.
