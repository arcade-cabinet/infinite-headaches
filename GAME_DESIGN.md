# Homestead Headaches - Game Design Document

## Core Concept
Nebraska farm arcade game. Catch falling farm animals, stack them on your head, bank them for points.

## Theme
- **Setting**: Nebraska farmland
- **Story**: Tornado threatens homestead (shown in splash VIDEO, not gameplay)
- **Tone**: Chaotic, fun arcade action

## Core Mechanics

### Catching
- Animals fall from sky
- Move farmer left/right to catch
- Stack on head

### Wobble Physics
- Stacked animals wobble
- Off-center catches = more wobble
- Too much wobble = animals fall

### Banking
- Stack 5+ to unlock Barn button
- Save animals for points
- Risk/reward: tall stacks = more points but unstable

## Tech Stack
- React 19 + TypeScript + Vite
- Babylon.js (3D)
- Miniplex (ECS)
- Capacitor (mobile) / Electron (desktop)

## Key Files
- `src/game/engine/GameLogic.ts` - Game logic
- `src/game/scene/GameScene3D.tsx` - 3D renderer
- `src/game/scene/NebraskaDiorama.tsx` - Nebraska environment
- `src/game/screens/GameScreen3D.tsx` - Gameplay screen
- `src/game/components/VideoSplash.tsx` - Intro video (shows tornado)

### Assets
- `public/assets/models/` - Animal and Farmer GLBs (john.glb, mary.glb)
- `public/assets/audio/` - Kenney audio library
- Splash video shows tornado theme

## Status
- Stacking/catching: WORKS
- Wobble physics: WORKS
- Banking: WORKS
- 3D rendering: WORKS
- Audio: WORKS
- Touch controls: WORKS
- Keyboard controls: ADDED (arrow keys)
- Farmer models: EXPORTED (john.glb, mary.glb with animations)
