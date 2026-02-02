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

### Assets
- `public/assets/models/` - Animal and Farmer GLBs (cow, pig, chicken, duck, sheep, farmer_john, farmer_mary)
- `public/assets/audio/` - Kenney audio library
- Splash video shows tornado theme

## AI Director (DropController)
- **Yahtzee Combo System**: Drops are chosen to help players build combos (pair, two_pair, three_of_kind, four_of_kind, full_house, straight, flush)
- **Fairness Distribution**: Helpful/neutral/disruptive ratios vary by level (70/20/10 early, 35/30/35 late)
- **Remediation**: After 2 disruptive drops, forces helpful type or compensating power-up
- **Tornado Indicator**: Procedural twisted funnel tornado (CreateRibbon + spiral bands) at top of board shows where next drop comes from
- **5 Competing Strategies**: build_pressure, release_tension, challenge, mercy, reward

## Status
- Stacking/catching: WORKS
- Wobble physics: WORKS
- Banking: WORKS
- 3D rendering: WORKS
- Audio: WORKS
- Touch controls: WORKS
- Keyboard controls: ADDED (arrow keys)
- Farmer models: EXPORTED (farmer_john.glb, farmer_mary.glb with animations)
- AI Director (DropController): WORKS
- Tornado drop indicator: WORKS (procedural twisted funnel + spiral bands)
- Yahtzee-aware type distribution: WORKS
- Per-type animal scaling: WORKS (cow 1.15, pig 0.85, chicken 0.5, duck 0.55, sheep 1.0, farmer 2.5)
- Per-type physics weight: WORKS (cow 2.0, chicken 0.3, etc.)
- Entity lifecycle cleanup: WORKS (banking/scattering auto-removed)
- DevAPI + PlayerGovernor: WORKS (dev-only auto-play for testing)
- Tests: 1077 passing across 26 files
