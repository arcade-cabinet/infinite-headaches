# AI Agent Context for Homestead Headaches

## 🛑 CRITICAL INSTRUCTIONS (READ FIRST) 🛑

### 1. MEMORY BANK PROTOCOL
You MUST read the `memory-bank/` directory at the start of EVERY session.
*   `activeContext.md`: Contains the immediate state and **recent disasters**. Read this to avoid repeating mistakes.
*   `productContext.md`: Explains the "Tornado" theme. **Do not delete tornado-related files** without understanding this.
*   `systemPatterns.md`: Explains the ECS architecture and Asset Pipeline.

### 2. SAFETY FIRST
*   **NEVER** run `git checkout HEAD -- .` or `git reset --hard` without EXPLICIT user permission. You deleted user work once; do not do it again.
*   **CONFIRM DELETIONS:** Before deleting a file, check `grep` for imports AND consider its thematic value (e.g., `SplashScreen.tsx` plays the intro video).

### 3. THE "WHITE MODEL" BUG
*   Current focus is fixing `john.glb` and `mary.glb` rendering white.
*   The issue is in `scripts/bpy/export_farmer_models.py` or the textures themselves.
*   Do not try to "clean up" the codebase until this is fixed.

---

## Project Overview

**Homestead Headaches** is a cross-platform 3D tower-stacking arcade game.
*   **Tech:** React 19, Babylon.js, Miniplex ECS, Capacitor.
*   **Theme:** Nebraska farm, Tornado threat.

## Architecture
*   **Hybrid ECS:** `GameEngine` (Logic) -> Miniplex (State) -> `GameScene3D` (Babylon Render).
*   **Assets:** Blender pipeline converts FBX to GLB.

## Key Directories
*   `src/game/ecs`: Entity Component System.
*   `src/game/scene`: Babylon.js rendering components.
*   `scripts/bpy`: Python scripts for Blender automation (Critical for fixing models).
*   `public/assets`: Generated assets.

## Commands
*   `pnpm dev`: Start dev server.
*   `pnpm build`: Build for production.
*   `blender --background --python scripts/bpy/export_farmer_models.py`: Run model export.