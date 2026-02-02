# Product Context

## The Game Experience
"Homestead Headaches" is designed to be a chaotic, physics-driven arcade game. The player feels the tension of a growing, wobbling stack of animals while trying to dodge or catch specific items under the pressure of a storm.

### v1.1.0 Feature Expansion
*   **Weather System:** Dynamic weather (clear/windy/rainy/stormy) driven by WeatherSystem state machine. Activates at level 6+. Wind affects wobble, rain/storm add particle effects via BabylonJS.
*   **Animal Variants:** Rare, golden, and shadow variants with level-gated unlock (rare at 3+, golden at 8+, shadow at 15+). Variants have score multipliers.
*   **Power-Ups:** Shield (stack protection), Slow Motion (reduced fall speed), Score Frenzy (2x multiplier). Collectible during gameplay.
*   **Combo System:** ComboCounter tracks consecutive catches with milestone celebrations at 5x/10x/15x. Anime.js-driven scale animations.
*   **Level-Up Flash:** Visual feedback on level progression with reduced-motion support.
*   **Analytics:** SessionLog records per-session stats (score, level, duration, combos) with Capacitor storage. StatsModal displays lifetime stats, session history, and CanvasChart visualizations. Export to JSON supported.
*   **Accessibility:** ColorblindFilter (protanopia/deuteranopia/tritanopia via Machado 2009 matrices), high contrast mode, remappable keybindings, ARIA live regions, motor settings (sensitivity, one-handed mode).
*   **Hit Stop:** Freeze-frame effect on significant catches for tactile feedback. Respects reducedMotion preference.

### The "Tornado" Theme
*   **Context:** The game is set in Nebraska during a storm.
*   **Representation:** The tornado is a central thematic element. It is prominently featured in the **Splash Screen Video** and as the **DropIndicatorTornado** (a procedural twisted funnel at the top of the game board).
*   **Visual Identity:** The tornado is a cartoon-style twisted funnel built from procedural `CreateRibbon` geometry with 3 dark spiral bands, spinning under a single `TransformNode`. Storm gray-brown debris and straw particles swirl around it. It speeds up and pulses when a drop is imminent.
*   **Gameplay Role:** The tornado serves as a visual drop indicator, showing where the next animal will fall. It also sets the atmospheric tone for the storm theme.
*   **Identity:** The "Headache" in the title refers to the stress of the tornado and the wobbling stack.

### Animal Proportional Sizing
*   **Design Principle:** Animals are visually proportional to each other and clearly smaller than the farmer character.
*   **Scale Values:** cow: 1.15, pig: 0.85, chicken: 0.5, duck: 0.55, sheep: 1.0, farmer: 2.5.
*   **Rationale:** Smaller animal scales ensure stacks remain readable and the farmer is clearly identifiable as the player character.

### Entity Lifecycle
*   **Banking/Scattering Cleanup:** Entities are automatically removed after their animation completes. Banking entities live for `bankAnimationDuration + 500ms`; scattering entities for 2500ms.
*   **Effect:** Keeps the active entity count at ~15 during gameplay, preventing performance degradation and visual clutter.

## Target Audience
*   Casual gamers looking for short bursts of fun.
*   Fans of physics-based puzzle/action games (like Tricky Towers).
*   Players with accessibility needs (colorblind modes, motor settings, reduced motion).

## User Experience Goals
*   **Tactile Physics:** The wobble should feel fair but challenging. Smooth inputs are rewarded.
*   **Visual Clarity:** It must be obvious which animals are good (catch) and which objects are threats (avoid). Per-type sizing helps distinguish animal types at a glance.
*   **Atmosphere:** The transition from a sunny farm to a stormy chaos should build tension. The procedural tornado reinforces the storm identity.
*   **Seamless Cross-Platform:** The game should play as well on a touch screen (mobile) as it does with a keyboard (desktop).
*   **Accessibility:** Full colorblind support, motor accommodation, screen reader compatibility via ARIA live regions, and reduced-motion compliance.
*   **Session Awareness:** Players can track their improvement over time via analytics dashboard with lifetime stats and session history.

## AI-Driven Gameplay
*   **DropController:** A unified AI director that adapts difficulty and animal type selection based on player skill.
*   **Yahtzee Combos:** Animals are chosen to help or challenge combo building (pairs, three-of-a-kind, full house, straights, flushes).
*   **Tornado Indicator:** The twisted funnel tornado patrols the top of the game board, showing where the next drop will come from. It accelerates toward the drop position when spawn is imminent.
*   **Fairness:** After disruptive drops, the AI compensates with helpful types or power-ups.

## Dev & QA Infrastructure
*   **DevAPI:** `window.__DEV_API__` singleton provides runtime access to game state, spawning controls, and auto-play for development and testing.
*   **PlayerGovernor:** Yuka-powered AI auto-player that drives the farmer to catch falling animals and bank stacks. Enables automated gameplay observation via Chrome MCP screenshots.
*   **Chrome MCP Workflow:** Browser automation captures real gameplay screenshots for visual verification without manual play.

## Historical Issues (Resolved)
*   **Data Loss:** A previous AI session wiped uncommitted work using `git checkout HEAD -- .`. (Resolved — safety protocols in AGENTS.md)
*   **Broken Assets:** Player models rendering as pure white. (Resolved — proper GLB export pipeline)
*   **Tornado Confusion:** Confusion regarding visual vs. gameplay tornado. (Resolved — tornado is visual theme + drop indicator)
*   **Oversized Animals:** Cow at modelScale 1.8 created visual walls when stacked. (Resolved — reduced to 1.15 in Phase 16)
*   **Entity Accumulation:** Banking/scattering entities never cleaned up, growing to 47+ during gameplay. (Resolved — `cleanupTransientEntities()` in Phase 16)
*   **Plain Cone Tornado:** Tornado was a featureless tapered cylinder. (Resolved — procedural `CreateRibbon` twisted funnel + spiral bands in Phase 16)
