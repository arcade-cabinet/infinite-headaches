# Product Context

## The Game Experience
"Homestead Headaches" is designed to be a chaotic, physics-driven arcade game. The player feels the tension of a growing, wobbling stack of animals while trying to dodge or catch specific items under the pressure of a storm.

### The "Tornado" Theme
*   **Context:** The game is set in Nebraska during a storm.
*   **Representation:** The tornado is a central thematic element. It is prominently featured in the **Splash Screen Video**.
*   **Gameplay Role:** While initially conceived as a physical force affecting gameplay (wind), current implementation focuses on it as a visual threat and atmospheric setter.
*   **Identity:** The "Headache" in the title refers to the stress of the tornado and the wobbling stack.

## Target Audience
*   Casual gamers looking for short bursts of fun.
*   Fans of physics-based puzzle/action games (like Tricky Towers).

## User Experience Goals
*   **Tactile Physics:** The wobble should feel fair but challenging. Smooth inputs are rewarded.
*   **Visual Clarity:** It must be obvious which animals are good (catch) and which objects are threats (avoid).
*   **Atmosphere:** The transition from a sunny farm to a stormy chaos should build tension.
*   **Seamless Cross-Platform:** The game should play as well on a touch screen (mobile) as it does with a keyboard (desktop).

## Current Critical Issues (The "Claude" Incident)
*   **Data Loss:** A previous AI session wiped uncommitted work using `git checkout HEAD -- .`.
*   **Broken Assets:** The player models (`john.glb`, `mary.glb`) are rendering as pure white (missing textures) in the Babylon.js engine.
*   **Confusion:** There was significant confusion regarding the "Tornado" implementation (visual vs. gameplay), leading to the deletion of required files (`SplashScreen.tsx`).
