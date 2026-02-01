# Homestead Headaches

A 3D physics-based tower-stacking arcade game with a Nebraska homestead theme. Save farm animals from an incoming tornado by catching and stacking them before the storm hits!

**Cross-platform:** Web, Android, iOS, and Desktop (Electron)

## Play

Drag your farmer to catch falling farm animals and build the tallest stack possible. But be careful - move too fast and your tower will wobble and fall!

### Controls
- **Drag** - Move your farmer left/right to catch falling animals
- **Tap stacked animal** - Trigger special abilities (Fire Chicken, Ice Duck, etc.)
- **Bank button** - Save your stack when you have 5+ animals

## Features

### Dynamic 3D Physics
- Realistic wobble mechanics - smooth movements are rewarded
- Stack stability decreases with height
- Center of mass calculations for tipping
- Low-poly 3D models with vertex-colored shaders

### Farm Animals
- **Cow** - Sturdy and reliable, the backbone of any stack
- **Pig** - Round and bouncy
- **Chicken** - Light and fluttery, slows fall speed
- **Duck** - The classic farm friend
- **Sheep** - Fluffy and stable

### Special Animal Variants
- **Fire Chicken** - Tap to shoot fireballs that destroy falling animals
- **Ice Duck** - Tap to freeze animals mid-air for easier catching
- **Brown Cow** - Produces poop projectiles that grow bouncy bushes
- **Golden Pig** - Triple points, but falls faster
- **Heavy Cow** - Worth more points but destabilizes the stack

### Power-Ups
- **Rare Candy** - Merge your entire stack into one mega animal
- **Potion** - Restore hearts
- **Great Ball** - Magnetic pull attracts animals toward you
- **X Attack** - Double points for 8 seconds
- **Full Restore** - Full heal + temporary invincibility

### Intelligent AI Director
The game features a YUKA-powered AI that adapts to your skill:
- Struggling? The game shows mercy with easier spawns
- Doing well? Expect more challenging animal patterns
- Logarithmic difficulty scaling feels fair at all skill levels

### Nebraska Homestead Theme
- Barn red, wheat gold, and prairie sky color palette
- Procedural tornado visual effect that grows with danger
- Dynamic storm atmosphere lighting

## Tech Stack

- **React 19** + **TypeScript** - Modern UI framework
- **Babylon.js** via **react-babylonjs** - 3D rendering engine
- **Miniplex** - Entity Component System (ECS) for game state
- **Zustand** - UI state management (settings, seeds)
- **Web Audio API** - Native audio (Kenney assets)
- **YUKA** - Goal-driven AI for game direction
- **Capacitor 8** - Cross-platform native builds
- **Vite 6** - Lightning-fast builds
- **Tailwind CSS 4** - Utility-first styling

## Platforms

| Platform | Status | Build Command |
|----------|--------|---------------|
| Web/PWA | Ready | `pnpm build:prod` |
| Android | Ready | `pnpm native:android` |
| iOS | Ready | `pnpm native:ios` |
| Desktop (Electron) | Ready | `pnpm native:electron` |

## Development

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Type check
pnpm tscgo --noEmit

# Lint and format
pnpm lint
pnpm lint:fix

# Run tests
pnpm test           # Watch mode
pnpm test:run       # Single run
pnpm test:ui        # Vitest UI

# E2E tests
pnpm test:e2e       # Playwright
pnpm test:e2e:ui    # Playwright UI

# Build for production
pnpm build:prod
```

### Native Development

```bash
# Sync web assets to all native platforms
pnpm native:sync

# Open in native IDEs
pnpm native:android   # Opens Android Studio
pnpm native:ios       # Opens Xcode
pnpm native:electron  # Runs Electron app

# Run on device/emulator
pnpm cap:run:android
pnpm cap:run:ios
```

### Audio Assets

The game uses file-based audio from the Kenney audio library:

```
public/assets/audio/
├── music/           # Background music (background.wav)
├── sfx/             # Sound effects (drop.ogg, land.ogg, etc.)
│   └── voice/       # Character voice clips
│       ├── male/    # Farmer John voices
│       └── female/  # Farmer Mary voices
└── ui/              # UI sounds (click.ogg, toggle.ogg, back.ogg)
```

## Project Structure

```
/
├── src/
│   ├── game/                    # Game logic
│   │   ├── ai/                  # YUKA-powered AI (GameDirector, WobbleGovernor)
│   │   ├── animals/             # Animal definitions by type
│   │   │   ├── cow/             # Cow config, components, variants
│   │   │   ├── chicken/         # Chicken config, components, variants
│   │   │   ├── pig/             # Pig config, components, variants
│   │   │   └── sheep/           # Sheep config, components, variants
│   │   ├── ecs/                 # Miniplex ECS
│   │   │   ├── components/      # ECS component definitions
│   │   │   ├── systems/         # ECS systems (Movement, Wobble, Freeze, etc.)
│   │   │   └── world.ts         # World instance
│   │   ├── entities/            # Entity logic (Animal, PowerUp, Fireball, etc.)
│   │   ├── effects/             # Visual effects (TornadoEffect, ParticleEffects)
│   │   ├── registry/            # AnimalRegistry for centralized definitions
│   │   ├── scene/               # Babylon.js scene components
│   │   ├── hooks/               # React-game integration hooks
│   │   ├── components/          # UI components (HUD, buttons, indicators)
│   │   ├── screens/             # Menu, Game, GameOver screens
│   │   └── config.ts            # All game constants
│   │
│   ├── platform/                # Cross-platform abstraction
│   │   ├── haptics.ts           # Native haptic feedback
│   │   ├── storage.ts           # Capacitor Preferences / localStorage
│   │   ├── audio.ts             # Web Audio API wrapper
│   │   ├── feedback.ts          # Unified audio + haptics API
│   │   └── app-lifecycle.ts     # Pause/resume handling
│   │
│   ├── theme/                   # Nebraska homestead theming
│   │   └── tokens/              # Color palette (barnRed, wheat, soil, etc.)
│   │
│   ├── graphics/                # Multi-LOD graphics system
│   │   ├── settings/            # Quality presets (high/medium/low)
│   │   └── manager/             # GraphicsManager for LOD switching
│   │
│   ├── random/                  # Deterministic RNG system
│   │   └── store.ts             # Zustand store for seeded randomness
│   │
│   └── components/ui/           # shadcn/ui components
│
├── android/                     # Capacitor Android project
├── ios/                         # Capacitor iOS project
├── electron/                    # Capacitor Electron project
├── .maestro/                    # Maestro E2E test flows
└── public/assets/               # Static assets (models, audio, textures)
```

## Game Mechanics

### Scoring
| Action | Points |
|--------|--------|
| Catch animal | 10 × stack multiplier |
| Perfect catch | ×2.5 bonus |
| Combo chain | +15% per catch |
| Fireball kill | 25 points |

### Lives
- Start with 3 lives (max 5, can extend to 8)
- Lose a life when animals hit the floor or stack topples
- Earn lives through perfect catches, score milestones, and power-ups

### Banking
When you have 5+ animals stacked, bank them to safety:
- Banked animals are protected from topples
- Banking 10+ animals earns a bonus life
- Trade-off: Your multiplier is reduced by 40%

## Documentation

- [Vision](docs/VISION.md) - Project vision and creative direction
- [Game Manual](docs/GAME_MANUAL.md) - Player guide and mechanics
- [Development Log](docs/DEV_LOG.md) - Project history and decisions
- [Agent Context](AGENTS.md) - AI development guide

## Credits

Built with React, TypeScript, Babylon.js, Capacitor, and a lot of Nebraska farm energy.

---

*Stack responsibly. Homestead Headaches is not responsible for toppled towers or escaped farm animals.*
