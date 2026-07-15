import { create } from 'zustand';

interface KdsState {
  audioContext: AudioContext | null;
  isUnlocked: boolean;
  selectedTone: string;
  setAudioContext: (ctx: AudioContext | null) => void;
  setTone: (tone: string) => void;
}

export const useKdsStore = create<KdsState>((set) => ({
  audioContext: null,
  isUnlocked: false,
  selectedTone: 'new-order',
  setAudioContext: (ctx) => {
    set({ audioContext: ctx, isUnlocked: !!ctx });
    if (typeof window !== 'undefined' && ctx) {
      localStorage.setItem('kds_shift_active', 'true');
    } else if (typeof window !== 'undefined' && !ctx) {
      localStorage.removeItem('kds_shift_active');
    }
  },
  setTone: (tone) => {
    set({ selectedTone: tone });
    if (typeof window !== 'undefined') {
      localStorage.setItem('kds_alarm_tone', tone);
    }
  },
}));
