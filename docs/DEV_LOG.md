# Infinite Headaches -> Homestead Headaches - Development Log

## Project Overview
A physics-based 3D stacking game featuring low-poly farm animals, built with React, Miniplex (ECS), and Babylon.js.

---

## Evolution Timeline

### Phases 1-11 (Legacy 2D)
*See historical logs for the evolution of the 2D "Psyduck" prototype.*

---

### Phase 12: The 3D Rebirth ("Homestead Headaches")
**Major pivot from 2D Canvas to 3D ECS Architecture.**

#### Core Changes
- **Rebranding:** Renamed to "Homestead Headaches". Theme shifted from Pokémon/Ducks to Farm Animals vs. Tornado.
- **Tech Stack:**
    - **Logic:** `GameEngine` now drives a **Miniplex** ECS world.
    - **Rendering:** Replaced 2D Context API with **Babylon.js**.
    - **Assets:** Implemented an automated pipeline (`scripts/bpy/`) to convert FBX assets to GLB while preserving vertex colors.
- **Rendering Policy:** Enforced a "No Fallbacks" rule. Removed all legacy sprite rendering code to ensure visual consistency in 3D.

#### Architecture
- **Entities:** Animals are now 3D GLTF models (`cow.glb`, `pig.glb`, etc.) with vertex-colored shaders.
- **Scene Graph:**
    1.  **Background:** 2D Canvas (Sky/Atmosphere).
    2.  **GameScene:** Babylon.js 3D layer (Transparent background, hosting Entities).
    3.  **UI:** React Overlay (HUD, Menus).

#### Features
- **Hybrid Sync:** Physics runs in `GameEngine` (deterministic-ish) and syncs `Position/Rotation` to ECS components for rendering.
- **Asset Pipeline:** Blender Python script automates `FBX -> GLB` conversion, ensuring low-poly assets are game-ready.

---

## Current Architecture

```
src/game/
├── ai/                      # YUKA AI (Director, Governor)
├── assets/                  # Asset mappings (Images, Models)
├── components/              # React UI Components
├── ecs/                     # Miniplex ECS
│   ├── components/          # ECS Component Definitions
│   ├── systems/             # ECS Systems (Movement, Wobble)
│   ├── archetypes.ts        # Entity Factories
│   └── world.ts             # World Instance
├── engine/                  # Core Game Loop (Logic Driver)
├── entities/                # Logic Entities (Physics/State)
├── scene/                   # Babylon.js Scene Integration
└── screens/                 # Application Screens
```

## Recent Updates (Phase 12.1)

### Character System
- **Farmer John & Farmer Mary**: Updated character system with proper Nebraska homestead couple
- **Kenney Assets**: Integrated Kenney Animated Characters Bundle (characterMedium with farmerA/farmerB skins)
- **GLB Export Pipeline**: New farmer_john.glb and farmer_mary.glb with animations

### 3D Visual Effects
- **TornadoEffect.ts**: Procedural 3D tornado using Babylon.js particle systems
  - Multiple particle layers: funnel, debris, wind streaks, base glow, dust cloud
  - Intensity control (0-1) for AI Director integration
- **StormAtmosphere**: Dynamic lighting that shifts based on storm intensity
- **Animation System**: Full skeletal animation support via Babylon.js AnimationGroups

### Infrastructure
- **Netlify Deployment**: PWA deploys to https://homestead-headaches.netlify.app
- **CI/CD Pipeline**: GitHub Actions workflow for automated builds
- **ECS Systems Enabled**: GameSystems now properly runs in Babylon render loop

## Known Gaps (3D Transition)
- **Physics Fidelity:** 3D collisions are currently approximated using the legacy 2D bounding boxes.
- **Wind Physics:** Tornado should apply lateral forces to falling animals.
- **Camera Effects:** Camera shake and zoom-outs for tall stacks not yet implemented.