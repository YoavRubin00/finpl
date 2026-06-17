/**
 * Captain Shark "power-station" charging animations for the energy component.
 * Transparent animated WebPs produced via the finplay-mascot-webp pipeline
 * (Higgsfield green-screen video → ffmpeg chroma-key), all in the purple energy
 * world, matching the existing fin-*.webp flat-vector style.
 *
 *   shark-charging-idle.webp → cranks a generator charging a purple battery (default loop)
 *   shark-full-cheer.webp    → celebrates next to a full purple battery
 *   shark-low-nudge.webp     → points encouragingly at a low purple battery
 */
import type { ImageSource } from "expo-image";

export const SHARK_CHARGING_IDLE: ImageSource = require("../../../assets/webp/energy/shark-charging-idle.webp");
export const SHARK_FULL_CHEER: ImageSource = require("../../../assets/webp/energy/shark-full-cheer.webp");
export const SHARK_LOW_NUDGE: ImageSource = require("../../../assets/webp/energy/shark-low-nudge.webp");