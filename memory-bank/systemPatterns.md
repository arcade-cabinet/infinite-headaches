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

### Platform Abstraction
*   **Module:** `src/platform/`
*   **Purpose:** Unified interface for Haptics, Storage, and Audio that delegates to either Web APIs or Capacitor plugins depending on the runtime environment.

### AI Director (DropController)
*   **Location:** `src/game/ai/DropController.ts`
*   **Role:** Unified AI that manages spawn timing, animal type selection, difficulty scaling, and drop positioning.
*   **Yahtzee-Aware Type Selection:** Analyzes current stack composition and chooses animal types that help or challenge combo building (pair, two_pair, three_of_kind, four_of_kind, full_house, straight, flush).
*   **Fairness Remediation:** After 2 consecutive disruptive drops, compensates with helpful types or power-ups.
*   **5 Competing Strategies:** build_pressure, release_tension, challenge, mercy, reward — weighted by player model (skill, frustration, engagement, fatigue).
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
*   **Effect:** Prevents entity accumulation — active entity count stays at ~15 during gameplay instead of growing unbounded.

### Per-Type Entity Configuration
*   **Location:** `src/game/config.ts` (`ANIMAL_TYPES` record)
*   **Fields per type:** `color`, `spawnWeight`, `weight` (physics mass), `modelScale`, `ability`, `hasModel`.
*   **Scale tuning:** Animals (0.5-1.15) are clearly smaller than the farmer (2.5) so stacks are readable.
*   **Integration:** `createAnimal()` and `createFallingAnimal()` in `archetypes.ts` read `modelScale` and `weight` from config.

### PlayerGovernor (Dev-Only AI Player)
*   **Location:** `src/game/debug/PlayerGovernor.ts`
*   **Library:** Yuka (`GameEntity`, `StateMachine`, `State`, `Time`).
*   **FSM States:** IDLE (patrol center), PURSUING (chase falling animals), BANKING (deposit stack).
*   **Decision Logic:** `pickBestTarget()` scores falling entities by urgency (Y position) and reachability (distance from farmer). `shouldBank()` triggers at 4+ stacked (2+ if in danger).
*   **Activation:** `window.__DEV_API__.enableAutoPlay()` — runs its own `requestAnimationFrame` loop.
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
*   **Input Handling:** Mapped to ECS `InputComponent` to drive player velocity.
*   **AI → Spawn Flow:** `DropController.update()` → `SpawnDecision` → `SpawningSystem` → ECS Entity creation.
*   **Entity Lifecycle:** Entity created → animation/physics active → `startedAt` timestamp set → `cleanupTransientEntities()` removes after threshold.
