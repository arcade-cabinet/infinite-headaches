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
*   **Format:** GLTF/GLB (Binary glTF) + Procedural Meshes.
*   **Environment:** Hybrid 3D (3D Menu + Gameplay).

## Physics Engine
*   **Engine:** Havok Physics (v1.3.11).
*   **Integration:** `@babylonjs/havok` (WASM).
*   **Sync Strategy:** `EntityRenderer` synchronizes Havok Bodies (Physics) with Miniplex ECS (Logic) and Babylon Meshes (View).
    *   Falling: `PhysicsMotionType.DYNAMIC`.
    *   Stacked/Player: `PhysicsMotionType.KINEMATIC`.

## Game Logic
*   **ECS:** Miniplex (Hybrid Architecture).
*   **AI:** YUKA (Game Director).
*   **State:** Zustand (Store).

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
│   │   ├── ecs/          # Miniplex Components & Systems
│   │   │   ├── components/ # Entity Data
│   │   │   └── systems/    # Logic (Spawning, Stacking, Abilities)
│   │   ├── engine/       # Game Loop & Director
│   │   └── hooks/        # React Hooks (Game Logic, Scaling)
│   ├── features/         # Feature-based Modules
│   │   ├── core/         # GameScreen3D, App Entry
│   │   ├── gameplay/     # GameScene, GameElements3D
│   │   ├── menu/         # MainMenu3D, CharacterSelect
│   │   └── splash/       # SplashScene
│   ├── platform/         # Native abstractions
│   └── assets/           # 2D Images
├── public/
│   ├── assets/
│   │   ├── models/       # 3D GLB Models
│   │   └── audio/        # Audio Files
│   └── HavokPhysics.wasm # Physics Engine
└── scripts/
    └── patch-reactylon.cjs # Critical Build Patch
```

## Development Environment
*   **OS:** Darwin (macOS).
*   **Git:** Version control.
*   **Tests:** Playwright (E2E), Vitest (Unit).
