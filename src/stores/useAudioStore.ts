import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { zustandStorage } from '../lib/zustandStorage';
import { registerLocalStore } from '../lib/stores/registry';

interface AudioState {
    isVideoPlaying: boolean;
    musicEnabled: boolean;
    sfxEnabled: boolean;
    hapticsEnabled: boolean;
    setVideoPlaying: (playing: boolean) => void;
    toggleMusic: () => void;
    toggleSfx: () => void;
    toggleHaptics: () => void;
    reset: () => void;
}

export const useAudioStore = create<AudioState>()(
    persist(
        (set) => ({
            isVideoPlaying: false,
            musicEnabled: true,
            sfxEnabled: true,
            hapticsEnabled: true,
            setVideoPlaying: (playing) => set({ isVideoPlaying: playing }),
            toggleMusic: () => set((s) => ({ musicEnabled: !s.musicEnabled })),
            toggleSfx: () => set((s) => ({ sfxEnabled: !s.sfxEnabled })),
            toggleHaptics: () => set((s) => ({ hapticsEnabled: !s.hapticsEnabled })),
            reset: () => set({ isVideoPlaying: false, musicEnabled: true, sfxEnabled: true, hapticsEnabled: true }),
        }),
        {
            name: 'audio-settings',
            storage: createJSONStorage(() => zustandStorage),
            partialize: (state) => ({ musicEnabled: state.musicEnabled, sfxEnabled: state.sfxEnabled, hapticsEnabled: state.hapticsEnabled }),
        },
    ),
);

registerLocalStore('audio-settings', useAudioStore, 'audio-settings');
