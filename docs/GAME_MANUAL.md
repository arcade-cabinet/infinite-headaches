# Homestead Headaches

## Game Manual

### Overview

**Homestead Headaches** is a 3D stacking game where you save farm animals from an incoming storm! Drag your base animal to catch falling friends, build a tower to the sky, and "bank" them in the barn before the wind blows them away.

---

## Core Gameplay

### Controls

- **Drag (Mouse/Touch):** Move your base animal left/right to catch falling animals.
- **Keyboard:** Arrow keys for movement (remappable in Settings).
- **Tap Stack:** Poke an animal to trigger a reaction (or special ability!).
- **Bank Button:** Appears when you stack 5+ animals. Tap to save them!

### The Goal

1.  **Catch:** Don't let animals hit the ground.
2.  **Stack:** Build as high as you can.
3.  **Balance:** Manage the "Wobble." Moving too fast or landing off-center makes the stack unstable.
4.  **Bank:** Secure your points by banking stacks of 5 or more.

---

## Animals of the Farm

### Base Animals

| Animal | Weight | Scale | Description |
| :--- | :--- | :--- | :--- |
| **Cow** | 2.0 (Heavy) | 1.15 | The backbone of any stack. Sturdy and reliable. |
| **Pig** | 1.2 (Medium) | 0.85 | Round and bouncy. |
| **Chicken** | 0.3 (Light) | 0.5 | Small and fluttery. |
| **Duck** | 0.5 (Light) | 0.55 | The classic farm friend. |
| **Sheep** | 1.5 (Medium) | 1.0 | Fluffy and stable. |

### Special Variants

| Variant | Base | Special Ability (Tap to Activate) | Spawn Rate |
| :--- | :--- | :--- | :--- |
| **Fire Chicken** | Chicken | **Fireball:** Shoots fireballs that destroy falling animals! | Rare (3%) |
| **Ice Duck** | Duck | **Freeze:** Freezes the nearest falling animal in ice! | Rare (3%) |
| **Brown Cow** | Cow | **Poop Projectile:** Launches poop that grows bouncy bushes! | Rare (5%) |
| **Golden Pig** | Pig | No ability, but worth **3x points**! Falls faster. | Very Rare (2%) |
| **Heavy Cow** | Cow | No ability, but worth **2x points**! Destabilizes the stack. | Very Rare (2%) |

### Animal Variants (Tiered Rarity)

Variant animals appear as the game progresses and are visually distinct with a colored tint. They apply to any base animal type. This is a separate system from Special Variants above — a Golden Pig (special, 3x) could also roll a Rare variant tint (1.5x), but the multipliers do not stack; the highest multiplier applies.

| Variant Tier | Unlock Level | Visual | Score Multiplier |
| :--- | :--- | :--- | :--- |
| **Rare** | Level 3+ | Blue tint | 1.5x |
| **Golden** | Level 8+ | Gold tint | 3x |
| **Shadow** | Level 15+ | Dark tint | 2x |

### Player Characters

| Character | Trait | Speed | Wobble | Description |
| :--- | :--- | :--- | :--- | :--- |
| **Farmer John** | Steady/Slow | 0.90x | 0.85x | Nebraska homestead farmer with blue overalls. Forgiving for beginners. |
| **Farmer Mary** | Fast/Jittery | 1.10x | 1.15x | Nebraska homestead farmer with red dress. Higher risk and reward. |

---

## Mechanics

### Wobble Physics

Your stack is physics-based!
- **Momentum:** Moving quickly adds momentum to the stack.
- **Impact:** Catching an animal off-center causes the stack to lean.
- **Danger:** If the stack leans too far (turns red), it will topple!

### The Storm (AI Director)

The game is watched by a **DropController** AI that adapts to your skill:
- **Yahtzee Combos:** Animals are chosen to help you build scoring combos --- pairs, three-of-a-kind, full house, straights, and more!
- **Tornado Indicator:** Watch the twisted funnel tornado at the top of the board --- it shows where the next animal will drop. It speeds up and grows when a drop is imminent!
- **Mercy:** If you're struggling, the AI compensates with helpful animal types and power-ups.
- **Challenge:** If you're playing perfectly, expect trickier patterns and faster drops!

### Weather System

Starting at level 6, the weather changes dynamically as you play:
- **Clear:** Normal conditions. No weather effects.
- **Windy:** Light wind pushes falling animals sideways. Adjust your positioning!
- **Rainy:** Rain particles and moderate wind. Falling animals drift more.
- **Stormy:** Heavy wind forces, rain, and a wobble bonus makes stacks less stable. High risk, but storm catches grant a wobble bonus!

Weather transitions are accompanied by ambient audio (rain, wind, thunder) that fades between states.

### Combo System

Build combos by catching animals consecutively without dropping any:
- **5x Combo:** Scale pulse animation.
- **10x Combo:** Larger pulse with screen shake.
- **15x Combo:** Full celebration with camera zoom effect.
- Combos decay after 3.5 seconds of no catches.
- Combo milestones trigger a satisfying hit-stop freeze-frame effect.

### Hit Stop

A brief freeze-frame effect plays on perfect catches and combo milestones, adding impact and weight to your best plays. This effect respects the reduced motion accessibility setting.

### Level Up Flash

A white flash overlay plays when you advance to a new level, signaling your progression.

---

## Power-Ups

Catch these falling items to help your farm:
- **Golden Egg (Gold):** Merges your stack into one "Mega Animal" (more stable!).
- **Milk Bottle (White):** Restores 1 Heart.
- **Vitamin (Green):** Increases max hearts by 1.
- **Lasso (Brown):** Magnetic pull for 5 seconds --- animals are drawn toward you!
- **Coffee (Brown):** Double points for 8 seconds!
- **Grandma's Pie (Orange):** Full hearts + 3 seconds of invincibility!
- **Shield (Blue):** Absorbs 1 missed animal without losing a heart. Lasts 15 seconds.
- **Slow Motion (Purple):** Reduces game speed to 0.5x for 5 seconds. All falling entities slow down.
- **Score Frenzy (Red):** 3x point multiplier for 6 seconds. Stacks with combo multipliers!

---

## Scoring

- **Catch:** Base points based on height.
- **Perfect Catch:** Center alignment = 2.5x Points + "Perfect" Sparkles.
- **Bank:** Secure points + Earn "Bank Bonus".
- **Combo Milestones:** 5x, 10x, and 15x consecutive catches trigger bonus effects and score boosts.
- **Animal Variants:** Rare (1.5x), Golden (3x), and Shadow (2x) animals multiply catch scores.
- **Storm Bonus:** Catching animals during stormy weather grants a wobble bonus.
- **Lives:** You have 3 Hearts (max 5, can extend to 8). Dropping an animal or toppling loses a heart.

---

## Stats & Analytics

Access the **Stats** modal from the pause menu or main menu to review your gameplay history:
- **Overview Tab:** Lifetime stats including total games played, best score, average level reached, and total animals caught.
- **History Tab:** Scrollable list of past sessions with date, score, and level details.
- **Charts Tab:** Line and bar charts showing your score and level progression over time.
- **HeatMap Tab:** Visual heatmap of your catch positions, showing where you tend to play on the board.
- **Export:** Download your stats as JSON for external analysis.
- **Clear History:** Reset all stored session data (with confirmation prompt).

Up to 500 sessions are stored locally on your device.

---

## Accessibility

### Colorblind Modes

Three colorblind correction filters are available in Settings:
- **Protanopia** (red-blind)
- **Deuteranopia** (green-blind)
- **Tritanopia** (blue-blind)

Filters use Machado 2009 color transformation matrices applied as a post-processing effect.

### High Contrast Mode

Enable increased contrast in Settings for improved visibility of game elements.

### Key Remapping

Customize your keyboard controls in Settings:
- Remap movement, bank, and pause keys.
- Press Escape during key capture to cancel.
- Reset to defaults at any time.

### Reduced Motion

When your system's reduced motion preference is enabled, the game automatically disables:
- Hit-stop freeze-frame effects
- Combo milestone animations
- Level up flash overlay

### Motor Accessibility

Adjust movement sensitivity in Settings. Your sensitivity preferences are saved between sessions.

### Screen Reader Support

ARIA live regions announce:
- Score changes
- Combo milestones
- Weather transitions
- Game state changes (pause, resume, game over)
