import { useCallback } from 'react';
import { createAudioPlayer, AudioSource, AudioPlayer } from 'expo-audio';
import { useAudioStore } from '../stores/useAudioStore';

export type SoundEffectName =
    | 'btn_click_heavy'
    | 'btn_click_soft_1'
    | 'btn_click_soft_2'
    | 'btn_click_soft_3'
    | 'btn_click_soft_4'
    | 'modal_open_1'
    | 'modal_open_2'
    | 'modal_open_3'
    | 'modal_open_4'
    | 'bubble_transition';

// Yoav 2026-06-12: SFX are now BUNDLED locally (require) instead of streamed
// from Vercel blob storage. Remote SFX via expo-audio were unreliable in
// production — `createAudioPlayer({uri}).play()` fires before the HTTP
// download finishes (and remote native players are flaky), so "כל הסאונד
// בפרודקשן לא עובד". These clips are tiny (~45-50KB each, ~500KB total), so
// bundling them makes playback instant, offline, and bulletproof.
const SOUND_FILES: Record<SoundEffectName, AudioSource> = {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    'btn_click_heavy': require('../../assets/sfx/btn_click_heavy.mp3'),
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    'btn_click_soft_1': require('../../assets/sfx/btn_click_soft_1.mp3'),
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    'btn_click_soft_2': require('../../assets/sfx/btn_click_soft_2.mp3'),
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    'btn_click_soft_3': require('../../assets/sfx/btn_click_soft_3.mp3'),
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    'btn_click_soft_4': require('../../assets/sfx/btn_click_soft_4.mp3'),
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    'modal_open_1': require('../../assets/sfx/modal_open_1.mp3'),
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    'modal_open_2': require('../../assets/sfx/modal_open_2.mp3'),
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    'modal_open_3': require('../../assets/sfx/modal_open_3.mp3'),
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    'modal_open_4': require('../../assets/sfx/modal_open_4.mp3'),
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    'bubble_transition': require('../../assets/sfx/bubble_transition.mp3'),
};

// Module-level cache: one player per sound, loaded once from the remote URL
// and reused on every subsequent tap. Prevents two issues:
//   1. Rapid taps of the SAME sound no longer spawn overlapping players —
//      we seek the existing player back to 0 and replay.
//   2. The remote mp3 isn't re-downloaded per tap (previously: silent failures
//      when a tap happened before HTTP load finished).
// Different sound names are still independent — tap + success can still overlap,
// which is the intended audio design.
const playerCache: Partial<Record<SoundEffectName, AudioPlayer>> = {};

export function useSoundEffect() {
    const playSound = useCallback((name: SoundEffectName) => {
        try {
            if (!useAudioStore.getState().sfxEnabled) return;
            const source = SOUND_FILES[name];
            if (!source) return;

            let player = playerCache[name];
            if (!player) {
                player = createAudioPlayer(source);
                playerCache[name] = player;
            } else {
                player.seekTo(0);
            }
            player.play();
        } catch {
            // Silently ignore — player init may fail on some devices
        }
    }, []);

    return { playSound };
}
