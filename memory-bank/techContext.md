# Tech Context

## Core Stack
*   **Runtime:** Node.js (Development), Browser/WebView (Production).
*   **Language:** TypeScript (Strict mode).
*   **Framework:** React 19.
*   **Build Tool:** Vite 6.
*   **Package Manager:** pnpm.

## Rendering Engine
*   **Library:** Babylon.js 8.
*   **Bindings:** `react-babylonjs`.
*   **Format:** GLTF/GLB (Binary glTF).

## Game Logic
*   **ECS:** Miniplex.
*   **AI:** YUKA (for Game Director/Difficulty scaling).
*   **Physics:** Custom verlet/euler integration for wobble (not using a heavy physics engine like Cannon/Havok for the core stack mechanic to maintain arcade feel).

## Mobile / Native
*   **Framework:** Capacitor 8.
*   **Platforms:** Android, iOS, Electron (Desktop).

## Project Structure
```
/
├── src/
│   ├── game/
│   │   ├── ecs/          # Miniplex Components & Systems
│   │   ├── engine/       # Game Loop & Director
│   │   ├── scene/        # Babylon.js View Components
│   │   ├── screens/      # React UI Screens (Menu, HUD)
│   │   └── config.ts     # Game Tuning Constants
│   ├── platform/         # Native abstractions
│   └── assets/           # 2D Images
├── public/
│   └── assets/
│       ├── models/       # 3D GLB Models
│       └── audio/        # Audio Files
├── scripts/
│   └── bpy/              # Blender Export Scripts (Python)
└── Farmers_Family/       # Raw Source Assets (FBX)
```

## Development Environment
*   **OS:** Darwin (macOS).
*   **Blender:** Used for asset conversion.
*   **Git:** Version control (critical for recovery).
