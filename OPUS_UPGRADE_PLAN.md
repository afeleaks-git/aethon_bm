# Pokémon Games — Visual Upgrade Plan (3D / three.js)

A plan to take the two existing games and add the "wow" web-graphics moments —
real-time 3D capture cinematics in Chess and a 3D street walk-up before buying in
Monopoly — while keeping the working game logic and the mobile-first feel intact.

## Decisions locked in (from kickoff)

| Decision | Choice | What it means |
|---|---|---|
| Art style | **2.5D animated sprites** | Keep today's flat PokeAPI sprites, but place them inside real 3D scenes as animated "billboards" with lighting, particles, and camera moves. No new 3D modelling, stays on-brand, cheap to run. |
| Ambition | **3D moments + animated boards** | Two signature 3D cutscenes, *plus* give the existing boards depth, smoother movement, and effects. Not a full ground-up 3D rebuild. |
| Devices | **Tablets + phones** | Mobile-first. Hard performance budget. Everything must degrade gracefully and never block the game. |
| Ages | **Mixed** | Adjustable difficulty + a "younger kid" mode (bigger targets, gentler battles, less text) alongside the existing tougher AI. |

## Guiding principles

1. **Never break the games that already work.** The chess engine, the Monopoly
   economy, the campaign, trading, jail, bankruptcy — all stay. 3D is layered on
   top of existing chokepoints, not woven through the logic.
2. **3D is always skippable and always optional.** Tap-to-skip on every cutscene,
   a global "Effects: Full / Lite / Off" setting, and an automatic fallback to the
   current 2D behavior if WebGL is slow or unavailable.
3. **Mobile budget first.** Target a smooth experience on a mid-range tablet:
   reuse one WebGL context, cap particles, keep scenes tiny, lazy-load three.js
   only when the first cutscene is about to play.
4. **Keep the single-file, no-build spirit.** These ship as static HTML you can
   double-click or host on GitHub Pages. We add three.js via CDN and keep the
   structure simple.

## Technical approach

### Shared "cutscene engine"

Both games get the same small reusable layer (a `<script>` block / shared module):

- **Loads three.js from a CDN on demand** (only when the first 3D moment is about
  to play, so menus and the board still load instantly).
- **One reusable WebGL renderer + scene canvas** drawn as a full-screen overlay
  above the board, so we never spin up multiple GL contexts.
- **Billboard sprites:** each Pokémon's existing PNG becomes a textured plane that
  always faces the camera, with a tiny idle bob, squash/stretch on impact, and a
  flash on hit. This is the "2.5D" trick that makes flat sprites feel alive in 3D.
- **A small particle/FX kit:** hit sparks, dust, type-colored energy bursts (the
  game already knows each piece's signature move name, e.g. *"Aura Sphere"*), screen
  shake, and camera dolly/zoom helpers.
- **Settings + fallback:** reads the Effects setting; if WebGL init fails or the
  device is flagged slow, it no-ops and the games behave exactly as they do today.

### Performance budget (tablet/phone)

- three.js loaded lazily and cached; ~1 reused renderer; scenes are a handful of
  planes + a ground + 1–2 lights.
- Particle counts capped and pooled; cap device pixel ratio (e.g. ≤2); cutscenes
  run 1.5–3s then tear down.
- "Lite" mode = sprite animation + particles in 2D (no WebGL) for the weakest
  devices; "Off" = today's behavior.

### Asset strategy

- Keep PokeAPI sprites, but **preload + cache** the sprites currently in play
  (the 6 pieces per side in Chess, the tokens + space Pokémon in Monopoly) so
  cutscenes never wait on a network fetch mid-animation.
- Optional later: bundle a local sprite folder so the games work fully offline
  (currently both require internet for art).

---

## Feature 1 — Chess: capture cinematics ("knight takes pawn")

**Where it hooks:** `index.html` → `executeMove()`. A capture is already detected
in one place — line ~630, `if(didCapture)announceMove(col,piece.piece)`. The
function also has `piece` (attacker) and `captured` (defender) in scope, so we
know exactly which two Pokémon are involved and the attacker's signature move.

**The moment:** on a capture, instead of just popping the *"Gengar used Shadow
Ball!"* text, we:

1. Briefly freeze the board and fade in the 3D overlay.
2. Stage the two creatures as billboard sprites on a small arena floor, themed by
   the attacker's region.
3. Attacker lunges → signature-move FX bursts in its type color → defender flashes,
   does a squash/faint, dissolves into particles → quick camera punch-in + light
   screen shake.
4. Fade out, return to the (already-updated) board.

**Details that make it sing, cheaply:**
- Pull the move name from the existing `REGIONS[...].pieces[role].move` data so the
  energy color/shape matches (Thunderbolt = yellow bolts, Shadow Ball = purple orb,
  Hydro Pump = blue jet, etc.).
- Special-case the marquee ones: **checkmate** = a bigger finisher cam; **promotion**
  = an "evolution" shimmer when the pawn becomes a queen; the **Mew final boss** gets
  a unique cutscene.
- AI captures play the same cutscene (so the kid watching the AI take a piece still
  gets the show), with a slightly faster timing.

**Younger-kid mode:** gentler "faint" (poké-ball recall puff instead of dissolve),
shorter, auto-advances; older mode keeps the punchier version.

## Feature 2 — Monopoly: 3D street walk-up before buying

**Where it hooks:** `monopoly.html` → `showLandingCard(pi, spaceIdx, callback)`
(line ~955) and `buyProperty()` (line ~1193). The 2D "landing card" already shows
the property, owner, buildings, and neighbors — so the *idea* of "preview before
you buy" exists; we upgrade the experience for purchasable spaces.

**The moment:** when a player lands on an **unowned property** they can afford:

1. A short 3D "arrive at the street" shot — camera glides down a little themed
   street toward the property sign, color-group-themed (brown = Route 1 dirt path,
   light-blue = caves, dark-blue = Elite Four HQ, etc.).
2. The town's Pokémon (the existing `SPACE_POKEMON` mapping) appears as a 2.5D
   billboard "greeting" you at the property.
3. The price, rent ladder, and **Buy / Pass** buttons slide in as you "arrive,"
   wired to the existing `buyProperty()` logic — nothing about the economy changes.
4. As you build gyms/stadiums later, the street shows them growing (gym huts →
   stadium) on subsequent visits.

**Scope control:** we don't model 40 unique streets. We build **one parametric
street scene** themed by the 8 color groups + special variants for
railroads/utilities, reused for every space. Railroads = a Pokémon Center platform
fly-by; utilities = the lab/Silph Co. exterior.

**Younger-kid mode:** shorter glide, auto-arrives, big Buy button; older mode shows
the rent ladder and lets them linger.

---

## Animated boards (the "+ animated boards" half)

Lighter-touch upgrades to the boards themselves, shared FX kit:

- **Chess:** tokens glide between squares (instead of snapping), legal-move dots
  pulse, selected piece lifts with a soft shadow, check makes the king's square
  pulse red, subtle board tilt/parallax. Pure CSS/transform where possible to stay
  cheap; WebGL only for the cutscenes.
- **Monopoly:** the token "hops" space-to-space along the track, dice get a real
  3D tumble (or a nice CSS 3D roll in Lite mode), money changes float up, building
  a gym plays a little construction pop, passing GO sparkles.

## Mixed-ages / adjustable difficulty

- A **mode toggle** on the start screens: "Little Kids" vs "Big Kids" (plus the
  existing campaign difficulty for chess).
- Little Kids: bigger tap targets, gentler/shorter cutscenes, less on-screen text,
  optional move hints in chess, simpler Monopoly money prompts.
- Big Kids: current AI depth, full rent ladders, punchier battles.

---

## Build order (phased, each phase independently shippable)

**Phase 0 — Foundations (shared)**
- Add the lazy-loaded three.js overlay + reused renderer + billboard helper +
  particle kit + Effects setting + WebGL fallback. Validate on a real tablet/phone.

**Phase 1 — Chess capture cinematic (the headline "pawn taken by a knight")**
- Hook `executeMove`, build the arena scene, wire move-name → FX color, add
  tap-to-skip. This is the single biggest wow-per-effort win; do it first.

**Phase 2 — Monopoly street walk-up**
- Hook `showLandingCard`/`buyProperty`, build the one parametric themed street,
  wire Buy/Pass.

**Phase 3 — Animated boards + dice/token motion** for both games.

**Phase 4 — Mixed-ages modes + difficulty toggles + polish** (checkmate finisher,
promotion "evolution," Mew boss cutscene, gym/stadium street growth).

**Phase 5 — Optional: offline asset bundle** so the games run with no internet.

## Risks & things to watch

- **Mobile performance** is the #1 risk — mitigated by lazy load, one context,
  tiny scenes, caps, and Lite/Off fallbacks. We test on-device early (Phase 0).
- **Sprite licensing / art:** we're reusing PokeAPI sprites exactly as the games do
  today (personal/family use). The 3D look is stylized 2.5D, no new IP assets.
- **Single-file growth:** these files are already large; if they get unwieldy we
  can split the cutscene engine into a shared `fx.js` (still no build step).
- **Network dependence:** cutscenes shouldn't stall on sprite fetches — handled by
  preloading the in-play sprites; full offline is Phase 5.

## Rough effort

- Phase 0: foundations — medium.
- Phase 1 (chess cinematic): medium — biggest visible payoff.
- Phase 2 (street walk-up): medium.
- Phase 3 (animated boards): small–medium.
- Phase 4 (modes + polish): medium.
- Phase 5 (offline): small, optional.

Phases 0–1 alone deliver the "knight takes pawn" cutscene you described and prove
the whole approach on-device before investing further.

## Open questions for you

1. **Start with Chess or Monopoly?** Recommendation: Chess first — the capture
   cinematic is the strongest demo and validates the shared engine.
2. **How long should a cutscene run** before auto-continuing (e.g. 1.5s snappy vs
   3s cinematic)? Affects pacing for younger kids.
3. **Offline matters?** Should these work on a plane / with no wifi (Phase 5), or
   is internet always available?
4. **Sound** — do you want battle SFX / little music stings, or keep it silent?
5. **Where do the kids play it** — a hosted link (GitHub Pages) you can open from
   any device, or files on a specific device? Affects how we ship/test.

---

# Progress log

- ✅ **Chess capture cinematics** (three.js 2.5D, `index.html`).
- ✅ **GameKit** shared design system + motion (`gamekit.css`, `gamekit.js`):
  font, buttons, screen transitions, haptics, confetti, toasts, count-up.
- ✅ **Monopoly street walk-up** before buying (three.js, `monopoly.html`).
- ✅ **PWA**: installable + offline (`manifest.webmanifest`, `sw.js`, `icon.svg`).
- ✅ **Cutscene robustness**: render-immediately + three.js load fallback (no black screens).
- ✅ **Game-feel juice**: chess piece glide (FLIP), Monopoly floating money
  changes + event toasts (`GK.flyText`, `GK.toast`).
- ✅ **Unified arcade hub**: `index.html` is now the front-door launcher
  (profile, progress badges, both game cards); chess moved to `chess.html`.
- ⏳ Next: Monopoly token-hop movement, accessibility/age modes, shared profile
  editor on the hub. Sound deferred by request.
- ⚠️ All visuals pending on-device verification (no browser/GPU in build env).

---

# Part 2 — Making the *whole thing* modern & cool

The two cutscenes are "wow moments." This part is about the other 95% of the time —
making every screen, tap, and transition feel like a polished modern app instead of
a web page. The two games currently duplicate their own buttons, colors, and
animations inline, so polish added to one doesn't reach the other.

## The core idea: one shared foundation ("GameKit")

Extract the common stuff out of both single-file games into **one small shared
layer both games plug into** — still no heavy build step (a single `gamekit.js` +
`gamekit.css`, or ES modules). The capture-FX engine already written for Chess is
the first piece of this. Once GameKit exists, every improvement below lands in
**both** games at once instead of being re-done twice.

GameKit contains:
- **Design tokens + components** (colors, type, buttons, cards, modals, toasts).
- **The FX/cutscene engine** (the three.js overlay, billboards, particles).
- **An audio engine** (SFX + music, one mute control).
- **A motion kit** (screen transitions, spring/easing helpers, confetti, haptics).
- **A settings + save store** (effects level, sound, age mode, progress).

## Seven modernization tracks

**1. Design system & UI refresh — "looks modern"**
Replace ad-hoc inline styles with a cohesive Pokémon-themed design system: a real
web font, consistent rounded "glass" cards, gradient/dark theme, a proper button
component with press states, a unified header/HUD, nicer modals and toasts instead
of plain text. Biggest perceived-quality jump per hour.

**2. Motion & game feel — "feels alive"**
Animate the things that currently snap: screen-to-screen transitions, chess pieces
gliding between squares, Monopoly token hopping along the track, dice with a real
tumble, money counters that tick up, win confetti, button micro-bounces, and
**haptic feedback** (`navigator.vibrate`) on key actions. This is "juice" — cheap,
and it's most of what makes apps feel premium.

**3. 3D / WebGL moments & backgrounds — "wow"**
The capture cinematic + street walk-up, plus lighter touches: a subtle animated
shader/particle background behind menus, parallax on the boards, an optional 3D
board view. All gated behind the Effects setting for weak devices.

**4. Sound design — "alive, the part kids love most"**
A Web Audio engine: move/capture/buy/win SFX, gentle region-themed background
music, a single mute toggle. Often the single biggest "this feels like a real
game" upgrade for kids — and currently entirely absent.

**5. App-like delivery (PWA) — "it's a real app"**
Make it **installable to the tablet home screen** with an icon and splash screen,
runs full-screen with no browser chrome, and **works offline** via a service worker
that caches the games + the in-use sprites. This is what turns "a link" into "an
app the kids open." Pairs with the Phase 5 offline asset bundle.

**6. A unified hub + onboarding — "one polished place"**
A single modern home screen / arcade that launches either game, with an animated
hero, the kid's avatar/profile, and progress. Add a short, skippable tutorial and a
save system (profiles, campaign progress, achievements/badges).

**7. Accessibility & mixed-ages polish — "works for every kid"**
Bigger touch targets, readable contrast, colorblind-safe property colors,
`prefers-reduced-motion` support (auto-calms animations), and the Little Kids / Big
Kids modes wired through GameKit so both games respect them.

## Suggested order (folds in the Part 1 phases)

1. **Chess capture cinematic** *(done — proves the FX engine).*
2. **Extract GameKit** from that work (design tokens + FX + settings store) so the
   rest is build-once-use-twice.
3. **Design-system refresh + motion kit** across both games — the broad "modern"
   facelift (Tracks 1–2). Highest perceived payoff.
4. **Sound engine** (Track 4) — big kid-delight per effort.
5. **Monopoly street walk-up** (Part 1, Phase 2) on the shared engine.
6. **PWA / installable / offline** (Track 5).
7. **Unified hub + onboarding + saves** (Track 6).
8. **Animated boards, accessibility, age modes, extra cutscenes** — ongoing polish.

## Honest trade-offs

- **Refactor cost:** extracting GameKit is upfront work that doesn't add a visible
  feature, but it stops us building everything twice. Recommended early, right after
  the chess cinematic proves the approach.
- **Scope discipline:** all seven tracks is a lot. Tracks **1, 2, and 4**
  (design system, motion, sound) deliver the biggest "whole thing feels modern and
  cool" jump for the least risk — they touch every screen and don't depend on 3D.
- **Mobile budget** still rules everything: every track ships with an Effects/Sound
  off-switch and a graceful fallback.

## What I'd build first for "modern & cool" (recommendation)

If the goal is the whole experience feeling modern fast: do **Track 1 (design
system) + Track 2 (motion) + Track 4 (sound)** next, as the GameKit foundation.
That's the facelift that hits every screen of both games. The 3D cutscenes then sit
on top as the showpieces. The PWA/install step is the final touch that makes it
feel like a real app on the kids' tablets.
