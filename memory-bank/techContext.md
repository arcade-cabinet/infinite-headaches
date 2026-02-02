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

## Physics Engine
*   **Engine:** Havok Physics (v1.3.11).
*   **Integration:** `@babylonjs/havok` (WASM).
*   **Sync Strategy:** `EntityRenderer` synchronizes Havok Bodies (Physics) with Miniplex ECS (Logic) and Babylon Meshes (View).
    *   Falling: `PhysicsMotionType.DYNAMIC`.
    *   Stacked/Player: `PhysicsMotionType.KINEMATIC`.
*   **Per-Type Mass:** `PhysicsAggregate` mass reads from `ANIMAL_TYPES[type].weight` (cow: 2.0, chicken: 0.3).
*   **Physics Floor:** Invisible collision plane at Y=-4 catches entities that fall below the play area.

## Game Logic
*   **ECS:** Miniplex (Hybrid Architecture).
*   **AI:** DropController (Yahtzee-aware type distribution, adaptive difficulty) + WobbleGovernor.
*   **State:** Zustand (Store).
*   **Entity Lifecycle:** `GameLogic.cleanupTransientEntities()` removes banking/scattering entities by timestamp thresholds.

## Dev Tooling
*   **DevAPI:** `window.__DEV_API__` singleton (dev-only) for runtime debugging, state inspection, spawning controls.
*   **PlayerGovernor:** Yuka-powered AI auto-player (`GameEntity` + `StateMachine` + `State` + `Time`). FSM: IDLE/PURSUING/BANKING.
*   **Yuka Library:** Used only by PlayerGovernor for FSM and time management. Dev-only dependency.
*   **Chrome MCP:** Browser automation for visual verification — screenshots of live gameplay with AI auto-play.

## Mobile / Native
*   **Framework:** Capacitor 8.
*   **Platforms:** Android, iOS, Electron (Desktop).
*   **Build Type:** `viteSingleFile` for Capacitor.

## Build System & Patches
*   **Patch:** `scripts/patch-reactylon.cjs` (Postinstall).
    *   Fixes `babel-plugin-reactylon` iterable crash.
    *   Stubs `renderToStaticMarkup` for React 19 compatibility.

## Project Structure
```
/
├── src/
│   ├── game/
│   │   ├── ai/           # AI Systems (DropController, WobbleGovernor, GameDirector)
│   │   ├── characters.ts # Character definitions (Farmer John, Farmer Mary)
│   │   ├── config.ts     # All game constants + ANIMAL_TYPES with modelScale/weight
│   │   ├── debug/         # Dev-only tools (DevAPI, PlayerGovernor)
│   │   ├── ecs/          # Miniplex Components & Systems
│   │   │   ├── components/ # Entity Data (20+ component types)
│   │   │   ├── systems/    # Logic (Spawning, Stacking, Animation, Wobble, etc.)
│   │   │   └── archetypes.ts # Entity factory functions
│   │   ├── engine/       # Game Loop (GameLogic) + entity lifecycle
│   │   └── hooks/        # React Hooks (Game Logic, Scaling)
│   ├── features/         # Feature-based Modules
│   │   ├── core/         # GameScreen3D, App Entry, responsive hooks
│   │   ├── gameplay/     # GameScene, visual components
│   │   │   └── scene/components/ # EntityRenderer, DropIndicatorTornado,
│   │   │                         # FarmerTrack, GameBoardOverlay, GraphicsIntegration
│   │   ├── menu/         # MainMenu3D, MainMenuOverlay, CharacterSelect
│   │   └── splash/       # SplashScene
│   ├── platform/         # Native abstractions (Haptics, Storage, Audio)
│   └── assets/           # 2D Images
├── public/
│   ├── assets/
│   │   ├── models/       # 3D GLB Models (cow, pig, chicken, duck, sheep, farmer_john, farmer_mary)
│   │   └── audio/        # Audio Files (Kenney library)
│   └── HavokPhysics.wasm # Physics Engine
├── .maestro/             # Maestro E2E test flows
└── scripts/
    └── patch-reactylon.cjs # Critical Build Patch
```

## Development Environment
*   **OS:** Darwin (macOS).
*   **Git:** Version control.
*   **Tests:** Vitest (Unit, 1077 tests across 26 files) + Maestro (E2E device flows).
