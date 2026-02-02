# System Patterns

## Architecture: Hybrid ECS

The project employs a **Hybrid Entity Component System (ECS)** architecture to separate game logic from rendering.

### 1. ECS (Miniplex) - The "Source of Truth"

*   **State:** All game state (Position, Velocity, Player State, Animal Type) resides in Miniplex entities.
*   **Logic:** Systems (e.g., `MovementSystem`, `WobbleSystem`, `SpawningSystem`) operate on these components every frame to update the state.
*   **Location:** `src/game/ecs/`

### 2. Game Driver (`GameLogic`)

*   **Role:** Orchestrates the game loop. It handles the physics time step, calls ECS systems, and manages entity lifecycle.
*   **Entity Lifecycle:** `cleanupTransientEntities()` runs every tick to remove banking entities (after `bankAnimationDuration + 500ms`) and scattering entities (after `2500ms`). Prevents entity accumulation during gameplay.
*   **Resource Cleanup:** `destroy()` method cleans up weather system and dropController references to prevent memory leaks.
*   **Hit Stop:** Manages freeze-frame state. `setReducedMotion()` allows accessibility preferences to disable the effect.
*   **Location:** `src/game/engine/`

### 3. Renderer (React + Babylon.js via Reactylon)

*   **Role:** Strictly a **View Layer**. It subscribes to ECS entities and renders the corresponding 3D models using Babylon.js.
*   **Constraint:** View components MUST NOT contain game logic. They simply reflect the ECS state.
*   **Location:** `src/features/gameplay/scene/` (e.g., `GameScene.tsx`, `EntityRenderer.tsx`)

## Key Design Patterns

### Asset Pipeline

*   **Source:** FBX files (e.g., `Farmers_Family/`).
*   **Processing:** Blender Python scripts (`scripts/bpy/`) convert FBX to GLB.
*   **Output:** GLB files in `public/assets/models/`.
*   **Requirement:** Scripts must handle scaling (cm to m) and material baking (texture packing) correctly to ensure models look correct in Babylon.js.

### State Management

*   **Game Loop:** Driven by `requestAnimationFrame` (via Babylon's runRenderLoop).
*   **UI State:** React State / Zustand (for meta-game state like settings, seeds).
*   **Game State:** Miniplex ECS.
*   **Settings Persistence:** Motor settings load from inputManager on mount and save immediately on change. Keybindings persist to localStorage.

### Platform Abstraction

*   **Module:** `src/platform/`
*   **Purpose:** Unified interface for Haptics, Storage, Audio, and Keybindings that delegates to either Web APIs or Capacitor plugins depending on the runtime environment.
*   **Keybindings:** `src/platform/keybindings.ts` provides loadKeyBindings/saveKeyBindings/resetKeyBindings with localStorage persistence.

### AI Director (DropController)

*   **Location:** `src/game/ai/DropController.ts`
*   **Role:** Unified AI that manages spawn timing, animal type selection, difficulty scaling, and drop positioning.
*   **Yahtzee-Aware Type Selection:** Analyzes current stack composition and chooses animal types that help or challenge combo building (pair, two_pair, three_of_kind, four_of_kind, full_house, straight, flush).
*   **Fairness Remediation:** After 2 consecutive disruptive drops, compensates with helpful types or power-ups.
*   **5 Competing Strategies:** build_pressure, release_tension, challenge, mercy, reward -- weighted by player model (skill, frustration, engagement, fatigue).
*   **Tornado Position:** Drives `nextDropX` for the `DropIndicatorTornado` visual component.

### Drop Indicator Tornado

*   **Location:** `src/features/gameplay/scene/components/DropIndicatorTornado.tsx`
*   **Role:** Visual indicator at top of game board showing where next animal drops.
*   **Implementation:** Procedural `CreateRibbon` twisted funnel mesh (28 rings, 18 points/ring, 2.5 full twists) + 3 dark spiral bands wrapping helically around the funnel. All parts parented under a spinning `TransformNode`. Storm gray-brown debris particles (150) + straw/hay particles (50). Per-frame updates via `onBeforeRenderObservable` (no React re-renders).
*   **Visual Behavior:** Root node spins at 2.5 rad/s (6 rad/s when imminent), sways side-to-side. Funnel opacity pulses and scales up 1.2x when spawn is imminent.

### Entity Lifecycle Management

*   **Pattern:** Transient entities (banking, scattering) carry a `startedAt: Date.now()` timestamp on creation.
*   **Cleanup:** `GameLogic.cleanupTransientEntities()` runs every tick, comparing `Date.now() - startedAt` against maximum age thresholds.
*   **Thresholds:** Banking: `bankAnimationDuration + 500ms`; Scattering: `2500ms`.
*   **Effect:** Prevents entity accumulation -- active entity count stays at ~15 during gameplay instead of growing unbounded.

### Per-Type Entity Configuration

*   **Location:** `src/game/config.ts` (`ANIMAL_TYPES` record)
*   **Fields per type:** `color`, `spawnWeight`, `weight` (physics mass), `modelScale`, `ability`, `hasModel`.
*   **Scale tuning:** Animals (0.5-1.15) are clearly smaller than the farmer (2.5) so stacks are readable.
*   **Integration:** `createAnimal()` and `createFallingAnimal()` in `archetypes.ts` read `modelScale` and `weight` from config.

### Weather System (v1.1.0)

*   **Location:** `src/game/systems/WeatherSystem.ts`
*   **Pattern:** State machine with 4 states: clear, windy, rainy, stormy. Transitions driven by level progression.
*   **Wind Forces:** Applies lateral drift to falling (DYNAMIC) entities. Wind direction sign was corrected in v1.1.0 bug fixes.
*   **Level Reset:** Forces clear state when level <= 5 to give new players calm early gameplay.
*   **Wobble Bonus:** Weather severity adds wobble pressure to stacks.
*   **Cleanup:** WeatherSystem resources cleaned up in GameLogic.destroy().

### Weather Effects (v1.1.0)

*   **Location:** `src/game/graphics/environment/WeatherEffects.tsx`
*   **Role:** Visual rendering layer for weather. BabylonJS particle systems for rain and wind effects.
*   **Integration:** Wired into GameScene. Reads weather state from useGameLogic hook.
*   **Audio:** Ambient audio loops (weather_wind.ogg, weather_rain.ogg) driven by weather state.

### Animal Variants (v1.1.0)

*   **Location:** `src/game/config/AnimalVariants.ts`
*   **Pattern:** Tiered variant system unlocked by level progression.
  *   **Rare:** Level 3+ -- blue tint, 1.5x score multiplier.
  *   **Golden:** Level 8+ -- gold PBR tint, 3x score multiplier.
  *   **Shadow:** Level 15+ -- dark PBR tint, 2x score multiplier.
*   **Rendering:** PBR material tinting applied to base animal models. No additional GLB assets required.

### Hit Stop (v1.1.0)

*   **Location:** `src/game/effects/HitStop.ts`
*   **Pattern:** Freeze-frame effect that pauses the game loop for a short duration on significant events (perfect catches, combo milestones).
*   **Accessibility:** Respects reducedMotion preference. `GameLogic.setReducedMotion()` disables the effect entirely.
*   **Integration:** Triggered from GameLogic on qualifying events.

### Combo Counter (v1.1.0)

*   **Location:** `src/game/components/ComboCounter.tsx`
*   **Pattern:** Tiered visual feedback system with escalating animations via anime.js.
*   **Milestones:** 5x, 10x, 15x trigger distinct SFX (combo5.ogg, combo10.ogg, combo15.ogg), camera FOV zoom pulse, and bank_fanfare.
*   **Camera Zoom:** FOV pulse on milestones, guarded by reducedMotion.
*   **Memory Safety:** anime.js animation refs tracked and cleaned up on unmount.
*   **Integration:** Receives reducedMotion prop via ScoreDisplay pass-through.

### Level Up Flash (v1.1.0)

*   **Location:** `src/game/components/LevelUpFlash.tsx`
*   **Pattern:** White flash overlay triggered on level transitions for visual punctuation.
*   **Integration:** Wired into GameScreen3D.

### Local Analytics (v1.1.0)

*   **SessionLog:** `src/game/analytics/SessionLog.ts` -- Records gameplay sessions to Capacitor storage.
  *   FIFO cap: 500 entries maximum.
  *   Storage validation: `Array.isArray` check on load.
  *   clearSessionHistory: Wired to UI button with confirmation dialog. Resets queue.
*   **CanvasChart:** `src/game/analytics/CanvasChart.ts` -- Custom canvas-based chart renderer.
  *   Responsive sizing via dynamic containerRef.
*   **StatsModal:** `src/game/components/StatsModal.tsx` -- 4 tabs (Overview/History/Charts/HeatMap).
  *   JSON export for data portability.
  *   Error boundary (try-catch) for resilience.
  *   z-index: z-[55] to layer correctly above game UI.
  *   Animation cleanup on unmount (anime.js ref tracking).

### Colorblind Filter (v1.1.0)

*   **Location:** `src/game/graphics/shaders/ColorblindFilter.ts`
*   **Pattern:** Post-processing shader using Machado 2009 color transformation matrices.
*   **Modes:** Protanopia, deuteranopia, tritanopia.
*   **Integration:** Wired into PostProcessEffects pipeline via NebraskaDiorama.

### Power-ups (v1.1.0)

*   **Types:**
  *   **Shield:** Absorbs 1 miss -- entity falls through without losing a life.
  *   **Slow Motion:** 0.5x speed multiplier on falling entities.
  *   **Score Frenzy:** 3x point multiplier applied per catch.
*   **UI Integration:** `getActivePowerUps()` returns current active power-ups. `onPowerUpStateChange` callback notifies UI of state transitions.
*   **Audio:** Power-up specific audio feedback is a TODO.

### Character Traits (v1.1.0)

*   **Location:** `src/game/characters.ts`
*   **Pattern:** Per-character gameplay modifiers that differentiate playstyles.
  *   **John:** Steady/slow -- 0.90x speed multiplier, 0.85x wobble multiplier. Forgiving for new players.
  *   **Mary:** Fast/jittery -- 1.10x speed multiplier, 1.15x wobble multiplier. High-risk, high-reward.

### Difficulty Rebalance (v1.1.0)

*   **maxLevel:** Raised from 25 to 999 for effectively infinite progression.
*   **Ramp:** Gentler difficulty curve -- slower escalation in early levels.
*   **Combo Window:** Extended from default to 3500ms, giving players more time to chain catches.
*   **Sensitivity Constants:** Extracted to named config constants for maintainability.

### PlayerGovernor (Dev-Only AI Player)

*   **Location:** `src/game/debug/PlayerGovernor.ts`
*   **Library:** Yuka (`GameEntity`, `StateMachine`, `State`, `Time`).
*   **FSM States:** IDLE (patrol center), PURSUING (chase falling animals), BANKING (deposit stack).
*   **Decision Logic:** `pickBestTarget()` scores falling entities by urgency (Y position) and reachability (distance from farmer). `shouldBank()` triggers at 4+ stacked (2+ if in danger).
*   **Activation:** `window.__DEV_API__.enableAutoPlay()` -- runs its own `requestAnimationFrame` loop.
*   **Purpose:** Allows automated gameplay observation for Chrome MCP screenshots, E2E tests, and AI-driven playtesting.

### DevAPI Singleton

*   **Location:** `src/game/debug/DevAPI.ts`
*   **Pattern:** Singleton attached to `window.__DEV_API__` in development builds. Provides:
  - Game state inspection (`getFullState()`, `getEntityCount()`)
  - Direct game control (`spawnAnimal()`, `setLives()`, `setInvincible()`)
  - Auto-play via PlayerGovernor (`enableAutoPlay()`, `disableAutoPlay()`)
  - State machine control (`startGame()`, `pauseGame()`, `resumeGame()`)
*   **Safety:** Dev-only. Not included in production builds.

## Critical Paths

*   **Model Loading:** `EntityRenderer.tsx` uses `SceneLoader` to import GLBs. It relies on the GLB containing valid materials/textures.
*   **Input Handling:** Mapped to ECS `InputComponent` to drive player velocity. Keybindings loaded from localStorage via `loadKeyBindings()`.
*   **AI -> Spawn Flow:** `DropController.update()` -> `SpawnDecision` -> `SpawningSystem` -> ECS Entity creation.
*   **Entity Lifecycle:** Entity created -> animation/physics active -> `startedAt` timestamp set -> `cleanupTransientEntities()` removes after threshold.
*   **Weather Flow:** Level changes -> `WeatherSystem.update()` -> state transition -> wind forces on entities + `WeatherEffects` particle rendering + ambient audio.
*   **Combo Flow:** Catch -> combo increment -> milestone check (5/10/15) -> SFX + camera FOV zoom + ComboCounter animation + HitStop freeze-frame.
*   **Analytics Flow:** Game session end -> `SessionLog.record()` -> Capacitor storage -> `StatsModal` reads on open -> `CanvasChart` renders.
*   **Accessibility Flow:** Settings change -> `GameLogic.setReducedMotion()` -> HitStop/ComboCounter/animations respect preference. Colorblind mode -> PostProcessEffects applies filter.
