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

const SOUND_FILES: Record<SoundEffectName, AudioSource> = {
    'btn_click_heavy': { uri: 'https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/sound/btn_click_heavy.mp3' },
    'btn_click_soft_1': { uri: 'https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/sound/btn_click_soft_1.mp3' },
    'btn_click_soft_2': { uri: 'https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/sound/btn_click_soft_2.mp3' },
    'btn_click_soft_3': { uri: 'https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/sound/btn_click_soft_3.mp3' },
    'btn_click_soft_4': { uri: 'https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/sound/btn_click_soft_4.mp3' },
    'modal_open_1': { uri: 'https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/sound/modal_open_1.mp3' },
    'modal_open_2': { uri: 'https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/sound/modal_open_2.mp3' },
    'modal_open_3': { uri: 'https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/sound/modal_open_3.mp3' },
    'modal_open_4': { uri: 'https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/sound/modal_open_4.mp3' },
    'bubble_transition': { uri: 'https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/sound/bubble_transition.mp3' },
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
