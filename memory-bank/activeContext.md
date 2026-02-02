# Active Context

## Current Status
**RELEASE 1.0 — Playability Verified via Chrome MCP**
The "Homestead Headaches" project has completed a 10-phase polish pass (Phases 1-10) plus a playability fix pass (Phase 16). All visual, physics, and gameplay systems have been verified in-browser using the PlayerGovernor AI auto-player and Chrome MCP screenshots. 1077 tests pass across 26 files.

## Recent Achievements (Phase 16: Playability Fixes)
1.  **Animal Scale Rebalance:** Reduced all animal `modelScale` values so stacks are readable and the farmer (2.5) is clearly dominant. Cow: 1.8 → 1.15, pig: 1.2 → 0.85, chicken: 0.7 → 0.5, duck: 0.8 → 0.55, sheep: 1.5 → 1.0.
2.  **Tornado Ribbon Rewrite:** Replaced plain tapered cylinder with a procedural `CreateRibbon` twisted funnel mesh (28 rings, 18 points/ring, 2.5 full twists) + 3 dark spiral bands wrapping helically around the funnel. Storm gray-brown debris and straw/hay particles complete the cartoon tornado look.
3.  **Entity Lifecycle Cleanup:** Added `cleanupTransientEntities()` to `GameLogic.tick()`. Banking entities are removed after `bankAnimationDuration + 500ms`; scattering entities after 2500ms. Entity count during gameplay dropped from ~47 to ~15.
4.  **PlayerGovernor (Dev-Only):** Yuka-powered AI player with FSM (IDLE/PURSUING/BANKING states). Drives the farmer along the rail to catch falling animals and bank stacks. Activated via `window.__DEV_API__.enableAutoPlay()`.
5.  **DevAPI Testing Infrastructure:** `window.__DEV_API__` singleton provides runtime access to game state, spawning controls, and auto-play for E2E testing and Chrome MCP observation.
6.  **Chrome MCP Visual Verification:** Full gameplay verified via browser automation — tornado reads as cartoon twister, animals are proportional, entity cleanup prevents accumulation, scoring works (7,839 points with 41 banked animals observed).

## Immediate Goals
1.  **Play Testing:** Continue validating with real human input across devices.
2.  **Performance Profiling:** Ensure ribbon mesh + particles + entity cleanup don't impact frame rate on mobile.
3.  **Wind Physics:** Tornado could apply lateral forces to falling animals (future).

## Active Decisions
*   **Physics Loading:** Havok is loaded in `GameScreen3D` (parent) to ensure `GameScene` never mounts without physics.
*   **AI Architecture:** DropController is a pure TypeScript class (no YUKA dependency) with same public API as former GameDirector.
*   **Tornado Rendering:** Procedural `CreateRibbon` twisted funnel + 3 spiral bands under a spinning `TransformNode`. Per-frame getter pattern (not React state) to avoid 60fps re-renders.
*   **Entity Scaling:** Per-type `modelScale` in ANIMAL_TYPES config. Tuned so farmer (2.5) is clearly larger than all animals (0.5-1.15).
*   **Entity Lifecycle:** Banking/scattering entities cleaned up by timestamp in `GameLogic.tick()`. No entities persist beyond their animation duration + buffer.
*   **Physics Mass:** Per-type `weight` field drives PhysicsAggregate mass for realistic stacking (cow: 2.0, chicken: 0.3).
*   **Color System:** All UI uses amber/stone/red Tailwind classes (no purple). 3D effects use storm gray/brown.
*   **Dev Tooling:** PlayerGovernor (Yuka FSM) + DevAPI singleton for automated gameplay testing. Dev-only, tree-shaken in production.
*   **Deployment:** `vite.config.ts` uses standard chunks for web, `viteSingleFile` for Capacitor.

## Current Focus
*   All phases (1-10 + 16 playability) complete.
*   Verified in-browser via Chrome MCP with AI auto-play.
*   Ready for human play testing, performance validation, and release.
