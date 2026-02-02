# AI Agent Context for Homestead Headaches

## 🟢 STATUS: STABLE (RELEASE 1.0)
The project is in a stable state following a massive refactor to `reactylon` and Havok Physics.
All E2E tests pass. The "White Model" bug and "Git Disaster" are resolved history.

## 🛑 CRITICAL INSTRUCTIONS (READ FIRST) 🛑

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

### 3. SAFETY FIRST
*   **NEVER** run `git checkout HEAD -- .` or `git reset --hard` without EXPLICIT user permission.
*   **Tests:** Always verify changes with `pnpm exec playwright test`.

---

## Architecture Summary
*   **Engine:** React 19 + `reactylon` (Babylon.js bindings).
*   **Physics:** Havok (WASM).
*   **State:** Miniplex (ECS) + Zustand.
*   **AI:** DropController (Yahtzee-aware type distribution, adaptive difficulty, 5 competing strategies) + WobbleGovernor.
*   **Native:** Capacitor.

## Key Directories
*   `src/features/core`: Entry point (`GameScreen3D`).
*   `src/features/gameplay`: Game Loop & Scene (`GameScene`), visual components (`DropIndicatorTornado`).
*   `src/game/ai`: AI systems (`DropController.ts`, `WobbleGovernor.ts`, `types.ts`).
*   `src/game/ecs`: Entity Component System.
*   `src/game/engine`: Game loop (`GameLogic.ts`).
*   `scripts/bpy`: Asset pipeline.

## AI System (DropController)
The `DropController` (`src/game/ai/DropController.ts`) is the unified AI director that manages:
*   **Spawn timing & positioning** based on logarithmic difficulty curves.
*   **Yahtzee-aware type selection**: Analyzes current stack composition and chooses animal types that help or challenge combo building (pair, three_of_kind, full_house, straight, flush, etc.).
*   **Fairness remediation**: After consecutive disruptive drops, compensates with helpful types or power-ups.
*   **5 competing strategies**: build_pressure, release_tension, challenge, mercy, reward — weighted by player model (skill, frustration, engagement, fatigue).
*   **Tornado position**: Drives the `DropIndicatorTornado` visual component showing where the next animal drops.

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
*   `pnpm test:run`: Run unit tests (Vitest, 1077 tests across 26 files).
*   `pnpm test:e2e`: Run Playwright tests.