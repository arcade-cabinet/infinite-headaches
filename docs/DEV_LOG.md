# Infinite Headaches -> Homestead Headaches - Development Log

## Project Overview
A physics-based 3D stacking game featuring low-poly farm animals, built with React, Miniplex (ECS), and Babylon.js.

---

## Evolution Timeline

### Phases 1-11 (Legacy 2D)
*See historical logs for the evolution of the 2D "Psyduck" prototype.*

---

### Phase 12: The 3D Rebirth ("Homestead Headaches")
**Major pivot from 2D Canvas to 3D ECS Architecture.**

#### Core Changes
- **Rebranding:** Renamed to "Homestead Headaches". Theme shifted from Pokémon/Ducks to Farm Animals vs. Tornado.
- **Tech Stack:**
    - **Logic:** `GameEngine` now drives a **Miniplex** ECS world.
    - **Rendering:** Replaced 2D Context API with **Babylon.js**.
    - **Assets:** Implemented an automated pipeline (`scripts/bpy/`) to convert FBX assets to GLB while preserving vertex colors.
- **Rendering Policy:** Enforced a "No Fallbacks" rule. Removed all legacy sprite rendering code to ensure visual consistency in 3D.

#### Architecture
- **Entities:** Animals are now 3D GLTF models (`cow.glb`, `pig.glb`, etc.) with vertex-colored shaders.
- **Scene Graph:**
    1.  **Background:** 2D Canvas (Sky/Atmosphere).
    2.  **GameScene:** Babylon.js 3D layer (Transparent background, hosting Entities).
    3.  **UI:** React Overlay (HUD, Menus).

#### Features
- **Hybrid Sync:** Physics runs in `GameEngine` (deterministic-ish) and syncs `Position/Rotation` to ECS components for rendering.
- **Asset Pipeline:** Blender Python script automates `FBX -> GLB` conversion, ensuring low-poly assets are game-ready.

---

## Current Architecture

```
src/
├── game/
│   ├── ai/                      # AI Systems (DropController, WobbleGovernor)
│   ├── animals/                 # Animal definitions by type
│   │   ├── cow/variants/        # BrownCow (poop->bush ability)
│   │   ├── chicken/variants/    # fire_chicken, corn_chicken, etc.
│   │   ├── pig/variants/        # mud_pig, truffle_pig
│   │   └── sheep/variants/      # electric_sheep, rainbow_sheep
│   ├── ecs/                     # Miniplex ECS
│   │   ├── components/          # 20+ component types (Falling, Stacked, Frozen, etc.)
│   │   ├── systems/             # 9 systems (Movement, Wobble, Freeze, Projectile, etc.)
│   │   └── world.ts             # World Instance
│   ├── effects/                 # TornadoEffect, ParticleEffects, HitStop, ComboCounter, LevelUpFlash
│   ├── entities/                # Animal, Fireball, FrozenAnimal, PowerUp, BossAnimal
│   ├── registry/                # AnimalRegistry (centralized, multi-LOD)
│   ├── scene/                   # Babylon.js Scene Integration
│   ├── weather/                 # WeatherSystem state machine, wind forces, ambient audio
│   ├── variants/                # AnimalVariants (rare/golden/shadow with PBR tinting)
│   ├── analytics/               # SessionLog, CanvasChart, StatsModal
│   ├── accessibility/           # ColorblindFilter, HighContrastMode, KeyBindings
│   └── screens/                 # Splash, MainMenu, CharacterSelect, Game, GameOver
├── theme/tokens/                # Nebraska homestead colors
├── graphics/                    # Multi-LOD quality system
├── random/                      # Deterministic seeded RNG (Zustand store)
└── platform/                    # Cross-platform abstraction
```

## Recent Updates (Phase 12.1)

### Character System
- **Farmer John & Farmer Mary**: Updated character system with proper Nebraska homestead couple
- **Kenney Assets**: Integrated Kenney Animated Characters Bundle (characterMedium with farmerA/farmerB skins)
- **GLB Export Pipeline**: New farmer_john.glb and farmer_mary.glb with animations

### 3D Visual Effects
- **TornadoEffect.ts**: Procedural 3D tornado using Babylon.js particle systems
  - Multiple particle layers: funnel, debris, wind streaks, base glow, dust cloud
  - Intensity control (0-1) for AI Director integration
- **StormAtmosphere**: Dynamic lighting that shifts based on storm intensity
- **Animation System**: Full skeletal animation support via Babylon.js AnimationGroups

### Infrastructure
- **Netlify Deployment**: PWA deploys to https://homestead-headaches.netlify.app
- **CI/CD Pipeline**: GitHub Actions workflow for automated builds
- **ECS Systems Enabled**: GameSystems now properly runs in Babylon render loop

## Recent Updates (Phase 12.2)

### ECS Component System
- **Full ECS Components:** 20+ component types defined in `src/game/ecs/components/index.ts`
  - Game state: FallingComponent, StackedComponent, BankingComponent, ScatteringComponent
  - Abilities: FrozenComponent, ProjectileComponent, BounceZoneComponent, AbilityComponent
  - Physics: WobbleComponent, SquishComponent
  - Entity types: PlayerComponent, BossComponent, MergedComponent
  - Animation: AnimationComponent with blend weights and transitions
- **ECS Systems:** 9 systems for game logic
  - MovementSystem, WobbleSystem, AnimationSystem
  - FreezeSystem, ProjectileSystem, BounceZoneSystem
  - AbilitySystem, StackingSystem, SpawningSystem

### AnimalRegistry
- **Centralized Definitions:** All animals defined in `src/game/registry/AnimalRegistry.ts`
- **Multi-LOD Support:** high/medium/low quality models per animal
- **Procedural Fallback:** Low quality uses procedural geometry (no GLB needed)
- **Variant System:** Special variants (fire_chicken, ice_duck, brown_cow, etc.)

### Brown Cow Ability
- **Poop Projectile:** Launches poop with arc trajectory
- **Bouncy Bush:** Poop grows procedural bush where it lands
- **Bounce Mechanic:** Falling animals bounce off bush back into play
- **Durability:** Bush tramples after 5 bounces, despawns after 30s

### Graphics Quality System
- **Quality Presets:** high/medium/low in `src/graphics/settings/`
- **Zustand Store:** Graphics settings persisted via Zustand
- **LOD Switching:** GraphicsManager handles quality changes at runtime

### Deterministic RNG
- **Seeded Random:** `src/random/seedrandom.ts` for reproducible gameplay
- **Zustand Store:** `src/random/store.ts` manages RNG state
- **Human-Readable Seeds:** Word-based seed names (e.g., "funky-tornado")

### Maestro E2E Testing
- **Mobile Testing:** `.maestro/flows/` contains E2E test flows
- **Character Matrix:** Tests both Farmer John and Farmer Mary
- **Quality Matrix:** Tests all graphics quality levels

## Known Gaps (3D Transition)
- **Physics Fidelity:** 3D collisions are currently approximated using the legacy 2D bounding boxes.
- **Camera Effects:** Camera shake and zoom-outs for tall stacks not yet implemented.
- **Animal Reactions:** Animals should look at player, panic when wobbling.

## Recent Updates (Phase 13: Release 1.0 - Reactylon & Havok)

### Engine Overhaul
- **React 19 + Reactylon:** Migrated core engine to React 19 and `reactylon` v3.5.2.
- **Havok Physics:** Replaced custom verlet physics with industry-standard **Havok Physics** (WASM).
  - Implemented `EntityRenderer` to synchronize Havok rigid bodies with Miniplex ECS.
  - Robust loading mechanism (`GameScreen3D`) ensures physics is ready before scene mount.

### UI/UX Refinement
- **Responsive Design:** Implemented dynamic camera positioning (`useResponsiveScale`) to ensure the game fits any aspect ratio (Mobile Portrait vs Desktop Landscape).
- **3D Menu:** Replaced declarative texture planes with imperative `Signboard` components for stability.
- **Loading Experience:** Added "Initializing Physics..." screen and removed legacy 2D backgrounds to showcase the 3D Diorama.

### Infrastructure
- **Build Patches:** Created `scripts/patch-reactylon.cjs` to fix React 19 compatibility issues in the build pipeline.
- **Tests:** Achieved 100% E2E test pass rate with Playwright, verifying full gameplay flows and visuals.

## Recent Updates (Phase 14: DropController + Tornado Indicator)

### DropController (replaces GameDirector)
- **Unified AI Director:** Created `src/game/ai/DropController.ts` replacing the YUKA-based `GameDirector` with a pure TypeScript implementation.
- **Yahtzee-Aware Type Selection:** Animals are chosen based on current stack composition to help or challenge combo building.
  - Combo types: pair, two_pair, three_of_kind, four_of_kind, full_house, straight, flush.
  - Fairness distribution varies by level: early (70/20/10), mid (50/30/20), late (35/30/35) helpful/neutral/disruptive.
  - Remediation rule: after 2 consecutive disruptive drops, forces helpful type or compensating power-up.
- **Preserved All GameDirector Logic:** 5 competing strategies (build_pressure, release_tension, challenge, mercy, reward), player model (skill, frustration, engagement, fatigue), logarithmic difficulty curves, spawn positioning, behavior types, power-up decisions.
- **Tornado Position Management:** DropController drives `nextDropX` for the visual tornado indicator.

### DropIndicatorTornado (new visual component)
- **File:** `src/features/gameplay/scene/components/DropIndicatorTornado.tsx`
- **Design:** Small cartoon tornado using Babylon.js particle systems (~200 particles, two layers: funnel + sparkle).
- **Behavior:** Patrols top of game board (Y=7.5), biased toward DropController's `nextDropX`. Intensity scales with difficulty level.
- **Per-Frame Updates:** Uses getter functions and `onBeforeRenderObservable` to avoid 60fps React re-renders.

### Integration
- **GameLogic.ts:** Replaced `GameDirector` import with `DropController`. Added stack composition building from ECS entities. Exposed `getNextDropX()`, `getDropDifficulty()`, `getIsDropImminent()`.
- **useGameLogic.ts:** Exposes tornado getter functions for React layer.
- **GameScene.tsx:** Renders `DropIndicatorTornado` during gameplay with tornado state props.
- **GameScreen3D.tsx:** Passes tornado getters through to GameScene.

### Types
- **types.ts:** Added `YahtzeeCombo` type, `nextDropX` to `SpawnDecision`, `stackComposition` to `PlayerState`.

### Testing
- **DropController.test.ts:** ~45 tests covering construction, update cycle, player model, difficulty curves, strategy selection, Yahtzee type selection, remediation, tornado position, power-ups, behavior types, integration.
- **types.test.ts:** ~12 tests covering all AI type interfaces including new fields.
- **940 total tests passing** across 22 test files.

## Recent Updates (Phase 15: Visual Polish & Comprehensive Testing)

### Design System
- **Color Purge:** Replaced 347+ hardcoded purple/lavender Tailwind classes with Nebraska Homestead palette across 8 UI components (MainMenuOverlay, GameOverScreen, Tutorial, UpgradeShop, PauseMenu, PauseButton, AchievementToast, ScoreDisplay).
- **Game Mode Colors:** Material Design colors replaced with farm palette (barn red, wheat, pasture green, deep red).
- **Farm palette CSS variables:** Added to `src/index.css` under `@theme inline`.

### Entity Scaling & Physics
- **Per-Type Scaling:** Added `modelScale` field to `ANIMAL_TYPES` config. Cow: 1.8, pig: 1.2, chicken: 0.7, duck: 0.8, sheep: 1.5.
- **Physics Weight:** `EntityRenderer` now reads `entity.physics.mass` from config (cow: 2.0, chicken: 0.3) instead of hardcoded mass=1.
- **Archetype Factories:** `createAnimal()` and `createFallingAnimal()` set scale and mass from config.

### Farmer Animation
- **Root Motion Stripping:** `EntityRenderer` zeroes out position keyframes on root bone animations to prevent GLB animations from overriding ECS-driven positions.
- **Idle Selection:** Prioritizes idle > stand > breathe > rest > wait, avoids walk/run as fallback.
- **Camera Facing:** Increased idle facing interpolation speed from 0.05 to 0.12.

### Visual Elements
- **FarmerTrack:** New component at Y=-2.5 -- visible dirt track (18 units wide) with green grass edge strips.
- **GameBoardOverlay:** Increased opacity to 15% with warm brown tint. Added invisible physics floor at Y=-4.
- **DropIndicatorTornado:** Complete overhaul -- spinning funnel mesh (tapered cylinder: 0.3 top, 1.8 bottom, 2.5 height) + storm gray-brown debris + straw/hay particles. Scales up 1.15x when drop is imminent.
- **MainMenuOverlay:** Character info card now has backdrop-blur for readability. Enlarged touch targets on carousel arrows.

### Testing
- **AnimationSystem.test.ts:** Tests for registration, unregistration, createAnimationComponent, animation selection, velocity-based switching, fuzzy matching, triggerAnimation.
- **SpawningSystem.test.ts:** Tests for createFallingComponent, getRandomAnimalType, spawnAnimalFromDecision, coordinate mapping, query helpers.
- **WobbleGovernor.test.ts:** Tests for all 4 modes (steady, pulse, mercy, chaos), mode transitions, tension accumulation/decay, events, threat calculation.
- **useResponsiveScale.test.ts:** Tests for getResponsiveAnimalSize, getResponsivePhysics, getResponsiveTouchTargetSize, getOptimalCanvasResolution.
- **960+ total tests passing** across 25+ test files.

## Recent Updates (Phase 16: Playability Fixes & Dev Tooling)

### Animal Scale Rebalance
- **Problem:** Cow at modelScale 1.8 created visual walls when stacked; animals were disproportionate to each other.
- **Fix:** Reduced all animal modelScale values to be proportional to the farmer (2.5):
  - cow: 1.8 -> 1.15, pig: 1.2 -> 0.85, chicken: 0.7 -> 0.5, duck: 0.8 -> 0.55, sheep: 1.5 -> 1.0.
- **Result:** Stacks are readable, farmer is clearly dominant, animals are visually distinguishable by size.

### Tornado Ribbon Rewrite
- **Problem:** Previous tapered cylinder looked like a plain geometric cone, not a cartoon tornado.
- **Fix:** Complete rewrite of `DropIndicatorTornado.tsx` using `MeshBuilder.CreateRibbon`:
  - Procedural twisted funnel: 28 rings, 18 points per ring, 2.5 full twists, organic sine-wave wobble.
  - 3 dark spiral bands wrapping helically around the funnel (separate ribbon meshes).
  - All parts parented under a spinning `TransformNode` -- rotation of the twisted geometry creates a vortex visual effect.
  - Organic sway animation (`rotation.z` wobble).
  - Storm gray-brown debris particles (150) + straw/hay particles (50).
  - Funnel opacity pulses 0.55 +/- 0.12 when drop is imminent; scales up 1.2x.
- **Result:** Tornado reads as an actual cartoon twister with visible twist and spiral structure.

### Entity Lifecycle Cleanup
- **Problem:** Banking and scattering entities were never removed. Entity count grew to 47+ during active gameplay, degrading performance.
- **Fix:** Added `cleanupTransientEntities()` to `GameLogic.tick()`:
  - Banking entities removed after `bankAnimationDuration + 500ms`.
  - Scattering entities removed after 2500ms.
- **Result:** Entity count stays at ~15 during gameplay.

### PlayerGovernor (Dev-Only AI Player)
- **File:** `src/game/debug/PlayerGovernor.ts`
- **Library:** Yuka (`GameEntity`, `StateMachine`, `State`, `Time`).
- **FSM States:** IDLE (patrol center), PURSUING (chase falling animals), BANKING (deposit stack).
- **Decision Logic:** Scores falling entities by urgency and reachability. Banks at 4+ stacked (2+ in danger).
- **Activation:** `window.__DEV_API__.enableAutoPlay()`.
- **Purpose:** Automated gameplay for Chrome MCP visual verification and E2E testing.

### DevAPI Testing Infrastructure
- **File:** `src/game/debug/DevAPI.ts`
- **Pattern:** Dev-only singleton on `window.__DEV_API__` providing:
  - Game state inspection, entity count, full state dump.
  - Direct spawning controls, lives/invincibility management.
  - Auto-play via PlayerGovernor (enable/disable).
  - Game state control (start, pause, resume, game over).
- **Integration:** Bound to GameLogic via `useGameLogic` hook.

### Chrome MCP Visual Verification
- **Workflow:** Chrome MCP browser automation captures real gameplay screenshots.
- **Process:** Navigate to game -> start Endless mode -> enable auto-play + invincibility -> take screenshots.
- **Challenge:** Chrome throttles `requestAnimationFrame` for non-focused tabs. Solved with `setInterval` keep-alive that constantly resets invincibility + lives.
- **Result:** Confirmed tornado, animal scaling, entity cleanup, and scoring all working in live gameplay.

### Maestro E2E Test Flows
- **New flows:** `test-devapi-lives-gameover.yaml`, `test-devapi-spawning.yaml`, `test-devapi-state-control.yaml`.
- **Coverage:** DevAPI state control, lives/game-over mechanics, spawning system validation.

### Testing
- **Updated tests:** `archetypes.test.ts` updated for new modelScale values (cow boss: 2.07, pig boss: 1.275, chicken boss: 0.7).
- **1077 total tests passing** across 26 test files.

## Recent Updates (Phase 17: v1.1.0 Feature Expansion)

### Weather System
- **WeatherSystem State Machine:** New `src/game/weather/WeatherSystem.ts` implementing a 4-state weather cycle: clear -> windy -> rainy -> stormy.
  - Activates at level 6+ with progressive weather escalation.
  - Wind forces applied to falling entities during windy/rainy/stormy states, affecting trajectory.
  - BabylonJS particle effects for rain droplets and wind streaks.
  - Wobble bonus during storms increases difficulty for stacked animals.
  - Ambient audio loops (rain, wind, thunder) with crossfade transitions between weather states.
- **WeatherEffects Component:** Wired into the component tree alongside GameScene, renders particle effects and manages audio.
- **Bug Fix:** Wind direction sign was inverted; corrected so wind blows in the visually indicated direction.

### Animal Variants (Tiered Rarity System)
- **AnimalVariants:** New `src/game/variants/AnimalVariants.ts` defining three variant tiers:
  - **Rare** (level 3+): Blue PBR material tint, 1.5x score multiplier.
  - **Golden** (level 8+): Gold PBR material tint, 3x score multiplier.
  - **Shadow** (level 15+): Dark PBR material tint, 2x score multiplier.
- **Visual System:** PBR material tinting applied at spawn time via BabylonJS StandardMaterial/PBRMaterial color properties.
- Variant type is determined by level and RNG at spawn, independent of the base animal type.

### HitStop Effect
- **HitStop:** New `src/game/effects/HitStop.ts` implementing a freeze-frame effect.
  - Triggers on perfect catches and combo milestones (5x, 10x, 15x).
  - Pauses game loop for a configurable duration (default ~80ms) to create impact feel.
  - Respects the `reducedMotion` user preference --- disabled when accessibility setting is active.

### Local Analytics (SessionLog + StatsModal)
- **SessionLog:** New `src/game/analytics/SessionLog.ts` recording per-session gameplay data.
  - Stores to Capacitor local storage with a 500-session FIFO cap (oldest sessions evicted).
  - Records: score, level reached, duration, animals caught, combos, power-ups used, weather encountered.
  - Input validation to prevent malformed session data.
- **CanvasChart:** New `src/game/analytics/CanvasChart.ts` --- pure HTML5 Canvas chart renderer.
  - Supports line charts, bar charts, and heatmap visualizations.
  - No external charting library dependency.
- **StatsModal:** New `src/game/analytics/StatsModal.tsx` with 4 tabs:
  - **Overview:** Lifetime stats summary (total games, best score, average level, etc.).
  - **History:** Scrollable session history list.
  - **Charts:** Line/bar charts of score and level progression over time.
  - **HeatMap:** Catch position heatmap showing player tendencies.
  - JSON export button for raw data download.
  - Clear history button with confirmation.
  - Error boundary wrapping for resilience.

### Remappable Keybindings
- **KeyBindings:** New `src/game/accessibility/KeyBindings.ts` providing `loadKeyBindings()`, `saveKeyBindings()`, `resetKeyBindings()`.
  - Persisted to local storage, survives app restarts.
  - Key capture modal with escape handling for cancellation.
  - Default bindings: ArrowLeft/ArrowRight for movement, Space for bank, P for pause.

### Colorblind Filter & High Contrast Mode
- **ColorblindFilter:** New `src/game/accessibility/ColorblindFilter.ts` implementing post-processing color correction.
  - Supports protanopia, deuteranopia, and tritanopia simulation/correction.
  - Uses Machado 2009 color transformation matrices for accuracy.
  - Applied as a BabylonJS post-process effect.
- **High Contrast Mode:** Separate post-processing pass that increases overall scene contrast.
- **ColorblindFilter Component:** Wired into the component tree for runtime toggling.

### Combo Counter & Level Up Flash
- **ComboCounter:** New `src/game/effects/ComboCounter.tsx` with tiered animation milestones.
  - 5x combo: scale pulse animation.
  - 10x combo: larger pulse + screen shake.
  - 15x combo: full celebration with camera FOV pulse.
  - Animations driven by anime.js with proper cleanup on unmount (memory leak fix).
- **LevelUpFlash:** New `src/game/effects/LevelUpFlash.tsx` rendering a white flash overlay on level transitions.
  - Wired into the component tree, triggers on level change events.

### New Power-ups (3 additions)
- **Shield:** Absorbs 1 missed animal without losing a heart. Lasts 15 seconds. Visual: translucent blue sphere around farmer.
- **Slow Motion:** Reduces game speed to 0.5x for 5 seconds. All falling entities slow down.
- **Score Frenzy:** 3x point multiplier for 6 seconds. Stacks with combo multipliers.

### Character Traits
- **Farmer John** (steady/slow): 0.90x movement speed, 0.85x wobble multiplier. Better for beginners.
- **Farmer Mary** (fast/jittery): 1.10x movement speed, 1.15x wobble multiplier. Higher risk/reward.
- Traits affect gameplay feel without changing core mechanics. Displayed on character select screen.

### Difficulty Rebalance
- **maxLevel:** 25 -> 999 (effectively uncapped for endless play).
- **speedIncreasePerLevel:** 0.04 -> 0.035 (slightly gentler curve).
- **spawnRateCurve:** 0.85 -> 0.88 (marginally slower spawn acceleration).
- **comboDecayTime:** 3000 -> 3500 (more forgiving combo window).

### Integration & Wiring
- **Component Tree:** LevelUpFlash, WeatherEffects, and ColorblindFilter components wired into the main component tree in GameScreen3D.
- **Motor Settings Persistence:** Movement sensitivity settings now persist across sessions.
- **ARIA Live Regions:** Improved screen reader announcements for score changes, combo milestones, weather transitions, and game state changes.
- **Key Capture Escape Handling:** Pressing Escape during keybinding capture cancels the capture instead of binding Escape.

### Bug Fixes
- **Anime.js Memory Leaks:** Fixed animation cleanup in ComboCounter, ScoreDisplay, and SettingsModal. All anime.js animations now call `anime.remove()` in useEffect cleanup.
- **WeatherEffects Wind Direction:** Sign was inverted, causing wind to blow opposite to particle visual direction. Corrected.
- **SessionLog Validation:** Added input validation to prevent storing malformed session records.
- **StatsModal Error Boundary:** Wrapped StatsModal content in error boundary to prevent analytics crashes from breaking the game UI.

### Audio
- **6 Placeholder Audio Files:** Added placeholder SFX for combo milestone hits, weather ambient transitions, and bank celebration sounds.
- These are temporary assets to be replaced with final audio in a future pass.

### Testing
- **5 New Test Suites:**
  - `WeatherSystem.test.ts`: 15 tests covering state transitions, wind force calculations, level thresholds, audio fade logic.
  - `HitStop.test.ts`: 9 tests covering trigger conditions, duration, reducedMotion respect, game loop pause/resume.
  - `AnimalVariants.test.ts`: 13 tests covering tier selection by level, score multipliers, PBR tint values, RNG distribution.
  - `SessionLog.test.ts`: 9 tests covering recording, FIFO eviction, validation, Capacitor storage integration, JSON export.
  - `Keybindings.test.ts`: 12 tests covering load/save/reset, persistence, default values, key capture, escape handling.
- **9 Pre-Existing Test Failures Fixed:** Resolved flaky and broken tests from prior phases.
- **1267 total tests passing** across 34 test files, 0 failures.
