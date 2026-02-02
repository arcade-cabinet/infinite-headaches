# Homestead Headaches

## Game Manual

### Overview
**Homestead Headaches** is a 3D stacking game where you save farm animals from an incoming storm! Drag your base animal to catch falling friends, build a tower to the sky, and "bank" them in the barn before the wind blows them away.

---

## Core Gameplay

### Controls
- **Drag (Mouse/Touch):** Move your base animal left/right to catch falling animals.
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

### Player Characters

| Character | Description |
| :--- | :--- |
| **Farmer John** | Nebraska homestead farmer with blue overalls |
| **Farmer Mary** | Nebraska homestead farmer with red dress |

---

## Mechanics

### Wobble Physics
Your stack is physics-based!
- **Momentum:** Moving quickly adds momentum to the stack.
- **Impact:** Catching an animal off-center causes the stack to lean.
- **Danger:** If the stack leans too far (turns red), it will topple!

### The Storm (AI Director)
The game is watched by a **DropController** AI that adapts to your skill:
- **Yahtzee Combos:** Animals are chosen to help you build scoring combos — pairs, three-of-a-kind, full house, straights, and more!
- **Tornado Indicator:** Watch the twisted funnel tornado at the top of the board — it shows where the next animal will drop. It speeds up and grows when a drop is imminent!
- **Mercy:** If you're struggling, the AI compensates with helpful animal types and power-ups.
- **Challenge:** If you're playing perfectly, expect trickier patterns and faster drops!

---

## Power-Ups

Catch these falling items to help your farm:
- **Golden Egg (Gold):** Merges your stack into one "Mega Animal" (more stable!).
- **Milk Bottle (White):** Restores 1 Heart.
- **Vitamin (Green):** Increases max hearts by 1.
- **Lasso (Brown):** Magnetic pull for 5 seconds — animals are drawn toward you!
- **Coffee (Brown):** Double points for 8 seconds!
- **Grandma's Pie (Orange):** Full hearts + 3 seconds of invincibility!

---

## Scoring
- **Catch:** Base points based on height.
- **Perfect Catch:** Center alignment = 2.5x Points + "Perfect" Sparkles.
- **Bank:** Secure points + Earn "Bank Bonus".
- **Lives:** You have 3 Hearts (max 5, can extend to 8). Dropping an animal or toppling loses a heart.