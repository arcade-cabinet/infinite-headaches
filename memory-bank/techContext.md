# Tech Context

## Core Stack
*   **Runtime:** Node.js (Development), Browser/WebView (Production).
*   **Language:** TypeScript (Strict mode).
*   **Framework:** React 19.
*   **Build Tool:** Vite 6.
*   **Package Manager:** pnpm.

## Rendering Engine
*   **Library:** Babylon.js 8.
*   **Integration:** `reactylon` (v3.5.2) + `babel-plugin-reactylon`.
*   **Format:** GLTF/GLB (Binary glTF) + Procedural Meshes (`CreateRibbon`, `CreateCylinder`, `CreateBox`).
*   **Environment:** Hybrid 3D (3D Menu + Gameplay).
*   **Procedural Tornado:** `MeshBuilder.CreateRibbon` for twisted funnel (28 rings, 2.5 full twists). `TransformNode` parents all tornado parts for unified spinning.
*   **Post-Processing:** ColorblindFilter via Machado 2009 matrices applied as post-process effect through PostProcessEffects pipeline in NebraskaDiorama.
*   **Weather Particles:** BabylonJS particle systems for rain/wind effects driven by WeatherSystem state.

## Physics Engine
*   **Engine:** Havok Physics (v1.3.11).
*   **Integration:** `@babylonjs/havok` (WASM).
*   **Sync Strategy:** `EntityRenderer` synchronizes Havok Bodies (Physics) with Miniplex ECS (Logic) and Babylon Meshes (View).
    *   Falling: `PhysicsMotionType.DYNAMIC`.
    *   Stacked/Player: `PhysicsMotionType.KINEMATIC`.
*   **Per-Type Mass:** `PhysicsAggregate` mass reads from `ANIMAL_TYPES[type].weight` (cow: 2.0, chicken: 0.3).
*   **Physics Floor:** Invisible collision plane at Y=-4 catches entities that fall below the play area.
*   **Wind Forces:** WeatherSystem wind applies lateral forces to falling (DYNAMIC) entities during windy/rainy/stormy states.

## Game Logic
*   **ECS:** Miniplex (Hybrid Architecture).
*   **AI:** DropController (Yahtzee-aware type distribution, adaptive difficulty) + WobbleGovernor.
*   **State:** Zustand (Store).
*   **Entity Lifecycle:** `GameLogic.cleanupTransientEntities()` removes banking/scattering entities by timestamp thresholds.
*   **Weather:** WeatherSystem state machine (clear/windy/rainy/stormy) driven by level progression. Affects entity physics and wobble bonus.
*   **Hit Stop:** Freeze-frame effect manager in GameLogic. Triggered on perfect catches and combo milestones. Guarded by reducedMotion preference.
*   **Combo System:** Combo counter with tiered milestones at 5x/10x/15x. Triggers SFX, camera FOV zoom pulse, and escalating visual feedback.
*   **Character Traits:** Per-character speed and wobble multipliers (John: 0.90x/0.85x, Mary: 1.10x/1.15x).
*   **Difficulty:** maxLevel 999, gentler ramp, 3500ms combo window.

## Animation
*   **Library:** anime.js for UI animations (ComboCounter, ScoreDisplay, SettingsModal).
*   **Cleanup:** All anime.js animations tracked by ref and cleaned up on component unmount to prevent memory leaks.
*   **Level Up Flash:** White flash overlay component with opacity animation on level transitions.

## Audio
*   **SFX:** Kenney audio library + 6 new placeholder .ogg files (combo5, combo10, combo15, weather_wind, weather_rain, bank_fanfare).
*   **Ambient Loops:** Weather state drives ambient audio (wind/rain loops).
*   **Combo SFX:** onComboMilestone fires at combo 5/10/15 with distinct audio cues.

## Analytics
*   **SessionLog:** Records gameplay sessions to Capacitor storage with 500-entry FIFO cap. Includes clearSessionHistory with queue reset.
*   **CanvasChart:** Custom canvas-based chart renderer for analytics visualization.
*   **StatsModal:** 4 tabs (Overview/History/Charts/HeatMap) with JSON export. Error boundary (try-catch) and responsive chart sizing.

## Accessibility
*   **Colorblind Filter:** Protanopia/deuteranopia/tritanopia post-processing via Machado 2009 color transformation matrices.
*   **Reduced Motion:** Respected by HitStop, ComboCounter camera zoom, and animation systems. Passed through via GameLogic.setReducedMotion().
*   **High Contrast Mode:** Toggle in SettingsModal AccessibilityTab.
*   **Motor Settings:** Persisted via inputManager (load on mount, immediate save).
*   **ARIA:** Live region severity set to assertive for level changes.
*   **Key Capture:** Escape cancels key capture without closing modal.
*   **Mobile Layout:** Button layout uses flex-wrap for small viewports.

## Input & Keybindings
*   **Remapping:** loadKeyBindings/saveKeyBindings/resetKeyBindings with localStorage persistence.
*   **Platform:** `src/platform/keybindings.ts` provides unified keybinding interface.
*   **Safety:** Input.ts init order safety with console.warn if not initialized.

## Power-ups
*   **Shield:** Absorbs 1 miss.
*   **Slow Motion:** 0.5x entity speed.
*   **Score Frenzy:** 3x point multiplier.
*   **UI Integration:** getActivePowerUps() and onPowerUpStateChange callback expose active state to UI layer.

## Dev Tooling
*   **DevAPI:** `window.__DEV_API__` singleton (dev-only) for runtime debugging, state inspection, spawning controls.
*   **PlayerGovernor:** Yuka-powered AI auto-player (`GameEntity` + `StateMachine` + `State` + `Time`). FSM: IDLE/PURSUING/BANKING.
*   **Yuka Library:** Used only by PlayerGovernor for FSM and time management. Dev-only dependency.
*   **Chrome MCP:** Browser automation for visual verification -- screenshots of live gameplay with AI auto-play.

## Mobile / Native
*   **Framework:** Capacitor 8.
*   **Platforms:** Android, iOS, Electron (Desktop).
*   **Build Type:** `viteSingleFile` for Capacitor.
*   **Storage:** Capacitor storage used by SessionLog for analytics persistence.

## Build System & Patches
*   **Patch:** `scripts/patch-reactylon.cjs` (Postinstall).
    *   Fixes `babel-plugin-reactylon` iterable crash.
    *   Stubs `renderToStaticMarkup` for React 19 compatibility.

## Project Structure
```
/
├── src/
│   ├── game/
│   │   ├── ai/              # AI Systems (DropController, WobbleGovernor, GameDirector)
│   │   ├── analytics/        # SessionLog, CanvasChart (v1.1.0)
│   │   ├── characters.ts    # Character definitions (Farmer John, Farmer Mary) + traits
│   │   ├── components/       # ComboCounter, LevelUpFlash, StatsModal (v1.1.0)
│   │   ├── config/           # AnimalVariants (v1.1.0)
│   │   ├── config.ts        # All game constants + ANIMAL_TYPES with modelScale/weight
│   │   ├── debug/            # Dev-only tools (DevAPI, PlayerGovernor)
│   │   ├── ecs/             # Miniplex Components & Systems
│   │   │   ├── components/  # Entity Data (20+ component types)
│   │   │   ├── systems/     # Logic (Spawning, Stacking, Animation, Wobble, etc.)
│   │   │   └── archetypes.ts # Entity factory functions
│   │   ├── effects/          # HitStop (v1.1.0)
│   │   ├── engine/          # Game Loop (GameLogic) + entity lifecycle
│   │   ├── graphics/
│   │   │   ├── environment/  # WeatherEffects (v1.1.0)
│   │   │   └── shaders/      # ColorblindFilter (v1.1.0)
│   │   ├── hooks/           # React Hooks (Game Logic, Scaling)
│   │   └── systems/          # WeatherSystem (v1.1.0)
│   ├── features/            # Feature-based Modules
│   │   ├── core/            # GameScreen3D, App Entry, responsive hooks
│   │   ├── gameplay/        # GameScene, visual components
│   │   │   └── scene/components/ # EntityRenderer, DropIndicatorTornado,
│   │   │                         # FarmerTrack, GameBoardOverlay, GraphicsIntegration
│   │   ├── menu/            # MainMenu3D, MainMenuOverlay, CharacterSelect
│   │   └── splash/          # SplashScene
│   ├── platform/            # Native abstractions (Haptics, Storage, Audio, Keybindings)
│   └── assets/              # 2D Images
├── public/
│   ├── assets/
│   │   ├── models/          # 3D GLB Models (cow, pig, chicken, duck, sheep, farmer_john, farmer_mary)
│   │   └── audio/           # Audio Files (Kenney library + 6 v1.1.0 placeholder .ogg files)
│   └── HavokPhysics.wasm    # Physics Engine
├── .maestro/                # Maestro E2E test flows
└── scripts/
    └── patch-reactylon.cjs  # Critical Build Patch
```

## New Files Added in v1.1.0
*   `src/game/analytics/CanvasChart.ts`
*   `src/game/analytics/SessionLog.ts`
*   `src/game/components/ComboCounter.tsx`
*   `src/game/components/LevelUpFlash.tsx`
*   `src/game/components/StatsModal.tsx`
*   `src/game/config/AnimalVariants.ts`
*   `src/game/effects/HitStop.ts`
*   `src/game/graphics/environment/WeatherEffects.tsx`
*   `src/game/graphics/shaders/ColorblindFilter.ts`
*   `src/game/systems/WeatherSystem.ts`
*   `src/platform/keybindings.ts`
*   5 new test files, 6 new audio placeholder files

## Development Environment
*   **OS:** Darwin (macOS).
*   **Git:** Version control.
*   **Tests:** Vitest (Unit, 1267 tests across 34 files, 0 failures) + Maestro (E2E device flows).
