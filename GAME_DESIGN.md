# Homestead Headaches - Game Design Document

## Core Concept
Nebraska farm arcade game. Catch falling farm animals, stack them on your head, bank them for points.

## Theme
- **Setting**: Nebraska farmland
- **Story**: Tornado threatens homestead (shown in splash VIDEO, not gameplay)
- **Tone**: Chaotic, fun arcade action

## Core Mechanics

### Catching
- Animals fall from sky
- Move farmer left/right to catch
- Stack on head

### Wobble Physics
- Stacked animals wobble
- Off-center catches = more wobble
- Too much wobble = animals fall

### Banking
- Stack 5+ to unlock Barn button
- Save animals for points
- Risk/reward: tall stacks = more points but unstable

### Weather (v1.1.0)
- WeatherSystem state machine: clear -> windy -> rainy -> stormy
- Activates at level 6+
- Wind forces affect falling entities
- Rain/wind particle effects via BabylonJS
- Wobble bonus during storms
- Ambient audio loops with fade transitions

### Combo System (v1.1.0)
- Combo counter with tiered animations (anime.js)
- Milestones at 5x, 10x, 15x with camera FOV pulse
- ComboDecayTime: 3500ms

## Tech Stack
- React 19 + TypeScript + Vite
- Babylon.js (3D)
- Miniplex (ECS)
- Capacitor (mobile) / Electron (desktop)

## Key Files
- `src/game/engine/GameLogic.ts` - Game loop, core logic, entity lifecycle cleanup
- `src/game/ai/DropController.ts` - AI director with Yahtzee-aware type distribution
- `src/game/ai/WobbleGovernor.ts` - Wobble difficulty scaling
- `src/game/config.ts` - All game constants, ANIMAL_TYPES with modelScale/weight
- `src/features/gameplay/scene/GameScene.tsx` - 3D scene renderer
- `src/features/gameplay/scene/components/DropIndicatorTornado.tsx` - Procedural twisted funnel tornado
- `src/features/gameplay/scene/components/EntityRenderer.tsx` - 3D model + physics sync
- `src/features/gameplay/scene/components/FarmerTrack.tsx` - Visible farmer movement track
- `src/features/core/GameScreen3D.tsx` - Gameplay screen with physics loading
- `src/game/debug/DevAPI.ts` - Dev-only runtime API (state, spawning, auto-play)
- `src/game/debug/PlayerGovernor.ts` - Yuka-powered AI auto-player (dev-only)
- `src/game/weather/WeatherSystem.ts` - Weather state machine and wind forces
- `src/game/variants/AnimalVariants.ts` - Rare/golden/shadow variant definitions with PBR tinting
- `src/game/analytics/SessionLog.ts` - Session recording to Capacitor storage
- `src/game/analytics/CanvasChart.ts` - Pure canvas chart renderer (line/bar/heatmap)
- `src/game/analytics/StatsModal.tsx` - Stats modal with 4 tabs (Overview/History/Charts/HeatMap)
- `src/game/effects/HitStop.ts` - Freeze-frame effect on perfect catches
- `src/game/effects/ComboCounter.tsx` - Tiered combo animations via anime.js
- `src/game/effects/LevelUpFlash.tsx` - White flash overlay on level transitions
- `src/game/accessibility/ColorblindFilter.ts` - Machado 2009 post-processing matrices
- `src/game/accessibility/KeyBindings.ts` - Remappable keybinding persistence

### Assets
- `public/assets/models/` - Animal and Farmer GLBs (cow, pig, chicken, duck, sheep, farmer_john, farmer_mary)
- `public/assets/audio/` - Kenney audio library + 6 placeholder SFX (combo/weather/bank)
- Splash video shows tornado theme

## AI Director (DropController)
- **Yahtzee Combo System**: Drops are chosen to help players build combos (pair, two_pair, three_of_kind, four_of_kind, full_house, straight, flush)
- **Fairness Distribution**: Helpful/neutral/disruptive ratios vary by level (70/20/10 early, 35/30/35 late)
- **Remediation**: After 2 disruptive drops, forces helpful type or compensating power-up
- **Tornado Indicator**: Procedural twisted funnel tornado (CreateRibbon + spiral bands) at top of board shows where next drop comes from
- **5 Competing Strategies**: build_pressure, release_tension, challenge, mercy, reward

## Character Traits (v1.1.0)
- **Farmer John** (steady/slow): 0.90x speed, 0.85x wobble
- **Farmer Mary** (fast/jittery): 1.10x speed, 1.15x wobble

## Difficulty Rebalance (v1.1.0)
- maxLevel: 25 -> 999
- speedIncreasePerLevel: 0.04 -> 0.035
- spawnRateCurve: 0.85 -> 0.88
- comboDecayTime: 3000 -> 3500

## Status
- Stacking/catching: WORKS
- Wobble physics: WORKS
- Banking: WORKS
- 3D rendering: WORKS
- Audio: WORKS
- Touch controls: WORKS
- Keyboard controls: ADDED (arrow keys, remappable)
- Farmer models: EXPORTED (farmer_john.glb, farmer_mary.glb with animations)
- AI Director (DropController): WORKS
- Tornado drop indicator: WORKS (procedural twisted funnel + spiral bands)
- Yahtzee-aware type distribution: WORKS
- Per-type animal scaling: WORKS (cow 1.15, pig 0.85, chicken 0.5, duck 0.55, sheep 1.0, farmer 2.5)
- Per-type physics weight: WORKS (cow 2.0, chicken 0.3, etc.)
- Entity lifecycle cleanup: WORKS (banking/scattering auto-removed)
- DevAPI + PlayerGovernor: WORKS (dev-only auto-play for testing)
- Weather system: WORKS (clear/windy/rainy/stormy state machine, wind forces, particle effects)
- Animal variants: WORKS (rare/golden/shadow with PBR tinting and score multipliers)
- HitStop: WORKS (freeze-frame on perfect catches, respects reducedMotion)
- Combo counter: WORKS (tiered animations at 5x/10x/15x milestones)
- Level up flash: WORKS (white overlay on level transitions)
- New power-ups: WORKS (Shield, Slow Motion, Score Frenzy)
- Session analytics: WORKS (SessionLog + CanvasChart + StatsModal)
- Colorblind filter: WORKS (protanopia/deuteranopia/tritanopia via Machado 2009)
- High contrast mode: WORKS (increased contrast post-processing)
- Remappable keybindings: WORKS (load/save/reset with persistence)
- Character traits: WORKS (John steady/slow, Mary fast/jittery)
- Tests: 1267 passing across 34 files
