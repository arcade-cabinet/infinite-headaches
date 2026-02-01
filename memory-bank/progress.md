# Progress

## Status
*   **Core Game Loop:** Functional.
*   **ECS Migration:** In Progress (Hybrid state).
*   **3D Assets:**
    *   Animals: Working.
    *   **Farmers (John/Mary): BROKEN (Rendering White).**
*   **Environment:** Functional (`NebraskaDiorama`).

## Known Issues
*   [CRITICAL] Farmer models (`john.glb`, `mary.glb`) missing textures in-game.
*   [MAJOR] Previous session caused data loss of uncommitted work.
*   [MINOR] Some legacy code (`GameScreen.tsx`) might still exist but shouldn't be blindly deleted without checking imports.

## Roadmap
1.  **Fix Asset Pipeline:**
    *   Debug `export_farmer_models.py`.
    *   Ensure textures (`Fabric.png`, `PlaidMaterial.png`) are packed into the GLB.
    *   Ensure materials use the correct shader nodes for GLTF export.
2.  **Verify Visuals:**
    *   Confirm farmers render correctly in Babylon.js.
3.  **Clean Up (Safely):**
    *   Remove *truly* dead code only after verifying no runtime dependencies or thematic usage.
4.  **Gameplay Polish:**
    *   Re-implement or verify "Tornado" mechanics if they are intended to be more than visual.
