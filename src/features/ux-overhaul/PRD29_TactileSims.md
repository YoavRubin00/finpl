# PRD 29: Tactile Sims, Premium Polish & 3D (Phase 7)

## Overview
This PRD focuses on elevating the app's visual and tactile experience to a "B2B2C Premium" level, heavily inspired by top-tier fintech apps like Revolut. This phase introduces interactive tactile graphs (`@shopify/react-native-skia`), 3D holographic badges, and smooth glassmorphism to completely remove financial anxiety and build trust through a flawlessly polished UI.

## Goal
1. Replace static or basic slider simulators with **Tactile Skia Graphs**.
2. Enhance screen transitions and modals with **Playful Bounces** and **Glassmorphism**.
3. Add **Holographic 3D Cards** for premium achievements using device gyroscope data.

## User Stories

### US-001: Tactile Skia Interactive Graphs
**Description:** As a user, when I interact with a financial projection (like compound interest or FIRE timeline), I want the graph to feel alive and respond to my touch instantly.

**Acceptance Criteria:**
- [x] Install and configure `@shopify/react-native-skia` + `react-native-gesture-handler`.
- [x] Refactor the `<SliderSimulator>` archetype to use a Skia Canvas.
- [x] Implement a draggable scrubber line over the graph.
- [x] Add a soft "Glow Drop Shadow" that follows the scrubber.
- [x] Trigger a light haptic (`selectionAsync`) every time the scrubber hits a major milestone (e.g., every 5 years on the x-axis).

### US-002: Glassmorphism & Smooth Skeleton Loaders
**Description:** As a user, loading screens and overlays should look clean, modern, and reduce cognitive load.

**Acceptance Criteria:**
- [x] Replace harsh dark overlays on Popups and Modals with `BlurView` (Glassmorphism).
- [ ] Replace standard loading spinners with smooth, pulsing Skeleton Loaders during any data fetch or mock delay.
- [x] Implement playful, bouncy bottom-sheet entrances (`withSpring`) for all major interactive modals.

### US-003: Playful 3D Holographic Badges
**Description:** As a user, when I earn a significant achievement or view premium content, it should physically tilt with my device and shine like a high-end credit card.

**Acceptance Criteria:**
- [x] Use `expo-sensors` (DeviceMotion or Gyroscope) to track device tilt.
- [x] Use `react-native-reanimated` to apply a 3D perspective rotation to Arena Cards and Badges.
- [x] Add an absolute glowing gradient mask (via Reanimated or Skia) that shifts based on the tilt angle, simulating a holographic "shine".

## Execution Considerations
- Focus heavily on 60fps-120fps performance. Avoid heavy JS bridge operations.
- Skia should only be used where tactile rendering is necessary (graphs/charts) to maintain standard RN view performance elsewhere.
