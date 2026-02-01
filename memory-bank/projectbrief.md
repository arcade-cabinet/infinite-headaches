# Project Brief: Homestead Headaches

## Overview
**Homestead Headaches** (formerly Infinite Headaches) is a cross-platform 3D arcade game where players control a farmer (John or Mary) to catch falling farm animals, stacking them on their head to save them from an impending tornado.

## Core Mechanics
*   **Catching:** Move farmer left/right to catch animals falling from the sky.
*   **Stacking:** Animals stack on top of the farmer.
*   **Physics:** The stack wobbles based on movement and impact. Top-heavy stacks are unstable.
*   **Banking:** Players can "bank" (save) the stack for points once it reaches a certain height.
*   **Threat:** A **Tornado** threatens the farm (visualized in splash video/background theme).

## Platform Targets
*   **Web/PWA:** Primary development target.
*   **Mobile:** Android & iOS (via Capacitor).
*   **Desktop:** Windows/Mac/Linux (via Electron).

## Goals
*   Create a fun, "wobbly", chaotic arcade experience.
*   Maintain a "Nebraska Homestead" aesthetic (low-poly, barn red, wheat gold).
*   High-quality 3D rendering with Babylon.js.
*   Robust entity management via ECS (Miniplex).
