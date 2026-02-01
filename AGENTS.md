# AGENTS.md - AI Agent Context for Homestead Headaches

## Project Overview

**Homestead Headaches** is a cross-platform 3D tower-stacking arcade game built with React, TypeScript, Babylon.js, Miniplex ECS, and Capacitor. Players control a farmer to catch falling farm animals, building precarious stacks while managing wobble physics, special abilities, and power-ups. The game features a Nebraska homestead theme with a tornado as the central threat.

**Platforms:** Web/PWA, Android, iOS, Desktop (Electron)

## Tech Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| React | 19.x | UI framework |
| TypeScript | 5.9+ | Type safety |
| Vite | 6.x | Build tool |
| Babylon.js | 8.x | 3D rendering engine |
| react-babylonjs | 3.2.x | React bindings for Babylon.js |
| Miniplex | 2.x | Entity Component System (ECS) |
| Zustand | 5.x | UI state management |
| Tone.js | 15.x | Audio synthesis (dev fallback) |
| YUKA | 0.7.8 | AI/goal-driven behavior |
| Capacitor | 8.x | Cross-platform native |
| Tailwind CSS | 4.x | Styling |
| Biome | 2.3.x | Linting & formatting |
| Vitest | 4.x | Unit testing |
| Maestro | - | Mobile E2E testing |

## Architecture

### Hybrid ECS Architecture
The game uses a hybrid approach to state management:
- **Miniplex (ECS):** Source of truth for all game entities (Position, Rotation, Scale, Velocity, Tags)
- **GameEngine (Driver):** Logic-only class that runs game loop, physics, and AI, then syncs to ECS
- **Babylon.js (Renderer):** Strictly a view layer that reads from ECS entities. NO GAME LOGIC in view components
- **Zustand:** UI state management (graphics settings, seeded RNG, user preferences)

```
src/
├── game/
│   ├── ai/                    # YUKA-powered AI systems
│   │   ├── GameDirector.ts    # Orchestrates spawning, difficulty, power-ups
│   │   ├── WobbleGovernor.ts  # Controls stack wobble based on game state
│   │   └── DuckBehavior.ts    # Animal steering behaviors
│   │
│   ├── animals/               # Animal definitions organized by type
│   │   ├── types.ts           # Shared animal type definitions
│   │   ├── cow/
│   │   │   ├── config.ts      # Cow stats and properties
│   │   │   ├── components.ts  # Cow-specific ECS components
│   │   │   ├── systems.ts     # Cow-specific systems
│   │   │   └── variants/      # BrownCow (poop->bush ability)
│   │   ├── chicken/
│   │   │   └── variants/      # fire_chicken, corn_chicken, etc.
│   │   ├── pig/
│   │   │   └── variants/      # mud_pig, truffle_pig
│   │   └── sheep/
│   │       └── variants/      # electric_sheep, rainbow_sheep
│   │
│   ├── ecs/                   # Miniplex ECS layer
│   │   ├── components/        # All ECS component definitions
│   │   │   └── index.ts       # FallingComponent, StackedComponent, FrozenComponent, etc.
│   │   ├── systems/           # ECS systems
│   │   │   ├── MovementSystem.ts
│   │   │   ├── WobbleSystem.ts
│   │   │   ├── FreezeSystem.ts
│   │   │   ├── ProjectileSystem.ts
│   │   │   ├── BounceZoneSystem.ts
│   │   │   ├── AbilitySystem.ts
│   │   │   ├── StackingSystem.ts
│   │   │   ├── SpawningSystem.ts
│   │   │   └── AnimationSystem.ts
│   │   └── world.ts           # Miniplex World instance
│   │
│   ├── registry/
│   │   └── AnimalRegistry.ts  # Centralized animal definitions with multi-LOD support
│   │
│   ├── entities/              # Entity logic classes
│   │   ├── Animal.ts          # Base animal entity
│   │   ├── Fireball.ts        # Projectile entity
│   │   ├── FrozenAnimal.ts    # Frozen state entity
│   │   ├── PowerUp.ts         # Collectible items
│   │   └── BossAnimal.ts      # Boss variants
│   │
│   ├── effects/               # Visual effects
│   │   ├── TornadoEffect.ts   # Procedural tornado with particle systems
│   │   └── ParticleEffects.ts # Spawn, impact, ability particles
│   │
│   ├── scene/                 # Babylon.js scene components
│   │   ├── GameScene.tsx      # Main 3D scene container
│   │   └── FarmEnvironment.tsx # Farm background elements
│   │
│   ├── hooks/                 # React-game integration
│   ├── components/            # UI components (HUD, buttons, indicators)
│   ├── screens/               # Menu, Game, GameOver screens
│   └── config.ts              # All game constants
│
├── platform/                  # Cross-platform abstraction layer
│   ├── haptics.ts             # @capacitor/haptics wrapper
│   ├── storage.ts             # @capacitor/preferences wrapper
│   ├── audio.ts               # Pre-rendered OGG playback
│   ├── feedback.ts            # Unified audio + haptics API
│   ├── input.ts               # Touch/mouse input handling
│   ├── device.ts              # Device detection
│   └── app-lifecycle.ts       # Pause/resume, back button
│
├── theme/                     # Nebraska homestead theming
│   └── tokens/
│       └── colors.ts          # barnRed, wheat, soil, wood, sky, storm palettes
│
├── graphics/                  # Multi-LOD graphics system
│   ├── settings/
│   │   ├── types.ts           # QualityLevel type
│   │   ├── presets.ts         # high/medium/low presets
│   │   └── storage.ts         # Persist quality settings
│   └── manager/
│       └── GraphicsManager.ts # LOD switching logic
│
├── random/                    # Deterministic RNG
│   ├── seedrandom.ts          # Seeded RNG implementation
│   ├── store.ts               # Zustand store for RNG state
│   └── wordPools.ts           # Human-readable seed names
│
├── components/ui/             # shadcn/ui components
└── App.tsx                    # Main app entry

# Native project directories
android/                       # Capacitor Android project
ios/                          # Capacitor iOS project
electron/                     # Capacitor Electron project
.maestro/                     # Maestro E2E test flows
public/assets/
  ├── models/                 # GLB 3D models
  ├── audio/                  # Pre-rendered audio (OGG)
  └── textures/               # Texture assets
```

## Key Systems

### 1. ECS Components (`src/game/ecs/components/`)

All game state is represented as ECS components:

| Component | Purpose |
|-----------|---------|
| `FallingComponent` | Entity falling from sky (targetX, behaviorType, spawnTime) |
| `StackedComponent` | Entity in the stack (stackIndex, stackOffset, baseEntityId) |
| `FrozenComponent` | Entity frozen in ice (freezeTimer, crackStage, thawProgress) |
| `ProjectileComponent` | Projectile entity (type: fireball/corn/poop, direction, speed) |
| `BounceZoneComponent` | Temporary bounce zone (bounceForce, expiresAt, radius) |
| `AbilityComponent` | Special ability (abilityId, cooldownMs, lastUsed, charges) |
| `WobbleComponent` | Wobble physics (offset, velocity, damping, springiness) |
| `PlayerComponent` | Player-controlled base (characterId, isDragging, smoothedVelocity) |
| `BossComponent` | Boss animal (bossType, health, reward) |
| `AnimationComponent` | Animation state (currentAnimation, isPlaying, blendWeight) |

### 2. AnimalRegistry (`src/game/registry/AnimalRegistry.ts`)

Centralized definitions for all animals with multi-LOD support:

```typescript
// Quality levels
type QualityLevel = "high" | "medium" | "low";

// Each animal has LOD-specific models
models: {
  high: { glbPath: "cow.glb", scale: 1.0 },
  medium: { glbPath: "cow.glb", scale: 0.9 },
  low: { glbPath: null, procedural: { shape: "capsule", color: ... } }
}

// API
getAnimal(id: string)           // Get animal definition
getSpawnableAnimals()           // Animals with spawnWeight > 0
getVariants(baseAnimalId)       // Get all variants of base animal
pickRandomAnimal(levelBonus)    // Weighted random pick
getModelPath(id, quality)       // Get GLB path for quality level
```

### 3. Platform Abstraction (`src/platform/`)

Unified APIs that work across all platforms:

```typescript
import { feedback, haptics, storage, platform } from "@/platform";

// Unified audio + haptics
feedback.play("perfect");    // Plays sound + triggers haptic
feedback.startMusic();       // Background music
feedback.setIntensity(0.7);  // Dynamic music intensity

// Storage (Capacitor Preferences on native, localStorage on web)
await storage.set("highScore", 1000);
const score = await storage.get<number>("highScore");

// Platform detection
platform.isNative();         // true on iOS/Android/Electron
platform.getPlatform();      // "ios" | "android" | "web" | "electron"
```

### 4. Deterministic RNG (`src/random/store.ts`)

Zustand store for reproducible randomness:

```typescript
import { useRandomStore, getRNG } from "@/random";

// Set seed by name (human-readable)
useRandomStore.getState().setSeedByName("funky-tornado");

// Generate random values
const rng = getRNG();
rng.next();                  // [0, 1)
rng.nextInt(1, 10);          // [1, 10] inclusive
rng.pick(animals);           // Random element
rng.weightedPick(items);     // Weighted selection
```

### 5. YUKA AI Director (`src/game/ai/GameDirector.ts`)

The Game Director is a goal-driven AI that orchestrates the entire game experience:

**Goals:**
- `build_pressure` - Gradually increase challenge
- `release_tension` - Back off after stress
- `challenge` - Push skilled players
- `mercy` - Help struggling players
- `reward` - Spawn power-ups for good performance

**Responsibilities:**
- Strategic duck spawn positioning (not random)
- Duck type selection based on difficulty
- AI behavior assignment (seeker, dive, zigzag, etc.)
- Power-up timing and type selection
- Logarithmic difficulty scaling based on:
  - Level: `log10(1 + level) / log10(26)`
  - Time: `log10(1 + gameTime / 10000) / log10(31)`
  - Score: `log10(1 + score / 100) / log10(1001)`

**Player Modeling:**
- `playerSkill` - Estimated from catch rate
- `playerFatigue` - Builds over time
- `playerFrustration` - From recent misses
- `playerEngagement` - Flow state detection

### 4. Wobble Governor (`src/game/ai/WobbleGovernor.ts`)

Controls stack wobble using goal-driven AI:
- Evaluates stack height, threat level, player stress
- Goals: steady, pulse, mercy, chaos
- Creates emergent tension that feels organic

### 6. Theme System (`src/theme/tokens/colors.ts`)

Nebraska homestead color palette:

| Token | Description | Primary Value |
|-------|-------------|---------------|
| `barnRed` | Iconic barn red | `#b91c1c` |
| `wheat` | Golden harvest | `#eab308` |
| `sky` | Prairie sky blue | `#0ea5e9` |
| `pasture` | Green pastures | `#22c55e` |
| `soil` | Rich earth brown | `#8b7355` |
| `wood` | Weathered barn wood | `#a08b64` |
| `storm` | Tornado grays | `#64748b` |

### 7. Audio System

**Development:** Tone.js generates audio procedurally
**Production:** Pre-rendered OGG files loaded via `src/platform/audio.ts`

The audio system automatically falls back to Tone.js if OGG files aren't available.

### 8. Physics System (`src/game/config.ts`)

```typescript
physics: {
  wobbleStrength: 0.045,      // Player movement → wobble
  wobbleDamping: 0.94,        // Wobble decay rate
  wobbleSpringiness: 0.08,    // Snap-back force
  stackStability: 0.72,       // Propagation up stack
  
  tipping: {
    criticalAngleBase: 0.58,  // Base tipping angle
    heightPenalty: 0.007,     // Per-duck penalty
    warningThreshold: 0.60,   // Show warning
    dangerThreshold: 0.88,    // Show danger
  }
}
```

## Commands

```bash
# Development
pnpm dev              # Start dev server
pnpm build:prod       # Production build

# Type checking
pnpm tscgo --noEmit   # Fast TypeScript check (tsgo)
pnpm tsc --noEmit     # Standard TypeScript check

# Linting & Formatting
pnpm lint             # Check all files
pnpm lint:fix         # Auto-fix issues
pnpm format           # Format all files

# Unit Testing (Vitest)
pnpm test             # Watch mode
pnpm test:run         # Single run
pnpm test:ui          # Vitest UI
pnpm test:coverage    # With coverage

# E2E Testing (Playwright)
pnpm test:e2e         # Run all browsers
pnpm test:e2e:ui      # Playwright UI

# Native Development
pnpm native:sync      # Build + sync to all platforms
pnpm native:android   # Open Android Studio
pnpm native:ios       # Open Xcode
pnpm native:electron  # Run Electron app

pnpm cap:run:android  # Run on Android device/emulator
pnpm cap:run:ios      # Run on iOS device/simulator

# Audio Capture (in browser console)
window.captureAudio.captureAllAudio()   # Capture all
window.captureAudio.captureSFX("land")  # Single effect
window.captureAudio.captureMusic(0.5)   # Music at 50% intensity
```

## Capacitor Configuration

```typescript
// capacitor.config.ts
const config: CapacitorConfig = {
  appId: "com.arcadecabinet.homestead_headaches",
  appName: "Homestead Headaches",
  webDir: "dist",
  plugins: {
    SplashScreen: {
      backgroundColor: "#FCD34D",  // Duck yellow
      launchShowDuration: 2000,
    },
    StatusBar: {
      style: "LIGHT",
      backgroundColor: "#FCD34D",
    },
  },
};
```

**Installed Plugins:**
- `@capacitor/app` - App lifecycle
- `@capacitor/haptics` - Vibration feedback
- `@capacitor/preferences` - Key-value storage
- `@capacitor/screen-orientation` - Lock portrait
- `@capacitor/status-bar` - Status bar styling
- `@capacitor/share` - Native share sheet
- `@capacitor/splash-screen` - Launch screen
- `@capacitor-community/electron` - Desktop builds

## Conventions

### Code Style
- Use Biome for formatting (2-space indent, double quotes)
- Prefer `const` over `let`
- Use TypeScript strict mode
- Document complex functions with JSDoc

### File Naming
- Components: `PascalCase.tsx`
- Utilities/hooks: `camelCase.ts`
- Types/interfaces: `PascalCase` in code

### State Management
- Game state lives in `GameEngine.ts`
- React state via hooks (`useGameEngine.ts`)
- Persistence via `src/platform/storage.ts`

### Platform-Specific Code
- Use `src/platform/` abstractions, never import Capacitor directly in game code
- Check `platform.isNative()` for native-only features
- Audio/haptics should always go through `feedback` manager

## Testing

### Unit Tests (Vitest)
- Located in `src/**/*.test.{ts,tsx}`
- Setup file: `src/test/setup.ts`
- Config: `vitest.config.ts`
- Uses `happy-dom` for DOM simulation
- Run with `pnpm test:run`

### E2E Tests (Maestro)
- Located in `.maestro/flows/*.yaml`
- Config: `.maestro/config.yaml`
- Tests character selection, graphics quality settings
- Run with Maestro CLI on iOS/Android simulators
- Key flows:
  - `test-farmer-john.yaml` - Test Farmer John character
  - `test-farmer-mary.yaml` - Test Farmer Mary character
  - `test-graphics-quality.yaml` - Test LOD quality switching
  - `test-full-matrix.yaml` - Full character + quality matrix

### Manual Testing Considerations
When testing gameplay:
1. Verify wobble feels balanced (not too punishing)
2. Check AI director responds to player performance
3. Ensure power-ups spawn at appropriate times
4. Test all animal abilities work correctly
5. Verify audio plays without errors
6. Check responsive scaling on mobile
7. **Test haptics on real devices** (simulators don't support haptics)
8. **Test audio on native** (ensure OGG files load correctly)
9. **Test multi-LOD graphics** (switch between high/medium/low quality)

## Common Issues

### Audio not playing
- Tone.js requires user interaction to start
- Check if OGG files exist in `public/assets/audio/`
- Falls back to Tone.js if files missing
- Check mute state in storage

### Haptics not working
- Haptics only work on native platforms
- Check `platform.isNative()` returns true
- Simulators don't support haptics - test on real device

### Wobble too sensitive
- Adjust `physics.wobbleStrength` in config
- Check `stackStability` propagation factor
- Review tipping thresholds

### Performance issues
- Canvas runs at 60fps target
- `requestAnimationFrame` for game loop
- Particle count capped in effects

### Native build issues
- Run `pnpm native:sync` after web changes
- Check Capacitor version compatibility
- Android: Ensure Android Studio and SDK installed
- iOS: Requires macOS with Xcode

## Extension Points

### Adding new animal types
1. Create directory in `src/game/animals/{animal}/`
2. Add `config.ts` with animal stats and properties
3. Add `components.ts` for animal-specific ECS components
4. Add `systems.ts` for animal-specific systems
5. Register in `src/game/registry/AnimalRegistry.ts` with:
   - Multi-LOD models (high/medium/low)
   - Sprite for 2D UI
   - Animations
   - Spawn weight and gameplay modifiers

### Adding animal variants
1. Create variant file in `src/game/animals/{animal}/variants/{variant}.ts`
2. Define variant config with:
   - Ability definition (id, cooldown, effectType)
   - Visual effect colors
   - Gameplay modifiers (weight, score, speed, stability multipliers)
3. Register variant in AnimalRegistry with `isVariant: true`

### Adding new ECS components
1. Define interface in `src/game/ecs/components/index.ts`
2. Add to `Entity` union type
3. Create system in `src/game/ecs/systems/` if needed
4. Register system in `src/game/ecs/systems/index.ts`

### Adding new power-ups
1. Add type to `PowerUpType` in `config.ts`
2. Add config (color, spawn weight, effect)
3. Implement collection logic in ECS systems
4. Add visual in `PowerUp.ts`

### Adding new AI behaviors
1. Add behavior type to `FallingComponent.behaviorType`
2. Implement in AI systems
3. Update `GameDirector.chooseBehaviorType()`
4. Add threat weight in `WobbleGovernor`

### Adding Capacitor plugins
1. Install: `pnpm add @capacitor/plugin-name`
2. Sync: `pnpm cap:sync`
3. Create wrapper in `src/platform/`
4. Export from `src/platform/index.ts`

## Documentation

- `README.md` - Public-facing project overview
- `docs/VISION.md` - Project vision and creative direction
- `docs/GAME_MANUAL.md` - Player guide and game mechanics
- `docs/DEV_LOG.md` - Development history and decisions
- `AGENTS.md` - This file (AI agent context)
