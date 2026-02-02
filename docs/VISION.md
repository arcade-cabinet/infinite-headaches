# Homestead Headaches - Project Vision

## Core Identity
**Homestead Headaches** is a chaotic, physics-driven 3D stacking game where players must save farm animals from an impending tornado by stacking them as high as possible. It is a re-imagining of the "Infinite Headaches" prototype, shifting from a 2D "Duck Stack" to a vibrant, low-poly 3D farm experience.

## Creative Direction

### Theme
- **Setting:** A stylized, low-poly farmstead in the path of a swirling vortex.
- **Tone:** Whimsical, frantic, and "wobbly."
- **Visual Style:**
    - **Models:** CC0 Low-poly, vertex-colored assets (Kenney-style).
    - **Palette:** Vibrant farm colors (Greens, Earth tones, Barn Reds) shifting to stormy purples/greys as the tornado approaches.
    - **Effects:** Wind streaks, dust clouds, and "headache" swirls using particle systems.

### The "Headache" Mechanic
The "Headache" is no longer just a metaphor for difficulty—it is the **Tornado**.
- **The Threat:** A massive, swirling vortex in the background that grows closer/larger as the game progresses (or as the player struggles).
- **The Goal:** Build a stack of animals to reach the "Eye of the Storm" or simply survive the chaos.
- **Failure:** The stack topples, and the animals are sucked into the tornado (comically).

## Technical Pillars

### 1. Hybrid ECS Architecture
We use a hybrid approach to state management:
- **Miniplex (ECS):** The source of truth for all game entities (Position, Rotation, Scale, Velocity, Tags).
- **GameEngine (Driver):** A logic-only class that runs the game loop, physics calculations, and AI, then *synchronizes* data to the ECS world.
- **Babylon.js (Renderer):** Strictly a view layer. It reads from ECS entities and renders 3D models. **NO GAME LOGIC** lives in the view components.

### 2. "No Fallbacks" Rendering
We commit fully to the 3D pipeline.
- **Rule:** If an asset is missing, we fix the pipeline. We do *not* fallback to 2D sprites or colored rectangles.
- **Asset Flow:** `.fbx` (Source) -> Blender Script (Vertex Color Preservation) -> `.glb` (Runtime).
- **Transparency:** The 3D scene runs on a transparent background, layered over a separate dynamic background canvas (for sky/tornado effects).

### 3. Adaptive AI Director
- **DropController:** A unified AI director that manages spawn timing, animal type selection, difficulty, and the tornado drop indicator.
- **Yahtzee-Aware Drops:** Animals are chosen based on current stack composition, helping players build combos (pairs, three-of-a-kind, full house, straights, flushes) with fairness remediation after disruptive drops.
- **WobbleGovernor:** Independently manages wobble difficulty scaling based on player skill.
- **Context:** The AI manages difficulty through 5 competing strategies (build_pressure, release_tension, challenge, mercy, reward), adjusting spawn rates and patterns based on a player model tracking skill, frustration, engagement, and fatigue.

## Roadmap

### Phase 1: The Foundation (Complete)
- [x] Rebrand to "Homestead Headaches".
- [x] Establish ECS + Babylon.js architecture.
- [x] Implement 3D Asset Pipeline (FBX -> GLB).
- [x] Port core stacking physics to 3D.
- [x] Nebraska homestead color palette (barnRed, wheat, soil, wood, sky, storm).
- [x] AnimalRegistry with multi-LOD support (high/medium/low quality).
- [x] Full ECS component system (20+ component types).
- [x] Deterministic seeded RNG system.
- [x] Farmer John & Farmer Mary player characters.

### Phase 2: The Storm (In Progress)
- [x] Implement the **Tornado** visual effect (Particle system in TornadoEffect.ts).
- [x] StormAtmosphere: Dynamic lighting that shifts based on storm intensity.
- [ ] "Wind" physics: Lateral forces applied to the stack based on tornado proximity.

### Phase 3: Farm Life (In Progress)
- [x] Animal variants with special abilities:
  - Fire Chicken (fireball projectile)
  - Ice Duck (freeze nearby animals)
  - Brown Cow (poop -> bouncy bush)
  - Golden Pig (3x points)
  - Heavy Cow (2x points, destabilizes)
- [x] BounceZone mechanic: Bush bounce pads from Brown Cow ability.
- [ ] Animal "Reactions": Animals look at the player, panic when wobbling, or celebrate when banked.
- [ ] "Barn" Banking mechanic: Visually throw the stack into a barn silo.

### Phase 4: Polish & Juice
- [ ] Camera shake and zoom-outs for tall stacks.
- [x] SquishComponent: Squish animation state for landing impacts.
- [ ] "Squish" and "Stretch" shader effects for landing impacts.
- [ ] Spatial 3D Audio (Tone.js positional sounds).

### Phase 5: Testing & Quality
- [x] Maestro E2E test flows for character selection and graphics quality.
- [x] Multi-LOD graphics testing (high/medium/low).
- [x] 1077 unit tests across 26 files (AnimationSystem, SpawningSystem, WobbleGovernor, archetypes, components, abilities, responsive scale, DropController, types).
- [x] DevAPI + PlayerGovernor for automated gameplay observation.
- [x] Chrome MCP visual verification workflow.
- [ ] Full gameplay E2E test coverage (Maestro flows for all mechanics).

### Phase 6: AI Director & Drop System (Complete)
- [x] DropController: Unified AI replacing YUKA-based GameDirector.
- [x] Yahtzee-aware animal type distribution with fairness remediation.
- [x] DropIndicatorTornado: Procedural twisted funnel tornado showing next drop position.
- [x] 5 competing strategies with player model (skill, frustration, engagement, fatigue).
- [x] Comprehensive unit tests (940 tests across 22 files).

### Phase 7: Playability Fixes & Dev Tooling (Complete)
- [x] Animal scale rebalance: cow 1.15, pig 0.85, chicken 0.5, duck 0.55, sheep 1.0 (farmer 2.5).
- [x] Tornado ribbon rewrite: Procedural `CreateRibbon` twisted funnel + 3 spiral bands replacing geometric cone.
- [x] Entity lifecycle cleanup: Banking/scattering entities auto-removed after animation duration.
- [x] PlayerGovernor: Yuka-powered AI auto-player with FSM (IDLE/PURSUING/BANKING).
- [x] DevAPI: `window.__DEV_API__` singleton for runtime debugging and auto-play.
- [x] Chrome MCP visual verification: Full gameplay verified with AI auto-play.
- [x] 1077 tests across 26 files.
