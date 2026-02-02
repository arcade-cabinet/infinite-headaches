# Project Brief: Homestead Headaches

## Overview
**Homestead Headaches** (formerly Infinite Headaches) is a cross-platform 3D arcade game where players control a farmer (John or Mary) to catch falling farm animals, stacking them on their head to save them from an impending tornado.

## Core Mechanics
*   **Catching:** Move farmer left/right to catch animals falling from the sky.
*   **Stacking:** Animals stack on top of the farmer.
*   **Physics:** The stack wobbles based on movement and impact. Top-heavy stacks are unstable.
*   **Banking:** Players can "bank" (save) the stack for points once it reaches a certain height.
*   **Threat:** A **Tornado** threatens the farm (visualized in splash video/background theme).
*   **Weather:** Dynamic weather system (clear/windy/rainy/stormy) adds wind wobble and visual effects at higher levels.
*   **Combos:** Consecutive catches build combo multipliers with milestone celebrations.
*   **Power-Ups:** Shield, Slow Motion, and Score Frenzy provide temporary gameplay advantages.
*   **Variants:** Rare, golden, and shadow animal variants with score multipliers unlock at higher levels.

## Platform Targets
*   **Web/PWA:** Primary development target.
*   **Mobile:** Android & iOS (via Capacitor).
*   **Desktop:** Windows/Mac/Linux (via Electron).

## Goals
*   Create a fun, "wobbly", chaotic arcade experience.
*   Maintain a "Nebraska Homestead" aesthetic (low-poly, barn red, wheat gold).
*   High-quality 3D rendering with Babylon.js.
*   Robust entity management via ECS (Miniplex).
*   Full accessibility support (colorblind filters, motor accommodation, reduced motion, screen readers).
*   Session analytics and player progression tracking.
*   Cross-platform deployment (Web/PWA, Android, iOS, Desktop).
