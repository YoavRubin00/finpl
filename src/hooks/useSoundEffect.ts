import { useCallback } from 'react';
import { createAudioPlayer, AudioSource } from 'expo-audio';

export type SoundEffectName =
    | 'btn_click_heavy'
    | 'btn_click_soft_1'
    | 'btn_click_soft_2'
    | 'btn_click_soft_3'
    | 'btn_click_soft_4'
    | 'modal_open_1'
    | 'modal_open_2'
    | 'modal_open_3'
    | 'modal_open_4';

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
};

/* ------------------------------------------------------------------ */
/*  On-demand sound player — creates, plays, then releases each sound  */
/* ------------------------------------------------------------------ */

export function useSoundEffect() {
    const playSound = useCallback(async (name: SoundEffectName) => {
        try {
            const source = SOUND_FILES[name];
            if (!source) return;
            const player = createAudioPlayer(source);
            player.play();
            // Release after playback
            player.addListener('playbackStatusUpdate', (status) => {
                if (status.didJustFinish) {
                    player.release();
                }
            });
        } catch {
            // Silently ignore — player init may fail on some devices
        }
    }, []);

    return { playSound };
}
