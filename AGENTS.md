# AGENTS.md - AI Agent Context for Infinite Headaches

## Project Overview

**Infinite Headaches** is a cross-platform tower-stacking arcade game built with React, TypeScript, Canvas, and Capacitor. Players drag a Duck to catch falling ducks, building precarious stacks while managing wobble physics, special abilities, and power-ups.

**Platforms:** Web/PWA, Android, iOS, Desktop (Electron)

## Tech Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| React | 19.x | UI framework |
| TypeScript | 5.9+ | Type safety |
| Vite | 6.x | Build tool |
| Canvas 2D | - | Game rendering |
| Tone.js | 15.x | Audio synthesis (dev) |
| YUKA | 0.7.8 | AI/goal-driven behavior |
| Capacitor | 8.x | Cross-platform native |
| Tailwind CSS | 4.x | Styling |
| Biome | 2.3.x | Linting & formatting |
| Vitest | 4.x | Unit testing |
| Playwright | 1.58+ | E2E testing |

## Architecture

```
src/
├── game/
│   ├── ai/                    # YUKA-powered AI systems
│   │   ├── GameDirector.ts    # Orchestrates spawning, difficulty, power-ups
│   │   ├── WobbleGovernor.ts  # Controls stack wobble based on game state
│   │   └── DuckBehavior.ts    # Duck steering behaviors
│   │
│   ├── engine/
│   │   └── GameEngine.ts      # Core game loop, physics, collision
│   │
│   ├── entities/
│   │   ├── Duck.ts            # Duck entity (normal, fire, ice types)
│   │   ├── Particle.ts        # Visual effects
│   │   ├── PowerUp.ts         # Collectible items
│   │   ├── Fireball.ts        # Fire duck projectile
│   │   ├── FrozenDuck.ts      # Ice-encased duck
│   │   └── BossDuck.ts        # Boss variants
│   │
│   ├── renderer/
│   │   ├── duck.ts            # Duck drawing functions
│   │   └── background.ts      # Background rendering
│   │
│   ├── hooks/
│   │   ├── useGameEngine.ts   # React-game integration
│   │   ├── useHighScore.ts    # localStorage persistence
│   │   └── useResponsiveScale.ts
│   │
│   ├── components/            # UI components (HUD, buttons, indicators)
│   ├── screens/               # Menu, Game, GameOver screens
│   ├── modes/                 # Game mode definitions
│   ├── progression/           # Upgrades and coin system
│   ├── utils/                 # Audio capture tooling
│   ├── config.ts              # All game constants
│   ├── audio.ts               # Tone.js audio manager (dev fallback)
│   └── achievements.ts        # Achievement tracking
│
├── platform/                  # Cross-platform abstraction layer
│   ├── haptics.ts             # @capacitor/haptics wrapper
│   ├── storage.ts             # @capacitor/preferences wrapper
│   ├── audio.ts               # Pre-rendered OGG playback
│   ├── feedback.ts            # Unified audio + haptics API
│   ├── app-lifecycle.ts       # Pause/resume, back button
│   └── index.ts               # Barrel exports + platform detection
│
├── components/ui/             # shadcn/ui components
└── App.tsx                    # Main app entry

# Native project directories
android/                       # Capacitor Android project
ios/                          # Capacitor iOS project  
electron/                     # Capacitor Electron project
public/assets/audio/          # Pre-rendered audio files
  ├── sfx/                    # Sound effects (OGG)
  ├── music/                  # Background tracks (OGG)
  └── ui/                     # UI sounds (OGG)
```

## Key Systems

### 1. Platform Abstraction (`src/platform/`)

The platform layer provides unified APIs that work across all platforms:

```typescript
import { feedback, haptics, storage, platform } from "@/platform";

// Unified audio + haptics
feedback.play("perfect");    // Plays sound + triggers haptic
feedback.startMusic();       // Background music
feedback.setIntensity(0.7);  // Dynamic music intensity

// Direct haptics (native only)
haptics.heavy();             // Strong impact
haptics.success();           // Success notification

// Storage (Capacitor Preferences on native, localStorage on web)
await storage.set("highScore", 1000);
const score = await storage.get<number>("highScore");

// Platform detection
platform.isNative();         // true on iOS/Android/Electron
platform.getPlatform();      // "ios" | "android" | "web" | "electron"
```

### 2. Feedback System (`src/platform/feedback.ts`)

The GameEngine uses the unified `feedback` manager:

| Game Event | Sound | Haptic |
|------------|-------|--------|
| Duck lands | `land` | Medium impact |
| Perfect catch | `perfect` | Heavy impact + Success |
| Miss/Topple | `fail` | Error + Vibrate 200ms |
| Power-up collected | `powerup` | Success |
| Level up | `levelup` | Heavy + Success |
| Life earned | `lifeup` | Success |
| Fireball shot | `fireball` | Heavy |
| Duck frozen | `freeze` | Medium |
| Danger state | - | Warning pulse |

### 3. YUKA AI Director (`src/game/ai/GameDirector.ts`)

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

### 5. Audio System

**Development:** Tone.js generates audio procedurally
**Production:** Pre-rendered OGG files loaded via `src/platform/audio.ts`

The audio system automatically falls back to Tone.js if OGG files aren't available:

```typescript
// src/platform/audio.ts
async init() {
  this.filesAvailable = await this.checkFilesExist();
  if (!this.filesAvailable) {
    // Fallback to Tone.js
    const { audioManager } = await import("@/game/audio");
    this.toneManager = audioManager;
  }
}
```

Music intensity crossfades between pre-rendered tracks at different intensity levels (0%, 25%, 50%, 75%, 100%).

### 6. Physics System (`src/game/config.ts`)

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
  appId: "com.arcadecabinet.infinite_headaches",
  appName: "Infinite Headaches",
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

### E2E Tests (Playwright)
- Located in `e2e/**/*.spec.ts`
- Config: `playwright.config.ts`
- Tests against Chromium, Firefox, WebKit
- Run with `pnpm test:e2e`

### Manual Testing Considerations
When testing gameplay:
1. Verify wobble feels balanced (not too punishing)
2. Check AI director responds to player performance
3. Ensure power-ups spawn at appropriate times
4. Test all duck abilities work correctly
5. Verify audio plays without errors
6. Check responsive scaling on mobile
7. **Test haptics on real devices** (simulators don't support haptics)
8. **Test audio on native** (ensure OGG files load correctly)

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

### Adding new duck types
1. Add type to `DuckType` in `config.ts`
2. Add spawn weight and ability config
3. Implement renderer in `renderer/duck.ts`
4. Handle ability in `Duck.ts` and `GameEngine.ts`

### Adding new power-ups
1. Add type to `PowerUpType` in `config.ts`
2. Add config (color, spawn weight, effect)
3. Implement collection logic in `GameEngine.ts`
4. Add visual in `PowerUp.ts`

### Adding new AI behaviors
1. Add behavior type to `DuckBehaviorType`
2. Implement in `applyDuckAI()` function
3. Update `GameDirector.chooseBehaviorType()`
4. Add threat weight in `WobbleGovernor`

### Adding new sound effects
1. Add to `SoundType` in `src/game/audio.ts`
2. Implement Tone.js synthesis in `audioManager`
3. Add to `SFX_FILES` in `src/platform/audio.ts`
4. Add haptic mapping in `src/platform/feedback.ts`
5. Capture to OGG: `window.captureAudio.captureSFX("newSound")`

### Adding Capacitor plugins
1. Install: `pnpm add @capacitor/plugin-name`
2. Sync: `pnpm cap:sync`
3. Create wrapper in `src/platform/`
4. Export from `src/platform/index.ts`

## Documentation

- `README.md` - Public-facing project overview
- `docs/DEV_LOG.md` - Development history and decisions
- `AGENTS.md` - This file (AI agent context)
