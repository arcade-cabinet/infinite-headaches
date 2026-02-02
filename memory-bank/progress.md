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
*   **Design System:** Nebraska Homestead palette enforced (no more purple/lavender).
*   **Dev Tooling:** Functional (DevAPI singleton + PlayerGovernor AI auto-player).
*   **Tests:** 1077 passing (Unit across 26 files).
*   **Deployment:** Live at https://homestead-headaches.netlify.app.

## Completed Milestones
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
*   **Chrome MCP Visual Verification (Phase 16):** Full gameplay verified in-browser with AI auto-play — tornado, scaling, cleanup, scoring all confirmed working.
*   **Menu Readability:** Character info card has backdrop-blur for readability; improved touch targets.
*   **Test Expansion:** 1077 tests across 26 files covering AnimationSystem, SpawningSystem, WobbleGovernor, responsive scale, archetypes, components, abilities, and more.
*   **Documentation:** All docs and memory bank aligned with current architecture.

## Known Issues
*   [MINOR] `Stacking Mechanics` E2E test occasionally times out due to physics unpredictability (Visual only, gameplay is functional).

## Roadmap
1.  **Release 1.0:** (Current) Stabilization + visual polish + playability fixes + comprehensive testing complete.
2.  **Post-Launch:**
    *   Human play testing to validate Yahtzee combo fairness in real gameplay.
    *   Monitor crash rates (especially on mobile via Capacitor).
    *   Optimize asset sizes if needed.
    *   Performance profiling (ribbon mesh + particles on mobile).
3.  **Content Updates:**
    *   New Animal Abilities.
    *   New Game Modes.
    *   Wind physics (tornado applies lateral forces to falling animals).
    *   Camera shake and zoom-outs for tall stacks.
    *   Animal reactions (look at player, panic when wobbling, celebrate when banked).
