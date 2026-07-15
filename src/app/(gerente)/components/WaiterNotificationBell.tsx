'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { createClient } from '@/lib/supabase/client';
import { Bell } from 'lucide-react';

interface WaiterCall {
  id: string;
  table_id: string;
  status: string;
  tables?: { name: string; number: string } | null;
}

export function WaiterNotificationBell() {
  const [calls, setCalls] = useState<WaiterCall[]>([]);
  const lastKnownCountRef = useRef(0);
  const isInitialLoadRef = useRef(true);
  const hasPlayedRef = useRef<Set<string>>(new Set());

  const [restaurantId, setRestaurantId] = useState<string>('');

  useEffect(() => {
    async function initRest() {
      const supabase = createClient();
      const { data } = await supabase.from('restaurants').select('id').eq('is_active', true).single();
      if (data) {
        setRestaurantId(data.id);
      } else {
        setRestaurantId(process.env.NEXT_PUBLIC_RESTAURANT_ID || '');
      }
    }
    initRest();
  }, []);

  const playSound = useCallback(() => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      const playChime = (delay: number) => {
        const startTime = audioCtx.currentTime + delay;
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, startTime);
        osc.frequency.exponentialRampToValueAtTime(440, startTime + 0.5);
        
        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(0.5, startTime + 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 1);
        
        osc.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        osc.start(startTime);
        osc.stop(startTime + 1);
      };

      // Play two chimes (different from kitchen's 3)
      playChime(0);
      playChime(0.4);
      
    } catch (e) {
      console.log('Audio blocked', e);
    }
  }, []);

  const loadCalls = useCallback(async () => {
    if (!restaurantId) return;
    const supabase = createClient();
    
    const { data, error } = await supabase
      .from('waiter_calls')
      .select('*, tables(name, number)')
      .eq('restaurant_id', restaurantId)
      .eq('status', 'pending')
      .order('created_at', { ascending: true });
      
    if (error) {
      console.error('[WaiterBell] Error loading calls:', error);
      return;
    }
    
    if (data) {
      const pendingCalls = data as unknown as WaiterCall[];
      
      // Check if there are new calls we haven't played sound for
      pendingCalls.forEach(call => {
        if (!hasPlayedRef.current.has(call.id)) {
          hasPlayedRef.current.add(call.id);
          // Play sound if it's not the initial load
          if (!isInitialLoadRef.current) {
            playSound();
          }
        }
      });
      
      isInitialLoadRef.current = false;
      lastKnownCountRef.current = pendingCalls.length;
      setCalls(pendingCalls);
    }
  }, [restaurantId, playSound, calls.length]);

  useEffect(() => {
    if (!restaurantId) return;
    
    // Initial load
    loadCalls();

    const supabase = createClient();

    // Subscribe to realtime changes
    const channel = supabase
      .channel('waiter-calls-live')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'waiter_calls',
          filter: `restaurant_id=eq.${restaurantId}`
        },
        (payload) => {
          console.log('[WaiterBell] Realtime event:', payload.eventType, payload.new);
          
          if (payload.eventType === 'INSERT' && (payload.new as any).status === 'pending') {
            // New waiter call - reload and play sound
            playSound();
            loadCalls();
          } else if (payload.eventType === 'UPDATE' && (payload.new as any).status === 'resolved') {
            // Call resolved - remove from list
            setCalls(prev => prev.filter(c => c.id !== (payload.new as any).id));
          } else {
            // For any other changes, just reload
            loadCalls();
          }
        }
      )
      .subscribe((status) => {
        console.log('[WaiterBell] Subscription status:', status);
      });

    // Polling fallback: check every 10 seconds in case Realtime misses something
    const pollInterval = setInterval(() => {
      loadCalls();
    }, 10000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(pollInterval);
    };
  }, [restaurantId]); // Intentionally minimal deps - loadCalls/playSound are stable via useCallback

  const acceptCall = async (callId: string) => {
    const supabase = createClient();
    // Update local state optimistically
    setCalls(prev => prev.filter(c => c.id !== callId));
    
    // Update DB
    const { error } = await supabase
      .from('waiter_calls')
      .update({ status: 'resolved', resolved_at: new Date().toISOString() } as any)
      .eq('id', callId);
      
    if (error) {
      console.error('[WaiterBell] Error resolving call:', error);
      // Reload on error
      loadCalls();
    }
  };

  if (calls.length === 0 || typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white border-2 border-red-600 rounded-2xl p-8 max-w-sm w-full text-center shadow-2xl shadow-red-600/20 transform animate-bounce-in">
        <div className="w-20 h-20 bg-red-600/20 rounded-full flex items-center justify-center mx-auto mb-6">
          <Bell className="w-10 h-10 text-red-600 animate-pulse" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">¡Llamado de Mesero!</h2>
        <p className="text-xl text-gray-700 mb-8">
          La {calls[0].tables?.name || `Mesa ${calls[0].tables?.number || 'Desconocida'}`} requiere atención.
        </p>
        
        <button 
          onClick={() => acceptCall(calls[0].id)}
          className="w-full bg-red-600 hover:bg-red-600 text-white font-bold py-4 rounded-xl text-lg transition-colors active:scale-95 shadow-lg shadow-red-600/30"
        >
          Aceptar
        </button>
        
        {calls.length > 1 && (
          <p className="text-sm text-gray-400 mt-4">
            + {calls.length - 1} llamado(s) pendiente(s)
          </p>
        )}
      </div>
    </div>,
    document.body
  );
}
