import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AudioState {
    isVideoPlaying: boolean;
    musicEnabled: boolean;
    setVideoPlaying: (playing: boolean) => void;
    toggleMusic: () => void;
}

export const useAudioStore = create<AudioState>()(
    persist(
        (set) => ({
            isVideoPlaying: false,
            musicEnabled: true,
            setVideoPlaying: (playing) => set({ isVideoPlaying: playing }),
            toggleMusic: () => set((s) => ({ musicEnabled: !s.musicEnabled })),
        }),
        {
            name: 'audio-settings',
            storage: createJSONStorage(() => AsyncStorage),
            partialize: (state) => ({ musicEnabled: state.musicEnabled }),
        },
    ),
);
