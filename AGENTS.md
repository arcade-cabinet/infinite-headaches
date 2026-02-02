# AI Agent Context for Homestead Headaches

## STATUS: STABLE (RELEASE 1.1.0)
The project is in a stable state following the v1.1.0 feature expansion.
All E2E tests pass. 1267 unit tests across 34 files, 0 failures.
New systems: WeatherSystem, AnimalVariants, SessionLog, Keybindings, ColorblindFilter, HitStop, ComboCounter, LevelUpFlash.

## CRITICAL INSTRUCTIONS (READ FIRST)

### 1. MEMORY BANK PROTOCOL
You MUST read the `memory-bank/` directory at the start of EVERY session.
*   `activeContext.md`: The single source of truth for project status.
*   `techContext.md`: The architecture guide (Reactylon + Havok).

### 2. KNOWN TRAPS (DO NOT REPEAT)
*   **Havok Physics Loading:**
    *   **Trap:** `HavokPhysics()` fails silently or causes a "Blue then Brown screen" if the `GameScene` mounts before the plugin is ready.
    *   **Rule:** Always load Havok in `GameScreen3D` (parent) using `useEffect`.
    *   **Rule:** Always use relative path `locateFile: () => "./HavokPhysics.wasm"` to support subpath deployments.
    *   **Rule:** Always show a Loading Screen (`!isPhysicsReady`) until the plugin is initialized.
*   **Canvas Layout:**
    *   **Trap:** Canvas collapses to a "Tiny Corner" or has 0 height.
    *   **Rule:** `src/index.css` MUST enforce `html, body, #root, canvas { width: 100%; height: 100%; }`.
*   **Build & Runtime:**
    *   **Trap:** React 19 + `reactylon` causes `SyntaxError` or build crashes.
    *   **Rule:** `scripts/patch-reactylon.cjs` MUST run via `postinstall`.
    *   **Rule:** Do not remove the `postinstall` script.
*   **Anime.js Memory Leaks:**
    *   **Trap:** anime.js animations in ComboCounter, ScoreDisplay, and SettingsModal leak if not cleaned up on unmount.
    *   **Rule:** Always call `anime.remove()` in useEffect cleanup for any anime.js animation targets.

### 3. SAFETY FIRST
*   **NEVER** run `git checkout HEAD -- .` or `git reset --hard` without EXPLICIT user permission.
*   **Tests:** Always verify changes with `pnpm exec playwright test`.

---

## Architecture Summary
*   **Engine:** React 19 + `reactylon` (Babylon.js bindings).
*   **Physics:** Havok (WASM).
*   **State:** Miniplex (ECS) + Zustand.
*   **AI:** DropController (Yahtzee-aware type distribution, adaptive difficulty, 5 competing strategies) + WobbleGovernor.
*   **Weather:** WeatherSystem state machine (clear/windy/rainy/stormy) with BabylonJS particle effects.
*   **Analytics:** SessionLog (Capacitor storage, 500 FIFO cap) + CanvasChart + StatsModal.
*   **Accessibility:** ColorblindFilter (Machado 2009 matrices), High Contrast Mode, remappable keybindings, ARIA live regions.
*   **Native:** Capacitor.

## Key Directories
*   `src/features/core`: Entry point (`GameScreen3D`).
*   `src/features/gameplay`: Game Loop & Scene (`GameScene`), visual components (`DropIndicatorTornado`).
*   `src/game/ai`: AI systems (`DropController.ts`, `WobbleGovernor.ts`, `types.ts`).
*   `src/game/ecs`: Entity Component System.
*   `src/game/engine`: Game loop (`GameLogic.ts`).
*   `src/game/weather`: WeatherSystem state machine, wind forces, ambient audio.
*   `src/game/variants`: AnimalVariants (rare/golden/shadow tiers with PBR material tinting).
*   `src/game/analytics`: SessionLog recording, CanvasChart renderer, StatsModal.
*   `src/game/accessibility`: ColorblindFilter, HighContrastMode, keybinding persistence.
*   `src/game/effects`: HitStop freeze-frame, LevelUpFlash, ComboCounter animations.
*   `scripts/bpy`: Asset pipeline.

## AI System (DropController)
The `DropController` (`src/game/ai/DropController.ts`) is the unified AI director that manages:
*   **Spawn timing & positioning** based on logarithmic difficulty curves.
*   **Yahtzee-aware type selection**: Analyzes current stack composition and chooses animal types that help or challenge combo building (pair, three_of_kind, full_house, straight, flush, etc.).
*   **Fairness remediation**: After consecutive disruptive drops, compensates with helpful types or power-ups.
*   **5 competing strategies**: build_pressure, release_tension, challenge, mercy, reward — weighted by player model (skill, frustration, engagement, fatigue).
*   **Tornado position**: Drives the `DropIndicatorTornado` visual component showing where the next animal drops.

## New Systems (v1.1.0)

### WeatherSystem
*   State machine: clear -> windy -> rainy -> stormy (activates at level 6+).
*   Wind forces applied to falling entities during windy/rainy/stormy states.
*   BabylonJS particle effects for rain and wind visuals.
*   Wobble bonus during storms for increased difficulty.
*   Ambient audio loops with fade transitions between weather states.

### AnimalVariants
*   **Rare** (level 3+): Blue tint, 1.5x score multiplier.
*   **Golden** (level 8+): Gold tint, 3x score multiplier.
*   **Shadow** (level 15+): Dark tint, 5x score multiplier.
*   PBR material tinting applied via BabylonJS materials.

### HitStop
*   Freeze-frame effect on perfect catches and combo milestones.
*   Respects `reducedMotion` user preference.

### SessionLog & StatsModal
*   SessionLog records gameplay data to Capacitor storage (500 session FIFO cap).
*   CanvasChart pure canvas renderer (line/bar/heatmap chart types).
*   StatsModal with 4 tabs: Overview, History, Charts, HeatMap.
*   JSON export and clear history functionality.

### Keybindings
*   Remappable keybindings with `loadKeyBindings`/`saveKeyBindings`/`resetKeyBindings`.
*   Persisted to local storage.

### ColorblindFilter
*   Protanopia, deuteranopia, tritanopia post-processing filters.
*   Implemented via Machado 2009 color transformation matrices.

### Character Traits
*   **Farmer John** (steady/slow): 0.90x speed, 0.85x wobble.
*   **Farmer Mary** (fast/jittery): 1.10x speed, 1.15x wobble.

## Dev Tooling (Dev-Only)

### DevAPI (`src/game/debug/DevAPI.ts`)
*   **Access:** `window.__DEV_API__` in development builds.
*   **State inspection:** `getFullState()`, `getEntityCount()`, `getStackHeight()`.
*   **Game control:** `startGame()`, `pauseGame()`, `resumeGame()`, `triggerGameOver()`.
*   **Spawning:** `spawnAnimal(type, x)`, `setLives(n)`, `setInvincible(bool)`.
*   **Auto-play:** `enableAutoPlay()` / `disableAutoPlay()` — activates `PlayerGovernor`.

### PlayerGovernor (`src/game/debug/PlayerGovernor.ts`)
*   **Library:** Yuka (`GameEntity`, `StateMachine`, `State`, `Time`).
*   **Purpose:** AI that plays the game automatically — drives farmer to catch animals and bank stacks.
*   **FSM States:** IDLE (patrol center), PURSUING (chase nearest falling animal), BANKING (deposit stack).
*   **Activation:** Via DevAPI `enableAutoPlay()`. Runs its own `requestAnimationFrame` loop.
*   **Use Case:** Chrome MCP visual verification, E2E testing, automated playtesting.

### Chrome MCP Verification Workflow
1.  Navigate to `localhost:5173` and start Endless mode.
2.  Run `window.__DEV_API__.enableAutoPlay()` and `window.__DEV_API__.setInvincible(true)`.
3.  Take screenshots to verify visual elements (tornado, scaling, entity count).
4.  **Note:** Chrome throttles rAF for non-focused tabs. Use `setInterval` keep-alive to maintain game state.

## Commands
*   `pnpm dev`: Start dev server.
*   `pnpm build`: Build for production.
*   `pnpm test:run`: Run unit tests (Vitest, 1267 tests across 34 files).
*   `pnpm test:e2e`: Run Playwright E2E tests (36 tests across 4 spec files).
