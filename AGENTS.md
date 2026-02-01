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
*   **Native:** Capacitor.

## Key Directories
*   `src/features/core`: Entry point (`GameScreen3D`).
*   `src/features/gameplay`: Game Loop & Scene (`GameScene`).
*   `src/game/ecs`: Entity Component System.
*   `scripts/bpy`: Asset pipeline.

## Commands
*   `pnpm dev`: Start dev server.
*   `pnpm build`: Build for production.
*   `pnpm test:e2e`: Run Playwright tests.