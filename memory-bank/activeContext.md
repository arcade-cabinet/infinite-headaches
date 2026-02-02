# Active Context

## Current Status
**RELEASE 1.1.0 -- Feature Expansion Complete**
The "Homestead Headaches" project has completed the v1.1.0 feature expansion encompassing 55 issues across 8 workstreams. New systems include weather, animal variants, hit stop, local analytics, remappable keybindings, colorblind filters, combo counter, level-up flash, 3 new power-ups, character traits, and a full difficulty rebalance. 1267 tests pass across 34 files with 0 failures.

## Recent Achievements (v1.1.0 Feature Expansion)

### Workstream 1: Critical Integration Wiring
1.  **LevelUpFlash** wired into GameScreen3D.
2.  **WeatherEffects** wired into GameScene (weather state in useGameLogic).
3.  **ColorblindFilter** wired into PostProcessEffects via NebraskaDiorama.
4.  **New SFX play calls:** onComboMilestone (combo5/10/15), bank_fanfare, weather ambient loops.
5.  **reducedMotion** passed through to ComboCounter via ScoreDisplay.
6.  **StatsModal** z-index fixed (z-[55]).
7.  **Settings button** added to MainMenuOverlay.

### Workstream 2: Missing Features
1.  **Camera FOV zoom pulse** on combo milestones (5x/10x/15x), guarded by reducedMotion.
2.  **High contrast mode** toggle in SettingsModal AccessibilityTab.
3.  **Settings button** on main menu.
4.  **Hit stop** respects reducedMotion (GameLogic.setReducedMotion()).
5.  **Active power-up state** exposed to UI (getActivePowerUps(), onPowerUpStateChange callback).

### Workstream 3: Accessibility
1.  **Motor settings persistence** (load from inputManager on mount, immediate save).
2.  **ARIA live region severity** (level changed to assertive).
3.  **Key capture Escape handling** (cancels capture, doesn't close modal).
4.  **Mobile button layout** flex-wrap.
5.  Power-up specific audio feedback (TODO).

### Workstream 4: Bug Fixes
1.  **WeatherEffects** wind direction sign fix.
2.  **WeatherSystem** level reset (force clear when level <= 5).
3.  **SessionLog** storage validation (Array.isArray check).
4.  **StatsModal** error boundary (try-catch).
5.  **Canvas chart** responsive sizing (dynamic containerRef).
6.  **Input.ts** init order safety (console.warn if not initialized).
7.  **clearSessionHistory** queue reset.

### Workstream 5: Memory Leak Fixes
1.  **ComboCounter** animation cleanup (anime.js ref tracking).
2.  **ScoreDisplay** animation cleanup.
3.  **SettingsModal** animation cleanup.
4.  **GameLogic** weather/dropController cleanup in destroy().

### Workstream 6: Audio Assets
*   6 placeholder .ogg files: combo5, combo10, combo15, weather_wind, weather_rain, bank_fanfare.

### Workstream 7: Tests
*   5 new test suites (58 tests): WeatherSystem, HitStop, AnimalVariants, SessionLog, Keybindings.
*   Fixed 9 pre-existing test failures in config.test.ts and hooks-integration.test.ts.
*   Total: 1267 tests passing across 34 files, 0 failures.

### Workstream 8: Dead Code & Cleanup
*   Removed unused Vector3 import from useGameLogic.
*   Empty callbacks annotated with TODOs.
*   clearSessionHistory wired with UI button and confirmation.
*   Sensitivity config constants extracted.

## Prior Achievements (v1.0 Phases 1-16)
1.  **Animal Scale Rebalance:** Reduced all animal `modelScale` values so stacks are readable and the farmer (2.5) is clearly dominant.
2.  **Tornado Ribbon Rewrite:** Procedural `CreateRibbon` twisted funnel mesh + 3 dark spiral bands.
3.  **Entity Lifecycle Cleanup:** `cleanupTransientEntities()` in `GameLogic.tick()`.
4.  **PlayerGovernor (Dev-Only):** Yuka-powered AI player with FSM.
5.  **DevAPI Testing Infrastructure:** `window.__DEV_API__` singleton.
6.  **Chrome MCP Visual Verification:** Full gameplay verified via browser automation.

## Immediate Goals
1.  **Play Testing:** Validate new weather system, animal variants, and combo mechanics with human input across devices.
2.  **Performance Profiling:** Ensure weather particles + colorblind filter post-processing + anime.js combo animations don't impact frame rate on mobile.
3.  **Audio Polish:** Replace 6 placeholder .ogg files with final audio assets.
4.  **Power-up Audio Feedback:** Implement power-up specific audio feedback (currently TODO).

## Active Decisions
*   **Physics Loading:** Havok is loaded in `GameScreen3D` (parent) to ensure `GameScene` never mounts without physics.
*   **AI Architecture:** DropController is a pure TypeScript class (no YUKA dependency) with same public API as former GameDirector.
*   **Weather System:** WeatherSystem is a state machine (clear/windy/rainy/stormy) driven by level progression. Wind forces apply lateral drift to falling entities. BabylonJS particle effects render rain/wind. Ambient audio loops per weather state.
*   **Animal Variants:** Rare (level 3+), golden (level 8+), shadow (level 15+) variants with PBR material tinting and score multipliers. Configured in `AnimalVariants.ts`.
*   **Hit Stop:** Freeze-frame effect on perfect catches and combo milestones. Respects reducedMotion preference.
*   **Local Analytics:** SessionLog records to Capacitor storage with 500-entry FIFO cap. CanvasChart renders data. StatsModal has 4 tabs (Overview/History/Charts/HeatMap) with JSON export.
*   **Colorblind Filter:** Protanopia/deuteranopia/tritanopia post-processing via Machado 2009 matrices. Wired through PostProcessEffects via NebraskaDiorama.
*   **Combo Counter:** Tiered animations via anime.js with escalating visual feedback at 5x/10x/15x milestones. Camera FOV zoom pulse at milestones.
*   **Keybindings:** Remappable via loadKeyBindings/saveKeyBindings/resetKeyBindings with localStorage persistence. Escape cancels key capture without closing modal.
*   **Power-ups:** Shield (absorbs 1 miss), Slow Motion (0.5x speed), Score Frenzy (3x points). Active state exposed to UI via getActivePowerUps() and onPowerUpStateChange callback.
*   **Character Traits:** John (steady/slow: 0.90x speed, 0.85x wobble), Mary (fast/jittery: 1.10x speed, 1.15x wobble).
*   **Difficulty Rebalance:** maxLevel 25 raised to 999, gentler ramp, longer combo window (3500ms).
*   **Tornado Rendering:** Procedural `CreateRibbon` twisted funnel + 3 spiral bands under a spinning `TransformNode`. Per-frame getter pattern (not React state) to avoid 60fps re-renders.
*   **Entity Scaling:** Per-type `modelScale` in ANIMAL_TYPES config. Farmer (2.5) is clearly larger than all animals (0.5-1.15).
*   **Entity Lifecycle:** Banking/scattering entities cleaned up by timestamp in `GameLogic.tick()`. Weather and dropController cleaned up in GameLogic.destroy().
*   **Color System:** All UI uses amber/stone/red Tailwind classes (no purple). 3D effects use storm gray/brown.
*   **Dev Tooling:** PlayerGovernor (Yuka FSM) + DevAPI singleton for automated gameplay testing. Dev-only, tree-shaken in production.
*   **Deployment:** `vite.config.ts` uses standard chunks for web, `viteSingleFile` for Capacitor.

## Current Focus
*   v1.1.0 feature expansion complete (55 issues, 8 workstreams).
*   All 1267 tests passing across 34 files.
*   Ready for human play testing of new systems, audio asset finalization, and performance validation.
