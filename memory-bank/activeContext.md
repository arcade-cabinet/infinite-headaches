# Active Context

## Current Status
**CRITICAL RECOVERY MODE.**
The project state was reverted to commit `a94e4e3` after a failed attempt to clean up code resulted in the loss of uncommitted work.

## Recent Incidents
1.  **Texture Failure:** `john.glb` and `mary.glb` were exported but render as **white/untextured** in the game.
    *   *Cause:* Likely an issue in `scripts/bpy/export_farmer_models.py` failing to properly pack textures or apply materials in a way Babylon.js understands (PBR vs Standard).
2.  **Context Loss:** Previous agent misunderstood the "Tornado" feature, deleting `TornadoEffect.ts` and `SplashScreen.tsx`, thinking they were dead code.
    *   *Correction:* "Tornado" is a core visual theme (Splash Video), even if the particle effect code was unused. `SplashScreen.tsx` is essential.
3.  **Data Loss:** Previous agent ran `git checkout HEAD -- .`, wiping out user work.

## Immediate Goals
1.  **Acknowledge and Document:** Establish this Memory Bank to prevent future agents from repeating these mistakes.
2.  **Fix GLB Textures:** The primary technical task remains: Fix `export_farmer_models.py` so that `john.glb` and `mary.glb` render with their correct textures (Fabric/Plaid) in Babylon.js.
3.  **Stability:** Do not delete "legacy" files without explicit confirmation and understanding of their visual/thematic role (e.g., Splash Screen).

## Active Issues
*   **Lost Features:** Arrow key support for desktop controls was implemented but lost in the revert. Needs reimplementation.
*   **Pause Button:** User requested removal of on-screen pause button in favor of tap-to-pause.

## Decisions
*   **Assets Fixed:** `john.glb` and `mary.glb` are now correctly exported with embedded textures and proper 1.0 scale (approx 1.75m tall).
*   **Keep `SplashScreen.tsx`**: It contains the thematic intro video.
*   **Keep `Tornado` References**: In text/UI, this is the game's identity.
*   **Control Scheme:**
    *   **Desktop:** Arrow keys to move, Space to pause.
    *   **Mobile:** Drag to move, Tap anywhere to pause.

## Current Focus
*   Re-implementing keyboard controls.
*   Removing on-screen pause button.
*   Implementing tap-to-pause logic.
