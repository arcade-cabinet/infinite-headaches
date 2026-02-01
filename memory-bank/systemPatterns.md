# System Patterns

## Architecture: Hybrid ECS
The project employs a **Hybrid Entity Component System (ECS)** architecture to separate game logic from rendering.

### 1. ECS (Miniplex) - The "Source of Truth"
*   **State:** All game state (Position, Velocity, Player State, Animal Type) resides in Miniplex entities.
*   **Logic:** Systems (e.g., `MovementSystem`, `WobbleSystem`, `SpawningSystem`) operate on these components every frame to update the state.
*   **Location:** `src/game/ecs/`

### 2. Game Driver (`GameEngine`)
*   **Role:** Orchestrates the game loop. It handles the physics time step and calls the ECS systems.
*   **Location:** `src/game/engine/`

### 3. Renderer (React + Babylon.js)
*   **Role:** Strictly a **View Layer**. It subscribes to ECS entities and renders the corresponding 3D models using Babylon.js.
*   **Constraint:** View components MUST NOT contain game logic. They simply reflect the ECS state.
*   **Location:** `src/game/scene/` (e.g., `GameScene3D.tsx`, `NebraskaDiorama.tsx`)

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

## Critical Paths
*   **Model Loading:** `GameScene.tsx` / `GameScene3D.tsx` uses `SceneLoader` to import GLBs. It relies on the GLB containing valid materials/textures.
*   **Input Handling:** Mapped to ECS `InputComponent` to drive player velocity.
