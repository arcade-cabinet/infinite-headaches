# Progress

## Status
*   **Core Game Loop:** Functional (Havok Physics + Miniplex ECS).
*   **Engine Migration:** Completed (`reactylon` + React 19).
*   **3D Assets:** Functional (Animals + Farmers with proportional per-type scaling).
*   **Environment:** Functional (`NebraskaDiorama` + FarmerTrack + GameBoardOverlay with physics floor).
*   **AI Director:** Functional (DropController with Yahtzee-aware distribution).
*   **WobbleGovernor:** Functional (4-mode stack pressure controller).
*   **Tornado Indicator:** Functional (Procedural `CreateRibbon` twisted funnel + 3 spiral bands + storm debris).
*   **Entity Lifecycle:** Functional (Banking/scattering entities auto-cleaned after animation duration).
*   **Weather System:** Functional (State machine: clear/windy/rainy/stormy with wind forces, particles, ambient audio).
*   **Animal Variants:** Functional (Rare/golden/shadow with PBR tinting and score multipliers).
*   **Hit Stop:** Functional (Freeze-frame on perfect catches and combo milestones, reducedMotion-aware).
*   **Local Analytics:** Functional (SessionLog + CanvasChart + StatsModal with 4 tabs and JSON export).
*   **Remappable Keybindings:** Functional (localStorage persistence, Escape cancels capture).
*   **Colorblind Filter:** Functional (Protanopia/deuteranopia/tritanopia via Machado 2009 matrices).
*   **Combo Counter:** Functional (Tiered anime.js animations + camera FOV zoom at milestones).
*   **Level Up Flash:** Functional (White flash overlay on level transitions).
*   **Power-ups:** Functional (Shield, Slow Motion, Score Frenzy with UI state exposure).
*   **Character Traits:** Functional (John: steady/slow, Mary: fast/jittery).
*   **Difficulty Rebalance:** Applied (maxLevel 999, gentler ramp, 3500ms combo window).
*   **Accessibility:** Enhanced (high contrast mode, motor settings persistence, ARIA assertive, key capture Escape).
*   **Design System:** Nebraska Homestead palette enforced (no more purple/lavender).
*   **Dev Tooling:** Functional (DevAPI singleton + PlayerGovernor AI auto-player).
*   **Tests:** 1267 passing (Unit across 34 files, 0 failures).
*   **Deployment:** Live at https://homestead-headaches.netlify.app.

## Completed Milestones

### v1.0 Milestones
*   **Fix Asset Pipeline:** Farmers render correctly.
*   **ECS Migration:** Fully migrated to Miniplex Hybrid.
*   **Havok Integration:** Physics replaced custom implementation.
*   **Build Stabilization:** Patched `babel-plugin-reactylon` and runtime stubs.
*   **Responsiveness:** Fixed camera scaling and canvas layout.
*   **DropController:** Replaced YUKA-based GameDirector with pure TypeScript DropController.
*   **Yahtzee-Aware Type Selection:** Stack composition analysis drives animal type choices.
*   **Fairness Remediation:** After 2 disruptive drops, forces helpful type or power-up.
*   **DropIndicatorTornado:** Cartoon tornado indicator at top of game board.
*   **Design Token Color Purge:** Replaced 347+ hardcoded purple/lavender colors with Nebraska Homestead palette across all UI components.
*   **Per-Type Entity Scaling:** Animals spawn at proportional sizes (cow: 1.15, pig: 0.85, chicken: 0.5, duck: 0.55, sheep: 1.0, farmer: 2.5).
*   **Physics Weight Integration:** PhysicsAggregate mass reads from ANIMAL_TYPES config (cow: 2.0, chicken: 0.3).
*   **Farmer Animation Fix:** Root motion stripping prevents GLB animations from overriding ECS positions; better idle selection.
*   **Farmer Track:** Visible dirt/grass track at Y=-2.5 with green grass edges.
*   **Ground/Floor Detection:** Invisible physics floor at Y=-4 catches falling entities.
*   **Tornado Overhaul (Phase 15):** Replaced particle-only approach with spinning tapered cylinder + storm-colored debris.
*   **Tornado Ribbon Rewrite (Phase 16):** Replaced tapered cylinder with procedural `CreateRibbon` twisted funnel (28 rings, 2.5 full twists) + 3 dark spiral bands. Reads as an actual cartoon tornado.
*   **Animal Scale Rebalance (Phase 16):** Reduced all modelScale values so stacks are readable. Farmer is clearly dominant.
*   **Entity Lifecycle Cleanup (Phase 16):** `cleanupTransientEntities()` in GameLogic.tick() removes banking entities after animation + 500ms and scattering entities after 2500ms. Entity count dropped from ~47 to ~15.
*   **PlayerGovernor (Phase 16):** Yuka-powered AI auto-player with FSM (IDLE/PURSUING/BANKING). Dev-only, activated via DevAPI.
*   **DevAPI (Phase 16):** `window.__DEV_API__` singleton for runtime debugging, state inspection, spawning controls, and auto-play.
*   **Chrome MCP Visual Verification (Phase 16):** Full gameplay verified in-browser with AI auto-play -- tornado, scaling, cleanup, scoring all confirmed working.
*   **Menu Readability:** Character info card has backdrop-blur for readability; improved touch targets.
*   **Test Expansion (v1.0):** 1077 tests across 26 files covering AnimationSystem, SpawningSystem, WobbleGovernor, responsive scale, archetypes, components, abilities, and more.
*   **Documentation:** All docs and memory bank aligned with current architecture.

### v1.1.0 Milestones (Feature Expansion -- 55 Issues, 8 Workstreams)
*   **Weather System:** WeatherSystem state machine (clear/windy/rainy/stormy) with wind forces on falling entities, BabylonJS particle effects (WeatherEffects), wobble bonus, ambient audio loops. Wired into GameScene.
*   **Animal Variants:** Rare (level 3+), golden (level 8+), shadow (level 15+) with PBR material tinting and score multipliers. Configured in AnimalVariants.ts.
*   **Hit Stop:** Freeze-frame effect on perfect catches and combo milestones. Respects reducedMotion via GameLogic.setReducedMotion().
*   **Local Analytics:** SessionLog recording to Capacitor storage (500 FIFO cap), CanvasChart renderer, StatsModal with 4 tabs (Overview/History/Charts/HeatMap), JSON export. clearSessionHistory wired with UI button and confirmation.
*   **Remappable Keybindings:** loadKeyBindings/saveKeyBindings/resetKeyBindings with localStorage persistence. Escape cancels key capture without closing modal.
*   **Colorblind Filter:** Protanopia/deuteranopia/tritanopia post-processing via Machado 2009 matrices. Wired into PostProcessEffects via NebraskaDiorama.
*   **Combo Counter:** Tiered animations via anime.js with escalating visual feedback. Camera FOV zoom pulse at combo milestones (5x/10x/15x), guarded by reducedMotion.
*   **Level Up Flash:** White flash overlay on level transitions. Wired into GameScreen3D.
*   **3 New Power-ups:** Shield (absorbs 1 miss), Slow Motion (0.5x speed), Score Frenzy (3x points). Active state exposed to UI via getActivePowerUps() and onPowerUpStateChange callback.
*   **Character Traits:** John (steady/slow: 0.90x speed, 0.85x wobble), Mary (fast/jittery: 1.10x speed, 1.15x wobble).
*   **Difficulty Rebalance:** maxLevel 25 raised to 999, gentler ramp, longer combo window (3500ms).
*   **Accessibility Enhancements:** High contrast mode toggle, motor settings persistence, ARIA live region severity (assertive), key capture Escape handling, mobile button layout flex-wrap.
*   **Integration Wiring:** LevelUpFlash into GameScreen3D, WeatherEffects into GameScene, ColorblindFilter into PostProcessEffects, new SFX calls, reducedMotion pass-through, StatsModal z-index fix, Settings button on MainMenuOverlay.
*   **Bug Fixes:** WeatherEffects wind direction sign, WeatherSystem level reset, SessionLog storage validation, StatsModal error boundary, canvas chart responsive sizing, Input.ts init order safety, clearSessionHistory queue reset.
*   **Memory Leak Fixes:** ComboCounter/ScoreDisplay/SettingsModal animation cleanup (anime.js ref tracking), GameLogic weather/dropController cleanup in destroy().
*   **Audio Assets:** 6 placeholder .ogg files (combo5, combo10, combo15, weather_wind, weather_rain, bank_fanfare).
*   **Test Expansion (v1.1.0):** 5 new test suites (WeatherSystem, HitStop, AnimalVariants, SessionLog, Keybindings) adding 58 tests. Fixed 9 pre-existing test failures. Total: 1267 tests across 34 files, 0 failures.
*   **Dead Code Cleanup:** Removed unused Vector3 import, annotated empty callbacks with TODOs, extracted sensitivity config constants.

## Known Issues
*   [MINOR] `Stacking Mechanics` E2E test occasionally times out due to physics unpredictability (Visual only, gameplay is functional).
*   [TODO] Power-up specific audio feedback not yet implemented.
*   [PLACEHOLDER] 6 audio files (combo5, combo10, combo15, weather_wind, weather_rain, bank_fanfare) are placeholder .ogg files awaiting final assets.

## Roadmap
1.  **Release 1.1.0:** (Current) Feature expansion complete -- weather, variants, analytics, accessibility, combo system, power-ups, keybindings, colorblind filters.
2.  **Post-1.1.0:**
    *   Human play testing to validate weather balance, animal variant spawn rates, and combo fairness.
    *   Replace 6 placeholder audio files with production assets.
    *   Implement power-up specific audio feedback.
    *   Monitor crash rates (especially on mobile via Capacitor).
    *   Performance profiling (weather particles + colorblind post-processing + anime.js on mobile).
    *   Optimize asset sizes if needed.
3.  **Content Updates:**
    *   New Animal Abilities.
    *   New Game Modes.
    *   Camera shake and zoom-outs for tall stacks.
    *   Animal reactions (look at player, panic when wobbling, celebrate when banked).
    *   Additional weather states and environmental hazards.
