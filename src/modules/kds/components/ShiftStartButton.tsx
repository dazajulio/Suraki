'use client';

// ============================================================================
// COMPONENTE: ShiftStartButton — Desbloqueo de audio para notificaciones
// ============================================================================
// Browsers require a user gesture before playing audio. This button creates
// an AudioContext and plays a short silent buffer to unlock autoplay. After
// that, the component exposes `playNewOrderSound` via ref so the parent
// KDSBoard can trigger notification sounds on new orders.
// ============================================================================

import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
  useState,
  useEffect,
} from 'react';
import { Volume2, VolumeX, Music } from 'lucide-react';
import { cn } from '@/lib/utils';

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------

import { useKdsStore } from '@/modules/kds/stores/kds-store';

export interface ShiftStartButtonHandle {
  playNewOrderSound: () => void;
}

// ----------------------------------------------------------------------------
// Component
// ----------------------------------------------------------------------------

export const ShiftStartButton = forwardRef<ShiftStartButtonHandle>(
  function ShiftStartButton(_props, ref) {
    const { audioContext, isUnlocked, selectedTone, setAudioContext, setTone } = useKdsStore();
    const [isLoading, setIsLoading] = useState(false);

    // Initialize tone from localStorage on mount
    useEffect(() => {
      const savedTone = localStorage.getItem('kds_alarm_tone');
      if (savedTone) {
        setTone(savedTone);
      }
      
      // Auto-restore shift if previously active
      const isShiftActive = localStorage.getItem('kds_shift_active');
      if (isShiftActive === 'true' && !isUnlocked && !audioContext) {
         // Attempt silent unlock
         try {
           const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
           const ctx = new AudioCtx();
           setAudioContext(ctx);
           
           // We add a one-time global click listener to resume if it was suspended
           const resumeAudio = () => {
             if (ctx.state === 'suspended') ctx.resume();
             document.removeEventListener('click', resumeAudio);
           };
           document.addEventListener('click', resumeAudio);
         } catch (e) {
           console.warn('Could not auto-restore audio context', e);
         }
      }
    }, [setTone, isUnlocked, audioContext, setAudioContext]);

    const handleToneChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      setTone(e.target.value);
    };

    // ------------------------------------------------------------------
    // Unlock audio autoplay
    // ------------------------------------------------------------------
    const unlockAudio = useCallback(async () => {
      if (isUnlocked) {
        if (window.confirm('¿Seguro que deseas desactivar el turno y dejar de recibir alertas sonoras?')) {
          if (audioContext) {
            audioContext.close();
            setAudioContext(null);
          }
        }
        return;
      }
      setIsLoading(true);

      try {
        // Create AudioContext
        const AudioCtx =
          window.AudioContext ??
          (window as unknown as { webkitAudioContext: typeof AudioContext })
            .webkitAudioContext;
        const ctx = new AudioCtx();
        
        // Play a short silent buffer to satisfy the autoplay policy
        const buffer = ctx.createBuffer(1, 1, 22050);
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        source.start(0);

        // Resume context if suspended
        if (ctx.state === 'suspended') {
          await ctx.resume();
        }

        setAudioContext(ctx);
      } catch (err) {
        console.error('[KDS] Error unlocking audio:', err);
      } finally {
        setIsLoading(false);
      }
    }, [isUnlocked, audioContext, setAudioContext]);

    // ------------------------------------------------------------------
    // Play the notification sound via Web Audio API Oscillator
    // ------------------------------------------------------------------
    const playNewOrderSound = useCallback(() => {
      if (!audioContext) return;
      
      // Attempt to resume if suspended
      if (audioContext.state === 'suspended') {
         audioContext.resume().catch(() => console.log('Audio suspended'));
      }

      try {
        const playRing = (startTimeOffset: number) => {
          const startTime = audioContext.currentTime + startTimeOffset;
          const oscillator = audioContext.createOscillator();
          const gainNode = audioContext.createGain();

          oscillator.type = selectedTone === 'digital-chime' ? 'square' : selectedTone === 'soft-alert' ? 'sine' : 'triangle';
          oscillator.frequency.setValueAtTime(selectedTone === 'digital-chime' ? 880 : 523.25, startTime);

          if (selectedTone === 'new-order') {
            oscillator.frequency.setValueAtTime(523.25, startTime); // C5
            oscillator.frequency.setValueAtTime(659.25, startTime + 0.15); // E5
          }

          gainNode.gain.setValueAtTime(0, startTime);
          gainNode.gain.linearRampToValueAtTime(0.5, startTime + 0.05);
          gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.4);

          oscillator.connect(gainNode);
          gainNode.connect(audioContext.destination);

          oscillator.start(startTime);
          oscillator.stop(startTime + 0.5);
        };

        // Ring 3 times explicitly with setTimeout to ensure they trigger audibly and distinctively
        playRing(0);
        setTimeout(() => playRing(0), 800);
        setTimeout(() => playRing(0), 1600);
        
      } catch (err) {
        console.warn('[KDS] Could not play notification sound:', err);
      }
    }, [selectedTone, audioContext]);

    // Expose to parent via ref
    useImperativeHandle(ref, () => ({ playNewOrderSound }), [playNewOrderSound]);

    // ------------------------------------------------------------------
    // Render
    // ------------------------------------------------------------------
    return (
      <div className="flex items-center gap-3">
        {/* Tone Selector */}
        <div className="relative group/tone hidden sm:flex">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Music className="h-4 w-4 text-gray-400" />
          </div>
          <select
            value={selectedTone}
            onChange={handleToneChange}
            className="appearance-none bg-white border border-gray-200 text-gray-700 text-sm rounded-xl pl-9 pr-8 py-2.5 outline-none hover:bg-gray-100 focus:ring-2 focus:ring-red-600/50 transition-colors cursor-pointer"
          >
            <option value="new-order">Campana Clásica</option>
            <option value="digital-chime">Timbre Digital</option>
            <option value="soft-alert">Alerta Suave</option>
          </select>
        </div>

        <button
          type="button"
          onClick={unlockAudio}
          disabled={isLoading}
          className={cn(
            'group relative flex items-center gap-3 rounded-xl px-6 py-3.5 text-sm font-semibold transition-all duration-300',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20',
            isUnlocked
              ? 'cursor-default bg-emerald-950/50 text-emerald-400 border border-emerald-500/30'
              : 'cursor-pointer bg-gray-100 text-zinc-200 border border-gray-300 hover:bg-gray-200 hover:border-zinc-600 active:scale-[0.98]',
            isLoading && 'opacity-70 cursor-wait'
          )}
        >
          {/* Pulsing indicator when active */}
          {isUnlocked && (
            <span className="absolute -right-1 -top-1 flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500" />
            </span>
          )}

          {/* Icon */}
          {isUnlocked ? (
            <Volume2 className="h-5 w-5 text-emerald-400" />
          ) : (
            <VolumeX className="h-5 w-5 text-gray-500 group-hover:text-zinc-200 transition-colors" />
          )}

          {/* Label */}
          <span>
            {isLoading
              ? 'Activando…'
              : isUnlocked
                ? 'Turno Activo ✓'
                : 'Iniciar Turno'}
          </span>
        </button>
      </div>
    );
  }
);
