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
src/
├── game/
│   ├── ai/                      # YUKA AI (Director, Governor, AutoPlayer)
│   ├── animals/                 # Animal definitions by type
│   │   ├── cow/variants/        # BrownCow (poop->bush ability)
│   │   ├── chicken/variants/    # fire_chicken, corn_chicken, etc.
│   │   ├── pig/variants/        # mud_pig, truffle_pig
│   │   └── sheep/variants/      # electric_sheep, rainbow_sheep
│   ├── ecs/                     # Miniplex ECS
│   │   ├── components/          # 20+ component types (Falling, Stacked, Frozen, etc.)
│   │   ├── systems/             # 9 systems (Movement, Wobble, Freeze, Projectile, etc.)
│   │   └── world.ts             # World Instance
│   ├── effects/                 # TornadoEffect, ParticleEffects
│   ├── entities/                # Animal, Fireball, FrozenAnimal, PowerUp, BossAnimal
│   ├── registry/                # AnimalRegistry (centralized, multi-LOD)
│   ├── scene/                   # Babylon.js Scene Integration
│   └── screens/                 # Splash, MainMenu, CharacterSelect, Game, GameOver
├── theme/tokens/                # Nebraska homestead colors
├── graphics/                    # Multi-LOD quality system
├── random/                      # Deterministic seeded RNG (Zustand store)
└── platform/                    # Cross-platform abstraction
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

## Recent Updates (Phase 12.2)

### ECS Component System
- **Full ECS Components:** 20+ component types defined in `src/game/ecs/components/index.ts`
  - Game state: FallingComponent, StackedComponent, BankingComponent, ScatteringComponent
  - Abilities: FrozenComponent, ProjectileComponent, BounceZoneComponent, AbilityComponent
  - Physics: WobbleComponent, SquishComponent
  - Entity types: PlayerComponent, BossComponent, MergedComponent
  - Animation: AnimationComponent with blend weights and transitions
- **ECS Systems:** 9 systems for game logic
  - MovementSystem, WobbleSystem, AnimationSystem
  - FreezeSystem, ProjectileSystem, BounceZoneSystem
  - AbilitySystem, StackingSystem, SpawningSystem

### AnimalRegistry
- **Centralized Definitions:** All animals defined in `src/game/registry/AnimalRegistry.ts`
- **Multi-LOD Support:** high/medium/low quality models per animal
- **Procedural Fallback:** Low quality uses procedural geometry (no GLB needed)
- **Variant System:** Special variants (fire_chicken, ice_duck, brown_cow, etc.)

### Brown Cow Ability
- **Poop Projectile:** Launches poop with arc trajectory
- **Bouncy Bush:** Poop grows procedural bush where it lands
- **Bounce Mechanic:** Falling animals bounce off bush back into play
- **Durability:** Bush tramples after 5 bounces, despawns after 30s

### Graphics Quality System
- **Quality Presets:** high/medium/low in `src/graphics/settings/`
- **Zustand Store:** Graphics settings persisted via Zustand
- **LOD Switching:** GraphicsManager handles quality changes at runtime

### Deterministic RNG
- **Seeded Random:** `src/random/seedrandom.ts` for reproducible gameplay
- **Zustand Store:** `src/random/store.ts` manages RNG state
- **Human-Readable Seeds:** Word-based seed names (e.g., "funky-tornado")

### Maestro E2E Testing
- **Mobile Testing:** `.maestro/flows/` contains E2E test flows
- **Character Matrix:** Tests both Farmer John and Farmer Mary
- **Quality Matrix:** Tests all graphics quality levels

## Known Gaps (3D Transition)
- **Physics Fidelity:** 3D collisions are currently approximated using the legacy 2D bounding boxes.
- **Wind Physics:** Tornado should apply lateral forces to falling animals.
- **Camera Effects:** Camera shake and zoom-outs for tall stacks not yet implemented.
- **Animal Reactions:** Animals should look at player, panic when wobbling.